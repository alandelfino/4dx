import { createFileRoute, redirect } from '@tanstack/react-router'
import { Topbar } from '../-components/topbar'
import { Button } from '@/components/ui/button'
import { Edit, Funnel, Layers, RefreshCcw, Trash } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { DataTable } from '@/components/data-table'
import type { ColumnDef } from '@/components/data-table'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty'
import { Dialog, DialogContent, DialogHeader, DialogFooter } from '@/components/ui/dialog'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { privateInstance, auth } from '@/lib/auth'
import { createSegment, updateSegment, deleteSegment } from '@/lib/segments'

const ALLOWED_ROLES = ['director'] as const

export const Route = createFileRoute('/dashboard/segments/')({
  component: RouteComponent,
  staticData: { allowedRoles: ALLOWED_ROLES },
  beforeLoad: async () => {
    const session = await auth.fetchSession()
    if (!session) {
      throw redirect({ to: '/sign-in' })
    }
    const res = auth.canActivate(ALLOWED_ROLES)
    if (!res.allowed) {
      if (res.reason === 'unauthenticated') {
        throw redirect({ to: '/sign-in' })
      }
      throw redirect({ to: '/access-denied' })
    }
  },
})

type Segment = {
  id: number
  created_at: number | string
  updated_at: number | string
  name: string
  company_id: number
}

type SegmentsResponse = {
  itemsReceived: number
  curPage: number
  nextPage: number | null
  prevPage: number | null
  offset: number
  perPage: number
  itemsTotal: number
  pageTotal: number
  items: Segment[]
}

const formSchema = z.object({ name: z.string().min(1) })

