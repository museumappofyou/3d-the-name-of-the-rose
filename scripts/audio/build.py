#!/usr/bin/env python3
"""Build the recorded sound banks of the abbey from CC0 field recordings.

    python3 scripts/audio/build.py SRC_DIR [bank ...]

SRC_DIR holds the downloaded Freesound previews as <id>.ogg (see
scripts/audio/sources.json for authors, titles, URLs and licences). Each
bank in scripts/audio/spec.py lists the source segments it is cut from:
either explicit [start, end] times, or `auto` onset detection inside a range
(footsteps, knocks, calls). Every clip is filtered (high-pass, notches for
the few tonal contaminants found in the spectrograms), cut on quiet
samples with short fades, levelled so its loudest 100 ms sits at RMS 0.1
(the convention of the old synthesised banks, so the mixer's gains keep
their meaning) and packed with its siblings into one sprite per bank:

    assets/audio/<bank>.mp3     sync click at 0.05 s, then the clips
    assets/audio/manifest.json  { bank: { file, sr, ch, clips: [[t, dur], ...] } }

The click lets the browser measure the decoder's priming delay, so clip
offsets stay sample-exact whatever the MP3 decoder does. Loops are baked
seamless with an equal-power crossfade of their own tail into their head.
"""
import json, os, subprocess, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'assets', 'audio')
SR = 44100
SYNC = 0.05

sys.path.insert(0, HERE)
from spec import BANKS  # noqa: E402

_cache = {}


def load(src_dir, sid, filt=None, ch=1):
    key = (sid, filt, ch)
    if key in _cache:
        return _cache[key]
    af = ['aresample=%d' % SR]
    if filt:
        af.insert(0, filt)
    cmd = ['ffmpeg', '-v', 'error', '-i', os.path.join(src_dir, sid + '.ogg'), '-af', ','.join(af),
           '-ac', str(ch), '-f', 'f32le', '-']
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype=np.float32).copy()
    x = x.reshape(-1, ch) if ch > 1 else x.reshape(-1, 1)
    _cache[key] = x
    return x


def env(x, hop, hp=True):
    m = x.mean(axis=1)
    if hp:  # first difference: a cheap high-pass for onset energy
        m = np.concatenate([[0], np.diff(m)])
    n = len(m) // hop
    e = np.sqrt((m[:n * hop].reshape(n, hop) ** 2).mean(axis=1) + 1e-14)
    return 20 * np.log10(e)


def onsets(x, t0, t1, rise=12, gap=0.3, floor_pct=20, min_abs=-70):
    """Times of sharp energy rises (steps, knocks, calls) inside [t0, t1]."""
    hop = int(SR * 0.005)
    a, b = int(t0 * SR), int(min(t1, len(x) / SR) * SR)
    e = env(x[a:b], hop)
    fl = np.percentile(e, floor_pct)
    out, last = [], -9
    for i in range(3, len(e) - 1):
        prev = e[max(0, i - 8):i - 1].min()
        if e[i] - prev > rise and e[i] > fl + rise and e[i] > min_abs and e[i] >= e[i + 1] - 3:
            t = t0 + i * hop / SR
            if t - last > gap:
                # walk back to where the rise begins
                j = i
                while j > 1 and e[j - 1] < e[j] - 1.5:
                    j -= 1
                out.append(t0 + j * hop / SR)
                last = t
    return out


def loudness(c, win=0.1):
    m = c.mean(axis=1) if c.ndim > 1 else c
    w = max(1, min(len(m), int(win * SR)))
    s = np.convolve(m ** 2, np.ones(w), 'valid') / w
    return float(np.sqrt(s.max())) if len(s) else 0.0


def fade(c, fin, fout):
    c = c.copy()
    a, b = int(fin * SR), int(fout * SR)
    if a:
        c[:a] *= (np.linspace(0, 1, a) ** 2)[:, None]
    if b:
        c[-b:] *= (np.linspace(1, 0, b) ** 2)[:, None]
    return c


def quiet_cut(x, i, search=0.012, backwards=True):
    """Move a cut point to the quietest nearby sample."""
    s = int(search * SR)
    i = max(0, min(len(x) - 1, i))
    lo, hi = (max(0, i - s), i) if backwards else (i, min(len(x), i + s))
    if hi - lo < 2:
        return i
    return lo + int(np.argmin(np.abs(x[lo:hi]).sum(axis=1)))


def level(c, target, cap=0.97):
    l = loudness(c)
    if l < 1e-9:
        return c
    k = target / l
    p = np.abs(c).max() * k
    if p > cap:
        k *= cap / p
    return c * k


def seamless(c, xf):
    """Loop: crossfade the tail (xf s) into the head."""
    n = int(xf * SR)
    body, tail = c[:-n].copy(), c[-n:]
    u = np.linspace(0, 1, n)[:, None]
    body[:n] = body[:n] * np.sin(u * np.pi / 2) + tail * np.cos(u * np.pi / 2)
    return body


