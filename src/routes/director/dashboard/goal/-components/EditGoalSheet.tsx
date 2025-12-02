import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { NumericFormat } from 'react-number-format'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import type { FieldValues, UseFormReturn } from 'react-hook-form'
import { Pencil } from 'lucide-react'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  canEdit: boolean
  form: UseFormReturn<FieldValues>
  onSubmit: (values: FieldValues) => void
  submitDisabled: boolean
  objectiveLabelMap: Record<string, string>
  allowedIntervals: string[]
  typeValue: 'int' | 'currency' | 'percent' | 'decimal'
  showTrigger?: boolean
}

export default function EditGoalSheet({ open, onOpenChange, canEdit, form, onSubmit, submitDisabled, objectiveLabelMap, allowedIntervals, typeValue, showTrigger = true }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {showTrigger && (
        <SheetTrigger asChild>
          <Button variant='outline' disabled={!canEdit}>
            <Pencil className='size-4 mr-2' /> Editar Meta
          </Button>
        </SheetTrigger>
      )}
      <SheetContent className='sm:max-w-xl'>
        <SheetHeader>
          <SheetTitle>Atualizar meta</SheetTitle>
        </SheetHeader>
        <div className='p-2'>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='flex flex-col gap-4'>
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
                <Button type='submit' disabled={submitDisabled}>Salvar</Button>
              </SheetFooter>
            </form>
          </Form>
        </div>
      </SheetContent>
    </Sheet>
  )
}