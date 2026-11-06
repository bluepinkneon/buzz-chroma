"""Native macOS WebKit regression for Buzz's clipped workspace page contract.

python3 tools/check-workspace-scroll.py [--output /path/in/OS-temp]
Optional --baseline-ref <git-ref> renders an old module as a negative control.
No Buzz account, browser session, network, visible window or activation is used.
"""
from pathlib import Path
import argparse
import re
import subprocess
import tempfile

root = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output', type=Path)
parser.add_argument('--baseline-ref')
args = parser.parse_args()
with tempfile.TemporaryDirectory(prefix='colors-workspace-scroll-') as temp:
    output = args.output.resolve() if args.output else Path(temp)
    output.mkdir(parents=True, exist_ok=True)
    bundle = (subprocess.check_output(['git', 'show', args.baseline_ref + ':dist/plugin.js'], cwd=root).decode()
              if args.baseline_ref else (root / 'dist/plugin.js').read_text())
    match = re.search(r'export\{[^}]*?([\w$]+) as apply[^}]*\};?', bundle)
    assert match, 'Compiled API v1 apply export not found'
    entry = match.group(1)
    bundle = bundle[:match.start()] + bundle[match.end():]
    fixture = (root / 'test/visual/workspace-scroll.html').read_text()
    fixture = fixture.replace('__APPLY__', entry).replace('__BUNDLE__', bundle)
    (output / 'fixture.html').write_text(fixture)
    renderer = Path(temp) / 'render'
    subprocess.run(['swiftc', str(root / 'test/visual/workspace-scroll.swift'), '-o', str(renderer)], check=True)
    subprocess.run([str(renderer), str(output)], check=True, timeout=60)
    if args.output:
        print('Screenshots and receipt:', output)
