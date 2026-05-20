# MyST Translation Kit

A drop-in kit that adds **build-time machine translation** plus a **flag widget** to any MyST book deployed via GitHub Pages. Works in either direction — translate English sources into French, French sources into English, or any other Google-Translate-supported pair.

## What this is

GitHub Actions translates every Markdown and Jupyter Notebook source file through Google Translate (via `deep-translator`), builds a second MyST site under `/<target_lang>/`, and injects a React-proof flag widget into every HTML page. The result is two independent MyST sites — your source language at `/` and the translated language at `/<target_lang>/` — with a single floating widget for switching between them.

For the architectural deep-dive (why `adoptedStyleSheets`, how directives are preserved, how the Remix/React DOM is worked around), see `scripts/TRANSLATION.md` in the upstream repo this kit was extracted from. This README is the porting guide.

## Prerequisites

The target MyST project must:

- Use MyST with a `myst.yml` containing a `project.toc`.
- Deploy via GitHub Actions to GitHub Pages.
- Run on `ubuntu-latest` (Python 3 is available by default; no extra setup needed).

No API keys, secrets, or paid services required.

## What's in this kit

```
myst-translation-kit/
├── README.md                          # this file
├── scripts/
│   ├── translation-config.yml         # ← EDIT THIS to set the language pair
│   ├── translate-sources.py           # Walks myst.yml TOC, translates .md + .ipynb
│   ├── build-translation.py           # Orchestrates the translated build into _build/html/<target_lang>/
│   ├── inject-language-switcher.py    # Injects <meta> + <script> tags into every built HTML file
│   └── language-switcher.js           # The widget itself (reads meta tags at runtime)
└── .github/
    └── workflows/
        └── deploy.yml                 # Ready-to-use Pages deploy workflow
```

## Install steps

### 1. Copy the scripts into the target repo

From the target project's root:

```bash
mkdir -p scripts
cp /path/to/myst-translation-kit/scripts/* scripts/
```

Keep the filenames as-is — the scripts and the workflow reference them by name.

### 2. Set the language pair

Edit `scripts/translation-config.yml` in the target project. The four fields are:

```yaml
source_lang: en      # Language of your existing source files. Site lives at /
target_lang: fr      # Language to translate INTO. Translated site lives at /<target_lang>/
default_lang: fr     # Which side the widget defaults to on first visit
source_label: EN     # Cosmetic short label
target_label: FR     # Cosmetic short label
```

**For an English book that should also be in French:** keep the defaults above.

**For a French book that should also be in English:**

```yaml
source_lang: fr
target_lang: en
default_lang: fr     # most visitors arriving for the first time get French
source_label: FR
target_label: EN
```

Source codes follow the [ISO 639-1](https://en.wikipedia.org/wiki/List_of_ISO_639_language_codes) convention used by Google Translate (`en`, `fr`, `es`, `de`, `pt`, `it`, `ja`, ...).

You probably also want to flip the flag SVGs in `scripts/language-switcher.js` — see [Customization](#customization) below.

### 3. Wire up the GitHub Actions workflow

**Option A — fresh project (no existing workflow).** Copy the bundled workflow wholesale:

```bash
mkdir -p .github/workflows
cp /path/to/myst-translation-kit/.github/workflows/deploy.yml .github/workflows/deploy.yml
```

**Option B — existing workflow.** Add these blocks to your existing `.github/workflows/deploy.yml`:

```yaml
# 1. Set BASE_URL at the top level (needed so /<target_lang>/ links resolve under
#    username.github.io/reponame/)
env:
  BASE_URL: /${{ github.event.repository.name }}

# 2. After the checkout/setup steps, install Python deps:
- name: Install Python dependencies
  run: pip install deep-translator pyyaml

# 3. After "myst build --html", run the translation + injection steps:
- name: Translate and build secondary-language site
  run: python3 scripts/build-translation.py

- name: Inject Language Switcher
  run: python3 scripts/inject-language-switcher.py
```

Order matters: `myst build --html` → `build-translation.py` → `inject-language-switcher.py` → upload artifact.

### 4. Gitignore the generated translation directory

Add to the target project's `.gitignore`:

```
_translated/
```

`_translated/<target_lang>/` is the staging area for the translated build; it's regenerated every run and should never be committed.

### 5. Commit, push, done

On push, GitHub Actions will:

1. Build the source-language site → `_build/html/`
2. Translate all sources → `_translated/<target_lang>/`
3. Build the translated site → `_build/html/<target_lang>/`
4. Inject the flag widget into every HTML page
5. Deploy `_build/html/` to Pages

The site will be at `https://<owner>.github.io/<repo>/` with the translated version at `https://<owner>.github.io/<repo>/<target_lang>/`.

## Verifying locally

Before pushing, confirm everything works on your machine:

```bash
pip install deep-translator pyyaml
myst build --html
python3 scripts/build-translation.py
python3 scripts/inject-language-switcher.py
```

Then open `_build/html/index.html` and `_build/html/<target_lang>/index.html` — both should render with the flag widget in the bottom-right corner.

Note: locally, `BASE_URL` is empty, so links resolve from `/`. In CI it's set to `/<reponame>` automatically.

## Customization

| What | Where | How |
|------|-------|-----|
| Language pair | `scripts/translation-config.yml` | Edit `source_lang` / `target_lang` (ISO 639-1 codes) |
| Default landing language | `scripts/translation-config.yml` | Set `default_lang` to `source_lang` or `target_lang` |
| Flag images | `scripts/language-switcher.js` | Replace `sourceFlagUri` / `targetFlagUri` (base64 data URIs). Left flag = source, right flag = target |
| Widget position / size | `scripts/language-switcher.js` | `W`, `H`, `PAD_BOTTOM`, `PAD_RIGHT` constants |
| Domain-specific term corrections | `scripts/translate-sources.py` | Add post-translation `.replace(...)` in `translate_text()` |

### Generating new flag data URIs

The flags are inline base64 SVGs so they live in the JS and load with zero network requests. To replace one:

```bash
# From any SVG file:
base64 -i my-flag.svg | pbcopy   # macOS
# Then in language-switcher.js:
#   var sourceFlagUri = 'data:image/svg+xml;base64,<paste>';
```

## Troubleshooting

- **`/<target_lang>/` links go to `username.github.io/<target_lang>/` instead of `username.github.io/reponame/<target_lang>/`** — `BASE_URL` is not set in the workflow's top-level `env:`. The bundled `deploy.yml` sets it from `github.event.repository.name`; double-check it's there.
- **Google Translate throttling on large books** — `translate-sources.py` sleeps 300 ms between calls. For very large projects, raise the `time.sleep(0.3)` values.
- **Widget redirects to the wrong language on first load** — that's the auto-redirect to `default_lang`. Edit `scripts/translation-config.yml` and re-run the build.
- **Flags look wrong for your direction** — remember that the LEFT flag in the widget is the source language (`/`) and the RIGHT flag is the target (`/<target_lang>/`). If you swapped `source_lang` and `target_lang`, also swap `sourceFlagUri` and `targetFlagUri` in `language-switcher.js`.
- **`myst.yml` parse errors during translated build** — usually `abbreviations:` with no entries. `translate-sources.py` already drops empty abbreviations; if you've added other null/empty top-level keys, strip them in `create_translated_myst_yml()`.
