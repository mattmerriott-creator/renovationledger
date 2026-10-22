#!/usr/bin/env python3
"""Render the composition and export post-ready files.

usage: finish.py PROJECT_DIR [--music FILE] [--music-volume 0.16] [--music-start 0]
                             [--cover-at 0] [--skip-render]

Writes PROJECT_DIR/out/:
  <slug>-final.mp4       voice + royalty-free music bed, ducked under speech (if --music)
  <slug>-voice-only.mp4  no music: post this one when adding a trending sound inside TikTok
  <slug>-cover.jpg       cover frame
and prints a spec report (size, fps, codec, duration, loudness).
"""
import argparse, glob, json, os, re, shutil, subprocess, sys


def run(cmd, **kw):
    return subprocess.run(cmd, check=True, **kw)


def dur(path):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                 "-of", "csv=p=0", path], capture_output=True, text=True,
                                check=True).stdout.strip())


def loudness(path):
    err = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-af", "ebur128=peak=true",
                          "-f", "null", "-"], capture_output=True, text=True).stderr
    i = re.findall(r"I:\s+(-?[\d.]+) LUFS", err)
    p = re.findall(r"Peak:\s+(-?[\d.]+) dBFS", err)
    return (float(i[-1]) if i else None), (float(p[-1]) if p else None)


ENC = ["-c:v", "libx264", "-profile:v", "high", "-preset", "slow", "-crf", "17",
       "-maxrate", "16M", "-bufsize", "32M", "-pix_fmt", "yuv420p", "-r", "30",
       "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", "-movflags", "+faststart"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("project")
    ap.add_argument("--music")
    ap.add_argument("--music-volume", type=float, default=0.16)
    ap.add_argument("--music-start", type=float, default=0.0, help="offset into the track")
    ap.add_argument("--cover-at", type=float, default=0.0)
    ap.add_argument("--skip-render", action="store_true")
    a = ap.parse_args()

    proj = os.path.abspath(a.project)
    slug = os.path.basename(proj)
    out = os.path.join(proj, "out")
    os.makedirs(out, exist_ok=True)
    raw = os.path.join(out, f"{slug}-render.mp4")

    if not a.skip_render:
        run(["npx", "--yes", "hyperframes@0.8.185", "render", "--output", raw, "--fps", "30",
             "--quality", "high", "--quiet"], cwd=proj)
    if not os.path.exists(raw):
        sys.exit("no render at " + raw)
    d = dur(raw)

    # voice-only: master the speech to TikTok loudness (-14 LUFS, -1.5 dBTP)
    voice = os.path.join(out, f"{slug}-voice-only.mp4")
    run(["ffmpeg", "-loglevel", "error", "-y", "-i", raw, "-af",
         "loudnorm=I=-14:TP=-1.5:LRA=11", "-map", "0:v", "-map", "0:a"] + ENC + [voice])

    final = os.path.join(out, f"{slug}-final.mp4")
    if a.music:
        fo = max(0.0, d - 1.5)
        fc = (
            f"[1:a]atrim=start={a.music_start},asetpts=PTS-STARTPTS,atrim=0:{d:.3f},"
            f"aformat=sample_rates=48000:channel_layouts=stereo,volume={a.music_volume},"
            f"afade=t=in:d=0.4,afade=t=out:st={fo:.3f}:d=1.5[m];"
            f"[0:a]aformat=sample_rates=48000:channel_layouts=stereo,asplit=2[v][sc];"
            # duck the music while anyone talks
            f"[m][sc]sidechaincompress=threshold=0.02:ratio=6:attack=15:release=350[duck];"
            f"[v][duck]amix=inputs=2:duration=first:normalize=0,"
            f"loudnorm=I=-14:TP=-1.5:LRA=11[a]"
        )
        run(["ffmpeg", "-loglevel", "error", "-y", "-i", raw, "-stream_loop", "-1", "-i", a.music,
             "-filter_complex", fc, "-map", "0:v", "-map", "[a]", "-t", f"{d:.3f}"] + ENC + [final])
    else:
        shutil.copy(voice, final)

    cover = os.path.join(out, f"{slug}-cover.jpg")
    run(["ffmpeg", "-loglevel", "error", "-y", "-ss", str(a.cover_at), "-i", final,
         "-frames:v", "1", "-q:v", "2", cover])

    report = {}
    for p in (final, voice):
        s = json.loads(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                                       "stream=width,height,r_frame_rate,codec_name", "-of", "json", p],
                                      capture_output=True, text=True).stdout)["streams"][0]
        lufs, peak = loudness(p)
        report[os.path.basename(p)] = {
            "size": f"{s['width']}x{s['height']}", "fps": s["r_frame_rate"], "codec": s["codec_name"],
            "duration_s": round(dur(p), 2), "lufs": lufs, "peak_dbfs": peak,
            "mb": round(os.path.getsize(p) / 1e6, 1)}
    os.remove(raw)
    print(json.dumps({"ok": True, "music": bool(a.music), "files": report, "cover": cover}, indent=2))


if __name__ == "__main__":
    main()
