import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet'
import { NumericFormat } from 'react-number-format'
import { Check, RefreshCw, Plus, Pencil, X } from 'lucide-react'

type Launch = { id: number; value: number; date: string }

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: Launch[]
  type: 'int' | 'currency' | 'percent' | 'decimal'
  editingId: number | null
  setEditingId: (id: number | null) => void
  editingValue: number
  setEditingValue: (v: number) => void
  onUpdate: (payload: { id: number; value: number }) => void
  showTrigger?: boolean
  predictionDates: string[]
  onCreate: (payload: { value: number; date: string }) => void
}

export default function LaunchesSheet({ open, onOpenChange, items, type, editingId, setEditingId, editingValue, setEditingValue, onUpdate, showTrigger = true, predictionDates, onCreate }: Props) {
  const parseYmd = (s: string) => {
    const hasTime = s.includes('T')
    if (hasTime) return new Date(s)
    const [y, m, d] = s.split('-')
    return new Date(Number(y), Number(m) - 1, Number(d))
  }
  const sorted = items.slice().sort((a, b) => parseYmd(a.date).getTime() - parseYmd(b.date).getTime())
  const [creating, setCreating] = React.useState(false)
  const [creatingDate, setCreatingDate] = React.useState<string | null>(null)
  const [creatingValue, setCreatingValue] = React.useState<number>(0)
  const formatDisplay = (v: number) => {
    const n = type === 'int' ? v : v / 100
    if (type === 'currency') return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
    if (type === 'percent') return `${n.toFixed(2)} %`
    if (type === 'decimal') return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
    return new Intl.NumberFormat('pt-BR').format(n)
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {showTrigger && (
        <SheetTrigger asChild>
          <Button variant='outline'><RefreshCw className='size-4 mr-2' /> Atualizar meta</Button>
        </SheetTrigger>
      )}
      <SheetContent className='w-full sm:max-w-xl'>
        <SheetHeader>
          <SheetTitle>Modificar lançamentos</SheetTitle>
        </SheetHeader>
        <div className='p-4 flex flex-col'>
          <div className='flex flex-col gap-2'>
            <div className='grid grid-cols-[auto_1fr_auto] sm:grid-cols-3 gap-2 text-xs text-muted-foreground px-2'>
              <div>Data</div>
              <div className='text-center'>Valor</div>
              <div className='text-right'>Ações</div>
            </div>
            <div className='overflow-y-auto space-y-2 max-h-[70vh]'>
              {sorted.map((l) => {
                const isEditing = editingId === l.id
                const displayValue = type === 'int' ? Number(l.value ?? 0) : Number(l.value ?? 0) / 100
                return (
                  <div key={l.id} className='grid grid-cols-[auto_1fr_auto] sm:grid-cols-3 items-center gap-2 border rounded-md px-2 py-2'>
                    <div className='text-sm'>{parseYmd(l.date).toLocaleDateString('pt-BR')}</div>
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
                              if (ev.key === 'Enter') onUpdate({ id: l.id, value: editingValue })
                            }}
                            className='h-8 w-full rounded-md border px-2 py-1 text-sm'
                          />
                          <Button size='sm' variant='ghost' className='h-8 px-2' onClick={() => onUpdate({ id: l.id, value: editingValue })}>
                            <Check className='size-4 text-green-600' />
                          </Button>
                        </div>
                      ) : (
                        <button type='button' className='w-full text-left' onDoubleClick={() => { setEditingId(l.id); setEditingValue(displayValue) }}>
                          {formatDisplay(Number(l.value ?? 0))}
                        </button>
                      )}
                    </div>
                    <div className='flex items-center justify-end gap-2'>
                      {isEditing ? (
                        <>
                          <Button size='icon' variant='ghost' className='sm:hidden' onClick={() => setEditingId(null)}>
                            <X className='size-4' />
                          </Button>
                          <Button size='sm' variant='outline' className='hidden sm:inline-flex' onClick={() => setEditingId(null)}>Cancelar</Button>
                        </>
                      ) : (
                        <>
                          <Button size='icon' variant='ghost' className='sm:hidden' onClick={() => { setEditingId(l.id); setEditingValue(displayValue) }}>
                            <Pencil className='size-4' />
                          </Button>
                          <Button size='sm' variant='outline' className='hidden sm:inline-flex' onClick={() => { setEditingId(l.id); setEditingValue(displayValue) }}>Editar</Button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
              {creating ? (
                <div className='grid grid-cols-[auto_1fr_auto] sm:grid-cols-3 items-center gap-2 border rounded-md px-2 py-2'>
                  <div className='text-sm'>{creatingDate ? new Date(creatingDate).toLocaleDateString('pt-BR') : '-'}</div>
                  <div className='text-sm text-center'>
                    <div className='flex items-center justify-center gap-0'>
                      <NumericFormat
                        autoFocus
                        value={creatingValue}
                        allowNegative={false}
                        thousandSeparator='.'
                        decimalSeparator=','
                        decimalScale={type === 'int' ? 0 : 2}
                        fixedDecimalScale={type !== 'int'}
                        suffix={type === 'percent' ? ' %' : undefined}
                        prefix={type === 'currency' ? 'R$ ' : undefined}
                        onValueChange={(values) => setCreatingValue(values.floatValue ?? 0)}
                        onKeyDown={(ev) => {
                          if (ev.key === 'Enter' && creatingDate) {
                            onCreate({ value: creatingValue, date: creatingDate })
                            setCreating(false)
                            setCreatingDate(null)
                            setCreatingValue(0)
                          }
                        }}
                        className='h-8 w-full rounded-md border px-2 py-1 text-sm'
                      />
                      <Button size='sm' variant='ghost' className='h-8 px-2' onClick={() => {
                        if (creatingDate) {
                          onCreate({ value: creatingValue, date: creatingDate })
                          setCreating(false)
                          setCreatingDate(null)
                          setCreatingValue(0)
                        }
                      }}>
                        <Check className='size-4 text-green-600' />
                      </Button>
                    </div>
                  </div>
                  <div className='flex items-center justify-end gap-2'>
                    <Button size='icon' variant='ghost' className='sm:hidden' onClick={() => { setCreating(false); setCreatingDate(null); setCreatingValue(0) }}>
                      <X className='size-4' />
                    </Button>
                    <Button size='sm' variant='outline' className='hidden sm:inline-flex' onClick={() => { setCreating(false); setCreatingDate(null); setCreatingValue(0) }}>Cancelar</Button>
                  </div>
                </div>
              ) : (
                <div className='grid grid-cols-3 items-center gap-2 px-2 py-2'>
                  <div />
                  <div className='flex justify-center'>
                    <Button size='sm' variant='outline' onClick={() => {
                      const last = sorted.length > 0 ? parseYmd(sorted[sorted.length - 1].date) : null
                      let next: string | null = null
                      const preds = predictionDates.slice().map((d) => parseYmd(d)).sort((a, b) => a.getTime() - b.getTime())
                      if (last) {
                        const found = preds.find((d) => d.getTime() > last.getTime())
                        if (found) next = `${found.getFullYear()}-${String(found.getMonth() + 1).padStart(2, '0')}-${String(found.getDate()).padStart(2, '0')}`
                      }
                      if (!next) {
                        const base = last ?? new Date()
                        const fallback = new Date(base.getFullYear(), base.getMonth() + 1, base.getDate())
                        next = `${fallback.getFullYear()}-${String(fallback.getMonth() + 1).padStart(2, '0')}-${String(fallback.getDate()).padStart(2, '0')}`
                      }
                      setCreating(true)
                      setCreatingDate(next)
                      setCreatingValue(0)
                    }}>
                      <Plus className='size-4 mr-2' /> Adicionar
                    </Button>
                  </div>
                  <div className='flex justify-end' />
                </div>
              )}
            </div>
          </div>
        </div>
        <SheetFooter className='border-t'>
          <SheetClose asChild>
            <Button type='button' variant='outline' className='w-full'>Fechar</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}