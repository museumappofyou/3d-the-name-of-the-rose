#!/usr/bin/env bash
# All rendered phase-1 evidence from ONE packaged build (not headless).
#   scripts/migration/run_package_evidence.sh <app-executable> <label> [--no-bench] [--no-soak]
# Writes under builds/phase1/evidence/{visual/native,functional,audio,fixture,performance}.
set -euo pipefail
APP="$1"; LABEL="$2"; shift 2
BENCH=1; SOAK=1
for a in "$@"; do case "$a" in --no-bench) BENCH=0;; --no-soak) SOAK=0;; esac; done
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
EV="${EVIDENCE_OUT:-$ROOT/builds/phase1/evidence}"
mkdir -p "$EV/visual/native" "$EV/functional" "$EV/audio" "$EV/fixture"
run() { local dir="$1"; shift; echo "== $* -> $dir"; "$APP" "$@" > "$dir/$(echo "$*" | tr -c 'a-z0-9' '_' | cut -c1-60).log" 2>&1; }
run "$EV/visual/native" --resolution 1920x1080 -- --scenario=shots --crowd --out="$EV/visual/native" --label="$LABEL"
run "$EV/functional" --resolution 1920x1080 -- --scenario=functional --out="$EV/functional" --label="${LABEL}_package" --save-dir="user://functional_$LABEL"
run "$EV/functional" --resolution 1920x1080 -- --scenario=functional-reload --out="$EV/functional" --label="${LABEL}_package" --save-dir="user://functional_$LABEL"
run "$EV/audio" --resolution 1920x1080 -- --scenario=audio --out="$EV/audio" --label="$LABEL"
run "$EV/fixture" --resolution 1920x1080 -- --scenario=fixture --out="$EV/fixture" --label="$LABEL"
# startup: cold (the app's own Godot shader/pipeline caches removed; the OS
# file cache cannot be purged without root) then two warm launches. The app
# records engine ticks at scene ready, first frame and playable (third frame
# with the starting cells resident); wall time includes process exit.
mkdir -p "$EV/performance"
UD="$HOME/Library/Application Support/AbbeySlice"
: > "$EV/performance/startup_$LABEL.txt"
for k in cold warm1 warm2; do
  if [ $k = cold ] && [ "$(uname)" = Darwin ]; then rm -rf "$UD/shader_cache" "$UD/vulkan"; fi
  t0=$(python3 -c 'import time; print(time.time())')
  "$APP" --resolution 1920x1080 -- --scenario=startup --name="startup_$k" --out="$EV/performance" --label="$LABEL" > "$EV/performance/startup_${k}_$LABEL.log" 2>&1
  t1=$(python3 -c 'import time; print(time.time())')
  python3 -c "import json,sys; d=json.load(open('$EV/performance/startup_${k}_$LABEL.json'))['startup_ms']; print('$k', 'wall_s=%.2f' % ($t1-$t0), 'ticks_ms', json.dumps(d))" | tee -a "$EV/performance/startup_$LABEL.txt"
done
if [ $BENCH = 1 ]; then
  S=(route route_hires route_vsync crowd crowd_hires cycles sdfgi ssil)
  [ $SOAK = 1 ] && S+=(soak)
  EVIDENCE_OUT="$EV" bash "$ROOT/scripts/migration/run_benchmarks.sh" "$APP" "$LABEL" "${S[@]}"
fi
python3 - "$EV" "$LABEL" <<'EOF'
import json, sys, pathlib
ev, label = pathlib.Path(sys.argv[1]), sys.argv[2]
failed = False
for f in [ev / f'functional/functional_{label}_package.json', ev / f'functional/functional-reload_{label}_package.json', ev / f'audio/audio_{label}.json', ev / f'fixture/fixture_{label}.json']:
    if f.exists():
        d = json.loads(f.read_text())
        print(f.name, 'PASS' if d.get('pass') else 'FAIL', [s['step'] for s in d.get('steps', []) if not s['pass']])
        failed |= not bool(d.get('pass'))
    else:
        print(f.name, 'MISSING')
        failed = True
sys.exit(1 if failed else 0)
EOF
