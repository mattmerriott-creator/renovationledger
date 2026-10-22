# Music and trending sounds

Two tracks of work every video:

1. **Royalty-free bed, mixed in** → `<slug>-final.mp4`, safe to post anywhere (TikTok, Reels,
   Shorts, Facebook).
2. **Trending sound research** → 3 picks written in `post.md`; Matt adds one inside TikTok on
   `<slug>-voice-only.mp4`.

## Why trending sounds are never mixed into the file

Trending songs are licensed to TikTok for use inside the app only. Burned into an uploaded MP4,
they get the video muted or taken down, and they're unlicensed on Reels/Shorts/Facebook.
**Business accounts** (Matt's brand account likely is one) can only use TikTok's
**Commercial Music Library (CML)**, not the general trending list. So research must check that a
sound is available for business use.

## 1. Royalty-free bed

Library: `tiktok/music/` in the repo (see its README). Each track has a line in
`tiktok/music/tracks.json`: file, mood, bpm, source, license.

Pick by type:
| Type | Mood | Volume |
| --- | --- | --- |
| Walkthrough | low, steady, slightly tense | 0.12-0.16 |
| Rehab update | upbeat, driving, work-y | 0.14-0.18 |
| How-to | light, minimal, unobtrusive | 0.10-0.14 |
| After / reveal | big, uplifting, a clear drop | 0.20-0.30 |

- `finish.py --music-start <s>` to start on a strong part of the track (skip slow intros; for
  reveals, line the drop up with the first "after" shot: drop time in track minus that shot's time).
- Music ducks automatically under speech.
- If the library is empty, export without music, say so, and ask Matt to add tracks
  (sources in the library README). Don't download music from random sites.

## 2. Trending sound research (WebSearch, ~2 min)

Search, in one turn:
- `TikTok Creative Center trending songs this week`
- `trending TikTok sounds <current month year> business commercial`
- `TikTok trending sounds real estate <current month year>`

Prefer sources dated this week or month (TikTok Creative Center, Later, Buffer, Hootsuite, New
Engen and other dated weekly trend posts). Drop anything older than ~3 weeks: TikTok trends turn
over fast. Drop anything clearly off-brand (explicit, meme formats that clash with Chuck's voice).

For each of 3 picks write: name/artist, why it fits this video (mood, the format it's used for),
whether it's in the Commercial Music Library (say "unverified, check in-app" if you can't confirm),
and where to start it (e.g. "start at the chorus so the beat hits on the first after shot").

Tell Matt how to add it: open TikTok → upload `voice-only.mp4` → Sounds → search the name →
set the added sound to ~10-15% and original sound to 100%.

**Never claim a sound is trending without a dated source.** If the search finds nothing current,
say so and point to TikTok Creative Center → Trends → Songs (filter: approved for business use).
