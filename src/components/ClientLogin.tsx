import { ArrowLeft, ArrowUpRight, Loader2, MapPin, Scissors } from 'lucide-react';
import { Link } from 'react-router-dom';

export type ClientLoginProps = {
  brandName: string;
  salonName: string;
  salonAddress?: string;
  logoUrl?: string;
  primaryColor?: string;
  backHref: string;
  registerHref: string;
  phone: string;
  onPhoneChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  loading?: boolean;
  error?: string;
  success?: string;
};

export default function ClientLogin({
  brandName,
  salonName,
  salonAddress,
  logoUrl,
  primaryColor = '#d5a85c',
  backHref,
  registerHref,
  phone,
  onPhoneChange,
  onSubmit,
  loading = false,
  error,
  success,
}: ClientLoginProps) {
  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-8 sm:px-8"
      style={
        {
          '--brand': primaryColor,
          '--lp-bg': '#0b0d0e',
          '--lp-card': '#15181a',
          '--lp-border': 'rgba(255,255,255,0.1)',
          '--lp-muted': '#a1a1aa',
          background: 'var(--lp-bg)',
          color: '#f5f5f4',
          fontFamily: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
        } as React.CSSProperties
      }
    >
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;1,400;1,600&display=swap"
      />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,color-mix(in_srgb,var(--brand)_13%,transparent),transparent_48%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:46px_46px] [mask-image:linear-gradient(to_bottom,black,transparent_75%)]" />

      <div className="relative w-full max-w-md animate-[lp-fade-up_700ms_ease-out_both]">
        <Link
          to={backHref}
          className="mb-10 inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] transition-colors hover:text-[var(--brand)]"
          style={{ color: 'var(--lp-muted)' }}
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para vitrine
        </Link>

        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden border border-[var(--brand)]/60 bg-[var(--brand)]/10 text-[var(--brand)]">
            {logoUrl ? (
              <img src={logoUrl} alt={`Logo ${brandName}`} className="h-full w-full object-cover" />
            ) : (
              <Scissors className="h-6 w-6 -rotate-45" strokeWidth={1.5} />
            )}
          </div>
          <div>
            <p className="mb-1 text-[10px] font-semibold tracking-[0.3em] text-[var(--brand)]">AGENDA ONLINE</p>
            <p className="text-xl tracking-wide" style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
              {brandName}
            </p>
          </div>
        </div>

        <div
          className="border p-6 shadow-2xl shadow-black/20 backdrop-blur-sm sm:p-8"
          style={{ borderColor: 'var(--lp-border)', background: 'color-mix(in srgb, var(--lp-card) 70%, transparent)' }}
        >
          <div className="mb-8">
            <p className="mb-3 text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--lp-muted)' }}>
              Área do cliente
            </p>
            <h1
              className="text-4xl leading-tight tracking-[-0.03em] sm:text-5xl"
              style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
            >
              Que bom ter você <span className="text-[var(--brand)] italic">de volta.</span>
            </h1>
            <p className="mt-4 text-sm leading-6" style={{ color: 'var(--lp-muted)' }}>
              Entre para consultar seus agendamentos e reservar seu próximo momento.
            </p>
          </div>

          {error && (
            <div className="mb-5 border border-red-500/30 bg-red-950/20 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-5 border border-emerald-500/30 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-300">
              {success}
            </div>
          )}

          <form className="space-y-5" onSubmit={onSubmit}>
            <div>
              <label
                htmlFor="login-phone"
                className="mb-2 block text-xs font-medium uppercase tracking-[0.14em]"
                style={{ color: 'var(--lp-muted)' }}
              >
                Telefone ou WhatsApp
              </label>
              <input
                id="login-phone"
                name="phone"
                type="tel"
                inputMode="tel"
                required
                maxLength={15}
                value={phone}
                onChange={(e) => onPhoneChange(e.target.value)}
                placeholder="(11) 99999-9999"
                autoComplete="tel"
                className="h-12 w-full border bg-[#0b0d0e]/60 px-4 text-sm outline-none transition-colors placeholder:opacity-50 focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
                style={{ borderColor: 'var(--lp-border)', color: '#f5f5f4' }}
              />
              <p className="mt-2 text-[11px]" style={{ color: 'var(--lp-muted)' }}>
                Use o mesmo número que cadastrou na barbearia.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group flex h-12 w-full items-center justify-center gap-2 bg-[var(--brand)] text-sm font-semibold text-[#111] transition-all hover:-translate-y-0.5 hover:brightness-110 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  Entrar
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm" style={{ color: 'var(--lp-muted)' }}>
            Ainda não tem cadastro?{' '}
            <Link to={registerHref} className="font-medium text-[var(--brand)] underline-offset-4 hover:underline">
              Criar conta
            </Link>
          </p>
        </div>

        {(salonName || salonAddress) && (
          <div
            className="mt-6 flex items-center justify-center gap-2 text-center text-[11px]"
            style={{ color: 'var(--lp-muted)' }}
          >
            <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--brand)]" />
            <span>
              {salonName}
              {salonAddress ? ` · ${salonAddress}` : ''}
            </span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes lp-fade-up {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  );
}
