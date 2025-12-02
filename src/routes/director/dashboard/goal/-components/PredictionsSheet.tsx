import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet'
import { NumericFormat } from 'react-number-format'
import { Check } from 'lucide-react'

type Prediction = { id: number; value: number; date: string }

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: Prediction[]
  type: 'int' | 'currency' | 'percent' | 'decimal'
  editingId: number | null
  setEditingId: (id: number | null) => void
  editingValue: number
  setEditingValue: (v: number) => void
  onUpdate: (payload: { id: number; value: number }) => void
  showTrigger?: boolean
}

export default function PredictionsSheet({ open, onOpenChange, items, type, editingId, setEditingId, editingValue, setEditingValue, onUpdate, showTrigger = true }: Props) {
  const parseYmd = (s: string) => {
    const hasTime = s.includes('T')
    if (hasTime) return new Date(s)
    const [y, m, d] = s.split('-')
    return new Date(Number(y), Number(m) - 1, Number(d))
  }
  const sorted = items.slice().sort((a, b) => parseYmd(a.date).getTime() - parseYmd(b.date).getTime())
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
          <Button variant='outline'>Modificar Previsões</Button>
        </SheetTrigger>
      )}
      <SheetContent className='w-full sm:max-w-xl'>
        <SheetHeader>
          <SheetTitle>Modificar previsões</SheetTitle>
        </SheetHeader>
        <div className='p-4 flex flex-col'>
          <div className='flex flex-col gap-2'>
            <div className='grid grid-cols-3 gap-2 text-xs text-muted-foreground px-2'>
              <div>Data</div>
              <div className='text-center'>Valor</div>
              <div className='text-right'>Ações</div>
            </div>
            <div className='overflow-y-auto space-y-2 max-h-[70vh]'>
              {sorted.map((p) => {
                const isEditing = editingId === p.id
                const displayValue = type === 'int' ? Number(p.value ?? 0) : Number(p.value ?? 0) / 100
                return (
                  <div key={p.id} className='grid grid-cols-3 items-center gap-2 border rounded-md px-2 py-2'>
                    <div className='text-sm'>{parseYmd(p.date).toLocaleDateString('pt-BR')}</div>
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
                              if (ev.key === 'Enter') onUpdate({ id: p.id, value: editingValue })
                            }}
                            className='h-8 w-full rounded-md border px-2 py-1 text-sm'
                          />
                          <Button size='sm' variant='ghost' className='h-8 px-2' onClick={() => onUpdate({ id: p.id, value: editingValue })}>
                            <Check className='size-4 text-green-600' />
                          </Button>
                        </div>
                      ) : (
                        <button type='button' className='w-full text-left' onDoubleClick={() => { setEditingId(p.id); setEditingValue(displayValue) }}>
                          {formatDisplay(Number(p.value ?? 0))}
                        </button>
                      )}
                    </div>
                    <div className='flex items-center justify-end gap-2'>
                      {isEditing ? (
                        <Button size='sm' variant='outline' onClick={() => setEditingId(null)}>Cancelar</Button>
                      ) : (
                        <Button size='sm' variant='outline' onClick={() => { setEditingId(p.id); setEditingValue(displayValue) }}>Editar</Button>
                      )}
                    </div>
                  </div>
                )
              })}
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