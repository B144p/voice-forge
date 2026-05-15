/**
 * Strips the ID3v2 tag from an MP3 buffer (if present) and returns the raw
 * MPEG frame data. ID3v2 begins with "ID3" at offset 0; the tag size is
 * encoded in 4 syncsafe bytes at offset 6.
 */
function stripId3v2(buf: Buffer): Buffer {
  if (buf.length < 10 || buf[0] !== 0x49 || buf[1] !== 0x44 || buf[2] !== 0x33) {
    return buf
  }
  const tagSize =
    ((buf[6] & 0x7f) << 21) |
    ((buf[7] & 0x7f) << 14) |
    ((buf[8] & 0x7f) << 7) |
    (buf[9] & 0x7f)
  const offset = 10 + tagSize

  // Find first valid MPEG sync word (0xFF 0xE? or 0xFF 0xF?)
  for (let i = offset; i < buf.length - 1; i++) {
    if (buf[i] === 0xff && (buf[i + 1] & 0xe0) === 0xe0) {
      return buf.slice(i)
    }
  }
  return buf.slice(offset)
}

/**
 * Byte-concatenates MP3 buffers into a single stream.
 * Items 2..N have their ID3v2 headers stripped so players don't
 * treat mid-file tags as separate tracks.
 */
export function concatMp3(buffers: Buffer[]): Buffer {
  if (buffers.length === 0) return Buffer.alloc(0)
  const parts = buffers.map((buf, i) => (i === 0 ? buf : stripId3v2(buf)))
  return Buffer.concat(parts)
}
