export type SyncStatus = "offline" | "syncing" | "synced";

export type SyncState = {
  online: boolean;
  status: SyncStatus;
  persistenceEnabled: boolean;
};

export type SyncEvent =
  | { type: "OFFLINE" }
  | { type: "ONLINE" }
  | { type: "SYNCED" }
  | { type: "PERSISTENCE"; enabled: boolean };

export const financialConflictPolicy = "SERVER_TRANSACTION_AND_IDEMPOTENCY_KEY" as const;

export function reduceSyncState(state: SyncState, event: SyncEvent): SyncState {
  if (event.type === "OFFLINE") return { ...state, online: false, status: "offline" };
  if (event.type === "ONLINE") return { ...state, online: true, status: "syncing" };
  if (event.type === "SYNCED") return state.online ? { ...state, status: "synced" } : state;
  return { ...state, persistenceEnabled: event.enabled };
}

export async function settlePendingWrites(waitForWrites: () => Promise<void>, onSynced: () => void) {
  await waitForWrites();
  onSynced();
}
