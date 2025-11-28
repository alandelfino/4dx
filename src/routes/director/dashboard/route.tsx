import { SidebarProvider } from '@/components/ui/sidebar'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { DashboardSidebar } from './-components/dashboard-sidebar'
import { useEffect, useState } from 'react'
import { auth } from '@/lib/auth'
import Forbidden403 from './-components/403'
import NotFound404 from './-components/404'

export const Route = createFileRoute('/director/dashboard')({
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
  notFoundComponent: () => <NotFound404 />,
})

function RouteComponent() {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true)

  const isDirector = auth.getCurrentSector()?.profile === 'director'
  if (!isDirector) {
    return (
      <Forbidden403 />
    )
  }

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