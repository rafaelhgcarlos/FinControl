import { Timestamp, type DocumentData, type FirestoreDataConverter, type QueryDocumentSnapshot, type SnapshotOptions } from "firebase/firestore";

type FirestoreDateFields = {
  createdAt?: Date;
  updatedAt?: Date;
  date?: Date;
};

export function createConverter<T extends FirestoreDateFields>(): FirestoreDataConverter<T> {
  return {
    fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): T {
      const data = snapshot.data(options);
      const convertedData = convertFirestoreValue(data) as DocumentData;
      return {
        ...convertedData,
        id: snapshot.id,
      } as unknown as T;
    },
    toFirestore(modelObject: T): DocumentData {
      return modelObject;
    },
  };
}

function convertFirestoreValue(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate();
  if (Array.isArray(value)) return value.map(convertFirestoreValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, convertFirestoreValue(item)]),
    );
  }
  return value;
}
