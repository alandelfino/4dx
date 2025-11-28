import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/collaborator/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/collaborator/"!</div>
}
