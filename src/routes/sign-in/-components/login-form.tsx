import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldGroup } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { useNavigate } from "@tanstack/react-router"
import { auth, formSchema } from "@/lib/auth"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {

  const navigate = useNavigate()

  const { isPending, mutate } = useMutation({
    mutationFn: auth.login,
    onSuccess: (response) => {
      if (response.status === 200) {
        toast.success("Login realizado com sucesso!")
        navigate({ to: "/dashboard/brands" })
      } else {
        toast.error('Credenciais invalidas')
      }
    },
    onError: () => {
      toast.error('Credenciais invalidas')
    },
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "alan_delfino@hotmail.com",
      password: "160512@Adc",
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    mutate(values)
  }

  return (
    <Form {...form}>
      <form className={cn("flex flex-col gap-6", className)} {...props} onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="text-2xl font-bold">Entrar na sua conta</h1>
            <p className="text-muted-foreground text-sm text-balance">
              Insira seu email abaixo para entrar na sua conta
            </p>
          </div>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-mail</FormLabel>
                <FormControl>
                  <Input placeholder="seuemail@exemplo.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Senha</FormLabel>
                <FormControl>
                  <Input placeholder="********" {...field} type="password" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
            ) : (
              "Entrar"
            )}
          </Button>

          <Field>
            <FieldDescription className="text-center">
              Não tem uma conta?{" "}
              <a href="#" className="underline underline-offset-4">
                Cadastre-se
              </a>
            </FieldDescription>
          </Field>
        </FieldGroup>
      </form>
    </Form>
  )
}
