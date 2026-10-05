#!/usr/bin/env bash
# Build the committed native proof and the Day-1A slice without private
# masters or Chrome.
# Regeneration is explicit: --regenerate-assets [--browser-export].
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
: "${GODOT_BIN:?set GODOT_BIN to Godot 4.7.2 (docs/DEVELOPMENT.md)}"
FRESH=0; BROWSER=0; EXPORT=1; FUNC=0; REGENERATE=0
for a in "$@"; do case "$a" in
  --fresh) FRESH=1;;
  --browser-export) BROWSER=1; REGENERATE=1;;
  --regenerate-assets) REGENERATE=1;;
  --no-export) EXPORT=0;;
  --functional) FUNC=1;;
  *) echo "unknown option $a"; exit 2;;
esac; done
VER="$("$GODOT_BIN" --version)"
case "$VER" in 4.7.2.stable*) ;; *) echo "expected Godot 4.7.2.stable, got $VER"; exit 2;; esac
GD=native
PEOPLE="alinardo monk_a scribe_a monk_b novice_a monk_c monk_d monk_e monk_f monk_g novice_b lay_old lay_herd"
LOG="$ROOT/builds/phase1/pipeline"
CHECKS="${EVIDENCE_OUT:-$ROOT/builds/phase1/checks}"
mkdir -p "$LOG" "$CHECKS/import" "$CHECKS/functional"
step() { echo "== $*"; }
step "record book evidence hashes"
(cd book_details/output && shasum -a 256 *) > "$LOG/evidence_sha256.txt"
if [ "$REGENERATE" = 1 ]; then
  [ -f .local/mh/cast-round3.glb ] || { echo "regeneration needs the retained character master (docs/ASSETS.md)"; exit 1; }
  [ -d scripts/migration/node_modules ] || npm ci --prefix scripts/migration --no-audit --no-fund
  if [ "$BROWSER" = 1 ]; then
    node scripts/migration/browser_driver.mjs slice_export.js shared/data/export/slice_cells.json --out shared/data/export
    node scripts/migration/browser_driver.mjs slice_export.js shared/data/export/day1a_cells.json --out shared/data/export/day1a
  fi
  [ -d shared/data/export/cells ] || { echo "raw geometry missing; use --browser-export"; exit 1; }
  step "regenerate characters, world, audio, anchors, crowd and pose references"
  node scripts/migration/normalize_people.mjs --people "${PEOPLE// /,}"
  node scripts/migration/pose_reference.mjs $PEOPLE
  node scripts/migration/normalize_animals.mjs
  python3 scripts/migration/build_slice_assets.py
  python3 scripts/migration/build_day1a_assets.py
  python3 scripts/migration/day1a_scenario.py
  python3 scripts/migration/build_audio.py
  python3 scripts/migration/build_anchors.py
  node scripts/migration/crowd_layout.mjs
fi
step "publish content and verify committed derivative hashes"
node scripts/migration/rule_references.mjs
cp shared/data/manifests/rule_references.json "$GD/tests/fixtures/"
python3 scripts/migration/build_content.py
python3 scripts/migration/build_manifest.py
if [ "$FRESH" = 1 ]; then rm -rf "$GD/.godot"; fi
step "import native resources"
"$GODOT_BIN" --headless --path "$GD" --editor --import > "$LOG/import.log" 2>&1
python3 scripts/migration/godot_import_settings.py
"$GODOT_BIN" --headless --path "$GD" --editor --import >> "$LOG/import.log" 2>&1
if grep -E '^(ERROR|SCRIPT ERROR)' "$LOG/import.log" | grep -v 'resources still in use\|RID allocations\|ObjectDB'; then
  echo "import failed; see $LOG/import.log"; exit 1
fi
step "domain, fitted-pose/normal and anchor tests"
ABBEY_TEST_REPORT="$CHECKS/domain.json" "$GODOT_BIN" --headless --path "$GD" --script res://tests/run_tests.gd > "$LOG/tests.log" 2>&1
ABBEY_TEST_REPORT="$CHECKS/day1a.json" "$GODOT_BIN" --headless --path "$GD" --script res://tests/day1a_tests.gd > "$LOG/day1a_tests.log" 2>&1
for p in $PEOPLE; do
  "$GODOT_BIN" --headless --path "$GD" --script res://tests/pose_check.gd -- "$p" "$ROOT/shared/data/manifests/pose_reference_$p.json" > "$LOG/pose_$p.log" 2>&1
done
"$GODOT_BIN" --headless --path "$GD" --script res://tests/anchor_check.gd > "$LOG/anchors.log" 2>&1
if [ "$FUNC" = 1 ]; then
  step "functional scene and second-process reload"
  for sc in functional functional-reload; do
    "$GODOT_BIN" --headless --path "$GD" -- --scenario="$sc" --out="$CHECKS/functional" --label=headless --save-dir=user://functional_headless > "$LOG/$sc.log" 2>&1
  done
  python3 - "$CHECKS/functional" <<'PY'
import json, sys
from pathlib import Path
root = Path(sys.argv[1])
assert all(json.loads((root / (name + '_headless.json')).read_text()).get('pass') for name in ['functional', 'functional-reload'])
print('functional + second-process reload: PASS')
PY
fi
if [ "$EXPORT" = 1 ]; then
  step "Windows and macOS development exports"
  mkdir -p builds/phase1/windows builds/phase1/macos
  rm -rf builds/phase1/macos/AbbeySlice.app
  "$GODOT_BIN" --headless --path "$GD" --export-release "Windows Desktop" "$ROOT/builds/phase1/windows/AbbeySlice.exe" > "$LOG/export_windows.log" 2>&1
  "$GODOT_BIN" --headless --path "$GD" --export-release "macOS" "$ROOT/builds/phase1/macos/AbbeySlice.app" > "$LOG/export_macos.log" 2>&1
  rm -f builds/phase1/AbbeySlice-windows-x86_64.zip builds/phase1/AbbeySlice-macos-universal.zip
  (cd builds/phase1/windows && zip -q -X -r ../AbbeySlice-windows-x86_64.zip AbbeySlice.exe AbbeySlice.pck)
  if command -v ditto >/dev/null; then
    (cd builds/phase1/macos && ditto -c -k --keepParent AbbeySlice.app ../AbbeySlice-macos-universal.zip)
  else
    (cd builds/phase1/macos && zip -q -X -y -r ../AbbeySlice-macos-universal.zip AbbeySlice.app)
  fi
  shasum -a 256 builds/phase1/windows/AbbeySlice.exe builds/phase1/windows/AbbeySlice.pck \
    "builds/phase1/macos/AbbeySlice.app/Contents/MacOS/Abbey Slice" \
    builds/phase1/AbbeySlice-windows-x86_64.zip builds/phase1/AbbeySlice-macos-universal.zip > "$LOG/package_sha256.txt"
  python3 scripts/migration/audit_package.py builds/phase1/windows/AbbeySlice.pck --json "$CHECKS/pck_audit.json" > "$LOG/pck_audit.log"
fi
(cd book_details/output && shasum -a 256 *) | diff - "$LOG/evidence_sha256.txt"
echo "PASS: native checks complete; book_details/output unchanged. Windows runtime was not tested."
