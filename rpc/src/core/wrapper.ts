import { Emitter } from '../utils/emitter'
import { parse } from '../utils/funcs'
import { Pending } from '../utils/pending'
import {
	type RPCConfig,
	type RPCEnvironment,
	RPCErrors,
	type RPCState,
	type RPCStateRaw,
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

	/** Settles the call waiting for this response; ignores late or unexpected ones */
	protected resolvePending(payload: RPCState): void {
		const found = this._pending.resolve(payload.uuid, payload.data?.[0])
		if (!found && this.debug) {
			this.console.log(
				`[RPC]:ignored response ${payload.event} ${payload.uuid} (no pending call, possibly timed out)`,
			)
		}
	}

	protected verifyEvent(state: Emitter, data: RPCStateRaw | RPCState) {
		const rpcData = typeof data === 'string' ? parse(data) : data

		if (!state.has(rpcData.event)) {
			rpcData.error = RPCErrors.EVENT_NOT_REGISTERED
			this.triggerError(rpcData)
		}
	}

	protected triggerError(rpcData: RPCState, error?: string): Error {
		const errorMessage = [
			`${rpcData.error}`,
			`Event: ${rpcData.event}`,
			`Uuid: ${rpcData.uuid}`,
			`From: ${rpcData.calledFrom}`,
			`To: ${rpcData.calledTo}`,
			`Player: ${rpcData.player}`,
			`Type: ${rpcData.type}`,
			`Data: ${rpcData.data}`,
		]

		if (error) {
			errorMessage.push(`Info: ${error}`)
		}

		throw new Error(errorMessage.join('\n | '))
	}
}
