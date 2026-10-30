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

- Un livre MyST en anglais **déjà poussé sur GitHub**, avec un `myst.yml` qui contient un `project.toc` (`myst init --write-toc` le crée). Le dépôt doit être public pour GitHub Pages avec un compte gratuit.
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

La console Google Cloud est immense : chaque étape ci-dessous donne donc un lien direct et dit sur quoi cliquer dans la page. Dans les liens qui contiennent `YOUR_PROJECT_ID`, remplacez-le par l'identifiant de votre projet (obtenu à l'étape 1.1) : le lien s'ouvre alors directement dans le bon projet, quel que soit celui que la console affichait.

**Première fois sur Google Cloud ?** Quelques étapes uniques :

- Connectez-vous avec un compte Google. Un compte institutionnel peut avoir Google Cloud désactivé ou restreint par son administrateur ; un compte Gmail personnel est le plus simple.
- À la première visite de la console, acceptez les conditions d'utilisation et choisissez votre pays.
- La première fois que vous configurez la facturation (étape 1.2), Google propose généralement un essai gratuit (un crédit à utiliser dans un délai limité). Une carte de crédit est demandée pour vérifier votre identité ; rien n'est facturé pendant l'essai.
- **Important :** à la fin de l'essai, Google suspend les services payants tant que vous n'avez pas activé un compte complet, et le déploiement se met à échouer avec une erreur de facturation. Une fois le livre en ligne, ouvrez <https://console.cloud.google.com/billing>, cliquez sur votre compte de facturation, puis sur sa page *Présentation*, cliquez sur **Activer** (ou **Passer à un compte complet**) dans la bannière en haut. Les 500 000 caractères gratuits par mois s'appliquent toujours ensuite.

1. **Créer un projet**
   - Ouvrez <https://console.cloud.google.com/projectcreate>.
   - *Nom du projet* : p. ex. `mon-livre-traduction`. Juste sous le nom, Google affiche l'**ID du projet** qu'il utilisera (p. ex. `mon-livre-traduction-471203`). Notez-le : c'est `YOUR_PROJECT_ID` dans tous les liens ci-dessous.
   - Cliquez sur **Créer**.
   - Créer un projet ne fait **pas** basculer la console dessus. Ne naviguez pas avec les menus ; utilisez les liens ci-dessous, qui ouvrent directement votre nouveau projet.
   - ID perdu ? Cliquez sur le nom du projet en haut à gauche de la console, à côté du logo Google Cloud : la fenêtre liste tous vos projets avec leur ID.

2. **Associer la facturation**
   - Ouvrez `https://console.cloud.google.com/billing/linkedaccount?project=YOUR_PROJECT_ID`.
   - Si la page indique que le projet n'a pas de compte de facturation, cliquez sur **Associer un compte de facturation** et choisissez le vôtre. Si vous n'en avez pas encore, choisissez **Créer un compte de facturation** et suivez l'inscription (pays, carte).
   - Sans facturation, l'API refuse toute requête, même à l'intérieur du quota gratuit.

3. **Activer l'API**
   - Ouvrez `https://console.cloud.google.com/apis/library/translate.googleapis.com?project=YOUR_PROJECT_ID`.
   - Vérifiez que le nom de projet en haut de la page est bien votre nouveau projet, puis cliquez sur le bouton bleu **Activer**. Une fois terminé, la page devient la présentation de l'API, avec un bouton **Gérer** à la place d'*Activer*.

