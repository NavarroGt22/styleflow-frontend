import { Link } from 'react-router-dom';
import { Check, CheckCircle, Clock, MapPin, Scissors } from 'lucide-react';
import type { ReactNode } from 'react';

type ClientBookingProps = {
  unitPicker?: ReactNode;
  brandName: string;
  salonName: string;
  salonAddress?: string;
  logoUrl?: string | null;
  primaryColor?: string;
  clientName: string;
  onLogout: () => void;
  backHref: string;
  services: any[];
  professionals: any[];
  loadingBookingData: boolean;
  selectedService: any;
  onSelectService: (service: any) => void;
  selectedProfessional: any;
  onSelectProfessional: (professional: any) => void;
  lastProfessionalId: string | null;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  selectedTime: string;
  onSelectTime: (time: string) => void;
  todayStr: string;
  timeSlots: any[];
  loadingSlots: boolean;
  displayService: { name: string; price: number; duration: number } | null;
  bookingError: string | null;
  bookingLoading: boolean;
  bookingSuccess: any;
  onBookingSuccessDismiss: () => void;
  onConfirm: (e: React.FormEvent) => void;
};

export default function ClientBooking({
  unitPicker,
  brandName,
  salonName,
  salonAddress,
  logoUrl,
  primaryColor = '#d5a85c',
  clientName,
  onLogout,
  backHref,
  services,
  professionals,
  loadingBookingData,
  selectedService,
  onSelectService,
  selectedProfessional,
  onSelectProfessional,
  lastProfessionalId,
  selectedDate,
  onSelectDate,
  selectedTime,
  onSelectTime,
  todayStr,
  timeSlots,
  loadingSlots,
  displayService,
  bookingError,
  bookingLoading,
  bookingSuccess,
  onBookingSuccessDismiss,
  onConfirm,
}: ClientBookingProps) {
  const brand = primaryColor || '#d5a85c';

  return (
    <div
      className="client-booking min-h-screen bg-[#0b0d0e] px-4 py-8 text-[#f5f5f4] sm:px-6"
      style={{ '--brand': brand } as React.CSSProperties}
    >
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;1,400;1,600&display=swap"
      />

      <div className="mx-auto max-w-5xl">
        {unitPicker}

        <header className="mb-6 flex items-center justify-between rounded-2xl border border-white/10 bg-[#15181a] px-5 py-3.5">
          <span className="flex items-center gap-2 text-xs font-bold text-[#a1a1aa]">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Cliente: {clientName}
          </span>
          <button
            type="button"
            onClick={onLogout}
            className="border-none bg-transparent text-xs font-black uppercase tracking-wider text-red-400 transition-colors hover:text-red-300 cursor-pointer"
          >
            Sair
          </button>
        </header>

        <section className="mb-8 border-b border-white/10 pb-8 text-center">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={brandName}
              className="mx-auto mb-4 h-16 w-16 rounded-2xl object-cover shadow-lg"
            />
          ) : (
            <div
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--brand)]/40 bg-[var(--brand)]/10 text-[var(--brand)]"
              style={{ boxShadow: `0 0 32px color-mix(in srgb, ${brand} 22%, transparent)` }}
            >
              <Scissors className="h-7 w-7 -rotate-45" strokeWidth={1.5} />
            </div>
          )}
          <p className="mx-auto mb-2 w-fit rounded-md bg-[var(--brand)] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-[#111]">
            {brandName} · Agenda online
          </p>
          <h1
            className="text-3xl font-extrabold text-white"
            style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
          >
            {salonName}
          </h1>
          {salonAddress && (
            <p className="mx-auto mt-2 inline-flex items-center justify-center gap-1.5 text-sm text-[#a1a1aa]">
              <MapPin size={14} className="shrink-0 text-[var(--brand)]" />
              {salonAddress}
            </p>
          )}
          <p className="mx-auto mt-2 max-w-md text-sm text-[#a1a1aa]">
            Escolha seu serviço, profissional e reserve seu horário em poucos cliques.
          </p>
        </section>

        {bookingSuccess ? (
          <div className="mx-auto max-w-md rounded-2xl border border-emerald-500/20 bg-[#15181a] p-8 text-center shadow-xl">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
              <CheckCircle size={32} />
            </div>
            <h2 className="mb-2 text-2xl font-black text-white">Reserva Confirmada!</h2>
            <p className="mb-6 text-sm leading-relaxed text-[#a1a1aa]">
              Seu horário foi agendado com sucesso.
            </p>
            <div className="mb-6 space-y-3 rounded-xl border border-white/10 bg-[#0b0d0e] p-5 text-left text-xs font-bold">
              <Row label="Serviço" value={bookingSuccess.service.name} />
              <Row label="Profissional" value={bookingSuccess.professional.user.name} />
              <Row
                label="Data"
                value={new Date(`${bookingSuccess.date}T00:00:00`).toLocaleDateString('pt-BR')}
              />
              <Row label="Horário" value={bookingSuccess.time} highlight />
              <Row label="Valor" value={`R$ ${bookingSuccess.service.price.toFixed(2)}`} success />
            </div>
            <button
              type="button"
              onClick={onBookingSuccessDismiss}
              className="w-full cursor-pointer rounded-xl border-none bg-[var(--brand)] py-3.5 text-sm font-extrabold text-[#111] transition-all hover:brightness-110"
            >
              Novo Agendamento
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Card step="1" title="Selecione o Serviço">
                {loadingBookingData ? (
                  <Loader brand={brand} />
                ) : services.length === 0 ? (
                  <p className="text-sm italic text-[#a1a1aa]">Nenhum serviço disponível no catálogo no momento.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {services.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => onSelectService(s)}
                        className={`relative rounded-xl border p-4 text-left transition-colors ${
                          selectedService?.id === s.id
                            ? 'border-[var(--brand)] bg-[var(--brand)]/10 ring-2 ring-[var(--brand)]/25'
                            : 'border-white/10 bg-transparent hover:border-[var(--brand)]/40'
                        }`}
                      >
                        {selectedService?.id === s.id && (
                          <Check className="absolute right-3 top-3 h-4 w-4 text-[var(--brand)]" />
                        )}
                        <p className="text-sm font-bold text-white">{s.name}</p>
                        {s.description && (
                          <p className="mt-1 line-clamp-2 text-xs text-[#a1a1aa]">{s.description}</p>
                        )}
                        <div className="mt-3 flex justify-between border-t border-white/10 pt-3 text-xs font-bold">
                          <span className="flex items-center gap-1 text-[#a1a1aa]">
                            <Clock className="h-3.5 w-3.5 text-[var(--brand)]" />
                            {s.duration} min
                          </span>
                          <span className="text-emerald-400">R$ {s.price.toFixed(2).replace('.', ',')}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </Card>

              <Card step="2" title="Selecione o Profissional">
                {loadingBookingData ? (
                  <Loader brand={brand} />
                ) : professionals.length === 0 ? (
                  <p className="text-sm italic text-[#a1a1aa]">Nenhum profissional disponível no momento.</p>
                ) : (
                  <div className="space-y-3">
                    <select
                      value={selectedProfessional?.id ?? ''}
                      onChange={(e) => {
                        const pro = professionals.find((p) => p.id === e.target.value) ?? null;
                        onSelectProfessional(pro);
                      }}
                      className="h-11 w-full rounded-xl border border-white/10 bg-[#0b0d0e] px-4 text-sm font-semibold text-white outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
                    >
                      <option value="" disabled>
                        Selecione um profissional...
                      </option>
                      {professionals.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.user.name}
                          {lastProfessionalId === p.id ? ' ★ (seu barbeiro habitual)' : ''}
                          {` — ${p.workStart} às ${p.workEnd}`}
                        </option>
                      ))}
                    </select>
                    {selectedProfessional && lastProfessionalId === selectedProfessional.id && (
                      <p className="flex items-center gap-1.5 text-xs font-bold text-[var(--brand)]">
                        <span>★</span> Seu último barbeiro — já selecionado para você
                      </p>
                    )}
                  </div>
                )}
              </Card>

              <Card step="3" title="Data e Horário">
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#a1a1aa]">
                  Escolha a data
                </label>
                <input
                  type="date"
                  min={todayStr}
                  value={selectedDate}
                  onChange={(e) => onSelectDate(e.target.value)}
                  disabled={!selectedProfessional}
                  className="h-11 w-full rounded-xl border border-white/10 bg-[#0b0d0e] px-4 text-sm font-bold text-white outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] disabled:opacity-50"
                />
                {!selectedProfessional && (
                  <p className="mt-2 text-xs font-bold text-[var(--brand)]">
                    Selecione o profissional primeiro para ativar o calendário.
                  </p>
                )}
                {selectedProfessional && selectedDate && (
                  <div className="mt-4">
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#a1a1aa]">
                      Horários disponíveis
                    </label>
                    {loadingSlots ? (
                      <Loader brand={brand} small />
                    ) : timeSlots.length === 0 ? (
                      <p className="text-sm italic text-[#a1a1aa]">Fora do horário de expediente deste profissional.</p>
                    ) : (
                      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                        {timeSlots.map((slot: any) => (
                          <button
                            key={slot.time}
                            type="button"
                            disabled={!slot.available}
                            onClick={() => onSelectTime(slot.time)}
                            className={`rounded-xl border py-2.5 text-xs font-extrabold transition-all ${
                              !slot.available
                                ? 'cursor-not-allowed border-white/5 text-[#52525b] line-through'
                                : selectedTime === slot.time
                                  ? 'border-[var(--brand)] bg-[var(--brand)] text-[#111] shadow-md'
                                  : 'border-white/10 text-[#d4d4d8] hover:border-[var(--brand)]/50'
                            }`}
                          >
                            {slot.time}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </div>

            <aside className="lg:col-span-1">
              <div className="sticky top-6 rounded-2xl border border-white/10 bg-[#15181a] p-6 shadow-xl">
                <h3 className="mb-4 border-b border-white/10 pb-3 text-sm font-black uppercase tracking-wider text-white">
                  Resumo da Reserva
                </h3>
                {bookingError && (
                  <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs font-bold leading-relaxed text-red-300">
                    {bookingError}
                  </div>
                )}
                <SummaryRow label="Serviço" value={displayService?.name ?? 'Não selecionado'} />
                <SummaryRow label="Duração" value={displayService ? `${displayService.duration} min` : '—'} />
                <SummaryRow
                  label="Profissional"
                  value={selectedProfessional ? selectedProfessional.user.name : 'Não selecionado'}
                />
                <SummaryRow
                  label="Data"
                  value={
                    selectedDate
                      ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString('pt-BR')
                      : 'Não selecionada'
                  }
                />
                <SummaryRow label="Horário" value={selectedTime || 'Não selecionado'} />
                <div className="my-4 border-t border-white/10 pt-4">
                  <div className="flex items-center justify-between text-sm font-bold">
                    <span className="text-[#a1a1aa]">Total</span>
                    <span className="text-2xl text-emerald-400">
                      R$ {displayService ? displayService.price.toFixed(2).replace('.', ',') : '0,00'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={bookingLoading || !selectedService || !selectedProfessional || !selectedDate || !selectedTime}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-none bg-emerald-500 py-3.5 text-sm font-extrabold text-[#10251f] transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {bookingLoading ? (
                    <>
                      <span
                        className="h-5 w-5 animate-spin rounded-full border-2 border-[#10251f] border-t-transparent"
                      />
                      Confirmando...
                    </>
                  ) : (
                    'Confirmar Agendamento'
                  )}
                </button>
                <Link
                  to={backHref}
                  className="mt-4 block text-center text-xs text-[#a1a1aa] transition-colors hover:text-[var(--brand)]"
                >
                  ← Voltar para a vitrine
                </Link>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ step, title, children }: { step: string; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#15181a] p-6">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-[#a1a1aa]">
        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[var(--brand)]/15 text-xs font-bold text-[var(--brand)]">
          {step}
        </span>
        {title}
      </h3>
      {children}
    </section>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3 text-xs">
      <span className="font-bold uppercase tracking-wider text-[#71717a]">{label}</span>
      <span className="text-right font-bold text-[#e4e4e7]">{value}</span>
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
  success,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  success?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="uppercase tracking-wider text-[#71717a]">{label}</span>
      <span
        className={
          success ? 'text-emerald-400' : highlight ? 'text-[var(--brand)]' : 'text-[#e4e4e7]'
        }
      >
        {value}
      </span>
    </div>
  );
}

function Loader({ brand, small }: { brand: string; small?: boolean }) {
  return (
    <div className={`flex justify-center ${small ? 'py-4' : 'py-8'}`}>
      <div
        className={`${small ? 'h-6 w-6 border-2' : 'h-8 w-8 border-[3px]'} animate-spin rounded-full border-t-transparent`}
        style={{ borderColor: `${brand} transparent transparent transparent` }}
      />
    </div>
  );
}
