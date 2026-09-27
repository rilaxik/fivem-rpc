import { type RPCEnvironment, RPCErrors, type RPCState } from './types'

/** Where a failed call was going, when the error comes from a call */
export type RPCErrorDetails = {
	event: string
	uuid: string
	/** Environment that made the call */
	from: RPCEnvironment
	/** Environment that was called */
	to: RPCEnvironment
}

/**
 * Error thrown or rejected by this library. Check `code` against `RPCErrors`.
 *
 * @example
 * try {
 * 	await rpc.emitServer('buyItem', 'water')
 * } catch (e) {
 * 	if (e instanceof RPCError && e.code === RPCErrors.TIMEOUT) {
 * 		// server did not answer in time
 * 	}
 * }
 */
export class RPCError extends Error {
	public readonly code: RPCErrors
	public readonly details: RPCErrorDetails | undefined

	constructor(code: RPCErrors, message: string, details?: RPCErrorDetails) {
		super(message)
		this.name = 'RPCError'
		this.code = code
		this.details = details
	}

	/** **Internal** Rebuilds the error a receiver sent back in a response */
	static fromResponse(response: RPCState): RPCError {
		return new RPCError(
			response.error?.code ?? RPCErrors.HANDLER_ERROR,
			response.error?.message ?? 'Unknown error',
			{
				event: response.event,
				uuid: response.uuid,
				from: response.calledTo,
				to: response.calledFrom,
			},
		)
	}
}

/** **Internal** Name of the method that listens on `receiver` for calls from `sender` */
export function listenerName(
	receiver: RPCEnvironment,
	sender: RPCEnvironment,
): string {
	if (receiver === sender) return 'onSelf'
	return `on${sender[0]?.toUpperCase()}${sender.slice(1)}`
}

/** **Internal** */
export function notRegisteredMessage(
	event: string,
	receiver: RPCEnvironment,
	sender: RPCEnvironment,
): string {
	return `No listener for "${event}" on ${receiver}. Register it with rpc.${listenerName(receiver, sender)}("${event}", ...) in ${receiver} code.`
}

/** **Internal** */
export function handlerErrorMessage(
	event: string,
	receiver: RPCEnvironment,
	cause: unknown,
): string {
	const reason =
		cause instanceof Error || (cause as Error | undefined)?.message
			? (cause as Error).message
			: String(cause)
	return `Listener for "${event}" on ${receiver} threw: ${reason}`
}

/** **Internal** */
export function timeoutMessage(
	event: string,
	receiver: RPCEnvironment,
	sender: RPCEnvironment,
	timeout: number,
): string {
	return `No response for "${event}" from ${receiver} within ${timeout} ms. Check that ${receiver} registered rpc.${listenerName(receiver, sender)}("${event}", ...) and that it returns, or raise RPCConfig.timeout (0 disables it).`
}
