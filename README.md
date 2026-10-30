# MyST Translation Kit

**[Français](#français) · [English](#english)**

Une trousse qui ajoute une **version française générée au build** et un **sélecteur de langue EN/FR** à un livre MyST écrit en anglais et déployé sur GitHub Pages.

A kit that adds a **build-time French version** and an **EN/FR language switcher** to an English MyST book deployed on GitHub Pages.

**Exemple en pratique / Live example:** [polymtl-reproducible-research/myst_book](https://github.com/polymtl-reproducible-research/myst_book) → <https://reproducible-research.polymtl.ca/>

---

## Français

### En quoi ça consiste

À chaque déploiement, GitHub Actions construit votre livre anglais à `/`, traduit chaque page en français avec l'API **Google Cloud Translation**, construit un second site MyST à `/fr/`, puis injecte dans chaque page un petit widget de drapeaux pour passer d'une langue à l'autre.

Autour de la traduction elle-même :

- **Un cache de traductions** (branche `translation-cache`) : chaque phrase n'est payée qu'une fois. Un build dont le cache couvre déjà tout n'appelle pas Google du tout.
- **Des traductions épinglées** (`translations/fr.overrides.json`) : pour corriger à la main une phrase mal traduite.
- **Une estimation du coût sur chaque pull request** : un commentaire indique combien de caractères seront envoyés à Google, et la vérification échoue si le mois dépasserait le quota gratuit.
- **Une revue obligatoire** (`CODEOWNERS`) pour tout changement qui pourrait lire la clé d'API.
- **Une issue ouverte automatiquement** quand le déploiement échoue, et fermée au prochain succès.

Pour l'architecture en détail, voir [`template/scripts/TRANSLATION.md`](template/scripts/TRANSLATION.md).

> **Anglais → français seulement, pour l'instant.** Le sens inverse (et d'autres paires de langues) est suivi dans [#2](https://github.com/polymtl-reproducible-research/myst-translation-kit/issues/2).

### Ce qu'il vous faut

- Un livre MyST en anglais dans un dépôt GitHub, avec un `myst.yml` qui contient un `project.toc`.
- Les droits d'administration sur ce dépôt.
- Un compte Google Cloud **avec la facturation activée** (une carte de crédit est demandée). Les 500 000 premiers caractères par mois sont gratuits, ce qui couvre largement un livre de cours ; au-delà, c'est 20 $ US par million de caractères. Grâce au cache, seul le texte nouveau ou modifié est envoyé à Google.

### Contenu de la trousse

Tout ce qui se trouve dans `template/` se copie tel quel à la racine de votre livre :

```
template/
├── scripts/
│   ├── build-french.py                # Orchestre le build français vers _build/html/fr/
│   ├── translate_sources.py           # Parcourt le TOC de myst.yml et traduit .md et .ipynb
│   ├── md_segmenter.py                # Découpe le Markdown : prose à traduire, code et directives à garder
│   ├── shielding.py                   # Protège liens, code, rôles et maths pendant la traduction
│   ├── resolver.py                    # Épinglées → cache → Google, et refuse de publier à moitié traduit
│   ├── translator_backend.py          # Le seul module qui parle à l'API Cloud Translation
│   ├── estimate_translation.py        # Estimation du coût pour les pull requests
│   ├── inject-language-switcher.py    # Injecte le widget dans chaque page HTML
│   ├── language-switcher.js           # Le widget lui-même
│   └── TRANSLATION.md                 # Explication de l'architecture
├── tests/                             # Tests pytest des scripts
├── translations/
│   └── fr.overrides.json              # Vos traductions épinglées (vide au départ)
└── .github/
    ├── CODEOWNERS                     # ← À MODIFIER : qui doit réviser les changements sensibles
    └── workflows/
        ├── deploy.yml                 # Build EN + FR et déploiement sur GitHub Pages
        ├── tests.yml                  # pytest à chaque push
        └── translation-estimate.yml   # Commentaire d'estimation sur les pull requests
```

### Installation

Faites les étapes dans l'ordre : le premier push sur `main` déclenche un déploiement, qui échouera si la clé ou la branche de cache n'existent pas encore.

#### 1. Obtenir une clé d'API Google Cloud Translation

**Première fois sur Google Cloud ?** Quelques étapes uniques :

- Connectez-vous avec un compte Google. Un compte institutionnel peut avoir Google Cloud désactivé ou restreint par son administrateur ; un compte Gmail personnel est le plus simple.
- À la première visite de la console, acceptez les conditions d'utilisation et choisissez votre pays.
- La première fois que vous configurez la facturation, Google propose généralement un essai gratuit (un crédit à utiliser dans un délai limité). Une carte de crédit est demandée pour vérifier votre identité ; rien n'est facturé pendant l'essai.
- **Important :** à la fin de l'essai, Google suspend les services payants tant que vous n'avez pas activé un compte complet, et le déploiement se met à échouer avec une erreur de facturation. Activez le compte complet (bouton *Activer* ou *Passer à un compte complet* dans *Facturation*) dès que le livre est en ligne. Les 500 000 caractères gratuits par mois s'appliquent toujours ensuite.

1. **Créer un projet** : ouvrez <https://console.cloud.google.com/projectcreate>, nommez-le (p. ex. `mon-livre-traduction`) et cliquez sur *Créer*. Si la console vous ouvre plutôt un projet existant, c'est normal : le menu des projets est le nom de projet en haut à gauche, à côté du logo Google Cloud. Utilisez un projet dédié.

   **Créer le projet ne vous y amène pas** : la console reste sur le projet précédent. Une fois le projet créé, cliquez sur *Sélectionner le projet* dans la notification, ou choisissez-le dans le menu des projets. Pendant toutes les étapes suivantes, vérifiez que l'URL contient `?project=<id-de-votre-nouveau-projet>` : sinon, la facturation, l'API et la clé atterriront dans le mauvais projet.
2. **Facturation** : dans le menu *Facturation*, associez un compte de facturation au projet. L'API refuse toute requête sans facturation, même à l'intérieur du quota gratuit.
3. **Activer l'API** : *API et services → Bibliothèque*, cherchez « Cloud Translation API », puis *Activer*.
4. **Créer la clé** : *API et services → Identifiants → Créer des identifiants → Clé API*. Un formulaire s'ouvre :
   - **Nom** : quelque chose de reconnaissable, p. ex. `mon-livre-traduction`.
   - **Restrictions d'API** : sélectionnez seulement « Cloud Translation API ». Une clé qui fuit ne pourra alors servir qu'à traduire. (Si elle n'apparaît pas dans la liste, l'API n'est pas activée dans ce projet : refaites l'étape 3.)
   - **Restrictions d'application** : laissez *Aucune*. La clé est utilisée par les serveurs de GitHub Actions, dont les adresses IP changent à chaque exécution, et une restriction par site web ne s'applique qu'aux requêtes faites depuis un navigateur.

   Cliquez sur *Créer*, puis copiez la clé affichée.
5. **Alerte budgétaire** (recommandé) : *Facturation → Budgets et alertes*, créez un petit budget (p. ex. 5 $) avec alertes par courriel. Une alerte n'arrête pas les dépenses : elle vous prévient. Pour un plafond strict, réduisez le quota de caractères par jour de l'API dans *API et services → Cloud Translation API → Quotas*.

Vérifiez que la clé fonctionne :

```bash
curl -s "https://translation.googleapis.com/language/translate/v2" \
  -d key="VOTRE_CLÉ" -d q="Hello world" -d source=en -d target=fr
```

La réponse doit contenir `"translatedText": "Bonjour le monde"`. Ne commitez jamais la clé : elle ira uniquement dans les secrets GitHub (étape 5).

#### 2. Copier la trousse dans votre livre

```bash
git clone https://github.com/polymtl-reproducible-research/myst-translation-kit.git
cd mon-livre
cp -R ../myst-translation-kit/template/. .
```

Attention : cela remplace `.github/workflows/deploy.yml`, `.github/workflows/tests.yml` et `.github/CODEOWNERS` s'ils existent déjà. Si vous aviez votre propre workflow de déploiement, fusionnez-le avec celui de la trousse plutôt que de l'écraser.

Ajoutez à votre `.gitignore` :

```
_build/
_translated/
.tcache/
__pycache__/
```

#### 3. Adapter deux fichiers

- **`.github/CODEOWNERS`** : remplacez `@your-github-username` par les personnes qui doivent réviser tout changement à `scripts/` ou `.github/` (le code qui peut lire la clé).
- **`.github/workflows/deploy.yml`** : `BASE_URL` vaut `/<nom-du-dépôt>`, ce qui convient à `https://<propriétaire>.github.io/<dépôt>/`. Si vous utilisez un **domaine personnalisé**, mettez `BASE_URL: ""`.

#### 4. Créer la branche du cache

Le déploiement lit et met à jour `fr.cache.json` sur une branche séparée, `translation-cache`. Créez-la vide :

```bash
git switch --orphan translation-cache
echo '{}' > fr.cache.json
git add fr.cache.json
git commit -m "Start the French translation cache"
git push origin translation-cache
git switch main
```

#### 5. Configurer le dépôt GitHub

Dans *Settings* du dépôt :

1. **Pages** : *Pages → Build and deployment → Source* : choisissez **GitHub Actions**.
2. **La clé** : *Environments → New environment*, nommé exactement **`translation`**.
   - Sous *Deployment branches and tags*, choisissez *Selected branches and tags* et ajoutez `main`. Ainsi, seul du code déjà fusionné peut lire la clé.
   - Sous *Environment secrets*, ajoutez **`GOOGLE_TRANSLATE_API_KEY`** avec la clé de l'étape 1.
3. **Protéger `main`** : *Rules → Rulesets → New branch ruleset*, ciblez la branche par défaut, et activez :
   - *Require a pull request before merging*, avec *Require review from Code Owners* (sans cela, `CODEOWNERS` n'empêche rien) ;
   - *Require status checks to pass*, avec la vérification **`Translation budget`** (elle apparaît après la première pull request) ;
   - *Block force pushes*.

#### 6. Commit et push

```bash
git add -A
git commit -m "Add the French translation kit"
git push origin main
```

Le premier déploiement traduit tout le livre (ce qui compte dans le quota gratuit), enregistre les traductions sur `translation-cache`, et publie le site à `https://<propriétaire>.github.io/<dépôt>/` et la version française à `.../<dépôt>/fr/`. Les déploiements suivants ne traduisent que le texte nouveau ou modifié.

### Au quotidien

- **Écrire** : ouvrez une pull request comme d'habitude. Un commentaire *Translation estimate* indique ce qui sera envoyé à Google et ce que le mois a déjà utilisé.
- **Corriger une traduction** : ajoutez une entrée dans `translations/fr.overrides.json`. La clé est le texte anglais tel que le pipeline le voit : les liens et le code y sont remplacés par des marqueurs `XPHX0XPHX`, `XPHX1XPHX`… Copiez la clé exacte depuis le cache (`fr.cache.json` sur `translation-cache`) ou depuis le message d'erreur du build :

  ```json
  {
    "Install [Git]XPHX0XPHX on your system.": "Installez [Git]XPHX0XPHX sur votre système."
  }
  ```

- **Quand le déploiement échoue** : une issue « Deploy is failing » s'ouvre avec le lien vers l'exécution. Les causes habituelles : une phrase que Google abîme systématiquement (épinglez-la), ou un problème de clé (voir *Dépannage*). Rien n'est publié tant que les deux langues ne se construisent pas, pour ne jamais faire disparaître `/fr/` du site en ligne.

### Construire localement

```bash
pip install pyyaml pytest
mkdir -p .tcache
git fetch origin translation-cache
git show origin/translation-cache:fr.cache.json > .tcache/fr.cache.json

myst build --html
python3 scripts/build-french.py --cache .tcache/fr.cache.json
python3 scripts/inject-language-switcher.py
python3 -m pytest tests/
```

Si le cache couvre déjà toutes les phrases, aucune clé n'est nécessaire. Sinon, faites `export GOOGLE_TRANSLATE_API_KEY=...` avant le build français, en sachant que ces caractères comptent dans votre quota. Ouvrez ensuite `_build/html/index.html` et `_build/html/fr/index.html`.

### Personnalisation

| Quoi | Où |
|------|-----|
| Langue par défaut à la première visite | `scripts/language-switcher.js` : remplacer `\|\| 'fr'` par `\|\| 'en'` |
| Images des drapeaux | `scripts/language-switcher.js` : `ukUri` / `qcUri` (SVG en base64) |
| Position et taille du widget | `scripts/language-switcher.js` : `W`, `H`, `PAD_BOTTOM`, `PAD_RIGHT` |
| Dossiers copiés tels quels dans le build français | `scripts/translate_sources.py` : `ASSET_DIRS` (par défaut `images`, `figures`, `bibliography`) |
| Quota mensuel utilisé par l'estimation | `scripts/estimate_translation.py` : `FREE_TIER_CHARACTERS` |

### Dépannage

- **`GOOGLE_TRANSLATE_API_KEY is not set`** : le secret manque, ou l'environnement ne s'appelle pas exactement `translation`.
- **`Branch "…" is not allowed to deploy to translation`** : seul `main` peut lire la clé (étape 5). C'est voulu ; fusionnez d'abord la branche.
- **Erreur 403 mentionnant la facturation ou une API désactivée** : la facturation n'est pas associée au projet, l'API Cloud Translation n'est pas activée (étape 1), ou l'essai gratuit est terminé sans que le compte complet ait été activé.
- **`couldn't find remote ref translation-cache`** : la branche du cache n'existe pas (étape 4).
- **Les liens mènent à `<propriétaire>.github.io/fr/` au lieu de `<propriétaire>.github.io/<dépôt>/fr/`** : `BASE_URL` est mal défini dans `deploy.yml` (étape 3).
- **Le push du cache échoue** : le workflow a besoin de `contents: write` et `issues: write`. Si votre organisation limite les permissions des workflows, autorisez-les dans *Settings → Actions → General → Workflow permissions*.
- **Les titres et le contenu des tableaux `:::{table}` restent en anglais** : limite connue ([#1](https://github.com/polymtl-reproducible-research/myst-translation-kit/issues/1)).

### Mettre à jour la trousse dans un livre existant

Recopiez seulement le code, pas vos fichiers à vous :

```bash
cp -R ../myst-translation-kit/template/scripts/. scripts/
cp -R ../myst-translation-kit/template/tests/. tests/
cp ../myst-translation-kit/template/.github/workflows/*.yml .github/workflows/
```

Ne recopiez pas `translations/fr.overrides.json` (vos traductions épinglées) ni `.github/CODEOWNERS`, et revérifiez `BASE_URL` dans `deploy.yml`.

---

## English

### What this is

On every deploy, GitHub Actions builds your English book at `/`, translates every page into French with the **Google Cloud Translation** API, builds a second MyST site at `/fr/`, and injects a small flag widget into every page for switching between the two.

Around the translation itself:

- **A translation cache** (the `translation-cache` branch): every sentence is paid for once. A build the cache already covers makes no call to Google at all.
- **Pinned translations** (`translations/fr.overrides.json`): for correcting a bad translation by hand.
- **A cost estimate on every pull request**: a comment says how many characters will be sent to Google, and the check fails if the month would go past the free allowance.
- **Required review** (`CODEOWNERS`) for any change that could read the API key.
- **An issue opened automatically** when the deploy fails, and closed on the next success.

For the architecture in detail, see [`template/scripts/TRANSLATION.md`](template/scripts/TRANSLATION.md).

> **English → French only, for now.** The reverse direction (and other language pairs) is tracked in [#2](https://github.com/polymtl-reproducible-research/myst-translation-kit/issues/2).

### What you need

- An English MyST book in a GitHub repository, with a `myst.yml` containing a `project.toc`.
- Admin rights on that repository.
- A Google Cloud account **with billing enabled** (a credit card is required). The first 500,000 characters each month are free, which comfortably covers a course book; beyond that it's US$20 per million characters. Thanks to the cache, only new or changed text is ever sent to Google.

### What's in the kit

Everything under `template/` is copied as-is into the root of your book:

```
template/
├── scripts/
│   ├── build-french.py                # Orchestrates the French build into _build/html/fr/
│   ├── translate_sources.py           # Walks the myst.yml TOC and translates .md and .ipynb
│   ├── md_segmenter.py                # Splits Markdown: prose to translate, code and directives to keep
│   ├── shielding.py                   # Protects links, code, roles and math during translation
│   ├── resolver.py                    # Pinned → cache → Google, and refuses to publish half-translated
│   ├── translator_backend.py          # The only module that talks to the Cloud Translation API
│   ├── estimate_translation.py        # Cost estimate for pull requests
│   ├── inject-language-switcher.py    # Injects the widget into every HTML page
│   ├── language-switcher.js           # The widget itself
│   └── TRANSLATION.md                 # Architecture explanation
├── tests/                             # pytest tests for the scripts
├── translations/
│   └── fr.overrides.json              # Your pinned translations (empty to start)
└── .github/
    ├── CODEOWNERS                     # ← EDIT THIS: who must review sensitive changes
    └── workflows/
        ├── deploy.yml                 # EN + FR build and GitHub Pages deploy
        ├── tests.yml                  # pytest on every push
        └── translation-estimate.yml   # Estimate comment on pull requests
```

### Setup

Do these steps in order: the first push to `main` triggers a deploy, which will fail if the key or the cache branch don't exist yet.

#### 1. Get a Google Cloud Translation API key

**First time on Google Cloud?** A few one-off steps:

- Sign in with a Google account. An institutional account may have Google Cloud disabled or restricted by its administrator; a personal Gmail account is the simplest.
- On your first visit to the console, accept the terms of service and choose your country.
- The first time you set up billing, Google usually offers a free trial (credit to use within a limited time). A credit card is required to verify your identity; nothing is charged during the trial.
- **Important:** when the trial ends, Google pauses paid services until you activate a full account, and the deploy starts failing with a billing error. Activate the full account (the *Activate* or *Upgrade to full account* button in *Billing*) once the book is live. The 500,000 free characters per month still apply afterwards.

1. **Create a project**: open <https://console.cloud.google.com/projectcreate>, name it (e.g. `my-book-translation`) and click *Create*. If the console drops you into an existing project instead, that's normal: the project picker is the project name at the top left, next to the Google Cloud logo. Use a dedicated project.

   **Creating the project doesn't switch you to it**: the console stays on the previous project. Once it's created, click *Select project* in the notification, or choose it in the project picker. Throughout the next steps, check that the URL contains `?project=<your-new-project-id>`: otherwise billing, the API and the key will land in the wrong project.
2. **Billing**: in the *Billing* menu, link a billing account to the project. The API refuses every request without billing, even inside the free allowance.
3. **Enable the API**: *APIs & Services → Library*, search for "Cloud Translation API", then *Enable*.
4. **Create the key**: *APIs & Services → Credentials → Create credentials → API key*. A form opens:
   - **Name**: something recognizable, e.g. `my-book-translation`.
   - **API restrictions**: select only "Cloud Translation API". A leaked key can then only be used to translate. (If it isn't in the list, the API isn't enabled in this project: redo step 3.)
   - **Application restrictions**: leave *None*. The key is used by GitHub Actions servers, whose IP addresses change on every run, and a website restriction only applies to requests made from a browser.

   Click *Create*, then copy the key it shows.
5. **Budget alert** (recommended): *Billing → Budgets & alerts*, create a small budget (e.g. $5) with email alerts. An alert doesn't stop spending; it tells you. For a hard cap, lower the API's characters-per-day quota under *APIs & Services → Cloud Translation API → Quotas*.

Check that the key works:

```bash
curl -s "https://translation.googleapis.com/language/translate/v2" \
  -d key="YOUR_KEY" -d q="Hello world" -d source=en -d target=fr
```

The response should contain `"translatedText": "Bonjour le monde"`. Never commit the key: it only goes into GitHub's secrets (step 5).

#### 2. Copy the kit into your book

```bash
git clone https://github.com/polymtl-reproducible-research/myst-translation-kit.git
cd my-book
cp -R ../myst-translation-kit/template/. .
```

Careful: this replaces `.github/workflows/deploy.yml`, `.github/workflows/tests.yml` and `.github/CODEOWNERS` if they already exist. If you had your own deploy workflow, merge it with the kit's rather than overwriting it.

Add to your `.gitignore`:

```
_build/
_translated/
.tcache/
__pycache__/
```

#### 3. Adapt two files

- **`.github/CODEOWNERS`**: replace `@your-github-username` with the people who must review any change to `scripts/` or `.github/` (the code that can read the key).
- **`.github/workflows/deploy.yml`**: `BASE_URL` is `/<repo-name>`, which is right for `https://<owner>.github.io/<repo>/`. If you use a **custom domain**, set `BASE_URL: ""`.

#### 4. Create the cache branch

The deploy reads and updates `fr.cache.json` on a separate branch, `translation-cache`. Create it empty:

```bash
git switch --orphan translation-cache
echo '{}' > fr.cache.json
git add fr.cache.json
git commit -m "Start the French translation cache"
git push origin translation-cache
git switch main
```

#### 5. Configure the GitHub repository

In the repository's *Settings*:

1. **Pages**: *Pages → Build and deployment → Source*: choose **GitHub Actions**.
2. **The key**: *Environments → New environment*, named exactly **`translation`**.
   - Under *Deployment branches and tags*, choose *Selected branches and tags* and add `main`. That way only merged code can read the key.
   - Under *Environment secrets*, add **`GOOGLE_TRANSLATE_API_KEY`** with the key from step 1.
3. **Protect `main`**: *Rules → Rulesets → New branch ruleset*, target the default branch, and turn on:
   - *Require a pull request before merging*, with *Require review from Code Owners* (without it, `CODEOWNERS` blocks nothing);
   - *Require status checks to pass*, with the **`Translation budget`** check (it appears after the first pull request);
   - *Block force pushes*.

#### 6. Commit and push

```bash
git add -A
git commit -m "Add the French translation kit"
git push origin main
```

The first deploy translates the whole book (which counts against the free allowance), saves the translations to `translation-cache`, and publishes the site at `https://<owner>.github.io/<repo>/` with the French version at `.../<repo>/fr/`. Later deploys only translate new or changed text.

### Day to day

- **Writing**: open pull requests as usual. A *Translation estimate* comment says what will be sent to Google and what the month has used so far.
- **Fixing a translation**: add an entry to `translations/fr.overrides.json`. The key is the English text as the pipeline sees it: links and code are replaced by `XPHX0XPHX`, `XPHX1XPHX`… markers. Copy the exact key from the cache (`fr.cache.json` on `translation-cache`) or from the build's error message:

  ```json
  {
    "Install [Git]XPHX0XPHX on your system.": "Installez [Git]XPHX0XPHX sur votre système."
  }
  ```

- **When the deploy fails**: a "Deploy is failing" issue opens with a link to the run. Usual causes: a sentence Google keeps mangling (pin it), or a key problem (see *Troubleshooting*). Nothing is published until both languages build, so `/fr/` never disappears from the live site.

### Building locally

```bash
pip install pyyaml pytest
mkdir -p .tcache
git fetch origin translation-cache
git show origin/translation-cache:fr.cache.json > .tcache/fr.cache.json

myst build --html
python3 scripts/build-french.py --cache .tcache/fr.cache.json
python3 scripts/inject-language-switcher.py
python3 -m pytest tests/
```

If the cache already covers every sentence, no key is needed. Otherwise, `export GOOGLE_TRANSLATE_API_KEY=...` before the French build, knowing those characters count against your allowance. Then open `_build/html/index.html` and `_build/html/fr/index.html`.

### Customization

| What | Where |
|------|-------|
| Default language on first visit | `scripts/language-switcher.js`: change `\|\| 'fr'` to `\|\| 'en'` |
| Flag images | `scripts/language-switcher.js`: `ukUri` / `qcUri` (base64 SVGs) |
| Widget position and size | `scripts/language-switcher.js`: `W`, `H`, `PAD_BOTTOM`, `PAD_RIGHT` |
| Folders copied as-is into the French build | `scripts/translate_sources.py`: `ASSET_DIRS` (default `images`, `figures`, `bibliography`) |
| Monthly allowance used by the estimate | `scripts/estimate_translation.py`: `FREE_TIER_CHARACTERS` |

### Troubleshooting

- **`GOOGLE_TRANSLATE_API_KEY is not set`**: the secret is missing, or the environment isn't named exactly `translation`.
- **`Branch "…" is not allowed to deploy to translation`**: only `main` can read the key (step 5). That's intended; merge the branch first.
- **A 403 error mentioning billing or a disabled API**: billing isn't linked to the project, the Cloud Translation API isn't enabled (step 1), or the free trial ended without the full account being activated.
- **`couldn't find remote ref translation-cache`**: the cache branch doesn't exist (step 4).
- **Links go to `<owner>.github.io/fr/` instead of `<owner>.github.io/<repo>/fr/`**: `BASE_URL` is wrong in `deploy.yml` (step 3).
- **Pushing the cache fails**: the workflow needs `contents: write` and `issues: write`. If your organization restricts workflow permissions, allow them under *Settings → Actions → General → Workflow permissions*.
- **Titles and contents of `:::{table}` tables stay in English**: known limitation ([#1](https://github.com/polymtl-reproducible-research/myst-translation-kit/issues/1)).

### Updating the kit in an existing book

Re-copy only the code, not your own files:

```bash
cp -R ../myst-translation-kit/template/scripts/. scripts/
cp -R ../myst-translation-kit/template/tests/. tests/
cp ../myst-translation-kit/template/.github/workflows/*.yml .github/workflows/
```

Don't re-copy `translations/fr.overrides.json` (your pinned translations) or `.github/CODEOWNERS`, and re-check `BASE_URL` in `deploy.yml`.
