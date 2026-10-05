#!/usr/bin/env python3
"""Phase-1 audio derivatives for the Godot proof.

    python3 scripts/migration/build_audio.py

* Long recordings (chant:deus, wind) are copied UNCHANGED and streamed by
  Godot (AudioStreamMP3 decodes on the fly); the browser's clip window is
  applied at playback from shared/data/sounds.json.
* Short banks (footsteps, the altar creak) are cut into individual 16-bit
  PCM WAV clips at exactly the browser's crop windows from
  shared/assets/audio/manifest.json, because Godot has no clip-range playback of a
  sample. ffmpeg (pinned by `ffmpeg -version` in the manifest) decodes the
  original MP3; no resampling, level change or filtering is applied.
Writes shared/data/manifests/audio_derivatives.json with source/output
hashes, crop windows and licences. Review music under shared/assets/audio/music/
and the private music/ originals are never touched.
"""
import hashlib
import json
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'native/assets/audio'
SOUNDS = json.loads((ROOT / 'shared/data/sounds.json').read_text())
MAN = json.loads((ROOT / 'shared/assets/audio/manifest.json').read_text())['banks']


def sha(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()


def cut(src, start, dur, dst):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(src), '-ss', f'{start:.5f}', '-t', f'{dur:.5f}', '-c:a', 'pcm_s16le', str(dst)], check=True)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'steps').mkdir(exist_ok=True)
    rec = {'schema_version': 1, 'generator': 'scripts/migration/build_audio.py',
           'ffmpeg': subprocess.run(['ffmpeg', '-version'], capture_output=True, text=True).stdout.splitlines()[0], 'streams': {}, 'clips': {}}
    for sid, s in SOUNDS['streams'].items():
        src = ROOT / s['source']
        dst = OUT / src.name
        shutil.copyfile(src, dst)
        rec['streams'][sid] = {'source': s['source'], 'source_sha256': sha(src), 'output': str(dst.relative_to(ROOT)), 'output_sha256': sha(dst), 'clip_window': s['clip'], 'credit': s['credit'], 'recipe': 'unchanged copy; streamed'}
    for bank, b in SOUNDS['steps']['banks'].items():
        surface = bank.split(':')[1]
        src = ROOT / b['source']
        clips = MAN[bank]['clips']
        outs = []
        for i, (start, dur) in enumerate(clips):
            dst = OUT / 'steps' / f'{surface}_{i:02d}.wav'
            cut(src, start, dur, dst)
            outs.append({'output': str(dst.relative_to(ROOT)), 'sha256': sha(dst), 'window': [start, dur]})
        rec['clips'][bank] = {'source': b['source'], 'source_sha256': sha(src), 'credit': b['credit'], 'clips': outs, 'recipe': 'ffmpeg crop to manifest window, pcm_s16le, no resample'}
    for oid, o in SOUNDS['one_shots'].items():
        src = ROOT / o['source']
        dst = OUT / f'{oid}.wav'
        cut(src, o['clip'][0], o['clip'][1], dst)
        rec['clips'][oid] = {'source': o['source'], 'source_sha256': sha(src), 'credit': o['credit'], 'clips': [{'output': str(dst.relative_to(ROOT)), 'sha256': sha(dst), 'window': o['clip']}], 'recipe': 'ffmpeg crop, pcm_s16le'}
    # Day-1A banks and streams (sounds.json day1a): same recipe, own folder
    D = SOUNDS.get('day1a')
    if D:
        out1 = OUT / 'day1a'
        out1.mkdir(exist_ok=True)
        for sid, s in D['streams'].items():
            src = ROOT / s['source']
            dst = out1 / src.name
            shutil.copyfile(src, dst)
            rec['streams']['day1a/' + sid] = {'source': s['source'], 'source_sha256': sha(src), 'output': str(dst.relative_to(ROOT)), 'output_sha256': sha(dst), 'clip_window': s['clip'], 'credit': s['credit'], 'recipe': 'unchanged copy; streamed'}
        for bank, b in D['banks'].items():
            name = bank.replace(':', '_')
            src = ROOT / b['source']
            outs = []
            for i, (start, dur) in enumerate(b['clips']):
                dst = out1 / f'{name}_{i:02d}.wav'
                if b.get('fade_out_s'):
                    f = float(b['fade_out_s'])
                    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(src), '-ss', f'{start:.5f}', '-t', f'{dur:.5f}', '-af', f'afade=t=out:st={dur - f:.3f}:d={f:.3f}', '-c:a', 'pcm_s16le', str(dst)], check=True)
                else:
                    cut(src, start, dur, dst)
                outs.append({'output': str(dst.relative_to(ROOT)), 'sha256': sha(dst), 'window': [start, dur]})
            cred = b['credit'][0] if b['credit'] else {'licence': 'unknown'}
            rec['clips']['day1a/' + bank] = {'source': b['source'], 'source_sha256': sha(src), 'credit': cred, 'credits': b['credit'], 'clips': outs,
                                             'recipe': 'ffmpeg crop to the browser manifest window, pcm_s16le, no resample' + (f"; {b['fade_out_s']} s fade-out" if b.get('fade_out_s') else '')}
    (ROOT / 'shared/data/manifests/audio_derivatives.json').write_text(json.dumps(rec, indent=1, ensure_ascii=False) + '\n')
    n = sum(len(v['clips']) for v in rec['clips'].values())
    print('streams', list(rec['streams']), 'clips', n)


if __name__ == '__main__':
    main()
