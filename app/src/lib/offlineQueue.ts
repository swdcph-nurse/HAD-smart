import { supabase } from '@/lib/supabase'
import type { Shift } from '@/lib/types'

const STORAGE_KEY = 'had-smart-checklist-queue-v1'

export interface QueuedChecklist {
  id: string
  templateId: string
  performedBy: string
  wardId: string
  drugId: string
  bedCode: string
  shift: Shift
  responses: Record<string, boolean>
  createdAt: string
}

function readQueue(): QueuedChecklist[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as QueuedChecklist[]) : []
  } catch {
    return []
  }
}

function writeQueue(queue: QueuedChecklist[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
}

export function queueChecklist(input: Omit<QueuedChecklist, 'id' | 'createdAt'>): string {
  const id = crypto.randomUUID()
  const queue = readQueue()
  queue.push({ ...input, id, createdAt: new Date().toISOString() })
  writeQueue(queue)
  return id
}

export function getQueuedChecklistCount(): number {
  return readQueue().length
}

export async function flushChecklistQueue(): Promise<{ synced: number; remaining: number }> {
  if (!navigator.onLine) return { synced: 0, remaining: readQueue().length }
  const queue = readQueue()
  if (queue.length === 0) return { synced: 0, remaining: 0 }
  const remaining: QueuedChecklist[] = []
  let synced = 0

  for (const item of queue) {
    const { error } = await supabase.from('checklist_responses').insert({
      template_id: item.templateId,
      performed_by: item.performedBy,
      ward_id: item.wardId,
      drug_id: item.drugId,
      bed_code: item.bedCode,
      shift: item.shift,
      responses: item.responses,
      filled_at: item.createdAt,
    })
    if (error) {
      remaining.push(item)
      if (error.code === '401' || error.code === '403') break
    } else {
      synced += 1
    }
  }

  writeQueue(remaining)
  return { synced, remaining: remaining.length }
}

export function startOfflineSync(onSync?: (synced: number, remaining: number) => void): () => void {
  const sync = () => {
    void flushChecklistQueue().then(({ synced, remaining }) => {
      if (synced > 0 || remaining > 0) onSync?.(synced, remaining)
    })
  }
  window.addEventListener('online', sync)
  sync()
  return () => window.removeEventListener('online', sync)
}
