import { listVoices } from '@/lib/elevenlabs'
import { SetBuilder } from '@/components/create/SetBuilder'

export default async function CreatePage() {
  const voices = await listVoices()

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Create a Set of Speech</h1>
        <p className="text-muted-foreground">
          Generate up to 30 sentences as individual MP3 files.
        </p>
      </div>
      <SetBuilder voices={voices} />
    </div>
  )
}
