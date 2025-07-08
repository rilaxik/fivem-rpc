import type * as s from '@entityseven/fivem-rpc-shared-types'
import { Emitter } from '../utils/emitter'
import { generateUUID, stringify } from '../utils/funcs'
import {
	RPCEvents,
	type RPCConfig,
	type RPCState,
	type RPCStateRaw,
	type RPCStateWeb,
} from '../utils/types'
import { Wrapper } from './wrapper'

declare global {
	interface Window {
		GetParentResourceName?: () => string
	}
}

export class RPCInstanceWebview extends Wrapper {
	private readonly _emitterClient: Emitter
	private readonly _emitterServer: Emitter

	constructor(props: RPCConfig<'webview'>) {
		super(props)

		this._emitterClient = new Emitter()
		this._emitterServer = new Emitter()

		this.console.log('[RPC] Initialized Webview')

		window.addEventListener('message', (e: MessageEvent<RPCStateWeb>) => {
			if (e.data.origin === RPCEvents.LISTENER_CLIENT) {
				this._handleClient(e.data.data)
			}
			if (e.data.origin === RPCEvents.LISTENER_SERVER) {
				this._handleServer(e.data.data)
			}
		})
	}

	// ===== HANDLERS =====

	private async _handleClient(payload: RPCState) {
		if (this.debug) {
			this.console.log(
				`[RPC]:webview:accepted ${payload.type} ${payload.event} from ${payload.calledFrom}`,
			)
		}

		if (payload.calledFrom === 'client' && payload.type === 'event') {
			this.verifyEvent(this._emitterClient, payload)

			const responseData = await this._emitterClient.emit(
				payload.event,
				...(payload.data && payload.data.length > 0 ? payload.data : []),
			)

			const response: RPCState = {
				event: payload.event,
				uuid: payload.uuid,
				calledFrom: 'webview',
				calledTo: 'client',
				error: null,
				data: [responseData],
				player: payload.player,
				type: 'response',
			}

			await this._createHttpClientRequest(response).then()
		}
	}

	private async _handleServer(payload: RPCState) {
		if (this.debug) {
			this.console.log(
				`[RPC]:webview:accepted ${payload.type} ${payload.event} from ${payload.calledFrom}`,
			)
		}

		if (payload.calledFrom === 'server' && payload.type === 'event') {
			this.verifyEvent(this._emitterServer, payload)

			const responseData = await this._emitterServer.emit(
				payload.event,
				...(payload.data && payload.data.length > 0 ? payload.data : []),
			)

			const response: RPCState = {
				event: payload.event,
				uuid: payload.uuid,
				calledFrom: 'webview',
				calledTo: 'server',
				error: null,
				data: [responseData],
				player: payload.player,
				type: 'response',
			}

			await this._createHttpClientRequest(response)
		}
	}

	// ===== CLIENT =====

	public onClient<
		EventName extends keyof s.RPCEvents_ClientWebview,
		CallbackArguments extends Parameters<s.RPCEvents_ClientWebview[EventName]>,
		CallbackReturn extends ReturnType<s.RPCEvents_ClientWebview[EventName]>,
	>(
		eventName: EventName,
		cb: (
			...args: CallbackArguments
		) => Awaited<CallbackReturn> | Promise<Awaited<CallbackReturn>>,
	): this {
		if (this.debug) {
			this.console.log(`[RPC]:onClient ${eventName}`)
		}

		this._emitterClient.on(eventName, cb)

		return this
	}

	public offClient<EventName extends keyof s.RPCEvents_ClientWebview>(
		eventName: EventName,
	): this {
		if (this.debug) {
			this.console.log(`[RPC]:offClient ${eventName}`)
		}

		this._emitterClient.off(eventName)

		return this
	}

	public async emitClient<
		EventName extends keyof s.RPCEvents_WebviewClient,
		Arguments extends Parameters<s.RPCEvents_WebviewClient[EventName]>,
		Response extends ReturnType<s.RPCEvents_WebviewClient[EventName]>,
	>(eventName: EventName, ...args: Arguments): Promise<Awaited<Response>> {
		const payload: RPCState = {
			event: eventName,
			uuid: generateUUID(),
			calledFrom: 'webview',
			calledTo: 'client',
			error: null,
			data: args.length ? args : null,
			player: null,
			type: 'event',
		}

		return await this._createHttpClientRequest<Awaited<Response>>(payload)
	}