4. **Créer la clé**
   - Ouvrez `https://console.cloud.google.com/apis/credentials?project=YOUR_PROJECT_ID`. Ignorez le rappel « configure the OAuth consent screen » : il concerne les applications qui connectent des utilisateurs, pas les clés d'API.
   - En haut de la page, cliquez sur **+ Créer des identifiants**, puis sur **Clé API** dans le menu qui s'ouvre. Un formulaire s'affiche :
     - **Nom** : quelque chose de reconnaissable, p. ex. `mon-livre-traduction`.
     - **Restrictions d'API** : ouvrez la liste et cochez seulement **Cloud Translation API**. Une clé qui fuit ne pourra alors servir qu'à traduire. (Si elle n'apparaît pas, l'API n'est pas activée dans ce projet : refaites l'étape 1.3.)
     - **Restrictions d'application** : laissez **Aucune**. La clé est utilisée par les serveurs de GitHub Actions, dont les adresses IP changent à chaque exécution, et une restriction par site web ne s'applique qu'aux requêtes faites depuis un navigateur.
   - Cliquez sur **Créer**. Inutile de copier la clé maintenant : sur cette même page *Identifiants*, la ligne de votre clé dans le tableau *Clés API* a un lien **Afficher la clé** (colonne *Actions*) qui la réaffiche à tout moment. Chaque étape qui en a besoin vous dira d'aller la chercher là juste avant de la coller.

5. **Alerte budgétaire** (recommandé)
   - Les budgets appartiennent au compte de facturation, pas au projet. Ouvrez <https://console.cloud.google.com/billing/budgets> ; si on vous le demande, choisissez le compte de facturation associé à l'étape 1.2.
   - Cliquez sur **+ Créer un budget** en haut de la page.
   - *1 Définir* : gardez **Alertes uniquement** sélectionné et donnez-lui un *Nom* (p. ex. `traduction`). (Le *plafonnement des dépenses* ne fonctionne que pour certains services ; pour une vraie limite stricte, utilisez le plafond de quota à la fin de cette étape.) Cliquez sur **Suivant**.
   - *2 Champ d'application* :
     - **Période** : laissez **Mensuelle** (le quota gratuit se renouvelle aussi chaque mois).
     - **Lecture seule pour les utilisateurs du projet** : laissez décoché.
     - **Projets** : sélectionnez seulement votre nouveau projet, pour ne pas compter les dépenses des autres.
     - **Services** : laissez **Tous les services**. Le projet ne sert qu'à la traduction : toute autre dépense mérite aussi une alerte.
     - **Libellés** : laissez vide.
     - **Économies** : gardez les valeurs par défaut. Le budget suit alors ce que vous payez réellement après les crédits de Google : l'alerte se déclenche quand de l'argent réel commence à sortir, pas tant que le quota gratuit couvre l'usage.

     Cliquez sur **Suivant**.
   - *3 Montant* : choisissez *Montant spécifié* et entrez une petite somme, p. ex. `5`. Cliquez sur **Suivant**.
   - *4 Actions* : gardez les seuils et les alertes par courriel par défaut. Cliquez sur **Terminer**.
   - Une alerte n'arrête pas les dépenses : elle vous prévient. Pour un plafond strict, ouvrez plutôt `https://console.cloud.google.com/apis/api/translate.googleapis.com/quotas?project=YOUR_PROJECT_ID`, tapez `per day` dans le champ *Filtre* au-dessus du tableau, cochez la ligne des caractères par jour, cliquez sur **Modifier** (icône crayon) et entrez une limite plus basse.

