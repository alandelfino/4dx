import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
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
import { sectorInputSchema, type Sector, type SectorsResponse, type SectorInput, listSectors, createSector, updateSector, deleteSector } from '@/lib/sectors'

export const Route = createFileRoute('/director/dashboard/sectors/')({
  component: RouteComponent,
})

function RouteComponent() {
  const [page, setPage] = useState<number>(1)
  const [perPage, setPerPage] = useState<number>(20)
  const [open, setOpen] = useState<boolean>(false)
  const [editing, setEditing] = useState<boolean>(false)
  const [current, setCurrent] = useState<Sector | null>(null)
  const [deleteOpen, setDeleteOpen] = useState<boolean>(false)
  const qc = useQueryClient()

  const query = useQuery<SectorsResponse>({
    queryKey: ['sectors', page, perPage],
    queryFn: () => listSectors(page, perPage),
  })

  const createMut = useMutation({
    mutationFn: (input: SectorInput) => createSector(input),
    onSuccess: () => {
      toast.success('Setor criado')
      setOpen(false)
      setEditing(false)
      setCurrent(null)
      void qc.invalidateQueries({ queryKey: ['sectors'] })
    },
    onError: () => toast.error('Falha ao criar setor'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, input }: { id: number; input: SectorInput }) => updateSector(id, input),
    onSuccess: () => {
      toast.success('Setor atualizado')
      setOpen(false)
      setEditing(false)
      setCurrent(null)
      void qc.invalidateQueries({ queryKey: ['sectors'] })
    },
    onError: () => toast.error('Falha ao atualizar setor'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteSector(id),
    onSuccess: () => {
      toast.success('Setor excluído')
      setDeleteOpen(false)
      void qc.invalidateQueries({ queryKey: ['sectors'] })
    },
    onError: () => toast.error('Falha ao excluir setor'),
  })

  const form = useForm<z.infer<typeof sectorInputSchema>>({
    resolver: zodResolver(sectorInputSchema),
    defaultValues: { name: '', parent_id: 0 },
  })

  const items = useMemo(() => query.data?.items ?? [], [query.data?.items])

  const childrenMap = useMemo(() => {
    const m = new Map<number, Sector[]>()
    for (const it of items) {
      const arr = m.get(it.parent_id) ?? []
      arr.push(it)
      m.set(it.parent_id, arr)
    }
    return m
  }, [items])

  const ordered = useMemo(() => {
    const idSet = new Set(items.map((i) => i.id))
    const roots = items.filter((i) => !idSet.has(i.parent_id))
    const out: Array<{ item: Sector; depth: number }> = []
    const walk = (node: Sector, depth: number) => {
      out.push({ item: node, depth })
      const ch = childrenMap.get(node.id) ?? []
      for (const c of ch) walk(c, depth + 1)
    }
    for (const r of roots) walk(r, 0)
    return out
  }, [items, childrenMap])

  useEffect(() => {
    if (open && editing && current) {
      form.reset({ name: current.name, parent_id: current.parent_id })
    }
    if (open && !editing) {
      const firstParent = items[0]?.id ?? 0
      form.reset({ name: '', parent_id: firstParent })
    }
  }, [open, editing, current, form, items])

  const totalItems = query.data?.itemsTotal ?? 0
  const totalPages = Math.max(1, Math.ceil(totalItems / Math.max(perPage, 1)))
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const selectedItem = selectedId ? items.find((i) => i.id === selectedId) ?? null : null
  const selectedCount = selectedId ? 1 : 0
  const toggleSelectOne = (id: number) => {
    setSelectedId((prev) => (prev === id ? null : id))
  }
  const [columnsVisible, setColumnsVisible] = useState<{ created_at: boolean }>({ created_at: true })
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
      <Topbar title='Setores' breadcrumbs={[{ label: 'Dashboard', href: '/director/dashboard', isLast: false }, { label: 'Setores', href: '/director/dashboard/sectors', isLast: true }]} />
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
                  <DialogTitle>Excluir setor</DialogTitle>
                  <DialogDescription>
                    Confirme a exclusão do setor selecionado. Esta ação não pode ser desfeita.
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
                  <Plus className='size-4' /> Cadastrar setor
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>{editing ? 'Editar setor' : 'Cadastrar setor'}</SheetTitle>
                </SheetHeader>
                <div className='p-2'>
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit((values) => {
                        const input: SectorInput = { name: values.name, parent_id: values.parent_id }
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
                                  <Input placeholder='Nome do setor' {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name='parent_id'
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Setor pai</FormLabel>
                                <Select value={String(field.value ?? '')} onValueChange={(v) => field.onChange(parseInt(v))}>
                                  <SelectTrigger className='w-full'>
                                    <SelectValue placeholder='Selecione o setor pai' />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectGroup>
                                      {items.map((s) => (
                                        <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                                      ))}
                                    </SelectGroup>
                                  </SelectContent>
                                </Select>
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
                      </TableHead>
                      <TableHead>Nome</TableHead>
                      {columnsVisible.created_at && <TableHead>Criado em</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {query.isLoading && (
                      Array.from({ length: 6 }).map((_, rIdx) => (
                        <TableRow key={`s-${rIdx}`} className={`${rIdx % 2 === 1 ? `bg-neutral-50` : ``}`}>
                          <TableCell className='text-center'><Skeleton className='h-4 w-4 rounded-[4px] mx-auto' /></TableCell>
                          <TableCell><Skeleton className='h-4 w-40' /></TableCell>
                          {columnsVisible.created_at && <TableCell><Skeleton className='h-4 w-32' /></TableCell>}
                        </TableRow>
                      ))
                    )}
                    {!query.isLoading && ordered.length > 0 && (
                      ordered.map(({ item, depth }, index) => (
                        <TableRow key={item.id} className={`${index % 2 === 0 ? `` : `bg-neutral-50/20`}`}>
                          <TableCell className='text-center'>
                            <Checkbox checked={selectedId === item.id} onCheckedChange={() => toggleSelectOne(item.id)} />
                          </TableCell>
                          <TableCell>
                            <div className='flex items-center gap-2' style={{ paddingLeft: depth * 16 }}>
                              <span className={`${(childrenMap.get(item.id)?.length ?? 0) > 0 ? 'font-semibold' : 'font-medium'}`}>{item.name}</span>
                            </div>
                          </TableCell>
                          {columnsVisible.created_at && (
                            <TableCell>
                              {typeof item.created_at === 'number' ? formatDateOnly(item.created_at) : formatDateOnly(item.created_at)}
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                    {!query.isLoading && ordered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={(1 + 1 + (columnsVisible.created_at ? 1 : 0))} className='text-center'>Nenhum setor encontrado</TableCell>
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