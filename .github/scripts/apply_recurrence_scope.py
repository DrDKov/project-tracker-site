import runpy
from pathlib import Path
script = Path('.github/scripts/apply_task_links.py')
if not script.exists():
    raise SystemExit('apply_task_links.py not found')
runpy.run_path(str(script), run_name='__main__')