**Où va la clé :** à un seul endroit, le secret GitHub de l'étape 5.2. Ne la sauvegardez nulle part ailleurs. Ne la mettez jamais dans un fichier du dépôt (une clé commitée reste dans l'historique git même après suppression : considérez-la comme compromise et supprimez-la), ni dans une issue, une pull request ou un message, ni en clair sur une ligne de commande (elle resterait dans l'historique du shell).

**Vérifiez que la clé fonctionne** (une minute, et ça évite de déboguer un déploiement raté plus tard) :

1. Dans un terminal, lancez :

   ```bash
   read -rs GOOGLE_TRANSLATE_API_KEY && export GOOGLE_TRANSLATE_API_KEY
   ```

   Le terminal attend maintenant une saisie. Laissez-le attendre.
2. Seulement maintenant, copiez la clé (copiée plus tôt, elle aurait été écrasée quand vous avez copié la commande ci-dessus) : ouvrez `https://console.cloud.google.com/apis/credentials?project=YOUR_PROJECT_ID`, cliquez sur **Afficher la clé** dans la ligne de votre clé, et copiez la clé.
3. De retour dans le terminal qui attend, collez la clé et appuyez sur Entrée. Rien ne s'affiche pendant le collage : c'est normal, et ça garde aussi la clé hors de l'historique du shell.
4. Lancez :

   ```bash
   curl -s "https://translation.googleapis.com/language/translate/v2" \
     -d key="$GOOGLE_TRANSLATE_API_KEY" -d q="Hello world" -d source=en -d target=fr
   ```

5. Si la clé fonctionne, vous voyez :

   ```json
   {
     "data": {
       "translations": [
         {
           "translatedText": "Bonjour le monde",
           "detectedSourceLanguage": "en"
         }
       ]
     }
   }
   ```

   Si vous voyez plutôt `"error"`, son `"message"` dit ce qui ne va pas ; voir *Dépannage*. La clé est oubliée à la fermeture du terminal.

#### 2. Copier la trousse dans votre livre

Clonez la trousse **à côté** de votre livre, dans le même dossier parent, pour que les deux soient côte à côte :

```
projets/
├── mon-livre/               # le dépôt de votre livre
└── myst-translation-kit/    # la trousse
```

Depuis ce dossier parent (`projets/` ci-dessus), lancez :

```bash
git clone https://github.com/polymtl-reproducible-research/myst-translation-kit.git
cd mon-livre                 # le dossier de votre livre
cp -R ../myst-translation-kit/template/. .
```

Le `.` final compte : il copie le contenu du modèle, y compris le dossier caché `.github/`, à la racine de votre livre.

Attention : cela remplace `.github/workflows/deploy.yml`, `.github/workflows/tests.yml` et `.github/CODEOWNERS` s'ils existent déjà. Si vous aviez votre propre workflow de déploiement, fusionnez-le avec celui de la trousse plutôt que de l'écraser.

Ensuite, toujours dans le dossier de votre livre, dites à git d'ignorer les dossiers générés par le build. Un livre créé avec `myst init` n'a pas encore de `.gitignore` ; cette commande le crée, ou le complète s'il existe :

```bash
cat >> .gitignore <<'EOF'
_build/
_translated/
.tcache/
__pycache__/
EOF
```

#### 3. Adapter deux fichiers

- **`.github/CODEOWNERS`** : remplacez `@your-github-username` par les personnes qui doivent réviser tout changement à `scripts/` ou `.github/` (le code qui peut lire la clé).
- **`.github/workflows/deploy.yml`** : `BASE_URL` vaut `/<nom-du-dépôt>`, ce qui convient à `https://<propriétaire>.github.io/<dépôt>/`. Si vous utilisez un **domaine personnalisé**, mettez `BASE_URL: ""`.

#### 4. Créer la branche du cache

Le déploiement lit et met à jour `fr.cache.json` sur une branche séparée, `translation-cache`.

Vérifiez d'abord que votre livre est sur GitHub : dans le dossier du livre, `git remote -v` doit afficher une ligne `origin`. Si rien ne s'affiche, le livre n'existe que sur votre ordinateur ; créez le dépôt GitHub et poussez-le (avec [GitHub CLI](https://cli.github.com/)) :

```bash
gh repo create OWNER/REPO --public --source . --remote origin --push
```

Ce push ne contient que vos commits existants : les fichiers de la trousse ne sont pas encore commités, donc aucun workflow ne se lance.

Créez ensuite la branche du cache, vide :

```bash
git switch --orphan translation-cache
echo '{}' > fr.cache.json
git add fr.cache.json
git commit -m "Start the French translation cache"
git push origin translation-cache
git switch main
```

#### 5. Configurer le dépôt GitHub

Dans les liens ci-dessous, remplacez `OWNER/REPO` par votre dépôt (p. ex. `jeanne/mon-livre`).

1. **Pages**
   - Ouvrez `https://github.com/OWNER/REPO/settings/pages`.
   - Sous *Build and deployment*, ouvrez la liste **Source** et choisissez **GitHub Actions**. C'est appliqué immédiatement ; rien à enregistrer.

2. **La clé**
   - Ouvrez `https://github.com/OWNER/REPO/settings/environments/new`.
   - *Name* : exactement **`translation`**. Cliquez sur **Configure environment** ; vous arrivez sur la page de réglages de l'environnement.
   - *Deployment branches and tags* : ouvrez la liste (elle indique *No restriction*) et choisissez **Selected branches and tags**. Cliquez sur **Add deployment branch or tag rule**, tapez `main`, puis **Add rule**. Seul du code fusionné pourra lire la clé.
   - *Environment secrets*, plus bas sur la même page : cliquez sur **Add environment secret**. *Name* : **`GOOGLE_TRANSLATE_API_KEY`**. Pour la *Value*, ouvrez `https://console.cloud.google.com/apis/credentials?project=YOUR_PROJECT_ID` dans un autre onglet, cliquez sur **Afficher la clé** dans la ligne de votre clé, copiez-la, revenez et collez-la aussitôt dans *Value*. Cliquez sur **Add secret**.

#### 6. Commit et push

```bash
git add -A
git commit -m "Add the French translation kit"
git push origin main
```

Le premier déploiement traduit tout le livre (ce qui compte dans le quota gratuit), enregistre les traductions sur `translation-cache`, et publie le site à `https://<propriétaire>.github.io/<dépôt>/` et la version française à `.../<dépôt>/fr/`. Les déploiements suivants ne traduisent que le texte nouveau ou modifié.

#### 7. Protéger `main`

À faire après le premier push : désormais, les changements n'arrivent sur `main` que par des pull requests révisées.

- Ouvrez `https://github.com/OWNER/REPO/settings/rules/new?target=branch`.
- *Ruleset name* : `main`. *Enforcement status* : **Active**.
- *Target branches* : cliquez sur **Add target**, puis **Include default branch**.
- Sous *Branch rules*, laissez **Restrict deletions** et **Block force pushes** cochées, et cochez :
  - **Require a pull request before merging**, puis, dans les options qui apparaissent dessous, **Require review from Code Owners**. Sans cela, `CODEOWNERS` n'empêche rien.
  - **Require status checks to pass**, puis cliquez sur **+ Add checks**, tapez `Translation budget` et sélectionnez-la. La vérification n'apparaît qu'après avoir tourné sur une pull request : sur un dépôt tout neuf, ouvrez une première pull request, puis revenez dans ce ruleset pour l'ajouter.
- Cliquez sur **Create** en bas de la page.

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
- **`Branch "…" is not allowed to deploy to translation`** : seul `main` peut lire la clé (étape 5.2). C'est voulu ; fusionnez d'abord la branche.
- **Erreur 403 mentionnant la facturation ou une API désactivée** : la facturation n'est pas associée au projet, l'API Cloud Translation n'est pas activée (étapes 1.2 et 1.3), ou l'essai gratuit est terminé sans que le compte complet ait été activé.
- **`couldn't find remote ref translation-cache`** : la branche du cache n'existe pas (étape 4).
- **Les liens mènent à `<propriétaire>.github.io/fr/` au lieu de `<propriétaire>.github.io/<dépôt>/fr/`** : `BASE_URL` est mal défini dans `deploy.yml` (étape 3).
- **Le push du cache échoue** : le workflow a besoin de `contents: write` et `issues: write`. Si votre organisation limite les permissions des workflows, ouvrez `https://github.com/OWNER/REPO/settings/actions` et autorisez-les sous *Workflow permissions*, en bas de la page.
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

- An English MyST book **already pushed to GitHub**, with a `myst.yml` containing a `project.toc` (`myst init --write-toc` creates one). The repository must be public for GitHub Pages on a free account.
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

The Google Cloud console is huge, so each step below gives a direct link and says what to click on that page. Links containing `YOUR_PROJECT_ID` need your project's ID (you get it in step 1.1) pasted in its place: they then open straight in the right project, whichever project the console was showing before.

**First time on Google Cloud?** A few one-off steps:

- Sign in with a Google account. An institutional account may have Google Cloud disabled or restricted by its administrator; a personal Gmail account is the simplest.
- On your first visit to the console, accept the terms of service and choose your country.
- The first time you set up billing (step 1.2), Google usually offers a free trial (credit to use within a limited time). A credit card is required to verify your identity; nothing is charged during the trial.
- **Important:** when the trial ends, Google pauses paid services until you activate a full account, and the deploy starts failing with a billing error. Once the book is live, open <https://console.cloud.google.com/billing>, click your billing account, and on its *Overview* page click **Activate** (or **Upgrade**) in the banner at the top. The 500,000 free characters per month still apply afterwards.

1. **Create a project**
   - Open <https://console.cloud.google.com/projectcreate>.
   - *Project name*: e.g. `my-book-translation`. Just below the name, Google shows the **Project ID** it will use (e.g. `my-book-translation-471203`). Note it down: it's `YOUR_PROJECT_ID` in every link below.
   - Click **Create**.
   - Creating a project does **not** switch the console to it. Don't navigate with the menus; use the links below, which open your new project directly.
   - Lost the ID? Click the project name at the top left of the console, next to the Google Cloud logo: the dialog lists every project with its ID.

2. **Link billing**
   - Open `https://console.cloud.google.com/billing/linkedaccount?project=YOUR_PROJECT_ID`.
   - If the page says the project has no billing account, click **Link a billing account** and choose yours. If you have none yet, choose **Create billing account** and follow the sign-up (country, card).
   - Without billing, the API refuses every request, even inside the free allowance.

3. **Enable the API**
   - Open `https://console.cloud.google.com/apis/library/translate.googleapis.com?project=YOUR_PROJECT_ID`.
   - Check that the project name at the top of the page is your new project, then click the blue **Enable** button. When it's done, the page turns into the API's overview, with a **Manage** button where *Enable* was.

4. **Create the key**
   - Open `https://console.cloud.google.com/apis/credentials?project=YOUR_PROJECT_ID`. Ignore the "configure the OAuth consent screen" reminder: it's for apps that sign users in, not for API keys.
   - At the top of the page, click **+ Create credentials**, then **API key** in the menu that drops down. A form opens:
     - **Name**: something recognizable, e.g. `my-book-translation`.
     - **Select API restrictions**: open the dropdown and tick only **Cloud Translation API**. A leaked key can then only be used to translate. (If it isn't in the list, the API isn't enabled in this project: redo step 1.3.)
     - **Application restrictions**: leave **None**. The key is used by GitHub Actions servers, whose IP addresses change on every run, and a website restriction only applies to requests made from a browser.
   - Click **Create**. No need to copy the key now: back on the same Credentials page, your key's row in the *API Keys* table has a **Show key** link (in the *Actions* column) that displays it again at any time. Each step that needs the key tells you to fetch it there right before pasting it.

5. **Budget alert** (recommended)
   - Budgets belong to the billing account, not the project. Open <https://console.cloud.google.com/billing/budgets>; if it asks, choose the billing account you linked in step 1.2.
   - Click **+ Create budget** at the top of the page.
   - *1 Define*: keep **Alerts only** selected, and give it a *Name* (e.g. `translation`). (*Spend cap enforcement* only works for some services; for a dependable hard limit, use the quota cap at the end of this step.) Click **Next**.
   - *2 Scope*:
     - **Time range**: leave **Monthly** (the free allowance resets monthly too).
     - **Read-only for project users**: leave unticked.
     - **Projects**: select only your new project, so spending in other projects isn't counted.
     - **Services**: leave **All services**. The project exists only for translation, so anything else showing up there deserves an alert too.
     - **Labels**: leave empty.
     - **Savings**: leave the defaults. The budget then tracks what you actually pay after Google's credits, so the alert fires when real money starts going out, not while the free allowance covers it.

     Click **Next**.
   - *3 Amount*: choose *Specified amount* and enter something small, e.g. `5`. Click **Next**.
   - *4 Actions*: keep the default thresholds and email alerts. Click **Finish**.
   - An alert doesn't stop spending; it tells you. For a hard cap instead, open `https://console.cloud.google.com/apis/api/translate.googleapis.com/quotas?project=YOUR_PROJECT_ID`, type `per day` in the *Filter* box above the table, tick the characters-per-day row, click **Edit** (pencil icon), and enter a lower limit.

**Where the key goes:** one place only, the GitHub secret in step 5.2. Don't save it anywhere else. Never put it in a file in the repository (a committed key stays in git history even after it's deleted: treat it as leaked and delete the key), in an issue, pull request or message, or typed out on a command line (it would stay in your shell history).

