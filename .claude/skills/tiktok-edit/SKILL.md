---
name: tiktok-edit
description: Turn a raw phone video plus a few lines of context into a post-ready TikTok/Reels/Shorts video for Matt Merriott's real estate brand (I Buy Houses 918-268-8788). Cuts dead air, filler and retakes, adds Hormozi-style word-by-word captions, a hook, money callouts, punch-in zooms, music and the CTA end card, then exports a final MP4, a voice-only MP4 for trending sounds, a cover and the post caption. Use whenever Matt uploads or links a video and asks to edit it, make it a TikTok/Reel/Short, "make this post ready", or says /tiktok-edit. Covers initial walkthroughs, rehab updates, how-tos and after/reveal videos.
---

# TikTok edit

Raw video + context in, post-ready files out. Built on HyperFrames (the `/hyperframes` skill holds
the render rules; read it if you change the composition by hand). Brand rules: `brand.md`.
Per-type recipes: `references/content-types.md`. Music and trending sounds: `references/music.md`.
Post copy: `references/post-copy.md`.

Scripts live in `.claude/skills/tiktok-edit/scripts/` (call it `$K`). Work happens in
`tiktok/<slug>/` at the repo root (`$P`; slug like `2026-10-22-elm-st-rehab`). Media there is gitignored.

## 0. Setup (once per session, ~1 min)

```bash
bash $K/setup.sh
```
Installs the speech-to-text model (from GitHub, because Hugging Face is blocked in cloud sessions)
and checks ffmpeg. If it fails, transcription can't run: say so, don't guess captions.

## 1. Get the video and the context

- **Video:** a chat attachment (use the path given), or a Google Drive link/file name: find it with
  the Google Drive tools and download it into `$P/raw/`. Phone uploads over ~100 MB often fail in
  chat; tell Matt to use Drive for those.
- **Context:** if Matt didn't say, ask in ONE message (skip what's obvious from the video):
  1. Type: walkthrough / rehab update / how-to / after (reveal)?
  2. Key numbers (purchase, rehab budget, ARV/sale, profit, timeline) and the address or area.
  3. Anything to cut or keep; the goal (seller leads is the default CTA).
  Don't block on answers you can get from the transcript.

## 2. Prep, transcribe, cut

```bash
python3 $K/prep.py $P/raw/<file> $P              # -> assets/source.mp4 (1080x1920, 30 fps, -14 LUFS)
(cd $P && npx hyperframes transcribe assets/source.mp4 --engine parakeet --json -d .)  # -> transcript.json
python3 $K/plan_cuts.py $P                        # -> edl.json + numbered segments
```
- `prep.py --mode fill` for landscape footage you want whole (blurred background); `auto` picks.
- Read the transcript. Fix obvious mishears of names, streets and numbers in `transcript.json`
  (keep each entry one word; keep times). Numbers come out like `$42,000.`; that's fine.
- `plan_cuts.py` removes pauses, um/uh and earlier takes of repeated lines. Then edit `edl.json`
  `segments` yourself, as an editor would:
  - Drop rambling, off-topic or weak segments. Target length per `references/content-types.md`
    (usually 20–45 s). Shorter beats longer.
  - **Hook:** if the strongest line (the result, the number, the surprise) is not in the first
    2 s, copy that segment to the front. The same moment may appear twice (teaser, then in place).
  - B-roll with no speech: keep the best 1–2 s moments; `"speed": 1.5` on a silent segment is OK.
  - Silent videos (pure walkthrough footage): make a contact sheet
    (`ffmpeg -i $P/assets/source.mp4 -vf fps=1,scale=270:-1,tile=6x6 $P/contact.jpg`), read it,
    and write segments by hand.
```bash
python3 $K/apply_cuts.py $P                       # -> assets/cut.mp4 + words.json (re-timed)
```
Read `words.json` to get the new times for everything you place next.

## 3. Write `edit.json`, build, check

