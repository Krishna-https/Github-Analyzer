import { Outlet, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { TopBar } from './TopBar'
import { Sidebar } from './Sidebar'

export default function AppLayout() {
  const [open, setOpen] = useState(false)
  const loc = useLocation()
  const showShell = loc.pathname !== '/'

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-ink">
      {showShell && <TopBar />}
      <div className="flex min-h-0 flex-1">
        {showShell && (
          <>
            <div className="hidden w-56 shrink-0 lg:block">
              <Sidebar className="h-full" />
            </div>
            {/* Mobile overlay */}
            <div
              className={`fixed inset-0 z-40 bg-black/50 transition-opacity lg:hidden ${open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
              onClick={() => setOpen(false)}
            />
            <div
              className={`fixed inset-y-0 left-0 z-50 w-60 bg-shell transition-transform lg:hidden ${open ? 'translate-x-0' : '-translate-x-full'}`}
            >
              <div className="flex h-14 items-center justify-end px-4">
                <button onClick={() => setOpen(false)} className="text-white/50 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <Sidebar className="h-[calc(100vh-3.5rem)]" />
            </div>
            <button
              onClick={() => setOpen(true)}
              className="fixed bottom-5 left-5 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-edge bg-card text-white/60 shadow-lg transition-colors hover:bg-edge hover:text-white lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
          </>
        )}
        <main className="min-w-0 flex-1 overflow-auto">
          <div className="mx-auto max-w-[1440px] p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}