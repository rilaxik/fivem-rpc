import type * as s from '@entityseven/fivem-rpc-shared-types'

import { Emitter } from '../utils/emitter'
import { RPCError } from '../utils/errors'
import { parse, stringify, stringifyWeb } from '../utils/funcs'
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
import { RPCInstanceBase } from './base'

export class RPCInstanceClient extends RPCInstanceBase {
	private readonly _emitterServer: Emitter
	private readonly _emitterWeb: Emitter

	constructor(props: RPCConfig<'client'>) {
		super(props)

		this._emitterServer = new Emitter()
		this._emitterWeb = new Emitter()

		console.log('[RPC] Initialized Client')

		onNet(RPCEvents.LISTENER_SERVER, this._handleServer.bind(this))
		RegisterNuiCallbackType(RPCEvents.LISTENER_WEB)
		on(
			`__cfx_nui:${RPCEvents.LISTENER_WEB}`,
			async (data: RPCState, callback: (res: unknown) => void) => {
				try {
					callback(await this._handleWeb(data))
				} catch (e) {
					callback(this.errorResponse(data, e))
				}
			},
		)
	}

	// ===== HANDLERS =====

	private async _handleServer(payloadRaw: RPCStateRaw) {
		try {
			parse(payloadRaw)
		} catch {
			throw new RPCError(RPCErrors.INVALID_DATA, RPCErrors.INVALID_DATA)
		}
		const payload = parse(payloadRaw)

		this.log(
			`accepted ${payload.type} ${payload.event} from ${payload.calledFrom}`,
		)

		if (payload.type === 'event') {
			if (payload.calledTo === 'client') {
				const response = await this.dispatch(this._emitterServer, payload)

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
				this.settle(payload)
			}
			if (payload.calledTo === 'webview') {
				// relayed webview -> server call: the webview gets the whole response
				if (!this._pending.resolve(payload.uuid, payload)) {
					this.logIgnored(payload)
				}
			}
		}
	}

	private async _handleWeb(payload: RPCState): Promise<unknown> {
		this.log(
			`accepted ${payload.type} ${payload.event} from ${payload.calledFrom}`,
		)

		if (payload.type === 'event') {
			if (payload.calledTo === 'client') {
				return this.dispatch(this._emitterWeb, payload)
			}
			if (payload.calledTo === 'server') {
				payload.player = GetPlayerServerId(PlayerId())
				emitNet(RPCEvents.LISTENER_WEB, stringify(payload))

				return this._pending.wait<RPCState>(payload)
			}
		}

		if (payload.type === 'response') {
			if (payload.calledTo === 'client') {
				this.settle(payload)

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
		return this.listen(this._emitterServer, 'onServer', eventName, cb)
	}

	public offServer<EventName extends keyof s.RPCEvents_ServerClient>(
		eventName: EventName,
	): this {
		return this.unlisten(this._emitterServer, 'offServer', eventName)
	}

	public async emitServer<
		EventName extends keyof s.RPCEvents_ClientServer,
		Arguments extends Parameters<s.RPCEvents_ClientServer[EventName]>,
		Response extends ReturnType<s.RPCEvents_ClientServer[EventName]>,
	>(eventName: EventName, ...args: Arguments): Promise<Awaited<Response>> {
		const payload = this.request(
			eventName,
			'server',
			args,
			GetPlayerServerId(PlayerId()),
		)

		emitNet(RPCEvents.LISTENER_CLIENT, stringify(payload))

		return this._pending.wait<Awaited<Response>>(payload)
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
		return this.listen(this._emitterWeb, 'onWebview', eventName, cb)
	}

	public offWebview<EventName extends keyof s.RPCEvents_WebviewClient>(
		eventName: EventName,
	): this {
		return this.unlisten(this._emitterWeb, 'offWebview', eventName)
	}

	public async emitWebview<
		EventName extends keyof s.RPCEvents_ClientWebview,
		Arguments extends Parameters<s.RPCEvents_ClientWebview[EventName]>,
		Response extends ReturnType<s.RPCEvents_ClientWebview[EventName]>,
	>(eventName: EventName, ...args: Arguments): Promise<Awaited<Response>> {
		const payload = this.request(eventName, 'webview', args, PlayerId())

		this._sendWebMessage({
			origin: RPCEvents.LISTENER_CLIENT,
			data: payload,
		})

		return this._pending.wait<Awaited<Response>>(payload)
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
		return this.listen(this._emitterLocal, 'onSelf', eventName, cb)
	}

	public offSelf<EventName extends keyof s.RPCEvents_Client>(
		eventName: EventName,
	): this {
		return this.unlisten(this._emitterLocal, 'offSelf', eventName)
	}

	public async emitSelf<
		EventName extends keyof s.RPCEvents_Client,
		Arguments extends Parameters<s.RPCEvents_Client[EventName]>,
		Response extends ReturnType<s.RPCEvents_Client[EventName]>,
	>(eventName: EventName, ...args: Arguments): Promise<Awaited<Response>> {
		return this.emitLocal<Awaited<Response>>(eventName, args)
	}

	// ===== OTHER =====

	public onCommand<
		CommandName extends s.RPCCommands_Client,
		CallbackArguments extends unknown[],
	>(
		command: CommandName,
		cb: (player: number, args: CallbackArguments, commandRaw: string) => void,
	): this {
		this.log(`onCommand ${command}`)

		RegisterCommand(command, cb, false)

		return this
	}

	public onNativeEvent<
		EventName extends keyof RPCNativeClientEvents,
		CallbackArguments extends Parameters<RPCNativeClientEvents[EventName]>,
	>(eventName: EventName, cb: (...args: CallbackArguments) => void): this {
		if (!NATIVE_CLIENT_EVENTS.includes(eventName)) {
			throw new RPCError(RPCErrors.UNKNOWN_NATIVE, RPCErrors.UNKNOWN_NATIVE)
		}

		this.log(`onNativeEvent ${eventName}`)

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
			throw new RPCError(RPCErrors.UNKNOWN_NATIVE, RPCErrors.UNKNOWN_NATIVE)
		}

		this.log(`onNativeNetworkEvent ${eventName}`)

		on(eventName, cb)

		return this
	}

	public setWebviewFocus(hasFocus: boolean, hasCursor: boolean): this {
		this.log(`setWebviewFocus ${hasFocus} ${hasCursor}`)

		SetNuiFocus(hasFocus, hasCursor)

		return this
	}

	// ===== UTILS =====

	private _sendWebMessage(payload: RPCStateWeb): void {
		SendNuiMessage(stringifyWeb(payload))
	}
}
