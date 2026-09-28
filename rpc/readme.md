# FiveM RPC

Call FiveM server, client and NUI listeners like async functions: typed, with timeouts, no event ping-pong

Installation, quick start and package overview: [main readme](../readme.md). Typed events: [shared-types](../shared-types/readme.md). Upgrading from 0.1: [migration guide](../migration.md).

## Exports

Besides `createRPC` the package exports:

- `RPCError`, `RPCErrors`, `RPCErrorDetails` - see [Errors](#errors)
- `RPCConfig`, `RPCEnvironment` and the instance types `RPCInstanceServer`, `RPCInstanceClient`, `RPCInstanceWebview`
- native event types `RPCNativeServerEvents`, `RPCNativeClientEvents`, `RPCNativeClientNetworkEvents`, `RPCNativeClientNetworkEventsNames` and the lists `NATIVE_SERVER_EVENTS`, `NATIVE_CLIENT_EVENTS`, `NATIVE_CLIENT_NETWORK_EVENTS` accepted by the `onNative*` methods

## RPCConfig

```ts
type RPCConfig = {
    env: 'server' | 'client' | 'webview'
    debug?: boolean // default false, logs every registration, call and incoming payload
    timeout?: number // default 5000, ms to wait for a response, 0 disables it
}
```

An unknown `env` makes `createRPC` throw `RPCError` with code `RPCErrors.UNKNOWN_ENVIRONMENT`

## Errors

Every error from this library is an `RPCError`. `code` is one of `RPCErrors`, `message` says what to fix, and `details` names the call when the error comes from one

```ts
enum RPCErrors {
    EVENT_NOT_REGISTERED = 'Event not registered',
    UNKNOWN_NATIVE = 'Unknown native event',
    UNKNOWN_ENVIRONMENT = 'Unknown environment',
    TIMEOUT = 'Timed out waiting for response',
    HANDLER_ERROR = 'Listener threw an error',
}
```

### Example error

The server has no `onClient('buyItem', ...)` listener, so the call from the client rejects:

```ts
import { RPCError, RPCErrors } from '@entityseven/fivem-rpc'

try {
    await rpc.emitServer('buyItem', 'water')
} catch (e) {
    if (e instanceof RPCError && e.code === RPCErrors.EVENT_NOT_REGISTERED) {
        e.message // 'No listener for "buyItem" on server. Register it with rpc.onClient("buyItem", ...) in server code.'
        e.details // { event: 'buyItem', uuid: '<uuid>', from: 'client', to: 'server' }
    }
}
```

## How it works

### Routing

Server and client talk over FiveM network events, client and webview over NUI messages and NUI callbacks. Webview and server never talk directly: every call between them is relayed by the client of that player. So every client must run `createRPC({ env: 'client' })`, even with no listeners of its own, or those calls time out

### One listener per event

Each `on*` method keeps one listener per event name. Registering the same name again replaces the previous listener, `off*` removes it. Directions are separate: `onClient('x')` and `onWebview('x')` on the server do not replace each other

### Responses, errors and timeouts

- `emit*` resolves with the value the listener returns (promises are awaited)
- no listener on the target: the call rejects with `RPCErrors.EVENT_NOT_REGISTERED`
- the listener throws: the target logs the error with `console.error`, the call rejects with `RPCErrors.HANDLER_ERROR` and the original message
- no response within `RPCConfig.timeout` (default 5000 ms): the call rejects with `RPCErrors.TIMEOUT` and a late response is ignored. `timeout: 0` waits forever
- `emitSelf` calls the local listener directly, whatever it throws reaches the caller unchanged
- `emitClientEveryone` does not wait for clients: it resolves once sent, failures stay on each client (`console.error` for a throwing listener, the rest with `debug: true`)

### Player identity

Server listeners (`onClient`, `onWebview`) get the calling player's server id as the first argument. It comes from FiveM's `source`, never from the payload, so a client cannot pose as another player. Use it instead of player ids passed as arguments. A response to `emitClient` or `emitWebview` is only accepted from the player it was sent to

## Server ([source](src/core/server.ts))

### onClient

Listens to client event

```ts
rpc.onClient('clientServerEvent', (player, arg1, arg2, ...rest) => {
    // logic
    return someData // this will be forwarded back to caller
})
```

### offClient

Stops listening to client event

```ts
rpc.offClient('clientServerEvent')
```

### emitClient

Sends event to specified client

```ts
const response = await rpc.emitClient(playerServerId, 'serverClientEvent', someData)
// response will come from client listener with returned data
```

### emitClientEveryone

Sends event to all clients. One-way: clients run their listener but do not answer

```ts
await rpc.emitClientEveryone('serverClientEvent', someData)
```

### onWebview

Listens to webview event

```ts
rpc.onWebview('webviewServerEvent', (player, arg1, arg2, ...rest) => {
    // logic
    return someData // this will be forwarded back to caller
})
```

### offWebview

Stops listening to webview event

```ts
rpc.offWebview('webviewServerEvent')
```

### emitWebview

Sends event to the webview of specified player

```ts
const response = await rpc.emitWebview(playerServerId, 'serverWebviewEvent', someData)
// response will come from webview listener with returned data
```

### onSelf

Listens to server event

```ts
rpc.onSelf('serverEvent', (arg1, arg2, ...rest) => {
    // logic
    return someData // this will be forwarded back to caller
})
```

### offSelf

Stops listening to server event

```ts
rpc.offSelf('serverEvent')
```

### emitSelf

Sends event to server

```ts
const response = await rpc.emitSelf('serverEvent', someData)
// response will come from server listener with returned data
```

### onCommand

Registers chat command. `args` are the raw strings typed after the command, validate them yourself. With `restricted` set to `true` only players with the ACE permission `command.<name>` can use it (defaults to `false`)

```ts
rpc.onCommand('serverCommand', (player, args, rawCommand) => {
    // logic
}, true /* restricted */)
```

### onNativeEvent

Listens to native server event ([reference](https://docs.fivem.net/docs/scripting-reference/events/server-events/))

```ts
rpc.onNativeEvent('playerJoining', (source, oldId) => {
    // logic
})
```

## Client ([source](src/core/client.ts))

### onServer

Listens to server event

```ts
rpc.onServer('serverClientEvent', (arg1, arg2, ...rest) => {
    // logic
    return someData // this will be forwarded back to caller
})
```

### offServer

Stops listening to server event

```ts
rpc.offServer('serverClientEvent')
```

### emitServer

Sends event to server

```ts
const response = await rpc.emitServer('clientServerEvent', someData)
// response will come from server listener with returned data
```

### onWebview

Listens to webview event

```ts
rpc.onWebview('webviewClientEvent', (arg1, arg2, ...rest) => {
    // logic
    return someData // this will be forwarded back to caller
})
```

### offWebview

Stops listening to webview event

```ts
rpc.offWebview('webviewClientEvent')
```

### emitWebview

Sends event to own webview

```ts
const response = await rpc.emitWebview('clientWebviewEvent', someData)
// response will come from webview listener with returned data
```

### onSelf

Listens to client event

```ts
rpc.onSelf('clientEvent', (arg1, arg2, ...rest) => {
    // logic
    return someData // this will be forwarded back to caller
})
```

### offSelf

Stops listening to client event

```ts
rpc.offSelf('clientEvent')
```

### emitSelf

Sends event to client

```ts
const response = await rpc.emitSelf('clientEvent', someData)
// response will come from client listener with returned data
```

### onCommand

Registers chat command. `args` are the raw strings typed after the command, validate them yourself

```ts
rpc.onCommand('clientCommand', (player, args, rawCommand) => {
    // logic
})
```

### onNativeEvent

Listens to native client event ([reference](https://docs.fivem.net/docs/scripting-reference/events/client-events/))

```ts
rpc.onNativeEvent('entityDamaged', (victim, culprit, weapon, baseDamage) => {
    // logic
})
```

### onNativeNetworkEvent

Listens to native client network event ([reference](https://docs.fivem.net/docs/game-references/game-events/))

```ts
rpc.onNativeNetworkEvent('CEventShockingCarCrash', (entities, eventEntity, data) => {
    // logic
})
```

### setWebviewFocus

Sets or removes focus and cursor from own webview

```ts
rpc.setWebviewFocus(true /* focus */, true /* show cursor */)
```

## Webview ([source](src/core/webview.ts))

### onClient

Listens to client event

```ts
rpc.onClient('clientWebviewEvent', (arg1, arg2, ...rest) => {
    // logic
    return someData // this will be forwarded back to caller
})
```

### offClient

Stops listening to client event

```ts
rpc.offClient('clientWebviewEvent')
```

### emitClient

Sends event to own client

```ts
const response = await rpc.emitClient('webviewClientEvent', someData)
// response will come from client listener with returned data
```

### onServer

Listens to server event

```ts
rpc.onServer('serverWebviewEvent', (arg1, arg2, ...rest) => {
    // logic
    return someData // this will be forwarded back to caller
})
```

### offServer

Stops listening to server event

```ts
rpc.offServer('serverWebviewEvent')
```

### emitServer

Sends event to server

```ts
const response = await rpc.emitServer('webviewServerEvent', someData)
// response will come from server listener with returned data
```

### onSelf

Listens to webview event

```ts
rpc.onSelf('webviewEvent', (arg1, arg2, ...rest) => {
    // logic
    return someData // this will be forwarded back to caller
})
```

### offSelf

Stops listening to webview event

```ts
rpc.offSelf('webviewEvent')
```

### emitSelf

Sends event to webview

```ts
const response = await rpc.emitSelf('webviewEvent', someData)
// response will come from webview listener with returned data
```

## License

Licensed under the [Custom Attribution-NoDerivs Software License](license.md)
