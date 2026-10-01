#!/usr/bin/env bash
# Phase-1 native proof: complete, repeatable pipeline from the repository.
#
#   GODOT_BIN=/path/to/Godot scripts/migration/build_phase1.sh [options]
#
# Options:
#   --fresh            delete migration/godot/.godot (fresh import cache) first
#   --browser-export   re-run the headless browser section export (needs
#                      Google Chrome; otherwise the committed export is used)
#   --no-export        skip the Windows/macOS package exports
#   --functional       also run the functional route headless in the scene
#
# Requires: Godot 4.7.2 standard + matching export templates (see
# docs/migration/phase-1/BUILD.md for the pinned checksums), Node 24,
# Python 3.9+, ffmpeg. Tool packages: npm ci --prefix scripts/migration.
# The ignored master .local/mh/cast-round3.glb is read (never written) to
# restore the character normals lost in the shipped cast.glb.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
: "${GODOT_BIN:?set GODOT_BIN to the Godot 4.7.2 executable}"
FRESH=0; BROWSER=0; EXPORT=1; FUNC=0
for a in "$@"; do case "$a" in --fresh) FRESH=1;; --browser-export) BROWSER=1;; --no-export) EXPORT=0;; --functional) FUNC=1;; *) echo "unknown option $a"; exit 2;; esac; done
VER="$("$GODOT_BIN" --version)"
case "$VER" in 4.7.2.stable*) ;; *) echo "expected Godot 4.7.2.stable, got $VER"; exit 2;; esac
GD=migration/godot
LOG="$ROOT/migration/builds/pipeline"; mkdir -p "$LOG"
step() { echo; echo "== $*"; }

step "evidence hashes (must be unchanged)"
(cd book_details/output && shasum -a 256 *) | tee "$LOG/evidence_sha256.txt"

[ -d scripts/migration/node_modules ] || npm ci --prefix scripts/migration --no-audit --no-fund

if [ $BROWSER = 1 ]; then
  step "browser section export (unchanged browser, served adapter only)"
  (cd scripts/migration && node browser_driver.mjs slice_export.js ../../migration/data/export/slice_cells.json --out ../../migration/data/export)
fi

step "derivatives: characters, world, audio, anchors, crowd, references, content"
node scripts/migration/normalize_people.mjs --people alinardo,monk_a,scribe_a,monk_b,novice_a | grep -v '^prune'
node scripts/migration/pose_reference.mjs alinardo monk_a scribe_a monk_b novice_a
python3 scripts/migration/build_slice_assets.py
python3 scripts/migration/build_audio.py
python3 scripts/migration/build_anchors.py
node scripts/migration/crowd_layout.mjs
node scripts/migration/rule_references.mjs
mkdir -p $GD/tests/fixtures && cp migration/data/manifests/rule_references.json $GD/tests/fixtures/
python3 scripts/migration/build_content.py

if [ $FRESH = 1 ]; then step "fresh import cache"; rm -rf $GD/.godot; fi
step "Godot import (settings pinned in the committed .import files)"
"$GODOT_BIN" --headless --path $GD --editor --import > "$LOG/import.log" 2>&1 || true
python3 scripts/migration/godot_import_settings.py
"$GODOT_BIN" --headless --path $GD --editor --import >> "$LOG/import.log" 2>&1 || true
if grep -E "^(ERROR|SCRIPT ERROR)" "$LOG/import.log" | grep -v "resources still in use\|RID allocations\|ObjectDB" ; then echo "import reported errors (see $LOG/import.log)"; fi

step "headless domain tests"
ABBEY_TEST_REPORT="$ROOT/docs/migration/phase-1/evidence/tests/run_tests.json" "$GODOT_BIN" --headless --path $GD --script res://tests/run_tests.gd > "$LOG/tests.log" 2>&1 \
  && echo "domain tests: PASS" || { echo "domain tests: FAIL (see $LOG/tests.log)"; exit 1; }

step "fitted-pose parity (Godot import vs engine-independent reference)"
mkdir -p docs/migration/phase-1/evidence/import
for p in alinardo monk_a scribe_a monk_b novice_a; do
  "$GODOT_BIN" --headless --path $GD --script res://tests/pose_check.gd -- $p "$ROOT/migration/data/manifests/pose_reference_$p.json" 2>/dev/null | grep -v '^Godot Engine' > "docs/migration/phase-1/evidence/import/${p}_pose_check.json" \
    && echo "pose $p: PASS" || { echo "pose $p: FAIL"; exit 1; }
done

step "anchor checks (imported collision vs browser survey, character frame/scale)"
"$GODOT_BIN" --headless --path $GD --script res://tests/anchor_check.gd 2>/dev/null | python3 -c "import sys,json; t=sys.stdin.read(); d=json.loads(t[t.index('{'):t.rindex('}')+1]); open('docs/migration/phase-1/evidence/import/anchor_check.json','w').write(json.dumps(d,indent=1)); print('anchors:', 'PASS' if d['pass'] else 'FAIL'); sys.exit(0 if d['pass'] else 1)"

if [ $FUNC = 1 ]; then
  step "functional route headless (real Jolt physics through the main scene)"
  OUTF="$ROOT/docs/migration/phase-1/evidence/functional"; mkdir -p "$OUTF"
  "$GODOT_BIN" --headless --path $GD -- --scenario=functional --out="$OUTF" --label=headless --save-dir=user://functional_headless > "$LOG/functional.log" 2>&1
  "$GODOT_BIN" --headless --path $GD -- --scenario=functional-reload --out="$OUTF" --label=headless --save-dir=user://functional_headless >> "$LOG/functional.log" 2>&1
  python3 -c "import json,sys; ok=all(json.load(open('$OUTF/'+f+'_headless.json')).get('pass') for f in ['functional','functional-reload']); print('functional:', 'PASS' if ok else 'FAIL'); sys.exit(0 if ok else 1)"
fi

if [ $EXPORT = 1 ]; then
  step "exports"
  mkdir -p migration/builds/windows migration/builds/macos
  rm -rf migration/builds/macos/AbbeySlice.app
  "$GODOT_BIN" --headless --path $GD --export-release "Windows Desktop" "$ROOT/migration/builds/windows/AbbeySlice.exe" > "$LOG/export_windows.log" 2>&1
  "$GODOT_BIN" --headless --path $GD --export-release "macOS" "$ROOT/migration/builds/macos/AbbeySlice.app" > "$LOG/export_macos.log" 2>&1
  (cd migration/builds/windows && zip -q -X -r ../AbbeySlice-windows-x86_64.zip AbbeySlice.exe AbbeySlice.pck)
  (cd migration/builds/macos && ditto -c -k --keepParent AbbeySlice.app ../AbbeySlice-macos-universal.zip)
  shasum -a 256 migration/builds/windows/AbbeySlice.exe migration/builds/windows/AbbeySlice.pck \
    "migration/builds/macos/AbbeySlice.app/Contents/MacOS/Abbey Slice" "migration/builds/macos/AbbeySlice.app/Contents/Resources/Abbey Slice.pck" \
    migration/builds/AbbeySlice-windows-x86_64.zip migration/builds/AbbeySlice-macos-universal.zip | tee "$LOG/package_sha256.txt"
fi
step "evidence hashes after the pipeline"
(cd book_details/output && shasum -a 256 *) | diff - "$LOG/evidence_sha256.txt" && echo "book_details/output unchanged"
