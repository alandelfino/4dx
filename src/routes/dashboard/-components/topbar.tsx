import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { TopbarUser } from "./topbar-user";

// Types
export type BreadcrumbItem = {
    label: string
    href: string
    isLast: boolean
}

export function Topbar({ title, breadcrumbs }: { title: string, breadcrumbs: BreadcrumbItem[] }) {

    return (
        <div className='w-full bg-pattern dark:bg-neutral-950'>

            {/* Top navigation - Fixed */}
            <div className='border-b h-16 w-full flex items-center px-2 bg-white dark:bg-neutral-900 sticky top-0 z-10 gap-4'>

                <SidebarTrigger />

                <h1 className='font-semibold'>{title}</h1>

                <div className='w-px h-6 border-l'></div>

                <Breadcrumb>
                    <BreadcrumbList>
                        {breadcrumbs.map((breadcrumb) => (
                            <div key={breadcrumb.href} className='flex items-center text-sm'>
                                <BreadcrumbItem>
                                    {breadcrumb.isLast ? (
                                        <BreadcrumbPage>{breadcrumb.label}</BreadcrumbPage>
                                    ) : (
                                        <BreadcrumbLink href={breadcrumb.href}>{breadcrumb.label}</BreadcrumbLink>
                                    )}
                                </BreadcrumbItem>
                                {!breadcrumb.isLast && <BreadcrumbSeparator />}
                            </div>
                        ))}
                    </BreadcrumbList>
                </Breadcrumb>

                <div className='ml-auto'>
                    <TopbarUser />
                </div>

            </div>

        </div>
    )

}