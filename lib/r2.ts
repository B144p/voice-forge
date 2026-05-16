import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

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

/** Uploads an MP3 buffer to R2. */
export async function uploadMp3(key: string, buffer: Buffer): Promise<void> {
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
  const client = getS3Client()
  const url = await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: key }),
    { expiresIn: 300 },
  )
  return { url, expiresAt: new Date(Date.now() + 5 * 60 * 1000) }
}

/** Fetches an MP3 from R2 and returns it as a Buffer. */
export async function getMp3Buffer(key: string): Promise<Buffer> {
  const client = getS3Client()
  const res = await client.send(
    new GetObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: key }),
  )
  const bytes = await res.Body!.transformToByteArray()
  return Buffer.from(bytes)
}

/** Deletes an object from R2. */
export async function deleteMp3(key: string): Promise<void> {
  const client = getS3Client()
  await client.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: key }))
}

/** Generates the canonical R2 key for an item. */
export function itemR2Key(userId: string, setId: string, itemId: string): string {
  return `users/${userId}/sets/${setId}/items/${itemId}.mp3`
}
