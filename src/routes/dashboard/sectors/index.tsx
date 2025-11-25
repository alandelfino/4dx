import { createFileRoute, redirect } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Topbar } from '../-components/topbar'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { DataTable } from '@/components/data-table'
import type { ColumnDef } from '@/components/data-table'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { FieldGroup } from '@/components/ui/field'
import { sectorInputSchema, listSectors, createSector, updateSector, deleteSector } from '@/lib/sectors'
import { listCollaborators } from '@/lib/collaborators'
import type { Sector } from '@/lib/sectors'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Edit, RefreshCcw, Trash, Plus, ChevronRight, ChevronDown } from 'lucide-react'

const ALLOWED_ROLES = ['director'] as const

export const Route = createFileRoute('/dashboard/sectors/')({
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
  const [openEdit, setOpenEdit] = useState<null | Sector>(null)
  const [openDelete, setOpenDelete] = useState<null | number>(null)

  const { data, isLoading, isRefetching, isError, error, refetch } = useQuery({
    queryKey: ['sectors', currentPage, perPage],
    queryFn: () => listSectors(currentPage, Math.min(50, perPage)),
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })

  const { data: collabData } = useQuery({
    queryKey: ['collaborators-options'],
    queryFn: () => listCollaborators(1, 100),
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })

  const collaborators = useMemo(() => Array.isArray(collabData?.items) ? collabData!.items : [], [collabData])

  const items: Sector[] = useMemo(() => Array.isArray(data?.items) ? data!.items : [], [data])
  const normalizedItems = useMemo(() => items.map((raw: any) => {
    const idNum = typeof raw.id === 'number' ? raw.id : Number(raw.id)
    const pidRaw = raw.parent_id
    const pidNum = pidRaw == null ? null : (typeof pidRaw === 'number' ? pidRaw : Number(pidRaw))
    return { ...raw, id: idNum, parent_id: pidNum }
  }), [items])
  const totalItems = typeof data?.itemsTotal === 'number' ? data!.itemsTotal : items.length
  const totalPages = typeof data?.pageTotal === 'number' ? data!.pageTotal : Math.max(1, Math.ceil(totalItems / perPage))

  useEffect(() => {
    if (isError) {
      const msg = (error as any)?.response?.data?.message
      toast.error(msg ?? 'Erro ao carregar setores')
    }
  }, [isError, error])
  useEffect(() => { setSelectedIds([]) }, [currentPage, perPage, isRefetching])
  useEffect(() => { if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages) }, [totalPages, currentPage])

  const [expanded, setExpanded] = useState<Record<number, boolean>>({})

  useEffect(() => {
    const next: Record<number, boolean> = {}
    for (const i of items) next[i.id] = true
    setExpanded(next)
  }, [items])

  const selectedSector = useMemo(() => {
    if (selectedIds.length !== 1) return null
    const id = selectedIds[0]
    return items.find((i) => i.id === id) ?? null
  }, [selectedIds, items])
  const selectedSectorIsDirector = (selectedSector?.profile ?? '') === 'director'
  const sectorById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items])

  const treeItems = useMemo(() => {
    const all = items.map((raw) => {
      const idNum = typeof (raw as any).id === 'number' ? (raw as any).id : Number((raw as any).id)
      const pidRaw = (raw as any).parent_id
      const pidNum = pidRaw == null ? null : (typeof pidRaw === 'number' ? pidRaw : Number(pidRaw))
      return { ...(raw as any), id: idNum, parent_id: pidNum }
    })
    const idSet = new Set(all.map((i) => i.id))
    const childrenMap = new Map<number, typeof all>()
    for (const i of all) {
      const pid = i.parent_id
      if (typeof pid === 'number' && idSet.has(pid)) {
        const arr = childrenMap.get(pid) || []
        arr.push(i)
        childrenMap.set(pid, arr)
      }
    }
    const roots = all.filter((i) => {
      const pid = i.parent_id
      return !(typeof pid === 'number' && idSet.has(pid)) || pid === 0
    }).sort((a, b) => String(a.name).localeCompare(String(b.name)))
    const visited = new Set<number>()
    const out: Array<Sector & { depth: number; hasChildren: boolean }> = []
    const dfs = (node: any, depth: number, limit: number = 50) => {
      const nodeId: number = node.id
      if (visited.has(nodeId)) return
      if (depth > limit) return
      visited.add(nodeId)
      const kids = (childrenMap.get(nodeId) || []).sort((a, b) => String(a.name).localeCompare(String(b.name)))
      out.push({ ...(node as any), depth, hasChildren: kids.length > 0 })
      if (expanded[nodeId]) {
        for (const k of kids) dfs(k, depth + 1, limit)
      }
    }
    for (const r of roots) dfs(r, 0)
    return out
  }, [items, expanded])

  const columns: ColumnDef<Sector & { depth?: number; hasChildren?: boolean }>[] = [
    {
      id: 'select',
      width: '60px',
      header: () => (
        <div className="flex justify-center items-center">
          <Checkbox
            checked={treeItems.length > 0 && selectedIds.length === treeItems.length}
            onCheckedChange={() => setSelectedIds(selectedIds.length === treeItems.length ? [] : treeItems.map(i => i.id))}
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
    { id: 'name', header: 'Nome', cell: (row) => (
      <div className="flex items-center gap-2" style={{ paddingLeft: `${Math.min(8, row.depth || 0) * 16}px` }}>
        {row.hasChildren ? (
          <Button variant={'ghost'} size={'icon'} className="h-5 w-5 p-0" onClick={() => setExpanded((prev) => ({ ...prev, [row.id]: !(prev[row.id] ?? true) }))}>
            {(expanded[row.id] ?? true) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        ) : (
          <span className="w-5" />
        )}
        <span className={(row.depth || 0) > 0 ? 'text-neutral-700' : 'text-neutral-900'}>{row.name}</span>
      </div>
    ), className: 'border-r p-2!' },
    { id: 'profile', header: 'Perfil', cell: (row) => row.profile, className: 'border-r p-2!' },
  ]

  const createForm = useForm<z.output<typeof sectorInputSchema>>({ resolver: zodResolver(sectorInputSchema), defaultValues: { name: '', leader_id: undefined, parent_id: undefined as any } })
  const editForm = useForm<z.output<typeof sectorInputSchema>>({ resolver: zodResolver(sectorInputSchema) })

  const createMut = useMutation({
    mutationFn: (input: z.infer<typeof sectorInputSchema>) => createSector(input),
    onSuccess: () => { toast.success('Setor criado'); qc.invalidateQueries({ queryKey: ['sectors'] }); setOpenCreate(false) },
    onError: (error: any) => toast.error(error?.response?.data?.message ?? 'Erro ao criar setor'),
  })

  const updateMut = useMutation({
    mutationFn: (payload: { id: number, input: z.infer<typeof sectorInputSchema> }) => updateSector(payload.id, payload.input),
    onSuccess: () => { toast.success('Setor atualizado'); qc.invalidateQueries({ queryKey: ['sectors'] }); setOpenEdit(null) },
    onError: (error: any) => toast.error(error?.response?.data?.message ?? 'Erro ao atualizar setor'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteSector(id),
    onSuccess: () => { toast.success('Setor excluído'); qc.invalidateQueries({ queryKey: ['sectors'] }); setOpenDelete(null) },
    onError: (error: any) => toast.error(error?.response?.data?.message ?? 'Erro ao excluir setor'),
  })

  return (
    <div className="flex flex-col w-full h-full">
      <Topbar title="Setores" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard', isLast: false }, { label: 'Setores', href: '/dashboard/sectors', isLast: true }]} />
      <div className="flex flex-col w-full h-full flex-1 overflow-hidden">
        <div className="border-b flex w-full items-center p-2 gap-4">
          <div className="flex items-center gap-2 flex-1">
            <Button variant={'outline'} disabled={isLoading || isRefetching} onClick={() => { setSelectedIds([]); refetch() }}>
              {(isLoading || isRefetching) ? <><RefreshCcw className="animate-spin" /> Atualizando...</> : <><RefreshCcw /> Atualizar</>}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.length === 1 ? (
              <Button
                variant={'ghost'}
                disabled={selectedSectorIsDirector}
                onClick={() => {
                  const item = items.find(i => i.id === selectedIds[0])
                  if (!item) return
                  if (item.profile === 'director') { toast.error('Setor com perfil diretor não pode ser editado'); return }
                  setOpenEdit(item)
                  editForm.reset({ name: item.name, leader_id: item.leader_id, parent_id: item.parent_id })
                }}
              >
                <Edit /> Editar
              </Button>
            ) : (
              <Button variant={'ghost'} disabled>
                <Edit /> Editar
              </Button>
            )}
            {selectedIds.length === 1 ? (
              <Button
                variant={'ghost'}
                disabled={selectedSectorIsDirector}
                onClick={() => {
                  const item = items.find(i => i.id === selectedIds[0])
                  if (!item) return
                  if (item.profile === 'director') { toast.error('Setor com perfil diretor não pode ser excluído'); return }
                  setOpenDelete(item.id)
                }}
              >
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
          data={treeItems}
          loading={isLoading || isRefetching}
          page={currentPage}
          perPage={perPage}
          totalItems={treeItems.length}
          emptyMessage={'Nenhum setor encontrado'}
          onChange={({ page, perPage }) => { if (typeof page === 'number') setCurrentPage(page); if (typeof perPage === 'number') setPerPage(perPage); refetch() }}
        />
      </div>

      <Sheet open={openCreate} onOpenChange={setOpenCreate}>
        <SheetContent aria-label="Cadastrar setor">
          <Form {...(createForm as any)}>
            <form onSubmit={createForm.handleSubmit((values) => createMut.mutate(values))} className="flex flex-col h-full">
              <SheetHeader>
                <SheetTitle>Novo setor</SheetTitle>
                <SheetDescription>Preencha os campos abaixo para cadastrar.</SheetDescription>
              </SheetHeader>
              <div className="flex-1 grid auto-rows-min gap-6 px-4 py-4">
                <FieldGroup>
                  <FormField control={createForm.control as any} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input {...field} aria-invalid={!!createForm.formState.errors?.name} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={createForm.control as any} name="leader_id" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Líder</FormLabel>
                      <Select value={field.value != null ? String(field.value) : undefined} onValueChange={(v) => field.onChange(Number(v))}>
                        <FormControl>
                          <SelectTrigger aria-invalid={!!createForm.formState.errors?.leader_id} className="w-full">
                            <SelectValue placeholder="Selecione o líder" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {collaborators.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={createForm.control as any} name="parent_id" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Setor pai</FormLabel>
                      <Select value={field.value != null ? String(field.value) : undefined} onValueChange={(v) => field.onChange(Number(v))}>
                        <FormControl>
                          <SelectTrigger aria-invalid={!!createForm.formState.errors?.parent_id} className="w-full">
                            <SelectValue placeholder="Selecione o setor pai" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {items.map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
        <SheetContent aria-label="Editar setor">
          <Form {...(editForm as any)}>
            <form
              onSubmit={editForm.handleSubmit((values) => {
                if (!openEdit) return
                if (openEdit.profile === 'director') { toast.error('Setor com perfil diretor não pode ser editado'); return }
                updateMut.mutate({ id: openEdit.id, input: values })
              })}
              className="flex flex-col h-full"
            >
              <SheetHeader>
                <SheetTitle>Editar setor</SheetTitle>
                <SheetDescription>Atualize os dados do setor.</SheetDescription>
              </SheetHeader>
              <div className="flex-1 grid auto-rows-min gap-6 px-4 py-4">
                <FieldGroup>
                  <FormField control={editForm.control as any} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input {...field} aria-invalid={!!editForm.formState.errors?.name} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={editForm.control as any} name="leader_id" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Líder</FormLabel>
                      <Select value={field.value != null ? String(field.value) : undefined} onValueChange={(v) => field.onChange(Number(v))}>
                        <FormControl>
                          <SelectTrigger aria-invalid={!!editForm.formState.errors?.leader_id} className="w-full">
                            <SelectValue placeholder="Selecione o líder" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {collaborators.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={editForm.control as any} name="parent_id" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Setor pai</FormLabel>
                      <Select value={field.value != null ? String(field.value) : undefined} onValueChange={(v) => field.onChange(Number(v))}>
                        <FormControl>
                          <SelectTrigger aria-invalid={!!editForm.formState.errors?.parent_id} className="w-full">
                            <SelectValue placeholder="Selecione o setor pai" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {normalizedItems
                            .filter((s) => {
                              if (!openEdit) return true
                              const childrenMap = new Map<number, any[]>()
                              for (const i of normalizedItems) {
                                const pid = i.parent_id
                                if (typeof pid === 'number') {
                                  const arr = childrenMap.get(pid) || []
                                  arr.push(i)
                                  childrenMap.set(pid, arr)
                                }
                              }
                              const blocked = new Set<number>()
                              const stack = [openEdit.id]
                              while (stack.length) {
                                const id = stack.pop()!
                                const kids = childrenMap.get(id) || []
                                for (const k of kids) {
                                  if (!blocked.has(k.id)) {
                                    blocked.add(k.id)
                                    stack.push(k.id)
                                  }
                                }
                              }
                              return s.id !== openEdit.id && !blocked.has(s.id)
                            })
                            .sort((a, b) => String(a.name).localeCompare(String(b.name)))
                            .map((s) => (
                              <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
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
                  <Button type="submit" disabled={updateMut.isPending || (!!openEdit && openEdit.profile === 'director')} className="w-full">Salvar</Button>
                </div>
              </div>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      <Dialog open={!!openDelete} onOpenChange={(v) => setOpenDelete(v ? openDelete : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir setor</DialogTitle>
            <DialogDescription>Esta ação não pode ser desfeita.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDelete(null)} disabled={deleteMut.isPending}>Cancelar</Button>
            <Button
              variant={'destructive'}
              onClick={() => {
                if (!openDelete) return
                const item = sectorById.get(openDelete)
                if ((item?.profile ?? '') === 'director') { toast.error('Setor com perfil diretor não pode ser excluído'); return }
                deleteMut.mutate(openDelete)
              }}
              disabled={deleteMut.isPending || (!!openDelete && ((sectorById.get(openDelete)?.profile ?? '') === 'director'))}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}