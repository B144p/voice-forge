# VoiceForge

A tool I built to help my friend create educational media more easily. Nothing too fancy — it's basically a batch wrapper around the 11Labs API for generating voices.

## What it does

You upload your content, it sends it to 11Labs, and you get back the audio files. That's pretty much it. Simple, clean, does the job.

## Why it's stopped

The project works, I just stopped working on it.

Turned out 11Labs pricing wasn't what I expected. I thought it was pay-as-you-go, but if you want access to the better voices, you also need to be on a paid subscription plan — on top of the API costs. So I'd be paying for a subscription I'd barely use, plus the API usage on top of that. Didn't make sense, so I pulled the plug.

## What I learned

Even though this didn't go all the way, it was still a good ride:

- First time integrating with 11Labs — honestly pretty fun
- Got hands-on with Cloudflare R2 (object storage) for storing the generated audio files — basically the same vibe as AWS S3 if you've used that before

## Tech

- Next.js
- 11Labs API
- Cloudflare R2
