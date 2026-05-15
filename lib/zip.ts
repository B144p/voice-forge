import { zipSync } from 'fflate'

interface ZipItem {
  index: number
  text: string
  buffer: Buffer
}

function sanitizeFilename(text: string, maxLen = 60): string {
  return text
    .replace(/[^A-Za-z0-9_\-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, maxLen)
}

/** Returns a ZIP buffer of the given MP3 items. Filenames: 01_<sanitized-text>.mp3 */
export function createZipBuffer(items: ZipItem[]): Buffer {
  const files: Record<string, Uint8Array> = {}

  for (const item of items) {
    const prefix = String(item.index + 1).padStart(2, '0')
    const name = sanitizeFilename(item.text)
    const filename = `${prefix}_${name}.mp3`.slice(0, 80)
    files[filename] = new Uint8Array(item.buffer)
  }

  return Buffer.from(zipSync(files, { level: 0 }))
}
