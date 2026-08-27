import { ArrowUpRight, CalendarDays, Camera, Check, MapPin, MessageCircle, Scissors } from 'lucide-react';
import { Link } from 'react-router-dom';

export type ClientLandingProps = {
  brandName?: string;
  salonName?: string;
  salonAddress?: string;
  logoUrl?: string | null;
  heroImageUrl?: string | null;
  historyText?: string | null;
  lpSinceYear?: string | null;
  whatsappUrl?: string;
  instagramUrl?: string;
  primaryColor?: string;
  loginPath: string;
  onBookClick?: () => void;
};

const DEFAULT_HISTORY =
  'Corte preciso, barba alinhada e a experiência que você merece. Escolha seu horário e deixe o resto com a gente.';

export default function ClientLanding({
  brandName = 'LELECO',
  salonName = 'Leleco Barbers',
  salonAddress,
  logoUrl,
  heroImageUrl,
  historyText,
  lpSinceYear = '2014',
  whatsappUrl,
  instagramUrl,
  primaryColor = '#d5a85c',
  loginPath,
  onBookClick,
}: ClientLandingProps) {
  const story = historyText?.trim() || DEFAULT_HISTORY;
  const sinceLabel = lpSinceYear?.trim() ? `Desde ${lpSinceYear.trim()}` : null;
  const heroBg = heroImageUrl
    ? `linear-gradient(140deg,rgba(0,0,0,0.1),rgba(0,0,0,0.72)),url(${JSON.stringify(heroImageUrl)})`
    : `linear-gradient(140deg,rgba(0,0,0,0.15),rgba(0,0,0,0.85)),linear-gradient(160deg,${primaryColor}33,transparent 55%),#141618`;

  return (
    <main
      className="client-lp relative min-h-screen overflow-hidden text-[#f5f5f4]"
      style={
        {
          '--brand': primaryColor,
          '--lp-bg': '#0b0d0e',
          '--lp-card': '#15181a',
          '--lp-border': 'rgba(255,255,255,0.1)',
          '--lp-muted': '#a1a1aa',
          background: 'var(--lp-bg)',
          fontFamily: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
        } as React.CSSProperties
      }
    >
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;1,400;1,600&display=swap"
      />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_75%_20%,color-mix(in_srgb,var(--brand)_13%,transparent),transparent_38%),linear-gradient(115deg,transparent_0%,rgba(255,255,255,0.025)_47%,transparent_48%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:46px_46px] [mask-image:linear-gradient(to_bottom,black,transparent_75%)]" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-5 sm:px-8">
        <div
          className="flex items-center justify-between border-b py-5 text-[11px] font-medium uppercase tracking-[0.18em]"
          style={{ borderColor: 'var(--lp-border)', color: 'var(--lp-muted)' }}
        >
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand)] shadow-[0_0_12px_var(--brand)]" />
            Acesso de Visitante
          </span>
          <Link
            to={loginPath}
            className="group flex items-center gap-1.5 text-[#f5f5f4] transition-colors hover:text-[var(--brand)]"
          >
            Entrar / Cadastrar
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>

        <section className="grid flex-1 items-center gap-12 py-14 lg:grid-cols-[1fr_0.9fr] lg:gap-20 lg:py-20">
          <div className="animate-[lp-fade-up_700ms_ease-out_both]">
            <div className="mb-8 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden border border-[var(--brand)]/60 bg-[var(--brand)]/10 text-[var(--brand)]">
                {logoUrl ? (
                  <img src={logoUrl} alt={`Logo ${brandName}`} className="h-full w-full object-cover" />
                ) : (
                  <Scissors className="h-6 w-6 -rotate-45" strokeWidth={1.5} />
                )}
              </div>
              <div>
                <div className="mb-1 text-[10px] font-semibold tracking-[0.3em] text-[var(--brand)]">AGENDA ONLINE</div>
                <div
                  className="text-xl tracking-wide text-[#f5f5f4]"
                  style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
                >
                  {brandName}
                </div>
              </div>
            </div>

            {salonAddress && (
              <p className="mb-5 flex items-center gap-2 text-xs uppercase tracking-[0.14em]" style={{ color: 'var(--lp-muted)' }}>
                <MapPin className="h-3.5 w-3.5 text-[var(--brand)]" />
                {salonAddress}
              </p>
            )}

            <h1
              className="max-w-2xl text-5xl leading-[0.98] tracking-[-0.035em] text-balance sm:text-7xl lg:text-[6.8rem]"
              style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
            >
              Seu estilo.
              <br />
              <span className="italic text-[var(--brand)]">Seu momento.</span>
            </h1>

            <p className="mt-7 max-w-md text-base leading-7" style={{ color: 'var(--lp-muted)' }}>
              {story}
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
              {onBookClick ? (
                <button
                  type="button"
                  onClick={onBookClick}
                  className="group inline-flex items-center justify-center gap-3 border-none bg-[var(--brand)] px-6 py-4 text-sm font-semibold text-[#111] transition-all hover:-translate-y-1 hover:brightness-110 cursor-pointer"
                >
                  Fazer meu Agendamento
                  <CalendarDays className="h-4 w-4 transition-transform group-hover:rotate-[-8deg]" />
                </button>
              ) : (
                <Link
                  to={loginPath}
                  className="group inline-flex items-center justify-center gap-3 bg-[var(--brand)] px-6 py-4 text-sm font-semibold text-[#111] transition-all hover:-translate-y-1 hover:brightness-110"
                >
                  Fazer meu Agendamento
                  <CalendarDays className="h-4 w-4 transition-transform group-hover:rotate-[-8deg]" />
                </Link>
              )}

              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-2 py-4 text-sm font-medium text-[#f5f5f4] transition-colors hover:text-[var(--brand)]"
                >
                  <MessageCircle className="h-4 w-4 text-[var(--brand)]" />
                  Reservar pelo WhatsApp
                </a>
              )}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md animate-[lp-fade_900ms_200ms_ease-out_both] lg:max-w-none">
            <div
              className="relative aspect-[4/5] overflow-hidden border bg-[var(--lp-card)]"
              style={{ borderColor: 'var(--lp-border)' }}
            >
              <div
                className="absolute inset-0 bg-cover bg-center grayscale"
                style={{ backgroundImage: heroBg }}
              />
              <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(9,11,12,0.95),transparent_58%)]" />
              {sinceLabel && (
                <div className="absolute left-5 top-5 text-[10px] uppercase tracking-[0.32em] text-white/70">
                  {sinceLabel}
                </div>
              )}
              <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
                <div>
                  <p className="mb-2 text-[10px] uppercase tracking-[0.22em] text-[var(--brand)]">
                    A sua cadeira está pronta
                  </p>
                  <p
                    className="text-3xl italic"
                    style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
                  >
                    {salonName}
                  </p>
                </div>
                <Scissors className="h-8 w-8 text-[var(--brand)]/80" strokeWidth={1} />
              </div>
            </div>
            <div
              className="absolute -bottom-4 -left-4 flex items-center gap-3 border bg-[var(--lp-card)]/95 px-4 py-3 backdrop-blur-sm sm:-left-8"
              style={{ borderColor: 'var(--lp-border)' }}
            >
              <Check className="h-4 w-4 text-[var(--brand)]" />
              <span className="text-xs" style={{ color: 'var(--lp-muted)' }}>
                Atendimento com hora marcada
              </span>
            </div>
          </div>
        </section>

        <footer
          className="flex flex-col gap-4 border-t py-5 text-xs sm:flex-row sm:items-center sm:justify-between"
          style={{ borderColor: 'var(--lp-border)', color: 'var(--lp-muted)' }}
        >
          <span>© {new Date().getFullYear()} {salonName}. Feito para quem cuida do próprio estilo.</span>
          <span className="flex items-center gap-4">
            {instagramUrl ? (
              <a href={instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="transition-colors hover:text-[var(--brand)]">
                <Camera className="h-4 w-4" />
              </a>
            ) : (
              <Camera className="h-4 w-4 opacity-40" />
            )}
            <span className="h-1 w-1 rounded-full bg-white/30" />
            Agende em poucos cliques
          </span>
        </footer>
      </div>

      <style>{`
        @keyframes lp-fade-up {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes lp-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </main>
  );
}
