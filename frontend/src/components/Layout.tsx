import { Link, useLocation } from 'react-router-dom'
import { ReactNode, useState } from 'react'

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/upload', label: 'Upload' },
  { to: '/portfolios', label: 'Portfolios' },
]

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation()
  const [dark, setDark] = useState(false)

  return (
    <div className={dark ? 'dark min-h-screen bg-slate-950' : 'min-h-screen bg-slate-100'}>
      <header className="bg-white dark:bg-slate-900 shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-xl font-semibold text-slate-900 dark:text-slate-100">StockSense</span>
          <nav className="flex gap-4">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm font-medium ${
                  location.pathname === link.to
                    ? 'text-blue-600'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <button
            className="rounded border border-slate-300 px-3 py-1 text-xs text-slate-600 dark:text-slate-200"
            onClick={() => setDark((prev) => !prev)}
          >
            Toggle Theme
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  )
}
