# MyST Translation Kit

**[Français](#français) · [English](#english)**

Une trousse clé en main qui ajoute la **traduction automatique au moment du build** et un **sélecteur de langue** à n'importe quel livre MyST déployé sur GitHub Pages. Fonctionne dans les deux sens — traduire des sources anglaises vers le français, des sources françaises vers l'anglais, ou toute autre paire prise en charge par Google Translate.

A drop-in kit that adds **build-time machine translation** plus a **flag widget** to any MyST book deployed via GitHub Pages. Works in either direction — translate English sources into French, French sources into English, or any other Google-Translate-supported pair.

---

## Français

### En quoi ça consiste

GitHub Actions traduit chaque fichier source Markdown et carnet Jupyter via Google Translate (à l'aide de `deep-translator`), construit un second site MyST sous `/<target_lang>/`, et injecte dans chaque page HTML un sélecteur de langue résistant à React. Le résultat : deux sites MyST indépendants — votre langue source à `/` et la langue traduite à `/<target_lang>/` — avec un seul widget flottant pour passer de l'un à l'autre.

Pour les détails d'architecture (pourquoi `adoptedStyleSheets`, comment les directives sont préservées, comment le DOM Remix/React est contourné), voir `scripts/TRANSLATION.md` dans le dépôt d'origine d'où cette trousse est extraite. Ce README est le guide de portage.

**Exemple en pratique :** [polymtl-reproducible-research/myst_book](https://github.com/polymtl-reproducible-research/myst_book) implémente cette trousse — un livre MyST anglais avec une version française générée au build, déployé sur GitHub Pages.

### Prérequis

Le projet MyST cible doit :

- Utiliser MyST avec un `myst.yml` contenant un `project.toc`.
- Se déployer via GitHub Actions vers GitHub Pages.
- Tourner sur `ubuntu-latest` (Python 3 est disponible par défaut ; aucune configuration supplémentaire requise).

Aucune clé API, aucun secret, aucun service payant requis.

### Contenu de la trousse

```
myst-translation-kit/
├── README.md                          # ce fichier
├── scripts/
│   ├── translation-config.yml         # ← MODIFIER pour définir la paire de langues
│   ├── translate-sources.py           # Parcourt le TOC de myst.yml, traduit .md + .ipynb
│   ├── build-translation.py           # Orchestre le build traduit vers _build/html/<target_lang>/
│   ├── inject-language-switcher.py    # Injecte les balises <meta> + <script> dans chaque page HTML
│   └── language-switcher.js           # Le widget lui-même (lit les balises meta à l'exécution)
└── .github/
    └── workflows/
        └── deploy.yml                 # Workflow de déploiement Pages prêt à l'emploi
```

### Étapes d'installation

#### 1. Copier les scripts dans le dépôt cible

Depuis la racine du projet cible :

```bash
mkdir -p scripts
cp /chemin/vers/myst-translation-kit/scripts/* scripts/
```

Conservez les noms de fichiers tels quels — les scripts et le workflow s'y réfèrent par leur nom.

#### 2. Définir la paire de langues

Modifiez `scripts/translation-config.yml` dans le projet cible. Les champs sont :

```yaml
source_lang: en      # Langue de vos fichiers sources existants. Le site est à /
target_lang: fr      # Langue VERS laquelle traduire. Le site traduit est à /<target_lang>/
default_lang: fr     # Langue par défaut du widget à la première visite
source_label: EN     # Étiquette courte (cosmétique)
target_label: FR     # Étiquette courte (cosmétique)
```

**Pour un livre anglais qui doit aussi exister en français :** conservez les valeurs par défaut ci-dessus.

**Pour un livre français qui doit aussi exister en anglais :**

```yaml
source_lang: fr
target_lang: en
default_lang: fr     # la plupart des visiteurs arrivant pour la première fois obtiennent le français
source_label: FR
target_label: EN
```

Les codes de langue suivent la convention [ISO 639-1](https://fr.wikipedia.org/wiki/Liste_des_codes_ISO_639-1) utilisée par Google Translate (`en`, `fr`, `es`, `de`, `pt`, `it`, `ja`, ...).

Vous voudrez probablement aussi inverser les drapeaux SVG dans `scripts/language-switcher.js` — voir [Personnalisation](#personnalisation) ci-dessous.

#### 3. Brancher le workflow GitHub Actions

**Option A — nouveau projet (aucun workflow existant).** Copiez le workflow fourni tel quel :

```bash
mkdir -p .github/workflows
cp /chemin/vers/myst-translation-kit/.github/workflows/deploy.yml .github/workflows/deploy.yml
```

**Option B — workflow existant.** Ajoutez ces blocs à votre `.github/workflows/deploy.yml` existant :

```yaml
# 1. Définir BASE_URL au niveau supérieur (nécessaire pour que les liens
#    /<target_lang>/ se résolvent sous username.github.io/reponame/)
env:
  BASE_URL: /${{ github.event.repository.name }}

# 2. Après les étapes checkout/setup, installer les dépendances Python :
- name: Install Python dependencies
  run: pip install deep-translator pyyaml

# 3. Après « myst build --html », lancer les étapes de traduction + injection :
- name: Translate and build secondary-language site
  run: python3 scripts/build-translation.py

- name: Inject Language Switcher
  run: python3 scripts/inject-language-switcher.py
```

L'ordre est important : `myst build --html` → `build-translation.py` → `inject-language-switcher.py` → upload de l'artefact.

#### 4. Ignorer le dossier de traduction généré

Ajoutez au `.gitignore` du projet cible :

```
_translated/
```

`_translated/<target_lang>/` est la zone de préparation du build traduit ; elle est régénérée à chaque exécution et ne doit jamais être committée.

#### 5. Commit, push, terminé

Au push, GitHub Actions va :

1. Construire le site en langue source → `_build/html/`
2. Traduire toutes les sources → `_translated/<target_lang>/`
3. Construire le site traduit → `_build/html/<target_lang>/`
4. Injecter le widget de langue dans chaque page HTML
5. Déployer `_build/html/` sur Pages

Le site sera à `https://<owner>.github.io/<repo>/`, la version traduite à `https://<owner>.github.io/<repo>/<target_lang>/`.

### Vérifier localement

Avant de pousser, confirmez que tout fonctionne sur votre machine :

```bash
pip install deep-translator pyyaml
myst build --html
python3 scripts/build-translation.py
python3 scripts/inject-language-switcher.py
```

Ouvrez ensuite `_build/html/index.html` et `_build/html/<target_lang>/index.html` — les deux doivent afficher le widget de langue en bas à droite.

Note : en local, `BASE_URL` est vide, donc les liens se résolvent depuis `/`. En CI, il est défini automatiquement à `/<reponame>`.

### Personnalisation

| Quoi | Où | Comment |
|------|-----|---------|
| Paire de langues | `scripts/translation-config.yml` | Modifier `source_lang` / `target_lang` (codes ISO 639-1) |
| Langue d'arrivée par défaut | `scripts/translation-config.yml` | Mettre `default_lang` à `source_lang` ou `target_lang` |
| Images de drapeaux | `scripts/language-switcher.js` | Remplacer `sourceFlagUri` / `targetFlagUri` (data URIs base64). Drapeau gauche = source, droit = cible |
| Position / taille du widget | `scripts/language-switcher.js` | Constantes `W`, `H`, `PAD_BOTTOM`, `PAD_RIGHT` |
| Corrections de termes spécifiques | `scripts/translate-sources.py` | Ajouter un `.replace(...)` post-traduction dans `translate_text()` |

#### Générer de nouveaux data URIs de drapeaux

Les drapeaux sont des SVG base64 en ligne : ils vivent dans le JS et se chargent sans aucune requête réseau. Pour en remplacer un :

```bash
# À partir de n'importe quel fichier SVG :
base64 -i mon-drapeau.svg | pbcopy   # macOS
# Puis dans language-switcher.js :
#   var sourceFlagUri = 'data:image/svg+xml;base64,<coller>';
```

### Dépannage

- **Les liens `/<target_lang>/` mènent à `username.github.io/<target_lang>/` au lieu de `username.github.io/reponame/<target_lang>/`** — `BASE_URL` n'est pas défini dans le `env:` de premier niveau du workflow. Le `deploy.yml` fourni le définit à partir de `github.event.repository.name` ; vérifiez qu'il y est.
- **Limitation de débit de Google Translate sur les gros livres** — `translate-sources.py` attend 300 ms entre chaque appel. Pour de très gros projets, augmentez les valeurs `time.sleep(0.3)`.
- **Le widget redirige vers la mauvaise langue au premier chargement** — c'est la redirection automatique vers `default_lang`. Modifiez `scripts/translation-config.yml` et relancez le build.
- **Les drapeaux ne correspondent pas à votre sens de traduction** — rappelez-vous que le drapeau de GAUCHE est la langue source (`/`) et celui de DROITE la cible (`/<target_lang>/`). Si vous avez inversé `source_lang` et `target_lang`, inversez aussi `sourceFlagUri` et `targetFlagUri` dans `language-switcher.js`.
- **Erreurs d'analyse de `myst.yml` pendant le build traduit** — généralement `abbreviations:` sans entrées. `translate-sources.py` supprime déjà les abréviations vides ; si vous avez ajouté d'autres clés de premier niveau nulles/vides, retirez-les dans `create_translated_myst_yml()`.

---

## English

### What this is

GitHub Actions translates every Markdown and Jupyter Notebook source file through Google Translate (via `deep-translator`), builds a second MyST site under `/<target_lang>/`, and injects a React-proof flag widget into every HTML page. The result is two independent MyST sites — your source language at `/` and the translated language at `/<target_lang>/` — with a single floating widget for switching between them.

For the architectural deep-dive (why `adoptedStyleSheets`, how directives are preserved, how the Remix/React DOM is worked around), see `scripts/TRANSLATION.md` in the upstream repo this kit was extracted from. This README is the porting guide.

**Live example:** [polymtl-reproducible-research/myst_book](https://github.com/polymtl-reproducible-research/myst_book) implements this kit — an English MyST book with a build-time-generated French version, deployed on GitHub Pages.

### Prerequisites

The target MyST project must:

- Use MyST with a `myst.yml` containing a `project.toc`.
- Deploy via GitHub Actions to GitHub Pages.
- Run on `ubuntu-latest` (Python 3 is available by default; no extra setup needed).

No API keys, secrets, or paid services required.

### What's in this kit

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

### Install steps

#### 1. Copy the scripts into the target repo

From the target project's root:

```bash
mkdir -p scripts
cp /path/to/myst-translation-kit/scripts/* scripts/
```

Keep the filenames as-is — the scripts and the workflow reference them by name.

#### 2. Set the language pair

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

#### 3. Wire up the GitHub Actions workflow

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

#### 4. Gitignore the generated translation directory

Add to the target project's `.gitignore`:

```
_translated/
```

`_translated/<target_lang>/` is the staging area for the translated build; it's regenerated every run and should never be committed.

#### 5. Commit, push, done

On push, GitHub Actions will:

1. Build the source-language site → `_build/html/`
2. Translate all sources → `_translated/<target_lang>/`
3. Build the translated site → `_build/html/<target_lang>/`
4. Inject the flag widget into every HTML page
5. Deploy `_build/html/` to Pages

The site will be at `https://<owner>.github.io/<repo>/` with the translated version at `https://<owner>.github.io/<repo>/<target_lang>/`.

### Verifying locally

Before pushing, confirm everything works on your machine:

```bash
pip install deep-translator pyyaml
myst build --html
python3 scripts/build-translation.py
python3 scripts/inject-language-switcher.py
```

Then open `_build/html/index.html` and `_build/html/<target_lang>/index.html` — both should render with the flag widget in the bottom-right corner.

Note: locally, `BASE_URL` is empty, so links resolve from `/`. In CI it's set to `/<reponame>` automatically.

### Customization

| What | Where | How |
|------|-------|-----|
| Language pair | `scripts/translation-config.yml` | Edit `source_lang` / `target_lang` (ISO 639-1 codes) |
| Default landing language | `scripts/translation-config.yml` | Set `default_lang` to `source_lang` or `target_lang` |
| Flag images | `scripts/language-switcher.js` | Replace `sourceFlagUri` / `targetFlagUri` (base64 data URIs). Left flag = source, right flag = target |
| Widget position / size | `scripts/language-switcher.js` | `W`, `H`, `PAD_BOTTOM`, `PAD_RIGHT` constants |
| Domain-specific term corrections | `scripts/translate-sources.py` | Add post-translation `.replace(...)` in `translate_text()` |

#### Generating new flag data URIs

The flags are inline base64 SVGs so they live in the JS and load with zero network requests. To replace one:

```bash
# From any SVG file:
base64 -i my-flag.svg | pbcopy   # macOS
# Then in language-switcher.js:
#   var sourceFlagUri = 'data:image/svg+xml;base64,<paste>';
```

### Troubleshooting

- **`/<target_lang>/` links go to `username.github.io/<target_lang>/` instead of `username.github.io/reponame/<target_lang>/`** — `BASE_URL` is not set in the workflow's top-level `env:`. The bundled `deploy.yml` sets it from `github.event.repository.name`; double-check it's there.
- **Google Translate throttling on large books** — `translate-sources.py` sleeps 300 ms between calls. For very large projects, raise the `time.sleep(0.3)` values.
- **Widget redirects to the wrong language on first load** — that's the auto-redirect to `default_lang`. Edit `scripts/translation-config.yml` and re-run the build.
- **Flags look wrong for your direction** — remember that the LEFT flag in the widget is the source language (`/`) and the RIGHT flag is the target (`/<target_lang>/`). If you swapped `source_lang` and `target_lang`, also swap `sourceFlagUri` and `targetFlagUri` in `language-switcher.js`.
- **`myst.yml` parse errors during translated build** — usually `abbreviations:` with no entries. `translate-sources.py` already drops empty abbreviations; if you've added other null/empty top-level keys, strip them in `create_translated_myst_yml()`.
