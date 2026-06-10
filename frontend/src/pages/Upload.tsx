import UploadForm from '../components/UploadForm'

export default function Upload() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Upload Price Data</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Import daily close prices as CSV. Re-uploading the same dates is safe — rows are upserted, never duplicated.
        </p>
      </div>
      <UploadForm />
    </div>
  )
}
