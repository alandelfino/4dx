import { auth, privateInstance } from '@/lib/auth'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CalendarDays } from 'lucide-react'
import { Topbar } from '../../../director/dashboard/-components/topbar'
import { ResponsiveContainer, Tooltip, Area, CartesianGrid, XAxis, YAxis, ComposedChart, Line } from 'recharts'
import { formatarMoeda } from '@/lib/format'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import type { FieldValues, Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { NumericFormat } from 'react-number-format'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { toast } from 'sonner'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useState } from 'react'

export const Route = createFileRoute('/collaborator/dashboard/goal/')({
  component: RouteComponent,
})

function RouteComponent() {
  const firstName = auth.getCurrentUser()?.name.split(' ')[0]
  const query = useQuery<{ [k: string]: unknown } | null>({
    queryKey: ['collaborator-my-goal'],
    queryFn: async () => {
      const res = await privateInstance.get('/api:collaborator/my-goal')
      return res.data ?? null
    },
  })

  const data = query.data
  const parent = (data && (data as any).parent) ?? undefined
  const mine = (data && (data as any).my_goal) ?? undefined
  const qc = useQueryClient()
  const objectiveLabelMap = { increase: 'Aumentar', decrease: 'Diminuir', maintain: 'Manter' }
  const intervalOrder = ['daily','weekly','bi-weekly','monthly','quarterly','semiannual','annual'] as const
  type Interval = typeof intervalOrder[number]
  const getAllowedIntervals = (fromStr: string, toStr: string): Interval[] => {
    if (!fromStr || !toStr) return intervalOrder.slice()
    const from = new Date(fromStr)
    const to = new Date(toStr)
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return intervalOrder.slice()
    const diffMs = Math.max(0, to.getTime() - from.getTime())
    const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)))
    const allowed: Interval[] = []
    if (diffDays >= 1) allowed.push('daily')
    if (diffDays >= 7) allowed.push('weekly')
    if (diffDays >= 14) allowed.push('bi-weekly')
    if (diffDays >= 28) allowed.push('monthly')
    if (diffDays >= 84) allowed.push('quarterly')
    if (diffDays >= 168) allowed.push('semiannual')
    if (diffDays >= 330) allowed.push('annual')
    return allowed
  }

  const goalInputSchema = z.object({
    description: z.string({ message: 'Descrição é obrigatória' }).min(1, { message: 'Descrição é obrigatória' }),
    from: z.preprocess((v) => (typeof v === 'string' ? Number(v.replace(/[^0-9.-]/g, '')) : v), z.number({ message: 'De inválido' })),
    to: z.preprocess((v) => (typeof v === 'string' ? Number(v.replace(/[^0-9.-]/g, '')) : v), z.number({ message: 'Até inválido' })),
    from_date: z.string({ message: 'Data inicial inválida' }).min(1, { message: 'Data inicial inválida' }),
    to_date: z.string({ message: 'Data final inválida' }).min(1, { message: 'Data final inválida' }),
    type: z.enum(['int', 'currency', 'percent', 'decimal'], { message: 'Tipo inválido' }),
    interval: z.enum(['daily', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'semiannual', 'annual'], { message: 'Período inválido' }),
    objective: z.enum(['increase', 'decrease', 'maintain'], { message: 'Objetivo inválido' }),
  })
  
  const [createOpen, setCreateOpen] = useState(false)

  const createForm = useForm<FieldValues>({
    resolver: zodResolver(goalInputSchema) as unknown as Resolver<FieldValues>,
    defaultValues: {
      description: '',
      from: (() => { const t = String((parent as any)?.type ?? 'int'); const v = Number((parent as any)?.from ?? 0); return t === 'int' ? v : v / 100 })(),
      to: (() => { const t = String((parent as any)?.type ?? 'int'); const v = Number((parent as any)?.to ?? 0); return t === 'int' ? v : v / 100 })(),
      from_date: String((parent as any)?.from_date ?? ''),
      to_date: String((parent as any)?.to_date ?? ''),
      type: String((parent as any)?.type ?? 'int'),
      interval: String((parent as any)?.interval ?? 'monthly'),
      objective: 'increase',
    },
  })
  const createTypeValue = createForm.watch('type') as 'int' | 'currency' | 'percent' | 'decimal'
  const createFromDateValue = createForm.watch('from_date') as string
  const createToDateValue = createForm.watch('to_date') as string
  const createAllowedIntervals = getAllowedIntervals(createFromDateValue, createToDateValue)

  const createGoalMut = useMutation({
    mutationFn: async (input: z.infer<typeof goalInputSchema>) => {
      const scale = input.type === 'int' ? 1 : 100
      const payload = {
        description: input.description,
        from: Math.round(Number(input.from) * scale),
        to: Math.round(Number(input.to) * scale),
        from_date: String(input.from_date ?? ''),
        to_date: String(input.to_date ?? ''),
        type: input.type,
        interval: input.interval,
        objective: String(input.objective ?? 'increase'),
        parent_id: Number((parent as any)?.id ?? 0) || undefined,
      }
      const res = await privateInstance.post('/api:collaborator/goals', payload)
      return res.data
    },
    onSuccess: () => {
      toast.success('Meta criada')
      void qc.invalidateQueries({ queryKey: ['collaborator-my-goal'] })
    },
    onError: (e) => {
      const msg = (e as { message?: string })?.message ?? 'Falha ao criar meta'
      toast.error(msg)
    },
  })

  if (query.isLoading) {
    return (
      <div className='flex flex-col items-center justify-center h-screen'>
        <div className="bg-neutral-50 rounded-lg w-16 h-16 flex items-center justify-center">
          <div className='border rounded-full border-neutral-300 animate-ping w-4 h-4'></div>
        </div>
      </div>
    )
  }

  if (!parent) {
    return (
      <main className='flex flex-col w-full h-full'>
        <Topbar title='Meta' breadcrumbs={[{ label: 'Colaborador', href: '/collaborator', isLast: false }, { label: 'Metas', href: '/collaborator/goals', isLast: true }]} />
        <div className='p-4 flex-1 grid place-items-center'>
          <div className='flex flex-col items-center'>
            <div className='mb-4 text-center'>
              <h1 className='text-2xl font-bold'>Olá, {firstName}!</h1>
              <p className='text-muted-foreground text-sm'>Aguarde seu superior cadastrar a meta pai.</p>
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (!mine) {
    return (
      <main className='flex flex-col w-full h-full'>
        <Topbar title='Meta' breadcrumbs={[{ label: 'Colaborador', href: '/collaborator', isLast: false }, { label: 'Metas', href: '/collaborator/goals', isLast: true }]} />
        <div className='p-4 flex-1 grid place-items-center'>
          <div className='flex flex-col items-center w-full max-w-4xl'>
            <div className='mb-4 text-center'>
              <h1 className='text-2xl font-bold'>Olá, {firstName}!</h1>
              <p className='text-muted-foreground text-sm'>Você ainda não cadastrou sua meta.</p>
            </div>
            <Sheet open={createOpen} onOpenChange={setCreateOpen}>
                  <SheetTrigger asChild>
                    <Button variant='outline'>Definir Meta</Button>
                  </SheetTrigger>
                  <SheetContent className='sm:max-w-xl'>
                    <SheetHeader>
                      <SheetTitle>Definir Meta</SheetTitle>
                    </SheetHeader>
                    <div className='mt-4'>
                      <Form {...createForm}>
                        <form
                          onSubmit={createForm.handleSubmit((values) => createGoalMut.mutate(values as any))}
                          className='flex flex-col gap-4'
                        >
                          <Field>
                              <div className='flex flex-col gap-4'>
                              <div className='flex gap-4'>
                                <FormField
                                  control={createForm.control}
                                  name='objective'
                                  render={({ field }) => (
                                    <FormItem className='w-40'>
                                      <FormLabel>Objetivo</FormLabel>
                                      <Select value={String(field.value ?? '')} onValueChange={field.onChange}>
                                        <SelectTrigger className='w-full'>
                                          <SelectValue placeholder='Objetivo' />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectGroup>
                                            <SelectItem value='increase'>Aumentar</SelectItem>
                                            <SelectItem value='decrease'>Diminuir</SelectItem>
                                            <SelectItem value='maintain'>Manter</SelectItem>
                                          </SelectGroup>
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={createForm.control}
                                  name='description'
                                  render={({ field }) => (
                                    <FormItem className='flex-1'>
                                      <FormLabel>{`${objectiveLabelMap[(createForm.watch('objective') ?? 'increase') as keyof typeof objectiveLabelMap]} o que?`}</FormLabel>
                                      <FormControl>
                                        <Input placeholder='Ex.: Vendas do trimestre' {...field} value={String(field.value ?? '')} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <div className='grid grid-cols-3 gap-4'>
                                <FormField
                                  control={createForm.control}
                                  name='type'
                                  render={({ field }) => (
                                    <FormItem className='w-full'>
                                      <FormLabel>Tipo</FormLabel>
                                      <Select value={String(field.value ?? '')} onValueChange={field.onChange}>
                                        <SelectTrigger className='w-full'>
                                          <SelectValue placeholder='Tipo de meta' />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectGroup>
                                            <SelectItem value='int'>Inteiro</SelectItem>
                                            <SelectItem value='currency'>Moeda</SelectItem>
                                            <SelectItem value='percent'>Percentual</SelectItem>
                                            <SelectItem value='decimal'>Decimal</SelectItem>
                                          </SelectGroup>
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={createForm.control}
                                  name='from'
                                  render={({ field }) => (
                                    <FormItem className='w-full'>
                                      <FormLabel>De</FormLabel>
                                      <FormControl>
                                        <NumericFormat
                                          value={field.value ?? ''}
                                          allowNegative={false}
                                          thousandSeparator='.'
                                          decimalSeparator=','
                                          decimalScale={createTypeValue === 'int' ? 0 : createTypeValue === 'percent' ? 2 : 2}
                                          fixedDecimalScale
                                          suffix={createTypeValue === 'percent' ? ' %' : undefined}
                                          prefix={createTypeValue === 'currency' ? 'R$ ' : undefined}
                                          onValueChange={(values) => field.onChange(values.floatValue ?? 0)}
                                          className='h-9 w-full rounded-md border px-3 py-1 text-sm'
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={createForm.control}
                                  name='to'
                                  render={({ field }) => (
                                    <FormItem className='w-full'>
                                      <FormLabel>Até</FormLabel>
                                      <FormControl>
                                        <NumericFormat
                                          value={field.value ?? ''}
                                          allowNegative={false}
                                          thousandSeparator='.'
                                          decimalSeparator=','
                                          decimalScale={createTypeValue === 'int' ? 0 : createTypeValue === 'percent' ? 2 : 2}
                                          fixedDecimalScale
                                          suffix={createTypeValue === 'percent' ? ' %' : undefined}
                                          prefix={createTypeValue === 'currency' ? 'R$ ' : undefined}
                                          onValueChange={(values) => field.onChange(values.floatValue ?? 0)}
                                          className='h-9 w-full rounded-md border px-3 py-1 text-sm'
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <div className='flex gap-4'>
                                <FormField
                                  control={createForm.control}
                                  name='from_date'
                                  render={({ field }) => (
                                    <FormItem className='w-48'>
                                      <FormLabel>Data inicial</FormLabel>
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <Button type='button' variant='outline' className='justify-start text-left font-normal w-full'>
                                            {field.value ? new Date(field.value).toLocaleDateString('pt-BR') : 'Selecione a data'}
                                          </Button>
                                        </PopoverTrigger>
                                        <PopoverContent align='start' className='w-auto p-0'>
                                          <Calendar
                                            selected={field.value ? new Date(field.value) : undefined}
                                            onSelect={(d) => {
                                              if (d) {
                                                const yyyy = d.getFullYear()
                                                const mm = String(d.getMonth() + 1).padStart(2, '0')
                                                const dd = String(d.getDate()).padStart(2, '0')
                                                field.onChange(`${yyyy}-${mm}-${dd}`)
                                              }
                                            }}
                                          />
                                        </PopoverContent>
                                      </Popover>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={createForm.control}
                                  name='to_date'
                                  render={({ field }) => (
                                    <FormItem className='w-48'>
                                      <FormLabel>Data final</FormLabel>
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <Button type='button' variant='outline' className='justify-start text-left font-normal w-full'>
                                            {field.value ? new Date(field.value).toLocaleDateString('pt-BR') : 'Selecione a data'}
                                          </Button>
                                        </PopoverTrigger>
                                        <PopoverContent align='start' className='w-auto p-0'>
                                          <Calendar
                                            selected={field.value ? new Date(field.value) : undefined}
                                            onSelect={(d) => {
                                              if (d) {
                                                const yyyy = d.getFullYear()
                                                const mm = String(d.getMonth() + 1).padStart(2, '0')
                                                const dd = String(d.getDate()).padStart(2, '0')
                                                field.onChange(`${yyyy}-${mm}-${dd}`)
                                              }
                                            }}
                                          />
                                        </PopoverContent>
                                      </Popover>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={createForm.control}
                                  name='interval'
                                  render={({ field }) => (
                                    <FormItem className='ml-auto w-48'>
                                      <FormLabel>Período</FormLabel>
                                      <Select value={String(field.value ?? '')} onValueChange={field.onChange}>
                                        <SelectTrigger className='w-full'>
                                          <SelectValue placeholder='Período' />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectGroup>
                                            <SelectItem value='daily' disabled={!createAllowedIntervals.includes('daily')}>Diário</SelectItem>
                                            <SelectItem value='weekly' disabled={!createAllowedIntervals.includes('weekly')}>Semanal</SelectItem>
                                            <SelectItem value='bi-weekly' disabled={!createAllowedIntervals.includes('bi-weekly')}>Quinzenal</SelectItem>
                                            <SelectItem value='monthly' disabled={!createAllowedIntervals.includes('monthly')}>Mensal</SelectItem>
                                            <SelectItem value='quarterly' disabled={!createAllowedIntervals.includes('quarterly')}>Trimestral</SelectItem>
                                            <SelectItem value='semiannual' disabled={!createAllowedIntervals.includes('semiannual')}>Semestral</SelectItem>
                                            <SelectItem value='annual' disabled={!createAllowedIntervals.includes('annual')}>Anual</SelectItem>
                                          </SelectGroup>
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>
                          </Field>
                          <div className='flex justify-end'>
                            <Button type='submit' disabled={createGoalMut.isPending}>Salvar</Button>
                          </div>
                        </form>
                      </Form>
                    </div>
                  </SheetContent>
                </Sheet>
          </div>
        </div>
      </main>
    )
  }

  const g = mine as { [k: string]: unknown }
  return (
    <main className='flex flex-col w-full h-full'>
      <Topbar title='Meta' breadcrumbs={[{ label: 'Colaborador', href: '/collaborator', isLast: false }, { label: 'Metas', href: '/collaborator/goals', isLast: true }]} />
      <div className='p-4 flex-1 grid place-items-center'>
        <div className='flex flex-col items-center'>
          <div className='mb-4 text-center'>
            <h1 className='text-2xl font-bold'>Olá, {firstName}!</h1>
            <p className='text-muted-foreground text-sm'>Acompanhe sua meta e desempenho.</p>
          </div>
          <Card className='w-full max-w-4xl'>
            <CardHeader>
              <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                <div className='flex gap-2 sm:justify-end order-1 sm:order-2'>
                  {(() => {
                    const raw = String((g as any)?.status ?? '')
                    return <Badge variant='secondary'>{raw || '—'}</Badge>
                  })()}
                  {(() => {
                    const raw = String((g as any)?.forecast_status ?? '')
                    return <Badge variant='outline'>{raw || '—'}</Badge>
                  })()}
                </div>
                <CardTitle className='text-xl text-left order-2 sm:order-1'>
                  {String((g as any)?.description ?? '')}
                </CardTitle>
              </div>
              <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                <CalendarDays className='size-4' />
                <span>
                  {(() => {
                    const parse = (v: unknown) => {
                      if (typeof v === 'number' && Number.isFinite(v)) return new Date(Number(v))
                      if (typeof v === 'string' && v.length > 0) {
                        const [y, m, d] = v.split('-')
                        return new Date(Number(y), Number(m) - 1, Number(d))
                      }
                      return null
                    }
                    const fd = parse((g as any)?.from_date)
                    const td = parse((g as any)?.to_date)
                    const fl = fd ? fd.toLocaleDateString('pt-BR') : '-'
                    const tl = td ? td.toLocaleDateString('pt-BR') : '-'
                    return `${fl} — ${tl}`
                  })()}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className='grid grid-cols-1 sm:grid-cols-2 lg:flex gap-6 min-w-2xl'>
                <div className='flex flex-col gap-1'>
                  <div className='text-xs leading-tight text-muted-foreground'>De</div>
                  <div className='text-lg leading-tight font-semibold'>
                    {(() => {
                      const t = String((g as any)?.type ?? '')
                      const v = Number((g as any)?.from ?? 0)
                      const n = t === 'int' ? v : v / 100
                      if (t === 'currency') return formatarMoeda(n)
                      if (t === 'percent') return `${n.toFixed(2)} %`
                      if (t === 'decimal') return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
                      return new Intl.NumberFormat('pt-BR').format(n)
                    })()}
                  </div>
                </div>
                <div className='flex flex-col gap-1'>
                  <div className='text-xs leading-tight text-muted-foreground'>Até</div>
                  <div className='text-lg leading-tight font-semibold'>
                    {(() => {
                      const t = String((g as any)?.type ?? '')
                      const v = Number((g as any)?.to ?? 0)
                      const n = t === 'int' ? v : v / 100
                      if (t === 'currency') return formatarMoeda(n)
                      if (t === 'percent') return `${n.toFixed(2)} %`
                      if (t === 'decimal') return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
                      return new Intl.NumberFormat('pt-BR').format(n)
                    })()}
                  </div>
                </div>
                <div className='flex flex-col gap-1'>
                  <div className='text-xs leading-tight text-muted-foreground'>Acumulado</div>
                  <div className='text-lg leading-tight font-semibold'>
                    {(() => {
                      const t = String((g as any)?.type ?? '')
                      const scale = t === 'int' ? 1 : 1 / 100
                      const launches = Array.isArray((g as any)?.launches) ? (((g as any)?.launches ?? []) as Array<{ value?: number }>) : []
                      const sum = launches.reduce((acc, l) => acc + Number(l.value ?? 0) * scale, 0)
                      if (t === 'currency') return formatarMoeda(sum)
                      if (t === 'percent') return `${sum.toFixed(2)} %`
                      if (t === 'decimal') return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(sum)
                      return new Intl.NumberFormat('pt-BR').format(sum)
                    })()}
                  </div>
                </div>
                <div className='flex flex-col gap-1'>
                  <div className='text-xs leading-tight text-muted-foreground'>Previsão</div>
                  <div className='text-lg leading-tight font-semibold'>
                    {(() => {
                      const t = String((g as any)?.type ?? '')
                      const scale = t === 'int' ? 1 : 1 / 100
                      const parseDateMs = (v: unknown) => {
                        if (typeof v === 'number' && Number.isFinite(v)) return Number(v)
                        if (typeof v === 'string' && v.length > 0) {
                          const [y, m, d] = v.split('-')
                          const dt = new Date(Number(y), Number(m) - 1, Number(d))
                          return dt.getTime()
                        }
                        return 0
                      }
                      const fromTs = parseDateMs((g as any)?.from_date)
                      const toTs = parseDateMs((g as any)?.to_date)
                      const nowTs = Date.now()
                      const endTs = Math.min(nowTs, toTs)
                      const launches = Array.isArray((g as any)?.launches) ? (((g as any)?.launches ?? []) as Array<{ value?: number }>) : []
                      const sum = launches.reduce((acc, l) => acc + Number(l.value ?? 0) * scale, 0)
                      const interval = String((g as any)?.interval ?? 'monthly')
                      const clampInt = (n: number) => Math.max(0, Math.floor(n))
                      const diffDays = Math.max(0, Math.floor((endTs - fromTs) / (24 * 60 * 60 * 1000))) + 1
                      let totalPeriods = 1
                      let elapsedPeriods = 1
                      const monthsBetween = (a: number, b: number) => {
                        const da = new Date(a)
                        const db = new Date(b)
                        return (db.getFullYear() - da.getFullYear()) * 12 + (db.getMonth() - da.getMonth()) + 1
                      }
                      if (interval === 'daily') {
                        totalPeriods = clampInt(Math.floor((toTs - fromTs) / (24 * 60 * 60 * 1000)) + 1)
                        elapsedPeriods = clampInt(diffDays)
                      } else if (interval === 'weekly') {
                        totalPeriods = clampInt(Math.round(((toTs - fromTs) / (7 * 24 * 60 * 60 * 1000)) + 1))
                        elapsedPeriods = clampInt(Math.round(diffDays / 7))
                      } else if (interval === 'bi-weekly') {
                        totalPeriods = clampInt(Math.round(((toTs - fromTs) / (14 * 24 * 60 * 60 * 1000)) + 1))
                        elapsedPeriods = clampInt(Math.round(diffDays / 14))
                      } else if (interval === 'monthly') {
                        totalPeriods = clampInt(monthsBetween(fromTs, toTs))
                        elapsedPeriods = clampInt(monthsBetween(fromTs, endTs))
                      } else if (interval === 'quarterly') {
                        totalPeriods = clampInt(Math.round(monthsBetween(fromTs, toTs) / 3))
                        elapsedPeriods = clampInt(Math.round(monthsBetween(fromTs, endTs) / 3))
                      } else if (interval === 'semiannual') {
                        totalPeriods = clampInt(Math.round(monthsBetween(fromTs, toTs) / 6))
                        elapsedPeriods = clampInt(Math.round(monthsBetween(fromTs, endTs) / 6))
                      } else if (interval === 'annual') {
                        totalPeriods = clampInt(Math.round(monthsBetween(fromTs, toTs) / 12))
                        elapsedPeriods = clampInt(Math.round(monthsBetween(fromTs, endTs) / 12))
                      }
                      if (totalPeriods <= 0) totalPeriods = 1
                      if (elapsedPeriods <= 0) elapsedPeriods = 1
                      const avgPerPeriod = sum / elapsedPeriods
                      const forecast = avgPerPeriod * totalPeriods
                      const total = Number((g as any)?.to ?? 0) * scale
                      const pct = total > 0 ? (forecast / total) * 100 : 0
                      const sign = pct >= 0 ? '+' : '-'
                      const color = pct >= 0 ? 'text-green-600' : 'text-red-500'
                      let formatted = ''
                      if (t === 'currency') formatted = formatarMoeda(forecast)
                      else if (t === 'percent') formatted = `${forecast.toFixed(2)} %`
                      else if (t === 'decimal') formatted = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(forecast)
                      else formatted = new Intl.NumberFormat('pt-BR').format(forecast)
                      return (
                        <>
                          <span>{formatted}</span>
                          <span className={`ml-2 text-xs ${color}`}>{sign} {Math.abs(pct).toFixed(1)}%</span>
                        </>
                      )
                    })()}
                  </div>
                </div>
              </div>
              <div className='flex items-center justify-between mt-3'>
                <div className='text-sm font-medium'>Previsão vs Desempenho</div>
                <div className='text-xs text-muted-foreground'>
                  {(() => {
                    const s = String((g as any)?.forecast_status ?? '')
                    const map: Record<string, string> = { good: 'Bom', average: 'Médio', bad: 'Ruim', poor: 'Ruim', excellent: 'Excelente' }
                    const label = map[s] ?? s
                    return <span>Desempenho: {label}</span>
                  })()}
                </div>
              </div>
              <div className='mt-2 h-44 sm:h-56 w-full'>
                {(() => {
                  const scale = (String((g as any).type ?? '') === 'int') ? 1 : 1 / 100
                  const toLabel = (d: Date) => d.toLocaleDateString('pt-BR', { month: 'short' })
                  const preds = Array.isArray((g as any)?.predictions) ? (((g as any)?.predictions ?? []) as Array<{ date: string | number; value?: number }>) : []
                  const launches = Array.isArray((g as any)?.launches) ? (((g as any)?.launches ?? []) as Array<{ date: string | number; value?: number }>) : []
                  const map: Record<string, { label: string; ts: number; forecast?: number; goal?: number }> = {}
                  for (const p of preds) {
                    const d = new Date(p.date as any)
                    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                    const label = toLabel(d)
                    const ts = new Date(d.getFullYear(), d.getMonth(), 1).getTime()
                    map[key] = { ...(map[key] ?? { label, ts }), label, ts, forecast: Number(p.value ?? 0) * scale, goal: map[key]?.goal }
                  }
                  for (const l of launches) {
                    const d = new Date(l.date as any)
                    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                    const label = toLabel(d)
                    const ts = new Date(d.getFullYear(), d.getMonth(), 1).getTime()
                    const existing = map[key] ?? { label, ts }
                    map[key] = { ...existing, label, ts, forecast: existing.forecast, goal: Number(l.value ?? 0) * scale }
                  }
                  const data = Object.values(map).sort((a, b) => a.ts - b.ts)
                  return (
                    <ResponsiveContainer width='100%' height='100%'>
                      <ComposedChart data={data} margin={{ top: 6, right: 12, left: 12, bottom: 8 }}>
                        <defs>
                          <linearGradient id='areaForecast' x1='0' y1='0' x2='0' y2='1'>
                            <stop offset='0%' stopColor='#9ca3af' stopOpacity={0.35} />
                            <stop offset='100%' stopColor='#9ca3af' stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id='areaGoal' x1='0' y1='0' x2='0' y2='1'>
                            <stop offset='0%' stopColor='#d97706' stopOpacity={0.35} />
                            <stop offset='100%' stopColor='#d97706' stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke='hsl(var(--border))' strokeOpacity={0.25} vertical={false} />
                        <XAxis dataKey='label' tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickMargin={8} axisLine={false} tickLine={false} interval={0} padding={{ left: 12, right: 12 }} />
                        <YAxis tick={false} axisLine={false} tickLine={false} width={0} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload || payload.length === 0) return null
                            const seen = new Set<string>()
                            const t = String((g as any)?.type ?? '')
                            const items = [] as { label: string; value: string }[]
                            for (const it of payload as any[]) {
                              const key = String((it as any)?.dataKey ?? (it as any)?.name ?? '')
                              if (!key || seen.has(key)) continue
                              seen.add(key)
                              const v = Number((it as any)?.value ?? 0)
                              const label = key === 'forecast' ? 'Previsão' : 'Meta alcançada'
                              let formatted = ''
                              if (t === 'currency') formatted = formatarMoeda(v)
                              else if (t === 'percent') formatted = `${v.toFixed(2)} %`
                              else if (t === 'decimal') formatted = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)
                              else formatted = new Intl.NumberFormat('pt-BR').format(v)
                              items.push({ label, value: formatted })
                            }
                            return (
                              <div className='border rounded-lg bg-background px-2.5 py-1.5 text-xs shadow-xl'>
                                {items.map((it, idx) => (
                                  <div key={idx} className='flex items-center gap-2'>
                                    <span className='text-muted-foreground'>{it.label}</span>
                                    <span className='font-medium'>{it.value}</span>
                                  </div>
                                ))}
                              </div>
                            )
                          }}
                        />
                        <Area type='monotone' dataKey='forecast' stroke='#9ca3af' strokeWidth={1} fill='url(#areaForecast)' />
                        <Area type='monotone' dataKey='goal' stroke='#d97706' strokeWidth={1} fill='url(#areaGoal)' />
                        <Line type='monotone' dataKey='forecast' stroke='#9ca3af' strokeWidth={1} dot={{ r: 1.5, fill: '#9ca3af' }} activeDot={{ r: 2 }} />
                        <Line type='monotone' dataKey='goal' stroke='#d97706' strokeWidth={1} dot={{ r: 1.5, fill: '#d97706' }} activeDot={{ r: 2 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  )
                })()}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
