"""Produce the one-file Buzz API v1 module from the pinned Shepherd colors."""
from pathlib import Path
import hashlib
import json
import re
import shutil
import subprocess
import tempfile
import base64

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
prefix = "// Color Overthinkers for Buzz — MIT. OKLCH palettes and measured APCA contrast.\n"
prefix += "const ORIGINAL_COLORS = " + json.dumps(colors) + ";\n"
prefix += "const TOKEN_REFS = " + json.dumps(refs) + ";\n"
prefix += "const PLUGIN_ICON = " + json.dumps("data:image/svg+xml;base64," + base64.b64encode((root / "sidebar-icon.svg").read_bytes()).decode()) + ";\n"
with tempfile.TemporaryDirectory(prefix="buzz-chroma-build-") as temp:
    stage = Path(temp)
    shutil.copytree(root / "vendor", stage / "vendor")
    for name in ["role-engine.js", "role-map.js", "presets.js", "local-themes.js", "harmony.js", "palette-preview.js"]:
        shutil.copy2(root / name, stage / name)
    shutil.copy2(root / "package.json", stage / "package.json")
    lock = root / "package-lock.json"
    if lock.exists():
        shutil.copy2(lock, stage / "package-lock.json")
        install = "ci"
    else:
        install = "install"
    subprocess.run(["npm", install, "--ignore-scripts", "--no-audit", "--no-fund"], cwd=stage, check=True)
    # Keep dependency integrity without baking the builder's private registry
    # endpoint into a public project. npm resolves via each builder's registry.
    locked = json.loads((stage / "package-lock.json").read_text())
    package = json.loads((root / "package.json").read_text())
    locked.update(name=package["name"], version=package["version"])
    locked["packages"][""].update(name=package["name"], version=package["version"])
    for dependency in locked["packages"].values():
        dependency.pop("resolved", None)
    lock.write_text(json.dumps(locked, indent=2) + "\n")
    (dist / "THIRD-PARTY-NOTICES.txt").write_text(
        "culori 4.0.2 — bundled dependency\n\n" +
        (stage / "node_modules" / "culori" / "LICENSE").read_text())
    (stage / "entry.js").write_text(prefix + (root / "runtime.js").read_text())
    subprocess.run(["bun", "build", "entry.js", "--target=browser", "--format=esm", "--minify",
                    "--outfile=" + str(dist / "plugin.js")], cwd=stage, check=True)
for name in ["manifest.json", "README.md", "LICENSE", "icon.png"]:
    shutil.copy2(root / name, dist / name)
print(f"Built dist/plugin.js ({(dist / 'plugin.js').stat().st_size} bytes); original OKLCH/APCA generator bundled")
