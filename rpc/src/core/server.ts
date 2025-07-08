import type * as s from '@entityseven/fivem-rpc-shared-types'
import { Emitter } from '../utils/emitter'
import { generateUUID, parse, stringify } from '../utils/funcs'
import { NATIVE_SERVER_EVENTS } from '../utils/native'
import {
	type RPCConfig,
	RPCErrors,
	RPCEvents,
	type RPCNativeServerEvents,
	type RPCState,
	type RPCStateRaw,
} from '../utils/types'
import { Wrapper } from './wrapper'

declare function onNet(eventName: string, callback: Function): void
declare function emitNet(eventName: string, ...args: unknown[]): void
declare function on(eventName: string, callback: Function): void
declare function RegisterCommand(
	commandName: string,
	handler: Function,
	restricted: boolean,
): void

export class RPCInstanceServer extends Wrapper {
	private readonly _emitterClient: Emitter
	private readonly _pendingClient: Emitter
	private readonly _emitterWeb: Emitter
	private readonly _pendingWeb: Emitter

	constructor(props: RPCConfig<'server'>) {
		super(props)

		this._emitterClient = new Emitter()
		this._pendingClient = new Emitter()
		this._emitterWeb = new Emitter()
		this._pendingWeb = new Emitter()

		this.console.log('[RPC] Initialized Server')

		onNet(RPCEvents.LISTENER_CLIENT, this._handleClient.bind(this))
		onNet(RPCEvents.LISTENER_WEB, this._handleWeb.bind(this))
	}

	// ===== HANDLERS =====

	private async _handleClient(payloadRaw: RPCStateRaw) {
		try {
			parse(payloadRaw)
		} catch (e) {
			throw new Error(RPCErrors.INVALID_DATA)
		}
		const payload = parse(payloadRaw)

		if (this.debug) {
			this.console.log(
				`[RPC]:server:accepted ${payload.type} ${payload.event} from ${payload.calledFrom}`,
			)
		}

		if (payload.calledFrom === 'client') {
			if (payload.type === 'event') {
				this.verifyEvent(this._emitterClient, payload)
				if (payload.player === null || payload.player === -1) {
					payload.error = RPCErrors.NO_PLAYER
					this.triggerError(payload)
					return
				}

				const responseData = await this._emitterClient.emit(
					payload.event,
					payload.player,
					...(payload.data && payload.data.length > 0 ? payload.data : []),
				)

				const response: RPCState = {
					event: payload.event,
					uuid: payload.uuid,
					calledFrom: 'server',
					calledTo: 'client',
					error: null,
					data: [responseData],
					player: payload.player,
					type: 'response',
				}

				emitNet(RPCEvents.LISTENER_SERVER, response.player, stringify(response))
			}
			if (payload.type === 'response') {
				await this._pendingClient.emit(
					payload.uuid,
					...(payload.data && payload.data.length > 0 ? payload.data : []),
				)
			}
		}
	}

