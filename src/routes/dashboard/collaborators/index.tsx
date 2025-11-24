import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Topbar } from '../-components/topbar'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { DataTable } from '@/components/data-table'
import type { ColumnDef } from '@/components/data-table'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from '@/components/ui/sheet'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { FieldGroup } from '@/components/ui/field'
import { collaboratorInputSchema, listCollaborators, createCollaborator, updateCollaborator, deleteCollaborator } from '@/lib/collaborators'
import type { Collaborator } from '@/lib/collaborators'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Edit, RefreshCcw, Trash, UserPlus } from 'lucide-react'

export const Route = createFileRoute('/dashboard/collaborators/')({
  component: RouteComponent,
})

function RouteComponent() {
  const qc = useQueryClient()
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [openCreate, setOpenCreate] = useState(false)
  const [openEdit, setOpenEdit] = useState<null | Collaborator>(null)
  const [openDelete, setOpenDelete] = useState<null | number>(null)

  const { data, isLoading, isRefetching, isError, refetch } = useQuery({
    queryKey: ['collaborators', currentPage, perPage],
    queryFn: () => listCollaborators(currentPage, Math.min(50, perPage)),
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })

  const items: Collaborator[] = useMemo(() => Array.isArray(data?.items) ? data!.items : [], [data])
  const totalItems = typeof data?.itemsTotal === 'number' ? data!.itemsTotal : items.length
  const totalPages = typeof data?.pageTotal === 'number' ? data!.pageTotal : Math.max(1, Math.ceil(totalItems / perPage))

  useEffect(() => {
    if (isError) toast.error('Erro ao carregar colaboradores')
  }, [isError])

  useEffect(() => { setSelectedIds([]) }, [currentPage, perPage, isRefetching])

  useEffect(() => { if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages) }, [totalPages, currentPage])

  const columns: ColumnDef<Collaborator>[] = [
    {
      id: 'select',
      width: '60px',
      header: () => (
        <div className="flex justify-center items-center">
          <Checkbox
            checked={items.length > 0 && selectedIds.length === items.length}
            onCheckedChange={() => setSelectedIds(selectedIds.length === items.length ? [] : items.map(i => i.id))}
          />
        </div>
      ),
      cell: (row) => (
        <div className="flex justify-center items-center">
          <Checkbox
            checked={selectedIds.includes(row.id)}
            onCheckedChange={() => setSelectedIds(selectedIds.includes(row.id) ? selectedIds.filter(id => id !== row.id) : [...selectedIds, row.id])}
          />
        </div>
      ),
      headerClassName: 'w-[60px] border-r',
      className: 'font-medium border-r p-2!'
    },
    { id: 'name', header: 'Nome', cell: (row) => row.name, className: 'border-r p-2!' },
    { id: 'email', header: 'Email', cell: (row) => row.email, className: 'border-r p-2!' },
    { id: 'profile', header: 'Perfil', cell: (row) => row.profile, className: 'border-r p-2!' },
  ]

  const createForm = useForm<z.infer<typeof collaboratorInputSchema>>({ resolver: zodResolver(collaboratorInputSchema), defaultValues: { name: '', email: '', profile: 'collaborator' } })
  const editForm = useForm<z.infer<typeof collaboratorInputSchema>>({ resolver: zodResolver(collaboratorInputSchema) })

  const createMut = useMutation({
    mutationFn: (input: z.infer<typeof collaboratorInputSchema>) => createCollaborator(input),
    onSuccess: () => { toast.success('Colaborador criado'); qc.invalidateQueries({ queryKey: ['collaborators'] }); setOpenCreate(false) },
    onError: () => toast.error('Erro ao criar colaborador'),
  })

  const updateMut = useMutation({
    mutationFn: (payload: { id: number, input: z.infer<typeof collaboratorInputSchema> }) => updateCollaborator(payload.id, payload.input),
    onSuccess: () => { toast.success('Colaborador atualizado'); qc.invalidateQueries({ queryKey: ['collaborators'] }); setOpenEdit(null) },
    onError: () => toast.error('Erro ao atualizar colaborador'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteCollaborator(id),
    onSuccess: () => { toast.success('Colaborador excluído'); qc.invalidateQueries({ queryKey: ['collaborators'] }); setOpenDelete(null) },
    onError: () => toast.error('Erro ao excluir colaborador'),
  })

  return (
    <div className="flex flex-col w-full h-full">
      <Topbar title="Colaboradores" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard', isLast: false }, { label: 'Colaboradores', href: '/dashboard/collaborators', isLast: true }]} />
      <div className="flex flex-col w-full h-full flex-1 overflow-hidden">
        <div className="border-b flex w-full items-center p-2 gap-4">
          <div className="flex items-center gap-2 flex-1">
            <Button variant={'outline'} disabled={isLoading || isRefetching} onClick={() => { setSelectedIds([]); refetch() }}>
              {(isLoading || isRefetching) ? <><RefreshCcw className="animate-spin" /> Atualizando...</> : <><RefreshCcw /> Atualizar</>}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.length === 1 ? (
              <Button variant={'ghost'} onClick={() => { const item = items.find(i => i.id === selectedIds[0]); if (!item) return; setOpenEdit(item); editForm.reset({ name: item.name, email: item.email, profile: item.profile }) }}>
                <Edit /> Editar
              </Button>
            ) : (
              <Button variant={'ghost'} disabled>
                <Edit /> Editar
              </Button>
            )}
            {selectedIds.length === 1 ? (
              <Button variant={'ghost'} onClick={() => setOpenDelete(selectedIds[0])}>
                <Trash /> Excluir
              </Button>
            ) : (
              <Button variant={'ghost'} disabled>
                <Trash /> Excluir
              </Button>
            )}
            <Button onClick={() => setOpenCreate(true)}>
              <UserPlus /> Novo
            </Button>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={items}
          loading={isLoading || isRefetching}
          page={currentPage}
          perPage={perPage}
          totalItems={totalItems}
          emptyMessage={'Nenhum colaborador encontrado'}
          onChange={({ page, perPage }) => { if (typeof page === 'number') setCurrentPage(page); if (typeof perPage === 'number') setPerPage(perPage); refetch() }}
        />
      </div>

      <Sheet open={openCreate} onOpenChange={setOpenCreate}>
        <SheetContent aria-label="Cadastrar colaborador">
          <Form {...(createForm as any)}>
            <form onSubmit={createForm.handleSubmit((values) => createMut.mutate(values))} className="flex flex-col h-full">
              <SheetHeader>
                <SheetTitle>Novo colaborador</SheetTitle>
                <SheetDescription>Preencha os campos abaixo para cadastrar.</SheetDescription>
              </SheetHeader>
              <div className="flex-1 grid auto-rows-min gap-6 px-4 py-4">
                <FieldGroup>
                  <FormField control={createForm.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input {...field} aria-invalid={!!createForm.formState.errors?.name} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={createForm.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} aria-invalid={!!createForm.formState.errors?.email} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={createForm.control} name="profile" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Perfil</FormLabel>
                      <FormControl>
                        <Input {...field} aria-invalid={!!createForm.formState.errors?.profile} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </FieldGroup>
              </div>
              <div className="mt-auto border-t p-4">
                <div className="grid grid-cols-2 gap-4">
                  <SheetClose asChild>
                    <Button variant="outline" className="w-full" onClick={() => setOpenCreate(false)}>Cancelar</Button>
                  </SheetClose>
                  <Button type="submit" disabled={createMut.isPending} className="w-full">Salvar</Button>
                </div>
              </div>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      <Sheet open={!!openEdit} onOpenChange={(v) => setOpenEdit(v ? openEdit : null)}>
        <SheetContent aria-label="Editar colaborador">
          <Form {...(editForm as any)}>
            <form onSubmit={editForm.handleSubmit((values) => openEdit && updateMut.mutate({ id: openEdit.id, input: values }))} className="flex flex-col h-full">
              <SheetHeader>
                <SheetTitle>Editar colaborador</SheetTitle>
                <SheetDescription>Atualize os dados do colaborador.</SheetDescription>
              </SheetHeader>
              <div className="flex-1 grid auto-rows-min gap-6 px-4 py-4">
                <FieldGroup>
                  <FormField control={editForm.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input {...field} aria-invalid={!!editForm.formState.errors?.name} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={editForm.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} aria-invalid={!!editForm.formState.errors?.email} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={editForm.control} name="profile" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Perfil</FormLabel>
                      <FormControl>
                        <Input {...field} aria-invalid={!!editForm.formState.errors?.profile} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </FieldGroup>
              </div>
              <div className="mt-auto border-t p-4">
                <div className="grid grid-cols-2 gap-4">
                  <SheetClose asChild>
                    <Button variant="outline" className="w-full" onClick={() => setOpenEdit(null)}>Cancelar</Button>
                  </SheetClose>
                  <Button type="submit" disabled={updateMut.isPending} className="w-full">Salvar</Button>
                </div>
              </div>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      <Sheet open={!!openDelete} onOpenChange={(v) => setOpenDelete(v ? openDelete : null)}>
        <SheetContent aria-label="Excluir colaborador">
          <div className="flex flex-col h-full">
            <SheetHeader>
              <SheetTitle>Excluir colaborador</SheetTitle>
              <SheetDescription>Esta ação não pode ser desfeita.</SheetDescription>
            </SheetHeader>
            <div className="mt-auto border-t p-4">
              <div className="grid grid-cols-2 gap-4">
                <SheetClose asChild>
                  <Button variant="outline" className="w-full" onClick={() => setOpenDelete(null)}>Cancelar</Button>
                </SheetClose>
                <Button variant={'destructive'} disabled={deleteMut.isPending} className="w-full" onClick={() => openDelete && deleteMut.mutate(openDelete)}>Excluir</Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}