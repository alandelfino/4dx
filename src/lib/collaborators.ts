import z from 'zod'
import { privateInstance } from './auth'

export const collaboratorSchema = z.object({
  id: z.number({ message: 'ID inválido' }).int(),
  created_at: z.union([z.number({ message: 'Data de criação inválida' }).int(), z.string({ message: 'Data de criação inválida' })]),
  name: z.string({ message: 'Nome é obrigatório' }).min(1, { message: 'Nome é obrigatório' }),
  email: z.string().email('E-mail inválido'),
  profile: z.enum(['director', 'collaborator'], { message: 'Perfil inválido' }),
})

export const collaboratorInputSchema = z.object({
  name: z.string({ message: 'Nome é obrigatório' }).min(1, { message: 'Nome é obrigatório' }),
  email: z.string().email('E-mail inválido'),
  profile: z.enum(['director', 'collaborator'], { message: 'Perfil inválido' }),
})

export type Collaborator = z.infer<typeof collaboratorSchema>
export type CollaboratorInput = z.infer<typeof collaboratorInputSchema>

export type CollaboratorsResponse = {
  itemsReceived: number
  curPage: number
  nextPage: number | null
  prevPage: number | null
  offset: number
  perPage: number
  itemsTotal: number
  pageTotal: number
  items: Collaborator[]
}

export async function listCollaborators(page = 1, perPage = 20): Promise<CollaboratorsResponse> {
  const res = await privateInstance.get(`/api:n7i1lPYx/users`, { params: { page, per_page: perPage } })
  return res.data as CollaboratorsResponse
}

export async function createCollaborator(input: CollaboratorInput): Promise<Collaborator> {
  const res = await privateInstance.post(`/api:n7i1lPYx/users`, input)
  return res.data as Collaborator
}

export async function updateCollaborator(id: number, input: CollaboratorInput): Promise<Collaborator> {
  const res = await privateInstance.put(`/api:n7i1lPYx/users/${id}`, input)
  return res.data as Collaborator
}

export async function deleteCollaborator(id: number): Promise<boolean> {
  const res = await privateInstance.delete(`/api:n7i1lPYx/users/${id}`)
  return Boolean(res.data)
}