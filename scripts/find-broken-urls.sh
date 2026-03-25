#!/bin/bash
# Try multiple URL variations for the 21 broken exercises on media.musclewiki.com
BASE="https://media.musclewiki.com/media/uploads/videos/branded"

try_url() {
    local url="$1"
    local label="$2"
    local code=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    if [ "$code" = "200" ]; then
        echo "FOUND ($label): $url"
        return 0
    fi
    return 1
}

echo "=== Finding correct URLs for 21 broken exercises ==="

# 1. band overhead tricep extension
echo -e "\n--- overhead tricep extension ---"
try_url "$BASE/male-Bands-band-overhead-tricep-extension-front.mp4" "orig" || \
try_url "$BASE/male-bands-band-overhead-tricep-extension-front.mp4" "lower" || \
try_url "$BASE/male-Bands-overhead-tricep-extension-front.mp4" "short" || \
try_url "$BASE/male-Resistance-Band-band-overhead-tricep-extension-front.mp4" "alt" || \
try_url "$BASE/male-Cable-cable-overhead-tricep-extension-front.mp4" "cable" || \
try_url "$BASE/male-Dumbbells-dumbbell-overhead-tricep-extension-front.mp4" "dumbbell" || \
echo "NOT FOUND: overhead tricep extension"

# 2. barbell bent over row
echo -e "\n--- barbell bent over row ---"
try_url "$BASE/male-Barbell-barbell-bent-over-row-front.mp4" "orig" || \
try_url "$BASE/male-Barbell-bent-over-row-front.mp4" "short" || \
try_url "$BASE/male-barbell-barbell-bent-over-row-front.mp4" "lower" || \
try_url "$BASE/male-Barbell-barbell-row-front.mp4" "alt" || \
echo "NOT FOUND: barbell bent over row"

# 3. barbell reverse lunge
echo -e "\n--- barbell reverse lunge ---"
try_url "$BASE/male-Barbell-barbell-reverse-lunge-front.mp4" "orig" || \
try_url "$BASE/male-Barbell-reverse-lunge-front.mp4" "short" || \
try_url "$BASE/male-Bodyweight-reverse-lunge-front.mp4" "bw" || \
try_url "$BASE/male-Dumbbells-dumbbell-reverse-lunge-front.mp4" "db" || \
echo "NOT FOUND: reverse lunge"

# 4. burpee
echo -e "\n--- burpee ---"
try_url "$BASE/male-Bodyweight-burpee-front.mp4" "orig" || \
try_url "$BASE/male-Bodyweight-burpees-front.mp4" "plural" || \
try_url "$BASE/male-Plyometrics-burpee-front.mp4" "plyo" || \
try_url "$BASE/male-Cardio-burpee-front.mp4" "cardio" || \
echo "NOT FOUND: burpee"

# 5. side plank
echo -e "\n--- side plank ---"
try_url "$BASE/male-Bodyweight-elbow-side-plank-front.mp4" "orig" || \
try_url "$BASE/male-Bodyweight-side-plank-front.mp4" "short" || \
try_url "$BASE/male-bodyweight-side-plank-front.mp4" "lower" || \
echo "NOT FOUND: side plank"

# 6. leg raise
echo -e "\n--- leg raise ---"
try_url "$BASE/male-Bodyweight-floor-incline-leg-raise-front.mp4" "orig" || \
try_url "$BASE/male-Bodyweight-leg-raise-front.mp4" "short" || \
try_url "$BASE/male-Bodyweight-lying-leg-raise-front.mp4" "lying" || \
try_url "$BASE/male-bodyweight-leg-raise-front.mp4" "lower" || \
try_url "$BASE/male-Bodyweight-flat-bench-lying-leg-raise-front.mp4" "bench" || \
echo "NOT FOUND: leg raise"

# 7. mountain climber
echo -e "\n--- mountain climber ---"
try_url "$BASE/male-Bodyweight-mountain-climber-front.mp4" "orig" || \
try_url "$BASE/male-Bodyweight-mountain-climbers-front.mp4" "plural" || \
try_url "$BASE/male-Cardio-mountain-climber-front.mp4" "cardio" || \
try_url "$BASE/male-bodyweight-mountain-climber-front.mp4" "lower" || \
echo "NOT FOUND: mountain climber"

# 8. walking lunge
echo -e "\n--- walking lunge ---"
try_url "$BASE/male-Bodyweight-walking-lunge-front.mp4" "orig" || \
try_url "$BASE/male-Bodyweight-bodyweight-walking-lunge-front.mp4" "full" || \
try_url "$BASE/male-bodyweight-walking-lunge-front.mp4" "lower" || \
try_url "$BASE/male-Dumbbells-dumbbell-walking-lunge-front.mp4" "db" || \
echo "NOT FOUND: walking lunge"

# 9. face pulls
echo -e "\n--- face pulls ---"
try_url "$BASE/male-Cable-cable-rope-face-pulls-front.mp4" "orig" || \
try_url "$BASE/male-Cable-cable-face-pull-front.mp4" "singular" || \
try_url "$BASE/male-Cable-face-pull-front.mp4" "short" || \
try_url "$BASE/male-Cable-cable-face-pulls-front.mp4" "alt" || \
try_url "$BASE/male-cable-face-pulls-front.mp4" "lower" || \
echo "NOT FOUND: face pulls"

