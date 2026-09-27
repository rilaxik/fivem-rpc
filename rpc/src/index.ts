import { RPCInstanceClient } from './core/client'
import { RPCInstanceServer } from './core/server'
import { RPCInstanceWebview } from './core/webview'
import { RPCError, unknownEnvironmentMessage } from './utils/errors'
import {
	type RPCConfig,
	type RPCEnvironment,
	type RPCEnvironmentResolved,
	RPCErrors,
} from './utils/types'

/**
 * Creates the RPC instance for one environment. Create exactly one per
 * environment (server, client, webview) and export it from a local module.
 *
 * @throws {@link RPCError} `UNKNOWN_ENVIRONMENT` if `config.env` is not
 *   `'server'`, `'client'` or `'webview'`
 *
 * @example
 * // server/rpc.ts
 * import { createRPC } from '@entityseven/fivem-rpc'
 * export const rpc = createRPC({ env: 'server' })
 */
export function createRPC<T extends RPCEnvironment>(
	config: RPCConfig<T>,
): RPCEnvironmentResolved<T> {
	switch (config.env) {
		case 'server':
			return new RPCInstanceServer(
				config as RPCConfig<'server'>,
			) as RPCEnvironmentResolved<T>
		case 'client':
			return new RPCInstanceClient(
				config as RPCConfig<'client'>,
			) as RPCEnvironmentResolved<T>
		case 'webview':
			return new RPCInstanceWebview(
				config as RPCConfig<'webview'>,
			) as RPCEnvironmentResolved<T>
		default:
			throw new RPCError(
				RPCErrors.UNKNOWN_ENVIRONMENT,
				unknownEnvironmentMessage(config.env),
			)
	}
}

export type { RPCInstanceClient } from './core/client'
export type { RPCInstanceServer } from './core/server'
export type { RPCInstanceWebview } from './core/webview'
export { RPCError, type RPCErrorDetails } from './utils/errors'
export {
	NATIVE_CLIENT_EVENTS,
	NATIVE_CLIENT_NETWORK_EVENTS,
	NATIVE_SERVER_EVENTS,
} from './utils/native'
export {
	type RPCConfig,
	type RPCEnvironment,
	RPCErrors,
	type RPCNativeClientEvents,
	type RPCNativeClientNetworkEvents,
	type RPCNativeClientNetworkEventsNames,
	type RPCNativeServerEvents,
} from './utils/types'
