#!/bin/zsh
# One real-time whole-slice run on the candidate package (60ec496), after a
# quiet GPU; Godot shader cache as left by the trials, Metal cache new to this binary.
SP=/private/tmp/claude-501/-Users-memre-Desktop-gulun-ad-/c4e5d3b5-6f56-45f1-b441-691e3af1a813/scratchpad
OUT=$SP/perf3
cd /Users/memre/Desktop/gulun_adı
APP="$PWD/builds/phase1/macos/AbbeySlice.app/Contents/MacOS/Abbey Slice"
q=0
while [ $q -lt 30 ]; do
  g=$(ioreg -r -d 1 -w 0 -c IOAccelerator | grep -o '"Device Utilization %"=[0-9]*' | head -1 | cut -d= -f2)
  dt=$(pgrep -f draw-things-cli >/dev/null && echo busy || echo none)
  echo "$(date +%T) gpu=$g other=$dt" >> $OUT/gpu_wait.log
  if [ -n "$g" ] && [ "$g" -lt 20 ] && [ "$dt" = none ]; then q=$((q+1)); else q=0; fi
  sleep 2
done
echo "$(date +%T) start candidate day1_walk" >> $OUT/trials.log
( while true; do echo "$(date +%T) $(pgrep -f draw-things-cli >/dev/null && echo RUNNING || echo none)" >> $OUT/contention_candidate.log; sleep 5; done ) &
mon=$!
EVIDENCE_OUT=$OUT bash scripts/migration/run_benchmarks.sh "$APP" candidate day1_walk >> $OUT/bench.log 2>&1
rc=$?
kill $mon 2>/dev/null
echo "$(date +%T) done candidate rc=$rc running=$(grep -c RUNNING $OUT/contention_candidate.log)" >> $OUT/trials.log