# 10. dumbbell leg curl
echo -e "\n--- dumbbell leg curl ---"
try_url "$BASE/male-Dumbbells-dumbbell-leg-curl-front.mp4" "orig" || \
try_url "$BASE/male-Machine-machine-leg-curl-front.mp4" "machine" || \
try_url "$BASE/male-Machine-leg-curl-front.mp4" "mshort" || \
try_url "$BASE/male-Machine-machine-lying-leg-curl-front.mp4" "lying" || \
echo "NOT FOUND: leg curl"

# 11. pendlay row
echo -e "\n--- pendlay row ---"
try_url "$BASE/male-Dumbbells-dumbbell-pendlay-row-front.mp4" "orig" || \
try_url "$BASE/male-Barbell-barbell-pendlay-row-front.mp4" "barbell" || \
try_url "$BASE/male-Barbell-pendlay-row-front.mp4" "short" || \
echo "NOT FOUND: pendlay row"

# 12. box jump
echo -e "\n--- box jump ---"
try_url "$BASE/male-Plyometrics-box-jump-front.mp4" "orig" || \
try_url "$BASE/male-Plyometrics-plyometrics-box-jump-front.mp4" "full" || \
try_url "$BASE/male-Bodyweight-box-jump-front.mp4" "bw" || \
try_url "$BASE/male-plyometrics-box-jump-front.mp4" "lower" || \
echo "NOT FOUND: box jump"

# 13. ab rollout
echo -e "\n--- ab rollout ---"
try_url "$BASE/male-TRX-trx-ab-rollout-front.mp4" "orig" || \
try_url "$BASE/male-Bodyweight-ab-rollout-front.mp4" "bw" || \
try_url "$BASE/male-Other-ab-rollout-front.mp4" "other" || \
try_url "$BASE/male-Barbell-barbell-ab-rollout-front.mp4" "barbell" || \
echo "NOT FOUND: ab rollout"

# 14. chin ups
echo -e "\n--- chin ups ---"
try_url "$BASE/male-bodyweight-chin-ups-front.mp4" "orig" || \
try_url "$BASE/male-Bodyweight-chin-ups-front.mp4" "cap" || \
try_url "$BASE/male-Bodyweight-chin-up-front.mp4" "singular" || \
try_url "$BASE/male-Bodyweight-bodyweight-chin-ups-front.mp4" "full" || \
echo "NOT FOUND: chin ups"

# 15. pull ups
echo -e "\n--- pull ups ---"
try_url "$BASE/male-bodyweight-pull-ups-front.mp4" "orig" || \
try_url "$BASE/male-Bodyweight-pull-ups-front.mp4" "cap" || \
try_url "$BASE/male-Bodyweight-pull-up-front.mp4" "singular" || \
try_url "$BASE/male-Bodyweight-bodyweight-pull-ups-front.mp4" "full" || \
echo "NOT FOUND: pull ups"

# 16. dumbbell front raise
echo -e "\n--- dumbbell front raise ---"
try_url "$BASE/male-dumbbell-front-raise-front.mp4" "orig" || \
try_url "$BASE/male-Dumbbells-dumbbell-front-raise-front.mp4" "cap" || \
try_url "$BASE/male-Dumbbells-front-raise-front.mp4" "short" || \
echo "NOT FOUND: dumbbell front raise"

# 17. dumbbell hammer curl
echo -e "\n--- dumbbell hammer curl ---"
try_url "$BASE/male-dumbbell-hammer-curl-front.mp4" "orig" || \
try_url "$BASE/male-Dumbbells-dumbbell-hammer-curl-front.mp4" "cap" || \
try_url "$BASE/male-Dumbbells-hammer-curl-front.mp4" "short" || \
echo "NOT FOUND: dumbbell hammer curl"

# 18. dumbbell lateral raise
echo -e "\n--- dumbbell lateral raise ---"
try_url "$BASE/male-dumbbell-lateral-raise-front.mp4" "orig" || \
try_url "$BASE/male-Dumbbells-dumbbell-lateral-raise-front.mp4" "cap" || \
try_url "$BASE/male-Dumbbells-lateral-raise-front.mp4" "short" || \
echo "NOT FOUND: dumbbell lateral raise"

# 19. dumbbell rear delt fly
echo -e "\n--- dumbbell rear delt fly ---"
try_url "$BASE/male-dumbbell-rear-delt-fly-front.mp4" "orig" || \
try_url "$BASE/male-Dumbbells-dumbbell-rear-delt-fly-front.mp4" "cap" || \
try_url "$BASE/male-Dumbbells-rear-delt-fly-front.mp4" "short" || \
try_url "$BASE/male-Cable-cable-rear-delt-fly-front.mp4" "cable" || \
echo "NOT FOUND: dumbbell rear delt fly"

# 20. dumbbell row
echo -e "\n--- dumbbell row ---"
try_url "$BASE/male-dumbbell-row-bilateral-front.mp4" "orig" || \
try_url "$BASE/male-Dumbbells-dumbbell-row-bilateral-front.mp4" "cap" || \
try_url "$BASE/male-Dumbbells-dumbbell-row-front.mp4" "short" || \
try_url "$BASE/male-Dumbbells-dumbbell-single-arm-row-front.mp4" "single" || \
echo "NOT FOUND: dumbbell row"

# 21. machine leg press
echo -e "\n--- machine leg press ---"
try_url "$BASE/male-machine-leg-press-front.mp4" "orig" || \
try_url "$BASE/male-Machine-machine-leg-press-front.mp4" "cap" || \
try_url "$BASE/male-Machine-leg-press-front.mp4" "short" || \
try_url "$BASE/male-Machine-machine-seated-leg-press-front.mp4" "seated" || \
echo "NOT FOUND: machine leg press"

echo -e "\n=== DONE ==="
