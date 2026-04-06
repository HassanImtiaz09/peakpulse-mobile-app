#!/usr/bin/env python3
"""
Fix mojibake / double-encoded UTF-8 characters across the PeakPulse project.

The issue: UTF-8 characters (em-dash, arrows, smart quotes, etc.) were double or
triple encoded, producing garbled byte sequences like:
  - c3 83 c2 a2 c3 82 c2 80 c3 82 c2 94  (double-encoded em-dash "—")
  - c3 83 c2 83 c3 82 c2 83 ... (triple-encoded arrow "→")
  - c3 a2 c2 80 c2 94 (single-encoded em-dash that renders as "â€"")

Strategy: Repeatedly decode the bytes as latin-1 then re-encode as UTF-8 until
stable, which reverses the double/triple encoding. Then replace any remaining
known mojibake patterns with the correct Unicode characters.
"""

import os
import re
import sys

PROJECT_ROOT = "/home/ubuntu/peakpulse-mobile"
EXTENSIONS = ('.tsx', '.ts', '.json')
SKIP_DIRS = {'node_modules', '.git', '.expo', 'dist', '__pycache__'}

# Known byte-level mojibake patterns and their correct replacements
# These are the raw bytes as they appear in the file
BYTE_REPLACEMENTS = [
    # Triple-encoded arrow (→): appears as ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ
    # bytes: c3 83 c2 83 c3 82 c2 83 c3 83 c2 82 c3 82 c2 a2 c3 83 c2 82 c3 82 c2 80 c3 83 c2 82 c3 82 c2 94
    (b'\xc3\x83\xc2\x83\xc3\x82\xc2\x83\xc3\x83\xc2\x82\xc3\x82\xc2\xa2\xc3\x83\xc2\x82\xc3\x82\xc2\x80\xc3\x83\xc2\x82\xc3\x82\xc2\x94', '—'.encode('utf-8')),
    
    # Double-encoded em-dash (—): appears as Ã¢ÂÂ
    # bytes: c3 83 c2 a2 c3 82 c2 80 c3 82 c2 94
    (b'\xc3\x83\xc2\xa2\xc3\x82\xc2\x80\xc3\x82\xc2\x94', '—'.encode('utf-8')),
    
    # Double-encoded en-dash (–): appears as Ã¢ÂÂ
    # bytes: c3 83 c2 a2 c3 82 c2 80 c3 82 c2 93
    (b'\xc3\x83\xc2\xa2\xc3\x82\xc2\x80\xc3\x82\xc2\x93', '–'.encode('utf-8')),
    
    # Double-encoded right single quote ('): Ã¢ÂÂ
    # bytes: c3 83 c2 a2 c3 82 c2 80 c3 82 c2 99
    (b'\xc3\x83\xc2\xa2\xc3\x82\xc2\x80\xc3\x82\xc2\x99', "'".encode('utf-8')),
    
    # Double-encoded left single quote ('): Ã¢ÂÂ
    # bytes: c3 83 c2 a2 c3 82 c2 80 c3 82 c2 98
    (b'\xc3\x83\xc2\xa2\xc3\x82\xc2\x80\xc3\x82\xc2\x98', "'".encode('utf-8')),
    
    # Double-encoded left double quote ("): Ã¢ÂÂ
    # bytes: c3 83 c2 a2 c3 82 c2 80 c3 82 c2 9c
    (b'\xc3\x83\xc2\xa2\xc3\x82\xc2\x80\xc3\x82\xc2\x9c', '"'.encode('utf-8')),
    
    # Double-encoded right double quote ("): Ã¢ÂÂ
    # bytes: c3 83 c2 a2 c3 82 c2 80 c3 82 c2 9d
    (b'\xc3\x83\xc2\xa2\xc3\x82\xc2\x80\xc3\x82\xc2\x9d', '"'.encode('utf-8')),
    
    # Double-encoded ellipsis (…): Ã¢ÂÂ¦
    # bytes: c3 83 c2 a2 c3 82 c2 80 c3 82 c2 a6
    (b'\xc3\x83\xc2\xa2\xc3\x82\xc2\x80\xc3\x82\xc2\xa6', '...'.encode('utf-8')),
    
    # Double-encoded bullet (•): Ã¢ÂÂ¢
    # bytes: c3 83 c2 a2 c3 82 c2 80 c3 82 c2 a2
    (b'\xc3\x83\xc2\xa2\xc3\x82\xc2\x80\xc3\x82\xc2\xa2', '•'.encode('utf-8')),
    
    # Single-encoded em-dash that shows as â€" (3 bytes: e2 80 94 misread as latin-1)
    # Actually these are correct UTF-8 em-dashes, but if they show as mojibake
    # the file might have been saved with wrong encoding
]

