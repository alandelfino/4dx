import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Topbar } from '../-components/topbar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Field, FieldGroup } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
 
import { toast } from 'sonner'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Pencil, Trash2, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { getCompanyTimeZone } from '@/lib/format'
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ChevronDown, LayoutList } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog'
import { collaboratorInputSchema, type Collaborator, type CollaboratorsResponse, type CollaboratorInput, listCollaborators, createCollaborator, updateCollaborator, deleteCollaborator } from '@/lib/collaborators'

export const Route = createFileRoute('/director/dashboard/collaborators/')({
  component: RouteComponent,
})

function RouteComponent() {
  const [page, setPage] = useState<number>(1)
  const [perPage, setPerPage] = useState<number>(20)
  const [open, setOpen] = useState<boolean>(false)
  const [editing, setEditing] = useState<boolean>(false)
  const [current, setCurrent] = useState<Collaborator | null>(null)
  const [deleteOpen, setDeleteOpen] = useState<boolean>(false)
  const qc = useQueryClient()

  const query = useQuery<CollaboratorsResponse>({
    queryKey: ['collaborators', page, perPage],
    queryFn: () => listCollaborators(page, perPage),
  })

  const createMut = useMutation({
    mutationFn: (input: CollaboratorInput) => createCollaborator(input),
    onSuccess: () => {
      toast.success('Colaborador criado')
      setOpen(false)
      setEditing(false)
      setCurrent(null)
      void qc.invalidateQueries({ queryKey: ['collaborators'] })
    },
    onError: () => toast.error('Falha ao criar colaborador'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, input }: { id: number; input: CollaboratorInput }) => updateCollaborator(id, input),
    onSuccess: () => {
      toast.success('Colaborador atualizado')
      setOpen(false)
      setEditing(false)
      setCurrent(null)
      void qc.invalidateQueries({ queryKey: ['collaborators'] })
    },
    onError: () => toast.error('Falha ao atualizar colaborador'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteCollaborator(id),
    onSuccess: () => {
      toast.success('Colaborador excluído')
      setDeleteOpen(false)
      void qc.invalidateQueries({ queryKey: ['collaborators'] })
    },
    onError: () => toast.error('Falha ao excluir colaborador'),
  })

  const form = useForm<z.infer<typeof collaboratorInputSchema>>({
    resolver: zodResolver(collaboratorInputSchema),
    defaultValues: { name: '', email: '', profile: 'collaborator' },
  })

  useEffect(() => {
    if (open && editing && current) {
      form.reset({ name: current.name, email: current.email, profile: current.profile })
    }
    if (open && !editing) {
      form.reset({ name: '', email: '', profile: 'collaborator' })
    }
  }, [open, editing, current, form])

  const items = query.data?.items ?? []
  const totalItems = query.data?.itemsTotal ?? 0
  const totalPages = Math.max(1, Math.ceil(totalItems / Math.max(perPage, 1)))
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const selectedItem = selectedId ? items.find((i) => i.id === selectedId) ?? null : null
  const selectedCount = selectedId ? 1 : 0
  const toggleSelectOne = (id: number) => {
    setSelectedId((prev) => (prev === id ? null : id))
  }
  const [columnsVisible, setColumnsVisible] = useState<{ email: boolean; created_at: boolean }>({ email: true, created_at: true })
  const tz = getCompanyTimeZone()
  const formatDateOnly = (value: number | string) => {
    const d = typeof value === 'number' ? new Date(value) : new Date(value)
    try {
      return new Intl.DateTimeFormat('pt-BR', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
    } catch {
      return d.toLocaleDateString('pt-BR')
    }
  }

  return (
    <main className='flex flex-col w-full h-full'>
      <Topbar title='Colaboradores' breadcrumbs={[{ label: 'Dashboard', href: '/director/dashboard', isLast: false }, { label: 'Colaboradores', href: '/director/dashboard/collaborators', isLast: true }]} />
      <div className='flex-1 p-4 flex flex-col gap-3'>
        <div className='flex items-center justify-between gap-2'>
          <div className='flex items-center gap-2'>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='outline' size='sm'>
                  <LayoutList />
                  <span className='hidden lg:inline'>Personalizar colunas</span>
                  <span className='lg:hidden'>Colunas</span>
                  <ChevronDown />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='w-56'>
                <DropdownMenuCheckboxItem
                  checked={columnsVisible.email}
                  onCheckedChange={(v) => setColumnsVisible((prev) => ({ ...prev, email: !!v }))}
                >
                  email
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={columnsVisible.created_at}
                  onCheckedChange={(v) => setColumnsVisible((prev) => ({ ...prev, created_at: !!v }))}
                >
                  created_at
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              onClick={() => { if (selectedItem) { setEditing(true); setCurrent(selectedItem); setOpen(true) } }}
              disabled={!selectedItem}
            >
              <Pencil className='size-4' /> Editar
            </Button>
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <DialogTrigger asChild>
                <Button variant='outline' disabled={!selectedItem}>
                  <Trash2 className='size-4' /> Excluir
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Excluir colaborador</DialogTitle>
                  <DialogDescription>
                    Confirme a exclusão do colaborador selecionado. Esta ação não pode ser desfeita.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant='outline'>Cancelar</Button>
                  </DialogClose>
                  <Button
                    variant='destructive'
                    onClick={() => { if (selectedId) deleteMut.mutate(selectedId) }}
                    disabled={!selectedId || deleteMut.isPending}
                  >
                    Confirmar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditing(false); setCurrent(null) } }}>
              <SheetTrigger asChild>
                <Button>
                  <Plus className='size-4' /> Cadastrar colaborador
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>{editing ? 'Editar colaborador' : 'Cadastrar colaborador'}</SheetTitle>
                </SheetHeader>
                <div className='p-2'>
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit((values) => {
                        const input: CollaboratorInput = { name: values.name, email: values.email, profile: values.profile }
                        if (editing && current?.id) {
                          updateMut.mutate({ id: current.id, input })
                        } else {
                          createMut.mutate(input)
                        }
                      })}
                      className='flex flex-col gap-4'
                    >
                      <Field>
                        <FieldGroup>
                          <FormField
                            control={form.control}
                            name='name'
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nome</FormLabel>
                                <FormControl>
                                  <Input placeholder='Nome completo' {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name='email'
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>E-mail</FormLabel>
                                <FormControl>
                                  <Input type='email' placeholder='email@exemplo.com' {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </FieldGroup>
                      </Field>
                      <SheetFooter>
                        <Button type='submit' disabled={createMut.isPending || updateMut.isPending}>
                          {editing ? 'Salvar alterações' : 'Cadastrar'}
                        </Button>
                      </SheetFooter>
                    </form>
                  </Form>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
        <div className='flex-1 min-h-0'>
          <div className='flex flex-col w-full h-full min-h-0 overflow-y-auto overflow-x-hidden'>
            <div className='relative h-full'>
              <div className='w-full overflow-x-auto border rounded-lg'>
                <Table className='border-b'>
                  <TableHeader className='sticky top-0 bg-neutral-50 z-10 border-b'>
                    <TableRow className='bg-neutral-50'>
                      <TableHead className='w-[48px] text-center'>
                        {/* seleção única: sem selecionar todos */}
                      </TableHead>
                      <TableHead>Nome</TableHead>
                      {columnsVisible.email && <TableHead>E-mail</TableHead>}
                      
                      {columnsVisible.created_at && <TableHead>Criado em</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {query.isLoading && (
                      Array.from({ length: 6 }).map((_, rIdx) => (
                        <TableRow key={`s-${rIdx}`} className={`${rIdx % 2 === 1 ? `bg-neutral-50` : ``}`}>
                          <TableCell className='text-center'><Skeleton className='h-4 w-4 rounded-[4px] mx-auto' /></TableCell>
                          <TableCell><Skeleton className='h-4 w-40' /></TableCell>
                          {columnsVisible.email && <TableCell><Skeleton className='h-4 w-48' /></TableCell>}
                          
                          {columnsVisible.created_at && <TableCell><Skeleton className='h-4 w-32' /></TableCell>}

                        </TableRow>
                      ))
                    )}
                    {!query.isLoading && items.length > 0 && (
                      items.map((item, index) => (
                        <TableRow key={item.id} className={`${index % 2 === 0 ? `` : `bg-neutral-50/20`}`}>
                          <TableCell className='text-center'>
                            <Checkbox checked={selectedId === item.id} onCheckedChange={() => toggleSelectOne(item.id)} />
                          </TableCell>
                          <TableCell>
                            <div className='flex items-center gap-2'>
                              <span className='font-medium'>{item.name}</span>
                            </div>
                          </TableCell>
                          {columnsVisible.email && (
                            <TableCell>
                              <span className='text-neutral-700 dark:text-neutral-300'>{item.email}</span>
                            </TableCell>
                          )}
                          
                          {columnsVisible.created_at && (
                            <TableCell>
                              {typeof item.created_at === 'number' ? formatDateOnly(item.created_at) : formatDateOnly(item.created_at)}
                            </TableCell>
                          )}

                        </TableRow>
                      ))
                    )}
                    {!query.isLoading && items.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className='text-center'>Nenhum colaborador encontrado</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
            <div className='h-12 w-full p-2 flex items-center'>
              <span className='text-sm'>{selectedCount} de {totalItems} selecionado(s).</span>
              <div className='flex items-center gap-2 flex-1 justify-end'>
                <span className='text-sm xl:hidden'>Por página</span>
                <span className='text-sm hidden xl:inline'>Itens por página</span>
                <Select value={perPage.toString()} onValueChange={(v) => { const n = parseInt(v); if (!Number.isNaN(n)) setPerPage(n) }}>
                  <SelectTrigger className='w-[90px]'>
                    <SelectValue placeholder={perPage.toString()} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value='20'>20</SelectItem>
                      <SelectItem value='30'>30</SelectItem>
                      <SelectItem value='50'>50</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <span className='text-sm'>Página {page} de {totalPages}</span>
                <Button variant='outline' size='icon' onClick={() => setPage(1)} disabled={page === 1}><ChevronsLeft /></Button>
                <Button variant='outline' size='icon' onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}><ChevronLeft /></Button>
                <Button variant='outline' size='icon' onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}><ChevronRight /></Button>
                <Button variant='outline' size='icon' onClick={() => setPage(totalPages)} disabled={page === totalPages}><ChevronsRight /></Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

export default RouteComponent
