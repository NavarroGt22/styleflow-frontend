'use client'

import { useMemo, useState } from 'react'
import { CalendarDays, Check, Clock3, Scissors } from 'lucide-react'

type Service = { id: string; name: string; category: string; duration: number; price: number }

const services: Service[] = [
  { id: 'cut-beard', name: 'Corte + barba', category: 'Barba', duration: 40, price: 35 },
  { id: 'cut', name: 'Corte comum', category: 'Cabelo', duration: 30, price: 25 },
  { id: 'beard', name: 'Barba', category: 'Barba', duration: 20, price: 15 },
  { id: 'cut-color', name: 'Corte + barba', category: 'Cabelo', duration: 40, price: 35 },
]

const professionals = ['Rafael Silva', 'Lucas Mendes', 'André Costa']
const times = ['09:00', '09:30', '10:00', '10:30', '11:00', '14:00', '14:30', '15:00', '16:00', '17:30']
const unavailable = ['10:30', '14:30', '16:00']

type Props = { salonSlug?: string }

export default function BookingPage({ salonSlug = 'leleco' }: Props) {
  const [serviceId, setServiceId] = useState('')
  const [professional, setProfessional] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const service = useMemo(() => services.find((item) => item.id === serviceId), [serviceId])
  const complete = Boolean(service && professional && date && time)

  return (
    <main className="min-h-screen bg-[#0b1224] px-4 py-6 text-slate-100 sm:px-8 lg:px-0">
      <div className="mx-auto max-w-[820px]">
        <header className="mb-6 flex items-center justify-between rounded-xl border border-slate-700 bg-[#1d2a3e] px-4 py-3 text-[10px] font-bold">
          <span className="flex items-center gap-2 text-slate-300"><span className="h-2 w-2 rounded-full bg-emerald-400" />Cliente: Rafael</span>
          <button className="text-rose-300 transition-colors hover:text-rose-200">SAIR</button>
        </header>

        <section className="mb-5 border-b border-slate-700 pb-5 text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500"><Scissors className="h-5 w-5 -rotate-45" /></div>
          <p className="mx-auto mb-1 w-fit rounded bg-gradient-to-r from-indigo-500 to-pink-500 px-2 py-0.5 text-[8px] font-bold tracking-wide">LELECO · AGENDA ONLINE</p>
          <h1 className="font-bold text-white">Leleco Barbers</h1>
          <p className="mt-1 text-[9px] text-slate-400">/{salonSlug} · Escolha seu serviço, profissional e reserve seu horário em poucos cliques.</p>
        </section>

        <div className="grid items-start gap-3.5 lg:grid-cols-[1fr_160px]">
          <div className="space-y-3.5">
            <section className="rounded-xl border border-slate-700 bg-[#1d2a3e] p-3.5">
              <Step number="1" title="SELECIONE O SERVIÇO" />
              <div className="grid grid-cols-2 gap-2">
                {services.map((item) => (
                  <button key={item.id} onClick={() => setServiceId(item.id)} className={`relative rounded-lg border p-2 text-left transition-colors ${serviceId === item.id ? 'border-indigo-400 bg-indigo-950/40 ring-1 ring-indigo-400' : 'border-slate-600 bg-[#1d2a3e] hover:border-slate-400'}`}>
                    {serviceId === item.id && <Check className="absolute right-2 top-2 h-3 w-3 text-indigo-300" />}
                    <p className="text-[10px] font-bold text-white">{item.name}</p><p className="mt-0.5 text-[8px] text-slate-400">{item.category}</p>
                    <div className="mt-3 flex justify-between text-[8px]"><span className="flex items-center gap-1 text-slate-400"><Clock3 className="h-2.5 w-2.5" />{item.duration} min</span><span className="font-bold text-emerald-400">R$ {item.price},00</span></div>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-slate-700 bg-[#1d2a3e] p-3.5">
              <Step number="2" title="SELECIONE O PROFISSIONAL" />
              <select value={professional} onChange={(event) => setProfessional(event.target.value)} className="h-9 w-full rounded-md border border-slate-600 bg-[#142035] px-2.5 text-[10px] font-semibold text-white outline-none focus:border-indigo-400">
                <option value="">Selecione um profissional...</option>{professionals.map((name) => <option key={name}>{name}</option>)}
              </select>
            </section>

            <section className="rounded-xl border border-slate-700 bg-[#1d2a3e] p-3.5">
              <Step number="3" title="DATA E HORÁRIO" />
              <label className="mb-3 block text-[8px] font-bold uppercase tracking-wide text-slate-400">Escolha a data</label>
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="h-9 rounded-md border border-slate-600 bg-[#142035] px-2.5 text-[10px] font-semibold text-white outline-none focus:border-indigo-400" />
              {date && <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">{times.map((slot) => { const disabled = unavailable.includes(slot); return <button key={slot} disabled={disabled} onClick={() => setTime(slot)} className={`rounded-md border px-2 py-2 text-[9px] font-bold transition-colors ${disabled ? 'cursor-not-allowed border-slate-700 text-slate-600 line-through' : time === slot ? 'border-indigo-400 bg-indigo-500 text-white' : 'border-slate-600 text-slate-300 hover:border-indigo-400'}`}>{slot}</button> })}</div>}
              {!date && <p className="mt-2 text-[8px] font-bold text-emerald-400">Selecione o profissional primeiro para liberar os horários.</p>}
            </section>
          </div>

          <aside className="rounded-xl border border-slate-700 bg-[#1d2a3e] p-3.5 lg:sticky lg:top-5">
            <h2 className="mb-4 text-[10px] font-bold text-white">RESUMO DA RESERVA</h2>
            <SummaryRow label="SERVIÇO" value={service?.name ?? 'Não selecionado'} /><SummaryRow label="DURAÇÃO" value={service ? `${service.duration} min` : '—'} /><SummaryRow label="PROFISSIONAL" value={professional || 'Não selecionado'} /><SummaryRow label="DATA" value={date ? date.split('-').reverse().join('/') : 'Não selecionada'} /><SummaryRow label="HORÁRIO" value={time || 'Não selecionado'} />
            <div className="my-3 border-t border-slate-600 pt-3"><div className="flex items-center justify-between text-[10px] font-bold"><span>TOTAL</span><span className="text-lg text-emerald-400">R$ {service?.price.toFixed(2).replace('.', ',') ?? '0,00'}</span></div></div>
            <button disabled={!complete} className="w-full rounded-md bg-emerald-500 px-2 py-2.5 text-[9px] font-bold text-[#10251f] transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40">Confirmar Agendamento</button>
          </aside>
        </div>
        <footer className="py-8 text-center text-[8px] text-slate-500">Painel STYLEFLOW · Todos os direitos reservados.</footer>
      </div>
    </main>
  )
}

function Step({ number, title }: { number: string; title: string }) { return <h2 className="mb-3 flex items-center gap-2 text-[9px] font-bold tracking-[0.14em] text-slate-400"><span className="text-emerald-400">{number}</span>{title}</h2> }
function SummaryRow({ label, value }: { label: string; value: string }) { return <div className="mb-3 flex items-start justify-between gap-2 text-[8px]"><span className="font-bold text-slate-400">{label}</span><span className="text-right font-bold text-slate-200">{value}</span></div> }
// Conecte os handlers do botão de confirmação à API ou ao fluxo de navegação do projeto.
