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
import { useState } from "react"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {

  const navigate = useNavigate()
  const [phase, setPhase] = useState<'credentials' | 'sector'>('credentials')
  const [sectors, setSectors] = useState<Array<{ id: number; name: string; profile: 'director' | 'collaborator' }>>([])
  const [userName, setUserName] = useState<string>("")

  const { isPending, mutate } = useMutation({
    mutationFn: auth.login,
    onSuccess: (response) => {
      if (response.status === 200) {
        const data = response.data as any
        if (data?.sectors && Array.isArray(data.sectors)) {
          const arr = data.sectors as any[]
          setUserName(String(data?.user?.name ?? ''))
          setSectors(arr.map((s: any) => ({ id: Number(s.id), name: String(s.name), profile: s.profile === 'director' ? 'director' : 'collaborator' })))
          setPhase('sector')
          if (arr.length === 0) {
            toast.warning('Nenhum setor encontrado para o seu usuário')
          } else {
            toast.success("Selecione seu setor")
          }
          return
        }
        toast.success("Login realizado com sucesso!")
        try {
          const sector = auth.getCurrentSector()
          const profile = sector?.profile
          const to = profile === 'director' ? '/director/dashboard' : '/collaborator'
          navigate({ to })
        } catch {
          navigate({ to: '/director/dashboard' })
        }
      } else {
        const msg = (response as any)?.data?.message
        toast.error(msg ?? 'Credenciais inválidas')
      }
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message
      toast.error(msg ?? 'Credenciais inválidas')
    },
  })

  const { isPending: isSelectingSector, mutate: selectSector } = useMutation({
    mutationFn: async (sectorId: number) => auth.loginWithSector(sectorId, form.getValues()),
    onSuccess: (response) => {
      if (response.status === 200) {
        toast.success("Bem-vindo!")
        try {
          const sector = auth.getCurrentSector()
          const profile = sector?.profile
          const to = profile === 'director' ? '/director/dashboard' : '/collaborator'
          navigate({ to })
        } catch {
          navigate({ to: '/director/dashboard' })
        }
      } else {
        const msg = (response as any)?.data?.message
        toast.error(msg ?? 'Falha ao entrar no setor')
      }
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message
      toast.error(msg ?? 'Falha ao entrar no setor')
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
      {phase === 'credentials' ? (
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
      ) : (
        <div className={cn("flex flex-col gap-6", className)}>
          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="text-2xl font-bold">Olá {userName.split(' ')[0]}!</h1>
            <p className="text-muted-foreground text-sm text-balance">qual setor você deseja acessar?</p>
          </div>
          {sectors.length === 0 ? (
            <div className="rounded-md border p-4 text-center text-muted-foreground">
              Nenhum setor disponível para o seu usuário. Entre em contato com o administrador.
            </div>
          ) : (
            <div className="grid gap-2">
              {sectors.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-md border p-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{s.name}</span>
                    <span className="text-muted-foreground text-xs">{s.profile}</span>
                  </div>
                  <Button variant="outline" disabled={isSelectingSector} onClick={() => selectSector(s.id)}>
                    {isSelectingSector ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Entrar'}
                  </Button>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-center">
            <Button variant="ghost" onClick={() => setPhase('credentials')}>Voltar</Button>
          </div>
        </div>
      )}
    </Form>
  )
}