function RouteComponent() {
  const qc = useQueryClient()
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [openCreate, setOpenCreate] = useState(false)
  const [openEdit, setOpenEdit] = useState<number | null>(null)
  const [openDelete, setOpenDelete] = useState(false)

  const { data, isLoading, isRefetching, isError, error, refetch } = useQuery({
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    queryKey: ['segments', currentPage, perPage],
    queryFn: async () => {
      const res = await privateInstance.get(`/api:5zagWASm/segments`, { params: { page: currentPage, per_page: perPage } })
      return res.data as SegmentsResponse
    },
  })

  const items: Segment[] = useMemo(() => Array.isArray(data?.items) ? data!.items : [], [data])
  const totalItems = typeof data?.itemsTotal === 'number' ? data!.itemsTotal : items.length
  const totalPages = typeof data?.pageTotal === 'number' ? data!.pageTotal : Math.max(1, Math.ceil(totalItems / perPage))

  useEffect(() => {
    if (isError) {
      const msg = (error as any)?.response?.data?.message
      toast.error(msg ?? 'Erro ao carregar segmentos')
    }
  }, [isError, error])
  useEffect(() => { setSelectedId(null) }, [currentPage, perPage, isRefetching])
  useEffect(() => { if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages) }, [totalPages, currentPage])
  useEffect(() => {
    return () => {
      setSelectedId(null)
      setOpenCreate(false)
      setOpenEdit(null)
      setOpenDelete(false)
      setCurrentPage(1)
      setPerPage(20)
      qc.removeQueries({ queryKey: ['segments'] })
    }
  }, [])

  const columns: ColumnDef<Segment>[] = [
    {
      id: 'select',
      width: '60px',
      header: () => (<span className='w-5' />),
      cell: (row) => (
        <div className='flex justify-center items-center'>
          <Checkbox checked={selectedId === row.id} onCheckedChange={() => setSelectedId(selectedId === row.id ? null : row.id)} />
        </div>
      ),
      headerClassName: 'w-[60px] border-r',
      className: 'font-medium border-r'
    },
    { id: 'name', header: 'Nome', cell: (row) => row.name, className: 'border-r' },
  ]

  const createForm = useForm<z.infer<typeof formSchema>>({ resolver: zodResolver(formSchema), defaultValues: { name: '' } })
  const editForm = useForm<z.infer<typeof formSchema>>({ resolver: zodResolver(formSchema), defaultValues: { name: '' } })

  const createMut = useMutation({
    mutationFn: (values: z.infer<typeof formSchema>) => createSegment(values),
    onSuccess: () => { toast.success('Segmento criado'); qc.invalidateQueries({ queryKey: ['segments'] }); setOpenCreate(false); createForm.reset({ name: '' }) },
    onError: (error: any) => toast.error(error?.response?.data?.message ?? 'Erro ao criar segmento'),
  })

  const updateMut = useMutation({
    mutationFn: (payload: { id: number, input: z.infer<typeof formSchema> }) => updateSegment(payload.id, payload.input),
    onSuccess: () => { toast.success('Segmento atualizado'); qc.invalidateQueries({ queryKey: ['segments'] }); setOpenEdit(null) },
    onError: (error: any) => toast.error(error?.response?.data?.message ?? 'Erro ao atualizar segmento'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteSegment(id),
    onSuccess: () => { toast.success('Segmento excluído'); qc.invalidateQueries({ queryKey: ['segments'] }); setOpenDelete(false); setSelectedId(null) },
    onError: (error: any) => toast.error(error?.response?.data?.message ?? 'Erro ao excluir segmento'),
  })

  return (
    <div className='flex flex-col w-full h-full'>
      <Topbar title="Segmentos" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard', isLast: false }, { label: 'Segmentos', href: '/dashboard/segments', isLast: true }]} />
      <div className='flex flex-col w-full h-full flex-1 overflow-hidden'>
        <div className='border-b flex w-full items-center p-2 gap-4'>
          <div className='flex items-center gap-2 flex-1'>
            <Button variant={'outline'}>
              <Funnel /> Filtros
            </Button>
          </div>
          <div className='flex items-center gap-2'>
            <Button variant={'ghost'} disabled={isLoading || isRefetching} onClick={() => { setSelectedId(null); refetch() }}>
              {(isLoading || isRefetching) ? <><RefreshCcw className='animate-spin' /> Atualizando...</> : <><RefreshCcw /> Atualizar</>}
            </Button>
            {selectedId ? (
              <Button variant={'outline'} onClick={() => setOpenEdit(selectedId)}>
                <Edit /> Editar
              </Button>
            ) : (
              <Button variant={'outline'} disabled>
                <Edit /> Editar
              </Button>
            )}
            {selectedId ? (
              <Button variant={'outline'} onClick={() => setOpenDelete(true)}>
                <Trash /> Excluir
              </Button>
            ) : (
              <Button variant={'outline'} disabled>
                <Trash /> Excluir
              </Button>
            )}
            <Sheet open={openCreate} onOpenChange={setOpenCreate}>
              <SheetTrigger asChild>
                <Button>
                  <Layers /> Novo Segmento
                </Button>
              </SheetTrigger>
              <SheetContent>
                <Form {...createForm}>
                  <form onSubmit={createForm.handleSubmit((values) => createMut.mutate(values))} className='flex flex-col h-full'>
                    <SheetHeader>
                      <SheetTitle>Novo segmento</SheetTitle>
                      <SheetDescription>Preencha para criar.</SheetDescription>
                    </SheetHeader>
                    <div className='flex-1 grid auto-rows-min gap-6 px-4 py-4'>
                      <FormField control={createForm.control} name='name' render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome</FormLabel>
                          <FormControl>
                            <Input placeholder='Digite o nome do segmento...' {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <div className='mt-auto border-t p-4'>
                      <div className='grid grid-cols-2 gap-4'>
                        <SheetClose asChild>
                          <Button variant='outline' className='w-full'>Cancelar</Button>
                        </SheetClose>
                        <Button type='submit' disabled={createMut.isPending} className='w-full'>Salvar</Button>
                      </div>
                    </div>
                  </form>
                </Form>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={items}
          loading={isLoading || isRefetching}
          page={currentPage}
          perPage={perPage}
          totalItems={items.length}
          emptyMessage={'Nenhum segmento encontrado'}
          emptySlot={(
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant='icon'>
                  <Layers className='h-6 w-6' />
                </EmptyMedia>
                <EmptyTitle>Nenhum segmento ainda</EmptyTitle>
                <EmptyDescription>
                  Você ainda não criou nenhum segmento. Comece criando seu primeiro segmento.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <div className='flex gap-2'>
                  <SheetTrigger asChild>
                    <Button>
                      <Layers /> Novo Segmento
                    </Button>
                  </SheetTrigger>
                  <Button variant={'outline'} disabled={isLoading || isRefetching} onClick={() => { setSelectedId(null); refetch() }}>
                    {(isLoading || isRefetching) ? <><RefreshCcw className='animate-spin' /> Atualizando...</> : <><RefreshCcw /> Atualizar</>}
                  </Button>
                </div>
              </EmptyContent>
            </Empty>
          )}
          onChange={({ page, perPage }) => { if (typeof page === 'number') setCurrentPage(page); if (typeof perPage === 'number') setPerPage(perPage); refetch() }}
        />
      </div>

      <Sheet open={!!openEdit} onOpenChange={(v) => setOpenEdit(v ? openEdit : null)}>
        <SheetContent>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit((values) => { if (openEdit) updateMut.mutate({ id: openEdit, input: values }) })} className='flex flex-col h-full'>
              <SheetHeader>
                <SheetTitle>Editar segmento</SheetTitle>
                <SheetDescription>Atualize os campos abaixo e salve.</SheetDescription>
              </SheetHeader>
              <div className='flex-1 grid auto-rows-min gap-6 px-4 py-4'>
                <FormField control={editForm.control} name='name' render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder='Digite o nome do segmento...' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className='mt-auto border-t p-4'>
                <div className='grid grid-cols-2 gap-4'>
                  <SheetClose asChild>
                    <Button variant='outline' className='w-full' onClick={() => setOpenEdit(null)}>Cancelar</Button>
                  </SheetClose>
                  <Button type='submit' disabled={updateMut.isPending} className='w-full'>Salvar</Button>
                </div>
              </div>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
      <Dialog open={openDelete} onOpenChange={setOpenDelete}>
        <DialogContent>
          <DialogHeader>
            <div className='text-lg font-semibold'>Excluir segmento</div>
            <div className='text-muted-foreground text-sm'>Esta ação não pode ser desfeita.</div>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => setOpenDelete(false)} disabled={deleteMut.isPending}>Cancelar</Button>
            <Button variant='destructive' onClick={() => { if (selectedId) deleteMut.mutate(selectedId) }} disabled={deleteMut.isPending || !selectedId}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default RouteComponent