import type { RPCInstanceClient } from '../core/client'
import type { RPCInstanceServer } from '../core/server'
import type { RPCInstanceWebview } from '../core/webview'

/**
 * Possible environment states for `RPCConfig`
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

/**
 * `RPCFactory` config.
 *
 * If environment does not match will throw `RPCErrors.UNKNOWN_ENVIRONMENT`
 */
export type RPCConfig<T extends RPCEnvironment | unknown> = {
	env: T
	debug?: boolean
}

/** **Internal** */
export type RPCEventType = 'event' | 'response'

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
	error: string | null
	data: unknown[] | null
	player: number | null
	type: RPCEventType
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

/**
 * Errors to check against
 */
export enum RPCErrors {
	EVENT_NOT_REGISTERED = 'Event not registered',
	INVALID_DATA = 'Invalid data (possibly broken JSON)',
	NO_PLAYER = 'No player (failed to resolve from local index)',
	UNKNOWN_NATIVE = 'Unknown native event (if you are sure this exists - use native handler)',
	UNKNOWN_ENVIRONMENT = 'Unknown environment (must be either "server", "client" or "webview")',
}

/**
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
		name: RPCNativeClientNetworksEvents | string,
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

export type RPCNativeClientNetworksEvents = {
	[name in RPCNativeClientNetworkEventsNames]: (
		entities: number[],
		eventEntity: number,
		data: unknown[],
	) => void
}

/**
 * https://docs.fivem.net/docs/game-references/game-events/
 */
