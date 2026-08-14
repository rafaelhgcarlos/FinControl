import type { InputHTMLAttributes } from "react";
import { Input } from "./Input";

type DatePickerProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function DatePicker(props: DatePickerProps) {
  return <Input type="date" {...props} />;
}
