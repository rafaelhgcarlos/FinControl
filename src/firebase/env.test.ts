import { describe, expect, it } from "vitest";
import { resolveFirebaseConfig } from "./env";

describe("resolveFirebaseConfig", () => {
  it("retorna a configuracao quando todas as variaveis obrigatorias existem", () => {
    expect(resolveFirebaseConfig({
      VITE_FIREBASE_API_KEY: "api-key",
      VITE_FIREBASE_AUTH_DOMAIN: "fincontrol.firebaseapp.com",
      VITE_FIREBASE_PROJECT_ID: "fincontrol",
      VITE_FIREBASE_APP_ID: "app-id",
    })).toEqual({
      apiKey: "api-key",
      authDomain: "fincontrol.firebaseapp.com",
      projectId: "fincontrol",
      appId: "app-id",
    });
  });

  it("falha imediatamente listando apenas os nomes das variaveis ausentes", () => {
    expect(() => resolveFirebaseConfig({
      VITE_FIREBASE_API_KEY: "api-key",
      VITE_FIREBASE_PROJECT_ID: "fincontrol",
    })).toThrow("Configuracao do Firebase incompleta. Variaveis ausentes: VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_APP_ID.");
  });
});
