/*
FiveM runtime globals used by this library. Internal: not part of the published types, so consumers are free to use @citizenfx/*.
See https://docs.fivem.net/docs/scripting-reference/runtimes/javascript/
*/

// ===== SHARED (client + server) =====

declare function on<A extends unknown[]>(
	eventName: string,
	callback: (...args: A) => unknown,
): void
declare function onNet<A extends unknown[]>(
	eventName: string,
	callback: (...args: A) => unknown,
): void
/** Server: `emitNet(eventName, target, ...args)` */
declare function emitNet(eventName: string, ...args: unknown[]): void
declare function RegisterCommand<A extends unknown[]>(
	commandName: string,
	handler: (source: number, args: A, rawCommand: string) => unknown,
	restricted: boolean,
): void

// ===== CLIENT =====

declare function RegisterNuiCallbackType(callbackType: string): void
declare function GetPlayerServerId(player: number): number
declare function PlayerId(): number
declare function SetNuiFocus(hasFocus: boolean, hasCursor: boolean): void
declare function SendNuiMessage(jsonString: string): boolean

// ===== WEBVIEW (NUI) =====

interface Window {
	GetParentResourceName?: () => string
}
