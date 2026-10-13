import type { ReactNode, InputHTMLAttributes, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Page({ title, subtitle, actions, children }: { title: string; subtitle?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-5 md:px-8 md:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold md:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export const Card = ({ className, children }: { className?: string; children: ReactNode }) => (
  <div className={cn("rounded-lg border bg-card p-4 md:p-5", className)}>{children}</div>
);

export function Btn({ variant = "primary", className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  return (
    <button
      {...p}
      className={cn(
        "inline-flex min-h-11 touch-manipulation select-none items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition active:scale-[0.98] disabled:opacity-50",
        variant === "primary" && "bg-primary text-primary-foreground hover:opacity-90",
        variant === "ghost" && "border bg-background hover:bg-accent",
        variant === "danger" && "text-destructive hover:bg-destructive/10",
        className,
      )}
    />
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-xs font-medium text-muted-foreground">
      {label}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
const inputCls = "w-full min-h-11 rounded-lg border bg-background px-3.5 py-2.5 text-base text-foreground outline-none focus:ring-2 focus:ring-ring";
export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => (
  <input {...p} inputMode={p.type === "number" && !p.inputMode ? "decimal" : p.inputMode} className={cn(inputCls, p.className)} />
);
export const Select = (p: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={cn(inputCls, "appearance-none pr-9", p.className)} />;

export function StockBadge({ stock, min, unit = "u" }: { stock: number; min: number; unit?: string }) {
  const low = stock <= min;
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", low ? "bg-destructive/15 text-destructive" : "bg-success/15 text-success")}>
      {low && "⚠ "}
      {stock} {unit}
    </span>
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 md:items-center md:p-4" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-card p-5 pb-8 md:rounded-2xl md:pb-5"
        style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="min-w-0 font-display text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="-mr-1 -mt-1 flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-full text-xl text-muted-foreground active:bg-accent" aria-label="Cerrar">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
