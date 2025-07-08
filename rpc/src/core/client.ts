import type * as s from '@entityseven/fivem-rpc-shared-types'
import { Emitter } from '../utils/emitter'
import { generateUUID, parse, stringify, stringifyWeb } from '../utils/funcs'
import {
	NATIVE_CLIENT_EVENTS,
	NATIVE_CLIENT_NETWORK_EVENTS,
} from '../utils/native'
import {
	type RPCConfig,
	RPCErrors,
	RPCEvents,
	type RPCNativeClientEvents,
	type RPCNativeClientNetworksEvents,
	type RPCState,
	type RPCStateRaw,
	type RPCStateWeb,
} from '../utils/types'
import { Wrapper } from './wrapper'

declare function onNet(eventName: string, callback: Function): void
declare function emitNet(eventName: string, ...args: unknown[]): void
declare function on(eventName: string, callback: Function): void
declare function RegisterNuiCallbackType(callbackType: string): void
declare function GetPlayerServerId(player: number): number
declare function PlayerId(): number
declare function SetNuiFocus(hasFocus: boolean, hasCursor: boolean): void
declare function RegisterCommand(
	commandName: string,
	handler: Function,
	restricted: boolean,
): void
declare function SendNuiMessage(jsonString: string): boolean

export class RPCInstanceClient extends Wrapper {
	private readonly _emitterServer: Emitter
	private readonly _pendingServer: Emitter
	private readonly _emitterWeb: Emitter
	private readonly _pendingWeb: Emitter
	private readonly _pendingWebToServer: Emitter

	constructor(props: RPCConfig<'client'>) {
		super(props)

		this._emitterServer = new Emitter()
		this._pendingServer = new Emitter()
		this._emitterWeb = new Emitter()
		this._pendingWeb = new Emitter()
		this._pendingWebToServer = new Emitter()

		this.console.log('[RPC] Initialized Client')

		onNet(RPCEvents.LISTENER_SERVER, this._handleServer.bind(this))
		RegisterNuiCallbackType(RPCEvents.LISTENER_WEB)
		on(
			`__cfx_nui:${RPCEvents.LISTENER_WEB}`,
			async (data: RPCState, callback: (res: unknown) => void) => {
				const res = await this._handleWeb(data)
				callback(res)
			},
		)
	}

	// ===== HANDLERS =====

	private async _handleServer(payloadRaw: RPCStateRaw) {
		try {
			parse(payloadRaw)
		} catch (e) {
			throw new Error(RPCErrors.INVALID_DATA)
		}
		const payload = parse(payloadRaw)

		if (this.debug) {
			this.console.log(
				`[RPC]:client:accepted ${payload.type} ${payload.event} from ${payload.calledFrom}`,
			)
		}

		if (payload.type === 'event') {
			if (payload.calledTo === 'client') {
				this.verifyEvent(this._emitterServer, payload)

				const responseData = await this._emitterServer.emit(
					payload.event,
					...(payload.data && payload.data.length > 0 ? payload.data : []),
				)

				const response: RPCState = {
					event: payload.event,
					uuid: payload.uuid,
					calledFrom: 'client',
					calledTo: 'server',
					error: null,
					data: [responseData],
					player: payload.player,
					type: 'response',
				}

				emitNet(RPCEvents.LISTENER_CLIENT, stringify(response))
			}
			if (payload.calledTo === 'webview') {
				this._sendWebMessage({
					origin: RPCEvents.LISTENER_SERVER,
					data: payload,
				})
			}
		}
		if (payload.type === 'response') {
			if (payload.calledTo === 'client') {
				await this._pendingServer.emit(
					payload.uuid,
					...(payload.data && payload.data.length > 0 ? payload.data : []),
				)
			}
			if (payload.calledTo === 'webview') {
				await this._pendingWebToServer.emit(
					payload.uuid,
					...(payload.data && payload.data.length > 0 ? payload.data : []),
				)
			}
		}
	}

	private async _handleWeb(payload: RPCState): Promise<unknown> {
		if (this.debug) {
			this.console.log(
				`[RPC]:client:accepted ${payload.type} ${payload.event} from ${payload.calledFrom}`,
			)
		}

		if (payload.type === 'event') {
			if (payload.calledTo === 'client') {
				return await this._emitterWeb.emit(
					payload.event,
					...(payload.data && payload.data.length > 0 ? payload.data : []),
				)
			}
			if (payload.calledTo === 'server') {
				payload.player = GetPlayerServerId(PlayerId())
				emitNet(RPCEvents.LISTENER_WEB, stringify(payload))

				return new Promise(res => {
					this._pendingWebToServer.once(payload.uuid, res)
				})
			}
		}

		if (payload.type === 'response') {
			if (payload.calledTo === 'client') {
				await this._pendingWeb.emit(
					payload.uuid,
					...(payload.data && payload.data.length > 0 ? payload.data : []),
				)

				return { status: 'ok' }
			}
			if (payload.calledTo === 'server') {
				payload.player = GetPlayerServerId(PlayerId())
				emitNet(RPCEvents.LISTENER_WEB, stringify(payload))

				return { status: 'ok' }
			}
		}
		return { status: 'unknown' }
	}

	// ===== SERVER =====

	public onServer<
		EventName extends keyof s.RPCEvents_ServerClient,
		CallbackArguments extends Parameters<s.RPCEvents_ServerClient[EventName]>,
		CallbackReturn extends ReturnType<s.RPCEvents_ServerClient[EventName]>,
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

	public offServer<EventName extends keyof s.RPCEvents_ServerClient>(
		eventName: EventName,
	): this {
		if (this.debug) {
			this.console.log(`[RPC]:offServer ${eventName}`)
		}

		this._emitterServer.off(eventName)

		return this
	}

