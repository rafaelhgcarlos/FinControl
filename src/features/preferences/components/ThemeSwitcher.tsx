import { Moon, Monitor, Sun } from "lucide-react";
import { Button } from "../../../components/Button";
import { useTheme, type ThemePreference } from "../../../contexts/ThemeContext";

const options: Array<{ label: string; value: ThemePreference; icon: typeof Sun }> = [
  { label: "Claro", value: "light", icon: Sun },
  { label: "Escuro", value: "dark", icon: Moon },
  { label: "Sistema", value: "system", icon: Monitor },
];

export function ThemeSwitcher() {
  const { preference, setPreference } = useTheme();

  return (
    <div className="inline-flex rounded-md border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900" role="group" aria-label="Tema">
      {options.map((option) => {
        const Icon = option.icon;
        const active = option.value === preference;
        return (
          <Button
            aria-pressed={active}
            className={`min-h-8 px-2 ${active ? "bg-slate-100 dark:bg-slate-800" : ""}`}
            key={option.value}
            onClick={() => setPreference(option.value)}
            title={option.label}
            variant="ghost"
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">{option.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
