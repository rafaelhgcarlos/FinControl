import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { TransactionInput } from "../services/transactionsService";
import type { Account } from "../types/account";
import type { Category } from "../types/category";
import type { TransactionType } from "../types/transaction";
import { TransactionForm } from "./TransactionForm";

const accounts = [
  { id: "account-1", name: "Conta principal", status: "ACTIVE", userId: "user-1" },
  { id: "account-2", name: "Reserva", status: "ACTIVE", userId: "user-1" },
] as Account[];

const categories = [
  { id: "expense-1", name: "Mercado", type: "EXPENSE", status: "ACTIVE", userId: "user-1" },
  { id: "income-1", name: "Salário", type: "INCOME", status: "ACTIVE", userId: "user-1" },
] as Category[];

function formFor(type: TransactionType): TransactionInput {
  return {
    accountId: "account-1",
    amountInCents: 12500,
    categoryId: type === "INCOME" ? "income-1" : "expense-1",
    date: new Date("2026-08-17T12:00:00.000Z"),
    description: "",
    destinationAccountId: type === "TRANSFER" ? "account-2" : "",
    type,
  };
}

function Harness({ initialForm, onSubmit }: { initialForm: TransactionInput; onSubmit: () => void }) {
  const [form, setForm] = useState(initialForm);
  function changeType(type: TransactionType) {
    setForm((current) => ({
      ...current,
      type,
      categoryId: categories.find((category) => category.type === type)?.id ?? "",
      destinationAccountId: type === "TRANSFER" ? current.destinationAccountId : "",
    }));
  }
  return <TransactionForm accounts={accounts} categories={categories.filter((category) => category.type === form.type)} form={form} onCancel={vi.fn()} onChange={setForm} onSubmit={onSubmit} onTypeChange={changeType} />;
}

describe("TransactionForm", () => {
  it("mantem somente campos essenciais visiveis e revela a descricao sob demanda", () => {
    render(<Harness initialForm={formFor("EXPENSE")} onSubmit={vi.fn()} />);

    expect(screen.getByLabelText("Valor")).toHaveFocus();
    expect(screen.getByLabelText("Conta")).toBeInTheDocument();
    expect(screen.getByLabelText("Categoria")).toBeInTheDocument();
    expect(screen.getByLabelText("Data")).toBeInTheDocument();
    expect(screen.queryByLabelText("Descrição")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Mais opções" }));
    expect(screen.getByLabelText("Descrição")).toBeInTheDocument();
  });

  it("mostra somente origem e destino para transferencia", () => {
    render(<Harness initialForm={formFor("TRANSFER")} onSubmit={vi.fn()} />);

    expect(screen.getByLabelText("Conta de origem")).toBeInTheDocument();
    expect(screen.getByLabelText("Conta de destino")).toBeInTheDocument();
    expect(screen.queryByLabelText("Categoria")).not.toBeInTheDocument();
  });

  it.each(["EXPENSE", "INCOME", "TRANSFER"] as const)("submete o fluxo %s quando os campos sao validos", (type) => {
    const onSubmit = vi.fn();
    render(<Harness initialForm={formFor(type)} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it("associa erros aos campos obrigatorios", () => {
    render(<Harness initialForm={{ ...formFor("EXPENSE"), accountId: "", amountInCents: 0, categoryId: "" }} onSubmit={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(screen.getByLabelText("Valor")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Conta")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Categoria")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Informe um valor maior que zero.")).toBeInTheDocument();
  });

  it("mantem descricao existente aberta durante a edicao", () => {
    render(<Harness initialForm={{ ...formFor("INCOME"), description: "Salário mensal" }} onSubmit={vi.fn()} />);

    expect(screen.getByLabelText("Descrição")).toHaveValue("Salário mensal");
    expect(screen.getByRole("button", { name: "Mais opções" })).toHaveAttribute("aria-expanded", "true");
  });

  it("desabilita envio e cancelamento enquanto a requisicao esta em andamento", () => {
    render(<TransactionForm accounts={accounts} categories={categories.filter((category) => category.type === "EXPENSE")} form={formFor("EXPENSE")} onCancel={vi.fn()} onChange={vi.fn()} onSubmit={vi.fn()} onTypeChange={vi.fn()} submitting />);

    expect(screen.getByRole("button", { name: "Salvando..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
  });
});
