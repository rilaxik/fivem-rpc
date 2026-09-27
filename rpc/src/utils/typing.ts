/**
 * **Internal** Typing helpers over the event maps of
 * `@entityseven/fivem-rpc-shared-types`. A map with declarations is typed
 * strictly; an empty map (nothing declared, or the package not installed)
 * accepts any name, any arguments and any result.
 */

// oxlint-disable-next-line typescript/no-explicit-any -- loose mode must accept listeners with any parameter types
type AnyEvent = (...args: any[]) => any

/** `true` for `any`, which is what the maps become if the package is missing */
type IsAny<T> = 0 extends 1 & T ? true : false

/** The declared map, or a loose one when nothing is declared */
type EventMap<T> =
	IsAny<T> extends true
		? Record<string, AnyEvent>
		: [keyof T] extends [never]
			? Record<string, AnyEvent>
			: T

export type RPCEventName<T> = keyof EventMap<T> & string

export type RPCEventArgs<
	T,
	K extends RPCEventName<T>,
> = EventMap<T>[K] extends (...args: infer A extends unknown[]) => unknown
	? A
	: never

export type RPCEventResult<
	T,
	K extends RPCEventName<T>,
> = EventMap<T>[K] extends (...args: never[]) => infer R ? Awaited<R> : never

/** Listener for event `K` of map `T`; `Prefix` goes before the event arguments */
export type RPCListener<
	T,
	K extends RPCEventName<T>,
	Prefix extends unknown[] = [],
> = (
	...args: [...Prefix, ...RPCEventArgs<T, K>]
) => RPCEventResult<T, K> | Promise<RPCEventResult<T, K>>

export type RPCCommandName<T> = [keyof T] extends [never]
	? string
	: keyof T & string
