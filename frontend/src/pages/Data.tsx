import { useState } from 'react'
import { Database, Trash2 } from 'lucide-react'
import UploadForm from '../components/UploadForm'
import { extractErrorMessage, useAssets, useDeleteAsset } from '../lib/api'
import { useToast } from '../lib/toast'
import { formatDate } from '../lib/format'

function DeleteButton({ ticker }: { ticker: string }) {
  const [arming, setArming] = useState(false)
  const deleteAsset = useDeleteAsset()
  const toast = useToast()

  const onClick = () => {
    if (!arming) {
      setArming(true)
      setTimeout(() => setArming(false), 3000)
      return
    }
    deleteAsset.mutate(ticker, {
      onSuccess: () => toast.success(`Deleted ${ticker} and its price history`),
      onError: (err) => toast.error(extractErrorMessage(err)),
    })
  }

  return (
    <button
      type="button"
      aria-label={`Delete ${ticker}`}
      onClick={onClick}
      disabled={deleteAsset.isLoading}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
        arming
          ? 'bg-rose-600 text-white'
          : 'text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400'
      }`}
    >
      <Trash2 size={14} />
      {arming ? 'Confirm?' : 'Delete'}
    </button>
  )
}

export default function Data() {
  const { data: assets, isLoading } = useAssets()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Data</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Upload daily close prices and manage the datasets behind your analyses. Re-uploads are upserted, never duplicated.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <UploadForm />
        </div>

        <div className="card animate-fade-up self-start overflow-x-auto lg:col-span-3">
          <div className="flex items-center gap-2">
            <Database size={16} className="text-brand-500" />
            <h3 className="card-title !normal-case !tracking-normal">Loaded datasets</h3>
          </div>

          {isLoading && <div className="skeleton mt-4 h-48" />}

          {!isLoading && (!assets || assets.length === 0) && (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              Nothing loaded yet — upload a CSV to get started.
            </p>
          )}

          {assets && assets.length > 0 && (
            <table className="table-base mt-3">
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th className="!text-right">Rows</th>
                  <th>From</th>
                  <th>To</th>
                  <th className="!text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => (
                  <tr key={asset.ticker}>
                    <td className="font-semibold text-slate-800 dark:text-slate-100">{asset.ticker}</td>
                    <td className="text-right">{asset.rows.toLocaleString()}</td>
                    <td className="text-slate-500 dark:text-slate-400">{asset.start_date ? formatDate(asset.start_date) : '—'}</td>
                    <td className="text-slate-500 dark:text-slate-400">{asset.end_date ? formatDate(asset.end_date) : '—'}</td>
                    <td className="text-right">
                      <DeleteButton ticker={asset.ticker} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
