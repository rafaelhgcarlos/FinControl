import type { TableHTMLAttributes } from "react";
import { cn } from "../utils/cn";

export function Table({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full min-w-[40rem] text-left text-sm", className)} {...props} />
    </div>
  );
}
