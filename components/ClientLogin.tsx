'use client'

import { ArrowLeft, ArrowUpRight, MapPin, Scissors } from 'lucide-react'

type ClientLoginProps = {
  brandName?: string
  salonName?: string
  salonAddress?: string
  logoUrl?: string
  primaryColor?: string
  backHref?: string
}

export default function ClientLogin({
  brandName = 'LELECO',
  salonName = 'Leleco Barbers',
  salonAddress = 'Rua Harmonia, 217 · Vila Madalena, São Paulo',
  logoUrl,
  primaryColor = '#d5a85c',
  backHref = '/',
}: ClientLoginProps) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-5 py-8 text-foreground sm:px-8" style={{ '--brand': primaryColor } as React.CSSProperties}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,color-mix(in_srgb,var(--brand)_13%,transparent),transparent_48%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:46px_46px] [mask-image:linear-gradient(to_bottom,black,transparent_75%)]" />

      <div className="relative w-full max-w-md animate-[fade-in-up_700ms_ease-out_both]">
        <a href={backHref} className="mb-10 inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-[var(--brand)]"><ArrowLeft className="h-4 w-4" />Voltar</a>

        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center border border-[var(--brand)]/60 bg-[var(--brand)]/10 text-[var(--brand)]">{logoUrl ? <img src={logoUrl} alt={`Logo ${brandName}`} className="h-full w-full object-cover" /> : <Scissors className="h-6 w-6 -rotate-45" strokeWidth={1.5} />}</div>
          <div><p className="mb-1 text-[10px] font-semibold tracking-[0.3em] text-[var(--brand)]">AGENDA ONLINE</p><p className="font-serif text-xl tracking-wide">{brandName}</p></div>
        </div>

        <div className="border border-border/70 bg-card/70 p-6 shadow-2xl shadow-black/20 backdrop-blur-sm sm:p-8">
          <div className="mb-8"><p className="mb-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">Área do cliente</p><h1 className="font-serif text-4xl leading-tight tracking-[-0.03em] sm:text-5xl">Que bom ter você <span className="text-[var(--brand)] italic">de volta.</span></h1><p className="mt-4 text-sm leading-6 text-muted-foreground">Entre para consultar seus agendamentos e reservar seu próximo momento.</p></div>

          <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); /* Integre aqui com seu onSubmit ou react-router. */ }}>
            <div><label htmlFor="login-phone" className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Telefone ou WhatsApp</label><input id="login-phone" name="phone" type="tel" inputMode="tel" placeholder="(11) 99999-9999" autoComplete="tel" className="h-12 w-full border border-border bg-background/60 px-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]" /></div>
            <button type="submit" className="group flex h-12 w-full items-center justify-center gap-2 bg-[var(--brand)] text-sm font-semibold text-primary-foreground transition-all hover:-translate-y-0.5 hover:brightness-110">Entrar <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">Ainda não tem cadastro? <a href="#cadastro" className="font-medium text-[var(--brand)] underline-offset-4 hover:underline">Criar conta</a></p>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-center text-[11px] text-muted-foreground"><MapPin className="h-3.5 w-3.5 text-[var(--brand)]" />{salonName} · {salonAddress}</div>
      </div>
    </main>
  )
}

export type { ClientLoginProps }
