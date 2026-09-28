# Migrating from 0.1 to 1.0

Upgrade server, client and webview together. The payload format changed, so 0.1 and 1.0 cannot talk to each other

## Creating the instance

`RPCFactory` is gone, use `createRPC`:

```ts
// 0.1
import { RPCFactory } from '@entityseven/fivem-rpc'
export const rpc = new RPCFactory({ env: 'server' }).get()

// 1.0
import { createRPC } from '@entityseven/fivem-rpc'
export const rpc = createRPC({ env: 'server' })
```

## Errors and timeouts

- a failed call now rejects on the caller with `RPCError` (`code`, `message`, `details`). In 0.1 the error was thrown on the receiving side and the call never settled
- every call times out after 5000 ms by default. Change it with `RPCConfig.timeout`, `0` restores the 0.1 behaviour (wait forever)
- `RPCErrors.INVALID_DATA` and `RPCErrors.NO_PLAYER` are removed (invalid payloads are dropped), `RPCErrors.TIMEOUT` and `RPCErrors.HANDLER_ERROR` are new
- the texts of `RPCErrors.UNKNOWN_NATIVE` and `RPCErrors.UNKNOWN_ENVIRONMENT` changed. Compare `error.code` with `RPCErrors`, not message strings

See [Errors](rpc/readme.md#errors) and [How it works](rpc/readme.md#how-it-works)

## Typing

Declarations are now module augmentation of interfaces, the `types` / `typeRoots` tsconfig setup is no longer needed. Follow the [shared-types readme](shared-types/readme.md), then:

- commands are interface keys instead of string unions:

  ```ts
  // 0.1
  export type RPCCommands_Server = 'ban' | 'kick'

  // 1.0
  interface RPCCommands_Server {
      ban: true
      kick: true
  }
  ```

- remove placeholder members such as `_(): void`. An interface with any member is strict, an empty one accepts everything

## Other API changes

- `onCommand` callbacks get `args` as `string[]` (the generic argument type is gone)
- `RPCNativeClientNetworksEvents` is renamed to `RPCNativeClientNetworkEvents`
- internal types are no longer exported: `RPCEnvironmentResolved`, `RPCEventType`, `RPCEvents`, `RPCState`, `RPCStateRaw`, `RPCStateWeb`, `RPCStateWebRaw`. Use `RPCInstanceServer`, `RPCInstanceClient` or `RPCInstanceWebview` for the instance type
- server listeners get the player id from FiveM's `source`. Ids a client puts into the payload are ignored
- `emitClientEveryone` is one-way: clients run their listener but no longer send a response
