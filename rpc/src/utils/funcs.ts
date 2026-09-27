import type {
	RPCEnvironment,
	RPCState,
	RPCStateRaw,
	RPCStateWeb,
	RPCStateWebRaw,
} from './types'

const ENVIRONMENTS: readonly unknown[] = [
	'server',
	'client',
	'webview',
] satisfies RPCEnvironment[]

/**
 * **Internal**
 *
 * Checks the shape of an incoming payload. Payloads come from the network or
 * another runtime, so nothing about them is trusted.
 */
export function isRPCState(value: unknown): value is RPCState {
	if (typeof value !== 'object' || value === null) return false
	const v = value as Record<string, unknown>
	return (
		typeof v.event === 'string' &&
		typeof v.uuid === 'string' &&
		(v.type === 'event' || v.type === 'response') &&
		ENVIRONMENTS.includes(v.calledFrom) &&
		ENVIRONMENTS.includes(v.calledTo) &&
		(v.data === null || Array.isArray(v.data))
	)
}

/**
 * **Internal**
 *
 * Parses a raw payload, `null` if it is not JSON or not an RPC payload
 */
export function parse(data: RPCStateRaw): RPCState | null {
	try {
		const value: unknown = JSON.parse(data)
		return isRPCState(value) ? value : null
	} catch {
		return null
	}
}

/**
 * **Internal**
 *
 * Typed data serializer
 */
export function stringify(data: RPCState): RPCStateRaw {
	return JSON.stringify(data) as RPCStateRaw
}

// automatically parsed by FiveM
// export function parseWeb(data: RPCStateWebRaw): RPCStateWeb {
//     return JSON.parse(data)
// }

/**
 * **Internal**
 *
 * Typed data serializer
 */
export function stringifyWeb(data: RPCStateWeb): RPCStateWebRaw {
	return JSON.stringify(data) as RPCStateWebRaw
}

/** **Internal** */
export function generateUUID(): string {
	let uuid = ''
	let random = 0
	for (let i = 0; i < 32; i++) {
		random = (Math.random() * 16) | 0
		if (i === 8 || i === 12 || i === 16 || i === 20) uuid += '-'
		uuid += (i === 12 ? 4 : i === 16 ? (random & 3) | 8 : random).toString(16)
	}
	return uuid
}
