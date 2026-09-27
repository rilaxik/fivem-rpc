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
import { RPCInstanceBase } from './base'

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

	public onClient<
		EventName extends keyof s.RPCEvents_ClientServer,
		CallbackArguments extends Parameters<s.RPCEvents_ClientServer[EventName]>,
		CallbackReturn extends ReturnType<s.RPCEvents_ClientServer[EventName]>,
	>(
		eventName: EventName,
		cb: (
			player: number,
			...args: CallbackArguments
		) => Awaited<CallbackReturn> | Promise<Awaited<CallbackReturn>>,
	): this {
		return this.listen(this._emitterClient, 'onClient', eventName, cb)
	}

	public offClient<EventName extends keyof s.RPCEvents_ClientServer>(
		eventName: EventName,
	): this {
		return this.unlisten(this._emitterClient, 'offClient', eventName)
	}

	public async emitClient<
		EventName extends keyof s.RPCEvents_ServerClient,
		Arguments extends Parameters<s.RPCEvents_ServerClient[EventName]>,
		Response extends ReturnType<s.RPCEvents_ServerClient[EventName]>,
	>(
		player: number,
		eventName: EventName,
		...args: Arguments
	): Promise<Awaited<Response>> {
		const payload = this.request(eventName, 'client', args, player)

		emitNet(RPCEvents.LISTENER_SERVER, player, stringify(payload))

		return this._pending.wait<Awaited<Response>>(payload, player)
	}

	public async emitClientEveryone<
		EventName extends keyof s.RPCEvents_ServerClient,
		Arguments extends Parameters<s.RPCEvents_ServerClient[EventName]>,
	>(eventName: EventName, ...args: Arguments): Promise<void> {
		const payload = this.request(eventName, 'client', args, -1, 'broadcast')

		emitNet(RPCEvents.LISTENER_SERVER, -1, stringify(payload))
	}

	// ===== WEBVIEW =====

	public onWebview<
		EventName extends keyof s.RPCEvents_WebviewServer,
		CallbackArguments extends Parameters<s.RPCEvents_WebviewServer[EventName]>,
		CallbackReturn extends ReturnType<s.RPCEvents_WebviewServer[EventName]>,
	>(
		eventName: EventName,
		cb: (
			player: number,
			...args: CallbackArguments
		) => Awaited<CallbackReturn> | Promise<Awaited<CallbackReturn>>,
	): this {
		return this.listen(this._emitterWeb, 'onWebview', eventName, cb)
	}

	public offWebview<EventName extends keyof s.RPCEvents_WebviewServer>(
		eventName: EventName,
	): this {
		return this.unlisten(this._emitterWeb, 'offWebview', eventName)
	}

	public async emitWebview<
		EventName extends keyof s.RPCEvents_ServerWebview,
		Arguments extends Parameters<s.RPCEvents_ServerWebview[EventName]>,
		Response extends ReturnType<s.RPCEvents_ServerWebview[EventName]>,
	>(
		player: number,
		eventName: EventName,
		...args: Arguments
	): Promise<Awaited<Response>> {
		const payload = this.request(eventName, 'webview', args, player)

		emitNet(RPCEvents.LISTENER_SERVER, player, stringify(payload))

		return this._pending.wait<Awaited<Response>>(payload, player)
	}

	// ===== SELF =====

	public onSelf<
		EventName extends keyof s.RPCEvents_Server,
		CallbackArguments extends Parameters<s.RPCEvents_Server[EventName]>,
		CallbackReturn extends ReturnType<s.RPCEvents_Server[EventName]>,
	>(
		eventName: EventName,
		cb: (
			...args: CallbackArguments
		) => Awaited<CallbackReturn> | Promise<Awaited<CallbackReturn>>,
	): this {
		return this.listen(this._emitterLocal, 'onSelf', eventName, cb)
	}

	public offSelf<EventName extends keyof s.RPCEvents_Server>(
		eventName: EventName,
	): this {
		return this.unlisten(this._emitterLocal, 'offSelf', eventName)
	}

	public async emitSelf<
		EventName extends keyof s.RPCEvents_Server,
		Arguments extends Parameters<s.RPCEvents_Server[EventName]>,
		Response extends ReturnType<s.RPCEvents_Server[EventName]>,
	>(eventName: EventName, ...args: Arguments): Promise<Awaited<Response>> {
		return this.emitLocal<Awaited<Response>>(eventName, args)
	}

	// ===== OTHER =====

	public onCommand<
		CommandName extends s.RPCCommands_Server,
		CallbackArguments extends unknown[],
	>(
		command: CommandName,
		cb: (player: number, args: CallbackArguments, commandRaw: string) => void,
		restricted = false,
	): this {
		this.log(`onCommand ${command}`)

		RegisterCommand(command, cb, restricted)

		return this
	}

	public onNativeEvent<
		EventName extends keyof RPCNativeServerEvents,
		CallbackArguments extends Parameters<RPCNativeServerEvents[EventName]>,
	>(eventName: EventName, cb: (...args: CallbackArguments) => void): this {
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
