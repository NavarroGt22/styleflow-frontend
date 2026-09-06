'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Copy, Download, Printer, QrCode } from 'lucide-react'
import { AdminButton } from './ui/AdminUi'

type Props = {
  url: string
  salonName?: string
  lightMode?: boolean
}

export default function QueuePermanentQrCard({ url, salonName, lightMode = false }: Props) {
  const [dataUrl, setDataUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!url) {
      setDataUrl('')
      return
    }
    let cancelled = false
    QRCode.toDataURL(url, {
      width: 512,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#0b0d0e', light: '#ffffff' },
    })
      .then((png) => {
        if (!cancelled) {
          setDataUrl(png)
          setError('')
        }
      })
      .catch(() => {
        if (!cancelled) setError('Não foi possível gerar o QR Code.')
      })
    return () => {
      cancelled = true
    }
  }, [url])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Não foi possível copiar o link.')
    }
  }

  function handleDownload() {
    if (!dataUrl) return
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `qr-fila-${(salonName || 'salao').toLowerCase().replace(/\s+/g, '-')}.png`
    a.click()
  }

  function handlePrint() {
    if (!dataUrl) return
    const title = salonName ? `Fila — ${salonName}` : 'Fila do salão'
    const win = window.open('', '_blank', 'noopener,noreferrer,width=480,height=720')
    if (!win) {
      setError('Permita pop-ups para imprimir o QR.')
      return
    }
    win.document.write(`<!doctype html><html><head><title>${title}</title>
      <style>
        body{font-family:system-ui,sans-serif;text-align:center;padding:32px;color:#111}
        h1{font-size:20px;margin:0 0 8px}
        p{font-size:12px;color:#555;margin:0 0 20px;word-break:break-all}
        img{width:280px;height:280px}
        .note{margin-top:24px;font-size:11px;color:#777;max-width:320px;margin-left:auto;margin-right:auto;line-height:1.4}
      </style></head><body>
      <h1>${title}</h1>
      <p>${url}</p>
      <img src="${dataUrl}" alt="QR Code da fila" />
      <p class="note">QR permanente: continue válido ao fechar e reabrir a fila em outro dia. Escaneie para abrir a página do salão.</p>
      <script>window.onload=function(){window.print()}</script>
      </body></html>`)
    win.document.close()
  }

  if (!url) return null

  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm ${
        lightMode ? 'border-gray-100 bg-white' : 'border-slate-700 bg-slate-800'
      }`}
    >
      <div className="mb-4 flex items-start gap-3">
        <div
          className={`grid size-10 place-items-center rounded-xl ${
            lightMode ? 'bg-indigo-50 text-indigo-600' : 'bg-indigo-950/40 text-indigo-300'
          }`}
        >
          <QrCode className="size-5" />
        </div>
        <div>
          <h3 className={`text-sm font-bold ${lightMode ? 'text-gray-900' : 'text-white'}`}>
            QR Code permanente da fila
          </h3>
          <p className={`mt-1 text-xs leading-relaxed ${lightMode ? 'text-gray-500' : 'text-slate-400'}`}>
            Imprima uma vez. Fechar a fila ou abrir só agendamento <strong>não invalida</strong> o QR — no outro dia,
            ao abrir a fila de novo, o mesmo código continua válido.
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div
          className={`rounded-xl border bg-white p-3 ${
            lightMode ? 'border-gray-100' : 'border-slate-600'
          }`}
        >
          {dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={dataUrl} alt="QR Code permanente da fila" className="size-44 sm:size-52" />
          ) : (
            <div className="grid size-44 place-items-center text-xs text-slate-400 sm:size-52">Gerando…</div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Link fixo</span>
            <p className={`mt-1 break-all text-xs font-medium ${lightMode ? 'text-slate-700' : 'text-slate-200'}`}>
              {url}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <AdminButton type="button" onClick={handleCopy} className="h-10 text-xs">
              <Copy className="size-3.5" /> {copied ? 'Copiado!' : 'Copiar link'}
            </AdminButton>
            <AdminButton type="button" onClick={handleDownload} disabled={!dataUrl} className="h-10 text-xs">
              <Download className="size-3.5" /> Baixar PNG
            </AdminButton>
            <AdminButton type="button" onClick={handlePrint} disabled={!dataUrl} className="h-10 text-xs">
              <Printer className="size-3.5" /> Imprimir
            </AdminButton>
          </div>
          {error ? <p className="text-xs text-red-500">{error}</p> : null}
        </div>
      </div>
    </div>
  )
}
