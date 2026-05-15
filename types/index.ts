import type { UserRole, UserStatus, SetStatus, ItemStatus, JobStatus, UsageAction } from '@prisma/client'

export type { UserRole, UserStatus, SetStatus, ItemStatus, JobStatus, UsageAction }

export interface VoiceOption {
  voiceId: string
  name: string
  language: string
  previewUrl: string | null
}

export interface SetStatusResponse {
  status: SetStatus
  itemsTotal: number
  itemsCompleted: number
  itemsFailed: number
  items: ItemStatusItem[]
}

export interface ItemStatusItem {
  id: string
  index: number
  status: ItemStatus
  characterCount: number
  errorMessage?: string | null
}

export interface ApiError {
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}
