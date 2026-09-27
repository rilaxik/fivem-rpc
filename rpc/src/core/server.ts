import type * as s from '@entityseven/fivem-rpc-shared-types'

import { Emitter } from '../utils/emitter'
import { RPCError } from '../utils/errors'
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

export class RPCInstanceServer extends Wrapper {
	private readonly _emitterClient: Emitter
	private readonly _emitterWeb: Emitter

	constructor(props: RPCConfig<'server'>) {
		super(props)

		this._emitterClient = new Emitter()
		this._emitterWeb = new Emitter()

		this.console.log('[RPC] Initialized Server')

		onNet(RPCEvents.LISTENER_CLIENT, this._handleClient.bind(this))
		onNet(RPCEvents.LISTENER_WEB, this._handleWeb.bind(this))
	}

	// ===== HANDLERS =====

	private async _handleClient(payloadRaw: RPCStateRaw) {
		try {
			parse(payloadRaw)
		} catch {
			throw new RPCError(RPCErrors.INVALID_DATA, RPCErrors.INVALID_DATA)
		}
		const payload = parse(payloadRaw)

		if (this.debug) {
			this.console.log(
				`[RPC]:server:accepted ${payload.type} ${payload.event} from ${payload.calledFrom}`,
			)
		}

		if (payload.calledFrom === 'client') {
			if (payload.type === 'event') {
				if (payload.player === null || payload.player === -1) {
					// nobody to reply to, the caller times out
					this.console.error(
						new RPCError(
							RPCErrors.NO_PLAYER,
							`${RPCErrors.NO_PLAYER}: "${payload.event}" from ${payload.calledFrom}`,
						),
					)
					return
				}

				const response = await this.dispatch(
					this._emitterClient,
					payload,
					payload.player,
				)

				emitNet(RPCEvents.LISTENER_SERVER, response.player, stringify(response))
			}
			if (payload.type === 'response') {
				this.settle(payload)
			}
		}
	}

	private async _handleWeb(payloadRaw: RPCStateRaw) {
		try {
			parse(payloadRaw)
		} catch {
			throw new RPCError(RPCErrors.INVALID_DATA, RPCErrors.INVALID_DATA)
		}
		const payload = parse(payloadRaw)

		if (this.debug) {
			this.console.log(
				`[RPC]:server:accepted ${payload.type} ${payload.event} from ${payload.calledFrom}`,
			)
		}

		if (payload.calledFrom === 'webview') {
			if (payload.type === 'event') {
				if (payload.player === null || payload.player === -1) {
					// nobody to reply to, the caller times out
					this.console.error(
						new RPCError(
							RPCErrors.NO_PLAYER,
							`${RPCErrors.NO_PLAYER}: "${payload.event}" from ${payload.calledFrom}`,
						),
					)
					return
				}

				const response = await this.dispatch(
					this._emitterWeb,
					payload,
					payload.player,
				)

				emitNet(RPCEvents.LISTENER_SERVER, response.player, stringify(response))
			}
			if (payload.type === 'response') {
				this.settle(payload)
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

		return this._pending.wait<Awaited<Response>>(payload)
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

		return this._pending.wait<Awaited<Response>>(payload)
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

		this.assertListener(this._emitterLocal, payload.event)

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
			throw new RPCError(RPCErrors.UNKNOWN_NATIVE, RPCErrors.UNKNOWN_NATIVE)
		}

		if (this.debug) {
			this.console.log(`[RPC]:onNativeEvent ${eventName}`)
		}

		on(eventName, cb)

		return this
	}
}
