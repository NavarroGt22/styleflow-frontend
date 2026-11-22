"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Select } from "@base-ui/react/select";
import { ArrowUpRight, Check, ChevronDown, X } from "lucide-react";
import type { ReactNode } from "react";

export function PageHeading({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description: string; actions?: ReactNode }) {
  return <div className="page-heading"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}<span aria-hidden="true" className="heading-dot">.</span></h1><p>{description}</p></div>{actions && <div className="heading-actions">{actions}</div>}</div>;
}

export function StatCard({ label, value, note, accent, icon }: { label: string; value: string | number; note: string; accent?: boolean; icon?: ReactNode }) {
  return <div className={`stat-card ${accent ? "stat-accent" : ""}`}><div className="stat-top"><span>{label}</span>{icon ?? <ArrowUpRight size={17} />}</div><strong>{value}</strong><div className="stat-note">{note}</div></div>;
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "green" | "amber" | "blue" | "neutral" | "red" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Avatar({ initials, tone = 0, small = false }: { initials: string; tone?: number; small?: boolean }) {
  return <span aria-hidden="true" className={`avatar avatar-${tone % 5} ${small ? "avatar-small" : ""}`}>{initials}</span>;
}

export function Modal({ open, onClose, title, description, children, wide = false }: { open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode; wide?: boolean }) {
  return <Dialog.Root open={open} onOpenChange={(value) => { if (!value) onClose(); }}><Dialog.Portal><Dialog.Backdrop className="platform-dialog-backdrop" /><Dialog.Popup className={`platform-workspace dialog-popup ${wide ? "dialog-wide" : ""}`}><div className="dialog-heading"><div><Dialog.Title>{title}</Dialog.Title>{description && <Dialog.Description>{description}</Dialog.Description>}</div><Dialog.Close className="icon-button" aria-label="Fechar"><X size={20} /></Dialog.Close></div>{children}</Dialog.Popup></Dialog.Portal></Dialog.Root>;
}

export function GlideSelect({ value, onChange, options, label, className = "" }: { value: string; onChange: (value: string) => void; options: { value: string; label: string }[]; label: string; className?: string }) {
  return <Select.Root value={value} onValueChange={(value) => { if (value !== null) onChange(value); }} items={options}><Select.Trigger aria-label={label} className={`select-trigger ${className}`}><Select.Value /><Select.Icon><ChevronDown size={15} /></Select.Icon></Select.Trigger><Select.Portal><Select.Positioner sideOffset={8} alignItemWithTrigger={false} className="select-positioner"><Select.Popup className="select-popup">{options.map((option) => <Select.Item key={option.value} value={option.value} className="select-item"><Select.ItemText>{option.label}</Select.ItemText><Select.ItemIndicator><Check size={15} /></Select.ItemIndicator></Select.Item>)}</Select.Popup></Select.Positioner></Select.Portal></Select.Root>;
}

export function formatBRL(cents: number) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100); }
export function formatDate(date: string) { return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "America/Bahia" }).format(new Date(date.length === 10 ? `${date}T12:00:00-03:00` : date)); }
