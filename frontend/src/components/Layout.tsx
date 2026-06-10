import { Link, useLocation } from 'react-router-dom'
import { ReactNode } from 'react'
import { Compass, Database, FolderOpen, GitCompare, LayoutDashboard, LineChart, Moon, Sun } from 'lucide-react'
import { useTheme } from '../lib/theme'

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/explore', label: 'Explore', icon: Compass },
  { to: '/compare', label: 'Compare', icon: GitCompare },
  { to: '/data', label: 'Data', icon: Database },
  { to: '/portfolios', label: 'Portfolios', icon: FolderOpen },
]

function ThemeToggle({ expanded }: { expanded?: boolean }) {
  const { theme, toggle } = useTheme()
  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={toggle}
      className={`flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-500 transition hover:border-brand-400 hover:text-brand-600 dark:border-slate-800 dark:text-slate-400 dark:hover:border-brand-500 dark:hover:text-brand-400 ${
        expanded ? 'w-full justify-start' : 'justify-center'
      }`}
    >
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      {expanded && <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>}
    </button>
  )
}

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 via-violet-500 to-cyan-400 text-white shadow-md shadow-brand-500/25">
        <LineChart size={20} />
      </span>
      <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
        Stock<span className="bg-gradient-to-r from-brand-600 to-cyan-500 bg-clip-text text-transparent dark:from-brand-400 dark:to-cyan-300">Sense</span>
      </span>
    </Link>
  )
}

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Ambient backdrop glow */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-80 bg-gradient-to-b from-brand-100/50 via-transparent to-transparent dark:from-brand-900/15" />

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-slate-200/80 bg-white/70 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/70 lg:flex">
        <div className="px-5 py-5">
          <Logo />
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2">
          {links.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to
            return (
              <Link
                key={to}
                to={to}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? 'bg-brand-50 text-brand-700 shadow-sm shadow-brand-500/10 dark:bg-brand-900/30 dark:text-brand-300'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Icon size={17} className={active ? '' : 'opacity-70 transition group-hover:opacity-100'} />
                {label}
                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-500" />}
              </Link>
            )
          })}
        </nav>
        <div className="space-y-3 px-3 pb-5">
          <ThemeToggle expanded />
          <p className="px-2 text-[11px] leading-relaxed text-slate-400 dark:text-slate-600">
            Research tooling — not investment advice.
          </p>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/80 lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Logo />
          <ThemeToggle />
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2.5">
          {links.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to
            return (
              <Link
                key={to}
                to={to}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                  active
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900'
                }`}
              >
                <Icon size={14} />
                {label}
              </Link>
            )
          })}
        </nav>
      </header>

      <div className="relative z-10 lg:pl-60">
        <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  )
}
