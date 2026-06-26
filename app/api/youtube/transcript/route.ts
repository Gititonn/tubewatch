import { NextRequest, NextResponse } from 'next/server'
import { YoutubeTranscript } from 'youtube-transcript'
import { createClient } from '@/lib/supabase/server'

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

  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId)

    // Return both raw segments and a single concatenated string
    const fullText = transcript
      .map(seg => seg.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()

    return NextResponse.json({
      videoId,
      segments: transcript.map(seg => ({
        text: seg.text,
        offset: seg.offset,   // milliseconds
        duration: seg.duration,
      })),
      fullText,
      wordCount: fullText.split(' ').length,
    })
  } catch (err: any) {
    // Common causes: transcripts disabled, private video, wrong ID
    const message = err?.message || 'Failed to fetch transcript'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
