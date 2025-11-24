import { createFileRoute } from '@tanstack/react-router'
import { useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
    component: RouteComponent,
})

function RouteComponent() {

    const navigate = useNavigate()
    navigate({ to: '/sign-in' })
}