```json
{
  "hook":     {"text": "WE MADE *$43K* ON THIS FLIP", "duration": 3.0},
  "callouts": [{"text": "$42K REHAB", "at": 6.0, "duration": 1.8, "color": "red"}],
  "zooms":    "auto",
  "cta":      {"duration": 3.5},
  "captions": {"words_per_group": 3, "emphasis_words": ["profit", "cash"]}
}
```
- **hook.text**: ≤ 7 words, ALL CAPS, `*word*` = yellow. On screen from frame 0, so it is also the
  thumbnail. Formulas in `references/content-types.md`.
- **callouts**: the numbers that make the story (bought, rehab, sold, profit, days). Put `at` on the
  word where the number is said (from `words.json`). green = money in/wins, red = costs/problems,
  yellow = facts. ≤ 3 words. One every 4–8 s at most; never overlapping each other.
- **zooms**: `"auto"` alternates 100%/112% framing at every jump cut (hides the cut, Hormozi style).
  Add a list instead for specific punch-ins: `[{"at": 4.2, "scale": 1.18, "until": 5.5}]`.
- **cta**: the last N seconds become the "I BUY HOUSES / 918-268-8788" end card over the footage.
  Defaults come from `brand.md`; override `headline`, `kicker`, `sub` per video when it fits
  (a how-to might use `"headline": "FOLLOW FOR PART 2"` only if Matt asks).
- **captions.words_per_group**: 3 for normal talking, 2 for fast/hype. Numbers, $ and % are green
  automatically; add other words to `emphasis_words`.

```bash
python3 $K/build.py $P
(cd $P && npx hyperframes check)                  # fix every error; read every warning
(cd $P && npx hyperframes snapshot --at 0,<hook end>,<each callout>,<cta start + 1>)
```
**Look at the snapshot contact sheet before rendering.** Check: hook readable at frame 0; captions
never cover a face or the thing being shown (if they do, edit `top: 1100px` in
`compositions/captions.html` for this video, range 900–1150); callouts don't sit on top of
the hook; nothing under TikTok's right-hand buttons (x > 950) or below y = 1330 except captions' bottom.

## 4. Music + trending sound research

Follow `references/music.md`: pick a royalty-free bed from `tiktok/music/` that fits the mood, and
research 3 currently trending sounds that are cleared for business accounts.

## 5. Export

```bash
python3 $K/finish.py $P --music tiktok/music/<track> --music-volume 0.16 [--music-start <s>] [--cover-at <s>]
```
Renders once (~10 s of render per 1 s of video in the cloud), then writes to `$P/out/`:
`<slug>-final.mp4` (voice + ducked music), `<slug>-voice-only.mp4` (for adding a trending sound in
the app), `<slug>-cover.jpg`. Check the printed report: 1080x1920, 30 fps, h264, about −14 LUFS,
peak ≤ −1 dBFS. Pull 3 frames from the final file and look at them before sending.

## 6. Post copy and delivery

Write `$P/out/post.md` per `references/post-copy.md` (caption, hashtags, on-screen cover text,
best post time, trending sound picks). Then deliver:
- Send `final.mp4`, `voice-only.mp4` and `post.md` with SendUserFile (or upload to Drive if it's
  over ~100 MB or Matt asked for Drive).
- Reply in a few lines: length, what was cut, the hook, which version to post, the top trending
  sound pick. Offer specific tweaks ("want the hook to say X instead?").

## Revisions

Edits are cheap after the first pass: change `edit.json` or `edl.json`, re-run `apply_cuts.py`
(only if `edl.json` changed), `build.py`, `check`, `finish.py`. Keep a running list of Matt's
preferences in `brand.md` → "Learned preferences" so the next video starts closer.

## Gotchas

- The recognizer stretches each word's end into the pause after it: use `plan_cuts.py` output, not raw word ends, to judge pauses.
- Never burn a copyrighted/trending song into the MP4: TikTok mutes or removes it. Trending sounds are added in the app on the voice-only version.
- Don't load scripts from CDNs in compositions: cloud sessions block them. GSAP is vendored by `build.py`.
- `tiktok/*/` media is gitignored on purpose (raw phone video is huge). Deliver files, don't commit them.
