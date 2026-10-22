# Music library (royalty-free only)

Tracks here get mixed into the final MP4 under the voice. Only add music you're licensed to use
on social video. Good free sources:

- YouTube Audio Library (studio.youtube.com → Audio library): filter "No attribution required"
- Pixabay Music (pixabay.com/music): free for commercial use
- TikTok Commercial Music Library: download only if you post the file to TikTok

Add 6-10 tracks covering the moods in `.claude/skills/tiktok-edit/references/music.md`
(steady/tense, upbeat/driving, light/minimal, big/uplifting) as .mp3, ~3-6 MB each, and add a
line for each to `tracks.json`:

{"file": "upbeat-drive-01.mp3", "mood": "upbeat, driving", "bpm": 120, "source": "Pixabay", "license": "Pixabay Content License"}
