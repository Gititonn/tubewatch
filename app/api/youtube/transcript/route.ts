import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchTimedTranscript } from '@/lib/transcript'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const videoId = searchParams.get('videoId')

  if (!videoId) {
    return NextResponse.json({ error: 'videoId is required' }, { status: 400 })
  }

  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Shared fetch path (lib/transcript.ts): timeout-bounded, null on any
  // failure — captions disabled, private video, scrape breakage.
  const transcript = await fetchTimedTranscript(videoId)
  if (!transcript) {
    return NextResponse.json({ error: 'Transcript unavailable for this video' }, { status: 404 })
  }

  return NextResponse.json({
    videoId,
    segments: transcript.segments,
    fullText: transcript.fullText,
    wordCount: transcript.wordCount,
  })
}
