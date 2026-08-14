import { FirebaseError } from "firebase/app";

const messages: Record<string, string> = {
  "permission-denied": "O Firestore recusou esta operacao. Verifique se os dados pertencem ao usuario atual e se as regras publicadas estao atualizadas.",
  unauthenticated: "Sua sessao expirou. Entre novamente para continuar.",
  unavailable: "O Firebase esta indisponivel no momento. Tente novamente em instantes.",
  "not-found": "O registro solicitado nao foi encontrado.",
  "already-exists": "Este registro ja existe.",
  "failed-precondition": "Indice ou regra do Firebase pendente. Verifique a configuracao do Firestore.",
  "invalid-argument": "Algum campo foi enviado em formato invalido.",
};

export function getFriendlyFirebaseError(error: unknown, fallback = "Nao foi possivel concluir a operacao.") {
  if (error instanceof FirebaseError) {
    return messages[error.code.replace("firestore/", "")] ?? fallback;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}
