import { cn } from "@/app/lib/cn";

export type Metric = { value: string; label: string };

export type MetricStripProps = {
  metrics: readonly Metric[];
  className?: string;
};

export function MetricStrip({ metrics, className }: MetricStripProps) {
  return (
    <dl className={cn("grid grid-cols-3 border-t border-line", className)}>
      {metrics.map((metric) => (
        <div
          className="border-line px-4 pt-4 first:pl-0 last:border-r-0 last:pr-0 [&:not(:last-child)]:border-r sm:px-6"
          key={metric.label}
        >
          <dt className="font-mono text-base text-fg">{metric.value}</dt>
          <dd className="mt-1.5 text-[0.65rem] tracking-[0.1em] text-fg-dim">{metric.label}</dd>
        </div>
      ))}
    </dl>
  );
}
