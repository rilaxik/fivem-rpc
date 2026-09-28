import type * as s from '@entityseven/fivem-rpc-shared-types'

import { Emitter } from '../utils/emitter'
import { stringify } from '../utils/funcs'
import {
	RPCEvents,
	type RPCConfig,
	type RPCState,
	type RPCStateWeb,
} from '../utils/types'
import type {
	RPCEventArgs,
	RPCEventName,
	RPCEventResult,
	RPCListener,
} from '../utils/typing'
import { RPCInstanceBase } from './base'

/**
 * RPC instance for webview code, returned by `createRPC({ env: 'webview' })`.
 * Create one per webview and import it from your own module.
 *
 * - `on*` registers the listener that answers calls from one direction. One
 *   listener per event: registering the same name again replaces it, `off*`
 *   removes it
 * - `emit*` calls the listener on the target and resolves with its return
 *   value, or rejects with {@link RPCError}
 * - calls to and from the server are relayed by the player's client, which
 *   must run `createRPC({ env: 'client' })`
 */
export class RPCInstanceWebview extends RPCInstanceBase {
	private readonly _emitterClient: Emitter
	private readonly _emitterServer: Emitter

	constructor(props: RPCConfig<'webview'>) {
		super(props)

		this._emitterClient = new Emitter()
		this._emitterServer = new Emitter()

		console.log('[RPC] Initialized Webview')

		window.addEventListener(
			'message',
			(e: MessageEvent<Partial<RPCStateWeb> | null>) => {
				const origin = e.data?.origin
				// not ours, e.g. the resource's own SendNUIMessage calls
				if (
					origin !== RPCEvents.LISTENER_CLIENT &&
					origin !== RPCEvents.LISTENER_SERVER
				) {
					return
				}

				const payload = this.accept(e.data?.data)
				if (!payload) return

				if (origin === RPCEvents.LISTENER_CLIENT) this._handleClient(payload)
				else this._handleServer(payload)
			},
		)
	}

	// ===== HANDLERS =====

	private async _handleClient(payload: RPCState) {
		if (payload.calledFrom === 'client' && payload.type === 'event') {
			const response = await this.dispatch(this._emitterClient, payload)

			await this._createHttpClientRequest(response)
		}
	}

	private async _handleServer(payload: RPCState) {
		if (payload.calledFrom === 'server' && payload.type === 'event') {
			const response = await this.dispatch(this._emitterServer, payload)

			await this._createHttpClientRequest(response)
		}
	}

	// ===== CLIENT =====

	/**
	 * Listens for `emitWebview` calls from this player's client
	 * (client -> webview).
	 *
	 * @param cb - gets the event arguments. Its return value (awaited) is sent
	 *   back to the caller
	 *
	 * @example
	 * rpc.onClient('openMenu', items => menu.open(items))
	 */
	public onClient<EventName extends RPCEventName<s.RPCEvents_ClientWebview>>(
		eventName: EventName,
		cb: RPCListener<s.RPCEvents_ClientWebview, EventName>,
	): this {
		return this.listen(this._emitterClient, 'onClient', eventName, cb)
	}

	/** Removes the `onClient` listener for `eventName` */
	public offClient<EventName extends RPCEventName<s.RPCEvents_ClientWebview>>(
		eventName: EventName,
	): this {
		return this.unlisten(this._emitterClient, 'offClient', eventName)
	}

	/**
	 * Calls the client's `onWebview` listener (webview -> client) and resolves
	 * with its return value.
	 *
	 * @throws {@link RPCError} `EVENT_NOT_REGISTERED` (no listener),
	 *   `HANDLER_ERROR` (the listener threw) or `TIMEOUT`
	 *
	 * @example
	 * const position = await rpc.emitClient('getPosition')
	 */
	public async emitClient<
		EventName extends RPCEventName<s.RPCEvents_WebviewClient>,
	>(
		eventName: EventName,
		...args: RPCEventArgs<s.RPCEvents_WebviewClient, EventName>
	): Promise<RPCEventResult<s.RPCEvents_WebviewClient, EventName>> {
		const payload = this.request(eventName, 'client', args, null)

		return this._request(payload)
	}

