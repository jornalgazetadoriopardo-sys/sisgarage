import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft } from "lucide-react";

const tones = {
  blue: "bg-brand-50 text-brand-600",
  green: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  red: "bg-red-50 text-red-600",
  slate: "bg-slate-100 text-slate-600",
  violet: "bg-violet-50 text-violet-600",
} as const;
export type Tone = keyof typeof tones;

export function IconBox({ icon: Icon, tone = "blue", size = "md" }: { icon: LucideIcon; tone?: Tone; size?: "sm" | "md" | "lg" }) {
  const s = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-12 w-12" : "h-10 w-10";
  const i = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-6 w-6" : "h-5 w-5";
  return (
    <span className={`icon-box ${s} ${tones[tone]}`}>
      <Icon className={i} aria-hidden />
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  back,
  actions,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  back?: { href: string; label: string };
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-8 space-y-3">
      {back && (
        <Link href={back.href} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-4 w-4" /> {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 sm:text-base">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function StatCard({
  icon,
  label,
  value,
  hint,
  tone = "blue",
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: Tone;
  href?: string;
}) {
  const body = (
    <>
      <IconBox icon={icon} tone={tone} />
      <div className="min-w-0">
        <p className="text-xs text-slate-500 sm:text-sm">{label}</p>
        <p className="mt-0.5 truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{value}</p>
        {hint && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{hint}</p>}
      </div>
    </>
  );
  // celular: 2 por linha, ícone em cima; telas maiores: ícone ao lado
  const cls = "card flex flex-col items-start gap-3 p-4 sm:flex-row sm:gap-4 sm:p-5";
  return href ? (
    <Link href={href} className={`${cls} transition hover:border-brand-200 hover:shadow-md`}>{body}</Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function Section({
  icon,
  tone,
  title,
  description,
  actions,
  children,
  className = "",
}: {
  icon?: LucideIcon;
  tone?: Tone;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`card p-5 sm:p-6 ${className}`}>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          {icon && <IconBox icon={icon} tone={tone} size="sm" />}
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon: LucideIcon;
  title: string;
  text?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <IconBox icon={icon} tone="slate" size="lg" />
      <div className="space-y-1">
        <p className="font-semibold text-slate-800">{title}</p>
        {text && <p className="mx-auto max-w-sm text-sm text-slate-500">{text}</p>}
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
