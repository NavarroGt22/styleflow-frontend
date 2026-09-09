'use client'

import { useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { labelClass } from './ui/AdminUi'

type Props = {
  label: string
  value: string
  onChange: (value: string) => void
  hint?: string
  /** Limite do arquivo original (padrão 2 MB). */
  maxMb?: number
  accept?: string
  allowedLabel?: string
  previewClassName?: string
  lightMode?: boolean
}

function estimateDataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(',')
  if (comma < 0) return dataUrl.length
  const base64 = dataUrl.slice(comma + 1)
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
  return Math.floor((base64.length * 3) / 4) - padding
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
  const [localError, setLocalError] = useState('')
  const maxBytes = Math.max(0.1, maxMb) * 1024 * 1024

  function handleFile(file: File | undefined) {
    if (!file) return
    setLocalError('')

    const isIco = file.name.toLowerCase().endsWith('.ico')
    const isImage = file.type.startsWith('image/') || isIco
    if (!isImage) {
      setLocalError(`Selecione um arquivo válido (${allowedLabel}).`)
      return
    }
    if (file.size > maxBytes) {
      setLocalError(`Arquivo com ${(file.size / (1024 * 1024)).toFixed(1)} MB. Máximo: ${maxMb} MB.`)
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result ?? '')
      const decoded = estimateDataUrlBytes(dataUrl)
      // Base64 cresce ~33%; rejeita se o payload final passar do limite
      if (decoded > maxBytes) {
        setLocalError(`Após converter, a imagem passa de ${maxMb} MB. Comprima ou use outra foto.`)
        if (inputRef.current) inputRef.current.value = ''
        return
      }
      onChange(dataUrl)
    }
    reader.onerror = () => {
      setLocalError('Não foi possível ler o arquivo.')
    }
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
                onClick={() => {
                  setLocalError('')
                  onChange('')
                }}
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
            {allowedLabel} — até <strong>{maxMb} MB</strong>
          </p>
          {hint ? <p className={`text-xs ${lightMode ? 'text-slate-500' : 'text-slate-400'}`}>{hint}</p> : null}
          {localError ? (
            <p className="text-xs font-semibold text-red-400">{localError}</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
