import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from '@/components/ui/sheet'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { FieldGroup } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { useQuery } from '@tanstack/react-query'
import { listSegments } from '@/lib/segments'
import { GoalValueFields } from './value-fields'
import { GoalDateFields } from './date-fields'
import { useEffect } from 'react'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  form: any
  onSubmit: (values: any) => void
  pending?: boolean
}

export function EditGoalSheet({ open, onOpenChange, form, onSubmit, pending }: Props) {
  useEffect(() => {
    if (!open) {
      try {
        form.reset({ description: '', from: 0, to: 0, from_date: undefined as any, to_date: undefined as any, type: 'int', period: undefined as any, segment_id: undefined as any })
      } catch {}
    }
  }, [open])
  const { data: segData } = useQuery({
    queryKey: ['segments-options'],
    queryFn: () => listSegments(1, 100),
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })
  const segments = Array.isArray(segData?.items) ? segData!.items : []
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent aria-label="Editar meta" className="sm:max-w-2xl w-[88%]">
        <Form {...(form as any)}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            <SheetHeader>
              <SheetTitle>Editar meta</SheetTitle>
              <SheetDescription>Atualize os dados da meta.</SheetDescription>
            </SheetHeader>
            <div className="flex-1 grid auto-rows-min gap-6 px-4 py-4">
              <FieldGroup>
                <FormField control={form.control as any} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control as any} name={'segment_id'} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Segmento</FormLabel>
                    <Select value={field.value != null ? String(field.value) : undefined} onValueChange={(v) => field.onChange(Number(v))}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione o segmento" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {segments.map((s: any) => (
                          <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <GoalValueFields form={form} />
                <GoalDateFields form={form} />
              </FieldGroup>
            </div>
            <div className="mt-auto border-t p-4">
              <div className="grid grid-cols-2 gap-4">
                <SheetClose asChild>
                  <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>Cancelar</Button>
                </SheetClose>
                <Button type="submit" disabled={pending} className="w-full">Salvar</Button>
              </div>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}