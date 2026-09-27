import { RPCError, timeoutMessage } from './errors'
import { RPCErrors, type RPCState } from './types'

type Call = {
	resolve: (data: unknown) => void
	reject: (error: Error) => void
	timer: ReturnType<typeof setTimeout> | undefined
}

/** Calls waiting for a response, keyed by payload uuid. */
export class Pending {
	private _calls = new Map<string, Call>()

	/** @param timeout - ms before a call rejects, `0` or less disables it */
	constructor(private readonly _timeout: number) {}

	/** Waits for the response to `request`, rejects with `RPCErrors.TIMEOUT` */
	public wait<R>(request: RPCState): Promise<R> {
		return new Promise<R>((resolve, reject) => {
			const timer =
				this._timeout > 0
					? setTimeout(
							() => this.reject(request.uuid, this._timeoutError(request)),
							this._timeout,
						)
					: undefined

			this._calls.set(request.uuid, {
				resolve: resolve as (data: unknown) => void,
				reject,
				timer,
			})
		})
	}

	/** @returns `false` if no call waits for this uuid (late or unexpected response) */
	public resolve(uuid: string, data: unknown): boolean {
		const call = this._take(uuid)
		call?.resolve(data)
		return call !== undefined
	}

	/** @returns `false` if no call waits for this uuid */
	public reject(uuid: string, error: Error): boolean {
		const call = this._take(uuid)
		call?.reject(error)
		return call !== undefined
	}

	private _take(uuid: string): Call | undefined {
		const call = this._calls.get(uuid)
		if (call) {
			this._calls.delete(uuid)
			clearTimeout(call.timer)
		}
		return call
	}

	private _timeoutError(request: RPCState): RPCError {
		return new RPCError(
			RPCErrors.TIMEOUT,
			timeoutMessage(
				request.event,
				request.calledTo,
				request.calledFrom,
				this._timeout,
			),
			{
				event: request.event,
				uuid: request.uuid,
				from: request.calledFrom,
				to: request.calledTo,
			},
		)
	}
}
