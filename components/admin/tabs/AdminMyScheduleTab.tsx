'use client'

import { FormEvent, useEffect, useState } from 'react'
import { AdminButton, AdminError, AdminLoading } from '../ui/AdminUi'
import WeekdayHoursEditor from '../WeekdayHoursEditor'
import { fetchMyProfessionalProfile, updateMySchedule } from '@/lib/admin/api'
import type { DayHoursMap } from '@/lib/day-hours'
import type { AdminTabProps, MyProfessionalProfile } from '@/lib/admin/types'

export default function AdminMyScheduleTab({ lightMode = false }: AdminTabProps) {
  const [profile, setProfile] = useState<MyProfessionalProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [dayHours, setDayHours] = useState<DayHoursMap>({})
  const [calendarMode, setCalendarMode] = useState<'WEEK' | 'TODAY'>('WEEK')

  function apply(data: MyProfessionalProfile) {
    setProfile(data)
    setDayHours(data.dayHours ?? {})
    setCalendarMode(data.bookingCalendarMode === 'TODAY' ? 'TODAY' : 'WEEK')
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await fetchMyProfessionalProfile()
        if (!cancelled) apply(data)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Não foi possível carregar seu horário.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      apply(await updateMySchedule({ dayHours, bookingCalendarMode: calendarMode }))
      setSuccess('Horário salvo. O app do cliente já usa esses dias quando ele te escolher.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar o horário.')
    } finally {
      setSaving(false)
    }
  }

  const title = lightMode ? 'text-slate-900' : 'text-white'
  const muted = lightMode ? 'text-slate-500' : 'text-slate-400'

  if (loading) return <AdminLoading lightMode={lightMode} />

  return (
    <div className="animate-in slide-in-from-bottom-4 space-y-4 duration-500">
      <div className="mb-5 mt-2 sm:mb-8 sm:mt-4">
        <p className={`text-xs font-semibold uppercase tracking-wide ${muted}`}>Agenda</p>
        <h1 className={`text-2xl font-bold tracking-tight sm:text-3xl ${title}`}>Meu Horário</h1>
        <p className={`mt-1 text-sm ${muted}`}>
          {profile
            ? `${profile.name} · ${profile.salon.name}. Este horário é só seu: não muda o dos outros barbeiros.`
            : 'Este horário é só seu: não muda o dos outros barbeiros.'}
        </p>
      </div>

      {error ? <AdminError message={error} /> : null}
      {success ? (
        <p className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-500">
          {success}
        </p>
      ) : null}

      {profile ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          {!profile.hasCustomHours ? (
            <p className={`text-xs ${muted}`}>
              Começamos com o horário da barbearia. Ajuste os seus dias e salve para valer só para
              você.
            </p>
          ) : null}

          <WeekdayHoursEditor
            lightMode={lightMode}
            dayHours={dayHours}
            onChangeDayHours={setDayHours}
            bookingCalendarMode={calendarMode}
            onChangeBookingCalendarMode={setCalendarMode}
            showClosedDayMessage={false}
            title="Configure o seu horário de atendimento"
            description="Cada dia pode ter início e fim próprios. Dias desligados aparecem como folga sua para o cliente."
          />

          {profile.salon.openTime && profile.salon.closeTime ? (
            <p className={`text-xs ${muted}`}>
              A barbearia funciona das {profile.salon.openTime} às {profile.salon.closeTime}. Horário
              fora dessa faixa não aparece para o cliente.
            </p>
          ) : null}

          <div className="flex justify-end">
            <AdminButton type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar meu horário'}
            </AdminButton>
          </div>
        </form>
      ) : null}
    </div>
  )
}
