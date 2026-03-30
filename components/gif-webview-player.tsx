/**
 * GifWebViewPlayer — WebView-based GIF Player with Speed & Play/Pause Control
 *
 * Uses a WebView to render GIF frames on a canvas element with full control
 * over playback speed and play/pause state. This bypasses expo-image's
 * limitation of not supporting GIF playback rate adjustment.
 *
 * Features:
 *   - 0.25x speed playback (configurable via `speed` prop)
 *   - Play/pause toggle via tap overlay
 *   - Speed badge showing current playback rate
 *   - Smooth frame-by-frame rendering using canvas
 *   - Falls back to expo-image for non-WebView environments
 */
import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
  ViewStyle,
} from "react-native";
import { WebView } from "react-native-webview";
import { Image } from "expo-image";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

interface GifWebViewPlayerProps {
  /** URL of the GIF to play */
  uri: string;
  /** Playback speed multiplier. 0.25 = quarter speed. Default: 0.25 */
  speed?: number;
  /** Height of the player. Default: 260 */
  height?: number;
  /** Whether to start playing automatically. Default: true */
  autoplay?: boolean;
  /** Additional style on the outer container */
  style?: ViewStyle;
  /** Called when the GIF fails to load */
  onError?: () => void;
  /** Called when the GIF successfully loads */
  onLoad?: () => void;
}

/**
 * Generate the HTML content for the WebView GIF player.
 * Uses libgif-js approach: fetches the GIF as binary, parses frames,
 * and renders them on a canvas with controlled timing.
 */
function generatePlayerHTML(gifUrl: string, speed: number, autoplay: boolean): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: 100%; height: 100%;
    background: #0D1117;
    overflow: hidden;
    -webkit-user-select: none;
    user-select: none;
  }
  #container {
    width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: center;
    position: relative;
  }
  canvas {
    max-width: 100%; max-height: 100%;
    object-fit: contain;
  }
  #overlay {
    position: absolute; inset: 0;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  #playIcon {
    width: 56px; height: 56px;
    background: rgba(0,0,0,0.55);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    opacity: 0;
    transition: opacity 0.25s ease;
    pointer-events: none;
  }
  #playIcon.visible { opacity: 1; }
  #playIcon svg { width: 28px; height: 28px; fill: #fff; }
  #speedBadge {
    position: absolute;
    top: 8px; right: 8px;
    background: rgba(245,158,11,0.85);
    color: #000;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 11px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 10px;
    letter-spacing: 0.3px;
  }
  #loading {
    position: absolute; inset: 0;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 8px;
  }
  .spinner {
    width: 24px; height: 24px;
    border: 2px solid rgba(245,158,11,0.3);
    border-top-color: #F59E0B;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .loadText {
    color: #6B7280;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 11px;
  }
</style>
</head>
<body>
<div id="container">
  <canvas id="canvas"></canvas>
  <div id="overlay">
    <div id="playIcon">
      <svg id="pauseSvg" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
      <svg id="playSvg" viewBox="0 0 24 24" style="display:none"><path d="M8 5v14l11-7z"/></svg>
    </div>
  </div>
  <div id="speedBadge">${speed}x</div>
  <div id="loading"><div class="spinner"></div><div class="loadText">Loading demo...</div></div>
