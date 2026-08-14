import { collection, limit, orderBy, query, where, type Firestore } from "firebase/firestore";
import { collections } from "../firebase/collections";
import type { Transaction } from "../types/transaction";
import { createConverter } from "./firestoreConverters";

const transactionConverter = createConverter<Transaction>();

export function buildRecentTransactionsQuery(db: Firestore, userId: string, pageSize = 25) {
  return query(
    collection(db, collections.transactions).withConverter(transactionConverter),
    where("userId", "==", userId),
    orderBy("date", "desc"),
    limit(pageSize),
  );
}
