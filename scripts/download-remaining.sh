#!/bin/bash
# Download remaining 42 failed exercises using MuscleWiki API key

OUTDIR="/home/ubuntu/peakpulse-mobile/assets/exercise-gifs"
TMPDIR="/tmp/exercise-videos"
API_KEY="mw_3iyO6po09klnJ32xUqmf7BLsY2X4cy1fRO9kqpi9LlU"
BASE="https://api.musclewiki.com/stream/videos/branded"
mkdir -p "$OUTDIR" "$TMPDIR"

CONVERTED=0
FAILED=0

download_and_convert() {
    local filename="$1"
    local mp4="$TMPDIR/${filename}.mp4"
    local gif="$OUTDIR/${filename}.gif"
    
    if [ -f "$gif" ] && [ -s "$gif" ]; then
        echo "SKIP: $filename"
        CONVERTED=$((CONVERTED + 1))
        return
    fi
    
    echo -n "DL: $filename... "
    http_code=$(curl -sL -H "x-api-key: $API_KEY" --connect-timeout 15 --max-time 60 -o "$mp4" -w "%{http_code}" "$BASE/${filename}.mp4")
    
    if [ "$http_code" != "200" ] || [ ! -s "$mp4" ]; then
        echo "FAIL ($http_code)"
        FAILED=$((FAILED + 1))
        rm -f "$mp4"
        return
    fi
    
    echo -n "OK -> GIF... "
    ffmpeg -y -i "$mp4" \
        -vf "fps=10,scale=180:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=48:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3" \
        -loop 0 "$gif" 2>/dev/null
    
    if [ -f "$gif" ] && [ -s "$gif" ]; then
        echo "OK ($(du -h "$gif" | cut -f1))"
        CONVERTED=$((CONVERTED + 1))
        rm -f "$mp4"
    else
        echo "CONVERT_FAIL"
        FAILED=$((FAILED + 1))
        rm -f "$gif" "$mp4"
    fi
}

echo "=== Downloading remaining exercises via API key ==="

# All 42 failed filenames
EXERCISES=(
    "male-Bands-band-overhead-tricep-extension-front"
    "male-Barbell-barbell-bent-over-row-front"
    "male-Barbell-barbell-front-squat-olympic-front"
    "male-Barbell-barbell-incline-bench-press-front"
    "male-Barbell-barbell-reverse-lunge-front"
    "male-Barbell-barbell-squat-front"
    "male-Barbell-landmine-t-bar-rows-front"
    "male-Bodyweight-bodyweight-tricep-extension-front"
    "male-Bodyweight-burpee-front"
    "male-Bodyweight-elbow-side-plank-front"
    "male-Bodyweight-floor-incline-leg-raise-front"
    "male-Bodyweight-mountain-climber-front"
    "male-Bodyweight-walking-lunge-front"
    "male-Cable-cable-rope-face-pulls-front"
    "male-Cardio-jump-rope-front"
    "male-Dumbbells-dumbbell-arnold-press-front"
    "male-Dumbbells-dumbbell-leg-curl-front"
    "male-Dumbbells-dumbbell-pendlay-row-front"
    "male-Dumbbells-dumbbell-shrug-front"
    "male-Kettlebells-kettlebell-russian-twist-front"
    "male-Kettlebells-kettlebell-skull-crusher-front"
    "male-Kettlebells-kettlebell-swing-front"
    "male-Machine-machine-hack-squat-front"
    "male-Plyometrics-box-jump-front"
    "male-TRX-trx-ab-rollout-front"
    "male-barbell-stiff-leg-deadlift-front"
    "male-bodyweight-bench-dips-front"
    "male-bodyweight-bulgarian-split-squat-front"
    "male-bodyweight-chin-ups-front"
    "male-bodyweight-forearm-plank-front"
    "male-bodyweight-glute-bridge-front"
    "male-bodyweight-pull-ups-front"
    "male-bodyweight-push-up-front"
    "male-cable-woodchopper-front"
    "male-dumbbell-concentration-curl-front"
    "male-dumbbell-front-raise-front"
    "male-dumbbell-hammer-curl-front"
    "male-dumbbell-lateral-raise-front"
    "male-dumbbell-rear-delt-fly-front"
    "male-dumbbell-row-bilateral-front"
    "male-machine-leg-press-front"
    "male-machine-seated-cable-row-front"
)

for ex in "${EXERCISES[@]}"; do
    download_and_convert "$ex"
    sleep 1  # Rate limit protection
done

echo ""
echo "=== RESULTS ==="
echo "Converted: $CONVERTED"
echo "Failed: $FAILED"
echo "Total GIFs: $(ls "$OUTDIR"/*.gif 2>/dev/null | wc -l)"
echo "Total size: $(du -sh "$OUTDIR" | cut -f1)"
