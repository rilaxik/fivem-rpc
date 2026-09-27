import { RPCErrors } from './types'

/**
 * Accepts any callback. Argument types are enforced by the typed `on*`/`emit*`
 * methods that wrap the emitter, not here.
 */
type Handler = (...args: never[]) => unknown

/** One handler per event: registering an event again replaces its handler. */
export class Emitter {
	/** Map<event, [handler, once]> */
	private _storage = new Map<string, [Handler, boolean]>()

	public on(event: string, cb: Handler): this {
		this._storage.set(event, [cb, false])
		return this
	}

	public once(event: string, cb: Handler): this {
		this._storage.set(event, [cb, true])
		return this
	}

	public off(event: string): this {
		this._storage.delete(event)
		return this
	}

	public has(event: string): boolean {
		return this._storage.has(event)
	}

	public async emit<R>(event: string, ...args: unknown[]): Promise<R> {
		const entry = this._storage.get(event)
		if (!entry) {
			throw new Error(RPCErrors.EVENT_NOT_REGISTERED)
		}

		const [cb, once] = entry
		if (once) {
			this._storage.delete(event)
		}

		return (await cb(...(args as never[]))) as R
	}
}
