#!/bin/sh
# Release media from a record.mjs output directory:
#   demo/render.sh <record-out-dir> <dest-dir>
# The capture is BT.601 full-range JPEG frames at 1440x810; this converts it to
# 1920x1080 limited-range BT.709 H.264 and cuts the GIF from the opening.
set -eu
src=$1 dest=$2
mkdir -p "$dest"
ffmpeg -hide_banner -loglevel error -y -i "$src/demo.mp4" \
  -vf "scale=1920:1080:flags=lanczos:in_color_matrix=bt601:in_range=pc:out_color_matrix=bt709:out_range=tv,format=yuv420p,setparams=range=tv:color_primaries=bt709:color_trc=bt709:colorspace=bt709" \
  -c:v libx264 -preset slow -crf 16 -tune stillimage -profile:v high -level:v 4.1 \
  -color_primaries bt709 -color_trc bt709 -colorspace bt709 -color_range tv -an \
  -map_metadata -1 -fflags +bitexact -flags:v +bitexact -movflags +faststart "$dest/colors-intro.mp4"
ffmpeg -hide_banner -loglevel error -y -ss 0.4 -t 11 -i "$dest/colors-intro.mp4" \
  -vf "fps=12,scale=720:-2:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a" \
  "$dest/colors-preview.gif"
ffmpeg -hide_banner -loglevel error -y -i "$src/poster.png" -vf "scale=1920:1080:flags=lanczos" -map_metadata -1 "$dest/colors-poster.png"
