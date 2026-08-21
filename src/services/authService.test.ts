import { FirebaseError } from "firebase/app";
import { describe, expect, it } from "vitest";
import { authErrorMessage } from "./authService";

describe("authErrorMessage", () => {
  it("traduz credenciais recusadas sem expor detalhes da conta", () => {
    expect(authErrorMessage(new FirebaseError("auth/invalid-credential", "INVALID_LOGIN_CREDENTIALS"))).toBe("E-mail ou senha inválidos.");
  });

  it("orienta quando o provedor de senha não está habilitado", () => {
    expect(authErrorMessage(new FirebaseError("auth/operation-not-allowed", "OPERATION_NOT_ALLOWED"))).toBe("O login por e-mail e senha não está habilitado no Firebase.");
  });
});
