import { describe, it, expect } from 'vitest'
import { concatMp3 } from '@/lib/mp3-concat'

// Minimal MP3 frame: sync word 0xFF 0xFB followed by zeroes
const MPEG_FRAME = Buffer.from([0xff, 0xfb, 0x90, 0x04, ...Array(28).fill(0)])

// ID3v2 tag with 0-byte body followed by an MPEG frame
function makeId3Buffer(payload: Buffer): Buffer {
  const tagSize = 0 // syncsafe 0
  const header = Buffer.from([
    0x49, 0x44, 0x33, // "ID3"
    0x03, 0x00,       // version
    0x00,             // flags
    0x00, 0x00, 0x00, 0x00, // syncsafe size = 0
  ])
  return Buffer.concat([header, payload])
}

describe('concatMp3', () => {
  it('returns empty buffer for empty input', () => {
    expect(concatMp3([]).length).toBe(0)
  })

  it('returns the single buffer unchanged', () => {
    const result = concatMp3([MPEG_FRAME])
    expect(result).toEqual(MPEG_FRAME)
  })

  it('concatenates two plain MPEG buffers', () => {
    const a = Buffer.from([0xff, 0xfb, 0x00])
    const b = Buffer.from([0xff, 0xfb, 0x01])
    const result = concatMp3([a, b])
    expect(result).toEqual(Buffer.concat([a, b]))
  })

  it('strips ID3v2 from second buffer onward', () => {
    const frame = Buffer.from([0xff, 0xfb, 0x90])
    const withId3 = makeId3Buffer(frame)
    const result = concatMp3([MPEG_FRAME, withId3])
    // result = MPEG_FRAME + frame (ID3 header stripped)
    expect(result.slice(0, MPEG_FRAME.length)).toEqual(MPEG_FRAME)
    expect(result.slice(MPEG_FRAME.length)).toEqual(frame)
  })

  it('starts with a valid MPEG sync word', () => {
    const result = concatMp3([MPEG_FRAME])
    expect(result[0]).toBe(0xff)
    expect((result[1] & 0xe0)).toBe(0xe0)
  })
})
