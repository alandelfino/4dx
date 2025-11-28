import { auth, privateInstance } from '@/lib/auth'
import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { ExternalLink, Loader, Loader2, Plus } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

export const Route = createFileRoute('/director/dashboard/goal/')({
    component: RouteComponent,
})

function RouteComponent() {
    const query = useQuery<{ [k: string]: unknown } | null>({
        queryKey: ['open-goal'],
        queryFn: async () => {
            const res = await privateInstance.get('/api:director/open-goal')
            return res.data ?? null
        },
    })

    const firstName = auth.getCurrentUser()?.name.split(' ')[0]

    if (query.isLoading) {
        return (
            <div className='flex flex-col items-center justify-center h-screen'>
                <div className="bg-neutral-50 rounded-lg w-16 h-16 flex items-center justify-center">
                    <div className='border rounded-full border-neutral-300 animate-ping w-4 h-4'></div>
                </div>
            </div>
        )
    }

    const goal = query.data

    if (!goal) {
        return (
            <div className='flex flex-col items-center justify-center h-screen'>
                <h1 className='text-2xl font-bold'>Olá, {firstName}!</h1>
                <p className="text-muted-foreground text-sm text-balance max-w-xl text-center my-4">
                    Estabelecer uma meta clara e desafiadora é o primeiro passo para guiar sua equipe em direção ao sucesso. Defina agora e inspire todos a alcançarem resultados extraordinários.
                </p>
                <div className='flex gap-4 items-center mt-3'>
                    <Button variant='outline'>Histórico de metas</Button>
                    <Button><Plus /> Definir Meta</Button>
                </div>
                <Button variant='link' className='mt-4 font-normal'>Saber mais <ExternalLink/> </Button>
            </div>
        )
    }

    const entries = Object.entries(goal)

    return (
        <div className='flex flex-col items-center justify-center h-screen'>
            <h1 className='text-2xl font-bold'>Meta atual</h1>
            <div className='mt-6 w-full max-w-xl border rounded-lg p-4'>
                {entries.map(([key, value]) => (
                    <div key={key} className='flex items-center justify-between py-2 border-b last:border-b-0'>
                        <span className='font-medium'>{key}</span>
                        <span className='text-sm text-neutral-700 dark:text-neutral-300'>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                    </div>
                ))}
            </div>
            <div className='flex gap-4 items-center mt-6'>
                <Button variant='outline'>Histórico de metas</Button>
                <Button><Plus /> Atualizar Meta</Button>
            </div>
            <Button variant='link' className='mt-4 font-normal'>Saber mais <ExternalLink/> </Button>
        </div>
    )
}
