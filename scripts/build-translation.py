#!/usr/bin/env python3
"""Build the translated version of the MyST book.

1. Reads scripts/translation-config.yml for the target language
2. Runs translate-sources.py to translate sources into _translated/<target_lang>/
3. Runs `myst build --html` inside the translated directory
4. Copies the translated build output into _build/html/<target_lang>/
"""

import os
import shutil
import subprocess
import sys
import yaml

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(SCRIPTS_DIR)

with open(os.path.join(SCRIPTS_DIR, "translation-config.yml"), "r", encoding="utf-8") as f:
    CONFIG = yaml.safe_load(f)

TARGET_LANG = CONFIG["target_lang"]
TRANSLATED_DIR = os.path.join(ROOT_DIR, "_translated", TARGET_LANG)
PRIMARY_BUILD = os.path.join(ROOT_DIR, "_build", "html")
TRANSLATED_BUILD_SRC = os.path.join(TRANSLATED_DIR, "_build", "html")
TRANSLATED_BUILD_DST = os.path.join(PRIMARY_BUILD, TARGET_LANG)
BASE_URL = os.environ.get("BASE_URL", "").rstrip("/")


def run(cmd, cwd=None):
    print(f"  Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    if result.stdout:
        print(result.stdout)
    if result.returncode != 0:
        print(f"  ERROR: {result.stderr}", file=sys.stderr)
        sys.exit(1)
    return result


def main():
    # Step 1: Translate sources
    print("=== Step 1: Translating source files ===")
    run([sys.executable, os.path.join(SCRIPTS_DIR, "translate-sources.py")])

    # Step 2: Build translated site with myst
    print(f"\n=== Step 2: Building {TARGET_LANG} HTML ===")
    env = os.environ.copy()
    env["BASE_URL"] = f"{BASE_URL}/{TARGET_LANG}"
    result = subprocess.run(
        ["myst", "build", "--html"],
        cwd=TRANSLATED_DIR,
        env=env,
        capture_output=True,
        text=True,
    )
    if result.stdout:
        print(result.stdout)
    if result.returncode != 0:
        print(f"  ERROR building {TARGET_LANG} site: {result.stderr}", file=sys.stderr)
        sys.exit(1)

    # Step 3: Copy translated build into primary build's /<target_lang>/ directory
    print(f"\n=== Step 3: Merging {TARGET_LANG} build into main site ===")
    if not os.path.exists(TRANSLATED_BUILD_SRC):
        print(f"  ERROR: translated build output not found at {TRANSLATED_BUILD_SRC}", file=sys.stderr)
        sys.exit(1)

    if os.path.exists(TRANSLATED_BUILD_DST):
        shutil.rmtree(TRANSLATED_BUILD_DST)

    shutil.copytree(TRANSLATED_BUILD_SRC, TRANSLATED_BUILD_DST)
    print(f"  Copied {TARGET_LANG} build to {os.path.relpath(TRANSLATED_BUILD_DST, ROOT_DIR)}")

    print(f"\n=== {TARGET_LANG} build complete ===")
    html_count = sum(
        1 for f in os.listdir(TRANSLATED_BUILD_DST) if f.endswith(".html")
    )
    print(f"  {html_count} {TARGET_LANG} HTML pages in {os.path.relpath(TRANSLATED_BUILD_DST, ROOT_DIR)}")


if __name__ == "__main__":
    main()