	// ===== SERVER =====

	/**
	 * Listens for `emitWebview` calls from the server (server -> webview,
	 * relayed by the client).
	 *
	 * @param cb - gets the event arguments. Its return value (awaited) is sent
	 *   back to the caller
	 *
	 * @example
	 * rpc.onServer('confirmPurchase', item => window.confirm(`Buy ${item}?`))
	 */
	public onServer<EventName extends RPCEventName<s.RPCEvents_ServerWebview>>(
		eventName: EventName,
		cb: RPCListener<s.RPCEvents_ServerWebview, EventName>,
	): this {
		return this.listen(this._emitterServer, 'onServer', eventName, cb)
	}

	/** Removes the `onServer` listener for `eventName` */
	public offServer<EventName extends RPCEventName<s.RPCEvents_ServerWebview>>(
		eventName: EventName,
	): this {
		return this.unlisten(this._emitterServer, 'offServer', eventName)
	}

	/**
	 * Calls the server's `onWebview` listener (webview -> server, relayed by
	 * the client) and resolves with its return value. The server listener gets
	 * this player's id first.
	 *
	 * @throws {@link RPCError} `EVENT_NOT_REGISTERED` (no listener),
	 *   `HANDLER_ERROR` (the listener threw) or `TIMEOUT`
	 *
	 * @example
	 * const bought = await rpc.emitServer('buyItem', 'water')
	 */
	public async emitServer<
		EventName extends RPCEventName<s.RPCEvents_WebviewServer>,
	>(
		eventName: EventName,
		...args: RPCEventArgs<s.RPCEvents_WebviewServer, EventName>
	): Promise<RPCEventResult<s.RPCEvents_WebviewServer, EventName>> {
		const payload = this.request(eventName, 'server', args, null)

		return this._request(payload)
	}

	// ===== SELF =====

	/**
	 * Listens for `emitSelf` calls in this environment (webview -> webview).
	 *
	 * @param cb - gets the event arguments. Its return value (awaited) is sent
	 *   back to the caller
	 *
	 * @example
	 * rpc.onSelf('add', (a, b) => a + b)
	 */
	public onSelf<EventName extends RPCEventName<s.RPCEvents_Webview>>(
		eventName: EventName,
		cb: RPCListener<s.RPCEvents_Webview, EventName>,
	): this {
		return this.listen(this._emitterLocal, 'onSelf', eventName, cb)
	}

	/** Removes the `onSelf` listener for `eventName` */
	public offSelf<EventName extends RPCEventName<s.RPCEvents_Webview>>(
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
	public async emitSelf<EventName extends RPCEventName<s.RPCEvents_Webview>>(
		eventName: EventName,
		...args: RPCEventArgs<s.RPCEvents_Webview, EventName>
	): Promise<RPCEventResult<s.RPCEvents_Webview, EventName>> {
		return this.emitLocal(eventName, args)
	}

	// ===== UTILS =====

	/** Sends an event to the client and waits for its response (with timeout) */
	private _request<R>(payload: RPCState): Promise<R> {
		const response = this._pending.wait<R>(payload)
		this._createHttpClientRequest<RPCState>(payload).then(
			res => {
				const reply = this.accept(res)
				if (reply) this.settle(reply)
			},
			(error: Error) => this._pending.reject(payload.uuid, error),
		)
		return response
	}

	private async _createHttpClientRequest<R>(data: RPCState): Promise<R> {
		const options = {
			method: 'post',
			headers: {
				'Content-Type': 'application/json; charset=UTF-8',
			},
			body: stringify(data),
		}
		// FiveM injects GetParentResourceName into NUI pages. Without it (page
		// opened in a regular browser) the fetch fails and the call rejects.
		const resourceName = window?.GetParentResourceName?.() ?? 'nui-frame-app'
		return fetch(
			`https://${resourceName}/${RPCEvents.LISTENER_WEB}`,
			options,
		).then(res => res.json())
	}
}
