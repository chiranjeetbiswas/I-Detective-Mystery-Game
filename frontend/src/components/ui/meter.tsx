import { cn } from "@/lib/utils";

export function Meter({
  value,
  label,
  tone = "trust",
}: {
  value: number;
  label: string;
  tone?: "trust" | "stress" | "suspicion";
}) {
  const color =
    tone === "trust"
      ? "bg-emerald-500"
      : tone === "stress"
        ? "bg-amber-500"
        : "bg-red-500";
  return (
    <div className="w-full">
      <div className="mb-1 flex justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}
