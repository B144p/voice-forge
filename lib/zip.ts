import archiver from 'archiver'
import { Readable, PassThrough } from 'stream'

interface ZipItem {
  index: number
  text: string
  buffer: Buffer
}

/** Sanitizes a filename component: keep [A-Za-z0-9_-], replace others with _. */
function sanitizeFilename(text: string, maxLen = 60): string {
  return text
    .replace(/[^A-Za-z0-9_\-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, maxLen)
}

/**
 * Streams a ZIP of the given items to a Node.js Writable (e.g. PassThrough).
 * Filenames: 01_<sanitized-text>.mp3
 */
export function createZipStream(items: ZipItem[]): PassThrough {
  const pass = new PassThrough()
  const archive = archiver('zip', { zlib: { level: 0 } })

  archive.pipe(pass)

  for (const item of items) {
    const prefix = String(item.index + 1).padStart(2, '0')
    const name = sanitizeFilename(item.text)
    const filename = `${prefix}_${name}.mp3`.slice(0, 80)
    archive.append(Readable.from(item.buffer), { name: filename })
  }

  archive.finalize()
  return pass
}