**Check that the key works** (one minute, and it saves debugging a failed deploy later):

1. In a terminal, run:

   ```bash
   read -rs GOOGLE_TRANSLATE_API_KEY && export GOOGLE_TRANSLATE_API_KEY
   ```

   The terminal now waits for input. Leave it waiting.
2. Only now copy the key (copying it earlier would have been overwritten when you copied the command above): open `https://console.cloud.google.com/apis/credentials?project=YOUR_PROJECT_ID`, click **Show key** in your key's row, and copy the key.
3. Back in the waiting terminal, paste the key and press Enter. Nothing appears on screen while you paste: that's normal, and it also keeps the key out of your shell history.
4. Run:

   ```bash
   curl -s "https://translation.googleapis.com/language/translate/v2" \
     -d key="$GOOGLE_TRANSLATE_API_KEY" -d q="Hello world" -d source=en -d target=fr
   ```

5. If the key works, you see:

   ```json
   {
     "data": {
       "translations": [
         {
           "translatedText": "Bonjour le monde",
           "detectedSourceLanguage": "en"
         }
       ]
     }
   }
   ```

   If you see `"error"` instead, its `"message"` says what's wrong; see *Troubleshooting*. The key is forgotten when you close the terminal.

#### 2. Copy the kit into your book

Clone the kit **next to** your book, in the same parent folder, so the two sit side by side:

```
projects/
├── my-book/                 # your book's repository
└── myst-translation-kit/    # the kit
```

From that parent folder (`projects/` above), run:

```bash
git clone https://github.com/polymtl-reproducible-research/myst-translation-kit.git
cd my-book                   # your book's folder
cp -R ../myst-translation-kit/template/. .
```

The `.` at the end matters: it copies the template's contents, including the hidden `.github/` folder, into the root of your book.

Careful: this replaces `.github/workflows/deploy.yml`, `.github/workflows/tests.yml` and `.github/CODEOWNERS` if they already exist. If you had your own deploy workflow, merge it with the kit's rather than overwriting it.

Then, still in your book's folder, make git ignore the folders the build generates. A book made with `myst init` has no `.gitignore` yet; this command creates it, or adds to it if it exists:

```bash
cat >> .gitignore <<'EOF'
_build/
_translated/
.tcache/
__pycache__/
EOF
```

#### 3. Adapt two files

- **`.github/CODEOWNERS`**: replace `@your-github-username` with the people who must review any change to `scripts/` or `.github/` (the code that can read the key).
- **`.github/workflows/deploy.yml`**: `BASE_URL` is `/<repo-name>`, which is right for `https://<owner>.github.io/<repo>/`. If you use a **custom domain**, set `BASE_URL: ""`.

