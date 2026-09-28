import type * as s from '@entityseven/fivem-rpc-shared-types'

import { Emitter } from '../utils/emitter'
import { RPCError, unknownNativeMessage } from '../utils/errors'
import { stringify } from '../utils/funcs'
import { NATIVE_SERVER_EVENTS } from '../utils/native'
import {
	type RPCConfig,
	RPCErrors,
	RPCEvents,
	type RPCNativeServerEvents,
	type RPCStateRaw,
} from '../utils/types'
import type {
	RPCCommandName,
	RPCEventArgs,
	RPCEventName,
	RPCEventResult,
	RPCListener,
} from '../utils/typing'
import { RPCInstanceBase } from './base'

/**
 * RPC instance for server code, returned by `createRPC({ env: 'server' })`.
 * Create one per server and import it from your own module.
 *
 * - `on*` registers the listener that answers calls from one direction. One
 *   listener per event: registering the same name again replaces it, `off*`
 *   removes it
 * - `emit*` calls the listener on the target and resolves with its return
 *   value, or rejects with {@link RPCError}
 * - listeners for client and webview calls get the calling player's server id
 *   first, taken from FiveM `source`
 */
export class RPCInstanceServer extends RPCInstanceBase {
	private readonly _emitterClient: Emitter
	private readonly _emitterWeb: Emitter

	constructor(props: RPCConfig<'server'>) {
		super(props)

		this._emitterClient = new Emitter()
		this._emitterWeb = new Emitter()

		console.log('[RPC] Initialized Server')

		// `source` must be read synchronously, before any await
		onNet(RPCEvents.LISTENER_CLIENT, (raw: RPCStateRaw) =>
			this._handle(raw, source, 'client', this._emitterClient),
		)
		onNet(RPCEvents.LISTENER_WEB, (raw: RPCStateRaw) =>
			this._handle(raw, source, 'webview', this._emitterWeb),
		)
	}

	// ===== HANDLERS =====

	/**
	 * Handles a payload from a client or its webview.
	 *
	 * @param player - FiveM `source` of the net event: the only trusted player id,
	 *   whatever the payload claims
	 */
	private async _handle(
		payloadRaw: RPCStateRaw,
		player: number,
		from: 'client' | 'webview',
		emitter: Emitter,
	) {
		const payload = this.accept(payloadRaw)
		if (!payload || payload.calledFrom !== from) return

		// not sent by a player, e.g. a server-side trigger of the RPC channel
		if (!(player > 0)) {
			this.log(`dropped ${payload.event}: no player source`)
			return
		}
		payload.player = player

		if (payload.type === 'event') {
			const response = await this.dispatch(emitter, payload, player)
			emitNet(RPCEvents.LISTENER_SERVER, player, stringify(response))
		} else if (payload.type === 'response') {
			this.settle(payload, player)
		}
	}

	// ===== CLIENT =====

	/**
	 * Listens for `emitServer` calls from clients (client -> server).
	 *
	 * @param cb - gets the calling player's server id first (from FiveM
	 *   `source`, never from the payload), then the event arguments. Its return
	 *   value (awaited) is sent back to the caller
	 *
	 * @example
	 * rpc.onClient('getMoney', (player, account) => getMoney(player, account))
	 */
	public onClient<EventName extends RPCEventName<s.RPCEvents_ClientServer>>(
		eventName: EventName,
		cb: RPCListener<s.RPCEvents_ClientServer, EventName, [player: number]>,
	): this {
		return this.listen(this._emitterClient, 'onClient', eventName, cb)
	}

	/** Removes the `onClient` listener for `eventName` */
	public offClient<EventName extends RPCEventName<s.RPCEvents_ClientServer>>(
		eventName: EventName,
	): this {
		return this.unlisten(this._emitterClient, 'offClient', eventName)
	}

	/**
	 * Calls the `onServer` listener on one client (server -> client) and
	 * resolves with its return value.
	 *
	 * @param player - server id of the target player
	 * @throws {@link RPCError} `EVENT_NOT_REGISTERED` (no listener),
	 *   `HANDLER_ERROR` (the listener threw) or `TIMEOUT`
	 *
	 * @example
	 * const accepted = await rpc.emitClient(player, 'askTrade', offer)
	 */
	public async emitClient<
		EventName extends RPCEventName<s.RPCEvents_ServerClient>,
	>(
		player: number,
		eventName: EventName,
		...args: RPCEventArgs<s.RPCEvents_ServerClient, EventName>
	): Promise<RPCEventResult<s.RPCEvents_ServerClient, EventName>> {
		const payload = this.request(eventName, 'client', args, player)

		emitNet(RPCEvents.LISTENER_SERVER, player, stringify(payload))

		return this._pending.wait(payload, player)
	}

	/**
	 * Runs the `onServer` listener on every client (server -> all clients).
	 * One-way: resolves once sent, clients do not answer and their failures stay
	 * on the client.
	 *
	 * @example
	 * await rpc.emitClientEveryone('weatherChanged', 'RAIN')
	 */
	public async emitClientEveryone<
		EventName extends RPCEventName<s.RPCEvents_ServerClient>,
	>(
		eventName: EventName,
		...args: RPCEventArgs<s.RPCEvents_ServerClient, EventName>
	): Promise<void> {
		const payload = this.request(eventName, 'client', args, -1, 'broadcast')

		emitNet(RPCEvents.LISTENER_SERVER, -1, stringify(payload))
	}

