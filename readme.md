# FiveM RPC
is an all-in-one package with asynchronous RPC implementation for FiveM servers in JS/TS

## Installation
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

## Docs
Can be found in [/rpc/readme.md](https://github.com/rilaxik/fivem-rpc/blob/master/rpc/readme.md)

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