import z from 'zod'
import { privateInstance } from './auth'

export const segmentSchema = z.object({
  id: z.number().int(),
  created_at: z.union([z.number().int(), z.string()]),
  updated_at: z.union([z.number().int(), z.string()]),
  name: z.string().min(1),
  company_id: z.number().int(),
})

export const segmentInputSchema = z.object({
  name: z.string().min(1),
  company_id: z.number().int().optional(),
})

export type Segment = z.infer<typeof segmentSchema>
export type SegmentInput = z.infer<typeof segmentInputSchema>

export type SegmentsResponse = {
  itemsReceived: number
  curPage: number
  nextPage: number | null
  prevPage: number | null
  offset: number
  perPage: number
  itemsTotal: number
  pageTotal: number
  items: Segment[]
}

export async function listSegments(page = 1, perPage = 20): Promise<SegmentsResponse> {
  const res = await privateInstance.get(`/api:5zagWASm/segments`, { params: { page, per_page: perPage } })
  return res.data as SegmentsResponse
}

export async function getSegment(id: number): Promise<Segment> {
  const res = await privateInstance.get(`/api:5zagWASm/segments/${id}`)
  return res.data as Segment
}

export async function createSegment(input: SegmentInput): Promise<Segment> {
  const res = await privateInstance.post(`/api:5zagWASm/segments`, input)
  return res.data as Segment
}

export async function updateSegment(id: number, input: SegmentInput): Promise<Segment> {
  const res = await privateInstance.put(`/api:5zagWASm/segments/${id}`, input)
  return res.data as Segment
}

export async function deleteSegment(id: number): Promise<boolean> {
  const res = await privateInstance.delete(`/api:5zagWASm/segments/${id}`)
  return Boolean(res.data)
}