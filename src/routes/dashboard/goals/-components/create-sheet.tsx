import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from '@/components/ui/sheet'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { FieldGroup } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
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

export function CreateGoalSheet({ open, onOpenChange, form, onSubmit, pending }: Props) {
  useEffect(() => {
    if (!open) {
      try { form.reset() } catch {}
    }
  }, [open])
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