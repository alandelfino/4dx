import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty'
import { Button } from '@/components/ui/button'
import { Link } from '@tanstack/react-router'
import { ShieldAlert } from 'lucide-react'

export default function Forbidden403() {
    return (
        <div className="w-full h-screen p-4 grid place-items-center">
            <div className="flex w-full max-w-xl h-full items-center justify-center">
                <Empty className="rounded-lg">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <ShieldAlert className="text-muted-foreground" />
                        </EmptyMedia>
                        <EmptyTitle>Acesso negado</EmptyTitle>
                        <EmptyDescription>
                            Você não tem permissão para acessar esta página.
                        </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                        <div className="flex items-center gap-2">
                            <Button asChild>
                                <Link to="/director/dashboard">Ir para Dashboard</Link>
                            </Button>
                            <Button variant="outline" asChild>
                                <Link to="/sign-in">Trocar usuário</Link>
                            </Button>
                        </div>
                        <a href="#" className="text-muted-foreground text-xs underline underline-offset-4">Saiba mais</a>
                    </EmptyContent>
                </Empty>
            </div>
        </div>
    )
}