import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'brightpath.density'

export type Density = 'comfortable' | 'compact'

function readDensity(): Density {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'compact' ? 'compact' : 'comfortable'
  } catch {
    return 'comfortable'
  }
}

let density: Density = readDensity()
const listeners = new Set<() => void>()

function applyDensity(value: Density) {
  if (value === 'compact') document.documentElement.dataset.density = 'compact'
  else delete document.documentElement.dataset.density
}

applyDensity(density)

export function getDensity(): Density {
  return density
}

export function subscribeDensity(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function setDensity(value: Density) {
  density = value
  try {
    if (value === 'compact') localStorage.setItem(STORAGE_KEY, value)
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // The choice still applies for this visit when storage is unavailable.
  }
  applyDensity(density)
  for (const listener of listeners) listener()
}

export function useDensity(): Density {
  return useSyncExternalStore(subscribeDensity, getDensity, () => 'comfortable')
}
