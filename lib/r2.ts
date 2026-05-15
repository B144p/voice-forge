import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import path from 'path'
import fs from 'fs/promises'

const isMock = process.env.MOCK_EXTERNAL_SERVICES === 'true'
const MOCK_DIR = path.join(process.cwd(), 'tmp', 'r2-mock')

function getS3Client() {
  return new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT!,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  })
}

/** Uploads an MP3 buffer to R2 (or local mock filesystem). */
export async function uploadMp3(key: string, buffer: Buffer): Promise<void> {
  if (isMock) {
    const filePath = path.join(MOCK_DIR, key)
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, buffer)
    return
  }

  const client = getS3Client()
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: key,
      Body: buffer,
      ContentType: 'audio/mpeg',
    }),
  )
}

/** Returns a 5-minute presigned URL for the given R2 key. */
export async function getPresignedUrl(key: string): Promise<{ url: string; expiresAt: Date }> {
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000)

  if (isMock) {
    const url = `/api/mock-r2/${encodeURIComponent(key)}`
    return { url, expiresAt }
  }

  const client = getS3Client()
  const url = await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: key }),
    { expiresIn: 300 },
  )
  return { url, expiresAt }
}

/** Fetches an MP3 from R2 and returns it as a Buffer. */
export async function getMp3Buffer(key: string): Promise<Buffer> {
  if (isMock) {
    const filePath = path.join(MOCK_DIR, key)
    return fs.readFile(filePath)
  }

  const client = getS3Client()
  const res = await client.send(
    new GetObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: key }),
  )
  const bytes = await res.Body!.transformToByteArray()
  return Buffer.from(bytes)
}

/** Deletes an object from R2. */
export async function deleteMp3(key: string): Promise<void> {
  if (isMock) {
    const filePath = path.join(MOCK_DIR, key)
    await fs.unlink(filePath).catch(() => undefined)
    return
  }

  const client = getS3Client()
  await client.send(
    new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: key }),
  )
}

/** Generates the canonical R2 key for an item. */
export function itemR2Key(userId: string, setId: string, itemId: string): string {
  return `users/${userId}/sets/${setId}/items/${itemId}.mp3`
}
