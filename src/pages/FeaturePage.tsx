import type { LucideIcon } from "lucide-react";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";

export function FeaturePage({ title, description, icon: Icon }: { title: string; description: string; icon: LucideIcon }) {
  return <><PageHeader title={title} description={description} /><Card><EmptyState title={`Nenhum dado em ${title.toLowerCase()}`} description="Esta área está preparada para receber os próximos recursos do FinControl." icon={<Icon className="h-6 w-6" aria-hidden="true" />} /></Card></>;
}
