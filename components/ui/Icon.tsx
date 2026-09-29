import {
  KeyRound,
  Users,
  FolderKanban,
  ListChecks,
  Bell,
  CreditCard,
  BarChart3,
  Database,
  Globe,
  Laptop,
  Wrench,
  FlaskConical,
  type LucideIcon,
} from 'lucide-react'

const map: Record<string, LucideIcon> = {
  KeyRound,
  Users,
  FolderKanban,
  ListChecks,
  Bell,
  CreditCard,
  BarChart3,
  Database,
  Globe,
  Laptop,
  Wrench,
  FlaskConical,
}

export function ModuleIcon({ name, className = 'w-5 h-5' }: { name: string; className?: string }) {
  const Icon = map[name] ?? Globe
  return <Icon className={className} />
}