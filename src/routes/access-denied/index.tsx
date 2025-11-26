import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Topbar } from '@/routes/dashboard/-components/topbar'

export const Route = createFileRoute('/access-denied/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="flex flex-col w-full h-full">
      <Topbar title="Acesso negado" breadcrumbs={[{ label: "Início", href: "/", isLast: false }, { label: "Acesso negado", href: "/access-denied", isLast: true }]} showSidebarTrigger={false} />
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="max-w-md text-center grid gap-4">
          <h1 className="text-2xl font-semibold">Você não tem permissão para acessar esta página.</h1>
          <p className="text-muted-foreground">Se você acredita que isso é um erro, contate o administrador.</p>
          <div className="flex items-center justify-center gap-4 mt-2">
            <Button asChild>
              <a href="/dashboard">Ir para o dashboard</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/sign-in">Fazer login</a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
