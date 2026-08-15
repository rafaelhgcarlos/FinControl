import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DocumentSnapshot } from "firebase/firestore";
import type { Account } from "../types/account";

const getDocsMock = vi.hoisted(() => vi.fn());
const updateDocMock = vi.hoisted(() => vi.fn(() => Promise.resolve()));

vi.mock("firebase/firestore", async () => {
  const actual = await vi.importActual<typeof import("firebase/firestore")>("firebase/firestore");
  return {
    ...actual,
    collection: vi.fn(() => ({ withConverter: vi.fn(() => "accountsRef") })),
    doc: vi.fn(() => "accountRef"),
    documentId: vi.fn(() => "__name__"),
    getDocs: getDocsMock,
    limit: vi.fn((value: number) => ({ type: "limit", value })),
    orderBy: vi.fn((field: string) => ({ type: "orderBy", field })),
    query: vi.fn((collectionRef: unknown, ...constraints: unknown[]) => ({ collectionRef, constraints })),
    startAfter: vi.fn((cursor: unknown) => ({ type: "startAfter", cursor })),
    updateDoc: updateDocMock,
    where: vi.fn((field: string, operator: string, value: unknown) => ({ type: "where", field, operator, value })),
  };
});

vi.mock("../firebase/config", () => ({ firestore: {} }));

import { listAccounts } from "./accountsService";

describe("listAccounts", () => {
  beforeEach(() => {
    getDocsMock.mockReset();
    updateDocMock.mockClear();
  });

  it("recupera mais de 100 contas sem duplicar ou omitir e preserva ordenacao por nome", async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => accountDoc(`account-${String(index).padStart(3, "0")}`, `Conta ${String(index).padStart(3, "0")}`));
    const secondPage = [
      accountDoc("account-101", "Zeta"),
      accountDoc("account-102", "Alfa"),
      accountDoc("account-103", "Alfa"),
    ];
    getDocsMock
      .mockResolvedValueOnce({ docs: firstPage })
      .mockResolvedValueOnce({ docs: secondPage });

    const accounts = await listAccounts("user-1");

    expect(accounts).toHaveLength(103);
    expect(new Set(accounts.map((account) => account.id)).size).toBe(103);
    expect(accounts.map((account) => account.name).slice(0, 2)).toEqual(["Alfa", "Alfa"]);
    expect(accounts[0].id).toBe("account-102");
    expect(getDocsMock).toHaveBeenCalledTimes(2);
  });

  it("executa migracao de cada conta legada uma unica vez durante a paginacao", async () => {
    const legacyDoc = accountDoc("legacy-account", "Legada", { initialBalanceInCents: undefined, currentBalanceInCents: undefined });
    getDocsMock.mockResolvedValueOnce({ docs: [legacyDoc] });

    await listAccounts("user-1");

    expect(updateDocMock).toHaveBeenCalledTimes(1);
  });
});

function accountDoc(id: string, name: string, overrides: Partial<Account> = {}) {
  const data: Partial<Account> & { balanceInCents?: number } = {
    id,
    userId: "user-1",
    createdAt: new Date("2026-08-01T12:00:00"),
    updatedAt: new Date("2026-08-01T12:00:00"),
    name,
    type: "CHECKING",
    initialBalanceInCents: 1000,
    currentBalanceInCents: 1000,
    color: "#059669",
    icon: "Landmark",
    status: "ACTIVE",
    ...overrides,
  };
  return {
    id,
    data: () => data,
  } as unknown as DocumentSnapshot<Account>;
}
