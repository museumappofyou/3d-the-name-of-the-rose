#!/usr/bin/env bash
# Phase-1 rendered benchmarks of a PACKAGED build (not headless), with
# external process-RSS sampling (Godot's static-memory monitors read 0 in
# release templates).
#
#   scripts/migration/run_benchmarks.sh <app-executable> <label> [scenario...]
#
# Scenarios default to: route route_hires crowd crowd_hires cycles.
# Extra: soak (20 min), sdfgi, ssil, route_vsync.
# Day-1A (real time, never accelerated while measured): day1_walk (the whole
# slice, ~21 min), day1_cycles (ten gate → cell → well → nave loops).
# Results: builds/phase1/evidence/performance/<scenario>_<label>.{json,csv}
#          and <scenario>_<label>.rss.csv (1 s RSS samples, KiB)
set -euo pipefail
APP="$1"; LABEL="$2"; shift 2
SCEN=("$@"); [ ${#SCEN[@]} -eq 0 ] && SCEN=(route route_hires crowd crowd_hires cycles)
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="${EVIDENCE_OUT:-$ROOT/builds/phase1/evidence}/performance"
mkdir -p "$OUT"
run() { # name, resolution, args...
  local name="$1" res="$2"; shift 2
  local log="$OUT/${name}_${LABEL}.log" rss="$OUT/${name}_${LABEL}.rss.csv"
  # let the previous run's GPU work drain; refuse to measure on a busy GPU
  local gpu=""; local waited=0
  while :; do
    gpu=$(ioreg -r -d 1 -w 0 -c IOAccelerator 2>/dev/null | grep -o '"Device Utilization %"=[0-9]*' | head -1 | cut -d= -f2 || true)
    [ -z "$gpu" ] || [ "$gpu" -lt 25 ] || [ $waited -ge 30 ] && break
    sleep 1; waited=$((waited + 1))
  done
  [ -n "$gpu" ] && [ "$gpu" -ge 25 ] && echo "WARNING: GPU still ${gpu}% busy before $name; results may be contaminated" | tee -a "$OUT/${name}_${LABEL}.preflight.txt"
  echo "== $name ($res) $*  [GPU utilization before launch: ${gpu:-n/a}% after ${waited}s settle]" | tee -a "$OUT/${name}_${LABEL}.preflight.txt"
  "$APP" --resolution "$res" -- "$@" --name="$name" --out="$OUT" --label="${LABEL}" > "$log" 2>&1 &
  local pid=$!
  echo "t_s,rss_kib" > "$rss"
  local t=0
  while kill -0 "$pid" 2>/dev/null; do
    r=$(ps -o rss= -p "$pid" 2>/dev/null | tr -d ' ' || true)
    [ -n "$r" ] && echo "$t,$r" >> "$rss"
    sleep 1; t=$((t + 1))
  done
  wait "$pid"
}
for s in "${SCEN[@]}"; do
  case "$s" in
    route)        run route 1920x1080 --scenario=route --vsync=off --duration=120 ;;
    route_vsync)  run route_vsync 1920x1080 --scenario=route --duration=120 ;;
    route_hires)  run route_hires 2304x1149 --scenario=route --vsync=off --duration=120 ;;
    crowd)        run crowd 1920x1080 --scenario=crowd --vsync=off --duration=120 ;;
    crowd_hires)  run crowd_hires 2304x1149 --scenario=crowd --vsync=off --duration=120 ;;
    cycles)       run cycles 1920x1080 --scenario=cycles --vsync=off ;;
    soak)         run soak 1920x1080 --scenario=soak --vsync=off --duration=1200 ;;
    day1_walk)    run day1_walk 1920x1080 --scenario=day1-walk --style=normal --vsync=off --save-dir=user://day1a_runs/saves --telemetry-dir=user://day1a_runs/telemetry ;;
    day1_cycles)  run day1_cycles 1920x1080 --scenario=day1-cycles --vsync=off --cycles=10 --save-dir=user://day1a_runs/saves --telemetry-dir=user://day1a_runs/telemetry ;;
    sdfgi)        run route_sdfgi 1920x1080 --scenario=route --vsync=off --duration=120 --gi=sdfgi ;;
    ssil)         run route_ssil 1920x1080 --scenario=route --vsync=off --duration=120 --gi=ssil ;;
    *) echo "unknown scenario $s" >&2 ;;
  esac
done
