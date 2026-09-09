"""Build an auditable story-first route from the supplied, unchanged source.
No internet calls. Source lines are 1-based; manual edits live in route.tsv / editorial.json.
"""
from pathlib import Path
import json, re, hashlib
ROOT = Path(__file__).resolve().parent.parent
source = json.loads((ROOT / 'public/source/guide.json').read_text())
editorial = json.loads((ROOT / 'scripts/editorial.json').read_text())
chapters = []
section_map = {s['number']:s for s in source['sections']}
for spec in (ROOT / 'scripts/route.tsv').read_text().splitlines():
    if not spec.strip() or spec.startswith('#'): continue
    cols = spec.split('|')
    if cols[0] == 'C':
        _, number, title, subtitle, route, party = cols
        section = section_map[int(number)]
        chapter = dict(id=f'ch-{number}', number=int(number), order=len(chapters), title=title,
            subtitle=subtitle, route=route, party=party, source=section, tasks=[])
        chapters.append(chapter)
        continue
    span, title, summary, kind, *extra = cols
    first, last = map(int,span.split('-'))
    file = chapter['source']['file']
    lines = source['files'][file].splitlines()
    assert chapter['source']['start'] <= first <= last <= chapter['source']['end'], spec
    task_id = f'{file}-{first}'
    notes = []
    for line in range(first,last+1):
        text = lines[line-1].strip()
        key = f'{file}:{line}'
        if key in editorial['omit']: continue
        if key in editorial['replace']: text = editorial['replace'][key]
        elif not re.match(r'^(?:\*\*)?\[(主线|支线|小剧情|门派)\]',text): continue
        text = text.replace('**','')
        text = re.sub(r'^\[(主线|支线|小剧情|门派)\]','',text)
        if text: notes.append({'line':line,'text':text})
    warning = editorial['warnings'].get(task_id,'')
    if not notes and first != 1: raise ValueError(f'Empty task {task_id}')
    chapter['tasks'].append(dict(id=task_id,title=title,summary=summary,kind=kind,
        branch=extra[0] if extra and extra[0] else 'all',warning=warning,steps=notes,
        source={'file':file,'start':first,'end':last},chapter=chapter['id']))
result = {'version':1,'sourceVersion':source['version'], 'chapters':chapters}
(ROOT/'src/data/guide.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
count=sum(len(c['tasks']) for c in chapters)
print(f'Built {len(chapters)} chapters, {count} tasks; {sum(bool(t["warning"]) for c in chapters for t in c["tasks"])} advance warnings.')