export type RPCNativeClientNetworkEventsNames =
	| 'CEventAcquaintancePed'
	| 'CEventAcquaintancePedDead'
	| 'CEventAcquaintancePedDislike'
	| 'CEventAcquaintancePedHate'
	| 'CEventAcquaintancePedLike'
	| 'CEventAcquaintancePedWanted'
	| 'CEventAgitated'
	| 'CEventAgitatedAction'
	| 'CEventCallForCover'
	| 'CEventCarUndriveable'
	| 'CEventClimbLadderOnRoute'
	| 'CEventClimbNavMeshOnRoute'
	| 'CEventCombatTaunt'
	| 'CEventCommunicateEvent'
	| 'CEventCopCarBeingStolen'
	| 'CEventCrimeCryForHelp'
	| 'CEventCrimeReported'
	| 'CEventDamage'
	| 'CEventDataDecisionMaker'
	| 'CEventDataFileMounter'
	| 'CEventDataResponseAggressiveRubberneck'
	| 'CEventDataResponseDeferToScenarioPointFlags'
	| 'CEventDataResponseFriendlyAimedAt'
	| 'CEventDataResponseFriendlyNearMiss'
	| 'CEventDataResponsePlayerDeath'
	| 'CEventDataResponsePoliceTaskWanted'
	| 'CEventDataResponseSwatTaskWanted'
	| 'CEventDataResponseTask'
	| 'CEventDataResponseTaskAgitated'
	| 'CEventDataResponseTaskCombat'
	| 'CEventDataResponseTaskCower'
	| 'CEventDataResponseTaskCrouch'
	| 'CEventDataResponseTaskDuckAndCover'
	| 'CEventDataResponseTaskEscapeBlast'
	| 'CEventDataResponseTaskEvasiveStep'
	| 'CEventDataResponseTaskExhaustedFlee'
	| 'CEventDataResponseTaskExplosion'
	| 'CEventDataResponseTaskFlee'
	| 'CEventDataResponseTaskFlyAway'
	| 'CEventDataResponseTaskGrowlAndFlee'
	| 'CEventDataResponseTaskGunAimedAt'
	| 'CEventDataResponseTaskHandsUp'
	| 'CEventDataResponseTaskHeadTrack'
	| 'CEventDataResponseTaskLeaveCarAndFlee'
	| 'CEventDataResponseTaskScenarioFlee'
	| 'CEventDataResponseTaskSharkAttack'
	| 'CEventDataResponseTaskShockingEventBackAway'
	| 'CEventDataResponseTaskShockingEventGoto'
	| 'CEventDataResponseTaskShockingEventHurryAway'
	| 'CEventDataResponseTaskShockingEventReact'
	| 'CEventDataResponseTaskShockingEventReactToAircraft'
	| 'CEventDataResponseTaskShockingEventStopAndStare'
	| 'CEventDataResponseTaskShockingEventThreatResponse'
	| 'CEventDataResponseTaskShockingEventWatch'
	| 'CEventDataResponseTaskShockingNiceCar'
	| 'CEventDataResponseTaskShockingPoliceInvestigate'
	| 'CEventDataResponseTaskThreat'
	| 'CEventDataResponseTaskTurnToFace'
	| 'CEventDataResponseTaskWalkAway'
	| 'CEventDataResponseTaskWalkRoundEntity'
	| 'CEventDataResponseTaskWalkRoundFire'
	| 'CEventDeadPedFound'
	| 'CEventDeath'
	| 'CEventDecisionMakerResponse'
	| 'CEventDisturbance'
	| 'CEventDraggedOutCar'
	| 'CEventEditableResponse'
	| 'CEventEncroachingPed'
	| 'CEventEntityDamaged'
	| 'CEventEntityDestroyed'
	| 'CEventExplosion'
	| 'CEventExplosionHeard'
	| 'CEventFireNearby'
	| 'CEventFootStepHeard'
	| 'CEventFriendlyAimedAt'
	| 'CEventFriendlyFireNearMiss'
	| 'CEventGetOutOfWater'
	| 'CEventGivePedTask'
	| 'CEventGroupScriptAI'
	| 'CEventGroupScriptNetwork'
	| 'CEventGunAimedAt'
	| 'CEventGunShot'
	| 'CEventGunShotBulletImpact'
	| 'CEventGunShotWhizzedBy'
	| 'CEventHelpAmbientFriend'
	| 'CEventHurtTransition'
	| 'CEventInAir'
	| 'CEventInfo'
	| 'CEventInfoBase'
	| 'CEventInjuredCryForHelp'
	| 'CEventLeaderEnteredCarAsDriver'
	| 'CEventLeaderExitedCarAsDriver'
	| 'CEventLeaderHolsteredWeapon'
	| 'CEventLeaderLeftCover'
	| 'CEventLeaderUnholsteredWeapon'
	| 'CEventMeleeAction'
	| 'CEventMustLeaveBoat'
	| 'CEventNetworkAdminInvited'
	| 'CEventNetworkAttemptHostMigration'
	| 'CEventNetworkBail'
	| 'CEventNetworkCashTransactionLog'
	| 'CEventNetworkCheatTriggered'
	| 'CEventNetworkClanInviteReceived'
	| 'CEventNetworkClanJoined'
	| 'CEventNetworkClanKicked'
	| 'CEventNetworkClanLeft'
	| 'CEventNetworkClanRankChanged'
	| 'CEventNetworkCloudEvent'
	| 'CEventNetworkCloudFileResponse'
	| 'CEventNetworkEmailReceivedEvent'
	| 'CEventNetworkEndMatch'
	| 'CEventNetworkEndSession'
	| 'CEventNetworkEntityDamage'
	| 'CEventNetworkFindSession'
	| 'CEventNetworkFollowInviteReceived'
	| 'CEventNetworkHostMigration'
	| 'CEventNetworkHostSession'
	| 'CEventNetworkIncrementStat'
	| 'CEventNetworkInviteAccepted'
	| 'CEventNetworkInviteConfirmed'
	| 'CEventNetworkInviteRejected'
	| 'CEventNetworkJoinSession'
	| 'CEventNetworkJoinSessionResponse'
	| 'CEventNetworkOnlinePermissionsUpdated'
	| 'CEventNetworkPedLeftBehind'
	| 'CEventNetworkPickupRespawned'
	| 'CEventNetworkPlayerArrest'
	| 'CEventNetworkPlayerCollectedAmbientPickup'
	| 'CEventNetworkPlayerCollectedPickup'
	| 'CEventNetworkPlayerCollectedPortablePickup'
	| 'CEventNetworkPlayerDroppedPortablePickup'
	| 'CEventNetworkPlayerEnteredVehicle'
	| 'CEventNetworkPlayerJoinScript'
	| 'CEventNetworkPlayerLeftScript'
	| 'CEventNetworkPlayerScript'
	| 'CEventNetworkPlayerSession'
	| 'CEventNetworkPlayerSpawn'
	| 'CEventNetworkPresenceInvite'
	| 'CEventNetworkPresenceInviteRemoved'
	| 'CEventNetworkPresenceInviteReply'
	| 'CEventNetworkPresenceTriggerEvent'
	| 'CEventNetworkPresence_StatUpdate'
	| 'CEventNetworkPrimaryClanChanged'
	| 'CEventNetworkRequestDelay'
	| 'CEventNetworkRosChanged'
	| 'CEventNetworkScAdminPlayerUpdated'
	| 'CEventNetworkScAdminReceivedCash'
	| 'CEventNetworkScriptEvent'
	| 'CEventNetworkSessionEvent'
	| 'CEventNetworkShopTransaction'
	| 'CEventNetworkSignInStateChanged'
	| 'CEventNetworkSocialClubAccountLinked'
	| 'CEventNetworkSpectateLocal'
	| 'CEventNetworkStartMatch'
	| 'CEventNetworkStartSession'
	| 'CEventNetworkStorePlayerLeft'
	| 'CEventNetworkSummon'
	| 'CEventNetworkSystemServiceEvent'
	| 'CEventNetworkTextMessageReceived'
	| 'CEventNetworkTimedExplosion'
	| 'CEventNetworkTransitionEvent'
	| 'CEventNetworkTransitionGamerInstruction'
	| 'CEventNetworkTransitionMemberJoined'
	| 'CEventNetworkTransitionMemberLeft'
	| 'CEventNetworkTransitionParameterChanged'
	| 'CEventNetworkTransitionStarted'
	| 'CEventNetworkTransitionStringChanged'
	| 'CEventNetworkVehicleUndrivable'
	| 'CEventNetworkVoiceConnectionRequested'
	| 'CEventNetworkVoiceConnectionResponse'
	| 'CEventNetworkVoiceConnectionTerminated'
	| 'CEventNetworkVoiceSessionEnded'
	| 'CEventNetworkVoiceSessionStarted'
	| 'CEventNetworkWithData'
	| 'CEventNetwork_InboxMsgReceived'
	| 'CEventNewTask'
	| 'CEventObjectCollision'
	| 'CEventOnFire'
	| 'CEventOpenDoor'
	| 'CEventPedCollisionWithPed'
	| 'CEventPedCollisionWithPlayer'
	| 'CEventPedEnteredMyVehicle'
	| 'CEventPedJackingMyVehicle'
	| 'CEventPedOnCarRoof'
	| 'CEventPedSeenDeadPed'
	| 'CEventPlayerCollisionWithPed'
	| 'CEventPlayerDeath'
	| 'CEventPlayerUnableToEnterVehicle'
	| 'CEventPotentialBeWalkedInto'
	| 'CEventPotentialBlast'
	| 'CEventPotentialGetRunOver'
	| 'CEventPotentialWalkIntoVehicle'
	| 'CEventProvidingCover'
	| 'CEventRanOverPed'
	| 'CEventReactionEnemyPed'
	| 'CEventReactionInvestigateDeadPed'
	| 'CEventReactionInvestigateThreat'
	| 'CEventRequestHelp'
	| 'CEventRequestHelpWithConfrontation'
	| 'CEventRespondedToThreat'
	| 'CEventScanner'
	| 'CEventScenarioForceAction'
	| 'CEventScriptCommand'
	| 'CEventScriptWithData'
	| 'CEventShocking'
	| 'CEventShockingBicycleCrash'
	| 'CEventShockingBicycleOnPavement'
	| 'CEventShockingCarAlarm'
	| 'CEventShockingCarChase'
	| 'CEventShockingCarCrash'
	| 'CEventShockingCarOnCar'
	| 'CEventShockingCarPileUp'
	| 'CEventShockingDangerousAnimal'
	| 'CEventShockingDeadBody'
	| 'CEventShockingDrivingOnPavement'
	| 'CEventShockingEngineRevved'
	| 'CEventShockingExplosion'
	| 'CEventShockingFire'
	| 'CEventShockingGunFight'
	| 'CEventShockingGunshotFired'
	| 'CEventShockingHelicopterOverhead'
	| 'CEventShockingHornSounded'
	| 'CEventShockingInDangerousVehicle'
	| 'CEventShockingInjuredPed'
	| 'CEventShockingMadDriver'
	| 'CEventShockingMadDriverBicycle'
	| 'CEventShockingMadDriverExtreme'
	| 'CEventShockingMugging'
	| 'CEventShockingNonViolentWeaponAimedAt'
	| 'CEventShockingParachuterOverhead'
	| 'CEventShockingPedKnockedIntoByPlayer'
	| 'CEventShockingPedRunOver'
	| 'CEventShockingPedShot'
	| 'CEventShockingPlaneFlyby'
	| 'CEventShockingPotentialBlast'
	| 'CEventShockingPropertyDamage'
	| 'CEventShockingRunningPed'
	| 'CEventShockingRunningStampede'
	| 'CEventShockingSeenCarStolen'
	| 'CEventShockingSeenConfrontation'
	| 'CEventShockingSeenGangFight'
	| 'CEventShockingSeenInsult'
	| 'CEventShockingSeenMeleeAction'
	| 'CEventShockingSeenNiceCar'
	| 'CEventShockingSeenPedKilled'
	| 'CEventShockingSiren'
	| 'CEventShockingStudioBomb'
	| 'CEventShockingVehicleTowed'
	| 'CEventShockingVisibleWeapon'
	| 'CEventShockingWeaponThreat'
	| 'CEventShockingWeirdPed'
	| 'CEventShockingWeirdPedApproaching'
	| 'CEventShoutBlockingLos'
	| 'CEventShoutTargetPosition'
	| 'CEventShovePed'
	| 'CEventSoundBase'
	| 'CEventStatChangedValue'
	| 'CEventStaticCountReachedMax'
	| 'CEventStuckInAir'
	| 'CEventSuspiciousActivity'
	| 'CEventSwitch2NM'
	| 'CEventUnidentifiedPed'
	| 'CEventVehicleCollision'
	| 'CEventVehicleDamage'
	| 'CEventVehicleDamageWeapon'
	| 'CEventVehicleOnFire'
	| 'CEventWrithe'
