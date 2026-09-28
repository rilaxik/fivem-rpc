import type { RPCInstanceClient } from '../core/client'
import type { RPCInstanceServer } from '../core/server'
import type { RPCInstanceWebview } from '../core/webview'
import type { NATIVE_CLIENT_NETWORK_EVENTS } from './native'

/**
 * Where an instance runs: `server` (server scripts), `client` (client
 * scripts) or `webview` (NUI page)
 */
export type RPCEnvironment = 'server' | 'client' | 'webview'

export type RPCEnvironmentResolved<T extends RPCEnvironment> =
	T extends 'server'
		? RPCInstanceServer
		: T extends 'client'
			? RPCInstanceClient
			: T extends 'webview'
				? RPCInstanceWebview
				: never

/** `createRPC` config */
export type RPCConfig<T extends RPCEnvironment = RPCEnvironment> = {
	/** Environment this instance runs in */
	env: T
	/**
	 * Log every registration, call and incoming payload
	 *
	 * @defaultValue false
	 */
	debug?: boolean
	/**
	 * Milliseconds to wait for a response before the call rejects with
	 * `RPCErrors.TIMEOUT`. `0` disables the timeout.
	 *
	 * @defaultValue 5000
	 */
	timeout?: number
}

/**
 * **Internal**
 *
 * - `event`: call that expects a `response`
 * - `response`: answer to an `event`
 * - `broadcast`: one-way event, receivers do not reply
 */
export type RPCEventType = 'event' | 'response' | 'broadcast'

/**
 * **Internal**
 *
 * Similar to what Errors look like
 */
export type RPCState = {
	event: string
	uuid: string
	calledFrom: RPCEnvironment
	calledTo: RPCEnvironment
	error: RPCErrorPayload | null
	data: unknown[] | null
	/** Server id of the player involved. The server fills it from `source`, never trusting the sender */
	player: number | null
	type: RPCEventType
}

/** **Internal** Error sent back in a response, rebuilt as `RPCError` by the caller */
export type RPCErrorPayload = {
	code: RPCErrors
	message: string
}

/**
 * **Internal**
 *
 * `JSON.stringify` version of `RPCState`. Makes TS think this is not type `string` for better dx
 */
export type RPCStateRaw = string & { __brand: 'RPCStateRaw' }

/** Internal */
export type RPCStateWeb = {
	origin: RPCEvents
	data: RPCState
}

/**
 * **Internal**
 *
 * `JSON.stringify` version of `RPCStateWeb`. Makes TS think this is not type `string` for better dx
 */
export type RPCStateWebRaw = string & { __brand: 'RPCWebStateRaw' }

/**
 * **Internal**
 *
 * Do not create same listeners to avoid unexpected behaviour
 */
export enum RPCEvents {
	LISTENER_SERVER = '__rpc:listenerServer',
	LISTENER_CLIENT = '__rpc:listenerClient',
	LISTENER_WEB = '__rpc:listenerWeb',
}

/** Values of `RPCError.code` */
export enum RPCErrors {
	/** The target has no listener for the event (or `emitSelf` has no `onSelf`) */
	EVENT_NOT_REGISTERED = 'Event not registered',
	/** `onNative*` got an event that is not in its `NATIVE_*` list */
	UNKNOWN_NATIVE = 'Unknown native event',
	/** `createRPC` got an `env` other than server, client or webview */
	UNKNOWN_ENVIRONMENT = 'Unknown environment',
	/** No response within `RPCConfig.timeout` */
	TIMEOUT = 'Timed out waiting for response',
	/** The listener on the target threw; the message carries its error */
	HANDLER_ERROR = 'Listener threw an error',
}

/**
 * Native server events accepted by `onNativeEvent` on the server:
 * https://docs.fivem.net/docs/scripting-reference/events/server-events/
 */
