import type { WeeklyCookbook } from '../types/weeklyCookbook'

export type LocalCookbookStatus = 'DRAFT' | 'PUBLISHED'

export interface LocalCookbookRecord {
  id: string
  planId: string
  weekStart: string
  status: LocalCookbookStatus
  version: number
  cookbook: WeeklyCookbook
  createdAt: string
  updatedAt: string
  publishedAt: string | null
}

const STORAGE_KEY = 'nutriplan.weekly-cookbooks.local.v2'

function readAll(): Record<string, LocalCookbookRecord> {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, LocalCookbookRecord>
  } catch {
    return {}
  }
}

function writeAll(records: Record<string, LocalCookbookRecord>) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}

function recordId(planId: string, weekStart: string) {
  return `${planId}::${weekStart}`
}

export function listLocalCookbookRecords(planId: string): LocalCookbookRecord[] {
  return Object.values(readAll()).filter((record) => record.planId === planId).sort((a, b) => b.weekStart.localeCompare(a.weekStart))
}

export function getLocalCookbookRecord(planId: string, weekStart: string): LocalCookbookRecord | null {
  return readAll()[recordId(planId, weekStart)] ?? null
}

export function saveLocalCookbookDraft(planId: string, cookbook: WeeklyCookbook): LocalCookbookRecord {
  const records = readAll()
  const id = recordId(planId, cookbook.cookbook.week_start)
  const previous = records[id]
  const now = new Date().toISOString()
  const record: LocalCookbookRecord = {
    id,
    planId,
    weekStart: cookbook.cookbook.week_start,
    status: 'DRAFT',
    version: previous ? previous.version + 1 : 1,
    cookbook,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
    publishedAt: null,
  }
  records[id] = record
  writeAll(records)
  return record
}

export function publishLocalCookbook(planId: string, weekStart: string): LocalCookbookRecord | null {
  const records = readAll()
  const id = recordId(planId, weekStart)
  const previous = records[id]
  if (!previous) return null
  const now = new Date().toISOString()
  const record: LocalCookbookRecord = { ...previous, status: 'PUBLISHED', updatedAt: now, publishedAt: now }
  records[id] = record
  writeAll(records)
  return record
}