	// ===== SERVER =====

	public onServer<
		EventName extends keyof s.RPCEvents_ServerWebview,
		CallbackArguments extends Parameters<s.RPCEvents_ServerWebview[EventName]>,
		CallbackReturn extends ReturnType<s.RPCEvents_ServerWebview[EventName]>,
	>(
		eventName: EventName,
		cb: (
			...args: CallbackArguments
		) => Awaited<CallbackReturn> | Promise<Awaited<CallbackReturn>>,
	): this {
		if (this.debug) {
			this.console.log(`[RPC]:onServer ${eventName}`)
		}

		this._emitterServer.on(eventName, cb)

		return this
	}

	public offServer<EventName extends keyof s.RPCEvents_ServerWebview>(
		eventName: EventName,
	): RPCInstanceWebview {
		if (this.debug) {
			this.console.log(`[RPC]:offServer ${eventName}`)
		}

		this._emitterServer.off(eventName)

		return this
	}

	public async emitServer<
		EventName extends keyof s.RPCEvents_WebviewServer,
		Arguments extends Parameters<s.RPCEvents_WebviewServer[EventName]>,
		Response extends ReturnType<s.RPCEvents_WebviewServer[EventName]>,
	>(eventName: EventName, ...args: Arguments): Promise<Awaited<Response>> {
		const payload: RPCState = {
			event: eventName,
			uuid: generateUUID(),
			calledFrom: 'webview',
			calledTo: 'server',
			error: null,
			data: args.length ? args : null,
			player: null,
			type: 'event',
		}

		return await this._createHttpClientRequest<Awaited<Response>>(payload)
	}

	// ===== SELF =====

	public onSelf<
		EventName extends keyof s.RPCEvents_Webview,
		CallbackArguments extends Parameters<s.RPCEvents_Webview[EventName]>,
		CallbackReturn extends ReturnType<s.RPCEvents_Webview[EventName]>,
	>(
		eventName: EventName,
		cb: (
			...args: CallbackArguments
		) => Awaited<CallbackReturn> | Promise<Awaited<CallbackReturn>>,
	): this {
		if (this.debug) {
			this.console.log(`[RPC]:onSelf ${eventName}`)
		}

		this._emitterLocal.on(eventName, cb)

		return this
	}

	public offSelf<EventName extends keyof s.RPCEvents_Webview>(
		eventName: EventName,
	): this {
		if (this.debug) {
			this.console.log(`[RPC]:offSelf ${eventName}`)
		}

		this._emitterLocal.off(eventName)

		return this
	}

	public async emitSelf<
		EventName extends keyof s.RPCEvents_Webview,
		Arguments extends Parameters<s.RPCEvents_Webview[EventName]>,
		Response extends ReturnType<s.RPCEvents_Webview[EventName]>,
	>(eventName: EventName, ...args: Arguments): Promise<Awaited<Response>> {
		const payload: RPCState = {
			event: eventName,
			uuid: generateUUID(),
			calledFrom: 'webview',
			calledTo: 'webview',
			error: null,
			data: args.length ? args : null,
			player: null,
			type: 'event',
		}

		if (this.debug) {
			this.console.log(
				`[RPC]:accepted ${payload.event} from ${payload.calledFrom}`,
			)
		}

		this.verifyEvent(this._emitterLocal, payload)

		return await this._emitterLocal.emit<Awaited<Response>>(
			payload.event,
			...(payload.data && payload.data.length > 0 ? payload.data : []),
		)
	}

	// ===== UTILS =====

	private async _createHttpClientRequest<R>(
		data: RPCStateRaw | RPCState,
	): Promise<R> {
		const dataRaw = typeof data === 'string' ? data : stringify(data)
		const options = {
			method: 'post',
			headers: {
				'Content-Type': 'application/json; charset=UTF-8',
			},
			body: dataRaw,
		}
		const resourceName = window?.GetParentResourceName?.() ?? 'nui-frame-app'
		return fetch(
			`https://${resourceName}/${RPCEvents.LISTENER_WEB}`,
			options,
		).then(res => res.json())
	}
}
