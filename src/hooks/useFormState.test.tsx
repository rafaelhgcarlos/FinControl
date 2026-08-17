import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { useFormState } from "./useFormState";

function Harness() {
  const [value, setValue] = useState({ name: "Inicial" });
  const formState = useFormState(value, true);
  return <><span>{formState.status}</span><button onClick={() => setValue({ name: "Alterado" })}>Alterar</button><button onClick={() => formState.markSaved(value)}>Salvar</button></>;
}

describe("useFormState", () => {
  it("distingue estado inicial, modificado e salvo", () => {
    render(<Harness />);
    expect(screen.getByText("initial")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Alterar" }));
    expect(screen.getByText("dirty")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(screen.getByText("saved")).toBeInTheDocument();
  });
});
