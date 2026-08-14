export function useRequiredUserId(userId: string | null | undefined) {
  if (!userId) {
    throw new Error("Usuario autenticado e obrigatorio para acessar dados privados.");
  }
  return userId;
}
