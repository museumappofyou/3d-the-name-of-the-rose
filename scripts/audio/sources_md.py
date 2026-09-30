#!/usr/bin/env python3
"""Write docs/assets/AUDIO_SOURCES.md from sources.json, cuts.json and the
manifest: every shipped clip with its recording, author, licence and crop."""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
src = json.load(open(os.path.join(HERE, 'sources.json')))
cuts = json.load(open(os.path.join(HERE, 'cuts.json')))
man = json.load(open(os.path.join(ROOT, 'assets', 'audio', 'manifest.json')))
extra = json.load(open(os.path.join(HERE, 'extra_sources.json'))) if os.path.exists(os.path.join(HERE, 'extra_sources.json')) else {}
src.update(extra)

REJECTED = {
    '101794': 'cathedral footsteps: loud visitor/HVAC background with tonal lines',
    '429182': 'gravel: steady ~5 kHz whine and heavy low rumble',
    '630010': 'wood steps: strong mains hum below 150 Hz',
    '223358': 'horse brushed while eating: harmonic machine-like comb 1–4 kHz',
    '641485': 'Florence farmyard: road noise and city hum (stated on the page)',
    '166644': 'pigs in a French farm: dense modern-barn background',
    '609757': 'blacksmith shop: a mechanical (electric) bellows runs throughout',
    '277513': 'church bell ambience: a swinging bell with no free decay',
    '414825': 'church bell: continuous ringing, no isolated strike',
    '496236': 'boiling pot: recorded in a modern rice cooker (tonal drone)',
    '244552': 'flock of sheep: continuous tonal band, possibly a motor',
    '670306': 'cow eating hay: dense broadband noise',
    '841146': 'ice and snow: heavy wind/handling rumble',
    '117631': 'stone tile floor: low-frequency noise dominates the steps',
    '153126': 'donkeys eating hay (Morocco village): risk of village voices/motors; not needed',
    '536693': 'coop straw steps: hens clucking under the steps (only two short rustles kept)',
}

used = {}
for bank, clips in cuts.items():
    for c in clips:
        used.setdefault(c['id'], []).append((bank, c['start'], c['end']))

L = ['# Recorded sound sources', '',
     'Every sound in the abbey is cut from a real recording. No source is synthesised. All recordings below are',
     '**Creative Commons 0** (public domain dedication) on Freesound, except where a row says otherwise;',
     'CC0 needs no attribution, but authors are credited here and in the in-app Credits folio anyway.',
     'Web derivatives are MP3 sprites in `assets/audio/` built by `scripts/audio/build.py` from the HQ previews',
     '(high-pass filtered, occasionally notch-filtered or lightly denoised, cut on quiet samples with short fades,',
     'levelled so the loudest 100 ms of each clip sits at a set RMS). Crop times are seconds in the source file.', '',
     '| Bank | Clips | Source recording | Author | Licence | Crops (s) |', '|---|---:|---|---|---|---|']
for bank in sorted(man['banks']):
    cl = cuts.get(bank, [])
    ids = []
    for c in cl:
        if c['id'] not in ids:
            ids.append(c['id'])
    for i, sid in enumerate(ids):
        s = src.get(sid, {})
        crops = ', '.join(f"{c['start']:.2f}–{c['end']:.2f}" for c in cl if c['id'] == sid)
        L.append(f"| {'`' + bank + '`' if i == 0 else ''} | {len(man['banks'][bank]['clips']) if i == 0 else ''} | [{s.get('title', sid)}]({s.get('url', '')}) | {s.get('author', '')} | {s.get('license', '')} | {crops} |")
L += ['', '## The chant: which recordings sing at which office', '',
      'The office map is `CHANT_FOR` in `src/systems/audio/chant.js` (late November, ordinary time). Every office opens with',
      '*Deus in adjutorium* (said at all the hours); the Sant\u2019Antimo psalmody sings at Matins, Lauds, Vespers and Compline;',
      'the *Magnificat* only at Vespers. After an office\u2019s pieces have been sung once, 45\u201395 s of silence pass before the next',
      'voice (the lessons, the psalms said low), so a phrase is not heard every half minute.', '',
      '- `chant:lesson` (*Lamentation III, Holy Saturday*) is **not sung**: a Holy Saturday lesson is wrong for a routine',
      '  November Matins. The lessons are left to silence. The file stays in the bank as source material only.',
      '- `chant:hymn` (*Veni Creator Spiritus*) is **not sung** in the routine offices: a Pentecost hymn, not an hour of',
      '  ordinary time. Also kept as source material only.',
      '- The three CC BY-SA 3.0 excerpts (`chant:deus`, `chant:magnificat`, `chant:psalm`) are trimmed and levelled derivatives',
      '  (crop times above); they are credited here and in the Credits folio and are shared under CC BY-SA 3.0, as the licence',
      '  requires of adaptations.', '',
      'Where the chant is heard: directly in the church, choir and skull chapel; through the doors from the west porch (clearest),',
      'the cloister walk, the cemetery and the old narthex (muffled); from inside any other building or far out in the',
      'service range, scarcely or not at all (`occ` of the `chant` emitter in `src/systems/audio/emitters.js`).']
L += ['', '## Auditioned and declined', '', 'Candidates downloaded and inspected (spectrogram, level, onset analysis) but not shipped:', '',
      '| Recording | Author | Reason |', '|---|---|---|']
for sid, why in REJECTED.items():
    s = src.get(sid, {})
    L.append(f"| [{s.get('title', sid)}]({s.get('url', 'https://freesound.org/s/' + sid + '/')}) | {s.get('author', '')} | {why} |")
L += ['', 'Paid libraries considered in the audit (BOOM *Medieval Life*, BOOM *Horses*) were not purchased: the free recordings above',
      'cover every cue, and their browser-distribution terms would need vendor confirmation.', '']
out = os.path.join(ROOT, 'docs', 'assets', 'AUDIO_SOURCES.md')
os.makedirs(os.path.dirname(out), exist_ok=True)
with open(out, 'w', encoding='utf-8') as f:
    f.write('\n'.join(L))
print('wrote', len(L), 'lines')
