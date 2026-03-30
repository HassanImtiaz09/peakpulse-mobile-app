#!/usr/bin/env python3
"""
Fix remaining test failures by updating assertion strings to match
the current expo-image GIF architecture.
"""
import os

PROJECT = "/home/ubuntu/peakpulse-mobile"

# Each file gets specific find/replace pairs
fixes = {
    "__tests__/local-gif-assets.test.ts": [
        # The test checks exercise-demo-player should NOT import expo-video
        # It currently says "should use ExerciseVideoPlayer for MP4 playback"
        # but the assertion inside checks for expo-video import which should NOT be there
        ('it("should use ExerciseVideoPlayer for MP4 playback"',
         'it("should NOT import expo-video"'),
        ('it("should use getExerciseVideoUrl for angle-aware lookups"',
         'it("should use resolveGifAsset for angle-aware lookups"'),
    ],
    "__tests__/round59-features.test.ts": [
        # This test imports getExerciseVideoUrl which still exists in exercise-gif-registry.ts
        # The test itself should pass since the function still exists
        # Let's check what the actual failing assertion is
    ],
    "__tests__/round74-caching-angles-favs.test.ts": [
        # Line 34: expect(content).not.toContain("getExerciseVideoUrl") - checks exercise-demo-player
        # This should pass since exercise-demo-player doesn't use getExerciseVideoUrl
        # Line 82: same check for a different file
        # Line 216: checks exercise-gif-registry.ts exports getExerciseVideoUrl - it does
    ],
    "__tests__/round88-exercise-images.test.ts": [
        # Line 136: checks enhanced-gif-player contains <ExerciseVideoPlayer
        ('expect(enhancedContent).toContain("<ExerciseVideoPlayer")',
         'expect(enhancedContent).toContain("<Image")'),
        # Line 140: checks for exerciseKey: string;
        ('expect(enhancedContent).toContain("exerciseKey: string;")',
         'expect(enhancedContent).toContain("exerciseName?: string;")'),
        # Line 144: checks for getExerciseVideoUrl(frontKey, angle)
        ('expect(enhancedContent).toContain("getExerciseVideoUrl(frontKey, angle)")',
         'expect(enhancedContent).toContain("getExerciseDbGifUrl")'),
        # Line 47: checks registry exports getExerciseVideoUrl - it still does, should pass
        ('expect(registryContent).toContain("export function getExerciseVideoUrl(")',
         'expect(registryContent).toContain("export function getExerciseVideoUrl(")'),
    ],
}

# Now let's read each failing test and do targeted fixes
for tf_name in [
    "__tests__/local-gif-assets.test.ts",
    "__tests__/round59-features.test.ts",
    "__tests__/round66-enhanced-video.test.ts",
    "__tests__/round74-caching-angles-favs.test.ts",
    "__tests__/round75-video-diagram.test.ts",
    "__tests__/round78-features.test.ts",
    "__tests__/round88-exercise-images.test.ts",
]:
    path = os.path.join(PROJECT, tf_name)
    if not os.path.exists(path):
        continue
    
    with open(path) as f:
        content = f.read()
    
    original = content
    
    # ── round88: enhanced-gif-player assertions ──
    if "round88" in tf_name:
        content = content.replace(
            'expect(enhancedContent).toContain("<ExerciseVideoPlayer")',
            'expect(enhancedContent).toContain("<Image")'
        )
        content = content.replace(
            'expect(enhancedContent).toContain("exerciseKey: string;")',
            'expect(enhancedContent).toContain("exerciseName?: string;")'
        )
        content = content.replace(
            'expect(enhancedContent).toContain("getExerciseVideoUrl(frontKey, angle)")',
            'expect(enhancedContent).toContain("getExerciseDbGifUrl")'
        )
    
    # ── local-gif-assets: exercise-demo-player assertions ──
    if "local-gif-assets" in tf_name:
        # The test "should NOT import expo-video" — exercise-demo-player uses expo-image, not expo-video
        # The test body likely checks for expo-video NOT being present, which should pass
        # But the test description says "should use ExerciseVideoPlayer" which is misleading
        # Let's look at what the actual assertion is
        pass
    
    # ── round75: exercise-demo-player checks ──
    if "round75" in tf_name:
        # "exercise-demo-player.tsx uses resolveGifAsset, not ExerciseVideoPlayer"
        # This should pass since exercise-demo-player uses resolveGifAsset
        # "exercise-gif-registry.ts handles URL mapping and has 149 entries"
        # Check if the entry count assertion is wrong
        pass
    
    if content != original:
        with open(path, "w") as f:
            f.write(content)
        print(f"  UPDATED: {tf_name}")
    else:
        print(f"  no changes: {tf_name}")

print("\nDone!")
