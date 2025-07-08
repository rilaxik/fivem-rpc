# FiveM RPC
is an all-in package with asynchronous RPC implementation for RageMP servers in JS/TS. [Extra info](https://github.com/rilaxik/fivem-rpc/blob/master/readme.md)

# Motivation
The idea was to create an extensible package, with various features to simplify the development process and provide as much comfort as possible. Inspired by usage of [altv-xrpc](https://github.com/xxshady/altv-xrpc)

# Installation
```bash
  pnpm i @entityseven/fivem-rpc
```
```bash
  yarn add @entityseven/fivem-rpc
```
```bash
  bun add @entityseven/fivem-rpc
```
It is highly recommended to also install additional package for enhanced typing
```bash
  pnpm i @entityseven/fivem-rpc-shared-types -D
```
```bash
  yarn add @entityseven/fivem-rpc-shared-types --dev
```
```bash
  bun add @entityseven/fivem-rpc-shared-types -d
```

## Usage
FiveM RPC is meant to be a singletone per environment. This means you _must create only one_ `RPCFactory` per your server/client/web. This also enables modifying `const rpc` to your needs, adding new methods or variables by forcing you to import it from file instead of library reference
```ts
// lib/rpc.ts
import { RPCFactory } from '@entityseven/fivem-rpc'
export const rpc = new RPCFactory(/* options */).get()
```

# Docs

## Extras
Along with `RPCFactory` you can also import all the types used internally, types for native client/server events and lists of native client/server events. All of that is documented in JSDoc, so no need to duplicate it here

## RPCConfig
```ts
type RPCConfig<T extends RPCEnvironment | unknown> = {
    env: T 
    debug?: boolean
}
```
Failing to set `env` to provided type will result in `RPCErrors.UNKNOWN_ENVIRONMENT`
`debug` adds additional console logs to events


## Errors
Known errors could be one of following or an error throw by a callback specifically
```ts
enum RPCErrors {
    EVENT_NOT_REGISTERED = 'Event not registered',
    INVALID_DATA = 'Invalid data (possibly broken JSON)',
    NO_PLAYER = 'No player (failed to resolve from local index)',
    UNKNOWN_NATIVE = 'Unknown native event (if you are sure this exists - use native handler)',
    UNKNOWN_ENVIRONMENT = 'Unknown environment (must be either "server", "client" or "webview")',
}
```

### Example error
Values wrapped in `<>` always exist, just not relevant for an example. Keep in mind that some errors are thrown in their destination(`To`) point: this example will throw on server
```
Error: No player (failed to resolve from local index)
Event: 'clientServerEvent'
Uuid: <uuid>
From: 'client'
To: 'server'
Player: <non-existent-player>
Type: 'event'
Data: [<data>]
```

## Server ([source](https://github.com/rilaxik/fivem-rpc/blob/master/rpc/src/core/server.ts))
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
Sends event to all clients
```ts
rpc.emitClientEveryone('serverClientEvent', someData)
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
Sends event to specified webview
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
Registers chat command. Since arguments are untyped you must validate them yourself
```ts
rpc.onCommand('serverCommand', (player, args, commandRaw) => {
    // logic
})
```
### onNativeEvent
Listens to native server event ([reference](https://docs.fivem.net/docs/scripting-reference/events/server-events/))
```ts
rpc.onNativeEvent('playerJoining', (source, oldId) => {
    // logic
})
```

## Client ([source](https://github.com/rilaxik/fivem-rpc/blob/master/rpc/src/core/client.ts))
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
// response will come from webview listener with returned data
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
Sends event to specified webview
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
Registers chat command. Since arguments are untyped you must validate them yourself
```ts
rpc.onCommand('clientCommand', (player, args, commandRaw) => {
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

## Webview ([source](https://github.com/rilaxik/fivem-rpc/blob/master/rpc/src/core/webview.ts))
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
// response will come from webview listener with returned data
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

# License
Licensed under Custom Attribution-NoDerivs Software License
