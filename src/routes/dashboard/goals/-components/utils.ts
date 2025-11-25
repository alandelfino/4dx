export function toStamp(d?: Date): number | undefined {
  if (!d) return undefined
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x.getTime()
}

export function formatDateOnly(n?: number): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '  /  /'
  try { return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(n)) } catch { return '  /  /' }
}

export type GoalValueType = 'int' | 'decimal' | 'currency' | 'percent'

export function formatValueByType(value: number | undefined, type: GoalValueType): string {
  if (value == null || !Number.isFinite(value)) return ''
  switch (type) {
    case 'currency':
      try { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value) } catch { return `R$ ${value}` }
    case 'percent':
      try { return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value)}%` } catch { return `${value}%` }
    case 'decimal':
      try { return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(value) } catch { return String(value) }
    default:
      try { return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(value) } catch { return String(value) }
  }
}

export function parseValueByType(input: string, type: GoalValueType): number | undefined {
  const s = (input ?? '').trim()
  if (s === '') return undefined
  switch (type) {
    case 'currency': {
      const cleaned = s.replace(/[^0-9.,-]/g, '')
      const normalized = cleaned.replace(/\./g, '').replace(/,/g, '.')
      const n = parseFloat(normalized)
      if (!Number.isFinite(n)) return undefined
      return n
    }
    case 'percent': {
      const cleaned = s.replace(/[^0-9.,-]/g, '')
      const normalized = cleaned.replace(/\./g, '').replace(/,/g, '.')
      const n = parseFloat(normalized)
      if (!Number.isFinite(n)) return undefined
      return n
    }
    case 'decimal': {
      const cleaned = s.replace(/[^0-9.,-]/g, '')
      const normalized = cleaned.replace(/\./g, '').replace(/,/g, '.')
      const n = parseFloat(normalized)
      if (!Number.isFinite(n)) return undefined
      return n
    }
    default: {
      const cleaned = s.replace(/[^0-9-]/g, '')
      const n = Number(cleaned)
      if (!Number.isFinite(n)) return undefined
      return Math.round(n)
    }
  }
}