#!/usr/bin/env python3
"""Propose a tight cut list (EDL) from the transcript and the audio's silences.

usage: plan_cuts.py PROJECT_DIR [--silence-db -32] [--min-silence 0.35] [--no-retakes]

Reads  PROJECT_DIR/assets/source.mp4 and PROJECT_DIR/transcript.json
Writes PROJECT_DIR/edl.json and prints the kept transcript, one numbered segment per line.

What it removes automatically:
  - dead air: every pause longer than --min-silence, leaving a short breath on each side
  - filler words: um, uh, erm, hmm, ah
  - retakes: when a run of 3+ words is said again within 15 s, the earlier take goes
Everything removed is listed in edl.json "removed" with a reason, so it can be put back.
Edit edl.json "segments" by hand to drop, reorder (e.g. move the payoff to the front
as the hook) or re-time segments, then run apply_cuts.py.
"""
import argparse, json, os, re, subprocess

FPS = 30
FILLERS = {"um", "uh", "umm", "uhh", "erm", "er", "hmm", "hm", "ah", "mm"}


def norm(t):
    return re.sub(r"[^a-z0-9$]", "", t.lower())


def duration(path):
    return float(subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
        capture_output=True, text=True, check=True).stdout.strip())


def silences(path, db, mind):
    err = subprocess.run(
        ["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-vn", "-af",
         f"silencedetect=noise={db}dB:d={mind}", "-f", "null", "-"],
        capture_output=True, text=True).stderr
    out, start = [], None
    for line in err.splitlines():
        m = re.search(r"silence_start: (-?[\d.]+)", line)
        if m:
            start = max(0.0, float(m.group(1)))
        m = re.search(r"silence_end: ([\d.]+)", line)
        if m and start is not None:
            out.append((start, float(m.group(1))))
            start = None
    if start is not None:
        out.append((start, None))
    return out


def subtract(keep, cuts):
    for cs, ce in cuts:
        nxt = []
        for ks, ke in keep:
            if ce <= ks or cs >= ke:
                nxt.append((ks, ke))
                continue
            if cs > ks:
                nxt.append((ks, cs))
            if ce < ke:
                nxt.append((ce, ke))
        keep = nxt
    return keep


def snap(t):
    return round(round(t * FPS) / FPS, 4)


def find_retakes(words, window=15.0, n=3):
    """Return (i, j) pairs: words[i:j] is an earlier take of what restarts at words[j]."""
    toks = [norm(w["text"]) for w in words]
    pairs, i = [], 0
    while i < len(words) - n:
        found = None
        for j in range(i + n, len(words) - n + 1):
            if words[j]["start"] - words[i]["start"] > window:
                break
            if toks[i:i + n] == toks[j:j + n] and all(toks[i:i + n]):
                found = j
                break
        if found is not None:
            # back up to the start of the sentence the false start belongs to (max 3 words)
            s = i
            while s > 0 and i - s < 3 and not re.search(r"[.?!]$", words[s - 1]["text"]):
                s -= 1
            pairs.append((s, found))
            i = found
        else:
            i += 1
    return pairs


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("project")
    ap.add_argument("--silence-db", type=float, default=-32)
    ap.add_argument("--min-silence", type=float, default=0.35)
    ap.add_argument("--no-retakes", action="store_true")
    a = ap.parse_args()

    src = os.path.join(a.project, "assets", "source.mp4")
    tpath = os.path.join(a.project, "transcript.json")
    words = json.load(open(tpath)) if os.path.exists(tpath) else []
    dur = duration(src)
    removed = []

    for s, e in silences(src, a.silence_db, a.min_silence):
        e = dur if e is None else e
        cs = 0.0 if s <= 0.05 else s + 0.10          # keep a short tail after speech
        ce = dur if e >= dur - 0.05 else e - 0.08     # and a short breath before it
        if s > 0.05 and e >= dur - 0.05:
            cs = s + 0.25                              # let the last word ring out
        # soft word onsets read as silence: never cut into a word the transcript starts here
        nxt = next((w["start"] for w in words if w["start"] >= s - 0.02), None)
        if nxt is not None and ce > nxt - 0.06:
            ce = nxt - 0.06
        if ce - cs >= 0.2:
            removed.append({"start": cs, "end": ce, "reason": "silence"})

    for k, w in enumerate(words):
        if norm(w["text"]) in FILLERS:
            end = min(w["end"], words[k + 1]["start"]) if k + 1 < len(words) else w["end"]
            removed.append({"start": w["start"], "end": end, "reason": "filler", "text": w["text"]})

    if not a.no_retakes:
        for i, j in find_retakes(words):
            removed.append({
                "start": words[i]["start"], "end": words[j]["start"] - 0.05, "reason": "retake",
                "text": " ".join(w["text"] for w in words[i:j]),
            })

    keep = subtract([(0.0, dur)], [(r["start"], r["end"]) for r in removed])
    segs = []
    for s, e in keep:
        s, e = snap(s), snap(e)
        if e - s >= 0.2:
            segs.append({"start": s, "end": e})

    edl = {"source": "assets/source.mp4", "fps": FPS, "source_duration": round(dur, 3),
           "segments": segs, "removed": sorted(removed, key=lambda r: r["start"])}
    json.dump(edl, open(os.path.join(a.project, "edl.json"), "w"), indent=2)

    total = sum(s["end"] - s["start"] for s in segs)
    print(f"source {dur:.1f}s -> cut {total:.1f}s in {len(segs)} segments\n")
    for n, s in enumerate(segs):
        txt = " ".join(w["text"] for w in words
                       if s["start"] <= (w["start"] + min(w["end"], w["start"] + 0.6)) / 2 < s["end"])
        print(f"[{n}] {s['start']:7.2f}-{s['end']:7.2f}  {txt or '(no speech)'}")
    for r in edl["removed"]:
        if r["reason"] != "silence":
            print(f"  removed {r['reason']}: {r['start']:.2f}-{r['end']:.2f} {r.get('text', '')}")


if __name__ == "__main__":
    main()
