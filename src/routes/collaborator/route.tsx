import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { SidebarProvider } from '@/components/ui/sidebar'
import { DashboardSidebar } from './dashboard/-components/dashboard-sidebar'
import { useEffect, useState } from 'react'
import { auth } from '@/lib/auth'

export const Route = createFileRoute('/collaborator')({
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
