import re
import runpy
from pathlib import Path

script = Path('.github/scripts/apply_task_links.py')
if not script.exists():
    raise SystemExit('apply_task_links.py not found')

src = script.read_text(encoding='utf-8')
src = re.sub(r"\nif old\.exists\(\):\n    .+?\nJS=r'''", "\nJS=r'''", src, count=1, flags=re.S)
tmp = Path('.github/scripts/_apply_task_links_norecur.py')
tmp.write_text(src, encoding='utf-8')
try:
    runpy.run_path(str(tmp), run_name='__main__')
finally:
    if tmp.exists():
        tmp.unlink()
