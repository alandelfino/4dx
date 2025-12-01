import { auth, privateInstance } from '@/lib/auth'
import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { ExternalLink, Plus, Pencil, RefreshCw } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import type { FieldValues, Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { NumericFormat } from 'react-number-format'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import type { AxiosError } from 'axios'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CalendarDays, Check } from 'lucide-react'
import { formatarMoeda } from '@/lib/format'
import { Topbar } from '../-components/topbar'
import { ResponsiveContainer, Tooltip, Area, CartesianGrid, XAxis, YAxis, ComposedChart, Line } from 'recharts'

export const Route = createFileRoute('/director/dashboard/goal/')({
    component: RouteComponent,
})

function RouteComponent() {
    const qc = useQueryClient()
    const [open, setOpen] = useState(false)
    const [predOpen, setPredOpen] = useState(false)
    const [editingPredId, setEditingPredId] = useState<number | null>(null)
    const [editingValue, setEditingValue] = useState<number>(0)
    const [launchOpen, setLaunchOpen] = useState(false)
    const [editingLaunchId, setEditingLaunchId] = useState<number | null>(null)
    const [editingLaunchValue, setEditingLaunchValue] = useState<number>(0)

    const objectiveLabelMap = { increase: 'Aumentar', decrease: 'Diminuir', maintain: 'Manter' }
    const statusLabelMap = { scheduled: 'Agendada', running: 'Em andamento', paused: 'Pausada', delayed: 'Atrasada', completed: 'Concluída', canceled: 'Cancelada' } as const
    const forecastStatusLabelMap = { good: 'Bom', neutral: 'Neutro', bad: 'Ruim', unknown: 'Desconhecido' } as const
    const intervalOrder = ['daily', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'semiannual', 'annual'] as const
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
        parent_id: z.preprocess((v) => (v == null || v === '' ? undefined : (typeof v === 'string' ? Number(v) : v)), z.number({ message: 'Meta pai inválida' }).optional()),
        objective: z.enum(['increase', 'decrease', 'maintain'], { message: 'Objetivo inválido' }),
    }).superRefine((val, ctx) => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const parseYmd = (s: string) => {
            const [y, m, d] = String(s ?? '').split('-')
            return new Date(Number(y), Number(m) - 1, Number(d))
        }
        const fd = parseYmd(String(val.from_date ?? ''))
        fd.setHours(0, 0, 0, 0)
        const td = parseYmd(String(val.to_date ?? ''))
        td.setHours(0, 0, 0, 0)
        if (Number.isFinite(fd.getTime()) && fd.getTime() < today.getTime()) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['from_date'], message: 'A data inicial deve ser hoje ou futura' })
        }
        if (Number.isFinite(td.getTime()) && td.getTime() < today.getTime()) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['to_date'], message: 'A data final deve ser hoje ou futura' })
        }
    })
    const form = useForm<FieldValues>({
        resolver: zodResolver(goalInputSchema) as unknown as Resolver<FieldValues>,
        defaultValues: { description: '', from: 0, to: 0, from_date: '', to_date: '', type: 'int', interval: 'monthly', parent_id: undefined, objective: 'increase' },
    })
    const typeValue = form.watch('type') as 'int' | 'currency' | 'percent' | 'decimal'
    const fromDateValue = form.watch('from_date') as string
    const toDateValue = form.watch('to_date') as string
    const allowedIntervals = getAllowedIntervals(fromDateValue, toDateValue)
    const createMut = useMutation({
        mutationFn: async (input: z.infer<typeof goalInputSchema>) => {
            const scale = input.type === 'int' ? 1 : 100
            const payload = {
                ...input,
                from: Math.round(Number(input.from) * scale),
                to: Math.round(Number(input.to) * scale),
                from_date: String(input.from_date ?? ''),
                to_date: String(input.to_date ?? ''),
            }
            const res = await privateInstance.post('/api:director/goals', payload)
            return res.data
        },
        onSuccess: () => {
            toast.success('Meta cadastrada')
            setOpen(false)
            void qc.invalidateQueries({ queryKey: ['open-goal'] })
        },
        onError: (e) => {
            const ax = e as AxiosError<{ message?: string }>
            const msg = ax?.response?.data?.message ?? (e as { message?: string })?.message ?? 'Falha ao cadastrar meta'
            toast.error(msg)
        },
    })
    const query = useQuery<{ [k: string]: unknown } | null>({
        queryKey: ['open-goal'],
        queryFn: async () => {
            const res = await privateInstance.get('/api:director/open-goal')
            return res.data ?? null
        },
    })

    const updatePredictionMut = useMutation({
        mutationFn: async (input: { id: number; value: number }) => {
            const goalType = String(g?.type ?? 'int')
            const scale = goalType === 'int' ? 1 : 100
            const payload = { value: Math.round(Number(input.value) * scale), goal_id: Number(g?.id ?? 0) }
            const res = await privateInstance.put(`https://x8ki-letl-twmt.n7.xano.io/api:E8L0GHE0/goals_predictions/${input.id}`, payload)
            return res.data
        },
        onSuccess: () => {
            toast.success('Previsão atualizada')
            setEditingPredId(null)
            void qc.invalidateQueries({ queryKey: ['open-goal'] })
        },
        onError: (e) => {
            const ax = e as AxiosError<{ message?: string }>
            const msg = ax?.response?.data?.message ?? (e as { message?: string })?.message ?? 'Falha ao atualizar previsão'
            toast.error(msg)
        },
    })

    const updateLaunchMut = useMutation({
        mutationFn: async (input: { id: number; value: number }) => {
            const goalType = String(g?.type ?? 'int')
            const scale = goalType === 'int' ? 1 : 100
            const payload = { value: Math.round(Number(input.value) * scale), goal_id: Number(g?.id ?? 0) }
            const res = await privateInstance.put(`https://x8ki-letl-twmt.n7.xano.io/api:vz6A_DLw/goal_launches/${input.id}`, payload)
            return res.data
        },
        onSuccess: () => {
            toast.success('Lançamento atualizado')
            setEditingLaunchId(null)
            void qc.invalidateQueries({ queryKey: ['open-goal'] })
        },
        onError: (e) => {
            const ax = e as AxiosError<{ message?: string }>
            const msg = ax?.response?.data?.message ?? (e as { message?: string })?.message ?? 'Falha ao atualizar lançamento'
            toast.error(msg)
        },
    })

    const firstName = auth.getCurrentUser()?.name.split(' ')[0]

    if (query.isLoading) {
        return (
            <div className='flex flex-col items-center justify-center h-screen'>
                <div className="bg-neutral-50 rounded-lg w-16 h-16 flex items-center justify-center">
                    <div className='border rounded-full border-neutral-300 animate-ping w-4 h-4'></div>
                </div>
            </div>
        )
    }

    const goal = query.data

    if (!goal) {
        return (
            <div className='flex flex-col items-center justify-center h-screen'>
                <h1 className='text-2xl font-bold'>Olá, {firstName}!</h1>
                <p className="text-muted-foreground text-sm text-balance max-w-xl text-center my-4">
                    Estabelecer uma meta clara e desafiadora é o primeiro passo para guiar sua equipe em direção ao sucesso. Defina agora e inspire todos a alcançarem resultados extraordinários.
                </p>
                <div className='flex gap-4 items-center mt-3'>
                    <Button variant='outline'>Histórico de metas</Button>
                    <Sheet open={open} onOpenChange={setOpen}>
                        <SheetTrigger asChild>
                            <Button><Plus /> Definir Meta</Button>
                        </SheetTrigger>
                        <SheetContent className='sm:max-w-xl'>
                            <SheetHeader>
                                <SheetTitle>Definir meta</SheetTitle>
                            </SheetHeader>
                            <div className='p-4'>
                                <Form {...form}>
                                    <form
                                        id='goal-create-form'
                                        onSubmit={form.handleSubmit((values) => createMut.mutate(values as z.infer<typeof goalInputSchema>))}
                                        className='flex flex-col gap-4'
                                    >
                                        <Field>
                                            <div className='flex flex-col gap-4'>
                                                <div className='flex gap-4'>
                                                    <FormField<FieldValues>
                                                        control={form.control}
                                                        name='description'
                                                        render={({ field }) => (
                                                            <FormItem className='flex-1'>
                                                                <FormLabel>Descrição</FormLabel>
                                                                <FormControl>
                                                                    <Input placeholder='Ex.: Vendas do trimestre' name={field.name} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref} value={String(field.value ?? '')} />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                                <div className='grid grid-cols-3 gap-4'>
                                                    <FormField<FieldValues>
                                                        control={form.control}
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
                                                    <FormField<FieldValues>
                                                        control={form.control}
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
                                                                        decimalScale={typeValue === 'int' ? 0 : typeValue === 'percent' ? 2 : 2}
                                                                        fixedDecimalScale
                                                                        suffix={typeValue === 'percent' ? ' %' : undefined}
                                                                        prefix={typeValue === 'currency' ? 'R$ ' : undefined}
                                                                        onValueChange={(values) => field.onChange(values.floatValue ?? 0)}
                                                                        className='h-9 w-full rounded-md border px-3 py-1 text-sm'
                                                                    />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField<FieldValues>
                                                        control={form.control}
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
                                                                        decimalScale={typeValue === 'int' ? 0 : typeValue === 'percent' ? 2 : 2}
                                                                        fixedDecimalScale
                                                                        suffix={typeValue === 'percent' ? ' %' : undefined}
                                                                        prefix={typeValue === 'currency' ? 'R$ ' : undefined}
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
                                                    <FormField<FieldValues>
                                                        control={form.control}
                                                        name='from_date'
                                                        render={({ field }) => (
                                                            <FormItem className='w-48'>
                                                                <FormLabel>Data inicial</FormLabel>
                                                                <Popover>
                                                                    <PopoverTrigger asChild>
                                                                        <Button type='button' variant='outline' className='justify-start text-left font-normal w-full'>
                                                                            {field.value ? (() => { const [y, m, d] = String(field.value).split('-'); return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('pt-BR') })() : 'Selecione a data'}
                                                                        </Button>
                                                                    </PopoverTrigger>
                                                                    <PopoverContent align='start' className='w-auto p-0'>
                                                                        <Calendar
                                                                            selected={field.value ? (() => { const [y, m, d] = String(field.value).split('-'); return new Date(Number(y), Number(m) - 1, Number(d)) })() : undefined}
                                                                            isDisabled={(date) => {
                                                                                const today = new Date()
                                                                                today.setHours(0, 0, 0, 0)
                                                                                const pick = new Date(date)
                                                                                pick.setHours(0, 0, 0, 0)
                                                                                return pick.getTime() < today.getTime()
                                                                            }}
                                                                            onSelect={(d) => {
                                                                                if (d) {
                                                                                    const pick = new Date(d)
                                                                                    pick.setHours(0, 0, 0, 0)
                                                                                    const today = new Date()
                                                                                    today.setHours(0, 0, 0, 0)
                                                                                    if (pick.getTime() < today.getTime()) return
                                                                                    const yyyy = pick.getFullYear()
                                                                                    const mm = String(pick.getMonth() + 1).padStart(2, '0')
                                                                                    const dd = String(pick.getDate()).padStart(2, '0')
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
                                                    <FormField<FieldValues>
                                                        control={form.control}
                                                        name='to_date'
                                                        render={({ field }) => (
                                                            <FormItem className='w-48'>
                                                                <FormLabel>Data final</FormLabel>
                                                                <Popover>
                                                                    <PopoverTrigger asChild>
                                                                        <Button type='button' variant='outline' className='justify-start text-left font-normal w-full'>
                                                                            {field.value ? (() => { const [y, m, d] = String(field.value).split('-'); return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('pt-BR') })() : 'Selecione a data'}
                                                                        </Button>
                                                                    </PopoverTrigger>
                                                                    <PopoverContent align='start' className='w-auto p-0'>
                                                                        <Calendar
                                                                            selected={field.value ? (() => { const [y, m, d] = String(field.value).split('-'); return new Date(Number(y), Number(m) - 1, Number(d)) })() : undefined}
                                                                            isDisabled={(date) => {
                                                                                const today = new Date()
                                                                                today.setHours(0, 0, 0, 0)
                                                                                const pick = new Date(date)
                                                                                pick.setHours(0, 0, 0, 0)
                                                                                return pick.getTime() < today.getTime()
                                                                            }}
                                                                            onSelect={(d) => {
                                                                                if (d) {
                                                                                    const pick = new Date(d)
                                                                                    pick.setHours(0, 0, 0, 0)
                                                                                    const today = new Date()
                                                                                    today.setHours(0, 0, 0, 0)
                                                                                    if (pick.getTime() < today.getTime()) return
                                                                                    const yyyy = pick.getFullYear()
                                                                                    const mm = String(pick.getMonth() + 1).padStart(2, '0')
                                                                                    const dd = String(pick.getDate()).padStart(2, '0')
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
                                                    <FormField<FieldValues>
                                                        control={form.control}
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
                                                                            <SelectItem value='daily' disabled={!allowedIntervals.includes('daily')}>Diário</SelectItem>
                                                                            <SelectItem value='weekly' disabled={!allowedIntervals.includes('weekly')}>Semanal</SelectItem>
                                                                            <SelectItem value='bi-weekly' disabled={!allowedIntervals.includes('bi-weekly')}>Quinzenal</SelectItem>
                                                                            <SelectItem value='monthly' disabled={!allowedIntervals.includes('monthly')}>Mensal</SelectItem>
                                                                            <SelectItem value='quarterly' disabled={!allowedIntervals.includes('quarterly')}>Trimestral</SelectItem>
                                                                            <SelectItem value='semiannual' disabled={!allowedIntervals.includes('semiannual')}>Semestral</SelectItem>
                                                                            <SelectItem value='annual' disabled={!allowedIntervals.includes('annual')}>Anual</SelectItem>
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
                                    </form>
                                </Form>
                            </div>
                            <SheetFooter className='grid grid-cols-2 justify-end border-t'>
                                <SheetClose asChild className='w-full'>
                                    <Button type='button' variant='outline'>Cancelar</Button>
                                </SheetClose>
                                <Button className="w-full" type='submit' form='goal-create-form' disabled={createMut.isPending}>Cadastrar</Button>
                            </SheetFooter>
                        </SheetContent>
                    </Sheet>
                </div>
                <Button variant='link' className='mt-4 font-normal'>Saber mais <ExternalLink /> </Button>
            </div>
        )
    }

    type Goal = {
        id: number
        created_at: number
        updated_at: number
        description: string
        from: number
        to: number
        from_date: number
        to_date: number
        sector_id: number
        company_id: number
        type: 'int' | 'currency' | 'percent' | 'decimal'
        interval: 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'semiannual' | 'annual'
        forecast_status: string
        status: string
        parent_id: number
        objective: 'increase' | 'decrease' | 'maintain'
        predictions?: { id: number; value: number; goal_id: number; date: string; company_id: number }[]
        launches?: { id: number; value: number; goal_id: number; date: string; company_id: number }[]
    }
    const g = goal as Goal

    return (
        <main className='flex flex-col w-full h-full'>
            <Topbar title='Meta' breadcrumbs={[{ label: 'Dashboard', href: '/director/dashboard', isLast: false }, { label: 'Meta', href: '/director/dashboard/goal', isLast: true }]} />
            <div className='p-4 flex-1 grid place-items-center'>
                <div className='flex flex-col items-center'>
                    <div className='mb-4 text-center'>
                        <h1 className='text-2xl font-bold'>Olá, {firstName}!</h1>
                        <p className='text-muted-foreground text-sm'>Vamos transformar metas em resultados. Você está no comando.</p>
                    </div>
                    <Card className='w-full max-w-4xl'>
                        <CardHeader>
                            <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                                <div className='flex gap-2 sm:justify-end order-1 sm:order-2'>
                                    {(() => {
                                        const raw = String(g?.status ?? '') as keyof typeof statusLabelMap
                                        const label = statusLabelMap[raw] ?? raw
                                        return <Badge variant='secondary'>{label}</Badge>
                                    })()}
                                    {(() => {
                                        const raw = String(g?.forecast_status ?? '') as keyof typeof forecastStatusLabelMap
                                        const label = forecastStatusLabelMap[raw] ?? raw
                                        return <Badge variant='outline'>{label}</Badge>
                                    })()}
                                </div>
                                <CardTitle className='text-xl text-left order-2 sm:order-1'>
                                    {String(g?.description ?? '')}
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
                                            const t = String(g?.type ?? '')
                                            const v = Number(g?.from ?? 0)
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
                                            const t = String(g?.type ?? '')
                                            const v = Number(g?.to ?? 0)
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
                                    <div className='text-lg leading-tight font-semibold text-amber-600'>
                                        {(() => {
                                            const t = String(g?.type ?? '')
                                            const scale = t === 'int' ? 1 : 1 / 100
                                            const launches = Array.isArray(g?.launches) ? (g?.launches ?? []) : []
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
                                            const t = String(g?.type ?? '')
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
                                            const launches = Array.isArray(g?.launches) ? (g?.launches ?? []) : []
                                            const sum = launches.reduce((acc, l) => acc + Number(l.value ?? 0) * scale, 0)
                                            const interval = String(g?.interval ?? 'monthly')
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
                                            const total = Number(g?.to ?? 0) * scale
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
                            <div className='mt-3'>
                                {(() => {
                                    const t = String(g?.type ?? '')
                                    const scale = t === 'int' ? 1 : 1 / 100
                                    const total = Number(g?.to ?? 0) * scale
                                    const launches = Array.isArray(g?.launches) ? (g?.launches ?? []) : []
                                    const sum = launches.reduce((acc, l) => acc + Number(l.value ?? 0) * scale, 0)
                                    const progressPct = total > 0 ? Math.min(100, Math.max(0, (sum / total) * 100)) : 0
                                    const remainingPct = Math.max(0, 100 - progressPct)
                                    return (
                                        <div className='flex flex-col gap-1'>
                                            <div className='flex items-center justify-between text-xs text-muted-foreground'>
                                                <span>Progresso: {progressPct.toFixed(1)}%</span>
                                                <span>Faltante: {remainingPct.toFixed(1)}%</span>
                                            </div>
                                            <div className='h-2 w-full rounded-full bg-muted'>
                                                <div className='h-full rounded-full bg-amber-500' style={{ width: `${progressPct}%` }} />
                                            </div>
                                        </div>
                                    )
                                })()}
                            </div>
                            <div className='mt-2 text-sm text-muted-foreground'>
                                {(() => {
                                    const pRaw = (g?.interval as Interval | undefined) ?? ((goal as { period?: Interval } | null)?.period)
                                    const p = String(pRaw ?? '') as 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'semiannual' | 'annual'
                                    const map = { 'daily': 'Diário', 'weekly': 'Semanal', 'bi-weekly': 'Quinzenal', 'monthly': 'Mensal', 'quarterly': 'Trimestral', 'semiannual': 'Semestral', 'annual': 'Anual' }
                                    const label = map[p] ?? p
                                    return <span>Período: {label}</span>
                                })()}
                            </div>
                        </CardContent>
                        <CardContent>
                            <div className='flex items-center justify-between'>
                                <div className='text-sm font-medium'>Previsão vs Desempenho</div>
                                <div className='text-xs text-muted-foreground'>
                                    {(() => {
                                        const s = String(g?.forecast_status ?? '')
                                        const map: Record<string, string> = { good: 'Bom', average: 'Médio', bad: 'Ruim', poor: 'Ruim', excellent: 'Excelente' }
                                        const label = map[s] ?? s
                                        return <span>Desempenho: {label}</span>
                                    })()}
                                </div>
                            </div>
                            <div className='mt-2 h-44 sm:h-56 w-full'>
                                {(() => {
                                    const scale = (String(g.type ?? '') === 'int') ? 1 : 1 / 100
                                    const toLabel = (d: Date) => d.toLocaleDateString('pt-BR', { month: 'short' })
                                    const preds = Array.isArray(g?.predictions) ? (g?.predictions ?? []) : []
                                    const launches = Array.isArray(g?.launches) ? (g?.launches ?? []) : []
                                    const map: Record<string, { label: string; ts: number; forecast?: number; goal?: number }> = {}
                                    for (const p of preds) {
                                        const d = new Date(p.date)
                                        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                                        const label = toLabel(d)
                                        const ts = new Date(d.getFullYear(), d.getMonth(), 1).getTime()
                                        map[key] = { ...(map[key] ?? { label, ts }), label, ts, forecast: Number(p.value ?? 0) * scale, goal: map[key]?.goal }
                                    }
                                    for (const l of launches) {
                                        const d = new Date(l.date)
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
                                                        const t = String(g?.type ?? '')
                                                        const items = [] as { label: string; value: string }[]
                                                        for (const it of payload) {
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
                    <div className='flex flex-wrap gap-2 items-center justify-center mt-6'>
                        <Sheet open={open} onOpenChange={setOpen}>
                            <SheetTrigger asChild>
                                <Button
                                    variant='outline'
                                    disabled={!(String((goal as any)?.status ?? '') === 'scheduling' || String((goal as any)?.status ?? '') === 'scheduled')}
                                >
                                    <Pencil className='size-4 mr-2' /> Editar Meta
                                </Button>
                            </SheetTrigger>
                            <SheetContent className='sm:max-w-xl'>
                                <SheetHeader>
                                    <SheetTitle>Atualizar meta</SheetTitle>
                                </SheetHeader>
                                <div className='p-2'>
                                    <Form {...form}>
                                        <form
                                            onSubmit={form.handleSubmit((values) => createMut.mutate(values as z.infer<typeof goalInputSchema>))}
                                            className='flex flex-col gap-4'
                                        >
                                            <Field>
                                                <div className='flex flex-col gap-4'>
                                                    <div className='flex gap-4'>
                                                        <FormField<FieldValues>
                                                            control={form.control}
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
                                                        <FormField<FieldValues>
                                                            control={form.control}
                                                            name='description'
                                                            render={({ field }) => (
                                                                <FormItem className='flex-1'>
                                                                    <FormLabel>{`${objectiveLabelMap[(form.watch('objective') ?? 'increase') as keyof typeof objectiveLabelMap]} o que?`}</FormLabel>
                                                                    <FormControl>
                                                                        <Input placeholder='Ex.: Vendas do trimestre' name={field.name} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref} value={String(field.value ?? '')} />
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </div>
                                                    <div className='grid grid-cols-3 gap-4'>
                                                        <FormField<FieldValues>
                                                            control={form.control}
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
                                                        <FormField<FieldValues>
                                                            control={form.control}
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
                                                                            decimalScale={typeValue === 'int' ? 0 : typeValue === 'percent' ? 2 : 2}
                                                                            fixedDecimalScale
                                                                            suffix={typeValue === 'percent' ? ' %' : undefined}
                                                                            prefix={typeValue === 'currency' ? 'R$ ' : undefined}
                                                                            onValueChange={(values) => field.onChange(values.floatValue ?? 0)}
                                                                            className='h-9 w-full rounded-md border px-3 py-1 text-sm'
                                                                        />
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                        <FormField<FieldValues>
                                                            control={form.control}
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
                                                                            decimalScale={typeValue === 'int' ? 0 : typeValue === 'percent' ? 2 : 2}
                                                                            fixedDecimalScale
                                                                            suffix={typeValue === 'percent' ? ' %' : undefined}
                                                                            prefix={typeValue === 'currency' ? 'R$ ' : undefined}
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
                                                        <FormField<FieldValues>
                                                            control={form.control}
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
                                                        <FormField<FieldValues>
                                                            control={form.control}
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
                                                        <FormField<FieldValues>
                                                            control={form.control}
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
                                                                                <SelectItem value='daily' disabled={!allowedIntervals.includes('daily')}>Diário</SelectItem>
                                                                                <SelectItem value='weekly' disabled={!allowedIntervals.includes('weekly')}>Semanal</SelectItem>
                                                                                <SelectItem value='bi-weekly' disabled={!allowedIntervals.includes('bi-weekly')}>Quinzenal</SelectItem>
                                                                                <SelectItem value='monthly' disabled={!allowedIntervals.includes('monthly')}>Mensal</SelectItem>
                                                                                <SelectItem value='quarterly' disabled={!allowedIntervals.includes('quarterly')}>Trimestral</SelectItem>
                                                                                <SelectItem value='semiannual' disabled={!allowedIntervals.includes('semiannual')}>Semestral</SelectItem>
                                                                                <SelectItem value='annual' disabled={!allowedIntervals.includes('annual')}>Anual</SelectItem>
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
                                            <SheetFooter>
                                                <Button type='submit' disabled={createMut.isPending}>Salvar</Button>
                                            </SheetFooter>
                                        </form>
                                    </Form>
                                </div>
                            </SheetContent>
                        </Sheet>
                        <div className='contents'>
                            <Sheet open={launchOpen} onOpenChange={setLaunchOpen}>
                                <SheetTrigger asChild>
                                    <Button variant='outline'><RefreshCw className='size-4 mr-2' /> Atualizar meta</Button>
                                </SheetTrigger>
                                <SheetContent className='w-full sm:max-w-xl'>
                                    <SheetHeader>
                                        <SheetTitle>Modificar lançamentos</SheetTitle>
                                    </SheetHeader>
                                    <div className='p-4 flex flex-col'>
                                        {(() => {
                                            const goalRaw = query.data as any
                                            const items = (Array.isArray(goalRaw?.launches) ? (goalRaw?.launches ?? []) : []) as Array<{ id: number; value: number; date: string }>
                                            const type = String(goalRaw?.type ?? 'int') as 'int' | 'currency' | 'percent' | 'decimal'
                                            const sorted = items.slice().sort((a: { date: string }, b: { date: string }) => new Date(a.date).getTime() - new Date(b.date).getTime())
                                            const formatDisplay = (v: number) => {
                                                const n = type === 'int' ? v : v / 100
                                                if (type === 'currency') return formatarMoeda(n)
                                                if (type === 'percent') return `${n.toFixed(2)} %`
                                                if (type === 'decimal') return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
                                                return new Intl.NumberFormat('pt-BR').format(n)
                                            }
                                            return (
                                                <div className='flex flex-col gap-2'>
                                                    <div className='grid grid-cols-3 gap-2 text-xs text-muted-foreground px-2'>
                                                        <div>Data</div>
                                                        <div className='text-center'>Valor</div>
                                                        <div className='text-right'>Ações</div>
                                                    </div>
                                                    <div className='overflow-y-auto space-y-2 max-h-[70vh]'>
                                                        {sorted.map((l: { id: number; value: number; date: string }) => {
                                                            const isEditing = editingLaunchId === l.id
                                                            const displayValue = type === 'int' ? Number(l.value ?? 0) : Number(l.value ?? 0) / 100
                                                            return (
                                                                <div key={l.id} className='grid grid-cols-3 items-center gap-2 border rounded-md px-2 py-2'>
                                                                    <div className='text-sm'>{new Date(l.date).toLocaleDateString('pt-BR')}</div>
                                                                    <div className='text-sm text-center'>
                                                                        {isEditing ? (
                                                                            <div className='flex items-center justify-center gap-0'>
                                                                                <NumericFormat
                                                                                    autoFocus
                                                                                    value={editingLaunchValue}
                                                                                    allowNegative={false}
                                                                                    thousandSeparator='.'
                                                                                    decimalSeparator=','
                                                                                    decimalScale={type === 'int' ? 0 : 2}
                                                                                    fixedDecimalScale={type !== 'int'}
                                                                                    suffix={type === 'percent' ? ' %' : undefined}
                                                                                    prefix={type === 'currency' ? 'R$ ' : undefined}
                                                                                    onValueChange={(values) => setEditingLaunchValue(values.floatValue ?? 0)}
                                                                                    onKeyDown={(ev) => {
                                                                                        if (ev.key === 'Enter') updateLaunchMut.mutate({ id: l.id, value: editingLaunchValue })
                                                                                    }}
                                                                                    className='h-8 w-full rounded-md border px-2 py-1 text-sm'
                                                                                />
                                                                                <Button size='sm' variant='ghost' className='h-8 px-2' onClick={() => updateLaunchMut.mutate({ id: l.id, value: editingLaunchValue })}>
                                                                                    <Check className='size-4 text-green-600' />
                                                                                </Button>
                                                                            </div>
                                                                        ) : (
                                                                            <button
                                                                                type='button'
                                                                                className='w-full text-left'
                                                                                onDoubleClick={() => { setEditingLaunchId(l.id); setEditingLaunchValue(displayValue) }}
                                                                            >
                                                                                {formatDisplay(Number(l.value ?? 0))}
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                    <div className='flex items-center justify-end gap-2'>
                                                                        {isEditing ? (
                                                                            <Button size='sm' variant='outline' onClick={() => setEditingLaunchId(null)}>Cancelar</Button>
                                                                        ) : (
                                                                            <Button size='sm' variant='outline' onClick={() => { setEditingLaunchId(l.id); setEditingLaunchValue(displayValue) }}>Editar</Button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            )
                                        })()}
                                    </div>
                                    <SheetFooter className='border-t'>
                                        <SheetClose asChild>
                                            <Button type='button' variant='outline' className='w-full'>Fechar</Button>
                                        </SheetClose>
                                    </SheetFooter>
                                </SheetContent>
                            </Sheet>
                            <Sheet open={predOpen} onOpenChange={setPredOpen}>
                                <SheetTrigger asChild>
                                    <Button variant='outline'>Modificar Previsões</Button>
                                </SheetTrigger>
                                <SheetContent className='w-full sm:max-w-xl'>
                                    <SheetHeader>
                                        <SheetTitle>Modificar previsões</SheetTitle>
                                    </SheetHeader>
                                    <div className='p-4 flex flex-col'>
                                        {(() => {
                                            const items = Array.isArray(g?.predictions) ? (g?.predictions ?? []) : []
                                            const type = String(g?.type ?? 'int') as 'int' | 'currency' | 'percent' | 'decimal'
                                            const sorted = items.slice().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                                            const formatDisplay = (v: number) => {
                                                const n = type === 'int' ? v : v / 100
                                                if (type === 'currency') return formatarMoeda(n)
                                                if (type === 'percent') return `${n.toFixed(2)} %`
                                                if (type === 'decimal') return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
                                                return new Intl.NumberFormat('pt-BR').format(n)
                                            }
                                            return (
                                                <div className='flex flex-col gap-2'>
                                                    <div className='grid grid-cols-3 gap-2 text-xs text-muted-foreground px-2'>
                                                        <div>Data</div>
                                                        <div className='text-center'>Valor</div>
                                                        <div className='text-right'>Ações</div>
                                                    </div>
                                                    <div className='overflow-y-auto space-y-2 max-h-[70vh]'>
                                                        {sorted.map((p) => {
                                                            const isEditing = editingPredId === p.id
                                                            const displayValue = type === 'int' ? Number(p.value ?? 0) : Number(p.value ?? 0) / 100
                                                            return (
                                                                <div key={p.id} className='grid grid-cols-3 items-center gap-2 border rounded-md px-2 py-2'>
                                                                    <div className='text-sm'>{new Date(p.date).toLocaleDateString('pt-BR')}</div>
                                                                    <div className='text-sm text-center'>
                                                                        {isEditing ? (
                                                                            <div className='flex items-center justify-center gap-0'>
                                                                                <NumericFormat
                                                                                    autoFocus
                                                                                    value={editingValue}
                                                                                    allowNegative={false}
                                                                                    thousandSeparator='.'
                                                                                    decimalSeparator=','
                                                                                    decimalScale={type === 'int' ? 0 : 2}
                                                                                    fixedDecimalScale={type !== 'int'}
                                                                                    suffix={type === 'percent' ? ' %' : undefined}
                                                                                    prefix={type === 'currency' ? 'R$ ' : undefined}
                                                                                    onValueChange={(values) => setEditingValue(values.floatValue ?? 0)}
                                                                                    onKeyDown={(ev) => {
                                                                                        if (ev.key === 'Enter') updatePredictionMut.mutate({ id: p.id, value: editingValue })
                                                                                    }}
                                                                                    className='h-8 w-full rounded-md border px-2 py-1 text-sm'
                                                                                />
                                                                                <Button size='sm' variant='ghost' className='h-8 px-2' onClick={() => updatePredictionMut.mutate({ id: p.id, value: editingValue })}>
                                                                                    <Check className='size-4 text-green-600' />
                                                                                </Button>
                                                                            </div>
                                                                        ) : (
                                                                            <button
                                                                                type='button'
                                                                                className='w-full text-left'
                                                                                onDoubleClick={() => { setEditingPredId(p.id); setEditingValue(displayValue) }}
                                                                            >
                                                                                {formatDisplay(Number(p.value ?? 0))}
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                    <div className='flex items-center justify-end gap-2'>
                                                                        {isEditing ? (
                                                                            <Button size='sm' variant='outline' onClick={() => setEditingPredId(null)}>Cancelar</Button>
                                                                        ) : (
                                                                            <Button size='sm' variant='outline' onClick={() => { setEditingPredId(p.id); setEditingValue(displayValue) }}>Editar</Button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            )
                                        })()}
                                    </div>
                                    <SheetFooter className='border-t'>
                                        <SheetClose asChild>
                                            <Button type='button' variant='outline' className='w-full'>Fechar</Button>
                                        </SheetClose>
                                    </SheetFooter>
                                </SheetContent>
                            </Sheet>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    )
}
