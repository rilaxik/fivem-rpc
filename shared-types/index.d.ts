/**
 * Event and command declarations for `@entityseven/fivem-rpc`.
 *
 * Every interface starts empty: until you declare something in it, the matching
 * rpc methods accept any name and any arguments. Declare your own by augmenting
 * this module from any `.d.ts` (or `.ts`) file included in your project:
 *
 * @example
 * // shared/rpc.d.ts
 * import '@entityseven/fivem-rpc-shared-types'
 *
 * declare module '@entityseven/fivem-rpc-shared-types' {
 * 	interface RPCEvents_ClientServer {
 * 		// name(arguments): value returned by the listener
 * 		buyItem(item: string, amount: number): boolean
 * 	}
 * 	interface RPCCommands_Server {
 * 		ban: true
 * 	}
 * }
 */

// ===== COMMANDS (names are the keys, values are not used) =====

/** Commands registered with `rpc.onCommand` on the client */
export interface RPCCommands_Client {}

/** Commands registered with `rpc.onCommand` on the server */
export interface RPCCommands_Server {}

// ===== EVENTS (caller -> receiver) =====

/** Client -> client: `emitSelf` / `onSelf` on the client */
export interface RPCEvents_Client {}

/** Client -> server: `emitServer` on the client, `onClient` on the server */
export interface RPCEvents_ClientServer {}

/** Client -> webview: `emitWebview` on the client, `onClient` on the webview */
export interface RPCEvents_ClientWebview {}

/** Server -> server: `emitSelf` / `onSelf` on the server */
export interface RPCEvents_Server {}

/** Server -> client: `emitClient` on the server, `onServer` on the client */
export interface RPCEvents_ServerClient {}

/** Server -> webview: `emitWebview` on the server, `onServer` on the webview */
export interface RPCEvents_ServerWebview {}

/** Webview -> webview: `emitSelf` / `onSelf` on the webview */
export interface RPCEvents_Webview {}

/** Webview -> client: `emitClient` on the webview, `onWebview` on the client */
export interface RPCEvents_WebviewClient {}

/** Webview -> server: `emitServer` on the webview, `onWebview` on the server */
export interface RPCEvents_WebviewServer {}
