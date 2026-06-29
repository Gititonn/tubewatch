---
name: whisper
description: Quick reference for Claude Code voice dictation. Use when you want to speak your prompts instead of typing, or to check voice mode status/settings.
---

# Voice Dictation (Whisper)

Claude Code has built-in voice dictation since v2.1.69. No plugin required.

## Enable

```
/voice          # toggle on/off (hold mode by default)
/voice tap      # tap once to start, tap again to send
/voice hold     # push-to-talk: hold Space while speaking
/voice off      # disable
```

## How to use (hold mode)

1. Hold `Space` — brief warmup, then waveform appears
2. Speak — text appears dimmed in real time
3. Release `Space` — transcript finalizes and is inserted
4. Press `Enter` to send (or set `autoSubmit: true` to auto-send)

## How to use (tap mode)

1. Make sure prompt input is **empty**
2. Tap `Space` — waveform appears
3. Speak
4. Tap `Space` again — transcript inserted + auto-sent (if ≥3 words)

## Persist across sessions

Add to `~/.claude/settings.json`:

```json
{
  "voice": {
    "enabled": true,
    "mode": "tap"
  }
}
```

## Rebind the hotkey

Edit `~/.claude/keybindings.json`:

```json
{
  "bindings": [
    {
      "context": "Chat",
      "bindings": {
        "meta+k": "voice:pushToTalk",
        "space": null
      }
    }
  ]
}
```

## Troubleshooting (Windows)

- **"Voice mode requires a Claude.ai account"** → run `/login`
- **"Microphone access is denied"** → Settings → Privacy & Security → Microphone → turn on for desktop apps
- **"No audio detected"** → Settings → System → Sound → Input → select your mic
- **"No speech detected"** → speak closer to mic, reduce background noise

## Notes

- Transcription is tuned for dev vocabulary: `regex`, `OAuth`, `JSON`, `localhost` all recognized
- Your current project name and git branch are auto-added as recognition hints
- Audio is streamed to Anthropic's servers (not local) — requires Claude.ai account
- Does **not** work in remote/SSH environments or WSL1 (WSL2 with WSLg works)
- For local/private processing on macOS: see github.com/enesbasbug/voice-to-claude
