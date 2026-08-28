'use client'

import { useRef } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { labelClass } from './ui/AdminUi'

type Props = {
  label: string
  value: string
  onChange: (value: string) => void
  hint?: string
  maxMb?: number
  accept?: string
  allowedLabel?: string
  previewClassName?: string
  lightMode?: boolean
}

export default function ImageFileUpload({
  label,
  value,
  onChange,
  hint,
  maxMb = 2,
  accept = 'image/png,image/jpeg,image/jpg,image/webp,image/svg+xml',
  allowedLabel = 'PNG, JPG, SVG ou WebP',
  previewClassName = 'object-cover',
  lightMode = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File | undefined) {
    if (!file) return
    const isIco = file.name.toLowerCase().endsWith('.ico')
    const isImage = file.type.startsWith('image/') || isIco
    if (!isImage) {
      alert(`Selecione um arquivo válido (${allowedLabel}).`)
      return
    }
    if (file.size > maxMb * 1024 * 1024) {
      alert(`O arquivo deve ter no máximo ${maxMb}MB.`)
      return
    }
    const reader = new FileReader()
    reader.onload = () => onChange(String(reader.result ?? ''))
    reader.readAsDataURL(file)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      <label className={labelClass(lightMode)}>{label}</label>
      <div className="flex flex-col items-start gap-4 sm:flex-row">
        <div
          className={`flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border ${
            lightMode ? 'border-slate-200 bg-slate-50' : 'border-slate-600 bg-slate-900'
          }`}
        >
          {value ? (
            <img src={value} alt="Preview" className={`size-full ${previewClassName}`} />
          ) : (
            <ImagePlus className={lightMode ? 'text-slate-300' : 'text-slate-600'} />
          )}
        </div>
        <div className="w-full flex-1 space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-500"
            >
              Escolher arquivo
            </button>
            {value ? (
              <button
                type="button"
                onClick={() => onChange('')}
                className={`flex items-center gap-1 rounded-xl border px-3 py-2 text-sm font-medium ${
                  lightMode
                    ? 'border-slate-300 text-slate-600 hover:bg-slate-50'
                    : 'border-slate-600 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <X className="size-3.5" /> Remover
              </button>
            ) : null}
          </div>
          <p className={`text-xs ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>
            {allowedLabel} — até {maxMb}MB
          </p>
          {hint ? <p className={`text-xs ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>{hint}</p> : null}
        </div>
      </div>
    </div>
  )
}
