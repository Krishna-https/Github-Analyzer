import { NavLink, useLocation } from 'react-router-dom'
import {
  Home,
  Search,
  Layers,
  LayoutList,
  Code,
  Shield,
  Package,
  AlertTriangle,
  Book,
  Folder,
  BarChart3,
} from 'lucide-react'

const items = [
  { label: 'Home', icon: Home, to: '/' },
  { label: 'Analyze', icon: Search, to: '/analyze' },
  { divider: true, label: 'Analysis' },
  { label: 'Overview', icon: Layers, to: '/overview' },
  { label: 'Architecture', icon: BarChart3, to: '/architecture' },
  { label: 'Modules', icon: LayoutList, to: '/modules' },
  { label: 'Code Analysis', icon: Code, to: '/code' },
  { label: 'Security', icon: Shield, to: '/security' },
  { label: 'Dependencies', icon: Package, to: '/dependencies' },
  { label: 'Issues', icon: AlertTriangle, to: '/issues' },
  { divider: true, label: 'Explore' },
  { label: 'Rule Engine', icon: Book, to: '/rules' },
  { label: 'Code Explorer', icon: Folder, to: '/explorer' },
]

export function Sidebar({ className = '' }: { className?: string }) {
  const loc = useLocation()

  return (
    <aside className={`flex flex-col gap-0.5 border-r border-edge bg-shell ${className}`}>
      {items.map((item, i) => {
        if ('divider' in item && item.divider) {
          return (
            <div key={i} className="px-4 pt-5 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-white/30">
              {item.label}
            </div>
          )
        }
        const Icon = (item as { icon: typeof Home }).icon
        const to = (item as { to: string }).to
        const label = (item as { label: string }).label
        const active = loc.pathname === to || (to !== '/' && loc.pathname.startsWith(to))
        return (
          <NavLink
            key={to}
            to={to}
            className={[
              'mx-2 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-primary/10 text-primary'
                : 'text-white/50 hover:bg-edge hover:text-white/80',
            ].join(' ')}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{label}</span>
          </NavLink>
        )
      })}
    </aside>
  )
}