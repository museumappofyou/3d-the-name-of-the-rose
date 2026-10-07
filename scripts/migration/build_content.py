#!/usr/bin/env python3
"""Validate the reviewed phase-1 data and publish it to the Godot project.

    python3 scripts/migration/build_content.py [--check]

1. Builds shared/data/provenance.json: the curated subset of
   book_details/output/claims.jsonl referenced by the reviewed data (original
   claim ids, certainty, entity/attribute/value, chapter label, paragraph
   index, evidence fragment), plus typed document references. The nine
   evidence files are only read; their hashes are recorded and checked.
2. Validates every data file against shared/data/schemas/*.schema.json
   (a small JSON-Schema subset implemented here: type, required, properties,
   additionalProperties, items, enum, pattern, minimum/maximum) and checks
   cross-references (discovery/portal/anchor/entity/location ids, claim ids
   exist in the corpus, condition vocabulary is allowlisted).
3. Writes native/content/*.json for the runtime. Shipped copies drop
   book fragments and source-file paths: the package carries ids, statuses
   and citations, never the raw book or extraction caches.
--check validates without writing.
"""
import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / 'shared/data'
SCHEMAS = DATA / 'schemas'
OUT = ROOT / 'native/content'
EVIDENCE = ROOT / 'book_details/output'
FILES = ['horarium', 'locations', 'entities', 'portals', 'routines', 'discoveries', 'interactions', 'sounds', 'anchors', 'provenance']
CONDITION_KEYS = {'any', 'all', 'not', 'known', 'any_known', 'all_known', 'known_derived', 'phase_in', 'office_in', 'no_office', 'phase_start_after', 'hour_between', 'portal_target', 'curfew'}
ACTION_KEYS = {'note', 'extra', 'toast', 'ms', 'portal_target', 'sound'}


