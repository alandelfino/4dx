import { createFileRoute } from '@tanstack/react-router'
import { AlertTriangle } from 'lucide-react'

export const Route = createFileRoute('/company-not-found/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="min-h-svh grid place-items-center p-6">
      <div className="max-w-md w-full text-center grid gap-4">
        <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground" />
        <h1 className="text-2xl font-semibold">Empresa não encontrada</h1>
        <p className="text-muted-foreground">Verifique o endereço ou informe seu subdomínio correto.</p>
      </div>
    </div>
  )
}
