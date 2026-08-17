import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider, useToast } from "./ToastContext";

function Trigger({ action }: { action?: () => void }) {
  const toast = useToast();
  useEffect(() => { toast.success("Operação concluída", action ? { action: { label: "Desfazer", onClick: action }, duration: 0 } : { duration: 1000 }); }, [action, toast]);
  return null;
}

afterEach(() => vi.useRealTimers());

describe("ToastProvider", () => {
  it("fecha automaticamente conforme a duração configurada", () => {
    vi.useFakeTimers();
    render(<ToastProvider><Trigger /></ToastProvider>);
    expect(screen.getByRole("status")).toHaveTextContent("Operação concluída");
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("permite fechamento manual e ação secundária", async () => {
    const undo = vi.fn();
    render(<ToastProvider><Trigger action={undo} /></ToastProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Desfazer" }));
    expect(undo).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
  });
});
