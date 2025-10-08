import { useState } from 'react'
import { useUploadCsv } from '../lib/api'

export default function UploadForm() {
  const [file, setFile] = useState<File | null>(null)
  const uploadMutation = useUploadCsv()

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return
    uploadMutation.mutate(file)
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">CSV File</label>
        <input
          type="file"
          accept=".csv"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="mt-2 block w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm"
        />
        <p className="mt-2 text-xs text-slate-500">
          Columns supported: date, ticker, close OR date, &lt;TICKER1&gt;, &lt;TICKER2&gt;, ...
        </p>
      </div>
      <button
        type="submit"
        className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        disabled={!file || uploadMutation.isLoading}
      >
        {uploadMutation.isLoading ? 'Uploading…' : 'Upload'}
      </button>
      {uploadMutation.data && (
        <div className="rounded border border-slate-200 bg-white p-4 text-sm">
          <h3 className="font-semibold">Ingestion Summary</h3>
          <ul className="mt-2 space-y-1">
            {uploadMutation.data.map((item) => (
              <li key={item.ticker} className="flex justify-between">
                <span>{item.ticker}</span>
                <span>{item.rows} rows</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </form>
  )
}
