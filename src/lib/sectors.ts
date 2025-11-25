import z from 'zod'
import { privateInstance } from './auth'

export const sectorSchema = z.object({
  id: z.number({ message: 'ID inválido' }).int(),
  created_at: z.union([z.number({ message: 'Data de criação inválida' }).int(), z.string({ message: 'Data de criação inválida' })]),
  updated_at: z.union([z.number({ message: 'Data de atualização inválida' }).int(), z.string({ message: 'Data de atualização inválida' })]),
  name: z.string({ message: 'Nome é obrigatório' }).min(1, { message: 'Nome é obrigatório' }),
  company_id: z.number({ message: 'Empresa inválida' }).int(),
  leader_id: z.number({ message: 'Líder inválido' }).int(),
  parent_id: z.number({ message: 'Setor pai inválido' }).int(),
  profile: z.enum(['director', 'collaborator'], { message: 'Perfil inválido' }),
})

export const sectorInputSchema = z.object({
  name: z.string({ message: 'Nome é obrigatório' }).min(1, { message: 'Nome é obrigatório' }),
  company_id: z.number({ message: 'Empresa inválida' }).int().optional(),
  leader_id: z.number({ message: 'Líder inválido' }).int().optional(),
  parent_id: z.number({ message: 'Setor pai inválido' }).int(),
  profile: z.enum(['director', 'collaborator'], { message: 'Perfil inválido' }).optional(),
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