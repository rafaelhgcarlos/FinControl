import { describe, expect, it, vi } from "vitest";
import { runBatchedAccountDeletion } from "./userService";

describe("account data deletion", () => {
  it("processa mais de 500 documentos em varios lotes e colecoes", async () => {
    const queues: Record<string, number[]> = { accounts: [450, 151, 0], goals: [2, 0] };
    const commits: number[] = [];
    const deleted = await runBatchedAccountDeletion(["accounts", "goals"], async (name) => Array.from({ length: queues[name].shift() ?? 0 }, (_, id) => id), async (items) => { commits.push(items.length); });
    expect(deleted).toBe(603);
    expect(commits).toEqual([450, 151, 2]);
  });

  it("interrompe e propaga falha parcial sem indicar sucesso", async () => {
    const commit = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("network"));
    let calls = 0;
    await expect(runBatchedAccountDeletion(["transactions"], async () => Array.from({ length: calls++ === 0 ? 450 : 10 }, (_, id) => id), commit)).rejects.toThrow("network");
    expect(commit).toHaveBeenCalledTimes(2);
  });
});
