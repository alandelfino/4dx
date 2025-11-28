import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/director')({
  component: RouteComponent,
})

function RouteComponent() {

  return (
    <>
      <Outlet />
    </>
  )
}
