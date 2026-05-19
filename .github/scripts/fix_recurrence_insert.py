from pathlib import Path
import re

ROOT = Path('.')
RUNTIME = ROOT / 'assets/app-runtime.js'
LOADER = ROOT / 'assets/app.js'
INDEX = ROOT / 'index.html'

old = "await S.sb.from('tasks').upsert(rows,{onConflict:'recurrence_rule_id,recurrence_date'}).select('id,recurrence_date')"
new = "await S.sb.from('tasks').insert(rows).select('id,recurrence_date')"

s = RUNTIME.read_text(encoding='utf-8')
if old not in s and new not in s:
    raise SystemExit('recurrence upsert pattern not found')
s = s.replace(old, new)
RUNTIME.write_text(s, encoding='utf-8')

if LOADER.exists():
    loader = LOADER.read_text(encoding='utf-8')
    loader = re.sub(r"assets/app-runtime\.js\?v=[^'\"]+", 'assets/app-runtime.js?v=20260519-recurrence-insert-v1', loader)
    LOADER.write_text(loader, encoding='utf-8')

if INDEX.exists():
    html = INDEX.read_text(encoding='utf-8')
    html = re.sub(r"assets/app\.js\?v=[^'\"]+", 'assets/app.js?v=20260519-recurrence-insert-v1', html)
    INDEX.write_text(html, encoding='utf-8')

for p in [ROOT/'.github/scripts/fix_recurrence_insert.py', ROOT/'.github/workflows/fix-recurrence-insert.yml']:
    if p.exists():
        p.unlink()
