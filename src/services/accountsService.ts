import { collection, limit, orderBy, query, where, type Firestore } from "firebase/firestore";
import { collections } from "../firebase/collections";
import type { Account } from "../types/account";
import { createConverter } from "./firestoreConverters";

const accountConverter = createConverter<Account>();

export function buildActiveAccountsQuery(db: Firestore, userId: string, pageSize = 50) {
  return query(
    collection(db, collections.accounts).withConverter(accountConverter),
    where("userId", "==", userId),
    where("archived", "==", false),
    orderBy("name", "asc"),
    limit(pageSize),
  );
}
