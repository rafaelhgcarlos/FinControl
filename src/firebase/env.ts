export const requiredFirebaseEnvKeys = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_APP_ID",
] as const;

export type FirebaseEnv = Partial<Record<(typeof requiredFirebaseEnvKeys)[number], string>>;

export function resolveFirebaseConfig(env: FirebaseEnv) {
  const missingKeys = requiredFirebaseEnvKeys.filter((key) => !env[key]?.trim());
  if (missingKeys.length > 0) {
    throw new Error(`Configuracao do Firebase incompleta. Variaveis ausentes: ${missingKeys.join(", ")}.`);
  }

  return {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  };
}
