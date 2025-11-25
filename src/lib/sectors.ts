import z from 'zod'
import { privateInstance } from './auth'

export const sectorSchema = z.object({
  id: z.number().int(),
  created_at: z.union([z.number().int(), z.string()]),
  updated_at: z.union([z.number().int(), z.string()]),
  name: z.string().min(1),
  company_id: z.number().int(),
  leader_id: z.number().int(),
  parent_id: z.number().int(),
  profile: z.enum(['director', 'collaborator']),
})

export const sectorInputSchema = z.object({
  name: z.string().min(1),
  company_id: z.number().int().optional(),
  leader_id: z.number().int().optional(),
  parent_id: z.number().int(),
  profile: z.enum(['director', 'collaborator']).optional(),
})

export type Sector = z.infer<typeof sectorSchema>
export type SectorInput = z.infer<typeof sectorInputSchema>

export type SectorsResponse = {
  itemsReceived: number
  curPage: number
  nextPage: number | null
  prevPage: number | null
  offset: number
  perPage: number
  itemsTotal: number
  pageTotal: number
  items: Sector[]
}

export async function listSectors(page = 1, perPage = 20): Promise<SectorsResponse> {
  const res = await privateInstance.get(`/api:MGwZ1AEi/sectors`, { params: { page, per_page: perPage } })
  return res.data as SectorsResponse
}

export async function getSector(id: number): Promise<Sector> {
  const res = await privateInstance.get(`/api:MGwZ1AEi/sectors/${id}`)
  return res.data as Sector
}

export async function createSector(input: SectorInput): Promise<Sector> {
  const res = await privateInstance.post(`/api:MGwZ1AEi/sectors`, input)
  return res.data as Sector
}

export async function updateSector(id: number, input: SectorInput): Promise<Sector> {
  const res = await privateInstance.put(`/api:MGwZ1AEi/sectors/${id}`, input)
  return res.data as Sector
}

export async function deleteSector(id: number): Promise<boolean> {
  const res = await privateInstance.delete(`/api:MGwZ1AEi/sectors/${id}`)
  return Boolean(res.data)
}