# FiveM RPC Shared Types
### [Docs & Info](https://github.com/rilaxik/fivem-rpc/blob/master/readme.md)

## Installation
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
This package is an enhanced type support for `@entityseven/fivem-rpc`. It provides ability to strictly type your events for better dx.

## Example
This example is neat way to follow up but you can change it as you wish. It will use bun workspaces, pnpm workspaces work in a similar manner. Referring the following folder structure:
```markdown
apps/
    - server/
        - package.json
        - tsconfig.json
    - client/
        - package.json
        - tsconfig.json
    - webview/
        - package.json
        - tsconfig.json
    - shared/ (this must be available in server, client and webview)
        - package.json

    - package.json (root package)
    - pnpm-workspace.yaml (only if using pnpm)
```

- Environment folder: folder with server, client or webview code in it

1. Install this package as dev dependency in your root package or in each environment folder separately
    ```markdown
    apps/
        - server/ <- (if not installed root)
        - client/ <- (if not installed root)
        - webview/ <- (if not installed root)
        - shared/
    
        - package.json <- here
    ```

2. In `shared/` create folder `fivem-rpc` (or similar), inside it create `index.d.ts`
    ```markdown
    apps/
        - server/ 
        - client/ 
        - webview/ 
        - shared/
            - fivem-rpc/
                - index.d.ts <- here
    
        - package.json
    ```

3. In `index.d.ts` add following:
    ```ts
    declare module '@entityseven/fivem-rpc-shared-types' {
        // Client commands names 
        export type RPCCommands_Client = ''
 
        // Server commands names
        export type RPCCommands_Server = ''
 
        // Client -> Client events
        export interface RPCEvents_Client {}
 
        // Client -> Server events
        export interface RPCEvents_ClientServer {}
 
        // Client -> Webview events
        export interface RPCEvents_ClientWebview {}
 
        // Server -> Server events
        export interface RPCEvents_Server {}
 
        // Server -> Client events
        export interface RPCEvents_ServerClient {}
 
        // Server -> Server events
        export interface RPCEvents_ServerWebview {}
 
        // Webview -> Webview events
        export interface RPCEvents_Webview {}
 
        // Webview -> Client events
        export interface RPCEvents_WebviewClient {}
 
        // Webview -> Server events
        export interface RPCEvents_WebviewServer {}
    }
    ```

4. We just created a declaration which will overwrite types from the package. Now we need our packages to refer to these types when linting `rpc` functions. To do this in each environment folder of your project in `tsconfig.json` do these:
    ```json5
    {
        "compilerOptions": {
            "types": [
                "../shared/fivem-rpc/" // or your specific folder
            ]
        } 
    }
    ```
5. We also need to populate interfaces we created in step 3.
- `RPCCommands_Client` and `RPCCommands_Server` will include your commands names an union strings:
    ```ts
    export type RPCCommands_Client = 'afk' | 'vanish' | '...' // example names
    export type RPCCommands_Server = 'report' | 'ban' | '...' // example names
    ```
- Other interfaces will include your events types. The example will show one but all of the work same way
    ```ts
    export interface RPCEvents_ClientServer {
        clientToServerEventName(data: string, moreData: boolean): number
        "client-to-server-event-name"(data: string, moreData: boolean): number // can also include characters you cannot use as variable or function names
    }
    ```
    - `clientToServerEventName` or `client-to-server-event-name` is an event name
    - `data` and `moreData` are the arguments you need to pass when calling an event and argument you will receive when listening (may also include extra, as player, check type hints)
    - `number` is a return type that will be forwarded back to caller 
  
    Doing this will create type hints for you:
    ```ts
    // assuming this is in client
    const response /* number */ = await rpc.emitServer(
    'clientToServerEventName', /* suggested name */
    'data', /* will pass typecheck */
    'moreData', /* will NOT pass typecheck, since required type is `boolean` */
    )
    ```

## Example (alternative)
If previous example does not work or you do not like you can also try it this way. Steps that are not mentioned are the same as previous

2. In `shared/` create folders `declarations/fivem-rpc`, inside it create `index.d.ts`
    ```markdown
    apps/
        - server/ 
        - client/ 
        - webview/ 
        - shared/
            - declarations/
               - fivem-rpc/
                   - index.d.ts <- here
    
        - package.json
    ```

4. We just created a declaration which will overwrite types from the package. Now we need our packages to refer to these types when linting `rpc` functions. To do this in each environment folder of your project in `tsconfig.json` do these:
    ```json5
    {
        "compilerOptions": {
            "typeRoots": [
                "../shared/declarations/", // or your specific folder
                "../../node_modules/@types", // you may also want to add this if some of your other libraries are not showing types now
            ]
        } 
    }
    ```

If a any point this stops working for you, do your research on how to redeclare library types and refer to it