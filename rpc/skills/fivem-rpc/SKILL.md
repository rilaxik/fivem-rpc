---
name: fivem-rpc
description: Use when writing FiveM server, client or NUI (webview) code that calls between environments with @entityseven/fivem-rpc (createRPC, emitServer, onClient, emitWebview, onServer, ...), or when declaring its typed events in @entityseven/fivem-rpc-shared-types.
---

# @entityseven/fivem-rpc

Typed async calls between FiveM server, client and webview (NUI). Every `emit*` resolves with the return value of the matching `on*` listener in another environment

## Setup

One instance per environment, created once in a local module and imported everywhere else:

```ts
// server/rpc.ts, same in client/rpc.ts with env 'client' and webview/rpc.ts with env 'webview'
import { createRPC } from '@entityseven/fivem-rpc'
export const rpc = createRPC({ env: 'server' }) // options: debug (false), timeout (5000 ms, 0 = none)
```

## Directions

Method names are relative to the environment: `onClient` on the server listens to clients, `onClient` in the webview listens to its client

| From    | Call                                  | To          | Listener                              | Typed by                  |
| ------- | ------------------------------------- | ----------- | ------------------------------------- | ------------------------- |
| server  | `emitClient(player, event, ...args)`  | client      | `onServer`                            | `RPCEvents_ServerClient`  |
| server  | `emitClientEveryone(event, ...args)`  | all clients | `onServer`, no response               | `RPCEvents_ServerClient`  |
| server  | `emitWebview(player, event, ...args)` | webview     | `onServer`, via client                | `RPCEvents_ServerWebview` |
| server  | `emitSelf(event, ...args)`            | server      | `onSelf`                              | `RPCEvents_Server`        |
| client  | `emitServer(event, ...args)`          | server      | `onClient`, player first              | `RPCEvents_ClientServer`  |
| client  | `emitWebview(event, ...args)`         | webview     | `onClient`                            | `RPCEvents_ClientWebview` |
| client  | `emitSelf(event, ...args)`            | client      | `onSelf`                              | `RPCEvents_Client`        |
| webview | `emitServer(event, ...args)`          | server      | `onWebview`, player first, via client | `RPCEvents_WebviewServer` |
| webview | `emitClient(event, ...args)`          | client      | `onWebview`                           | `RPCEvents_WebviewClient` |
| webview | `emitSelf(event, ...args)`            | webview     | `onSelf`                              | `RPCEvents_Webview`       |

Commands registered with `onCommand` are typed by `RPCCommands_Server` and `RPCCommands_Client`

## Rules

- every `emit*` needs its listener registered in the target environment (see Directions), otherwise it rejects with `EVENT_NOT_REGISTERED`
- webview <-> server always goes through the player's client: the client must call `createRPC({ env: 'client' })` even with no listeners, otherwise those calls time out
- one listener per event and direction: registering the same name again replaces it, `off*` removes it
- always `await` or `.catch()` an `emit*`: it rejects with `RPCError`. `emitClientEveryone` is one-way and resolves once sent
- server `onClient` and `onWebview` listeners get the caller's server id first, taken from FiveM `source`. Use it, never trust player ids passed as arguments
- arguments and return values travel as JSON: pass plain data (no functions, class instances, `Map`, `Set`)
- never register FiveM events or NUI callbacks named `__rpc:*`, the library owns them
- `onNativeEvent` and `onNativeNetworkEvent` only accept names from `NATIVE_SERVER_EVENTS`, `NATIVE_CLIENT_EVENTS` and `NATIVE_CLIENT_NETWORK_EVENTS`. Use FiveM `on(name, cb)` for anything else

## Typing

Declare events in one `.d.ts` file included by the `tsconfig.json` of every environment. Without declarations every name, argument and result is `any`

```ts
// shared/rpc.d.ts
import '@entityseven/fivem-rpc-shared-types' // required: without it the declaration replaces the module

declare module '@entityseven/fivem-rpc-shared-types' {
    interface RPCEvents_WebviewServer {
        // event name(arguments): value the listener returns
        buyItem(item: string): boolean
    }
    interface RPCEvents_ServerClient {
        itemBought(item: string): void
    }
    interface RPCCommands_Server {
        ban: true // commands are keys, the value is not used
    }
}
```

Leave an interface empty to keep that direction untyped. Declare plain return values, listeners may still be `async`

## Example

```ts
// server
rpc.onWebview('buyItem', async (player, item) => {
    const ok = await chargePlayer(player, item)
    if (ok) await rpc.emitClient(player, 'itemBought', item)
    return ok
})

// client
rpc.onServer('itemBought', item => {
    // update HUD, play a sound
})

// webview
const ok = await rpc.emitServer('buyItem', 'water')
```

## Errors

`RPCError.code` is one of `RPCErrors`, the message names the fix

| Code                   | Cause                                                       | Fix                                                                                               |
| ---------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `EVENT_NOT_REGISTERED` | no listener for the event on the target                     | register the listener from the Directions table on the target                                     |
| `TIMEOUT`              | no response within `timeout` (default 5000 ms)              | listener must return or resolve; client needs `createRPC` for webview <-> server; raise `timeout` |
| `HANDLER_ERROR`        | the listener threw, its message is included                 | fix the listener, the stack is logged with `console.error` on the target                          |
| `UNKNOWN_NATIVE`       | `onNative*` name not in its `NATIVE_*` list                 | use FiveM `on(name, cb)`                                                                          |
| `UNKNOWN_ENVIRONMENT`  | `createRPC` got an `env` other than server, client, webview | fix `env`                                                                                         |

Debug with `createRPC({ env, debug: true })`: logs every registration, call and payload
