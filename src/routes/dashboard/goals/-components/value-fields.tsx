import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import type { GoalValueType } from './utils'
import { NumericFormat } from 'react-number-format'

type Props = {
  form: any
}

export function GoalValueFields({ form }: Props) {
  const t = form.watch('type') as GoalValueType
  const decimalScale = t === 'int' ? 0 : t === 'decimal' ? 4 : 2
  const prefix = t === 'currency' ? 'R$ ' : undefined
  const suffix = t === 'percent' ? '%' : undefined

  return (
    <div className="grid grid-cols-3 gap-4">
      <FormField control={form.control as any} name="type" render={({ field }) => (
        <FormItem>
          <FormLabel>Tipo</FormLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <FormControl>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="int">Inteiro</SelectItem>
              <SelectItem value="decimal">Decimal</SelectItem>
              <SelectItem value="currency">Moeda</SelectItem>
              <SelectItem value="percent">Percentual</SelectItem>
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={form.control as any} name="from" render={({ field }) => (
        <FormItem>
          <FormLabel>De</FormLabel>
          <FormControl>
            <NumericFormat
              customInput={Input}
              className="w-full"
              value={field.value as any}
              onValueChange={({ floatValue }) => field.onChange(floatValue)}
              thousandSeparator="."
              decimalSeparator="," 
              allowNegative
              allowLeadingZeros={false}
              decimalScale={decimalScale as any}
              fixedDecimalScale={t === 'currency' || t === 'percent'}
              prefix={prefix as any}
              suffix={suffix as any}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={form.control as any} name="to" render={({ field }) => (
        <FormItem>
          <FormLabel>Para</FormLabel>
          <FormControl>
            <NumericFormat
              customInput={Input}
              className="w-full"
              value={field.value as any}
              onValueChange={({ floatValue }) => field.onChange(floatValue)}
              thousandSeparator="."
              decimalSeparator="," 
              allowNegative
              allowLeadingZeros={false}
              decimalScale={decimalScale as any}
              fixedDecimalScale={t === 'currency' || t === 'percent'}
              prefix={prefix as any}
              suffix={suffix as any}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />
    </div>
  )
}