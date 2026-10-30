# Automatic French Translation for MyST Books

This document explains how the build-time French translation system works and how to reuse it in another MyST book project.

## How it works

The translation runs entirely at build time during the GitHub Actions deployment. No client-side translation APIs are used. The result is two fully independent MyST sites: English at `/` and French at `/fr/`.

### Build pipeline

The deployment workflow (`.github/workflows/deploy.yml`) runs these steps in order:

1. `myst build --html` -- builds the English site to `_build/html/`
2. `python3 scripts/build-french.py` -- translates sources and builds the French site
3. `python3 scripts/inject-language-switcher.py` -- injects the EN/FR flag widget into all pages

### Step-by-step breakdown

#### 1. Source translation (`scripts/translate_sources.py`)

Reads `myst.yml` to discover all source files from the table of contents, then for each file:

- **Markdown files (`.md`)**: Parses YAML frontmatter and translates the `title` and `description` fields. Walks the body line-by-line, translating prose while preserving:
  - Code blocks (fenced with `` ``` `` or `~~~`)
  - Math blocks (`$$...$$`)
  - MyST directives (```{figure}```, `:::{admonition}`, etc.) -- translates caption/body text but not directive names, labels, or options
  - Inline roles (`{cite:p}`, `{ref}`, etc.)
  - Inline math (`$...$`)
  - Inline code (`` `...` ``)
  - Cross-reference links (`[](#label)`)
  - Table structure (translates cell text, preserves separators)
- **Jupyter notebooks (`.ipynb`)**: Translates markdown cells only; code cells and outputs are untouched.
- **Other assets**: Copies the folders in `ASSET_DIRS` (`images/`, `figures/`, `bibliography/`) as-is.

Translation uses the official Cloud Translation API (v2), reached with the standard library. The key comes from the `GOOGLE_TRANSLATE_API_KEY` secret, and is only needed when a string is missing from the cache -- a build the cache already covers makes no network call at all.

Requests use `format=html`: bold, italics and links travel as `<b>`, `<i>` and `<a>` tags and every other shielded span as `<span translate="no">`, because in plain-text mode Google drops placeholders and `**` markers from long, markup-heavy sentences. The cache and overrides keep the markdown-with-placeholders form, so the change is invisible outside `translator_backend.py`.

The earlier backend scraped `translate.google.com/m` through `deep-translator`. Google gated that endpoint in September 2026; it now answers every request with a CAPTCHA and HTTP 429, whatever the caller's volume or address.

Output goes to `_translated/fr/`, mirroring the original directory structure.

#### 2. French site build (`scripts/build-french.py`)

1. Runs `translate-sources.py`
2. Creates a translated `myst.yml` in `_translated/fr/` with:
   - Translated project title, subtitle, logo text, and TOC section titles
   - Same theme, bibliography, and configuration as the original
3. Runs `myst build --html` inside `_translated/fr/` with `BASE_URL` set to include `/fr`
4. Copies the French build output from `_translated/fr/_build/html/` into `_build/html/fr/`

This produces a fully self-contained MyST site under `/fr/` with its own JSON data files, config, and HTML -- meaning React/Remix SPA navigation works correctly within the French version.

#### 3. Language switcher (`scripts/language-switcher.js` + `scripts/inject-language-switcher.py`)

The inject script copies `language-switcher.js` into both the English and French build directories, then injects a `<script>` tag and a `<meta name="base-url">` tag into the `<head>` of every HTML file.

The language switcher JS works around a key constraint: MyST uses Remix (React) with `hydrateRoot(document)`, meaning React owns the entire DOM tree and will remove any injected DOM elements during SPA navigation.

The solution uses zero DOM injection:

- **Visual widget**: Rendered as a `body::after` CSS pseudo-element via `document.adoptedStyleSheets`. Pseudo-elements are CSS constructs, not DOM nodes -- React cannot remove them. The adopted stylesheet is a property on the Document object, also invisible to React.
- **Click handling**: A `document.addEventListener('click', fn, true)` listener in capture phase detects clicks by checking if the mouse coordinates fall within the widget's fixed position (bottom-right corner). Left half = English, right half = French.
- **Navigation**: Clicking a flag does `window.location.href = ...` (full page load), switching between `/` and `/fr/` paths.
- **Preference persistence**: Stores the language choice in `localStorage` under `myst-lang`. On page load, auto-redirects to the preferred language. Defaults to French if no preference is set.

## Cache and overrides

Every string resolves in this order:

1. `translations/fr.overrides.json` -- translations pinned by hand, committed with the book. Use it to correct a mistranslation or to fix a string Google keeps mangling.
2. The machine cache, `fr.cache.json` on the `translation-cache` branch -- every translation already bought, so a rebuild sends Google only the strings that are new or changed. The deploy commits new entries back to that branch.
3. Cloud Translation, using `GOOGLE_TRANSLATE_API_KEY`.

Keys are the English text after shielding, so links and code appear as `XPHX0XPHX`-style placeholders. When a string fails, the build prints the exact key to pin.

## Cost estimate on pull requests

`scripts/estimate_translation.py` (run by `.github/workflows/translation-estimate.yml`) runs the real pipeline with the network stubbed out, counts what the pull request would send, and posts the figure as a comment. Month-to-date usage is read from the history of the `translation-cache` branch. The check fails if the month would go past the 500,000-character free allowance (`FREE_TIER_CHARACTERS`).

## Failure policy

`translate_sources.py` refuses to write a half-translated site if any string
is unresolved, and the deploy workflow deliberately does not soften that:
a French build failure fails the whole deploy, English included. The
alternative -- deploying English while skipping French -- was rejected,
because GitHub Pages deployments fully replace the live site with
the uploaded artifact rather than patching it. There's no way to publish
just the English update without `/fr/` disappearing from the live site
until a later successful run (worse than merely being stale).

To keep failures from going unnoticed, a failure opens (or updates, if
one is already open) a "Deploy is failing" issue with a link to the run, and
a later successful run closes it automatically.

## Customization

- **Default language**: In `language-switcher.js`, the auto-redirect defaults to French. Change `|| 'fr'` to `|| 'en'` to default to English.
- **Flag icons**: The SVG flags are embedded as base64 data URIs in `language-switcher.js`. Replace the `ukUri` and `qcUri` variables with your own flag SVGs.
- **Widget position**: Adjust the `PAD_BOTTOM`, `PAD_RIGHT`, `W`, and `H` constants in `language-switcher.js` (and matching values in the CSS string).
- **Asset folders**: `ASSET_DIRS` in `translate_sources.py` lists the folders copied as-is into the French build (`images`, `figures`, `bibliography`). Add any other folder your pages reference.
- **Translation corrections**: Pin the corrected string in `translations/fr.overrides.json`.
