import type { InputHTMLAttributes } from "react";
import { Input } from "./Input";

type CurrencyInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "inputMode" | "type">;

export function CurrencyInput(props: CurrencyInputProps) {
  return <Input inputMode="numeric" placeholder="R$ 0,00" type="text" {...props} />;
}
