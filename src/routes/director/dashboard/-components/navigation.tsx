import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Link, useRouterState } from "@tanstack/react-router";
import { Users, GitBranch, Target, List } from "lucide-react";

export function Navigation() {
    const router = useRouterState()
    const navigations = [
        {
            groupName: 'Geral',
            items: [
                {
                    label: 'Meta',
                    icon: <Target />,
                    href: '/director/dashboard/goals',
                },
                {
                    label: 'Histórico de metas',
                    icon: <List />,
                    href: '/director/dashboard/goals/history',
                },
            ]
        },
        {
            groupName: 'Configurações',
            items: [
                {
                    label: 'Colaboradores',
                    icon: <Users />,
                    href: '/director/dashboard/collaborators',
                },
                {
                    label: 'Setores',
                    icon: <GitBranch />,
                    href: '/director/dashboard/sectors',
                },
                
            ]
        },
    ]

    return (
        navigations.map((group) => (
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