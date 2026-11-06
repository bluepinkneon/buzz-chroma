"""Produce the one-file Buzz API v1 module from the pinned Shepherd colors."""
from pathlib import Path
import hashlib
import json
import re
import shutil
import subprocess
import tempfile

root = Path(__file__).resolve().parent
dist = root / "dist"
dist.mkdir(exist_ok=True)
source = (root / "shepherd-theme.css").read_bytes()
expected = "687b4dd1b65a9eea989307a1338ddc472df3ecc5aebe204fa19e9d6474a230e6"
assert hashlib.sha256(source).hexdigest() == expected, "Shepherd CSS snapshot changed"
vendor = root / "vendor" / "bluepinkneon"
provenance = json.loads((vendor / "provenance.json").read_text())
for name, entry in provenance["files"].items():
    assert hashlib.sha256((vendor / name).read_bytes()).hexdigest() == entry["sha256"], name + " changed"
colors = dict(re.findall(r"(--[\w-]+):\s*(#[0-9a-fA-F]{6});", source.decode()))
assert len(colors) > 100
palette_colors = {k: v for k, v in colors.items() if k.startswith("--palette-")}
refs = {}
for key, value in colors.items():
    if not key.startswith("--palette-"):
        refs[key] = next(k for k, v in palette_colors.items() if v == value)
prefix = "// Chroma for Buzz — MIT. Built from the original OKLCH/APCA generator.\n"
prefix += "const ORIGINAL_COLORS = " + json.dumps(colors) + ";\n"
prefix += "const TOKEN_REFS = " + json.dumps(refs) + ";\n"
prefix += "const ROLE_CSS = " + json.dumps((root / "buzz-roles.css").read_text()) + ";\n"
with tempfile.TemporaryDirectory(prefix="buzz-chroma-build-") as temp:
    stage = Path(temp)
    shutil.copytree(root / "vendor", stage / "vendor")
    shutil.copy2(root / "package.json", stage / "package.json")
    lock = root / "package-lock.json"
    if lock.exists():
        shutil.copy2(lock, stage / "package-lock.json")
        install = "ci"
    else:
        install = "install"
    subprocess.run(["npm", install, "--ignore-scripts", "--no-audit", "--no-fund"], cwd=stage, check=True)
    shutil.copy2(stage / "package-lock.json", lock)
    (dist / "THIRD-PARTY-NOTICES.txt").write_text(
        "culori 4.0.2 — bundled dependency\n\n" +
        (stage / "node_modules" / "culori" / "LICENSE").read_text())
    (stage / "entry.js").write_text(prefix + (root / "runtime.js").read_text())
    subprocess.run(["bun", "build", "entry.js", "--target=browser", "--format=esm", "--minify",
                    "--outfile=" + str(dist / "plugin.js")], cwd=stage, check=True)
for name in ["manifest.json", "README.md", "LICENSE"]:
    shutil.copy2(root / name, dist / name)
print(f"Built dist/plugin.js ({(dist / 'plugin.js').stat().st_size} bytes); original OKLCH/APCA generator bundled")
