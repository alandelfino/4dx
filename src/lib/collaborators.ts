import z from 'zod'
import { privateInstance } from './auth'

export const collaboratorSchema = z.object({
  id: z.number().int(),
  created_at: z.union([z.number().int(), z.string()]),
  name: z.string().min(1),
  email: z.string().email(),
  profile: z.enum(['director', 'collaborator']),
})

export const collaboratorInputSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  profile: z.enum(['director', 'collaborator']),
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