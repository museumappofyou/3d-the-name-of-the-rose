#!/bin/zsh
# Day-1A packaged benchmark trials: cold (fresh binary, Godot shader cache
# moved aside), warm, [cold again with Metal's system cache warm], ten
# measured loops, soak. Each run waits for a quiet GPU and logs whether
# another GPU job started during it.
SP=/private/tmp/claude-501/-Users-memre-Desktop-gulun-ad-/c4e5d3b5-6f56-45f1-b441-691e3af1a813/scratchpad
OUT=$SP/perf2
cd /Users/memre/Desktop/gulun_adı
APP="$PWD/builds/phase1/macos/AbbeySlice.app/Contents/MacOS/Abbey Slice"
CACHE="$HOME/Library/Application Support/AbbeySlice/shader_cache"
quiet() {
  local q=0
  while [ $q -lt 30 ]; do
    local g=$(ioreg -r -d 1 -w 0 -c IOAccelerator | grep -o '"Device Utilization %"=[0-9]*' | head -1 | cut -d= -f2)
    local dt=$(pgrep -f draw-things-cli >/dev/null && echo busy || echo none)
    echo "$(date +%T) gpu=$g other=$dt" >> $OUT/gpu_wait.log
    if [ -n "$g" ] && [ "$g" -lt 20 ] && [ "$dt" = none ]; then q=$((q+1)); else q=0; fi
    sleep 2
  done
}
trial() { # label scenario...
  local label=$1; shift
  quiet
  echo "$(date +%T) start $label $*" >> $OUT/trials.log
  ( while true; do echo "$(date +%T) $(pgrep -f draw-things-cli >/dev/null && echo RUNNING || echo none)" >> $OUT/contention_$label.log; sleep 5; done ) &
  local mon=$!
  EVIDENCE_OUT=$OUT bash scripts/migration/run_benchmarks.sh "$APP" $label "$@" >> $OUT/bench.log 2>&1
  kill $mon 2>/dev/null
  echo "$(date +%T) done $label rc=$? running=$(grep -c RUNNING $OUT/contention_$label.log)" >> $OUT/trials.log
}
# A: cold (Godot cache aside; the package binary has never run)
[ -d "$CACHE" ] && mv "$CACHE" "$OUT/shader_cache.before_trialA"
trial cold day1_walk
# B: warm
trial warm day1_walk
# C: Godot cache aside again, Metal's system cache now warm for this binary
mv "$CACHE" "$OUT/shader_cache.after_trialB" 2>/dev/null
trial coldgodot day1_walk
# loops and soak, warm
trial mac day1_cycles day1_soak
echo "ALL DONE $(date +%T)" >> $OUT/trials.log