def cut_bank(src_dir, name, b):
    ch = b.get('ch', 1)
    clips, prov = [], []
    for s in b['src']:
        x = load(src_dir, s['id'], s.get('filt'), ch)
        segs = []
        if 'auto' in s:
            a = s['auto']
            ts = onsets(x, a.get('t0', 0), a.get('t1', 1e9), a.get('rise', 12), a.get('gap', 0.3), min_abs=a.get('min', -70))
            for k, t in enumerate(ts):
                nxt = ts[k + 1] if k + 1 < len(ts) else t + 9
                end = min(t + a.get('max', 0.5), nxt - a.get('guard', 0.03))
                if end - t >= a.get('minlen', 0.12):
                    segs.append((max(0, t - a.get('pre', 0.012)), end))
            if 'skip' in s:
                segs = [g for k, g in enumerate(segs) if k not in s['skip']]
            if 'pick' in s:
                segs = [segs[k] for k in s['pick'] if k < len(segs)]
        for t0, t1 in s.get('seg', []):
            segs.append((t0, t1))
        for t0, t1 in segs:
            i0 = quiet_cut(x, int(t0 * SR), 0.006)
            i1 = quiet_cut(x, int(t1 * SR), 0.02)
            c = x[i0:i1]
            if len(c) < SR * 0.03:
                continue
            fin, fout = s.get('fade', b.get('fade', (0.004, 0.05)))
            if b.get('loop'):
                c = seamless(c, b.get('xf', 1.5))
            else:
                c = fade(c, fin, fout)
            c = c * s.get('gain', 1.0)
            clips.append(c)
            prov.append({'id': s['id'], 'start': round(i0 / SR, 3), 'end': round(i1 / SR, 3)})
    # rank for quality: drop the weakest-signal clips if we have too many
    n = b.get('n')
    if n and len(clips) > n:
        order = sorted(range(len(clips)), key=lambda k: -loudness(clips[k]) / (np.abs(clips[k][-int(0.02 * SR):]).mean() + 1e-6))
        if b.get('rank'):
            keep = sorted(order[:n])
        else:  # round-robin across the sources so every recording is heard
            by = {}
            for k, pr in enumerate(prov):
                by.setdefault(pr['id'], []).append(k)
            lists, keep = list(by.values()), []
            while len(keep) < n:
                for l in lists:
                    if l and len(keep) < n:
                        keep.append(l.pop(0))
            keep.sort()
        clips = [clips[k] for k in keep]
        prov = [prov[k] for k in keep]
    tgt = b.get('target', 0.1)
    clips = [level(c, tgt) if not b.get('loop') else level(c, tgt, 0.98) for c in clips]
    return clips, prov


def write_sprite(name, clips, ch, q):
    gap = int(0.12 * SR)
    head = np.zeros((int(0.2 * SR), ch), np.float32)
    head[int(SYNC * SR)] = 0.5
    parts, table, at = [head], [], len(head)
    for c in clips:
        table.append([round(at / SR, 5), round(len(c) / SR, 5)])
        parts += [c.astype(np.float32), np.zeros((gap, ch), np.float32)]
        at += len(c) + gap
    y = np.concatenate(parts)
    fn = name.replace(':', '_') + '.mp3'
    p = subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', str(ch), '-i', '-',
                        '-c:a', 'libmp3lame', '-q:a', str(q), os.path.join(OUT, fn)], input=y.tobytes())
    if p.returncode:
        raise SystemExit('encode failed: ' + name)
    return fn, table


def main():
    src_dir = sys.argv[1]
    only = set(sys.argv[2:])
    os.makedirs(OUT, exist_ok=True)
    mpath = os.path.join(OUT, 'manifest.json')
    man = json.load(open(mpath)) if os.path.exists(mpath) else {'sync': SYNC, 'banks': {}}
    cuts = json.load(open(os.path.join(HERE, 'cuts.json'))) if os.path.exists(os.path.join(HERE, 'cuts.json')) else {}
    for name, b in BANKS.items():
        if only and name not in only:
            continue
        clips, prov = cut_bank(src_dir, name, b)
        if not clips:
            print('!! no clips for', name)
            continue
        ch = b.get('ch', 1)
        fn, table = write_sprite(name, clips, ch, b.get('q', 4))
        man['banks'][name] = {'file': fn, 'ch': ch, 'clips': table, 'lvl': b.get('lvl', 1), **({'loop': True} if b.get('loop') else {})}
        cuts[name] = prov
        kb = os.path.getsize(os.path.join(OUT, fn)) / 1024
        print(f'{name:18s} {len(clips):2d} clips  {sum(t[1] for t in table):6.2f}s  {kb:6.1f} KB  <- {sorted(set(p["id"] for p in prov))}')
    json.dump(man, open(mpath, 'w'), indent=1, sort_keys=True)
    json.dump(cuts, open(os.path.join(HERE, 'cuts.json'), 'w'), indent=1, sort_keys=True)


if __name__ == '__main__':
    main()
