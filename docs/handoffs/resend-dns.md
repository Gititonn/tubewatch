# Resend DNS records → add in Vercel

Add these 4 records in **Vercel → tubewatchhq.com → DNS Records** (same place we
added the Google TXT). The DKIM value is domain-specific; SPF/DMARC are the standard
Resend us-east-1 values. Leave TTL at Vercel's default (60) unless noted.

| # | Type | Name (Vercel "Name" field) | Value | Priority |
|---|------|----------------------------|-------|----------|
| 1 | TXT | `resend._domainkey` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDHiyTngyUQCQTojIhYw4teRJFWpFAgCr2Zo+p3bj0+5/pV6w9Tbn224i8aku/CyI41NaoAtVsiWwL7Ju8nfdZg/oknKmxGiwIJ+0ow83atNrQEz2JG3TNJ7qC6FFF5GbR/mzWZ9tK9TKD3NjejJwWhAZSXQErP2AzLVrKqU64cOwIDAQAB` | — |
| 2 | MX | `send` | `feedback-smtp.us-east-1.amazonses.com` | 10 |
| 3 | TXT | `send` | `v=spf1 include:amazonses.com ~all` | — |
| 4 | TXT | `_dmarc` | `v=DMARC1; p=none;` | — (optional but recommended) |

## Steps

1. Add records 1–4 in Vercel DNS.
2. In Resend (domain tubewatchhq.com) click **"I've already added the records"** →
   status flips to Verified (usually minutes; Vercel DNS is fast).
3. In Resend → **API keys** → create a key (Sending access) → copy it.
4. In **Vercel → tubewatchhq.com project → Settings → Environment Variables** add
   `RESEND_API_KEY` = that key (Production). Redeploy (or it applies on next deploy).
5. Test the weekly email: GitHub → Actions → **weekly-email** → "Run workflow". At
   pre-launch scale it only reaches accounts with a connected channel.

Notes:
- Record 2 (MX) and 3 (TXT) share the name `send` — that's fine, different types coexist.
- The code sends from `hello@tubewatchhq.com`; that address works once the domain verifies
  (no separate mailbox needed for sending).
