import { createContext, ReactNode, useCallback, useContext, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, X } from 'lucide-react'

interface Toast {
  id: number
  type: 'success' | 'error'
  message: string
}

interface ToastApi {
  success: (message: string) => void
  error: (message: string) => void
}

const ToastContext = createContext<ToastApi>({ success: () => undefined, error: () => undefined })

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (type: Toast['type'], message: string) => {
      const id = nextId.current++
      setToasts((prev) => [...prev.slice(-3), { id, type, message }])
      setTimeout(() => dismiss(id), 4000)
    },
    [dismiss],
  )

  const api = useRef<ToastApi>({
    success: (message) => push('success', message),
    error: (message) => push('error', message),
  })
  api.current = { success: (m) => push('success', m), error: (m) => push('error', m) }

  return (
    <ToastContext.Provider value={api.current}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-80 flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg backdrop-blur animate-slide-in ${
              toast.type === 'success'
                ? 'border-emerald-200 bg-emerald-50/95 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/90 dark:text-emerald-200'
                : 'border-rose-200 bg-rose-50/95 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/90 dark:text-rose-200'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
            ) : (
              <AlertCircle size={17} className="mt-0.5 shrink-0" />
            )}
            <span className="flex-1 break-words">{toast.message}</span>
            <button type="button" aria-label="Dismiss" onClick={() => dismiss(toast.id)} className="shrink-0 opacity-50 transition hover:opacity-100">
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
