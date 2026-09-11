'use client'

import { useState } from 'react'
import { BriefcaseBusiness, Megaphone, Webhook } from 'lucide-react'
import type { AdminTabProps } from '@/lib/admin/types'
import AdminMarketingTab from './AdminMarketingTab'

type CrmSubTab = 'marketing' | 'webhook'

export default function AdminCrmTab(props: AdminTabProps & { salonSlug?: string }) {
  const [crmSubTab, setCrmSubTab] = useState<CrmSubTab>('marketing')
  const lightMode = props.lightMode

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex items-start gap-3">
        <div
          className={`grid size-10 place-items-center rounded-xl ${
            lightMode ? 'bg-indigo-50 text-indigo-700' : 'bg-indigo-950/40 text-indigo-300'
          }`}
        >
          <BriefcaseBusiness className="size-5" />
        </div>
        <div>
          <h3 className={`text-base font-bold sm:text-lg ${lightMode ? 'text-slate-900' : 'text-white'}`}>
            CRM
          </h3>
          <p className={`mt-1 text-xs sm:text-sm ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>
            Marketing para disparos e templates; Webhook para Evolution, n8n e lembretes da agenda.
          </p>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(
          [
            { id: 'marketing' as const, label: 'Marketing', icon: Megaphone },
            { id: 'webhook' as const, label: 'Webhook', icon: Webhook },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon
          const active = crmSubTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCrmSubTab(tab.id)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                active
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : lightMode
                    ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Icon className="size-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      <AdminMarketingTab {...props} crmPanel={crmSubTab} hideOuterHeader />
    </div>
  )
}
