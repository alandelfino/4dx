import { createFileRoute, redirect } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Topbar } from '../-components/topbar'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { DataTable } from '@/components/data-table'
import type { ColumnDef } from '@/components/data-table'
import { CreateGoalSheetCollaborator } from './-components/create-sheet'
import { EditGoalSheetCollaborator } from './-components/edit-sheet'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Edit, RefreshCcw, Trash, Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogFooter } from '@/components/ui/dialog'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty'
import { listGoalsCollaborator, createGoalCollaborator, updateGoalCollaborator, deleteGoalCollaborator } from '@/lib/goals'
import type { Goal } from '@/lib/goals'
import { listSegments } from '@/lib/segments'
import { formatDateOnly } from '../goals/-components/utils'
import { formatValueByType } from '../goals/-components/utils'

const ALLOWED_ROLES = ['collaborator'] as const

export const Route = createFileRoute('/dashboard/goals-collaborator/')({
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

function RouteComponent() {
  const qc = useQueryClient()
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [openCreate, setOpenCreate] = useState(false)
  const [openEdit, setOpenEdit] = useState<null | Goal>(null)
  const [openBulkDelete, setOpenBulkDelete] = useState(false)

  const { data, isLoading, isRefetching, isError, error, refetch } = useQuery({
    queryKey: ['goals-collab', currentPage, perPage],
    queryFn: () => listGoalsCollaborator(currentPage, Math.min(50, perPage)),
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })
  const { data: segData } = useQuery({
    queryKey: ['segments-options'],
    queryFn: () => listSegments(1, 200),
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })

  useEffect(() => { if (isError) toast.error((error as any)?.response?.data?.message ?? 'Erro ao carregar metas') }, [isError, error])
  useEffect(() => { setSelectedIds([]) }, [currentPage, perPage, isRefetching])
  const items: Goal[] = useMemo(() => Array.isArray(data?.items) ? data!.items : [], [data])
  const totalItems = typeof data?.itemsTotal === 'number' ? data!.itemsTotal : items.length
  const totalPages = typeof data?.pageTotal === 'number' ? data!.pageTotal : Math.max(1, Math.ceil(totalItems / perPage))
  const segments = useMemo(() => Array.isArray(segData?.items) ? segData!.items : [], [segData])
  const segmentsById = useMemo(() => new Map<number, string>(segments.map((s: any) => [s.id as number, String(s.name)])), [segments])
  useEffect(() => { if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages) }, [totalPages, currentPage])
  useEffect(() => { return () => { setSelectedIds([]); setOpenCreate(false); setOpenEdit(null); setOpenBulkDelete(false); setCurrentPage(1); setPerPage(20); qc.removeQueries({ queryKey: ['goals-collab'] }); qc.removeQueries({ queryKey: ['segments-options'] }) } }, [])

  const collabCreateSchema = z.object({
    description: z.string().min(1),
    from: z.number(),
    to: z.number(),
    from_date: z.number(),
    to_date: z.number(),
    parent_id: z.number().int(),
    type: z.enum(['int', 'decimal', 'currency', 'percent']),
    period: z.enum(['daily', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'semiannual', 'annual']),
  })
  const collabUpdateSchema = collabCreateSchema
  const createForm = useForm<z.infer<typeof collabCreateSchema>>({ resolver: zodResolver(collabCreateSchema), defaultValues: { description: '', from: 0, to: 0, from_date: undefined as any, to_date: undefined as any, type: 'int', period: undefined as any, parent_id: undefined as any } })
  const editForm = useForm<z.infer<typeof collabUpdateSchema>>({ resolver: zodResolver(collabUpdateSchema) })

  const createMut = useMutation({
    mutationFn: (input: z.infer<typeof collabCreateSchema>) => createGoalCollaborator(input as any),
    onSuccess: () => { toast.success('Meta criada'); setOpenCreate(false); qc.invalidateQueries({ queryKey: ['goals-collab'] }) },
    onError: (error: any) => toast.error(error?.response?.data?.message ?? 'Erro ao criar meta'),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, input }: { id: number, input: z.infer<typeof collabUpdateSchema> }) => updateGoalCollaborator(id, input as any),
    onSuccess: () => { toast.success('Meta atualizada'); setOpenEdit(null); qc.invalidateQueries({ queryKey: ['goals-collab'] }) },
    onError: (error: any) => toast.error(error?.response?.data?.message ?? 'Erro ao atualizar meta'),
  })
  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteGoalCollaborator(id),
    onSuccess: () => { toast.success('Meta excluída'); setOpenBulkDelete(false); setSelectedIds([]); qc.invalidateQueries({ queryKey: ['goals-collab'] }) },
    onError: (error: any) => toast.error(error?.response?.data?.message ?? 'Erro ao excluir meta'),
  })

  const columns: ColumnDef<Goal>[] = [
    {
      id: 'select',
      width: '60px',
      header: () => (
        <div className='flex justify-center items-center'>
          <Checkbox
            checked={items.length > 0 && selectedIds.length === items.length}
            onCheckedChange={() => setSelectedIds(selectedIds.length === items.length ? [] : items.map(i => i.id))}
          />
        </div>
      ),
      cell: (row) => (
        <div className='flex justify-center items-center'>
          <Checkbox
            checked={selectedIds.includes(row.id)}
            onCheckedChange={() => setSelectedIds(selectedIds.includes(row.id) ? selectedIds.filter(id => id !== row.id) : [...selectedIds, row.id])}
          />
        </div>
      ),
      headerClassName: 'w-[60px] border-r',
      className: 'font-medium border-r'
    },
    {
      id: 'summary',
      header: 'Meta',
      cell: (row) => {
        const t = (row as any).type ?? 'int'
        const fromV = formatValueByType((row as any).from / (t === 'percent' ? 100 : 1), t)
        const toV = formatValueByType((row as any).to / (t === 'percent' ? 100 : 1), t)
        const fromStr = fromV
        const toStr = toV
        const fromDate = formatDateOnly(row.from_date)
        const toDate = formatDateOnly(row.to_date)
        const sid = (row as any).segment_id
        const idNum = typeof sid === 'number' ? sid : Number(sid)
        const segName = Number.isFinite(idNum) ? (segmentsById.get(idNum) ?? 'Nome do segmento') : 'Nome do segmento'
        return (
          <div className="w-full">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-neutral-900 dark:text-neutral-100 text-base">{row.description}</span>
              <span className="text-muted-foreground">( {segName} )</span>
            </div>
            <div className="mt-2 text-sm">
              <span className="text-emerald-600 font-semibold">de {fromStr}</span>
              <span className="text-neutral-700 dark:text-neutral-300">{' '}para{' '}</span>
              <span className="text-emerald-600 font-semibold">{toStr}</span>
              <span className="text-neutral-700 dark:text-neutral-300">{' '}a partir de{' '}</span>
              <span className="text-neutral-900 dark:text-neutral-100 font-medium">{fromDate}</span>
              <span className="text-neutral-700 dark:text-neutral-300">{' '}até{' '}</span>
              <span className="text-neutral-900 dark:text-neutral-100 font-medium">{toDate}</span>
            </div>
          </div>
        )
      },
      className: 'p-4!',
      headerClassName: 'border-r',
      width: '100%'
    },
  ]

  return (
    <div className="flex flex-col w-full h-full">
      <Topbar title="Metas" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard', isLast: false }, { label: 'Metas', href: '/dashboard/goals-collaborator', isLast: true }]} />
      <div className="flex flex-col w-full h-full flex-1 overflow-hidden">
        <div className="border-b flex w-full items-center p-2 gap-4">
          <div className="flex items-center gap-2 ml-auto">
            <Button variant={'ghost'} disabled={isLoading || isRefetching} onClick={() => { setSelectedIds([]); refetch() }}>
              {(isLoading || isRefetching) ? <><RefreshCcw className="animate-spin" /> Atualizando...</> : <><RefreshCcw /> Atualizar</>}
            </Button>
            {selectedIds.length === 1 ? (
              <Button variant={'outline'} onClick={() => { const item = items.find(i => i.id === selectedIds[0]); if (!item) return; setOpenEdit(item); const t = (item as any).type ?? 'int'; editForm.reset({ description: item.description, from: (t === 'percent' ? item.from / 100 : item.from), to: (t === 'percent' ? item.to / 100 : item.to), from_date: item.from_date, to_date: item.to_date, type: t, period: (item as any).period, parent_id: (item as any).parent_id }) }}>
                <Edit /> Editar
              </Button>
            ) : (
              <Button variant={'outline'} disabled>
                <Edit /> Editar
              </Button>
            )}
            {selectedIds.length >= 1 ? (
              <Button variant={'outline'} onClick={() => setOpenBulkDelete(true)}>
                <Trash /> Excluir
              </Button>
            ) : (
              <Button variant={'outline'} disabled>
                <Trash /> Excluir
              </Button>
            )}
            <Button onClick={() => setOpenCreate(true)}>
              <Plus /> Nova Meta
            </Button>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={items}
          loading={isLoading || isRefetching}
          page={currentPage}
          perPage={perPage}
          totalItems={items.length}
          emptyMessage={'Nenhuma meta encontrada'}
          emptySlot={(
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Plus className='h-6 w-6' />
                </EmptyMedia>
                <EmptyTitle>Nenhuma meta ainda</EmptyTitle>
                <EmptyDescription>
                  Você ainda não criou nenhuma meta. Comece criando sua primeira meta.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <div className='flex gap-2 justify-end'>
                  <Button onClick={() => setOpenCreate(true)}>
                    <Plus /> Nova Meta
                  </Button>
                  <Button variant={'ghost'} disabled={isLoading || isRefetching} onClick={() => { setSelectedIds([]); refetch() }}>
                    {(isLoading || isRefetching) ? <><RefreshCcw className='animate-spin' /> Atualizando...</> : <><RefreshCcw /> Atualizar</>}
                  </Button>
                </div>
              </EmptyContent>
            </Empty>
          )}
          onChange={({ page, perPage }) => { if (typeof page === 'number') setCurrentPage(page); if (typeof perPage === 'number') setPerPage(perPage); refetch() }}
        />
      </div>

      <CreateGoalSheetCollaborator open={openCreate} onOpenChange={setOpenCreate} form={createForm} onSubmit={(values) => {
        const t = values.type
        const payload = { ...values, period: values.period, from: (t === 'percent' ? values.from * 100 : values.from), to: (t === 'percent' ? values.to * 100 : values.to) }
        createMut.mutate(payload)
      }} pending={createMut.isPending} />

      <EditGoalSheetCollaborator open={!!openEdit} onOpenChange={(v) => setOpenEdit(v ? openEdit : null)} form={editForm} onSubmit={(values) => {
        if (!openEdit) return
        const t = values.type
        const payload = { ...values, period: values.period, from: (t === 'percent' ? values.from * 100 : values.from), to: (t === 'percent' ? values.to * 100 : values.to) }
        updateMut.mutate({ id: openEdit.id, input: payload })
      }} pending={updateMut.isPending} />

      <Dialog open={openBulkDelete} onOpenChange={(v) => { setOpenBulkDelete(v); }}>
        <DialogContent>
          <DialogHeader>Excluir metas</DialogHeader>
          <div className='text-sm'>Tem certeza que deseja excluir {selectedIds.length} meta(s)?</div>
          <DialogFooter>
            <Button variant={'outline'} onClick={() => setOpenBulkDelete(false)}>Cancelar</Button>
            <Button variant={'destructive'} onClick={() => deleteMut.mutate(selectedIds[0])} disabled={selectedIds.length === 0}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}