#### 4. Create the cache branch

The deploy reads and updates `fr.cache.json` on a separate branch, `translation-cache`.

First check that your book is on GitHub: in the book's folder, `git remote -v` should print an `origin` line. If it prints nothing, the book only exists on your computer; create the GitHub repository and push it (with the [GitHub CLI](https://cli.github.com/)):

```bash
gh repo create OWNER/REPO --public --source . --remote origin --push
```

That push only contains your existing commits: the kit's files aren't committed yet, so no workflow runs.

Then create the cache branch, empty:

```bash
git switch --orphan translation-cache
echo '{}' > fr.cache.json
git add fr.cache.json
git commit -m "Start the French translation cache"
git push origin translation-cache
git switch main
```

#### 5. Configure the GitHub repository

In the links below, replace `OWNER/REPO` with your repository (e.g. `jane/my-book`).

1. **Pages**
   - Open `https://github.com/OWNER/REPO/settings/pages`.
   - Under *Build and deployment*, open the **Source** dropdown and choose **GitHub Actions**. It applies immediately; there's nothing to save.

2. **The key**
   - Open `https://github.com/OWNER/REPO/settings/environments/new`.
   - *Name*: exactly **`translation`**. Click **Configure environment**; you land on the environment's settings page.
   - *Deployment branches and tags*: open the dropdown (it says *No restriction*) and choose **Selected branches and tags**. Click **Add deployment branch or tag rule**, type `main`, and click **Add rule**. Only merged code can then read the key.
   - *Environment secrets*, further down the same page: click **Add environment secret**. *Name*: **`GOOGLE_TRANSLATE_API_KEY`**. For the *Value*, open `https://console.cloud.google.com/apis/credentials?project=YOUR_PROJECT_ID` in another tab, click **Show key** in your key's row, copy it, come back and paste it straight into *Value*. Click **Add secret**.

