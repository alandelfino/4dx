import z from 'zod'
import { privateInstance } from './auth'

export const goalSchema = z.object({
  id: z.number({ message: 'ID inválido' }).int(),
  created_at: z.union([z.number({ message: 'Data de criação inválida' }), z.string({ message: 'Data de criação inválida' })]),
  updated_at: z.union([z.number({ message: 'Data de atualização inválida' }), z.string({ message: 'Data de atualização inválida' })]),
  description: z.string({ message: 'Descrição é obrigatória' }).min(1, { message: 'Descrição é obrigatória' }),
  from: z.number({ message: 'Valor "De" é obrigatório' }),
  to: z.number({ message: 'Valor "Para" é obrigatório' }),
  from_date: z.number({ message: 'Data inicial é obrigatória' }),
  to_date: z.number({ message: 'Data final é obrigatória' }),
  sector_id: z.number({ message: 'Setor inválido' }).int(),
  company_id: z.number({ message: 'Empresa inválida' }).int(),
  segment_id: z.number({ message: 'Segmento inválido' }).int().optional(),
  type: z.enum(['int', 'decimal', 'currency', 'percent'], { message: 'Tipo inválido' }).optional(),
  period: z.enum(['daily', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'semiannual', 'annual'], { message: 'Período inválido' }).optional(),
  forecast_status: z.enum(['excellent', 'good', 'bad', 'terrible']).optional(),
  status: z.enum(['scheduled', 'started', 'finished']).optional(),
})

export const goalCreateSchema = z.object({
  description: z.string({ message: 'Descrição é obrigatória' }).min(1, { message: 'Descrição é obrigatória' }),
  from: z.number({ message: 'Valor "De" é obrigatório' }),
  to: z.number({ message: 'Valor "Para" é obrigatório' }),
  from_date: z.number({ message: 'Data inicial é obrigatória' }),
  to_date: z.number({ message: 'Data final é obrigatória' }),
  segment_id: z.number({ message: 'Segmento é obrigatório' }).int(),
  type: z.enum(['int', 'decimal', 'currency', 'percent'], { message: 'Tipo inválido' }),
  period: z.enum(['daily', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'semiannual', 'annual'], { message: 'Período é obrigatório' }),
})

export const goalUpdateSchema = z.object({
  description: z.string({ message: 'Descrição é obrigatória' }).min(1, { message: 'Descrição é obrigatória' }),
  from: z.number({ message: 'Valor "De" é obrigatório' }),
  to: z.number({ message: 'Valor "Para" é obrigatório' }),
  from_date: z.number({ message: 'Data inicial é obrigatória' }),
  to_date: z.number({ message: 'Data final é obrigatória' }),
  segment_id: z.number({ message: 'Segmento é obrigatório' }).int(),
  type: z.enum(['int', 'decimal', 'currency', 'percent'], { message: 'Tipo inválido' }),
  period: z.enum(['daily', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'semiannual', 'annual'], { message: 'Período é obrigatório' }),
})

export type Goal = z.infer<typeof goalSchema>
export type GoalCreate = z.infer<typeof goalCreateSchema>
export type GoalUpdate = z.infer<typeof goalUpdateSchema>

export type GoalsResponse = {
  itemsReceived: number
  curPage: number
  nextPage: number | null
  prevPage: number | null
  offset: number
  perPage: number
  itemsTotal: number
  pageTotal: number
  items: Goal[]
}

export async function listGoals(page = 1, perPage = 20): Promise<GoalsResponse> {
  const res = await privateInstance.get(`https://x8ki-letl-twmt.n7.xano.io/api:director/goals`, { params: { page, per_page: perPage } })
  return res.data as GoalsResponse
}

export async function getGoal(id: number): Promise<Goal> {
  const res = await privateInstance.get(`https://x8ki-letl-twmt.n7.xano.io/api:director/goals/${id}`)
  return res.data as Goal
}

export async function createGoal(input: GoalCreate): Promise<Goal> {
  const res = await privateInstance.post(`https://x8ki-letl-twmt.n7.xano.io/api:director/goals`, input)
  return res.data as Goal
}

export async function updateGoal(id: number, input: GoalUpdate): Promise<Goal> {
  const res = await privateInstance.put(`https://x8ki-letl-twmt.n7.xano.io/api:director/goals/${id}`, input)
  return res.data as Goal
}

export async function deleteGoal(id: number): Promise<boolean> {
  const res = await privateInstance.delete(`https://x8ki-letl-twmt.n7.xano.io/api:director/goals/${id}`)
  return Boolean(res.data)
}

export async function listGoalsCollaborator(page = 1, perPage = 20): Promise<GoalsResponse> {
  const res = await privateInstance.get(`/api:collaborator/goals`, { params: { page, per_page: perPage } })
  return res.data as GoalsResponse
}

export async function getGoalCollaborator(id: number): Promise<Goal> {
  const res = await privateInstance.get(`/api:collaborator/goals/${id}`)
  return res.data as Goal
}

export async function createGoalCollaborator(input: GoalCreate): Promise<Goal> {
  const res = await privateInstance.post(`/api:collaborator/goals`, input)
  return res.data as Goal
}

export async function updateGoalCollaborator(id: number, input: GoalUpdate): Promise<Goal> {
  const res = await privateInstance.put(`/api:collaborator/goals/${id}`, input)
  return res.data as Goal
}

export async function deleteGoalCollaborator(id: number): Promise<boolean> {
  const res = await privateInstance.delete(`/api:collaborator/goals/${id}`)
  return Boolean(res.data)
}

export async function listGlobalGoalsForCollaborator(): Promise<Array<{ id: number; description: string }>> {
  const res = await privateInstance.get(`https://x8ki-letl-twmt.n7.xano.io/api:collaborator/global-goals`)
  const data = res.data as any
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.items)) return data.items
  return []
}