def sha(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()


def load(name):
    return json.loads((DATA / f'{name}.json').read_text())


def walk_refs(obj, out):
    if isinstance(obj, dict):
        if 'claim_id' in obj:
            out['claims'].add(obj['claim_id'])
        if 'doc' in obj and isinstance(obj['doc'], str):
            out['docs'].add(obj['doc'])
        for v in obj.values():
            walk_refs(v, out)
    elif isinstance(obj, list):
        for v in obj:
            walk_refs(v, out)


def build_provenance():
    refs = {'claims': set(), 'docs': set()}
    for n in FILES:
        if n == 'provenance':
            continue
        walk_refs(load(n), refs)
    claims = {}
    with open(EVIDENCE / 'claims.jsonl', encoding='utf-8') as f:
        for line in f:
            d = json.loads(line)
            if d.get('claim_id') in refs['claims']:
                s = d.get('source') or {}
                claims[d['claim_id']] = {
                    'claim_id': d['claim_id'], 'certainty': d.get('certainty'), 'entity': d.get('canonical_entity') or d.get('entity'),
                    'attribute': d.get('attribute'), 'value': d.get('value'), 'category': d.get('category'),
                    'chapter': s.get('chapter'), 'section': s.get('section'), 'paragraph_start': s.get('paragraph_start'), 'paragraph_end': s.get('paragraph_end'),
                    'evidence_fragment': d.get('evidence_fragment'), 'notes': d.get('notes'),
                }
    missing = sorted(refs['claims'] - set(claims))
    if missing:
        raise SystemExit(f'claims referenced but absent from the corpus: {missing}')
    prov = {
        'schema_version': 1,
        'id': 'provenance',
        'corpus': {'path': 'book_details/output', 'files': {p.name: sha(p) for p in sorted(EVIDENCE.iterdir()) if p.is_file()}},
        'note': 'Curated subset for the phase-1 slice. Original claim ids, certainty and citations are preserved; EXPLICIT evidence and RECONSTRUCTION decisions stay distinct on the referencing records. Runtime packages omit evidence fragments.',
        'claims': [claims[k] for k in sorted(claims)],
        'documents': sorted(refs['docs']),
        'assets': {
            'people': 'shared/data/manifests/people_derivatives.json',
            'world': 'shared/data/manifests/world_derivatives.json',
            'audio': 'shared/data/sounds.json (credits per stream/bank)',
            'credits': ['shared/assets/credits.json', 'shared/provenance/model-sources.json', 'scripts/audio/sources.json', 'scripts/audio/extra_sources.json', 'docs/ASSETS.md', 'shared/provenance/reconstruction-decisions.json'],
        },
    }
    return prov


TYPES = {'object': dict, 'array': list, 'string': str, 'number': (int, float), 'integer': int, 'boolean': bool, 'null': type(None)}


def validate(value, schema, path, errors):
    t = schema.get('type')
    if t:
        ts = t if isinstance(t, list) else [t]
        ok = any(isinstance(value, TYPES[x]) and not (x in ('number', 'integer') and isinstance(value, bool)) for x in ts)
        if not ok:
            errors.append(f'{path}: expected {t}, got {type(value).__name__}')
            return
    if 'enum' in schema and value not in schema['enum']:
        errors.append(f'{path}: {value!r} not in {schema["enum"]}')
    if 'pattern' in schema and isinstance(value, str) and not re.search(schema['pattern'], value):
        errors.append(f'{path}: {value!r} does not match {schema["pattern"]}')
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if 'minimum' in schema and value < schema['minimum']:
            errors.append(f'{path}: {value} < {schema["minimum"]}')
        if 'maximum' in schema and value > schema['maximum']:
            errors.append(f'{path}: {value} > {schema["maximum"]}')
    if isinstance(value, dict):
        for k in schema.get('required', []):
            if k not in value:
                errors.append(f'{path}: missing {k}')
        props = schema.get('properties', {})
        for k, v in value.items():
            if k in props:
                validate(v, props[k], f'{path}.{k}', errors)
            elif schema.get('additionalProperties') is False:
                errors.append(f'{path}: unexpected property {k}')
            elif isinstance(schema.get('additionalProperties'), dict):
                validate(v, schema['additionalProperties'], f'{path}.{k}', errors)
    if isinstance(value, list) and 'items' in schema:
        for i, v in enumerate(value):
            validate(v, schema['items'], f'{path}[{i}]', errors)
        if 'minItems' in schema and len(value) < schema['minItems']:
            errors.append(f'{path}: fewer than {schema["minItems"]} items')


def check_condition(c, path, errors, ids):
    if not isinstance(c, dict) or len(c) != 1 and not set(c) <= CONDITION_KEYS:
        errors.append(f'{path}: condition must be one allowlisted operator: {c}')
        return
    for k, v in c.items():
        if k not in CONDITION_KEYS:
            errors.append(f'{path}: operator {k!r} not allowlisted')
        elif k in ('any', 'all'):
            for i, x in enumerate(v):
                check_condition(x, f'{path}.{k}[{i}]', errors, ids)
        elif k == 'not':
            check_condition(v, f'{path}.not', errors, ids)
        elif k == 'known' and v not in ids['discoveries']:
            errors.append(f'{path}: unknown discovery {v}')
        elif k in ('any_known', 'all_known'):
            for x in v:
                if x not in ids['discoveries']:
                    errors.append(f'{path}: unknown discovery {x}')
        elif k == 'known_derived' and v not in ids['derived']:
            errors.append(f'{path}: unknown derived rule {v}')
        elif k == 'portal_target' and v[0] not in ids['portals']:
            errors.append(f'{path}: unknown portal {v[0]}')
        elif k == 'curfew' and v not in ids['curfews']:
            errors.append(f'{path}: unknown curfew rule {v}')
        elif k == 'phase_in':
            for x in v:
                if x not in ids['phases']:
                    errors.append(f'{path}: unknown phase {x}')
        elif k == 'office_in':
            for x in v:
                if x not in ids['offices']:
                    errors.append(f'{path}: unknown office {x}')


def cross_check(d, errors):
    ids = {
        'discoveries': {x['id'] for x in d['discoveries']['discoveries']},
        'derived': set(d['discoveries']['derived']),
        'portals': {x['id'] for x in d['portals']['portals']},
        'anchors': set(d['anchors']['anchors']),
        'entities': {x['id'] for x in d['entities']['entities']},
        'locations': {x['id'] for x in d['locations']['rooms']},
        'curfews': set(d['horarium']['curfew_rules']),
        'phases': {x['id'] for x in d['horarium']['phases']},
        'offices': {x['id'] for x in d['horarium']['offices']},
    }
    for k, rule in d['discoveries']['derived'].items():
        check_condition({x: y for x, y in rule.items() if x in CONDITION_KEYS}, f'discoveries.derived.{k}', errors, ids)
    for it in d['interactions']['interactions']:
        p = f'interactions.{it["id"]}'
        if it['entity_id'] not in ids['entities']:
            errors.append(f'{p}: unknown entity {it["entity_id"]}')
        if it['anchor_id'] not in ids['anchors']:
            errors.append(f'{p}: unknown anchor {it["anchor_id"]}')
        if it.get('portal_id') and it['portal_id'] not in ids['portals']:
            errors.append(f'{p}: unknown portal {it["portal_id"]}')
        for i, lw in enumerate(it.get('label_when', [])):
            check_condition(lw['if'], f'{p}.label_when[{i}]', errors, ids)
        for i, r in enumerate(it['rules']):
            check_condition(r['if'], f'{p}.rules[{i}]', errors, ids)
            for a in r['do']:
                if not set(a) <= ACTION_KEYS:
                    errors.append(f'{p}.rules[{i}]: action keys {set(a) - ACTION_KEYS} not allowlisted')
                if 'note' in a and a['note'] not in ids['discoveries']:
                    errors.append(f'{p}.rules[{i}]: unknown discovery {a["note"]}')
                if 'portal_target' in a and a['portal_target'][0] not in ids['portals']:
                    errors.append(f'{p}.rules[{i}]: unknown portal')
    for r in d['routines']['routines']:
        check_condition(r['available_when'], f'routines.{r["entity_id"]}', errors, ids)
        if r['slot']['anchor_id'] not in ids['anchors']:
            errors.append(f'routines.{r["entity_id"]}: unknown anchor')
        if r['entity_id'] not in ids['entities']:
            errors.append(f'routines: unknown entity {r["entity_id"]}')
    for p in d['portals']['portals']:
        if p.get('anchor_id') and p['anchor_id'] not in ids['anchors']:
            errors.append(f'portals.{p["id"]}: unknown anchor {p["anchor_id"]}')
        for loc in p.get('connects', []):
            if loc not in ids['locations'] and loc != 'exterior':
                errors.append(f'portals.{p["id"]}: unknown location {loc}')
        if p.get('curfew_rule') and p['curfew_rule'] not in ids['curfews']:
            errors.append(f'portals.{p["id"]}: unknown curfew {p["curfew_rule"]}')
    for x in d['discoveries']['discoveries']:
        if x.get('location_id') and x['location_id'] not in ids['locations']:
            errors.append(f'discoveries.{x["id"]}: unknown location {x["location_id"]}')
    # phases tile 0..24 without gaps
    ph = d['horarium']['phases']
    for a, b in zip(ph, ph[1:]):
        if abs(a['t1'] - b['t0']) > 1e-9:
            errors.append(f'horarium: gap between {a["id"]} and {b["id"]}')
    if ph[0]['t0'] != 0 or ph[-1]['t1'] != 24:
        errors.append('horarium: phases do not cover 0..24')
    for o in d['horarium']['offices']:
        if not any(p.get('office') == o['id'] and p['t0'] == o['t0'] and p['t1'] == o['t1'] for p in ph):
            errors.append(f'horarium: office {o["id"]} has no matching phase')


SCENARIOS = {'day1a': ROOT / 'shared/scenarios/day1a/day1a.json'}
CAST_TEMPLATES = ROOT / 'shared/assets/models/people/cast.json'


def check_scenario(sid, d, errors):
    p = f'scenario {sid}'
    nodes = set(d['nodes'])
    for i, e in enumerate(d['edges']):
        if len(e) != 2 or e[0] not in nodes or e[1] not in nodes:
            errors.append(f'{p}: edge {i} {e} references unknown nodes')
    for r, ids in d['routes'].items():
        for x in ids:
            if x not in nodes:
                errors.append(f'{p}: route {r} unknown node {x}')
        adj = {}
        for a, b in d['edges']:
            adj.setdefault(a, set()).add(b); adj.setdefault(b, set()).add(a)
        for a, b in zip(ids, ids[1:]):
            if b not in adj.get(a, set()):
                errors.append(f'{p}: route {r} leg {a}-{b} is not an edge')
    speakers = set(d['people']) | {'adso'}
    for lid, L in d['lines'].items():
        if L['s'] not in speakers:
            errors.append(f'{p}: line {lid} unknown speaker {L["s"]}')
        for who in L.get('teaches', []):
            if who not in d['people']:
                errors.append(f'{p}: line {lid} teaches unknown person {who}')
            elif d['people'][who].get('name', '').split()[-1] not in L['t']:
                errors.append(f'{p}: line {lid} teaches {who} but does not say the name')
    for oid, o in d['observations'].items():
        if o['reply'] not in d['lines']:
            errors.append(f'{p}: observation {oid} reply {o["reply"]} missing')
    for oid in d['watch']:
        if oid not in d['observations']:
            errors.append(f'{p}: watch {oid} is not an observation')
    cast = json.loads(CAST_TEMPLATES.read_text())['people']
    used = {}
    for pid, q in d['people'].items():
        if q['template'] not in cast:
            errors.append(f'{p}: person {pid} template {q["template"]} not in the cast')
        used.setdefault(q['template'], []).append(pid)
    for t, ids in used.items():
        if len(ids) > 1:
            errors.append(f'{p}: template {t} shared by {ids} (stable identities need distinct faces)')
    for b in d['anonymous']:
        if b['stall'] not in nodes:
            errors.append(f'{p}: {b["id"]} stall {b["stall"]} unknown')
        if b['template'] in used:
            errors.append(f'{p}: {b["id"]} uses the named template {b["template"]}')
    for lp in d['look_points']:
        if lp.get('route') not in d['routes']:
            errors.append(f'{p}: look point {lp["id"]} on unknown route')
    # spoiler policy: no line may mention the library or protected matters
    for lid, L in d['lines'].items():
        low = L['t'].lower()
        for w in ('library', 'labyrinth', 'murder', 'death', 'dead', 'poison', 'secret', 'finis africae'):
            if w in low:
                errors.append(f'{p}: line {lid} contains a protected word {w!r}')


def strip_for_package(name, d):
    if name == 'provenance':
        d = json.loads(json.dumps(d))
        for c in d['claims']:
            c.pop('evidence_fragment', None)
        d['corpus'] = {'files': d['corpus']['files'], 'note': 'hashes of the research corpus this subset was taken from; the corpus itself is not shipped'}
    return d


def main():
    check_only = '--check' in sys.argv
    before = {p.name: sha(p) for p in EVIDENCE.iterdir() if p.is_file()}
    provenance = build_provenance()
    data = {n: load(n) for n in FILES}
    data['provenance'] = provenance
    errors = []
    for n in FILES:
        sp = SCHEMAS / f'{n}.schema.json'
        if not sp.exists():
            errors.append(f'missing schema {sp.relative_to(ROOT)}')
            continue
        validate(data[n], json.loads(sp.read_text()), n, errors)
    cross_check(data, errors)
    scen = {}
    for sid, path in SCENARIOS.items():
        if path.exists():
            scen[sid] = json.loads(path.read_text())
            sp = SCHEMAS / f'{sid}.schema.json'
            validate(scen[sid], json.loads(sp.read_text()), sid, errors)
            check_scenario(sid, scen[sid], errors)
    after = {p.name: sha(p) for p in EVIDENCE.iterdir() if p.is_file()}
    if before != after or len(after) != 9:
        errors.append('book_details/output changed or is incomplete during the build')
    if errors:
        print('\n'.join('ERROR ' + e for e in errors))
        raise SystemExit(1)
    if not check_only:
        (DATA / 'provenance.json').write_text(json.dumps(provenance, indent=1, ensure_ascii=False) + '\n')
        OUT.mkdir(parents=True, exist_ok=True)
        manifest = {'schema_version': 1, 'files': {}, 'evidence_corpus': after}
        for n in FILES:
            f = OUT / f'{n}.json'
            f.write_text(json.dumps(strip_for_package(n, data[n]), ensure_ascii=False, separators=(',', ':')) + '\n')
            manifest['files'][n] = {'source_sha256': sha(DATA / f'{n}.json'), 'package_sha256': sha(f)}
        # derived runtime manifests (not reviewed data): cells/fields/trees and
        # the cast metadata the presentations need
        wd = DATA / 'manifests/world_derivatives.json'
        if wd.exists():
            w = json.loads(wd.read_text())
            world = {'schema_version': 1, 'source_sha256': sha(wd), 'snow_cover': w['snow_cover'], 'fields': w['fields'], 'trees': w['trees'], 'emitters': w.get('emitters', []), 'sound_emitters': w.get('sound_emitters', []),
                     'cells': [{'id': c['id'], 'bounds': c['bounds'], 'triangles': c['census']['tris'], 'collision': [x['surface'] for x in c['collision']]} for c in w['cells']]}
            (OUT / 'world.json').write_text(json.dumps(world, separators=(',', ':')) + '\n')
            manifest['files']['world'] = {'source_sha256': sha(wd), 'package_sha256': sha(OUT / 'world.json')}
        # Day-1A world (cells, fields, rings, trees, anchors); emitters inside
        # the Aedificium are dropped: Day 1 never lights its upper floors
        wd1 = DATA / 'manifests/world_day1a_derivatives.json'
        if wd1.exists():
            w1 = json.loads(wd1.read_text())
            def outside_aed(e):
                return ((e['x'] - 42.0) ** 2 + (e['z'] + 66.36) ** 2) ** 0.5 > 46.0
            world1 = {'schema_version': 1, 'source_sha256': sha(wd1), 'fields': w1['fields'], 'trees': w1['trees'], 'tree_meshes': w1['tree_meshes'], 'tree_atlases': w1['tree_atlases'],
                      'emitters': [e for e in w1['emitters'] if outside_aed(e)], 'sound_emitters': w1['sound_emitters'],
                      'anchors': w1['anchors'], 'doors': w1['doors'], 'probes': w1['probes'],
                      'cells': [{'id': c['id'], 'bounds': c['bounds'], 'triangles': c['triangles'], 'collision': c['collision']} for c in w1['cells']]}
            (OUT / 'world_day1a.json').write_text(json.dumps(world1, separators=(',', ':')) + '\n')
            manifest['files']['world_day1a'] = {'source_sha256': sha(wd1), 'package_sha256': sha(OUT / 'world_day1a.json')}
        an = DATA / 'manifests/animal_derivatives.json'
        if an.exists():
            A = json.loads(an.read_text())['animals']
            animals = {'schema_version': 1, 'source_sha256': sha(an), 'animals': {k: {f: v[f] for f in ('output', 'clips', 'scale', 'target_height_m', 'coat', 'licence')} for k, v in A.items()}}
            (OUT / 'animals.json').write_text(json.dumps(animals, separators=(',', ':')) + '\n')
            manifest['files']['animals'] = {'source_sha256': sha(an), 'package_sha256': sha(OUT / 'animals.json')}
        cast = json.loads((ROOT / 'shared/assets/models/people/cast.json').read_text())
        pd = DATA / 'manifests/people_derivatives.json'
        used = sorted(json.loads(pd.read_text())['people']) if pd.exists() else ['alinardo']
        castc = {'schema_version': 1, 'source': 'shared/assets/models/people/cast.json', 'source_sha256': sha(ROOT / 'shared/assets/models/people/cast.json'),
                 'people': {k: {f: cast['people'][k].get(f) for f in ('dress', 'wool', 'hoods', 'tint', 'height', 'pelvis', 'head', 'tris')} for k in used}}
        (OUT / 'cast.json').write_text(json.dumps(castc, separators=(',', ':')) + '\n')
        manifest['files']['cast'] = {'source_sha256': castc['source_sha256'], 'package_sha256': sha(OUT / 'cast.json')}
        crowd = DATA / 'bench/crowd.json'
        if crowd.exists():
            (OUT / 'crowd.json').write_text(json.dumps(json.loads(crowd.read_text()), separators=(',', ':')) + '\n')
            manifest['files']['crowd'] = {'source_sha256': sha(crowd), 'package_sha256': sha(OUT / 'crowd.json')}
        for sid, d in scen.items():
            (OUT / f'{sid}.json').write_text(json.dumps(d, ensure_ascii=False, separators=(',', ':')) + '\n')
            manifest['files'][sid] = {'source_sha256': sha(SCENARIOS[sid]), 'package_sha256': sha(OUT / f'{sid}.json')}
        (OUT / 'content_manifest.json').write_text(json.dumps(manifest, indent=1) + '\n')
    print('content OK:', ', '.join(FILES + list(scen)), '' if check_only else f'-> {OUT.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