export type RPCNativeServerEvents = {
	entityCreated(handle: number): void
	entityCreating(handle: number): void
	entityRemoved(entity: number): void
	onResourceListRefresh(): void
	onResourceStart(resource: string): void
	onResourceStarting(resource: string): void
	onResourceStop(resource: string): void
	onServerResourceStart(resource: string): void
	onServerResourceStop(resource: string): void
	playerConnecting(
		playerName: string,
		setKickReason: (reason: string) => void,
		deferrals: {
			defer: () => void
			done: (failureReason?: string) => void
			handover: (data: Record<string, unknown>) => void
			presentCard: (
				card: string | object,
				cb?: (data: unknown, rawData: string) => void,
			) => void
			update: (message: string) => void
		},
		source: number,
	): void
	playerEnteredScope(data: { for: string; player: string }): void
	playerJoining(source: string, oldID: string): void
	playerLeftScope(data: { for: string; player: string }): void
	ptFxEvent(
		sender: number,
		data: {
			assetHash: number
			axisBitset: number
			effectHash: number
			entityNetId: number
			f100: number
			f105: number
			f106: number
			f107: number
			f109: boolean
			f110: boolean
			f111: boolean
			f92: number
			isOnEntity: boolean
			offsetX: number
			offsetY: number
			offsetZ: number
			posX: number
			posY: number
			posZ: number
			rotX: number
			rotY: number
			rotZ: number
			scale: number
		},
	): void
	removeAllWeaponsEvent(sender: number, data: { pedId: number }): void
	startProjectileEvent(
		sender: number,
		data: {
			commandFireSingleBullet: boolean
			effectGroup: number
			firePositionX: number
			firePositionY: number
			firePositionZ: number
			initialPositionX: number
			initialPositionY: number
			initialPositionZ: number
			ownerId: number
			projectileHash: number
			targetEntity: number
			throwTaskSequence: number
			unk10: number
			unk11: number
			unk12: number
			unk13: number
			unk14: number
			unk15: number
			unk16: number
			unk3: number
			unk4: number
			unk5: number
			unk6: number
			unk7: number
			unk9: number
			unkX8: number
			unkY8: number
			unkZ8: number
			weaponHash: number
		},
	): void
	weaponDamageEvent(
		sender: number,
		data: {
			actionResultId: number
			actionResultName: number
			damageFlags: number
			damageTime: number
			damageType: number
			f104: number
			f112: boolean
			f112_1: number
			f120: number
			f133: boolean
			hasActionResult: boolean
			hasImpactDir: boolean
			hasVehicleData: boolean
			hitComponent: number
			hitEntityWeapon: boolean
			hitGlobalId: number
			hitGlobalIds: number[]
			hitWeaponAmmoAttachment: boolean
			impactDirX: number
			impactDirY: number
			impactDirZ: number
			isNetTargetPos: boolean
			localPosX: number
			localPosY: number
			localPosZ: number
			overrideDefaultDamage: boolean
			parentGlobalId: number
			silenced: boolean
			suspensionIndex: number
			tyreIndex: number
			weaponDamage: number
			weaponType: number
			willKill: boolean
		},
	): void
}

/**
 * Native client events accepted by `onNativeEvent` on the client:
 * https://docs.fivem.net/docs/scripting-reference/events/client-events/
 */
export type RPCNativeClientEvents = {
	entityDamaged(
		victim: number,
		culprit: number,
		weapon: number,
		baseDamage: number,
	): void
	gameEventTriggered(
		name: RPCNativeClientNetworkEventsNames | (string & {}),
		data: number[],
	): void
	mumbleConnected(address: string, reconnecting: boolean): void
	mumbleDisconnected(address: string): void
	onClientResourceStart(resource: string): void
	onClientResourceStop(resource: string): void
	onResourceStart(resource: string): void
	onResourceStarting(resource: string): void
	onResourceStop(resource: string): void
	populationPedCreating(
		x: number,
		y: number,
		z: number,
		model: number,
		overrideCalls: {
			setModel: (model: string | number) => void
			setPosition: (x: number, y: number, z: number) => void
		},
	): void
}

/** Game events accepted by `onNativeNetworkEvent` on the client */
export type RPCNativeClientNetworkEvents = {
	[name in RPCNativeClientNetworkEventsNames]: (
		entities: number[],
		eventEntity: number,
		data: unknown[],
	) => void
}

/**
 * Names in `NATIVE_CLIENT_NETWORK_EVENTS`:
 * https://docs.fivem.net/docs/game-references/game-events/
 */
export type RPCNativeClientNetworkEventsNames =
	(typeof NATIVE_CLIENT_NETWORK_EVENTS)[number]
