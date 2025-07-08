import { RPCErrors } from './types'

export class Emitter {
	/** Map<event, [callback function, once]> */
	private _storage: Map<string, [(...args: any[]) => any, boolean]>

	constructor() {
		this._storage = new Map()
	}

	get _raw_storage() {
		return this._storage
	}

	public on(event: string, cb: (...args: any[]) => any): this {
		this._storage.set(event, [cb, false])
		return this
	}

	public once(event: string, cb: (...args: any[]) => any): this {
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

	public async emit<R>(event: string, ...args: any[]): Promise<R> {
		return new Promise((res, rej) => {
			if (!this._storage.has(event)) {
				rej(RPCErrors.EVENT_NOT_REGISTERED)
			}

			const [cb, once] = this._storage.get(event) as [
				(...args: any[]) => any,
				boolean,
			]

			if (once) {
				this._storage.delete(event)
			}

			Promise.resolve(cb(...args))
				.then(res)
				.catch(rej)
		})
	}
}
