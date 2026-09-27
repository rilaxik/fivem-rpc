import { Emitter } from '../utils/emitter'
import {
	handlerErrorMessage,
	notRegisteredMessage,
	RPCError,
} from '../utils/errors'
import { Pending } from '../utils/pending'
import {
	type RPCConfig,
	type RPCEnvironment,
	RPCErrors,
	type RPCState,
} from '../utils/types'

export class Wrapper {
	protected env: RPCEnvironment
	protected _emitterLocal: Emitter
	protected _pending: Pending
	protected debug: boolean
	protected console: Console

	constructor(cfg: RPCConfig<RPCEnvironment>) {
		this.env = cfg.env
		this._emitterLocal = new Emitter()
		this._pending = new Pending(cfg.timeout ?? 5000)
		this.debug = cfg.debug ?? false
		this.console = console
	}

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
			this.console.error(e)
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

	/** Settles the call waiting for `response`; ignores late or unexpected ones */
	protected settle(response: RPCState): void {
		const found = response.error
			? this._pending.reject(response.uuid, RPCError.fromResponse(response))
			: this._pending.resolve(response.uuid, response.data?.[0])

		if (!found) this.logIgnored(response)
	}

	/** Throws if no local listener is registered for `event` */
	protected assertListener(emitter: Emitter, event: string): void {
		if (!emitter.has(event)) {
			throw new RPCError(
				RPCErrors.EVENT_NOT_REGISTERED,
				notRegisteredMessage(event, this.env, this.env),
				{ event, uuid: '', from: this.env, to: this.env },
			)
		}
	}

	protected logIgnored(response: RPCState): void {
		if (this.debug) {
			this.console.log(
				`[RPC]:ignored response ${response.event} ${response.uuid} (no pending call, possibly timed out)`,
			)
		}
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
