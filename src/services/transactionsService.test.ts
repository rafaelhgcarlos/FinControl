import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DocumentSnapshot } from "firebase/firestore";
import type { Transaction } from "../types/transaction";

const getDocsMock = vi.hoisted(() => vi.fn());

vi.mock("firebase/firestore", async () => {
  const actual = await vi.importActual<typeof import("firebase/firestore")>("firebase/firestore");
  return {
    ...actual,
    collection: vi.fn(() => ({ withConverter: vi.fn(() => "transactionsRef") })),
    doc: vi.fn(),
    getDocs: getDocsMock,
    limit: vi.fn((value: number) => ({ type: "limit", value })),
    orderBy: vi.fn((field: string, direction: string) => ({ type: "orderBy", field, direction })),
    query: vi.fn((collectionRef: unknown, ...constraints: unknown[]) => ({ collectionRef, constraints })),
    startAfter: vi.fn((cursor: unknown) => ({ type: "startAfter", cursor })),
    where: vi.fn((field: string, operator: string, value: unknown) => ({ type: "where", field, operator, value })),
  };
});

vi.mock("../firebase/config", () => ({ firestore: {} }));

import { listTransactionsPage } from "./transactionsService";

describe("listTransactionsPage", () => {
  beforeEach(() => {
    getDocsMock.mockReset();
  });

  it("continua buscando paginas internas ate preencher a busca por descricao", async () => {
    const firstPage = Array.from({ length: 25 }, (_, index) => transactionDoc(`first-${index}`, `Despesa comum ${index}`));
    const matchingDoc = transactionDoc("match-1", "Pagamento aluguel");
    const secondPage = [matchingDoc, transactionDoc("second-1", "Mercado")];
    getDocsMock
      .mockResolvedValueOnce({ docs: firstPage })
      .mockResolvedValueOnce({ docs: secondPage });

    const result = await listTransactionsPage("user-1", { search: "aluguel" }, 25);

    expect(result.items).toEqual([matchingDoc.data()]);
    expect(result.lastDoc).toBe(secondPage.at(-1));
    expect(result.hasMore).toBe(false);
    expect(getDocsMock).toHaveBeenCalledTimes(2);
  });

  it("combina busca textual com filtro de conta sem duplicar o cursor varrido", async () => {
    const firstPage = [
      transactionDoc("first-1", "Aluguel", { accountId: "other" }),
      ...Array.from({ length: 24 }, (_, index) => transactionDoc(`first-${index + 2}`, `Despesa comum ${index}`)),
    ];
    const secondPage = [transactionDoc("second-1", "Aluguel", { accountId: "checking" })];
    getDocsMock
      .mockResolvedValueOnce({ docs: firstPage })
      .mockResolvedValueOnce({ docs: secondPage });

    const result = await listTransactionsPage("user-1", { search: "aluguel", accountId: "checking" }, 25);

    expect(result.items).toEqual([secondPage[0].data()]);
    expect(result.lastDoc).toBe(secondPage[0]);
    expect(getDocsMock).toHaveBeenCalledTimes(2);
  });
});

function transactionDoc(id: string, description: string, overrides: Partial<Transaction> = {}) {
  const data: Transaction = {
    id,
    userId: "user-1",
    amountInCents: 1000,
    type: "EXPENSE",
    categoryId: "category-1",
    accountId: "checking",
    date: new Date("2026-08-01T12:00:00"),
    description,
    createdAt: new Date("2026-08-01T12:00:00"),
    updatedAt: new Date("2026-08-01T12:00:00"),
    ...overrides,
  };
  return {
    id,
    data: () => data,
  } as unknown as DocumentSnapshot<Transaction>;
}
