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

	public onClient<EventName extends RPCEventName<s.RPCEvents_ClientWebview>>(
		eventName: EventName,
		cb: RPCListener<s.RPCEvents_ClientWebview, EventName>,
	): this {
		return this.listen(this._emitterClient, 'onClient', eventName, cb)
	}

	public offClient<EventName extends RPCEventName<s.RPCEvents_ClientWebview>>(
		eventName: EventName,
	): this {
		return this.unlisten(this._emitterClient, 'offClient', eventName)
	}

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

	public onServer<EventName extends RPCEventName<s.RPCEvents_ServerWebview>>(
		eventName: EventName,
		cb: RPCListener<s.RPCEvents_ServerWebview, EventName>,
	): this {
		return this.listen(this._emitterServer, 'onServer', eventName, cb)
	}

	public offServer<EventName extends RPCEventName<s.RPCEvents_ServerWebview>>(
		eventName: EventName,
	): this {
		return this.unlisten(this._emitterServer, 'offServer', eventName)
	}

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

	public onSelf<EventName extends RPCEventName<s.RPCEvents_Webview>>(
		eventName: EventName,
		cb: RPCListener<s.RPCEvents_Webview, EventName>,
	): this {
		return this.listen(this._emitterLocal, 'onSelf', eventName, cb)
	}

	public offSelf<EventName extends RPCEventName<s.RPCEvents_Webview>>(
		eventName: EventName,
	): this {
		return this.unlisten(this._emitterLocal, 'offSelf', eventName)
	}

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
