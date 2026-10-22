#!/usr/bin/env python3
"""Cut the source down to the EDL and re-time the transcript to match.

usage: apply_cuts.py PROJECT_DIR

Reads  PROJECT_DIR/edl.json, assets/source.mp4, transcript.json
Writes PROJECT_DIR/assets/cut.mp4 and PROJECT_DIR/words.json (word times on the cut).

Segments play in the order listed, so a segment can be moved (or copied) to the front
as a hook. Optional per-segment "speed" (e.g. 1.5) speeds up silent B-roll; leave it
off for speech, it pitches the voice.
"""
import json, os, subprocess, sys

FPS = 30


def main():
    proj = sys.argv[1]
    edl = json.load(open(os.path.join(proj, "edl.json")))
    tpath = os.path.join(proj, "transcript.json")
    words = json.load(open(tpath)) if os.path.exists(tpath) else []
    segs = edl["segments"]
    if not segs:
        sys.exit("edl.json has no segments")
    n = len(segs)

    parts = [f"[0:v]split={n}" + "".join(f"[vi{i}]" for i in range(n)),
             f"[0:a]asplit={n}" + "".join(f"[ai{i}]" for i in range(n))]
    for i, s in enumerate(segs):
        sp = float(s.get("speed", 1))
        d = (s["end"] - s["start"]) / sp
        fo = max(0.0, d - 0.015)
        parts.append(f"[vi{i}]trim=start={s['start']}:end={s['end']},setpts=(PTS-STARTPTS)/{sp},fps={FPS}[v{i}]")
        atempo = f",atempo={sp}" if sp != 1 else ""
        # 10-15 ms fades at every join so cuts don't click
        parts.append(f"[ai{i}]atrim=start={s['start']}:end={s['end']},asetpts=PTS-STARTPTS{atempo},"
                     f"afade=t=in:d=0.01,afade=t=out:st={fo:.3f}:d=0.015[a{i}]")
    parts.append("".join(f"[v{i}][a{i}]" for i in range(n)) + f"concat=n={n}:v=1:a=1[v][a]")

    out = os.path.join(proj, "assets", "cut.mp4")
    subprocess.run([
        "ffmpeg", "-loglevel", "error", "-y", "-i", os.path.join(proj, edl["source"]),
        "-filter_complex", ";".join(parts), "-map", "[v]", "-map", "[a]",
        "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
        "-g", str(FPS), "-r", str(FPS), "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
        "-movflags", "+faststart", out], check=True)

    # Re-time words onto the cut. A word belongs to the segment holding its spoken middle
    # (word ends from the recognizer run on into the pause after them, so cap at +0.6 s).
    cut_words, off, joins = [], 0.0, []
    for i, s in enumerate(segs):
        sp = float(s.get("speed", 1))
        for w in words:
            mid = (w["start"] + min(w["end"], w["start"] + 0.6)) / 2
            if s["start"] <= mid < s["end"]:
                st = off + (max(w["start"], s["start"]) - s["start"]) / sp
                en = off + (min(w["end"], s["end"]) - s["start"]) / sp
                cut_words.append({"text": w["text"], "start": round(st, 3), "end": round(en, 3)})
        off += (s["end"] - s["start"]) / sp
        if i < n - 1:
            joins.append(round(off, 3))
    for k in range(len(cut_words) - 1):  # no overlaps
        cut_words[k]["end"] = min(cut_words[k]["end"], cut_words[k + 1]["start"])
    for k, w in enumerate(cut_words):
        w["id"] = f"w{k}"

    dur = float(subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out],
        capture_output=True, text=True, check=True).stdout.strip())
    json.dump({"duration": round(dur, 3), "joins": joins, "words": cut_words},
              open(os.path.join(proj, "words.json"), "w"), indent=2)
    print(json.dumps({"ok": True, "output": out, "duration": round(dur, 2),
                      "segments": n, "words": len(cut_words)}))


if __name__ == "__main__":
    main()
