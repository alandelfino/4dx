import { auth, privateInstance } from '@/lib/auth'
import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { ExternalLink, TrendingUp, TrendingDown, TrendingUpDown, Target, EllipsisVertical } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import type { FieldValues, Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

import type { AxiosError } from 'axios'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CalendarDays } from 'lucide-react'
import { formatarMoeda } from '@/lib/format'
import { Topbar } from '../-components/topbar'
import EditGoalSheet from './-components/EditGoalSheet'
import LaunchesSheet from './-components/LaunchesSheet'
import PredictionsSheet from './-components/PredictionsSheet'
import CreateGoalSheet from './-components/CreateGoalSheet'
import { ResponsiveContainer, Tooltip, Area, CartesianGrid, XAxis, YAxis, ComposedChart, Line } from 'recharts'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

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

    const createLaunchMut = useMutation({
        mutationFn: async (input: { value: number; date: string }) => {
            const goalType = String(g?.type ?? 'int')
            const scale = goalType === 'int' ? 1 : 100
            const payload = { value: Math.round(Number(input.value) * scale), date: String(input.date ?? ''), goal_id: Number(g?.id ?? 0) }
            const res = await privateInstance.post(`https://x8ki-letl-twmt.n7.xano.io/api:vz6A_DLw/goal_launches`, payload)
            return res.data
        },
        onSuccess: () => {
            toast.success('Lançamento criado')
            void qc.invalidateQueries({ queryKey: ['open-goal'] })
        },
        onError: (e) => {
            const ax = e as AxiosError<{ message?: string }>
            const msg = ax?.response?.data?.message ?? (e as { message?: string })?.message ?? 'Falha ao criar lançamento'
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
                    <CreateGoalSheet
                        open={open}
                        onOpenChange={setOpen}
                        form={form as unknown as any}
                        onSubmit={(values) => createMut.mutate(values as z.infer<typeof goalInputSchema>)}
                        submitDisabled={createMut.isPending}
                        allowedIntervals={allowedIntervals as unknown as any}
                        typeValue={typeValue}
                    />
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
            <div className='p-4 flex-1'>
                <div className='flex flex-col h-full'>
                    <Card className='w-full h-full'>
                        <CardHeader>
                            <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                                <div className='flex gap-2 sm:justify-end order-1 sm:order-2 w-full'>
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
                                    <div className='flex-1 flex justify-end'>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant='outline' size='icon'>
                                                    <EllipsisVertical className='size-4' />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align='end'>
                                                <DropdownMenuItem onClick={() => setOpen(true)}>Editar Meta</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setLaunchOpen(true)}>Atualizar meta</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setPredOpen(true)}>Modificar Previsões</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
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
                        <CardContent className='w-full'>
                            <div className='grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 w-full'>
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
                            </div>


                        </CardContent>
                        <CardContent>
                            <div className='w-full h-px border-t border-dashed mt-5 mb-12'></div>
                            <div className='flex items-center justify-between'>
                                <div className='text-sm font-medium'>Previsão vs Desempenho</div>
                            </div>
                            <div className='mt-2 h-48 md:h-64 w-full'>
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
                                            <ComposedChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 8 }}>
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
                            <div className='mt-2 flex items-center justify-between'>
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
                                    const fromTs = parseDateMs(g?.from_date)
                                    const toTs = parseDateMs(g?.to_date)

                                    const launches = Array.isArray(g?.launches) ? (g?.launches ?? []) : []
                                    const sum = launches.reduce((acc, l) => acc + Number(l.value ?? 0) * scale, 0)
                                    const interval = String(g?.interval ?? 'monthly')
                                    const clampInt = (n: number) => Math.max(0, Math.floor(n))
                                    const monthsDiff = (a: number, b: number) => {
                                        const da = new Date(a)
                                        const db = new Date(b)
                                        return (db.getFullYear() - da.getFullYear()) * 12 + (db.getMonth() - da.getMonth()) + 1
                                    }
                                    let totalLaunchesForecast = 1
                                    if (interval === 'daily') totalLaunchesForecast = clampInt(Math.floor((toTs - fromTs) / (24 * 60 * 60 * 1000)) + 1)
                                    else if (interval === 'weekly') totalLaunchesForecast = clampInt(Math.round(((toTs - fromTs) / (7 * 24 * 60 * 60 * 1000)) + 1))
                                    else if (interval === 'bi-weekly') totalLaunchesForecast = clampInt(Math.round(((toTs - fromTs) / (14 * 24 * 60 * 60 * 1000)) + 1))
                                    else if (interval === 'monthly') totalLaunchesForecast = clampInt(monthsDiff(fromTs, toTs))
                                    else if (interval === 'quarterly') totalLaunchesForecast = clampInt(Math.round(monthsDiff(fromTs, toTs) / 3))
                                    else if (interval === 'semiannual') totalLaunchesForecast = clampInt(Math.round(monthsDiff(fromTs, toTs) / 6))
                                    else if (interval === 'annual') totalLaunchesForecast = clampInt(Math.round(monthsDiff(fromTs, toTs) / 12))
                                    const countActual = Math.max(1, launches.length)
                                    const avgPerLaunch = sum / countActual
                                    const forecast = avgPerLaunch * totalLaunchesForecast
                                    const total = Number(g?.to ?? 0) * scale
                                    const pct = total > 0 ? (forecast / total) * 100 : 0
                                    const color = pct < 100 ? 'text-red-500' : pct <= 110 ? 'text-amber-500' : 'text-green-600'
                                    const bgColor = pct < 100 ? 'bg-red-50' : pct <= 110 ? 'bg-amber-50' : 'bg-green-50'
                                    let formatted = ''
                                    if (t === 'currency') formatted = formatarMoeda(forecast)
                                    else if (t === 'percent') formatted = `${forecast.toFixed(2)} %`
                                    else if (t === 'decimal') formatted = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(forecast)
                                    else formatted = new Intl.NumberFormat('pt-BR').format(forecast)
                                    let formattedAccum = ''
                                    if (t === 'currency') formattedAccum = formatarMoeda(sum)
                                    else if (t === 'percent') formattedAccum = `${sum.toFixed(2)} %`
                                    else if (t === 'decimal') formattedAccum = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(sum)
                                    else formattedAccum = new Intl.NumberFormat('pt-BR').format(sum)
                                    return (
                                        <div className='grid grid-cols-4 gap-4 w-full'>

                                            <div className={`bg-neutral-100 p-4 rounded-lg text-sm flex items-center col-span-4 sm:col-span-2 md:col-span-2 lg:col-span-1`}>
                                                <div>
                                                    <Target className='size-8 mr-2 text-neutral-600' />
                                                </div>
                                                <div>
                                                    <div className='flex items-center'>
                                                        <span className='mr-2'>Acumulado</span>
                                                    </div>
                                                    <div className='flex items-center gap-2'>
                                                        <span className='font-semibold text-base sm:text-lg text-amber-600'>{formattedAccum}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className={`text-sm p-4 rounded-lg flex items-center col-span-4 sm:col-span-2 md:col-span-2 lg:col-span-1 ${bgColor}`}>
                                                <div>
                                                    {pct < 100 ? (
                                                        <TrendingDown className='size-8 mr-2 text-red-500' />
                                                    ) : pct < 110 ? (
                                                        <TrendingUpDown className='size-8 mr-2 text-amber-500' />
                                                    ) : (
                                                        <TrendingUp className='size-8 mr-2 text-green-600' />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className='flex items-center'>
                                                        <span className='mr-2'>Previsão</span>
                                                    </div>
                                                    <div className='flex items-center gap-2'>
                                                        <span className='font-semibold text-base sm:text-lg'>{formatted}</span>
                                                        <span className={`ml-2 ${color}`}>{Math.abs(pct).toFixed(1)}%</span>
                                                    </div>
                                                </div>
                                            </div>

                                        </div>
                                    )
                                })()}

                            </div>

                        </CardContent>

                    </Card>
                    <EditGoalSheet
                        open={open}
                        onOpenChange={setOpen}
                        canEdit={String((goal as any)?.status ?? '') === 'scheduling' || String((goal as any)?.status ?? '') === 'scheduled'}
                        form={form as unknown as any}
                        onSubmit={(values) => createMut.mutate(values as z.infer<typeof goalInputSchema>)}
                        submitDisabled={createMut.isPending}
                        objectiveLabelMap={objectiveLabelMap}
                        allowedIntervals={allowedIntervals}
                        typeValue={typeValue}
                        showTrigger={false}
                    />
                            <LaunchesSheet
                                open={launchOpen}
                                onOpenChange={setLaunchOpen}
                                items={(Array.isArray(g?.launches) ? (g?.launches ?? []) : []) as Array<{ id: number; value: number; date: string }>}
                                type={String(g?.type ?? 'int') as 'int' | 'currency' | 'percent' | 'decimal'}
                                editingId={editingLaunchId}
                                setEditingId={setEditingLaunchId}
                                editingValue={editingLaunchValue}
                                setEditingValue={setEditingLaunchValue}
                                onUpdate={(payload) => updateLaunchMut.mutate(payload)}
                                predictionDates={(Array.isArray(g?.predictions) ? (g?.predictions ?? []) : []).map((p) => String(p.date))}
                                onCreate={(payload) => createLaunchMut.mutate(payload)}
                                showTrigger={false}
                            />
                    <PredictionsSheet
                        open={predOpen}
                        onOpenChange={setPredOpen}
                        items={(Array.isArray(g?.predictions) ? (g?.predictions ?? []) : []) as Array<{ id: number; value: number; date: string }>}
                        type={String(g?.type ?? 'int') as 'int' | 'currency' | 'percent' | 'decimal'}
                        editingId={editingPredId}
                        setEditingId={setEditingPredId}
                        editingValue={editingValue}
                        setEditingValue={setEditingValue}
                        onUpdate={(payload) => updatePredictionMut.mutate(payload)}
                        showTrigger={false}
                    />
                </div>
            </div>
        </main>
    )
}
