#!/usr/bin/env python3
"""Inject language switcher script into all built HTML files (source + translated).

Reads scripts/translation-config.yml to learn the language pair, then injects
<meta> tags carrying source-lang, target-lang, default-lang, plus the
<script> tag. The JS itself reads those meta tags at runtime so no templating
of the JS file is needed.

Only injects tags — all CSS lives inside the JS via adoptedStyleSheets,
so no <link> tag is needed and React/Remix cannot remove the styles.
"""

import glob
import os
import shutil
import yaml

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
BUILD_DIR = os.path.join(os.path.dirname(SCRIPTS_DIR), "_build", "html")
BASE_URL = os.environ.get("BASE_URL", "").rstrip("/")

with open(os.path.join(SCRIPTS_DIR, "translation-config.yml"), "r", encoding="utf-8") as f:
    CONFIG = yaml.safe_load(f)

SOURCE_LANG = CONFIG["source_lang"]
TARGET_LANG = CONFIG["target_lang"]
DEFAULT_LANG = CONFIG["default_lang"]


def inject():
    # Copy JS file into the build directory
    src = os.path.join(SCRIPTS_DIR, "language-switcher.js")
    dst = os.path.join(BUILD_DIR, "language-switcher.js")
    shutil.copy2(src, dst)
    print(f"Copied language-switcher.js to {BUILD_DIR}")

    # Also copy to <target_lang>/ subdirectory if it exists
    target_dir = os.path.join(BUILD_DIR, TARGET_LANG)
    if os.path.isdir(target_dir):
        shutil.copy2(src, os.path.join(target_dir, "language-switcher.js"))
        print(f"Copied language-switcher.js to {target_dir}")

    # Tags injected into <head> of each HTML file
    meta_tags = (
        f'<meta name="base-url" content="{BASE_URL}"/>'
        f'<meta name="source-lang" content="{SOURCE_LANG}"/>'
        f'<meta name="target-lang" content="{TARGET_LANG}"/>'
        f'<meta name="default-lang" content="{DEFAULT_LANG}"/>'
    )

    html_files = glob.glob(os.path.join(BUILD_DIR, "**", "*.html"), recursive=True)
    count = 0
    for path in html_files:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        if "language-switcher" in content:
            continue
        if "</head>" not in content:
            continue

        # Pages under /<target_lang>/ load the JS from that subdirectory
        rel = os.path.relpath(path, BUILD_DIR)
        is_translated = (
            rel.startswith(TARGET_LANG + os.sep)
            or rel.startswith(TARGET_LANG + "/")
        )

        if is_translated:
            js_tag = f'<script src="{BASE_URL}/{TARGET_LANG}/language-switcher.js" defer></script>'
        else:
            js_tag = f'<script src="{BASE_URL}/language-switcher.js" defer></script>'

        inject_snippet = f"\n{meta_tags}\n{js_tag}\n"
        content = content.replace("</head>", inject_snippet + "</head>")

        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        count += 1

    print(f"Injected language switcher into {count} HTML file(s)")


if __name__ == "__main__":
    inject()
