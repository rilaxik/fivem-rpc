import { Emitter, type Handler } from '../utils/emitter'
import {
	handlerErrorMessage,
	notRegisteredMessage,
	RPCError,
} from '../utils/errors'
import { generateUUID } from '../utils/funcs'
import { Pending } from '../utils/pending'
import {
	type RPCConfig,
	type RPCEnvironment,
	RPCErrors,
	type RPCState,
} from '../utils/types'

/** Shared plumbing of the server, client and webview instances */
export class RPCInstanceBase {
	protected readonly env: RPCEnvironment
	protected readonly debug: boolean
	protected readonly _emitterLocal = new Emitter()
	protected readonly _pending: Pending

	constructor(cfg: RPCConfig<RPCEnvironment>) {
		this.env = cfg.env
		this.debug = cfg.debug ?? false
		this._pending = new Pending(cfg.timeout ?? 5000)
	}

	// ===== LISTENERS =====

	/** Registers `cb` for `event` on `emitter`; `method` is only used for logs */
	protected listen(
		emitter: Emitter,
		method: string,
		event: string,
		cb: Handler,
	): this {
		this.log(`${method} ${event}`)
		emitter.on(event, cb)
		return this
	}

	protected unlisten(emitter: Emitter, method: string, event: string): this {
		this.log(`${method} ${event}`)
		emitter.off(event)
		return this
	}

	// ===== OUTGOING =====

	/** Builds an event payload sent from this environment to `to` */
	protected request(
		event: string,
		to: RPCEnvironment,
		args: unknown[],
		player: number | null,
	): RPCState {
		return {
			event,
			uuid: generateUUID(),
			calledFrom: this.env,
			calledTo: to,
			error: null,
			data: args,
			player,
			type: 'event',
		}
	}

	/** Calls a listener registered with `onSelf` in this environment */
	protected emitLocal<R>(event: string, args: unknown[]): Promise<R> {
		this.log(`emitSelf ${event}`)
		if (!this._emitterLocal.has(event)) {
			throw new RPCError(
				RPCErrors.EVENT_NOT_REGISTERED,
				notRegisteredMessage(event, this.env, this.env),
				{ event, uuid: '', from: this.env, to: this.env },
			)
		}
		return this._emitterLocal.emit<R>(event, ...args)
	}

	/** Settles the call waiting for `response`; ignores late or unexpected ones */
	protected settle(response: RPCState): void {
		const found = response.error
			? this._pending.reject(response.uuid, RPCError.fromResponse(response))
			: this._pending.resolve(response.uuid, response.data?.[0])

		if (!found) this.logIgnored(response)
	}

	// ===== INCOMING =====

	/**
	 * Runs the listener for `request` and builds the response to send back.
	 * Never throws: a missing listener or a thrown error ends up in `error`.
	 *
	 * @param prefix - arguments passed before the request data (server: player)
	 */
	protected async dispatch(
		emitter: Emitter,
		request: RPCState,
		...prefix: unknown[]
	): Promise<RPCState> {
		if (!emitter.has(request.event)) {
			return this.errorResponse(
				request,
				new RPCError(
					RPCErrors.EVENT_NOT_REGISTERED,
					notRegisteredMessage(request.event, this.env, request.calledFrom),
				),
			)
		}

		try {
			const data = await emitter.emit(
				request.event,
				...prefix,
				...(request.data ?? []),
			)
			return this.response(request, [data], null)
		} catch (e) {
			// keep the stack visible where the listener lives
			console.error(e)
			return this.errorResponse(
				request,
				new RPCError(
					RPCErrors.HANDLER_ERROR,
					handlerErrorMessage(request.event, this.env, e),
				),
			)
		}
	}

	/** Builds the response to `request` carrying `error` */
	protected errorResponse(request: RPCState, error: unknown): RPCState {
		const rpcError =
			error instanceof RPCError
				? error
				: new RPCError(
						RPCErrors.HANDLER_ERROR,
						handlerErrorMessage(request.event, this.env, error),
					)
		return this.response(request, null, {
			code: rpcError.code,
			message: rpcError.message,
		})
	}

	// ===== LOGS =====

	/** Debug-only log, prefixed with the environment */
	protected log(message: string): void {
		if (this.debug) console.log(`[RPC]:${this.env}:${message}`)
	}

	protected logIgnored(response: RPCState): void {
		this.log(
			`ignored response ${response.event} ${response.uuid} (no pending call, possibly timed out)`,
		)
	}

	private response(
		request: RPCState,
		data: RPCState['data'],
		error: RPCState['error'],
	): RPCState {
		return {
			event: request.event,
			uuid: request.uuid,
			calledFrom: this.env,
			calledTo: request.calledFrom,
			error,
			data,
			player: request.player,
			type: 'response',
		}
	}
}
