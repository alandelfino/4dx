import { createFileRoute, redirect } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Topbar } from '../-components/topbar'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { DataTable } from '@/components/data-table'
import type { ColumnDef } from '@/components/data-table'
import { CreateGoalSheet } from './-components/create-sheet'
import { EditGoalSheet } from './-components/edit-sheet'
import { DeleteGoalDialog } from './-components/delete-dialog'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Edit, RefreshCcw, Trash, Plus } from 'lucide-react'
import { goalCreateSchema, goalUpdateSchema, listGoals, createGoal, updateGoal, deleteGoal } from '@/lib/goals'
import type { Goal } from '@/lib/goals'
// import { listSectors } from '@/lib/sectors'
// import type { Sector } from '@/lib/sectors'
// import { formatDateByCompany } from '@/lib/format'
import { formatDateOnly } from './-components/utils'
import { formatValueByType } from './-components/utils'

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
  const [openDelete, setOpenDelete] = useState<null | number>(null)

  const { data, isLoading, isRefetching, isError, error, refetch } = useQuery({
    queryKey: ['goals', currentPage, perPage],
    queryFn: () => listGoals(currentPage, Math.min(50, perPage)),
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

  useEffect(() => {
    if (isError) {
      const msg = (error as any)?.response?.data?.message
      toast.error(msg ?? 'Erro ao carregar metas')
    }
  }, [isError, error])
  useEffect(() => { setSelectedIds([]) }, [currentPage, perPage, isRefetching])
  useEffect(() => { if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages) }, [totalPages, currentPage])

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
      className: 'font-medium border-r p-2!'
    },
    { id: 'description', header: 'Descrição', cell: (row) => row.description, className: 'border-r p-2!' },
    { id: 'from', header: 'De', cell: (row) => {
      const t = (row as any).type ?? 'int'
      const v = unscaleByType(t, row.from)
      return formatValueByType(v, t)
    }, className: 'border-r p-2!' },
    { id: 'to', header: 'Para', cell: (row) => {
      const t = (row as any).type ?? 'int'
      const v = unscaleByType(t, row.to)
      return formatValueByType(v, t)
    }, className: 'border-r p-2!' },
    { id: 'from_date', header: 'Inicia em', cell: (row) => formatDateOnly(row.from_date), className: 'border-r p-2!' },
    { id: 'to_date', header: 'Termina em', cell: (row) => formatDateOnly(row.to_date), className: 'border-r p-2!' },
  ]

  const createForm = useForm<z.infer<typeof goalCreateSchema>>({ resolver: zodResolver(goalCreateSchema), defaultValues: { description: '', from: 0, to: 0, from_date: undefined as any, to_date: undefined as any, type: 'int', period: undefined as any } })
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

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteGoal(id),
    onSuccess: () => { toast.success('Meta excluída'); qc.invalidateQueries({ queryKey: ['goals'] }); setOpenDelete(null) },
    onError: (error: any) => toast.error(error?.response?.data?.message ?? 'Erro ao excluir meta'),
  })

  return (
    <div className="flex flex-col w-full h-full">
      <Topbar title="Metas" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard', isLast: false }, { label: 'Metas', href: '/dashboard/goals', isLast: true }]} />
      <div className="flex flex-col w-full h-full flex-1 overflow-hidden">
        <div className="border-b flex w-full items-center p-2 gap-4">
          <div className="flex items-center gap-2 flex-1">
            <Button variant={'outline'} disabled={isLoading || isRefetching} onClick={() => { setSelectedIds([]); refetch() }}>
              {(isLoading || isRefetching) ? <><RefreshCcw className="animate-spin" /> Atualizando...</> : <><RefreshCcw /> Atualizar</>}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.length === 1 ? (
              <Button variant={'ghost'} onClick={() => { const item = items.find(i => i.id === selectedIds[0]); if (!item) return; setOpenEdit(item); const t = (item as any).type ?? 'int'; editForm.reset({ description: item.description, from: unscaleByType(t, item.from), to: unscaleByType(t, item.to), from_date: item.from_date, to_date: item.to_date, type: t, period: (item as any).period ?? undefined }) }}>
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
              <Plus /> Novo
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
          onChange={({ page, perPage }) => { if (typeof page === 'number') setCurrentPage(page); if (typeof perPage === 'number') setPerPage(perPage); refetch() }}
        />
      </div>

      <CreateGoalSheet open={openCreate} onOpenChange={setOpenCreate} form={createForm} onSubmit={(values) => {
        const t = values.type
        const payload = { ...values, from: scaleByType(t, values.from), to: scaleByType(t, values.to) }
        createMut.mutate(payload)
      }} pending={createMut.isPending} />

      <EditGoalSheet open={!!openEdit} onOpenChange={(v) => setOpenEdit(v ? openEdit : null)} form={editForm} onSubmit={(values) => {
        if (!openEdit) return
        const t = values.type
        const payload = { ...values, from: scaleByType(t, values.from), to: scaleByType(t, values.to) }
        updateMut.mutate({ id: openEdit.id, input: payload })
      }} pending={updateMut.isPending} />

      <DeleteGoalDialog openId={openDelete} onOpenChange={setOpenDelete} onConfirm={(id) => deleteMut.mutate(id)} pending={deleteMut.isPending} />
    </div>
  )
}

export default RouteComponent
  const scaleByType = (type: 'int' | 'decimal' | 'currency' | 'percent', n: number): number => {
    if (!Number.isFinite(n)) return 0
    if (type === 'currency' || type === 'percent') return Math.round(n * 100)
    if (type === 'decimal') return Math.round(n * 10000)
    return Math.round(n)
  }

  const unscaleByType = (type: 'int' | 'decimal' | 'currency' | 'percent', n: number): number => {
    if (!Number.isFinite(n)) return 0
    if (type === 'currency' || type === 'percent') return n / 100
    if (type === 'decimal') return n / 10000
    return n
  }