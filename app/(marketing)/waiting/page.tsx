import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock } from 'lucide-react'
import { WaitingActions } from './actions'

export default function WaitingPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Clock className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle>Access Pending</CardTitle>
          <CardDescription>
            Your account is waiting for admin approval. You'll be able to use VoiceForge once an
            admin approves your request.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Please reach out to your team admin if this is taking too long.
          </p>
        </CardContent>
        <CardFooter>
          <WaitingActions />
        </CardFooter>
      </Card>
    </div>
  )
}