</div>
<script>
(function() {
  var canvas = document.getElementById('canvas');
  var ctx = canvas.getContext('2d');
  var overlay = document.getElementById('overlay');
  var playIcon = document.getElementById('playIcon');
  var pauseSvg = document.getElementById('pauseSvg');
  var playSvg = document.getElementById('playSvg');
  var loadingEl = document.getElementById('loading');
  var speed = ${speed};
  var playing = ${autoplay ? 'true' : 'false'};
  var frames = [];
  var frameIndex = 0;
  var animTimer = null;
  var hideTimer = null;
  var loaded = false;

  // Use an Image element to load the GIF, then draw first frame
  // For frame-by-frame control, we use a different approach:
  // Load GIF as img, draw to canvas. For speed control, we use
  // a simpler approach: show/hide the img with CSS animation timing.
  
  // Actually, the simplest reliable cross-platform approach:
  // Load the GIF in an offscreen img, and use requestAnimationFrame
  // to periodically capture and redraw frames at the desired speed.
  // But this won't actually slow down the GIF since the browser
  // controls GIF frame timing internally.
  
  // Best approach: Use SuperGif-style parsing or simply use CSS
  // animation-play-state for pause, and for speed we can use a
  // creative workaround with the img element.
  
  // PRACTICAL SOLUTION: For play/pause, toggle img visibility.
  // For speed control, we'll use a canvas-based frame stepper.
  // We parse the GIF binary to extract individual frames.

  // Parse GIF frames from binary data
  function parseGIF(buffer) {
    var dv = new DataView(buffer);
    var offset = 0;
    
    // Check GIF header
    var header = '';
    for (var i = 0; i < 6; i++) header += String.fromCharCode(dv.getUint8(i));
    if (header.indexOf('GIF') !== 0) return null;
    offset = 6;
    
    // Logical Screen Descriptor
    var width = dv.getUint16(offset, true); offset += 2;
    var height = dv.getUint16(offset, true); offset += 2;
    var packed = dv.getUint8(offset); offset++;
    var bgIndex = dv.getUint8(offset); offset++;
    var pixelAspect = dv.getUint8(offset); offset++;
    
    var gctFlag = (packed >> 7) & 1;
    var gctSize = 2 << (packed & 7);
    
    // Global Color Table
    var gct = null;
    if (gctFlag) {
      gct = [];
      for (var i = 0; i < gctSize; i++) {
        gct.push([dv.getUint8(offset), dv.getUint8(offset+1), dv.getUint8(offset+2)]);
        offset += 3;
      }
    }
    
    var frames = [];
    var gce = { delay: 100, disposalMethod: 0, transparentIndex: -1 };
    
    while (offset < buffer.byteLength) {
      var sentinel = dv.getUint8(offset); offset++;
      
      if (sentinel === 0x3B) break; // Trailer
      
      if (sentinel === 0x21) { // Extension
        var label = dv.getUint8(offset); offset++;
        
        if (label === 0xF9) { // Graphics Control Extension
          var blockSize = dv.getUint8(offset); offset++;
          var gcePacked = dv.getUint8(offset); offset++;
          gce.delay = dv.getUint16(offset, true) * 10; // Convert to ms
          if (gce.delay < 20) gce.delay = 100; // Minimum delay
          offset += 2;
          gce.transparentIndex = (gcePacked & 1) ? dv.getUint8(offset) : -1;
          offset++;
          gce.disposalMethod = (gcePacked >> 2) & 7;
          offset++; // Block terminator
        } else {
          // Skip other extensions
          while (true) {
            var subBlockSize = dv.getUint8(offset); offset++;
            if (subBlockSize === 0) break;
            offset += subBlockSize;
          }
        }
      } else if (sentinel === 0x2C) { // Image Descriptor
        var imgLeft = dv.getUint16(offset, true); offset += 2;
        var imgTop = dv.getUint16(offset, true); offset += 2;
        var imgWidth = dv.getUint16(offset, true); offset += 2;
        var imgHeight = dv.getUint16(offset, true); offset += 2;
        var imgPacked = dv.getUint8(offset); offset++;
        
        var lctFlag = (imgPacked >> 7) & 1;
        var interlaced = (imgPacked >> 6) & 1;
        var lctSize = lctFlag ? (2 << (imgPacked & 7)) : 0;
        
        var lct = null;
        if (lctFlag) {
          lct = [];
          for (var i = 0; i < lctSize; i++) {
            lct.push([dv.getUint8(offset), dv.getUint8(offset+1), dv.getUint8(offset+2)]);
            offset += 3;
          }
        }
        
        var colorTable = lct || gct;
        
        // LZW Minimum Code Size
        var minCodeSize = dv.getUint8(offset); offset++;
        
        // Collect sub-blocks
        var lzwData = [];
        while (true) {
          var subBlockSize = dv.getUint8(offset); offset++;
          if (subBlockSize === 0) break;
          for (var i = 0; i < subBlockSize; i++) {
            lzwData.push(dv.getUint8(offset + i));
          }
          offset += subBlockSize;
        }
        
        // Decode LZW
        var pixels = decodeLZW(minCodeSize, lzwData, imgWidth * imgHeight);
        
        frames.push({
          left: imgLeft, top: imgTop,
          width: imgWidth, height: imgHeight,
          pixels: pixels,
          colorTable: colorTable,
          delay: gce.delay,
          disposalMethod: gce.disposalMethod,
          transparentIndex: gce.transparentIndex,
          interlaced: interlaced
        });
        
        // Reset GCE
        gce = { delay: 100, disposalMethod: 0, transparentIndex: -1 };
      } else {
        // Unknown block, try to skip
        break;
      }
    }
    
    return { width: width, height: height, frames: frames };
  }
  
  function decodeLZW(minCodeSize, data, pixelCount) {
    var clearCode = 1 << minCodeSize;
    var eoiCode = clearCode + 1;
    var codeSize = minCodeSize + 1;
    var codeMask = (1 << codeSize) - 1;
    var nextCode = eoiCode + 1;
    var maxCode = 1 << codeSize;
    
    // Initialize code table
    var table = [];
    for (var i = 0; i < clearCode; i++) table[i] = [i];
    table[clearCode] = [];
    table[eoiCode] = null;
    
    var bitBuf = 0, bitCount = 0, byteIndex = 0;
    
    function readCode() {
      while (bitCount < codeSize) {
        if (byteIndex >= data.length) return -1;
        bitBuf |= data[byteIndex++] << bitCount;
        bitCount += 8;
      }
      var code = bitBuf & codeMask;
      bitBuf >>= codeSize;
      bitCount -= codeSize;
      return code;
    }
    
    var pixels = new Uint8Array(pixelCount);
    var pixelIndex = 0;
    
    // First code must be clear code
    var code = readCode();
    if (code !== clearCode) return pixels;
    
    code = readCode();
    if (code === -1 || code === eoiCode) return pixels;
    
    var prevEntry = table[code] ? table[code].slice() : [code];
    for (var i = 0; i < prevEntry.length && pixelIndex < pixelCount; i++) {
      pixels[pixelIndex++] = prevEntry[i];
    }
    
    while (pixelIndex < pixelCount) {
      code = readCode();
      if (code === -1 || code === eoiCode) break;
      
      if (code === clearCode) {
        codeSize = minCodeSize + 1;
        codeMask = (1 << codeSize) - 1;
        nextCode = eoiCode + 1;
        maxCode = 1 << codeSize;
        table.length = eoiCode + 1;
        
        code = readCode();
        if (code === -1 || code === eoiCode) break;
        
        prevEntry = table[code] ? table[code].slice() : [code];
        for (var i = 0; i < prevEntry.length && pixelIndex < pixelCount; i++) {
          pixels[pixelIndex++] = prevEntry[i];
        }
        continue;
      }
      
      var entry;
      if (code < nextCode && table[code]) {
        entry = table[code].slice();
      } else if (code === nextCode) {
        entry = prevEntry.concat(prevEntry[0]);
      } else {
        break; // Error
      }
      
      for (var i = 0; i < entry.length && pixelIndex < pixelCount; i++) {
        pixels[pixelIndex++] = entry[i];
      }
      
      if (nextCode < 4096) {
        table[nextCode] = prevEntry.concat(entry[0]);
        nextCode++;
        if (nextCode > codeMask && codeSize < 12) {
          codeSize++;
          codeMask = (1 << codeSize) - 1;
          maxCode = 1 << codeSize;
        }
      }
      
      prevEntry = entry;
    }
    
    return pixels;
  }
  
  var gifData = null;
  var prevCanvas = null;
  
  function renderFrame(index) {
    if (!gifData || !gifData.frames.length) return;
    var frame = gifData.frames[index];
    
    // Handle disposal of previous frame
    if (index > 0) {
      var prevFrame = gifData.frames[index - 1];
      if (prevFrame.disposalMethod === 2) {
        // Restore to background
        ctx.clearRect(prevFrame.left, prevFrame.top, prevFrame.width, prevFrame.height);
      } else if (prevFrame.disposalMethod === 3 && prevCanvas) {
        // Restore to previous
        ctx.putImageData(prevCanvas, 0, 0);
      }
    }
    
    // Save canvas state if needed for next frame disposal
    if (frame.disposalMethod === 3) {
      prevCanvas = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }
    
    // Draw frame pixels
    var imageData = ctx.createImageData(frame.width, frame.height);
    var pixels = frame.pixels;
    var ct = frame.colorTable;
    
    // Handle interlaced frames
    var rowOrder;
    if (frame.interlaced) {
      rowOrder = [];
      // Pass 1: every 8th row starting from 0
      for (var r = 0; r < frame.height; r += 8) rowOrder.push(r);
      // Pass 2: every 8th row starting from 4
      for (var r = 4; r < frame.height; r += 8) rowOrder.push(r);
      // Pass 3: every 4th row starting from 2
      for (var r = 2; r < frame.height; r += 4) rowOrder.push(r);
      // Pass 4: every 2nd row starting from 1
      for (var r = 1; r < frame.height; r += 2) rowOrder.push(r);
    }
    
    for (var y = 0; y < frame.height; y++) {
      var srcRow = frame.interlaced ? rowOrder[y] : y;
      for (var x = 0; x < frame.width; x++) {
        var pixIdx = srcRow * frame.width + x;
        var colorIdx = pixels[pixIdx];
        var dstIdx = (y * frame.width + x) * 4;
        
        if (colorIdx === frame.transparentIndex) {
          imageData.data[dstIdx] = 0;
          imageData.data[dstIdx + 1] = 0;
          imageData.data[dstIdx + 2] = 0;
          imageData.data[dstIdx + 3] = 0;
        } else if (ct && ct[colorIdx]) {
          imageData.data[dstIdx] = ct[colorIdx][0];
          imageData.data[dstIdx + 1] = ct[colorIdx][1];
          imageData.data[dstIdx + 2] = ct[colorIdx][2];
          imageData.data[dstIdx + 3] = 255;
        }
      }
    }
    
    // Use a temporary canvas to put the frame data, then draw it
    var tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = frame.width;
    tmpCanvas.height = frame.height;
    tmpCanvas.getContext('2d').putImageData(imageData, 0, 0);
    ctx.drawImage(tmpCanvas, frame.left, frame.top);
  }
  
  function scheduleNextFrame() {
    if (!playing || !gifData || !gifData.frames.length) return;
    
    var frame = gifData.frames[frameIndex];
    var delay = frame.delay / speed; // Slow down by dividing by speed
    
    animTimer = setTimeout(function() {
      frameIndex = (frameIndex + 1) % gifData.frames.length;
      renderFrame(frameIndex);
      scheduleNextFrame();
    }, delay);
  }
  
  function play() {
    playing = true;
    scheduleNextFrame();
  }
  
  function pause() {
    playing = false;
    if (animTimer) { clearTimeout(animTimer); animTimer = null; }
  }
  
  function showPauseIcon() {
    pauseSvg.style.display = 'block';
    playSvg.style.display = 'none';
    playIcon.classList.add('visible');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(function() {
      if (playing) playIcon.classList.remove('visible');
    }, 800);
  }
  
  function showPlayIcon() {
    pauseSvg.style.display = 'none';
    playSvg.style.display = 'block';
    playIcon.classList.add('visible');
    // Don't auto-hide when paused
  }
  
  overlay.addEventListener('click', function(e) {
    e.preventDefault();
    if (!loaded) return;
    if (playing) {
      pause();
      showPlayIcon();
    } else {
      play();
      showPauseIcon();
    }
    // Notify React Native
    try {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'playState', playing: playing }));
    } catch(e) {}
  });
  
  // Fetch and parse the GIF
  fetch('${gifUrl.replace(/'/g, "\\'")}')
    .then(function(r) { 
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.arrayBuffer(); 
    })
    .then(function(buf) {
      gifData = parseGIF(buf);
      if (!gifData || !gifData.frames.length) {
        throw new Error('No frames parsed');
      }
      
      canvas.width = gifData.width;
      canvas.height = gifData.height;
      
      // Render first frame
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      renderFrame(0);
      
      loaded = true;
      loadingEl.style.display = 'none';
      
      try {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'loaded' }));
      } catch(e) {}
      
      if (playing) scheduleNextFrame();
    })
    .catch(function(err) {
      loadingEl.innerHTML = '<div style="color:#6B7280;font-size:12px;font-family:-apple-system,sans-serif">Failed to load</div>';
      try {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: err.message }));
      } catch(e) {}
    });
})();
</script>
</body>
</html>`;
}

export default function GifWebViewPlayer({
  uri,
  speed = 0.25,
  height = 260,
  autoplay = true,
  style,
  onError,
  onLoad,
}: GifWebViewPlayerProps) {
  const webViewRef = useRef<WebView>(null);
  const [isPlaying, setIsPlaying] = useState(autoplay);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const html = generatePlayerHTML(uri, speed, autoplay);

  const handleMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === "loaded") {
          setLoaded(true);
          onLoad?.();
        } else if (data.type === "error") {
          setError(true);
          onError?.();
        } else if (data.type === "playState") {
          setIsPlaying(data.playing);
        }
      } catch {
        // Ignore parse errors
      }
    },
    [onLoad, onError]
  );

  // For web platform, fall back to expo-image with play/pause via ref
  if (Platform.OS === "web") {
    return (
      <WebFallbackPlayer
        uri={uri}
        speed={speed}
        height={height}
        autoplay={autoplay}
        style={style}
        onError={onError}
        onLoad={onLoad}
      />
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { height }, style]}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={24} color="#6B7280" />
          <Text style={styles.errorText}>Demo not available</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }, style]}>
      <WebView
        ref={webViewRef}
        source={{ html }}
        style={styles.webview}
        scrollEnabled={false}
        bounces={false}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        onMessage={handleMessage}
        originWhitelist={["*"]}
        mixedContentMode="always"
        allowFileAccess
        allowUniversalAccessFromFileURLs
      />
    </View>
  );
}

/**
 * Web platform fallback — uses expo-image with ref-based play/pause.
 * Speed control is not available on web; shows GIF at native speed.
 */
function WebFallbackPlayer({
  uri,
  speed,
  height = 260,
  autoplay = true,
  style,
  onError,
  onLoad,
}: GifWebViewPlayerProps) {
  const imageRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(autoplay);
  const [showIcon, setShowIcon] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      imageRef.current?.stopAnimating?.();
      setIsPlaying(false);
      setShowIcon(true);
    } else {
      imageRef.current?.startAnimating?.();
      setIsPlaying(true);
      setShowIcon(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => setShowIcon(false), 800);
    }
  }, [isPlaying]);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  return (
    <View style={[styles.container, { height }, style]}>
      <Pressable onPress={togglePlay} style={StyleSheet.absoluteFill}>
        <Image
          ref={imageRef}
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          autoplay={autoplay}
          cachePolicy="memory-disk"
          onLoad={() => onLoad?.()}
          onError={() => onError?.()}
        />
        {/* Speed badge */}
        <View style={styles.speedBadge}>
          <Text style={styles.speedText}>{speed}x</Text>
        </View>
        {/* Play/Pause icon overlay */}
        {(showIcon || !isPlaying) && (
          <View style={styles.iconOverlay}>
            <View style={styles.iconCircle}>
              <MaterialIcons
                name={isPlaying ? "pause" : "play-arrow"}
                size={28}
                color="#fff"
              />
            </View>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: "#0D1117",
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  webview: {
    flex: 1,
    backgroundColor: "transparent",
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  errorText: {
    color: "#6B7280",
    fontSize: 13,
    fontFamily: "DMSans_500Medium",
  },
  speedBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(245,158,11,0.85)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  speedText: {
    color: "#000",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  iconOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
});
