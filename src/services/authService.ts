import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { firebaseAuth } from "../firebase/config";
import { ensureUserProfile } from "./userService";

export async function register(email: string, password: string, displayName: string) {
  const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
  await updateProfile(credential.user, { displayName });
  await ensureUserProfile(credential.user);
  return credential.user;
}

export async function login(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
  return credential.user;
}

export function resetPassword(email: string) {
  return sendPasswordResetEmail(firebaseAuth, email);
}

export function logout() {
  return signOut(firebaseAuth);
}

export function authErrorMessage(error: unknown) {
  const code = error instanceof Error && "code" in error ? String(error.code) : "";
  const messages: Record<string, string> = {
    "auth/invalid-credential": "E-mail ou senha inválidos.",
    "auth/email-already-in-use": "Este e-mail já está em uso.",
    "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
    "auth/invalid-email": "Informe um e-mail válido.",
    "auth/user-not-found": "Não encontramos uma conta com este e-mail.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
    "auth/requires-recent-login": "Por segurança, entre novamente antes de excluir sua conta.",
  };
  if (code === "permission-denied") return "O Firestore recusou o acesso. Publique as regras do projeto Firebase e tente novamente.";
  return messages[code] ?? "Não foi possível concluir a operação. Tente novamente.";
}
