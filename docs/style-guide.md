# Guia de Estilo e Padrões de Páginas/Formulários

## 1. Padrões de UI/UX

- Sistema de cores
  - Paleta baseada em variáveis CSS (`oklch`) com suporte a tema claro/escuro.
  - Variáveis principais (trecho):
    - `--background`, `--foreground`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`, `--chart-*`, `--sidebar-*` em `src/index.css:51-83` e tema `dark` em `src/index.css:86-118`.
  - `@theme` mapeia tokens para `--color-*` e `--radius-*` em `src/index.css:13-49`.

- Grade e proporções
  - Layouts usam Tailwind com `grid` e `flex`. Dashboard com sidebar em `src/routes/dashboard/route.tsx` (grid `grid-cols-[240px_1fr]`) e navegação em `src/routes/dashboard/-components/dashboard-sidebar.tsx`.
  - Espaçamentos: componentes reutilizam `gap-*` consistentes (e.g., `FieldGroup` usa `gap-7` em `src/components/ui/field.tsx:47`).

- Componentes reutilizáveis
  - Base shadcn UI adaptada em `src/components/ui/*` (e.g., `button`, `input`, `field`, `form`, `sheet`, `select`, `dialog`, `table`, `tabs`, `sonner`).
  - Exemplos relevantes:
    - `Input` com estados de foco/erro: `src/components/ui/input.tsx:5-21`.
    - Sistema de `Field*` para agrupar rótulos, erros e descrições: `src/components/ui/field.tsx:55-246`.
    - `Form` integrado ao `react-hook-form` para mensagens e acessibilidade: `src/components/ui/form.tsx:1-167`.

- Espaçamento e tipografia
  - Tipos: fontes `Geist` e `Comfortaa` declaradas em `src/index.css:1-9`.
  - Tipografia base aplica `font-geist` e tokens de cor via Tailwind: `src/index.css:120-149`.
  - Rótulos e descrições padronizados em `FieldLabel` e `FieldDescription` com classes utilitárias.

## 2. Implementação de Formulários

- Validações
  - Padrão atual usa `zod` + `@hookform/resolvers/zod` em conjunto com `react-hook-form`.
  - Exemplos:
    - Login: `src/routes/sign-in/-components/login-form.tsx:1-20, 13` valida com `formSchema` em `src/lib/auth.ts:1-8`.
    - Dashboard simplificado: página `brands` com criação/edição em folhas (`Sheet`) e validação zod.

- Padrões de interação
  - Erros: exibidos via `FormMessage` e `FieldDescription`; toasts em operações assíncronas (`sonner`).
  - Submissão: `useMutation` do React Query com toasts de sucesso/erro.
  - Estados de loading: ícones `Loader/Loader2` e `disabled` em botões durante `isPending`.

- Tratamento de estados
  - Loading: loaders visuais e `disabled` em controles (ex.: `new-warranty` e outras folhas `Sheet`).
  - Success/Error: `toast.success` / `toast.error` centralizados; interceptores Axios também geram toasts.

- Integração com APIs
  - Axios com instâncias privada/pública e tratamento global de erros/autenticação.
  - Autenticação: `Authorization Bearer` automático, tratamento 401 (limpa token). Ver `src/lib/auth.ts`.

## 3. Arquitetura Frontend

- Estrutura de pastas
  - `src/components/ui`: biblioteca de UI reutilizável.
  - `src/routes`: páginas (dashboard com apenas `brands`, além de `sign-in` e `user`).
  - `src/lib`: utilitários, cliente de auth/API e formatações.

- Bibliotecas e frameworks
  - React + Vite + TanStack Router/Query.
  - Tailwind v4 (`@tailwindcss/vite`) com CSS design tokens.
  - shadcn UI (componentes base customizados).
  - zod + react-hook-form (+ resolvers) para validação.
  - sonner para toasts.

- Estilização
  - Tailwind com tokens CSS (`@theme` e variáveis); sem CSS Modules/Styled Components.
  - Estilos globais em `src/index.css`.

## 4. Responsividade

- Breakpoints
  - Variantes responsivas Tailwind e container queries em `Field` (`@md/field-group`): `src/components/ui/field.tsx:66-70`.

- Adaptações
  - Sidebar e layouts usam `grid`/`flex` que se adaptam bem; formularios usam `w-full` e inputs com `min-w-0`.

- Performance em mobile
  - Inputs com classes leves; toasts e interações sem bloqueios; scrollbars customizados de baixa espessura (`src/index.css:120-149`).

## Exemplos

- Nova página (TanStack Router)

```tsx
// src/routes/example/index.tsx
import { createFileRoute } from '@tanstack/react-router'

function ExamplePage() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Exemplo</h1>
    </div>
  )
}

export const Route = createFileRoute('/example/')({ component: ExamplePage })
```

- Template de formulário comum (react-hook-form + zod)

```tsx
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Field, FieldDescription, FieldGroup } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

const schema = z.object({ name: z.string().min(1, { message: 'Nome obrigatório' }), email: z.string().email({ message: 'Email inválido' }) })

export function ExampleForm() {
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { name: '', email: '' } })
  const mut = useMutation({ mutationFn: async (values: z.infer<typeof schema>) => values, onSuccess: () => toast.success('Salvo'), onError: () => toast.error('Erro') })

  return (
    <Form {...(form as any)}>
      <form onSubmit={form.handleSubmit((values) => mut.mutate(values))} className="flex flex-col gap-6">
        <FieldGroup>
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input {...field} aria-invalid={!!form.formState.errors?.name} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" {...field} aria-invalid={!!form.formState.errors?.email} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <Field>
            <Button type="submit" disabled={mut.isPending}>Salvar</Button>
            {mut.isPending ? <FieldDescription>Enviando...</FieldDescription> : null}
          </Field>
        </FieldGroup>
      </form>
    </Form>
  )
}
```

- Formulário em Sheet (mobile-friendly)

```tsx
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

const schema = z.object({ name: z.string().min(1), email: z.string().email() })

export function ExampleSheet() {
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { name: '', email: '' } })
  return (
    <Sheet>
      <SheetContent aria-label="Exemplo">
        <Form {...(form as any)}>
          <form onSubmit={form.handleSubmit(() => {})} className="flex flex-col h-full">
            <SheetHeader>
              <SheetTitle>Título</SheetTitle>
              <SheetDescription>Descrição</SheetDescription>
            </SheetHeader>
            <div className="flex-1 grid auto-rows-min gap-6 px-4 py-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="mt-auto border-t p-4">
              <div className="grid grid-cols-2 gap-4">
                <SheetClose asChild>
                  <Button variant="outline" className="w-full">Cancelar</Button>
                </SheetClose>
                <Button type="submit" className="w-full">Salvar</Button>
              </div>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
```

## Especificações Técnicas

- Cores: ver variáveis em `src/index.css:51-83` (claro) e `src/index.css:86-118` (escuro).
- Layout: grids e flex; sidebar de 240px (`grid-cols-[240px_1fr]`).
- Tipografia: `font-geist` e `font-comfortaa` (Google Fonts).
- Componentes UI: `src/components/ui/*` com utilitários `cn`, `cva`, variantes de orientação e container queries.

## Boas Práticas Observadas

- Validação forte com `zod` e integração perfeita com `react-hook-form`.
- Interceptores Axios com toasts e autenticação automática.
- Componentes de formulário acessíveis (`aria-invalid`, `aria-describedby`).
- Organização por domínio em `src/routes/*` com subcomponentes locais.

## Recomendações de Melhoria

- Unificar exibição de mensagens.
- Centralizar endpoints em `src/lib/api.ts`.
- Documentar design tokens.
- Consolidar tabela com paginação/sort como componente único.
- Não adicionar testes neste projeto (política atual do escopo).