import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useActionLock } from "./useActionLock";

describe("useActionLock", () => {
  it("bloqueia chamadas concorrentes antes da proxima renderizacao", async () => {
    let release!: () => void;
    const request = vi.fn(() => new Promise<void>((resolve) => { release = resolve; }));
    const { result } = renderHook(() => useActionLock());

    let first!: Promise<unknown>;
    let duplicate!: Promise<unknown>;
    act(() => {
      first = result.current.runAction("save", request);
      duplicate = result.current.runAction("save", request);
    });

    expect(request).toHaveBeenCalledOnce();
    expect(result.current.isActionPending()).toBe(true);
    expect(result.current.isActionPending("save")).toBe(true);

    await act(async () => {
      release();
      await Promise.all([first, duplicate]);
    });
    expect(result.current.isActionPending()).toBe(false);
  });

  it("libera a trava mesmo quando a requisicao falha", async () => {
    const { result } = renderHook(() => useActionLock());
    await expect(result.current.runAction("delete", async () => { throw new Error("falha"); })).rejects.toThrow("falha");
    expect(result.current.isActionPending()).toBe(false);
  });
});