	// ===== WEBVIEW =====

	/**
	 * Listens for `emitServer` calls from webviews (webview -> server, relayed
	 * by the player's client).
	 *
	 * @param cb - gets the calling player's server id first (from FiveM
	 *   `source`, never from the payload), then the event arguments. Its return
	 *   value (awaited) is sent back to the caller
	 *
	 * @example
	 * rpc.onWebview('buyItem', (player, item) => shop.buy(player, item))
	 */
	public onWebview<EventName extends RPCEventName<s.RPCEvents_WebviewServer>>(
		eventName: EventName,
		cb: RPCListener<s.RPCEvents_WebviewServer, EventName, [player: number]>,
	): this {
		return this.listen(this._emitterWeb, 'onWebview', eventName, cb)
	}

	/** Removes the `onWebview` listener for `eventName` */
	public offWebview<EventName extends RPCEventName<s.RPCEvents_WebviewServer>>(
		eventName: EventName,
	): this {
		return this.unlisten(this._emitterWeb, 'offWebview', eventName)
	}

	/**
	 * Calls the `onServer` listener in one player's webview (server -> webview,
	 * relayed by that player's client) and resolves with its return value.
	 *
	 * @param player - server id of the target player
	 * @throws {@link RPCError} `EVENT_NOT_REGISTERED` (no listener),
	 *   `HANDLER_ERROR` (the listener threw) or `TIMEOUT`
	 *
	 * @example
	 * const confirmed = await rpc.emitWebview(player, 'confirmPurchase', item)
	 */
	public async emitWebview<
		EventName extends RPCEventName<s.RPCEvents_ServerWebview>,
	>(
		player: number,
		eventName: EventName,
		...args: RPCEventArgs<s.RPCEvents_ServerWebview, EventName>
	): Promise<RPCEventResult<s.RPCEvents_ServerWebview, EventName>> {
		const payload = this.request(eventName, 'webview', args, player)

		emitNet(RPCEvents.LISTENER_SERVER, player, stringify(payload))

		return this._pending.wait(payload, player)
	}

	// ===== SELF =====

	/**
	 * Listens for `emitSelf` calls in this environment (server -> server).
	 *
	 * @param cb - gets the event arguments. Its return value (awaited) is sent
	 *   back to the caller
	 *
	 * @example
	 * rpc.onSelf('add', (a, b) => a + b)
	 */
	public onSelf<EventName extends RPCEventName<s.RPCEvents_Server>>(
		eventName: EventName,
		cb: RPCListener<s.RPCEvents_Server, EventName>,
	): this {
		return this.listen(this._emitterLocal, 'onSelf', eventName, cb)
	}

	/** Removes the `onSelf` listener for `eventName` */
	public offSelf<EventName extends RPCEventName<s.RPCEvents_Server>>(
		eventName: EventName,
	): this {
		return this.unlisten(this._emitterLocal, 'offSelf', eventName)
	}

	/**
	 * Calls this environment's own `onSelf` listener directly and resolves with
	 * its return value. No timeout; errors thrown by the listener reach the caller
	 * unchanged.
	 *
	 * @throws {@link RPCError} `EVENT_NOT_REGISTERED` if no `onSelf` listener exists
	 *
	 * @example
	 * const total = await rpc.emitSelf('add', 2, 3)
	 */
	public async emitSelf<EventName extends RPCEventName<s.RPCEvents_Server>>(
		eventName: EventName,
		...args: RPCEventArgs<s.RPCEvents_Server, EventName>
	): Promise<RPCEventResult<s.RPCEvents_Server, EventName>> {
		return this.emitLocal(eventName, args)
	}

	// ===== OTHER =====

	/**
	 * Registers a chat command (FiveM `RegisterCommand`).
	 *
	 * @param cb - gets the player's server id (`0` for the server console), the
	 *   strings typed after the command and the full command line. Validate
	 *   `args` yourself
	 * @param restricted - only players with the ACE permission `command.<name>`
	 *   can use it
	 *
	 * @example
	 * rpc.onCommand('heal', (player, args) => heal(player, Number(args[0])), true)
	 */
	public onCommand<CommandName extends RPCCommandName<s.RPCCommands_Server>>(
		command: CommandName,
		cb: (player: number, args: string[], rawCommand: string) => void,
		restricted = false,
	): this {
		this.log(`onCommand ${command}`)

		RegisterCommand(command, cb, restricted)

		return this
	}

	/**
	 * Listens to a native FiveM server event, e.g. `playerJoining`.
	 *
	 * @throws {@link RPCError} `UNKNOWN_NATIVE` if `eventName` is not in
	 *   `NATIVE_SERVER_EVENTS`. Register other events with FiveM's `on` directly
	 *
	 * @example
	 * rpc.onNativeEvent('playerJoining', (source, oldId) => console.log(source))
	 */
	public onNativeEvent<EventName extends keyof RPCNativeServerEvents>(
		eventName: EventName,
		cb: (...args: Parameters<RPCNativeServerEvents[EventName]>) => void,
	): this {
		if (!NATIVE_SERVER_EVENTS.includes(eventName)) {
			throw new RPCError(
				RPCErrors.UNKNOWN_NATIVE,
				unknownNativeMessage(eventName, 'NATIVE_SERVER_EVENTS'),
			)
		}

		this.log(`onNativeEvent ${eventName}`)

		on(eventName, cb)

		return this
	}
}
