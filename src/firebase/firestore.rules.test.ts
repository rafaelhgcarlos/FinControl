/**
 * @vitest-environment node
 */
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";

const projectId = "fincontrol-rules-test";
const userA = "user-a";
const userB = "user-b";
const now = Timestamp.fromDate(new Date("2026-08-14T12:00:00.000Z"));

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

afterAll(async () => {
  await testEnv.cleanup();
});

function authedDb(uid: string) {
  return testEnv.authenticatedContext(uid).firestore();
}

function accountData(userId = userA) {
  return {
    userId,
    createdAt: now,
    updatedAt: now,
    name: "Conta corrente",
    balanceInCents: 125000,
    archived: false,
  };
}

function transactionData(userId = userA) {
  return {
    userId,
    createdAt: now,
    updatedAt: now,
    description: "Mercado",
    amountInCents: 3290,
    date: now,
    type: "expense",
    accountId: "account-a",
  };
}

async function seedPrivateDoc(collectionName: string, id: string, data: Record<string, unknown>) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), collectionName, id), data);
  });
}

describe("Firestore security rules", () => {
  it("allows users to read only their own financial documents", async () => {
    await seedPrivateDoc("accounts", "own-account", accountData(userA));
    await seedPrivateDoc("accounts", "other-account", accountData(userB));

    const dbA = authedDb(userA);

    await assertSucceeds(getDoc(doc(dbA, "accounts", "own-account")));
    await assertFails(getDoc(doc(dbA, "accounts", "other-account")));
    await assertSucceeds(getDocs(query(collection(dbA, "accounts"), where("userId", "==", userA))));
    await assertFails(getDocs(query(collection(dbA, "accounts"), where("userId", "==", userB))));
    await assertFails(getDocs(collection(dbA, "accounts")));
  });

  it("requires created financial documents to belong to the authenticated user", async () => {
    const dbA = authedDb(userA);

    await assertSucceeds(setDoc(doc(dbA, "accounts", "account-a"), accountData(userA)));
    await assertFails(setDoc(doc(dbA, "accounts", "spoofed-account"), accountData(userB)));
    await assertFails(setDoc(doc(dbA, "transactions", "spoofed-transaction"), transactionData(userB)));
  });

  it("prevents changing userId on existing financial documents", async () => {
    await seedPrivateDoc("accounts", "account-a", accountData(userA));
    const dbA = authedDb(userA);

    await assertSucceeds(updateDoc(doc(dbA, "accounts", "account-a"), { name: "Reserva", updatedAt: now }));
    await assertFails(updateDoc(doc(dbA, "accounts", "account-a"), { userId: userB, updatedAt: now }));
  });

  it("prevents users from modifying or deleting another user's documents", async () => {
    await seedPrivateDoc("transactions", "transaction-b", transactionData(userB));
    const dbA = authedDb(userA);

    await assertFails(updateDoc(doc(dbA, "transactions", "transaction-b"), { description: "Alterado", updatedAt: now }));
    await assertFails(deleteDoc(doc(dbA, "transactions", "transaction-b")));
  });

  it("validates fundamental fields for known private collections", async () => {
    const dbA = authedDb(userA);
    const invalidAccount = {
      userId: userA,
      createdAt: now,
      updatedAt: now,
      name: "Sem saldo",
      archived: false,
    };
    const invalidTransaction = {
      ...transactionData(userA),
      type: "unsupported",
    };

    await assertFails(setDoc(doc(dbA, "accounts", "invalid-account"), invalidAccount));
    await assertFails(setDoc(doc(dbA, "transactions", "invalid-transaction"), invalidTransaction));
  });

  it("keeps salary, balance, expense, cards, history, and goals collections non-public", async () => {
    await seedPrivateDoc("cards", "card-a", {
      userId: userA,
      createdAt: now,
      updatedAt: now,
      name: "Cartao",
      limitInCents: 300000,
    });

    const dbA = authedDb(userA);
    const dbB = authedDb(userB);
    const publicDb = testEnv.unauthenticatedContext().firestore();
    const privateCollections = ["salaries", "balances", "expenses", "history", "goals", "salarios", "saldos", "gastos", "historico", "metas"];

    await assertSucceeds(getDoc(doc(dbA, "cards", "card-a")));
    await assertFails(getDoc(doc(dbB, "cards", "card-a")));
    await assertFails(getDoc(doc(publicDb, "cards", "card-a")));

    for (const collectionName of privateCollections) {
      await assertSucceeds(setDoc(doc(dbA, collectionName, "own-doc"), { userId: userA, createdAt: now, updatedAt: now }));
      await assertFails(setDoc(doc(dbA, collectionName, "spoofed-doc"), { userId: userB, createdAt: now, updatedAt: now }));
      await assertFails(setDoc(doc(publicDb, collectionName, "public-doc"), { userId: userA, createdAt: now, updatedAt: now }));
    }
  });

  it("restricts user profiles to the matching authenticated user", async () => {
    const dbA = authedDb(userA);
    const dbB = authedDb(userB);
    const profileA = {
      id: userA,
      email: "a@example.com",
      displayName: "User A",
      locale: "pt-BR",
      currency: "BRL",
      timeZone: "America/Sao_Paulo",
    };

    await assertSucceeds(setDoc(doc(dbA, "users", userA), profileA));
    await assertFails(getDoc(doc(dbB, "users", userA)));
    await assertFails(setDoc(doc(dbA, "users", userB), { ...profileA, id: userB }));
    await assertFails(updateDoc(doc(dbA, "users", userA), { id: userB }));

    const storedProfile = await getDoc(doc(dbA, "users", userA));
    expect(storedProfile.exists()).toBe(true);
  });

  it("denies undeclared collections by default", async () => {
    const dbA = authedDb(userA);

    await assertFails(setDoc(doc(dbA, "publicReports", "report-a"), { userId: userA, createdAt: now, updatedAt: now }));
    await assertFails(getDoc(doc(dbA, "publicReports", "report-a")));
  });
});
