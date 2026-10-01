#!/usr/bin/env python3
"""Objective analysis of the packaged audio run (no human listening).

    python3 scripts/migration/analyze_audio.py docs/evidence/phase1/audio/audio_mac.json

Reads the scenario JSON (transport telemetry and marks) and the recorded
master output `<same name>.wav` (16-bit PCM, written by AudioEffectRecord) and
writes `<name>_analysis.json`:
  * RMS envelope (dBFS, 0.5 s windows) and peak;
  * the RMS around each scripted mark (choir, cloister walk, in-office hour
    change, back in the choir, office end, after the die-away);
  * click candidates: sample-to-sample jumps above 0.25 of full scale that
    stand out more than 12x from the surrounding 10 ms of signal, grouped
    into events (a footstep onset is such a transient by nature);
  * transport continuity: the stream position never runs backwards and the
    restart counter never increases after the office has begun.
These are stand-ins for listening, not a judgement of sound quality.
"""
import array
import json
import math
import sys
import wave
from pathlib import Path

src = Path(sys.argv[1])
d = json.loads(src.read_text())
wav = src.with_suffix('.wav')
w = wave.open(str(wav))
ch, width, rate, n = w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getnframes()
assert width == 2, 'expected 16-bit PCM'
pcm = array.array('h', w.readframes(n))
if sys.byteorder == 'big':
    pcm.byteswap()
mono = [(sum(pcm[i * ch + c] for c in range(ch)) / ch) / 32768.0 for i in range(n)]


def db(x):
    return round(20 * math.log10(x), 1) if x > 1e-9 else -180.0


win = rate // 2
env = []
for s in range(0, n - win + 1, win):
    seg = mono[s:s + win]
    env.append({'t': round(s / rate, 2), 'rms_dbfs': db(math.sqrt(sum(v * v for v in seg) / len(seg)))})
peak = max(abs(v) for v in mono) if mono else 0.0

clicks = []
w10 = rate // 100
for i in range(1, n):
    j = abs(mono[i] - mono[i - 1])
    if j < 0.25:
        continue
    lo, hi = max(1, i - w10), min(n, i + w10)
    local = sorted(abs(mono[k] - mono[k - 1]) for k in range(lo, hi))
    med = local[len(local) // 2] or 1e-6
    if j > 12 * med:
        clicks.append({'t': round(i / rate, 4), 'jump_fs': round(j, 3), 'local_median_fs': round(med, 4)})

# one event per burst: jumps within 5 ms belong to the same transient
events = []
for c in clicks:
    if events and c['t'] - events[-1]['t_last'] <= 0.005:
        events[-1]['t_last'] = c['t']; events[-1]['samples'] += 1; events[-1]['max_jump_fs'] = max(events[-1]['max_jump_fs'], c['jump_fs'])
    else:
        events.append({'t': c['t'], 't_last': c['t'], 'samples': 1, 'max_jump_fs': c['jump_fs']})

marks = [e for e in d.get('events', []) if 'level' in e and 'event' in e]
around = []
for m in marks:
    s = int(max(0.0, m['t'] - 0.5) * rate)
    seg = mono[s:s + rate]
    around.append({'mark': m['event'], 't': round(m['t'], 2), 'room': m.get('room'), 'path_level': round(m['level'], 4), 'lowpass_hz': round(m['lp'], 1),
                   'stream_position_s': round(m['position'], 3), 'rms_dbfs_1s': db(math.sqrt(sum(v * v for v in seg) / len(seg))) if seg else None})

tel = d.get('audio_telemetry_tail', [])
playing = [x for x in tel if x.get('playing')]
backwards = [(a['t'], a['position'], b['position']) for a, b in zip(playing, playing[1:]) if b['position'] + 1e-3 < a['position']]
first_start = next((x['restarts'] for x in playing), None)
restart_after_start = [x['t'] for x in playing if first_start is not None and x['restarts'] > first_start]

out = {
    'source_json': src.name, 'wav': wav.name, 'channels': ch, 'sample_rate': rate, 'duration_s': round(n / rate, 3),
    'peak_dbfs': db(peak), 'envelope_0_5s': env, 'marks': around,
    'click_candidate_events': events, 'click_candidate_samples': len(clicks),
    'transport': {'telemetry_samples': len(tel), 'playing_samples': len(playing), 'position_backwards': backwards,
                  'restarts_after_office_began': restart_after_start, 'scenario_restart_counter': d.get('audio_restarts')},
    'note': 'Objective stand-ins only; no human listening was performed.',
}
out['pass'] = not backwards and not restart_after_start
dst = src.with_name(src.stem + '_analysis.json')
dst.write_text(json.dumps(out, indent=1) + '\n')
print(json.dumps({k: v for k, v in out.items() if k not in ('envelope_0_5s',)}, indent=1)[:3000])
