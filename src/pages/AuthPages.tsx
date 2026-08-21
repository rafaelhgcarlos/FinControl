import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { FormField } from "../components/FormField";
import { Input } from "../components/Input";
import { authErrorMessage, login, register, resetPassword } from "../services/authService";

export function LoginPage() {
  return <AuthForm mode="login" />;
}

export function RegisterPage() {
  return <AuthForm mode="register" />;
}

function AuthForm({ mode }: { mode: "login" | "register" }) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isRegister = mode === "register";
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    try { if (isRegister) await register(email, password, name); else await login(email, password); navigate(isRegister ? "/app/onboarding" : "/app", { replace: true }); }
    catch (submissionError) { setError(authErrorMessage(submissionError)); }
    finally { setBusy(false); }
  }
  return <AuthLayout><Card className="p-6 sm:p-8"><div className="mb-6"><h1 className="text-2xl font-semibold">{isRegister ? "Crie sua conta" : "Bem-vindo de volta"}</h1><p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{isRegister ? "Comece a organizar sua vida financeira." : "Acesse seu painel financeiro."}</p></div><form className="space-y-4" onSubmit={handleSubmit}>{isRegister ? <FormField id="name" label="Nome"><Input id="name" required value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" /></FormField> : null}<FormField id="email" label="E-mail"><Input id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></FormField><FormField id="password" label="Senha" hint={isRegister ? "Use pelo menos 6 caracteres." : undefined}><Input id="password" type="password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={isRegister ? "new-password" : "current-password"} /></FormField>{error ? <p role="alert" className="text-sm font-medium text-rose-700 dark:text-rose-300">{error}</p> : null}<Button className="w-full" disabled={busy} type="submit">{busy ? "Aguarde..." : isRegister ? "Criar conta" : "Entrar"}</Button></form><div className="mt-6 flex flex-col gap-3 text-center text-sm text-slate-600 dark:text-slate-400">{!isRegister ? <Link className="font-medium text-emerald-700 hover:underline dark:text-emerald-400" to="/forgot-password">Esqueci minha senha</Link> : null}<span>{isRegister ? "Já tem uma conta?" : "Ainda não tem uma conta?"} <Link className="font-medium text-emerald-700 hover:underline dark:text-emerald-400" to={isRegister ? "/login" : "/register"}>{isRegister ? "Entrar" : "Criar conta"}</Link></span></div></Card></AuthLayout>;
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState(""); const [message, setMessage] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function handleSubmit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); setError(""); try { await resetPassword(email); setMessage("Se o e-mail estiver cadastrado, você receberá as instruções em instantes."); } catch (submissionError) { setError(authErrorMessage(submissionError)); } finally { setBusy(false); } }
  return <AuthLayout><Card className="p-6 sm:p-8"><h1 className="text-2xl font-semibold">Recuperar senha</h1><p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Enviaremos um link para redefinir seu acesso.</p><form className="mt-6 space-y-4" onSubmit={handleSubmit}><FormField id="email" label="E-mail"><Input id="email" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></FormField>{message ? <p role="status" className="text-sm text-emerald-700 dark:text-emerald-300">{message}</p> : null}{error ? <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{error}</p> : null}<Button className="w-full" disabled={busy} type="submit">{busy ? "Enviando..." : "Enviar instruções"}</Button></form><Link className="mt-6 block text-center text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400" to="/login">Voltar para o login</Link></Card></AuthLayout>;
}