	public async emitServer<
		EventName extends keyof s.RPCEvents_ClientServer,
		Arguments extends Parameters<s.RPCEvents_ClientServer[EventName]>,
		Response extends ReturnType<s.RPCEvents_ClientServer[EventName]>,
	>(eventName: EventName, ...args: Arguments): Promise<Awaited<Response>> {
		const payload: RPCState = {
			event: eventName,
			uuid: generateUUID(),
			calledFrom: 'client',
			calledTo: 'server',
			error: null,
			data: args.length ? args : null,
			player: GetPlayerServerId(PlayerId()),
			type: 'event',
		}

		emitNet(RPCEvents.LISTENER_CLIENT, stringify(payload))

		return new Promise<Awaited<Response>>(res => {
			this._pendingServer.once(payload.uuid, res)
		})
	}

	// ===== WEBVIEW =====

	public onWebview<
		EventName extends keyof s.RPCEvents_WebviewClient,
		CallbackArguments extends Parameters<s.RPCEvents_WebviewClient[EventName]>,
		CallbackReturn extends ReturnType<s.RPCEvents_WebviewClient[EventName]>,
	>(
		eventName: EventName,
		cb: (
			...args: CallbackArguments
		) => Awaited<CallbackReturn> | Promise<Awaited<CallbackReturn>>,
	): this {
		if (this.debug) {
			this.console.log(`[RPC]:onWebview ${eventName}`)
		}

		this._emitterWeb.on(eventName, cb)

		return this
	}

	public offWebview<EventName extends keyof s.RPCEvents_WebviewClient>(
		eventName: EventName,
	): this {
		if (this.debug) {
			this.console.log(`[RPC]:offWebview ${eventName}`)
		}

		this._emitterWeb.off(eventName)

		return this
	}

	public async emitWebview<
		EventName extends keyof s.RPCEvents_ClientWebview,
		Arguments extends Parameters<s.RPCEvents_ClientWebview[EventName]>,
		Response extends ReturnType<s.RPCEvents_ClientWebview[EventName]>,
	>(eventName: EventName, ...args: Arguments): Promise<Awaited<Response>> {
		const payload: RPCState = {
			event: eventName,
			uuid: generateUUID(),
			calledFrom: 'client',
			calledTo: 'webview',
			error: null,
			data: args.length ? args : null,
			player: PlayerId(),
			type: 'event',
		}

		this._sendWebMessage({
			origin: RPCEvents.LISTENER_CLIENT,
			data: payload,
		})

		return new Promise<Awaited<Response>>(res => {
			this._pendingWeb.once(payload.uuid, res)
		})
	}

	// ===== SELF =====

	public onSelf<
		EventName extends keyof s.RPCEvents_Client,
		CallbackArguments extends Parameters<s.RPCEvents_Client[EventName]>,
		CallbackReturn extends ReturnType<s.RPCEvents_Client[EventName]>,
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

	public offSelf<EventName extends keyof s.RPCEvents_Client>(
		eventName: EventName,
	): this {
		if (this.debug) {
			this.console.log(`[RPC]:offSelf ${eventName}`)
		}

		this._emitterLocal.off(eventName)

		return this
	}

	public async emitSelf<
		EventName extends keyof s.RPCEvents_Client,
		Arguments extends Parameters<s.RPCEvents_Client[EventName]>,
		Response extends ReturnType<s.RPCEvents_Client[EventName]>,
	>(eventName: EventName, ...args: Arguments): Promise<Awaited<Response>> {
		const payload: RPCState = {
			event: eventName,
			uuid: generateUUID(),
			calledFrom: 'client',
			calledTo: 'client',
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

	// ===== OTHER =====

	public onCommand<
		CommandName extends s.RPCCommands_Client,
		CallbackArguments extends unknown[],
	>(
		command: CommandName,
		cb: (player: number, args: CallbackArguments, commandRaw: string) => void,
	): this {
		if (this.debug) {
			this.console.log(`[RPC]:onCommand ${command}`)
		}

		RegisterCommand(command, cb, false)

		return this
	}

	public onNativeEvent<
		EventName extends keyof RPCNativeClientEvents,
		CallbackArguments extends Parameters<RPCNativeClientEvents[EventName]>,
	>(eventName: EventName, cb: (...args: CallbackArguments) => void): this {
		if (!NATIVE_CLIENT_EVENTS.includes(eventName)) {
			throw new Error(RPCErrors.UNKNOWN_NATIVE)
		}

		if (this.debug) {
			this.console.log(`[RPC]:onNativeEvent ${eventName}`)
		}

		on(eventName, cb)

		return this
	}

	public onNativeNetworkEvent<
		EventName extends keyof RPCNativeClientNetworksEvents,
		CallbackArguments extends Parameters<
			RPCNativeClientNetworksEvents[EventName]
		>,
	>(eventName: EventName, cb: (...args: CallbackArguments) => void): this {
		if (!NATIVE_CLIENT_NETWORK_EVENTS.includes(eventName)) {
			throw new Error(RPCErrors.UNKNOWN_NATIVE)
		}

		if (this.debug) {
			this.console.log(`[RPC]:onNativeNetworkEvent ${eventName}`)
		}

		on(eventName, cb)

		return this
	}

	public setWebviewFocus(hasFocus: boolean, hasCursor: boolean): this {
		if (this.debug) {
			this.console.log(`[RPC]:setWebviewFocus ${hasFocus} ${hasCursor}`)
		}

		SetNuiFocus(hasFocus, hasCursor)

		return this
	}

	// ===== UTILS =====

	private _sendWebMessage(payload: RPCStateWeb): void {
		SendNuiMessage(stringifyWeb(payload))
	}
}
