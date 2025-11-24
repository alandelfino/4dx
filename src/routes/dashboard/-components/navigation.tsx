import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Link, useRouterState } from "@tanstack/react-router";
import { Copyright } from "lucide-react";

export function Navigation() {

    const router = useRouterState()

    const navigations = [
        {
            groupName: 'Base',
            items: [
                {
                    label: 'Colaboradores',
                    icon: <Copyright />,
                    href: '/dashboard/collaborators',
                },
            ]
        },
        {
            groupName: 'Catálogo',
            items: [
                {
                    label: 'Marcas',
                    icon: <Copyright />,
                    href: '/dashboard/brands',
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