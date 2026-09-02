import type { CSSProperties, ReactNode } from 'react'

type Props = {
  children: ReactNode
  className?: string
  /** premium = login shell (#0a0e1a); client = dashboard harmonizado (#0b1224) */
  variant?: 'premium' | 'client'
  /** Cor white-label do salão — alimenta CSS var(--brand) */
  brandColor?: string
}

const DEFAULT_BRAND = '#d5a85c'

export default function AdminPageShell({
  children,
  className = '',
  variant = 'premium',
  brandColor = DEFAULT_BRAND,
}: Props) {
  const isClient = variant === 'client'
  const style = { '--brand': brandColor || DEFAULT_BRAND } as CSSProperties

  return (
    <div
      style={style}
      className={`relative min-h-screen overflow-x-hidden text-white ${
        isClient ? 'bg-[#0b1224]' : 'bg-[#0a0e1a]'
      } ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_15%_0%,rgba(99,102,241,0.14),transparent_52%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_85%_100%,rgba(217,70,239,0.1),transparent_48%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:46px_46px] [mask-image:linear-gradient(to_bottom,black,transparent_92%)]" />
      <div className="relative">{children}</div>
    </div>
  )
}
