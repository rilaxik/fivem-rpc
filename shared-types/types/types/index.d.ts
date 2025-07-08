declare module '@entityseven/fivem-rpc-shared-types' {
	// Client commands names
	export type RPCCommands_Client = ''

	// Server commands names
	export type RPCCommands_Server = ''

	// Client -> Client events
	export interface RPCEvents_Client {
		_(): void
	}

	// Client -> Server events
	export interface RPCEvents_ClientServer {
		_(): void
	}

	// Client -> Webview events
	export interface RPCEvents_ClientWebview {
		_(): void
	}

	// Server -> Server events
	export interface RPCEvents_Server {
		_(): void
	}

	// Server -> Client events
	export interface RPCEvents_ServerClient {
		_(): void
	}

	// Server -> Server events
	export interface RPCEvents_ServerWebview {
		_(): void
	}

	// Webview -> Webview events
	export interface RPCEvents_Webview {
		_(): void
	}

	// Webview -> Client events
	export interface RPCEvents_WebviewClient {
		_(): void
	}

	// Webview -> Server events
	export interface RPCEvents_WebviewServer {
		_(): void
	}
}
