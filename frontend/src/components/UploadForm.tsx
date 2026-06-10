import { useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Loader2, UploadCloud } from 'lucide-react'
import { Link } from 'react-router-dom'
import { extractErrorMessage, useUploadCsv } from '../lib/api'
import { useToast } from '../lib/toast'

const SAMPLE_CSV = `date,AAPL,MSFT,GOOG
2024-01-02,185.64,370.87,138.17
2024-01-03,184.25,370.60,138.92
2024-01-04,181.91,367.94,136.39
2024-01-05,181.18,367.75,135.73
2024-01-08,185.56,374.69,138.84
`

export default function UploadForm() {
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const uploadMutation = useUploadCsv()
  const toast = useToast()

  const acceptFile = (candidate: File | undefined) => {
    if (!candidate) return
    uploadMutation.reset()
    setFile(candidate)
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return
    uploadMutation.mutate(file, {
      onSuccess: (summary) => {
        const rows = summary.reduce((acc, item) => acc + item.rows, 0)
        toast.success(`Ingested ${rows.toLocaleString()} rows across ${summary.length} tickers`)
      },
      onError: (err) => toast.error(extractErrorMessage(err)),
    })
  }

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sample_prices.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          acceptFile(e.dataTransfer.files?.[0])
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition ${
          dragging
            ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30'
            : 'border-slate-300 bg-white hover:border-brand-400 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-brand-500'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(event) => acceptFile(event.target.files?.[0] ?? undefined)}
        />
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-900/40 dark:text-brand-300">
          {file ? <FileSpreadsheet size={24} /> : <UploadCloud size={24} />}
        </span>
        <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
          {file ? file.name : 'Drop a CSV here, or click to browse'}
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Long format (date, ticker, close) or wide format (date, AAPL, MSFT, …)
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-primary" disabled={!file || uploadMutation.isLoading}>
          {uploadMutation.isLoading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
          {uploadMutation.isLoading ? 'Uploading…' : 'Upload Prices'}
        </button>
        <button type="button" className="btn-ghost" onClick={downloadSample}>
          <Download size={15} />
          Sample CSV
        </button>
      </div>

      {uploadMutation.isError && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
          <AlertCircle size={18} className="shrink-0" />
          {extractErrorMessage(uploadMutation.error)}
        </div>
      )}

      {uploadMutation.data && (
        <div className="card animate-fade-up">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-500" />
            <h3 className="font-semibold text-slate-900 dark:text-white">Ingestion complete</h3>
          </div>
          <ul className="mt-3 divide-y divide-slate-100 text-sm dark:divide-slate-800">
            {uploadMutation.data.map((item) => (
              <li key={item.ticker} className="flex justify-between py-2">
                <span className="font-medium text-slate-700 dark:text-slate-200">{item.ticker}</span>
                <span className="text-slate-500 dark:text-slate-400">{item.rows} new rows</span>
              </li>
            ))}
          </ul>
          <Link to="/" className="mt-4 inline-block text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400">
            Go optimize a portfolio →
          </Link>
        </div>
      )}
    </form>
  )
}
