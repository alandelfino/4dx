import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from '@/components/ui/sheet'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { FieldGroup } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { GoalValueFields } from '../../goals/-components/value-fields'
import { GoalDateFields } from '../../goals/-components/date-fields'
import { listGlobalGoalsForCollaborator } from '@/lib/goals'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  form: any
  onSubmit: (values: any) => void
  pending?: boolean
}

export function CreateGoalSheetCollaborator({ open, onOpenChange, form, onSubmit, pending }: Props) {
  useEffect(() => {
    if (!open) {
      try { form.reset() } catch {}
    }
  }, [open])
  const { data: parentGoals } = useQuery({
    queryKey: ['collab-global-goals'],
    queryFn: () => listGlobalGoalsForCollaborator(),
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })
  const globalGoals = Array.isArray(parentGoals) ? parentGoals : []
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent aria-label="Cadastrar meta" className="sm:max-w-2xl w-[88%]">
        <Form {...(form as any)}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            <SheetHeader>
              <SheetTitle>Nova meta</SheetTitle>
              <SheetDescription>Preencha os campos abaixo para cadastrar.</SheetDescription>
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
                <FormField control={form.control as any} name={'parent_id'} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meta Pai</FormLabel>
                    <Select value={field.value != null ? String(field.value) : undefined} onValueChange={(v) => field.onChange(Number(v))}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione a meta pai" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {globalGoals.map((g: any) => (
                          <SelectItem key={g.id} value={String(g.id)}>{g.description}</SelectItem>
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