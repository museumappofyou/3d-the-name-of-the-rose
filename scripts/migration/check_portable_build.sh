#!/usr/bin/env bash
# Portability check of the native project (macOS host):
#   * a CASE-SENSITIVE filesystem (catches res:// paths whose case differs
#     from the file on disk, which macOS's default volume hides), and
#   * a project path containing spaces and non-ASCII text.
# The project (without its import cache) is copied to
#   <case-sensitive volume>/Test Ünïcode/Abbey Slice/godot
# then imported fresh, tested and exported; the package hashes are compared
# with the pipeline's (builds/phase1/pipeline/package_sha256.txt).
#
#   GODOT_BIN=… scripts/migration/check_portable_build.sh <work-dir> [report.json]
set -euo pipefail
: "${GODOT_BIN:?set GODOT_BIN}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WORK="$1"; REPORT="${2:-}"
mkdir -p "$WORK"
IMG="$WORK/abbey_cs.sparseimage"; MNT="$WORK/cs_volume"
rm -f "$IMG"; mkdir -p "$MNT"
hdiutil create -quiet -size 2g -type SPARSE -fs "Case-sensitive APFS" -volname AbbeyCS "$IMG"
hdiutil attach -quiet -nobrowse -mountpoint "$MNT" "$IMG"
trap 'hdiutil detach -quiet "$MNT" || hdiutil detach -quiet -force "$MNT"; rm -f "$IMG"' EXIT
diskutil info "$MNT" | grep -E "File System Personality|Name \(User Visible\)" || true
P="$MNT/Test Ünïcode/Abbey Slice"
mkdir -p "$P"
rsync -a --exclude .godot "$ROOT/native/" "$P/godot/"
LOG="$P/logs"; mkdir -p "$LOG"
"$GODOT_BIN" --headless --path "$P/godot" --editor --import > "$LOG/import.log" 2>&1 || true
# a case mismatch shows up as a missing resource / failed load
MISSING=$(grep -E "Cannot open file|No loader found|Failed loading resource|Can't open|not found" "$LOG/import.log" | grep -v "ObjectDB" || true)
"$GODOT_BIN" --headless --path "$P/godot" --script res://tests/run_tests.gd > "$LOG/tests.log" 2>&1 && T=PASS || T=FAIL
"$GODOT_BIN" --headless --path "$P/godot" --script res://tests/pose_check.gd -- alinardo "$ROOT/shared/data/manifests/pose_reference_alinardo.json" > "$LOG/pose.log" 2>&1 && PO=PASS || PO=FAIL
"$GODOT_BIN" --headless --path "$P/godot" --script res://tests/anchor_check.gd > "$LOG/anchors.log" 2>&1 && A=PASS || A=FAIL
mkdir -p "$P/out/windows" "$P/out/macos"
"$GODOT_BIN" --headless --path "$P/godot" --export-release "Windows Desktop" "$P/out/windows/AbbeySlice.exe" > "$LOG/export_windows.log" 2>&1 || true
"$GODOT_BIN" --headless --path "$P/godot" --export-release "macOS" "$P/out/macos/AbbeySlice.app" > "$LOG/export_macos.log" 2>&1 || true
PCK_PORT=$(shasum -a 256 "$P/out/windows/AbbeySlice.pck" | cut -d' ' -f1)
EXE_PORT=$(shasum -a 256 "$P/out/windows/AbbeySlice.exe" | cut -d' ' -f1)
PCK_MAIN=$(grep "windows/AbbeySlice.pck" "$ROOT/builds/phase1/pipeline/package_sha256.txt" | cut -d' ' -f1)
cp "$P/out/windows/AbbeySlice.pck" "$WORK/portable_AbbeySlice.pck"
python3 "$ROOT/scripts/migration/audit_package.py" --diff "$ROOT/builds/phase1/windows/AbbeySlice.pck" "$WORK/portable_AbbeySlice.pck" > "$WORK/pck_diff.json"
# run the packaged mac app once from the unicode/space path (functional rules, real physics)
APP="$P/out/macos/AbbeySlice.app/Contents/MacOS/Abbey Slice"
"$APP" --headless -- --scenario=functional --out="$P/out" --label=portable --save-dir=user://functional_portable > "$LOG/functional.log" 2>&1 || true
F=$(python3 -c "import json,sys; print('PASS' if json.load(open(sys.argv[1])).get('pass') else 'FAIL')" "$P/out/functional_portable.json" 2>/dev/null || echo FAIL)
python3 - "$REPORT" <<EOF
import json, sys
r = {"filesystem": "Case-sensitive APFS (sparse image)", "project_path": "$P/godot".replace("$MNT", "<volume>"),
     "import_missing_resource_lines": """$MISSING""".strip().splitlines(), "domain_tests": "$T", "pose_alinardo": "$PO", "anchors": "$A",
     "packaged_functional_from_unicode_path": "$F",
     "pck_sha256": "$PCK_PORT", "pipeline_pck_sha256": "$PCK_MAIN", "pck_identical_to_pipeline": "$PCK_PORT" == "$PCK_MAIN",
     "windows_exe_sha256": "$EXE_PORT"}
r["pck_file_diff"] = json.load(open("$WORK/pck_diff.json"))
r["pck_file_diff"].pop("a"); r["pck_file_diff"].pop("b")
r["pass"] = not r["import_missing_resource_lines"] and r["domain_tests"] == r["pose_alinardo"] == r["anchors"] == r["packaged_functional_from_unicode_path"] == "PASS"
print(json.dumps(r, indent=1, ensure_ascii=False))
if sys.argv[1]: open(sys.argv[1], "w").write(json.dumps(r, indent=1, ensure_ascii=False) + "\n")
EOF
