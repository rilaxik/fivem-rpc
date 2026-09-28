# FiveM RPC Shared Types

Event and command declarations for [`@entityseven/fivem-rpc`](../rpc/readme.md). With nothing declared, every rpc method accepts any event name, any arguments and any result. Declare your events once and every `on*` and `emit*` call gets checked names, arguments and results

## Installation

See the [main readme](../readme.md#installation). The declaration file below imports this package, so it must resolve from that file (in a workspace: install it in the root)

## Usage

1. Create one declaration file shared by server, client and webview code, e.g. `shared/rpc.d.ts`:

   ```ts
   import '@entityseven/fivem-rpc-shared-types'

   declare module '@entityseven/fivem-rpc-shared-types' {
       interface RPCEvents_ClientServer {
           // event name(arguments): value returned by the listener
           buyItem(item: string, amount: number): boolean
       }
       interface RPCCommands_Server {
           ban: true
       }
   }
   ```

   The `import` line makes the file a module, so `declare module` adds to the package's interfaces instead of replacing them

2. Add the file to `include` in the `tsconfig.json` of every environment:

   ```json
   {
       "include": ["src", "../shared/rpc.d.ts"]
   }
   ```

3. Calls are checked from now on:

   ```ts
   // server
   rpc.onClient('buyItem', (player, item, amount) => {
       // item: string, amount: number, must return boolean
       return true
   })

   // client
   const bought = await rpc.emitServer('buyItem', 'water', 2) // boolean
   await rpc.emitServer('buyItem', 'water') // error: missing `amount`
   await rpc.emitServer('buyItme', 'water', 2) // error: unknown event
   ```

## Interfaces

Each interface types one direction, see the [direction table](../rpc/readme.md#directions) for which `emit*` and `on*` methods use it. `RPCCommands_Server` and `RPCCommands_Client` type `onCommand`. An interface you leave empty stays loose (any name, arguments and result), so you can declare them one at a time

- events: the member name is the event name, its parameters are the arguments, its return type is what `emit*` resolves with. Server `onClient` and `onWebview` listeners get the player id before the declared arguments. Names that are not identifiers work too: `'buy-item'(item: string): boolean`
- commands: the key is the command name, the value is not used (`true`)

## License

Licensed under the [Custom Attribution-NoDerivs Software License](license.md)
