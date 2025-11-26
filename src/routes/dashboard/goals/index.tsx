import { createFileRoute, redirect } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Topbar } from '../-components/topbar'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { DataTable } from '@/components/data-table'
import type { ColumnDef } from '@/components/data-table'
import { CreateGoalSheet } from './-components/create-sheet'
import { EditGoalSheet } from './-components/edit-sheet'
// deleted single delete dialog; bulk delete handles 1..n
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Edit, RefreshCcw, Trash, Plus, Target, CheckCircle2, ThumbsUp, AlertTriangle, XCircle, Clock, PlayCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogFooter } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty'
import { goalCreateSchema, goalUpdateSchema, listGoals, createGoal, updateGoal, deleteGoal } from '@/lib/goals'
import type { Goal } from '@/lib/goals'
import { listSegments } from '@/lib/segments'
// import { listSectors } from '@/lib/sectors'
// import type { Sector } from '@/lib/sectors'
// import { formatDateByCompany } from '@/lib/format'
import { formatDateOnly } from './-components/utils'
import { formatValueByType } from './-components/utils'
import { Badge } from '@/components/ui/badge'

const ALLOWED_ROLES = ['director'] as const

export const Route = createFileRoute('/dashboard/goals/')({
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

// helpers moved to -components/utils

function RouteComponent() {
  const qc = useQueryClient()
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [openCreate, setOpenCreate] = useState(false)
  const [openEdit, setOpenEdit] = useState<null | Goal>(null)
  // single delete removed; bulk delete covers 1..n
  const [openBulkDelete, setOpenBulkDelete] = useState(false)
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number; failed: number; running: boolean }>({ current: 0, total: 0, failed: 0, running: false })

  const { data, isLoading, isRefetching, isError, error, refetch } = useQuery({
    queryKey: ['goals', currentPage, perPage],
    queryFn: () => listGoals(currentPage, Math.min(50, perPage)),
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })
  const { data: segData } = useQuery({
    queryKey: ['segments-options'],
    queryFn: () => listSegments(1, 200),
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })

  // const { data: sectorsData } = useQuery({
  //   queryKey: ['sectors-options'],
  //   queryFn: () => listSectors(1, 100),
  //   refetchOnWindowFocus: false,
  //   refetchOnMount: false,
  // })

  const items: Goal[] = useMemo(() => Array.isArray(data?.items) ? data!.items : [], [data])
  const totalItems = typeof data?.itemsTotal === 'number' ? data!.itemsTotal : items.length
  const totalPages = typeof data?.pageTotal === 'number' ? data!.pageTotal : Math.max(1, Math.ceil(totalItems / perPage))
  const segments = useMemo(() => Array.isArray(segData?.items) ? segData!.items : [], [segData])
  const segmentsById = useMemo(() => new Map<number, string>(segments.map((s: any) => [s.id as number, String(s.name)])), [segments])

  useEffect(() => {
    if (isError) {
      const msg = (error as any)?.response?.data?.message
      toast.error(msg ?? 'Erro ao carregar metas')
    }
  }, [isError, error])
  useEffect(() => { setSelectedIds([]) }, [currentPage, perPage, isRefetching])
  useEffect(() => { if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages) }, [totalPages, currentPage])
  useEffect(() => {
    return () => {
      setSelectedIds([])
      setOpenCreate(false)
      setOpenEdit(null)
      setOpenBulkDelete(false)
      setBulkProgress({ current: 0, total: 0, failed: 0, running: false })
      setCurrentPage(1)
      setPerPage(20)
      try { createForm.reset() } catch {}
      try { editForm.reset() } catch {}
      qc.removeQueries({ queryKey: ['goals'] })
      qc.removeQueries({ queryKey: ['segments-options'] })
    }
  }, [])

  // const sectors: Sector[] = useMemo(() => Array.isArray(sectorsData?.items) ? sectorsData!.items : [], [sectorsData])

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
        const fromV = unscaleByType(t, row.from)
        const toV = unscaleByType(t, row.to)
        const fromStr = formatValueByType(fromV, t)
        const toStr = formatValueByType(toV, t)
        const fromDate = formatDateOnly(row.from_date)
        const toDate = formatDateOnly(row.to_date)
        const sid = (row as any).segment_id
        const idNum = typeof sid === 'number' ? sid : Number(sid)
        const segName = Number.isFinite(idNum) ? (segmentsById.get(idNum) ?? 'Nome do segmento') : 'Nome do segmento'
        const perf = mapForecastStatus((row as any).forecast_status)
        const st = mapStatus(row as any)
        return (
          <div className="w-full">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-neutral-700 dark:text-neutral-100 text-lg">{row.description}</span>
              <span className="text-muted-foreground">( {segName} )</span>
            </div>
            <div className="mt-2 text-sm gap-2 flex items-center">
              <span className="text-neutral-700 dark:text-neutral-300">{' '}de{' '}</span>
              <span className="text-neutral-950 font-semibold text-md">{fromStr}</span>
              <span className="text-neutral-700 dark:text-neutral-300">{' '}para{' '}</span>
              <span className="text-neutral-950 font-semibold text-md">{toStr}</span>
              <span className="text-neutral-700 dark:text-neutral-300">{' '}a partir de{' '}</span>
              <span className="text-neutral-900 dark:text-neutral-100 font-semibold">{fromDate}</span>
              <span className="text-neutral-700 dark:text-neutral-300">{' '}até{' '}</span>
              <span className="text-neutral-900 dark:text-neutral-100 font-semibold">{toDate}</span>
            </div>
            <div className="mt-3 flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-neutral-700 dark:text-neutral-300">Desempenho:</span>
                {perf ? <Badge className={perf.className}>{perf.icon}{perf.label}</Badge> : <span className="text-neutral-500">-</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-neutral-700 dark:text-neutral-300">Status:</span>
                {st ? <Badge className={st.className}>{st.icon}{st.label}</Badge> : <span className="text-neutral-500">-</span>}
              </div>
            </div>
          </div>
        )
      },
      className: 'p-4!',
      headerClassName: 'border-r',
      width: '100%'
    },
  ]

  const createForm = useForm<z.infer<typeof goalCreateSchema>>({ resolver: zodResolver(goalCreateSchema), defaultValues: { description: '', from: 0, to: 0, from_date: undefined as any, to_date: undefined as any, type: 'int', period: undefined as any, segment_id: undefined as any } })
  const editForm = useForm<z.infer<typeof goalUpdateSchema>>({ resolver: zodResolver(goalUpdateSchema) })

  const createMut = useMutation({
    mutationFn: (input: z.infer<typeof goalCreateSchema>) => createGoal(input),
    onSuccess: () => { toast.success('Meta criada'); qc.invalidateQueries({ queryKey: ['goals'] }); setOpenCreate(false) },
    onError: (error: any) => toast.error(error?.response?.data?.message ?? 'Erro ao criar meta'),
  })

  const updateMut = useMutation({
    mutationFn: (payload: { id: number, input: z.infer<typeof goalUpdateSchema> }) => updateGoal(payload.id, payload.input),
    onSuccess: () => { toast.success('Meta atualizada'); qc.invalidateQueries({ queryKey: ['goals'] }); setOpenEdit(null) },
    onError: (error: any) => toast.error(error?.response?.data?.message ?? 'Erro ao atualizar meta'),
  })

  // remove single delete mutation in favor of bulk delete

  async function handleBulkDelete() {
    const ids = [...selectedIds]
    if (ids.length === 0) { setOpenBulkDelete(false); return }
    setBulkProgress({ current: 0, total: ids.length, failed: 0, running: true })
    for (const id of ids) {
      try {
        await deleteGoal(id)
      } catch {
        setBulkProgress((p) => ({ ...p, failed: p.failed + 1 }))
      } finally {
        setBulkProgress((p) => ({ ...p, current: p.current + 1 }))
      }
    }
    setBulkProgress((p) => ({ ...p, running: false }))
    qc.invalidateQueries({ queryKey: ['goals'] })
    setSelectedIds([])
    toast.success('Exclusão em massa concluída')
    setOpenBulkDelete(false)
  }

  return (
    <div className="flex flex-col w-full h-full">
      <Topbar title="Metas" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard', isLast: false }, { label: 'Metas', href: '/dashboard/goals', isLast: true }]} />
      <div className="flex flex-col w-full h-full flex-1 overflow-hidden">
        <div className="border-b flex w-full items-center p-2 gap-4">
          <div className="flex items-center gap-2 ml-auto">
            <Button variant={'ghost'} disabled={isLoading || isRefetching} onClick={() => { setSelectedIds([]); refetch() }}>
              {(isLoading || isRefetching) ? <><RefreshCcw className="animate-spin" /> Atualizando...</> : <><RefreshCcw /> Atualizar</>}
            </Button>
            {selectedIds.length === 1 ? (
              <Button variant={'outline'} onClick={() => { const item = items.find(i => i.id === selectedIds[0]); if (!item) return; setOpenEdit(item); const t = (item as any).type ?? 'int'; const p = normalizePeriod((item as any).period); editForm.reset({ description: item.description, from: unscaleByType(t, item.from), to: unscaleByType(t, item.to), from_date: item.from_date, to_date: item.to_date, type: t, period: p, segment_id: (item as any).segment_id }) }}>
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
                  <Target className='h-6 w-6' />
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

      <CreateGoalSheet open={openCreate} onOpenChange={setOpenCreate} form={createForm} onSubmit={(values) => {
        const t = values.type
        const payload = { ...values, period: normalizePeriod(values.period), from: scaleByType(t, values.from), to: scaleByType(t, values.to) }
        createMut.mutate(payload)
      }} pending={createMut.isPending} />

      <EditGoalSheet open={!!openEdit} onOpenChange={(v) => setOpenEdit(v ? openEdit : null)} form={editForm} onSubmit={(values) => {
        if (!openEdit) return
        const t = values.type
        const payload = { ...values, period: normalizePeriod(values.period), from: scaleByType(t, values.from), to: scaleByType(t, values.to) }
        updateMut.mutate({ id: openEdit.id, input: payload })
      }} pending={updateMut.isPending} />

      {/* single delete dialog removed */}

      <Dialog open={openBulkDelete} onOpenChange={(v) => { setOpenBulkDelete(v); if (!v) setBulkProgress({ current: 0, total: 0, failed: 0, running: false }) } }>
        <DialogContent>
          <DialogHeader>
            <div className="text-lg font-semibold">Excluir metas selecionadas</div>
            <div className="text-muted-foreground text-sm">Total selecionadas: {selectedIds.length}</div>
          </DialogHeader>
          <Separator />
          <div className="grid gap-3">
            <div className="text-sm">Progresso: {bulkProgress.current}/{bulkProgress.total}</div>
            <div className="h-3 w-full rounded-md border overflow-hidden">
              <div
                className="h-full bg-destructive"
                style={{ width: `${bulkProgress.total > 0 ? Math.floor((bulkProgress.current / bulkProgress.total) * 100) : 0}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground">Falhas: {bulkProgress.failed}</div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={bulkProgress.running} onClick={() => setOpenBulkDelete(false)}>Cancelar</Button>
            <Button variant="destructive" disabled={bulkProgress.running} onClick={handleBulkDelete}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default RouteComponent
  const scaleByType = (_type: 'int' | 'decimal' | 'currency' | 'percent', n: number): number => {
    if (!Number.isFinite(n)) return 0
    return Math.round(n * 100)
  }

  const unscaleByType = (_type: 'int' | 'decimal' | 'currency' | 'percent', n: number): number => {
    if (!Number.isFinite(n)) return 0
    return n / 100
  }
const normalizePeriod = (p: any): 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'semiannual' | 'annual' | undefined => {
  const v = typeof p === 'string' ? p.toLowerCase() : undefined
  switch (v) {
    case 'daily':
    case 'weekly':
    case 'bi-weekly':
    case 'monthly':
    case 'quarterly':
    case 'semiannual':
    case 'annual':
      return v
    default:
      return undefined
  }
}
const mapForecastStatus = (s?: 'excellent' | 'good' | 'bad' | 'terrible'): { label: string; className: string; icon: ReactNode } | null => {
  switch (s) {
    case 'excellent':
      return { label: 'Excelente', className: 'bg-lime-50 text-lime-700 border-lime-300', icon: <CheckCircle2 className="text-lime-600" /> }
    case 'good':
      return { label: 'Bom', className: 'bg-emerald-50 text-emerald-700 border-emerald-300', icon: <ThumbsUp className="text-emerald-600" /> }
    case 'bad':
      return { label: 'Ruim', className: 'bg-amber-50 text-amber-700 border-amber-300', icon: <AlertTriangle className="text-amber-600" /> }
    case 'terrible':
      return { label: 'Péssimo', className: 'bg-red-50 text-red-700 border-red-300', icon: <XCircle className="text-red-600" /> }
    default:
      return null
  }
}

const mapStatus = (row: { status?: 'scheduled' | 'started' | 'finished' } | any): { label: string; className: string; icon: ReactNode } | null => {
  const s = row?.status
  switch (s) {
    case 'scheduled':
      return { label: 'Agendado', className: 'bg-sky-50 text-sky-700 border-sky-300', icon: <Clock className="text-sky-600" /> }
    case 'started':
      return { label: 'Iniciado', className: 'bg-indigo-50 text-indigo-700 border-indigo-300', icon: <PlayCircle className="text-indigo-600" /> }
    case 'finished':
      return { label: 'Finalizado', className: 'bg-green-50 text-green-700 border-green-300', icon: <CheckCircle2 className="text-green-600" /> }
    default:
      return null
  }
}