	private async _handleWeb(payloadRaw: RPCStateRaw) {
		try {
			parse(payloadRaw)
		} catch (e) {
			throw new Error(RPCErrors.INVALID_DATA)
		}
		const payload = parse(payloadRaw)

		if (this.debug) {
			this.console.log(
				`[RPC]:server:accepted ${payload.type} ${payload.event} from ${payload.calledFrom}`,
			)
		}

		if (payload.calledFrom === 'webview') {
			if (payload.type === 'event') {
				this.verifyEvent(this._emitterWeb, payload)
				if (payload.player === null || payload.player === -1) {
					payload.error = RPCErrors.NO_PLAYER
					this.triggerError(payload)
					return
				}

				const responseData = await this._emitterWeb.emit(
					payload.event,
					payload.player,
					...(payload.data && payload.data.length > 0 ? payload.data : []),
				)

				const response: RPCState = {
					event: payload.event,
					uuid: payload.uuid,
					calledFrom: 'server',
					calledTo: 'webview',
					error: null,
					data: [responseData],
					player: payload.player,
					type: 'response',
				}

				emitNet(RPCEvents.LISTENER_SERVER, response.player, stringify(response))
			}
			if (payload.type === 'response') {
				await this._pendingWeb.emit(
					payload.uuid,
					...(payload.data && payload.data.length > 0 ? payload.data : []),
				)
			}
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
		if (this.debug) {
			this.console.log(`[RPC]:onClient ${eventName}`)
		}

		this._emitterClient.on(eventName, cb)

		return this
	}

	public offClient<EventName extends keyof s.RPCEvents_ClientServer>(
		eventName: EventName,
	): this {
		if (this.debug) {
			this.console.log(`[RPC]:offClient ${eventName}`)
		}

		this._emitterClient.off(eventName)

		return this
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
		const payload: RPCState = {
			event: eventName,
			uuid: generateUUID(),
			calledFrom: 'server',
			calledTo: 'client',
			error: null,
			data: args.length ? args : null,
			player: player,
			type: 'event',
		}

		emitNet(RPCEvents.LISTENER_SERVER, player, stringify(payload))

		return new Promise<Awaited<Response>>(res => {
			this._pendingClient.once(payload.uuid, res)
		})
	}

	public async emitClientEveryone<
		EventName extends keyof s.RPCEvents_ServerClient,
		Arguments extends Parameters<s.RPCEvents_ServerClient[EventName]>,
	>(eventName: EventName, ...args: Arguments): Promise<void> {
		const payload: RPCState = {
			event: eventName,
			uuid: generateUUID(),
			calledFrom: 'server',
			calledTo: 'client',
			error: null,
			data: args.length ? args : null,
			player: -1,
			type: 'event',
		}

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
		if (this.debug) {
			this.console.log(`[RPC]:onWebview ${eventName}`)
		}

		this._emitterWeb.on(eventName, cb)

		return this
	}

	public offWebview<EventName extends keyof s.RPCEvents_WebviewServer>(
		eventName: EventName,
	): this {
		if (this.debug) {
			this.console.log(`[RPC]:offWebview ${eventName}`)
		}

		this._emitterWeb.off(eventName)

		return this
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
		const payload: RPCState = {
			event: eventName,
			uuid: generateUUID(),
			calledFrom: 'server',
			calledTo: 'webview',
			error: null,
			data: args.length ? args : null,
			player: player,
			type: 'event',
		}

		emitNet(RPCEvents.LISTENER_SERVER, player, stringify(payload))

		return new Promise<Awaited<Response>>(res => {
			this._pendingWeb.once(payload.uuid, res)
		})
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
		if (this.debug) {
			this.console.log(`[RPC]:onSelf ${eventName}`)
		}

		this._emitterLocal.on(eventName, cb)

		return this
	}

	public offSelf<EventName extends keyof s.RPCEvents_Server>(
		eventName: EventName,
	): this {
		if (this.debug) {
			this.console.log(`[RPC]:offSelf ${eventName}`)
		}

		this._emitterLocal.off(eventName)

		return this
	}

	public async emitSelf<
		EventName extends keyof s.RPCEvents_Server,
		Arguments extends Parameters<s.RPCEvents_Server[EventName]>,
		Response extends ReturnType<s.RPCEvents_Server[EventName]>,
	>(eventName: EventName, ...args: Arguments): Promise<Awaited<Response>> {
		const payload: RPCState = {
			event: eventName,
			uuid: generateUUID(),
			calledFrom: 'server',
			calledTo: 'server',
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
		CommandName extends s.RPCCommands_Server,
		CallbackArguments extends unknown[],
	>(
		command: CommandName,
		cb: (player: number, args: CallbackArguments, commandRaw: string) => void,
		restricted = false,
	): this {
		if (this.debug) {
			this.console.log(`[RPC]:onCommand ${command}`)
		}

		RegisterCommand(command, cb, restricted)

		return this
	}

	public onNativeEvent<
		EventName extends keyof RPCNativeServerEvents,
		CallbackArguments extends Parameters<RPCNativeServerEvents[EventName]>,
	>(eventName: EventName, cb: (...args: CallbackArguments) => void): this {
		if (!NATIVE_SERVER_EVENTS.includes(eventName)) {
			throw new Error(RPCErrors.UNKNOWN_NATIVE)
		}

		if (this.debug) {
			this.console.log(`[RPC]:onNativeEvent ${eventName}`)
		}

		on(eventName, cb)

		return this
	}
}
