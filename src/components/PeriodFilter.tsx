import { Input } from "./Input";
import { Button } from "./Button";
import { toDateInputValue } from "../utils/date";
import type { DashboardPeriod, PeriodPreset } from "../services/analyticsService";

const presets: Array<{ value: PeriodPreset; label: string }> = [
  { value: "today", label: "Hoje" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mes" },
  { value: "year", label: "Ano" },
  { value: "custom", label: "Personalizado" },
];

type PeriodFilterProps = {
  period: DashboardPeriod;
  onPresetChange: (preset: PeriodPreset) => void;
  onCustomChange: (startDate: Date, endDate: Date) => void;
};

export function PeriodFilter({ onCustomChange, onPresetChange, period }: PeriodFilterProps) {
  return (
    <div className="flex w-full flex-col gap-3 lg:w-auto">
      <div className="scrollbar-none flex w-full gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:w-auto">
        {presets.map((preset) => (
          <Button
            key={preset.value}
            className={`min-h-9 shrink-0 border-0 px-3 shadow-none ${period.preset === preset.value ? "" : "bg-transparent"}`}
            onClick={() => onPresetChange(preset.value)}
            variant={period.preset === preset.value ? "primary" : "ghost"}
          >
            {preset.label}
          </Button>
        ))}
      </div>
      {period.preset === "custom" ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            aria-label="Data inicial"
            type="date"
            value={toDateInputValue(period.startDate)}
            onChange={(event) => onCustomChange(new Date(`${event.target.value}T00:00:00`), period.endDate)}
          />
          <Input
            aria-label="Data final"
            type="date"
            value={toDateInputValue(period.endDate)}
            onChange={(event) => onCustomChange(period.startDate, new Date(`${event.target.value}T23:59:59`))}
          />
        </div>
      ) : null}
    </div>
  );
}
