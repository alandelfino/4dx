import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Link, useRouterState } from "@tanstack/react-router";
import { auth } from '@/lib/auth'
import { Users, GitBranch, Target, Tag, Layers } from "lucide-react";

export function Navigation() {

    const router = useRouterState()
    const isDirector = auth.getCurrentSector()?.profile === 'director'
    const goalsHref = isDirector ? '/dashboard/goals' : '/dashboard/goals-collaborator'

    const navigations = [
        {
            groupName: 'Objetivos',
            items: [
                {
                    label: 'Metas',
                    icon: <Target />,
                    href: goalsHref,
                },
            ]
        },
        {
            groupName: 'Configurações',
            items: [
                {
                    label: 'Colaboradores',
                    icon: <Users />,
                    href: '/dashboard/collaborators',
                },
                {
                    label: 'Setores',
                    icon: <GitBranch />,
                    href: '/dashboard/sectors',
                },
                {
                    label: 'Segmentos',
                    icon: <Layers />,
                    href: '/dashboard/segments',
                },
            ]
        },
        {
            groupName: 'Catálogo',
            items: [
                {
                    label: 'Marcas',
                    icon: <Tag />,
                    href: '/dashboard/brands',
                },
            ]
        },
    ]

    const filteredNavigations = navigations.map((group) => ({
        ...group,
        items: group.items.filter((item) => (
            (item.href !== '/dashboard/collaborators' || isDirector) &&
            (item.href !== '/dashboard/sectors' || isDirector) &&
            (item.href !== '/dashboard/segments' || isDirector) &&
            true
        ))
    }))

    return (

        filteredNavigations.map((group) => (
            <SidebarGroup key={group.groupName}>
                <SidebarGroupLabel className="text-neutral-400 font-normal">{group.groupName}</SidebarGroupLabel>
                <SidebarMenu>
                    {group.items.map((item) => (
                        <SidebarMenuItem key={item.href}>
                            <SidebarMenuButton asChild isActive={item.href === router.location.pathname} tooltip={item.label}>
                                <Link to={item.href} className="w-full h-full text-neutral-600 dark:text-neutral-400">
                                    {item.icon} {item.label}
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarGroup>
        ))

    )

}