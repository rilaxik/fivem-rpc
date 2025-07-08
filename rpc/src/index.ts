import { RPCInstanceClient } from './core/client'
import { RPCInstanceServer } from './core/server'
import { RPCInstanceWebview } from './core/webview'
import { Wrapper } from './core/wrapper'
import {
	type RPCConfig,
	type RPCEnvironment,
	type RPCEnvironmentResolved,
	RPCErrors,
} from './utils/types'

/**
 * RPC Factory
 *
 * @example
 * // returns RPCInstanceServer
 * const rpc = new RPCFactory({ env: "server" }).get()
 *
 * @example
 * // returns RPCInstanceClient
 * const rpc = new RPCFactory({ env: "client" }).get()
 *
 * @example
 * // returns RPCInstanceWebview
 * const rpc = new RPCFactory({ env: "webview" }).get()
 *
 * @class
 */
class RPCFactory<T extends RPCEnvironment> extends Wrapper {
	private readonly operator:
		| RPCInstanceServer
		| RPCInstanceClient
		| RPCInstanceWebview

	/**
	 * Instance options
	 * @param {object} opts - Options
	 * @param {string} opts.env - Instance environment
	 * @param {boolean} opts.debug - Show additional logs
	 */
	constructor(opts: RPCConfig<T>) {
		super(opts)

		this.console.log('[RPC] Initializing...')

		switch (opts.env) {
			case 'server':
				this.operator = new RPCInstanceServer(opts as RPCConfig<'server'>)
				break
			case 'client':
				this.operator = new RPCInstanceClient(opts as RPCConfig<'client'>)
				break
			case 'webview':
				this.operator = new RPCInstanceWebview(opts as RPCConfig<'webview'>)
				break
			default:
				throw new Error(RPCErrors.UNKNOWN_ENVIRONMENT)
		}
	}

	public get(): RPCEnvironmentResolved<T> {
		return this.operator as RPCEnvironmentResolved<T>
	}
}

export { RPCFactory }
// export const rpcClient = new RPCFactory({ env: "client" }).get();
// export const rpcServer = new RPCFactory({ env: "server" }).get();
// export const rpcWebview = new RPCFactory({ env: "webview" }).get();
export * from './utils/types'
export * from './utils/native'
export type * from './core/server'
export type * from './core/client'
export type * from './core/webview'
