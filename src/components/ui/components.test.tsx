import { fireEvent, render, screen } from "@testing-library/react";
import { Pencil } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "../Button";
import { Toast } from "../Toast";
import { ConfirmDialog } from "./ConfirmDialog";
import { IconButton } from "./IconButton";
import { Skeleton } from "./Skeleton";
import { Tabs } from "./Tabs";
import { BottomSheet } from "./BottomSheet";

describe("primitives do design system", () => {
  it("expõe estado de carregamento e impede múltiplas ações", () => {
    render(<Button loading>Salvar</Button>);
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Salvar" })).toHaveAttribute("aria-busy", "true");
  });

  it("exige nome acessível em ação somente com ícone", () => {
    render(<IconButton aria-label="Editar"><Pencil /></IconButton>);
    expect(screen.getByRole("button", { name: "Editar" })).toBeVisible();
  });

  it("mantém tabs navegáveis e comunica a seleção", () => {
    const onChange = vi.fn();
    render(<Tabs active="summary" ariaLabel="Seções" items={[{ value: "summary", label: "Resumo" }, { value: "history", label: "Histórico" }]} onChange={onChange} />);
    expect(screen.getByRole("tab", { name: "Resumo" })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("tab", { name: "Histórico" }));
    expect(onChange).toHaveBeenCalledWith("history");
  });

  it("padroniza confirmação destrutiva e feedback sem depender apenas de cor", () => {
    const onConfirm = vi.fn();
    render(<><ConfirmDialog description="Excluir registro?" isOpen onClose={vi.fn()} onConfirm={onConfirm} title="Confirmar exclusão" /><Toast variant="error">Falha ao excluir</Toast></>);
    expect(screen.getByRole("dialog", { name: "Confirmar exclusão" })).toHaveTextContent("Esta ação pode afetar seu histórico financeiro");
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(screen.getByRole("alert")).toHaveTextContent("Falha ao excluir");
  });

  it("fornece skeleton sem anunciar conteúdo duplicado", () => {
    const { container } = render(<Skeleton className="h-4" />);
    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
  });

  it("mantém foco contido no Bottom Sheet, fecha por Escape e restaura o foco", () => {
    const onClose = vi.fn();
    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    trigger.focus();
    const { unmount } = render(<BottomSheet footer={<Button>Concluir</Button>} isOpen onClose={onClose} title="Ações rápidas"><Button>Primeira ação</Button><Button>Última ação</Button></BottomSheet>);
    expect(screen.getByRole("dialog", { name: "Ações rápidas" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Fechar" })).toHaveFocus();
    screen.getByRole("button", { name: "Concluir" }).focus();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Tab" });
    expect(screen.getByRole("button", { name: "Fechar" })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Tab", shiftKey: true });
    expect(screen.getByRole("button", { name: "Concluir" })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
    unmount();
    expect(trigger).toHaveFocus();
    trigger.remove();
  });
});
