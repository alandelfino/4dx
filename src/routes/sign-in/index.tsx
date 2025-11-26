import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { LoginForm } from "./-components/login-form"
import { useEffect, useState } from 'react'
import axios from 'axios'
import { Loader2 } from 'lucide-react'

export const Route = createFileRoute('/sign-in/')({
    component: RouteComponent,
})

export default function RouteComponent() {
    const navigate = useNavigate()
    const [logoUrl, setLogoUrl] = useState<string | null>(null)
    const [companyName, setCompanyName] = useState<string | null>(null)
    const [isLoadingCompany, setIsLoadingCompany] = useState<boolean>(true)

    useEffect(() => {
        const host = window.location.hostname
        const sub = host.split('.')[0] || host
        setIsLoadingCompany(true)
        axios.get('https://x8ki-letl-twmt.n7.xano.io/api:DUnPTQkM/company', { params: { alias: sub } })
            .then((res) => {
                const data = res?.data
                if (!data || !data.alias) return
                try { localStorage.setItem(`${sub}-directa-company`, JSON.stringify(data)) } catch { void 0 }
                const url: string | undefined = data?.logo?.url
                if (url && typeof url === 'string') setLogoUrl(url)
                setCompanyName(data?.name ?? null)
                setIsLoadingCompany(false)
            })
            .catch(() => { setIsLoadingCompany(false); navigate({ to: '/company-not-found' }) })
    }, [navigate])

    return (
        <div className="grid min-h-svh lg:grid-cols-2 relative">
            <div className="flex flex-col gap-4 p-6 md:p-10">
                <div className="flex justify-center md:justify-start">
                    <a href="#" className="text-primary hover:text-primary/90">
                        {isLoadingCompany ? (
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        ) : (
                            <img src={logoUrl ?? "/placeholder.svg"} alt={companyName ?? "Empresa"} className="h-12 w-auto rounded-md" />
                        )}
                    </a>
                </div>
                <div className="flex flex-1 items-center justify-center">
                    <div className="w-full max-w-xs">
                        <LoginForm />
                    </div>
                </div>
            </div>
            <div className="bg-muted relative hidden lg:block">
                <img
                    src="/sign-in-background.png"
                    alt="Image"
                    className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
                />
            </div>
            {isLoadingCompany && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-background">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Carregando empresa...
                    </div>
                </div>
            )}
        </div>
    )
}
