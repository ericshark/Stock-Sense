import { Link, useLocation } from 'react-router-dom'
import { ReactNode } from 'react'
import { LineChart, Moon, Sun } from 'lucide-react'
import { useTheme } from '../lib/theme'

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/upload', label: 'Upload Data' },
  { to: '/portfolios', label: 'Portfolios' },
]

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation()
  const { theme, toggle } = useTheme()

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-cyan-400 text-white shadow-sm">
              <LineChart size={20} />
            </span>
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              Stock<span className="text-brand-600 dark:text-brand-400">Sense</span>
            </span>
          </Link>
          <nav className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100/60 p-1 dark:border-slate-800 dark:bg-slate-900/60">
            {links.map((link) => {
              const active = location.pathname === link.to
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                    active
                      ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-800 dark:text-brand-300'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>
          <button
            type="button"
            aria-label="Toggle theme"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-brand-400 hover:text-brand-600 dark:border-slate-800 dark:text-slate-400 dark:hover:border-brand-500 dark:hover:text-brand-400"
            onClick={toggle}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">{children}</main>
      <footer className="border-t border-slate-200/80 py-4 text-center text-xs text-slate-400 dark:border-slate-800 dark:text-slate-600">
        StockSense — portfolio analytics for research purposes. Not investment advice.
      </footer>
    </div>
  )
}