#### 6. Commit and push

```bash
git add -A
git commit -m "Add the French translation kit"
git push origin main
```

The first deploy translates the whole book (which counts against the free allowance), saves the translations to `translation-cache`, and publishes the site at `https://<owner>.github.io/<repo>/` with the French version at `.../<repo>/fr/`. Later deploys only translate new or changed text.

#### 7. Protect `main`

Do this after the first push: from now on, changes reach `main` only through reviewed pull requests.

- Open `https://github.com/OWNER/REPO/settings/rules/new?target=branch`.
- *Ruleset name*: `main`. *Enforcement status*: **Active**.
- *Target branches*: click **Add target**, then **Include default branch**.
- Under *Branch rules*, leave **Restrict deletions** and **Block force pushes** ticked, and tick:
  - **Require a pull request before merging**, then, in the options that appear under it, **Require review from Code Owners**. Without it, `CODEOWNERS` blocks nothing.
  - **Require status checks to pass**, then click **+ Add checks**, type `Translation budget` and select it. The check is only listed once it has run on a pull request: on a brand-new repository, open a first pull request, then come back to this ruleset and add it.
- Click **Create** at the bottom of the page.

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
- **`Branch "…" is not allowed to deploy to translation`**: only `main` can read the key (step 5.2). That's intended; merge the branch first.
- **A 403 error mentioning billing or a disabled API**: billing isn't linked to the project, the Cloud Translation API isn't enabled (steps 1.2 and 1.3), or the free trial ended without the full account being activated.
- **`couldn't find remote ref translation-cache`**: the cache branch doesn't exist (step 4).
- **Links go to `<owner>.github.io/fr/` instead of `<owner>.github.io/<repo>/fr/`**: `BASE_URL` is wrong in `deploy.yml` (step 3).
- **Pushing the cache fails**: the workflow needs `contents: write` and `issues: write`. If your organization restricts workflow permissions, open `https://github.com/OWNER/REPO/settings/actions` and, under *Workflow permissions* at the bottom, allow them.
- **Titles and contents of `:::{table}` tables stay in English**: known limitation ([#1](https://github.com/polymtl-reproducible-research/myst-translation-kit/issues/1)).

### Updating the kit in an existing book

Re-copy only the code, not your own files:

```bash
cp -R ../myst-translation-kit/template/scripts/. scripts/
cp -R ../myst-translation-kit/template/tests/. tests/
cp ../myst-translation-kit/template/.github/workflows/*.yml .github/workflows/
```

Don't re-copy `translations/fr.overrides.json` (your pinned translations) or `.github/CODEOWNERS`, and re-check `BASE_URL` in `deploy.yml`.
