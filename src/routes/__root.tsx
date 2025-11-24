import { Toaster } from '@/components/ui/sonner'
import { createRootRoute, Outlet } from '@tanstack/react-router'
import { PageLoader } from '@/components/page-loader'

const RootLayout = () => (
    <>
        <PageLoader />
        <Outlet />
        <Toaster richColors />
    </>
)

export const Route = createRootRoute({ component: RootLayout, notFoundComponent: () => (
    <div className='p-6'>
        <h2 className='text-lg font-semibold'>Página não encontrada</h2>
        <p className='text-sm text-muted-foreground'>Verifique o endereço ou volte para o dashboard.</p>
        <a href='/dashboard' className='text-primary underline'>Ir para o Dashboard</a>
    </div>
) })