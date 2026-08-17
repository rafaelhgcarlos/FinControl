import { describe, expect, it, vi } from "vitest";
import { reduceSyncState, settlePendingWrites, type SyncState } from "./syncService";

const synced: SyncState = { online: true, status: "synced", persistenceEnabled: true };

describe("sync state", () => {
  it("detecta perda e retorno da conexao", () => {
    const offline = reduceSyncState(synced, { type: "OFFLINE" });
    expect(offline.status).toBe("offline");
    expect(reduceSyncState(offline, { type: "ONLINE" }).status).toBe("syncing");
  });

  it("so informa sincronizado depois de esvaziar a fila", async () => {
    const done = vi.fn();
    await settlePendingWrites(() => Promise.resolve(), done);
    expect(done).toHaveBeenCalledOnce();
  });

  it("mantem o app funcional quando a persistencia nao e suportada", () => {
    expect(reduceSyncState(synced, { type: "PERSISTENCE", enabled: false })).toEqual({ ...synced, persistenceEnabled: false });
  });
});
