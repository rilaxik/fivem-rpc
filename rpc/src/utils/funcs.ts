import type {
	RPCState,
	RPCStateRaw,
	RPCStateWeb,
	RPCStateWebRaw,
} from './types'

/**
 * **Internal**
 *
 * Typed data parser
 */
export function parse(data: RPCStateRaw): RPCState {
	return JSON.parse(data)
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
