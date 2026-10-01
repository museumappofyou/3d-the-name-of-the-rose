#!/usr/bin/env python3
"""Prepare full-length, -12 dB comparisons. Originals and phrasing stay intact.

These files are for listening review, not the sync-click sprite bank format.
Use the streaming player at shared/assets/audio/music/audition.html. An audible
review must precede location/phrase/loop choices.
"""
import hashlib, json, pathlib, subprocess
ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / 'shared/assets/audio/music'
OUT.mkdir(parents=True, exist_ok=True)
tracks = []
for name in ('cold_stone_prayer', 'beneath_the_vault'):
    src = ROOT / 'music' / f'{name}.mp3'
    dst = OUT / f'{name}_review.mp3'
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(src),
                    '-map_metadata', '-1', '-af', 'volume=-12dB', '-c:a', 'libmp3lame', '-q:a', '2', str(dst)], check=True)
    probe = json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration:stream=sample_rate,channels','-of','json',str(dst)]))
    tracks.append({'original':str(src.relative_to(ROOT)), 'original_sha256':hashlib.sha256(src.read_bytes()).hexdigest(),
                   'file':dst.name, 'duration':float(probe['format']['duration']), 'gain_db':-12,
                   'status':'Awaiting full audible review; no trimming, looping or in-world assignment',
                   'channels':probe['streams'][0]['channels'], 'sample_rate':int(probe['streams'][0]['sample_rate'])})
(OUT/'review.json').write_text(json.dumps({'tracks':tracks}, indent=2)+'\n')
print(json.dumps(tracks, indent=2))
