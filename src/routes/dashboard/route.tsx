import { SidebarProvider } from '@/components/ui/sidebar'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { DashboardSidebar } from './-components/dashboard-sidebar'
import { useEffect, useState } from 'react'
import { auth } from '@/lib/auth'

export const Route = createFileRoute('/dashboard')({
  component: RouteComponent,
  beforeLoad: async () => {
    if (!auth.isAuthenticated()) {
      throw redirect({ to: '/sign-in' })
    }
    const session = await auth.fetchSession()
    if (!session) {
      throw redirect({ to: '/sign-in' })
    }
  },
})

function RouteComponent() {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true)

  // Guarda de layout cuida somente de autenticação.

  useEffect(() => {
    try {
      const mql = window.matchMedia('(max-width: 1279px)')
      setSidebarOpen(!mql.matches)
    } catch { }
  }, [])

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <DashboardSidebar />
      <main className='flex flex-col w-full h-lvh overflow-x-hidden'>
        <Outlet />
      </main>

    </SidebarProvider>
  )
}