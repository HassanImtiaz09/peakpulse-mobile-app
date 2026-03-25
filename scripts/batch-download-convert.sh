#!/bin/bash
# Batch download MuscleWiki videos and convert to optimized GIFs

OUTDIR="/home/ubuntu/peakpulse-mobile/assets/exercise-gifs"
TMPDIR="/tmp/exercise-videos"
mkdir -p "$OUTDIR" "$TMPDIR"

CONVERTED=0
FAILED=0
SKIPPED=0
FAILED_LIST=""

while IFS= read -r url; do
    filename=$(basename "$url" .mp4)
    mp4="$TMPDIR/${filename}.mp4"
    gif="$OUTDIR/${filename}.gif"
    
    # Skip if GIF already exists
    if [ -f "$gif" ] && [ -s "$gif" ]; then
        echo "SKIP: $filename"
        SKIPPED=$((SKIPPED + 1))
        CONVERTED=$((CONVERTED + 1))
        continue
    fi
    
    # Download MP4
    http_code=$(curl -sL -o "$mp4" -w "%{http_code}" "$url")
    if [ "$http_code" != "200" ] || [ ! -s "$mp4" ]; then
        echo "FAIL ($http_code): $filename"
        FAILED=$((FAILED + 1))
        FAILED_LIST="$FAILED_LIST $filename"
        rm -f "$mp4"
        continue
    fi
    
    # Convert to GIF
    ffmpeg -y -i "$mp4" \
        -vf "fps=10,scale=180:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=48:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3" \
        -loop 0 "$gif" 2>/dev/null
    
    if [ -f "$gif" ] && [ -s "$gif" ]; then
        size=$(du -h "$gif" | cut -f1)
        echo "OK ($size): $filename"
        CONVERTED=$((CONVERTED + 1))
        rm -f "$mp4"
    else
        echo "CONVERT_FAIL: $filename"
        FAILED=$((FAILED + 1))
        FAILED_LIST="$FAILED_LIST $filename"
        rm -f "$gif" "$mp4"
    fi
done < /tmp/media-urls.txt

echo ""
echo "=== RESULTS ==="
echo "Converted: $CONVERTED (including $SKIPPED skipped)"
echo "Failed: $FAILED"
[ -n "$FAILED_LIST" ] && echo "Failed:$FAILED_LIST"
echo "GIFs: $(ls "$OUTDIR"/*.gif 2>/dev/null | wc -l)"
echo "Size: $(du -sh "$OUTDIR" | cut -f1)"
