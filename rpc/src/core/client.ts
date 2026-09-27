import type * as s from '@entityseven/fivem-rpc-shared-types'

import { Emitter } from '../utils/emitter'
import { RPCError, unknownNativeMessage } from '../utils/errors'
import { stringify, stringifyWeb } from '../utils/funcs'
import {
	NATIVE_CLIENT_EVENTS,
	NATIVE_CLIENT_NETWORK_EVENTS,
} from '../utils/native'
import {
	type RPCConfig,
	RPCErrors,
	RPCEvents,
	type RPCNativeClientEvents,
	type RPCNativeClientNetworkEvents,
	type RPCState,
	type RPCStateRaw,
	type RPCStateWeb,
} from '../utils/types'
import type {
	RPCCommandName,
	RPCEventArgs,
	RPCEventName,
	RPCEventResult,
	RPCListener,
} from '../utils/typing'
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
			async (data: unknown, callback: (res: unknown) => void) => {
				const payload = this.accept(data)
				if (!payload) return callback({ status: 'invalid' })

				try {
					callback(await this._handleWeb(payload))
				} catch (e) {
					callback(this.errorResponse(payload, e))
				}
			},
		)
	}

	// ===== HANDLERS =====

	private async _handleServer(payloadRaw: RPCStateRaw) {
		const payload = this.accept(payloadRaw)
		if (!payload) return

		if (payload.type === 'event' || payload.type === 'broadcast') {
			if (payload.calledTo === 'client') {
				const response = await this.dispatch(this._emitterServer, payload)

				if (payload.type === 'event') {
					emitNet(RPCEvents.LISTENER_CLIENT, stringify(response))
				} else if (response.error) {
					// nobody waits for a broadcast, so its failures only show up here
					this.log(
						`broadcast ${payload.event} failed: ${response.error.message}`,
					)
				}
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
		if (payload.type === 'event') {
			if (payload.calledTo === 'client') {
				return this.dispatch(this._emitterWeb, payload)
			}
			if (payload.calledTo === 'server') {
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
				emitNet(RPCEvents.LISTENER_WEB, stringify(payload))

				return { status: 'ok' }
			}
		}
		return { status: 'unknown' }
	}

	// ===== SERVER =====

	public onServer<EventName extends RPCEventName<s.RPCEvents_ServerClient>>(
		eventName: EventName,
		cb: RPCListener<s.RPCEvents_ServerClient, EventName>,
	): this {
		return this.listen(this._emitterServer, 'onServer', eventName, cb)
	}

	public offServer<EventName extends RPCEventName<s.RPCEvents_ServerClient>>(
		eventName: EventName,
	): this {
		return this.unlisten(this._emitterServer, 'offServer', eventName)
	}

	public async emitServer<
		EventName extends RPCEventName<s.RPCEvents_ClientServer>,
	>(
		eventName: EventName,
		...args: RPCEventArgs<s.RPCEvents_ClientServer, EventName>
	): Promise<RPCEventResult<s.RPCEvents_ClientServer, EventName>> {
		const payload = this.request(eventName, 'server', args, null)

		emitNet(RPCEvents.LISTENER_CLIENT, stringify(payload))

		return this._pending.wait(payload)
	}

	// ===== WEBVIEW =====

	public onWebview<EventName extends RPCEventName<s.RPCEvents_WebviewClient>>(
		eventName: EventName,
		cb: RPCListener<s.RPCEvents_WebviewClient, EventName>,
	): this {
		return this.listen(this._emitterWeb, 'onWebview', eventName, cb)
	}

	public offWebview<EventName extends RPCEventName<s.RPCEvents_WebviewClient>>(
		eventName: EventName,
	): this {
		return this.unlisten(this._emitterWeb, 'offWebview', eventName)
	}

	public async emitWebview<
		EventName extends RPCEventName<s.RPCEvents_ClientWebview>,
	>(
		eventName: EventName,
		...args: RPCEventArgs<s.RPCEvents_ClientWebview, EventName>
	): Promise<RPCEventResult<s.RPCEvents_ClientWebview, EventName>> {
		const payload = this.request(eventName, 'webview', args, null)

		this._sendWebMessage({
			origin: RPCEvents.LISTENER_CLIENT,
			data: payload,
		})

		return this._pending.wait(payload)
	}

	// ===== SELF =====

	public onSelf<EventName extends RPCEventName<s.RPCEvents_Client>>(
		eventName: EventName,
		cb: RPCListener<s.RPCEvents_Client, EventName>,
	): this {
		return this.listen(this._emitterLocal, 'onSelf', eventName, cb)
	}

	public offSelf<EventName extends RPCEventName<s.RPCEvents_Client>>(
		eventName: EventName,
	): this {
		return this.unlisten(this._emitterLocal, 'offSelf', eventName)
	}

	public async emitSelf<EventName extends RPCEventName<s.RPCEvents_Client>>(
		eventName: EventName,
		...args: RPCEventArgs<s.RPCEvents_Client, EventName>
	): Promise<RPCEventResult<s.RPCEvents_Client, EventName>> {
		return this.emitLocal(eventName, args)
	}

	// ===== OTHER =====

	public onCommand<CommandName extends RPCCommandName<s.RPCCommands_Client>>(
		command: CommandName,
		cb: (player: number, args: string[], rawCommand: string) => void,
	): this {
		this.log(`onCommand ${command}`)

		RegisterCommand(command, cb, false)

		return this
	}

	public onNativeEvent<EventName extends keyof RPCNativeClientEvents>(
		eventName: EventName,
		cb: (...args: Parameters<RPCNativeClientEvents[EventName]>) => void,
	): this {
		if (!NATIVE_CLIENT_EVENTS.includes(eventName)) {
			throw new RPCError(
				RPCErrors.UNKNOWN_NATIVE,
				unknownNativeMessage(eventName, 'NATIVE_CLIENT_EVENTS'),
			)
		}

		this.log(`onNativeEvent ${eventName}`)

		on(eventName, cb)

		return this
	}

	public onNativeNetworkEvent<
		EventName extends keyof RPCNativeClientNetworkEvents,
	>(
		eventName: EventName,
		cb: (...args: Parameters<RPCNativeClientNetworkEvents[EventName]>) => void,
	): this {
		if (!NATIVE_CLIENT_NETWORK_EVENTS.includes(eventName)) {
			throw new RPCError(
				RPCErrors.UNKNOWN_NATIVE,
				unknownNativeMessage(eventName, 'NATIVE_CLIENT_NETWORK_EVENTS'),
			)
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
