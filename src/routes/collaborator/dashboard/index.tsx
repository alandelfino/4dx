import { createFileRoute } from '@tanstack/react-router'
import { Topbar } from './-components/topbar'

export const Route = createFileRoute('/collaborator/dashboard/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <main>
      <Topbar title="Dashboard" breadcrumbs={[{ label: 'Dashboard', href: '/', isLast: true }]} />
      <div>
        <h1>Hello World</h1>
      </div>
    </main>
  )
}
