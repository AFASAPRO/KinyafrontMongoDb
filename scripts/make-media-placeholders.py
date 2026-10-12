#!/usr/bin/env python3
"""Create minimal placeholder media files so the frontend build resolves
public assets that the uploaded zip stripped (auth-page mascot video).
The user's real repository contains the original binaries — these
placeholders exist ONLY so `vite build` succeeds in this environment."""
import struct
import os

os.makedirs('public/media', exist_ok=True)

# ── Minimal valid JPEG: 1x1 pixel, gray ──────────────────────────────
# Crafted by hand: SOI / APP0(JFIF) / DQT / SOF0 / SOS / EOI
jpg = bytes.fromhex(
    'ffd8'                                        # SOI
    'ffe000104a46494600010100000100010000'        # APP0 JFIF
    'ffdb004300' + '10'*64 + '00'                 # DQT (luminance)
    'ffc0000b080001000101011100'                  # SOF0: 1x1, 1 component
    'ffc4001f0000010501010101010100000000000000'
    '0102030405060708090a0b'                       # DHT DC
    'ffc400b5100002010303020403050504040000017d'
    '01020300041105122131410613516107227114328191'
    'a1082342b1c11552d1f02433627282090a161718191a'
    '25262728292a3435363738393a434445464748494a53'
    '5455565758595a636465666768696a73747576777879'
    '7a838485868788898a92939495969798999aa2a3a4a5'
    'a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9'
    'cad2d3d4d5d6d7d8d9dae1e2e3e4e5e6e7e8e9eaf1f2'
    'f3f4f5f6f7f8f9fa'                             # DHT AC
    'ffda0008010100003f00'                         # SOS
    'fbfa'                                         # entropy data
    'ffd9'                                         # EOI
)
with open('public/media/kinya-mascot-auth-poster.jpg', 'wb') as f:
    f.write(jpg)

# ── Minimal MP4: ftyp box only (valid container header) ────────────
ftyp = b'\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00mp42mp41'
# append an empty 'free' box to give it plausible size
mp4 = ftyp + b'\x00\x00\x00\x08free'
with open('public/media/kinya-mascot-auth.mp4', 'wb') as f:
    f.write(mp4)

print('placeholders created:',
      os.path.getsize('public/media/kinya-mascot-auth-poster.jpg'), 'bytes jpg,',
      os.path.getsize('public/media/kinya-mascot-auth.mp4'), 'bytes mp4')
