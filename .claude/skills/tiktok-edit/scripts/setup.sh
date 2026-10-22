#!/usr/bin/env bash
# One-time setup per machine/container: ffmpeg check, speech model, HyperFrames runtime.
# Safe to re-run; skips what is already there.
set -euo pipefail
HF="npx --yes hyperframes@0.8.185"

command -v ffmpeg >/dev/null || { echo "ffmpeg missing: install it (apt-get install -y ffmpeg / brew install ffmpeg)"; exit 1; }

# Parakeet speech-to-text model. HyperFrames downloads it from Hugging Face, which some
# networks (Claude Code cloud sessions) block, so fetch the identical files from GitHub.
DIR="$HOME/.cache/hyperframes/parakeet/parakeet-tdt-0.6b-v3-int8"
if [ ! -s "$DIR/encoder.int8.onnx" ] || [ "$(stat -c%s "$DIR/encoder.int8.onnx" 2>/dev/null || stat -f%z "$DIR/encoder.int8.onnx")" != "652184281" ]; then
  echo "Downloading Parakeet model (~490 MB)..."
  mkdir -p "$(dirname "$DIR")"
  TMP="$(dirname "$DIR")/parakeet.tar.bz2"
  curl -fsSL --retry 4 -o "$TMP" \
    https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8.tar.bz2
  tar xjf "$TMP" -C "$(dirname "$DIR")"
  rm -rf "$DIR" "$TMP"
  mv "$(dirname "$DIR")/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8" "$DIR"
fi

# Installs the sherpa-onnx runtime from npm and verifies the model checksums.
$HF models install parakeet >/dev/null 2>&1 || $HF models install parakeet
echo "tiktok-edit setup OK"
