#!/usr/bin/env python3
"""Normalize a raw phone clip into a 1080x1920, 30 fps, -14 LUFS working file.

usage: prep.py RAW_VIDEO PROJECT_DIR [--mode auto|crop|fill] [--no-loudnorm]

Writes PROJECT_DIR/assets/source.mp4 and prints a JSON summary.
  crop: scale to cover 1080x1920 and center-crop (vertical phone footage)
  fill: fit the whole frame, blurred copy behind it (landscape footage)
  auto: crop when the source is portrait-ish (aspect <= 0.8), else fill
"""
import argparse, json, os, subprocess, sys

W, H, FPS = 1080, 1920, 30


def probe(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-print_format", "json", "-show_streams", "-show_format", path],
        capture_output=True, text=True, check=True,
    ).stdout
    info = json.loads(out)
    v = next((s for s in info["streams"] if s["codec_type"] == "video"), None)
    a = next((s for s in info["streams"] if s["codec_type"] == "audio"), None)
    if not v:
        sys.exit("no video stream in " + path)
    w, h = int(v["width"]), int(v["height"])
    rot = 0
    for sd in v.get("side_data_list", []) or []:
        if "rotation" in sd:
            rot = int(float(sd["rotation"]))
    rot = int(v.get("tags", {}).get("rotate", rot))
    if abs(rot) % 180 == 90:  # ffmpeg auto-rotates, so swap for aspect math
        w, h = h, w
    return {
        "width": w, "height": h, "rotation": rot,
        "fps": v.get("avg_frame_rate"), "codec": v.get("codec_name"),
        "duration": float(info["format"].get("duration", 0)),
        "has_audio": a is not None,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("raw")
    ap.add_argument("project")
    ap.add_argument("--mode", default="auto", choices=["auto", "crop", "fill"])
    ap.add_argument("--no-loudnorm", action="store_true")
    args = ap.parse_args()

    src = probe(args.raw)
    aspect = src["width"] / src["height"]
    mode = args.mode if args.mode != "auto" else ("crop" if aspect <= 0.8 else "fill")

    if mode == "crop":
        vf = f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},setsar=1,fps={FPS}"
        fc = f"[0:v]{vf}[v]"
    else:
        fc = (
            f"[0:v]split[a][b];"
            f"[a]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},boxblur=40:2,eq=brightness=-0.08[bg];"
            f"[b]scale={W}:{H}:force_original_aspect_ratio=decrease[fg];"
            f"[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1,fps={FPS}[v]"
        )

    os.makedirs(os.path.join(args.project, "assets"), exist_ok=True)
    out = os.path.join(args.project, "assets", "source.mp4")
    cmd = ["ffmpeg", "-loglevel", "error", "-y", "-i", args.raw]
    if not src["has_audio"]:
        cmd += ["-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo"]
    cmd += ["-filter_complex", fc, "-map", "[v]"]
    if src["has_audio"]:
        cmd += ["-map", "0:a:0"]
        if not args.no_loudnorm:
            cmd += ["-af", "highpass=f=70,loudnorm=I=-14:TP=-1.5:LRA=11"]
    else:
        cmd += ["-map", "1:a:0", "-shortest"]
    # -g FPS: a keyframe every second so HyperFrames can seek without freezing
    cmd += [
        "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
        "-g", str(FPS), "-r", str(FPS),
        "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
        "-movflags", "+faststart", out,
    ]
    subprocess.run(cmd, check=True)
    res = probe(out)
    print(json.dumps({"ok": True, "source": src, "mode": mode, "output": out,
                      "duration": res["duration"]}, indent=2))


if __name__ == "__main__":
    main()
