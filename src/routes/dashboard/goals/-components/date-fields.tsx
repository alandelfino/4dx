import { FormField, FormItem, FormLabel, FormMessage, FormControl } from '@/components/ui/form'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { Calendar as CalendarIcon } from 'lucide-react'
import { formatDateOnly, toStamp } from './utils'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { useEffect, useMemo } from 'react'
type Period = 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'semiannual' | 'annual'

type Props = { form: any }

export function GoalDateFields({ form }: Props) {
  const fromValue = form.watch('from_date')
  const toValue = form.watch('to_date')
  const allowMap = useMemo<Record<Period, boolean>>(() => {
    const d1 = typeof fromValue === 'number' ? new Date(fromValue) : null
    const d2 = typeof toValue === 'number' ? new Date(toValue) : null
    if (!d1 || !d2 || d2.getTime() < d1.getTime()) {
      return {
        daily: false,
        weekly: false,
        'bi-weekly': false,
        monthly: false,
        quarterly: false,
        semiannual: false,
        annual: false,
      }
    }
    const msPerDay = 24 * 60 * 60 * 1000
    const days = Math.floor((d2.getTime() - d1.getTime()) / msPerDay) + 1
    const baseMonths = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth())
    const fullMonths = d2.getDate() >= d1.getDate() ? baseMonths : baseMonths - 1
    return {
      daily: days >= 1,
      weekly: days >= 7,
      'bi-weekly': days >= 14,
      monthly: fullMonths >= 1,
      quarterly: fullMonths >= 3,
      semiannual: fullMonths >= 6,
      annual: fullMonths >= 12,
    }
  }, [fromValue, toValue])

  useEffect(() => {
    const current = form.getValues()?.period as Period | undefined
    if (current && allowMap && allowMap[current] === false) {
      form.setValue('period', undefined as any, { shouldValidate: true, shouldDirty: true })
    }
  }, [allowMap])

  return (
    <div className="grid grid-cols-3 gap-4">
      <FormField control={form.control as any} name="from_date" render={({ field }) => (
        <FormItem>
          <FormLabel>Data inicial</FormLabel>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formatDateOnly(field.value)}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-auto overflow-hidden p-1">
              <Calendar mode="single" captionLayout="dropdown" selected={typeof field.value === 'number' ? new Date(field.value) : undefined} onSelect={(d) => field.onChange(toStamp(d))} />
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={form.control as any} name="to_date" render={({ field }) => (
        <FormItem>
          <FormLabel>Data final</FormLabel>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formatDateOnly(field.value)}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-auto overflow-hidden p-1">
              <Calendar mode="single" captionLayout="dropdown" selected={typeof field.value === 'number' ? new Date(field.value) : undefined} onSelect={(d) => field.onChange(toStamp(d))} />
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={form.control as any} name="period" render={({ field }) => (
        <FormItem className="justify-self-end w-full">
          <FormLabel>Período</FormLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <FormControl>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="daily" disabled={!allowMap.daily}>Diário</SelectItem>
              <SelectItem value="weekly" disabled={!allowMap.weekly}>Semanal</SelectItem>
              <SelectItem value="bi-weekly" disabled={!allowMap['bi-weekly']}>Quinzenal</SelectItem>
              <SelectItem value="monthly" disabled={!allowMap.monthly}>Mensal</SelectItem>
              <SelectItem value="quarterly" disabled={!allowMap.quarterly}>Trimestral</SelectItem>
              <SelectItem value="semiannual" disabled={!allowMap.semiannual}>Semestral</SelectItem>
              <SelectItem value="annual" disabled={!allowMap.annual}>Anual</SelectItem>
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )} />
    </div>
  )
}