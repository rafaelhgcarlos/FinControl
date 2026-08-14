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
      return {
        ...data,
        id: snapshot.id,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt),
        date: convertTimestamp(data.date),
      } as unknown as T;
    },
    toFirestore(modelObject: T): DocumentData {
      return modelObject;
    },
  };
}

function convertTimestamp(value: unknown) {
  return value instanceof Timestamp ? value.toDate() : value;
}
