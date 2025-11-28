import { Toaster } from '@/components/ui/sonner'
import { createRootRoute, Outlet } from '@tanstack/react-router'
import { PageLoader } from '@/components/page-loader'
import { auth } from '@/lib/auth'

const RootLayout = () => (
    <div className='w-full h-full'>
        <PageLoader />
        <Outlet />
        <Toaster richColors />
    </div>
)


export const Route = createRootRoute({
    component: RootLayout, notFoundComponent: () => (
        <div className='p-6'>
            <h2 className='text-lg font-semibold'>Página não encontrada</h2>
            <p className='text-sm text-muted-foreground'>Verifique o endereço ou volte para o dashboard.</p>
            <a href={auth?.getCurrentSector()?.profile === 'director' ? '/admin/dashboard' : '/collaborator/dashboard'} className='text-primary underline'>Ir para o Dashboard</a>
        </div>
    )
})