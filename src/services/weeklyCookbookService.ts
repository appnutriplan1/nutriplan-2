import { WEEKLY_COOKBOOK_MOCK } from '../data/weeklyCookbook.mock'
import { validateWeeklyCookbook } from '../lib/weeklyCookbookSchema'
import type { CookbookValidationResult } from '../types/weeklyCookbook'
import type { WeeklyCookbook } from '../types/weeklyCookbook'
import { listLocalCookbookRecords } from './weeklyCookbookLocalRepository'
import { getWeeklyCookbookRemote } from './dataService'

const REMOTE_CACHE_KEY = 'nutriplan.weekly-cookbooks.patient.v1'

type RemoteCache = Record<string, WeeklyCookbook>

function cacheId(planId: string, weekStart?: string) {
  return `${planId}::${weekStart || 'latest'}`
}

function readRemoteCache(): RemoteCache {
  try {
    return JSON.parse(localStorage.getItem(REMOTE_CACHE_KEY) || '{}') as RemoteCache
  } catch {
    return {}
  }
}

export function getCachedWeeklyCookbook(planId: string, weekStart?: string): WeeklyCookbook | null {
  if (import.meta.env.VITE_DATA_MODE !== 'remote') return null
  return readRemoteCache()[cacheId(planId, weekStart)] ?? null
}

export function clearCachedWeeklyCookbooks() {
  try { localStorage.removeItem(REMOTE_CACHE_KEY) } catch { /* sin almacenamiento */ }
}

function saveRemoteCache(planId: string, weekStart: string | undefined, cookbook: WeeklyCookbook) {
  try {
    const cache = readRemoteCache()
    cache[cacheId(planId, weekStart)] = cookbook
    cache[cacheId(planId, cookbook.cookbook.week_start)] = cookbook
    localStorage.setItem(REMOTE_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // La red seguirá siendo la fuente de verdad si no hay almacenamiento local.
  }
}

/**
 * Punto único de acceso al recetario semanal.
 *
 * Por ahora valida un fixture local. Cuando se conecte Apps Script, esta
 * función conservará la misma firma y enviará `planId` junto con el código de
 * acceso; la UI no tendrá que conocer Sheets, Drive ni credenciales.
 */
export async function getWeeklyCookbook(planId: string, weekStart?: string): Promise<CookbookValidationResult> {
  if (!planId.trim()) {
    return { ok: false, errors: [{ path: 'planId', message: 'Falta el identificador del plan.' }] }
  }

  if (import.meta.env.VITE_DATA_MODE === 'remote') {
    try {
      const remote = await getWeeklyCookbookRemote(planId, weekStart)
      if (!remote) return { ok: false, errors: [{ path: 'plan', message: 'Este plan todavía no tiene un recetario publicado.' }] }
      const result = validateWeeklyCookbook(remote)
      if (result.ok) saveRemoteCache(planId, weekStart, result.data)
      return result
    } catch {
      return { ok: false, errors: [{ path: 'red', message: 'No pudimos cargar el recetario semanal.' }] }
    }
  }
  const localRecords = listLocalCookbookRecords(planId)
  const published = localRecords.filter((record) => record.status === 'PUBLISHED')
  const localRecord = weekStart ? published.find((record) => record.weekStart === weekStart) : published[0]
  if (localRecords.length > 0 && !localRecord) {
    return { ok: false, errors: [{ path: 'plan', message: weekStart ? 'La semana solicitada no está publicada.' : 'Este plan todavía no tiene semanas publicadas.' }] }
  }

  return validateWeeklyCookbook(localRecord?.cookbook ?? WEEKLY_COOKBOOK_MOCK)
}
