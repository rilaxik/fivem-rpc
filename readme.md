# FiveM RPC

is an all-in-one package with asynchronous RPC implementation for FiveM servers in JS/TS

## Motivation

The idea was to create an extensible package, with various features to simplify the development process and provide as much comfort as possible. Inspired by usage of [altv-xrpc](https://github.com/xxshady/altv-xrpc)

## Packages

| Package                                               | Docs                                   |
| ----------------------------------------------------- | -------------------------------------- |
| [`@entityseven/fivem-rpc`](rpc)                       | [API reference](rpc/readme.md)         |
| [`@entityseven/fivem-rpc-shared-types`](shared-types) | [Typing setup](shared-types/readme.md) |

## Installation

```bash
npm i @entityseven/fivem-rpc
pnpm add @entityseven/fivem-rpc
yarn add @entityseven/fivem-rpc
bun add @entityseven/fivem-rpc
```

Optional, for typed event names, arguments and results ([typing setup](shared-types/readme.md)):

```bash
npm i -D @entityseven/fivem-rpc-shared-types
pnpm add -D @entityseven/fivem-rpc-shared-types
yarn add -D @entityseven/fivem-rpc-shared-types
bun add -d @entityseven/fivem-rpc-shared-types
```

## Quick start

Create exactly one instance per environment and import it from your own module, not from the library. The client needs one even if it only relays between server and webview.

```ts
// server/rpc.ts
import { createRPC } from '@entityseven/fivem-rpc'
export const rpc = createRPC({ env: 'server' })

// client/rpc.ts
import { createRPC } from '@entityseven/fivem-rpc'
export const rpc = createRPC({ env: 'client' })

// webview/rpc.ts
import { createRPC } from '@entityseven/fivem-rpc'
export const rpc = createRPC({ env: 'webview' })
```

Listen on one side, emit from the other and await the listener's return value:

```ts
// server
rpc.onClient('ping', (player, message) => `pong: ${message} (from ${player})`)

// client
const reply = await rpc.emitServer('ping', 'hello')
```

All methods: [API reference](rpc/readme.md).

## Features

- Type-Safe Development: Eliminate runtime errors and enhance code reliability with comprehensive type safety
- All-in-one package: Communicate effortlessly between server, client and webview

## Contributing

Issues and pull requests are very welcome

## License

Licensed under Custom Attribution-NoDerivs Software License

## WIP

- client observers to catch events between server and webview (subscribe-like behaviour)
- client observers to prevent events (middleware-like behaviour)
- player manager (transform player id to desired data straight from a listener)
