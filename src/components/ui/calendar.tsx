import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type CalendarProps = {
  selected?: Date
  onSelect?: (date?: Date) => void
  showOutsideDays?: boolean
  className?: string
  isDisabled?: (date: Date) => boolean
}

export function Calendar({ className, showOutsideDays = true, selected, onSelect, isDisabled }: CalendarProps) {
  const initial = selected ? new Date(selected.getFullYear(), selected.getMonth(), 1) : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const [month, setMonth] = React.useState<Date>(initial)

  const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(month)
  const start = new Date(month.getFullYear(), month.getMonth(), 1)
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 0)
  const startWeekday = start.getDay()
  const daysInMonth = end.getDate()
  const prevMonthEnd = new Date(month.getFullYear(), month.getMonth(), 0)
  const leading = Array.from({ length: startWeekday }, (_, i) => prevMonthEnd.getDate() - startWeekday + i + 1)
  const current = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const cells = [...leading.map((d) => ({ d, outside: true, date: new Date(month.getFullYear(), month.getMonth() - 1, d) })), ...current.map((d) => ({ d, outside: false, date: new Date(month.getFullYear(), month.getMonth(), d) }))]
  const rows = [] as { d: number; outside: boolean; date: Date }[][]
  for (let i = 0; i < Math.ceil(cells.length / 7); i++) rows.push(cells.slice(i * 7, i * 7 + 7))
  const isSameDay = (a?: Date, b?: Date) => !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

  return (
    <div className={cn('p-4', className)}>
      <div className='flex justify-center pt-1 relative items-center'>
        <div className='text-sm font-medium'>{monthLabel}</div>
        <div className='flex items-center absolute left-0'>
          <button type='button' className={cn(buttonVariants({ variant: 'outline' }), 'h-7 w-7 p-0')} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
            <ChevronLeft className='h-4 w-4' />
          </button>
        </div>
        <div className='flex items-center absolute right-0'>
          <button type='button' className={cn(buttonVariants({ variant: 'outline' }), 'h-7 w-7 p-0')} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
            <ChevronRight className='h-4 w-4' />
          </button>
        </div>
      </div>
      <div className='w-full border-collapse'>
        <div className='flex h-8 mt-6'>
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((w) => (
            <div key={w} className='text-muted-foreground rounded-md w-8 font-normal text-[0.8rem] text-center'>
              {w}
            </div>
          ))}
        </div>
        {rows.map((row, idx) => (
          <div key={idx} className='flex w-full mt-1'>
            {row.map((cell, i) => {
              const selectedDay = isSameDay(selected, cell.date)
              const today = isSameDay(new Date(), cell.date)
              const disabled = !!isDisabled?.(cell.date)
              const base = 'h-8 w-8 p-0 font-normal rounded-md flex items-center justify-center cursor-pointer'
              const outsideCls = cell.outside && showOutsideDays ? 'text-muted-foreground opacity-50' : ''
              const selectedCls = selectedDay ? 'bg-primary text-primary-foreground' : ''
              const todayCls = !selectedDay && today ? 'bg-accent text-accent-foreground' : ''
              const disabledCls = disabled ? 'text-muted-foreground opacity-50 cursor-not-allowed' : ''
              const cls = cn(base, outsideCls, selectedCls, todayCls, disabledCls)
              if (!showOutsideDays && cell.outside) return <div key={i} className='w-8' />
              return (
                <div key={i} className='w-8 text-center text-sm p-0 relative'>
                  <button type='button' className={cls} disabled={disabled} onClick={() => { if (!disabled) onSelect?.(cell.date) }}>
                    {cell.d}
                  </button>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}