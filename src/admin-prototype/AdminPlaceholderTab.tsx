import type { LucideIcon } from 'lucide-react';

type Props = { icon: LucideIcon; title: string; description: string };

export default function AdminPlaceholderTab({ icon: Icon, title, description }: Props) {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/20 px-6 text-center">
      <span className="mb-5 grid size-16 place-items-center rounded-2xl bg-slate-800 text-indigo-400">
        <Icon className="size-8" />
      </span>
      <h2 className="text-xl font-bold text-white">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">{description}</p>
    </div>
  );
}
