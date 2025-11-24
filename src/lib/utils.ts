import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Gera abreviação para Avatar conforme regra:
// - Se houver duas ou mais palavras: primeira letra da 1ª e da 2ª palavra
// - Se houver apenas uma palavra: pegar as 2 primeiras letras
export function getAvatarAbbrev(name: string): string {
  const safe = (name || '').trim()
  if (!safe) return ''
  const words = safe.split(/\s+/).filter(Boolean)
  if (words.length >= 2) {
    const first = words[0].charAt(0)
    const second = words[1].charAt(0)
    return `${first}${second}`.toUpperCase()
  }
  return safe.slice(0, 2).toUpperCase()
}
