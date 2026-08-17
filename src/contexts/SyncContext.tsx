import { onSnapshotsInSync, waitForPendingWrites } from "firebase/firestore";
import { createContext, useContext, useEffect, useMemo, useReducer, type PropsWithChildren } from "react";
import { firestore, offlinePersistenceReady } from "../firebase/config";
import { reduceSyncState, settlePendingWrites, type SyncState } from "../services/syncService";

const SyncContext = createContext<SyncState | undefined>(undefined);

export function SyncProvider({ children }: PropsWithChildren) {
  const browserOnline = typeof navigator === "undefined" ? true : navigator.onLine;
  const [state, dispatch] = useReducer(reduceSyncState, { online: browserOnline, status: browserOnline ? "syncing" : "offline", persistenceEnabled: false });

  useEffect(() => {
    void offlinePersistenceReady.then((enabled) => dispatch({ type: "PERSISTENCE", enabled }));
    const sync = () => dispatch({ type: "SYNCED" });
    const unsubscribe = onSnapshotsInSync(firestore, sync);
    const offline = () => dispatch({ type: "OFFLINE" });
    const online = () => {
      dispatch({ type: "ONLINE" });
      void settlePendingWrites(() => waitForPendingWrites(firestore), sync).catch(() => undefined);
    };
    window.addEventListener("offline", offline);
    window.addEventListener("online", online);
    if (browserOnline) online();
    return () => { unsubscribe(); window.removeEventListener("offline", offline); window.removeEventListener("online", online); };
  }, [browserOnline]);

  const value = useMemo(() => state, [state]);
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSyncStatus() {
  const value = useContext(SyncContext);
  if (!value) throw new Error("useSyncStatus deve ser usado dentro de SyncProvider.");
  return value;
}