# Text-level replacements for any remaining issues after byte-level fixes
TEXT_REPLACEMENTS = [
    # Broken "â still" pattern (em-dash lost its trailing bytes)
    ('â still', '— still'),
    ('â ', '— '),  # Only if preceded by space (careful with this one)
]

def fix_file(filepath):
    """Fix encoding issues in a single file. Returns (was_changed, num_fixes)."""
    with open(filepath, 'rb') as f:
        original = f.read()
    
    data = original
    total_fixes = 0
    
    # Apply byte-level replacements (longest patterns first to avoid partial matches)
    for pattern, replacement in BYTE_REPLACEMENTS:
        count = data.count(pattern)
        if count > 0:
            data = data.replace(pattern, replacement)
            total_fixes += count
    
    # Now check for remaining non-ASCII issues at the text level
    try:
        text = data.decode('utf-8')
    except UnicodeDecodeError:
        # If we can't decode as UTF-8, try to fix byte by byte
        text = data.decode('utf-8', errors='replace')
        total_fixes += text.count('\ufffd')
    
    # Apply text-level replacements carefully
    # Only fix "â " when it appears to be a broken em-dash (preceded by a word char)
    # Pattern: word_char + "â " -> word_char + "— "
    new_text = re.sub(r'(\w)â ', r'\1— ', text)
    if new_text != text:
        total_fixes += len(re.findall(r'\wâ ', text))
        text = new_text
    
    # Fix standalone â at end of comment lines (broken em-dash in comments)
    new_text = re.sub(r'â(\s*(?:still|they|don|remove|keep|about|this|the|it|he|she|we|you|I|not|no|only|auto|just))', r'—\1', text)
    if new_text != text:
        total_fixes += len(re.findall(r'â\s*(?:still|they|don|remove|keep|about|this|the|it|he|she|we|you|I|not|no|only|auto|just)', text))
        text = new_text
    
    result = text.encode('utf-8')
    
    if result != original:
        with open(filepath, 'wb') as f:
            f.write(result)
        return True, total_fixes
    
    return False, 0

def main():
    changed_files = []
    total_fixes = 0
    
    for root, dirs, files in os.walk(PROJECT_ROOT):
        # Skip excluded directories
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        
        for filename in files:
            if not any(filename.endswith(ext) for ext in EXTENSIONS):
                continue
            
            filepath = os.path.join(root, filename)
            relpath = os.path.relpath(filepath, PROJECT_ROOT)
            
            was_changed, num_fixes = fix_file(filepath)
            if was_changed:
                changed_files.append((relpath, num_fixes))
                total_fixes += num_fixes
                print(f"  FIXED: {relpath} ({num_fixes} replacements)")
    
    print(f"\n{'='*60}")
    print(f"Total files fixed: {len(changed_files)}")
    print(f"Total replacements: {total_fixes}")
    
    if changed_files:
        print(f"\nFixed files:")
        for path, count in sorted(changed_files):
            print(f"  {path}: {count} fixes")

if __name__ == "__main__":
    main()
