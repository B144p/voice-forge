import { describe, it, expect } from 'vitest'
import { z } from 'zod'

const itemSchema = z.object({
  text: z
    .string()
    .min(1)
    .max(5000)
    .transform((s) => s.replace(/\r\n/g, '\n').trim()),
})

const createSetSchema = z.object({
  title: z.string().trim().min(1).max(100),
  voiceId: z.string().min(1),
  items: z.array(itemSchema).min(1).max(30),
})

describe('createSet validation', () => {
  it('accepts valid payload', () => {
    const result = createSetSchema.safeParse({
      title: 'Test',
      voiceId: 'v1',
      items: [{ text: 'Hello' }],
    })
    expect(result.success).toBe(true)
  })

  it('rejects more than 30 items', () => {
    const result = createSetSchema.safeParse({
      title: 'Test',
      voiceId: 'v1',
      items: Array.from({ length: 31 }, (_, i) => ({ text: `Item ${i}` })),
    })
    expect(result.success).toBe(false)
  })

  it('rejects item text > 5000 chars', () => {
    const result = createSetSchema.safeParse({
      title: 'Test',
      voiceId: 'v1',
      items: [{ text: 'a'.repeat(5001) }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty items array', () => {
    const result = createSetSchema.safeParse({
      title: 'Test',
      voiceId: 'v1',
      items: [],
    })
    expect(result.success).toBe(false)
  })

  it('trims CRLF to LF', () => {
    const result = createSetSchema.safeParse({
      title: 'Test',
      voiceId: 'v1',
      items: [{ text: 'Line1\r\nLine2' }],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.items[0].text).toBe('Line1\nLine2')
    }
  })

  it('trims whitespace-only titles', () => {
    const result = createSetSchema.safeParse({
      title: '   ',
      voiceId: 'v1',
      items: [{ text: 'Hello' }],
    })
    expect(result.success).toBe(false)
  })
})
