import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty'
 
import { FileQuestion } from 'lucide-react'
import { Topbar } from './topbar'

export default function NotFound404() {
    return (
        <div className="flex flex-col w-full h-full">
            <Topbar title="Página não encontrada" breadcrumbs={[{ label: 'Dashboard', href: '/director/dashboard', isLast: false }, { label: '404', href: '/director/dashboard', isLast: true }]} />
            <div className="flex-1 p-4 grid place-items-center">
                <div className="flex w-full max-w-xl items-center justify-center">
                    <Empty className="rounded-lg">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <FileQuestion className="text-muted-foreground" />
                            </EmptyMedia>
                            <EmptyTitle>Página não encontrada</EmptyTitle>
                            <EmptyDescription>
                                O conteúdo que você procura não existe ou foi removido.
                            </EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                            <a href="#" className="text-muted-foreground text-xs underline underline-offset-4">Saiba mais</a>
                        </EmptyContent>
                    </Empty>
                </div>
            </div>
        </div>
    )
}