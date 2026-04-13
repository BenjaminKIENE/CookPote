# Prompt d'architecture — Cookpote

> À coller dans une nouvelle conversation Claude (ou Claude Code) pour démarrer la phase d'architecture, puis enchaîner sur le développement phase par phase.

---

## Contexte projet

Je développe **Cookpote** (cookpote.fr), une application web responsive mobile-first de carnet de recettes social, destinée à un cercle d'amis (faible nombre d'utilisateurs, usage perso étendu). Mot-valise cook + popote, ton chaleureux et convivial, ambiance **claire, food-friendly** — pense terracotta, crème, vert sauge, typographies Google Fonts gratuites (un serif élégant pour les titres + sans-serif lisible pour le corps).

Je suis développeur freelance fullstack (Angular, Node, .NET, Python), basé en France. Projet perso, zéro monétisation côté utilisateurs, RGPD à respecter dès le départ. La seule dépense récurrente est l'API Anthropic que je paie de ma poche pour la feature Scan Frigo.

## Stack imposée

- **Frontend** : Angular (dernière version stable), SCSS, responsive mobile-first, site web classique (pas de PWA). Choix Angular Material vs composants custom à arbitrer dans l'archi.
- **Backend** : Node.js + TypeScript. Framework au choix justifié (Fastify recommandé pour perf et écosystème de plugins sécurité, sinon Express).
- **Base de données** : SQLite via `better-sqlite3` (synchrone, performant, simple). Migrations versionnées (Knex, Drizzle ou Kysely — à arbitrer dans l'archi).
- **Hébergement** : **VPS Ubuntu personnel**, avec **Nginx déjà installé** servant déjà 2 autres sites web. **Installation native, pas de Docker.** L'app doit cohabiter proprement (port dédié, vhost Nginx dédié, process manager type systemd ou PM2).
- **Stockage images** : sur le filesystem du VPS, pas de service externe. Compression et redimensionnement à l'upload via Sharp.
- **API IA** : Anthropic API, modèle **Claude Sonnet 4.6** (`claude-sonnet-4-6`) pour la vision. Clé API stockée en variable d'environnement côté serveur, jamais exposée au client.
- **Emails transactionnels** : **SMTP Hostinger** (boîte mail perso déjà disponible chez Hostinger, adresse dédiée type `noreply@cookpote.fr` ou équivalent à créer). Config standard : `smtp.hostinger.com`, port 465 SSL (ou 587 STARTTLS en fallback), auth avec l'adresse email complète + mot de passe. Lib Node : **Nodemailer** (standard de l'écosystème, bien maintenu). Credentials (host, port, user, password, from) en variables d'environnement. Utilisé pour : vérification email à l'inscription, reset password, notifications critiques de sécurité (changement de mot de passe, activation/désactivation 2FA). Templates HTML + texte en français, simples, sans tracking ni images externes (pour éviter le classement spam). **Délivrabilité** : vérifier que les enregistrements DNS SPF, DKIM et DMARC sont correctement configurés sur cookpote.fr côté Hostinger (la doc Hostinger les fournit).
- **Tests** : **Vitest** pour le backend (tests unitaires sur la logique métier critique : auth flows, matching ingrédients, calcul de score de faisabilité, chiffrement TOTP). **Playwright** pour 2-3 parcours E2E critiques : signup → vérif email → login, création recette avec upload image, scan frigo happy path. Pas de tests unitaires frontend exhaustifs (coût/bénéfice défavorable sur ce scope).
- **CI/CD** : **GitHub Actions**. Deux workflows : (1) sur chaque PR, lint + typecheck + tests unitaires + tests E2E headless. (2) Deploy manuel déclenché par un tag git (`v*`) qui SSH sur le VPS et lance un script de déploiement (git pull, install, build, migrations, restart systemd). Clé SSH stockée en secret GitHub, jamais committée.
- **Logs & monitoring** : **pino** pour les logs structurés JSON côté Node, rotation via **logrotate** natif Ubuntu (conf fournie dans l'archi). Endpoint **`GET /health`** public qui vérifie : process up, SQLite accessible, filesystem writable sur le dossier uploads. **UptimeRobot** (gratuit, 50 monitors) configuré pour ping `/health` toutes les 5 min et alerter par email en cas de down.
- **Domaine** : cookpote.fr (HTTPS via Let's Encrypt, déjà géré par Nginx pour les autres sites — adapter la conf).

## Périmètre fonctionnel V1 (MVP)

### 1. Authentification
- Inscription email + mot de passe avec **vérification email obligatoire** (lien de confirmation à usage unique, expiration courte)
- Connexion email/password
- **2FA TOTP optionnelle** (activable depuis le profil, secret chiffré en base via AES-256-GCM)
- Reset password sécurisé (token à usage unique, expiration courte, hashé en base)
- **PAS d'OAuth en V1** (Google/Apple reportés en V2)

### 2. Profil utilisateur
- Pseudo, avatar (1 image, compressée), bio courte
- Paramètres compte : changer email, changer mot de passe, activer/désactiver 2FA
- **Export RGPD** des données perso au format JSON (téléchargeable depuis le profil)
- **Suppression de compte** avec cascade propre sur toutes les tables liées

### 3. Recettes (CRUD complet par l'utilisateur connecté)
- **Champs** : titre, photo unique (compressée + redimensionnée), description courte, temps de préparation, temps de cuisson, nombre de portions de référence, niveau de difficulté (facile/moyen/difficile), catégorie (entrée / plat / dessert / apéritif / boisson / autre — liste fermée définie côté code), tags libres avec autocomplétion sur les tags existants
- **Ingrédients structurés** : liste ordonnée de `{ quantité: number, unité: enum, ingredient_id: FK vers ingredients_reference, note?: string }`. Unités prédéfinies (g, kg, ml, cl, l, c. à café, c. à soupe, pièce, pincée, à goût). **Scaling automatique côté front** quand l'utilisateur change le nombre de portions à l'affichage.
- **Saisie des ingrédients** : autocomplétion sur la table `ingredients_reference`. Si l'utilisateur tape un ingrédient inexistant, possibilité d'en créer un nouveau (qui rejoint la table de référence partagée). Cette normalisation est **critique** pour le bon fonctionnement de la feature Scan Frigo et de la recherche par ingrédients.
- **Étapes numérotées** : liste ordonnée de textes (séparées des ingrédients)
- **Visibilité par recette**, choisie au moment de la sauvegarde finale :
  - `private` (visible uniquement par l'auteur)
  - `friends` (visible par les utilisateurs qui suivent l'auteur — préparé pour V2 mais déjà disponible comme statut en V1)
  - `public` (visible par tout utilisateur connecté)

### 4. Feed découverte (page d'accueil après login)
- Affiche les recettes **publiques** de tous les utilisateurs
- Tri : récentes par défaut. Tri "populaires" → V2 (dépend des likes)
- **Recherche full-text** sur titre, description, tags, ingrédients (FTS5 de SQLite)
- **Filtres** : catégorie, tags, temps total max, difficulté
- **Pagination par infinite scroll** avec cursor-based côté API (pas d'offset), page size 20 recettes, chargement progressif au scroll avec indicateur de chargement en bas de liste

### 5. Mes recettes
- Vue dédiée listant toutes les recettes de l'utilisateur connecté (toutes visibilités confondues)
- Recherche et filtres équivalents au feed
- **Pagination par infinite scroll** (chargement progressif au scroll) avec pagination cursor-based côté API (plus performant que offset sur SQLite et stable quand des recettes sont ajoutées pendant la navigation)

### 5bis. Landing publique (visiteur non connecté)
- Page d'accueil publique sur `cookpote.fr` pour les visiteurs non authentifiés
- Contenu : présentation courte de Cookpote (pitch en une phrase, 3 features clés dont le Scan Frigo mis en avant comme différenciateur), visuels chaleureux, CTA "Créer un compte" et "Se connecter"
- **Pas de showcase des recettes publiques sur la landing** (choix assumé pour préserver un minimum d'intimité du cercle d'amis, même si les recettes publiques restent visibles une fois connecté)
- Footer avec liens vers mentions légales, politique de confidentialité, CGU
- Un utilisateur déjà authentifié qui arrive sur `/` est automatiquement redirigé vers son feed

### 5ter. SEO & référencement
- **Stratégie minimaliste** : cible "entre amis" donc pas d'enjeu SEO fort, mais on fait les basiques proprement
- **Pas de SSR Angular en V1** (complexité disproportionnée pour l'usage) — la landing publique est servie en pré-rendu statique si possible, sinon en CSR classique avec meta tags côté `index.html`
- **Meta tags** : title, description, Open Graph (og:title, og:description, og:image, og:url), Twitter Card, favicon, apple-touch-icon — gérés au niveau de `index.html` pour la landing, et dynamiquement via le service `Title` + `Meta` d'Angular sur les pages applicatives
- **robots.txt** : autoriser l'indexation de la landing (`/`) et des pages légales, **bloquer** tout le reste (`/app/*`, `/api/*`) pour éviter que Google indexe le feed qui nécessite auth
- **sitemap.xml** : uniquement la landing et les pages légales en V1
- **Pas d'analytics en V1** (pas de Google Analytics, pas de Plausible) pour éviter le bandeau cookies

### 6. Table de référence des ingrédients (`ingredients_reference`)
- Table normalisée partagée entre tous les utilisateurs
- Champs : `id`, `nom_canonique` (ex: "tomate"), `synonymes` (JSON array : `["tomates", "tomate cerise", "tomate roma"]`), `categorie` (légume / fruit / viande / poisson / laitier / féculent / épice / condiment / autre), `created_by` (user qui l'a ajouté), timestamps
- Pré-seedée avec ~200 ingrédients courants français au déploiement initial (seed file fourni dans l'archi)
- Index sur `nom_canonique` et FTS sur `synonymes` pour l'autocomplétion rapide
- Sert de socle pour : autocomplétion à la création de recette, matching Scan Frigo, matching manuel, recherche par ingrédients

### 7. Scan Frigo (feature IA — V1)

**Principe** : l'utilisateur prend en photo l'intérieur de son frigo (ou ses placards), l'IA analyse les ingrédients visibles, et propose les recettes faisables avec ce qu'il a, avec des suggestions de substitution pour ce qui manque.

**Flow détaillé** :

1. L'utilisateur clique sur "Scan Frigo" depuis l'app, prend une photo (ou en sélectionne une depuis sa galerie)
2. **Avant le premier upload de la session** : modale d'avertissement RGPD claire — "Ta photo va être envoyée à l'API Anthropic pour analyse. Elle n'est pas conservée par Cookpote ni par Anthropic au-delà de la durée du traitement. Tu peux retirer manuellement les éléments sensibles avant de prendre la photo." — avec checkbox "Ne plus afficher ce message"
3. **Toggle** dans l'UI avant analyse : "Chercher dans **mes recettes**" (par défaut) / "**Toutes les recettes** publiques" / "Les deux"
4. La photo est envoyée à l'endpoint `POST /api/scan-fridge` (multipart, max 5 Mo, vérification MIME magic bytes obligatoire comme pour les autres uploads)
5. Le backend appelle l'API Anthropic avec un prompt système structuré demandant à Claude Sonnet 4.6 d'extraire la liste des ingrédients visibles, normalisés au mieux contre la liste fournie (le backend joint en contexte la liste des `nom_canonique` + synonymes de `ingredients_reference`)
6. Le backend récupère la liste d'ingrédients détectés, fait le **matching local** contre les recettes selon le périmètre choisi par l'utilisateur, et calcule un **score de faisabilité** par recette : `(ingrédients_recette_disponibles / ingrédients_recette_total) * 100`
7. Pour les recettes "presque-faisables" (score entre 60% et 99%), le backend fait un **second appel** à Claude Sonnet 4.6 (text-only, pas de vision, donc beaucoup moins cher) pour générer des **suggestions de substitution** ingrédient par ingrédient (ex: "pas de crème fraîche → tu peux remplacer par du yaourt grec ou du fromage blanc")
8. Le backend renvoie au front une **liste triée** :
   - Recettes 100% faisables en premier (badge vert)
   - Recettes presque-faisables ensuite (60-99%, badge orange, avec les suggestions de substitution affichées)
   - Recettes en dessous de 60% : **masquées** (pas affichées du tout)
9. **Aucune persistance** : ni la photo, ni le résultat de l'analyse ne sont stockés en base ou sur le filesystem. La photo est traitée en mémoire (buffer) et jetée après l'appel API. Le résultat n'existe que dans la réponse HTTP.
10. **Fallback gracieux** : si l'API Anthropic est indisponible, retourne 503 avec un message clair et une suggestion de bascule vers le **matching manuel** (voir section suivante).

**Garde-fous coût et abus** :
- **Rate limiting strict** : 10 analyses Scan Frigo / utilisateur / jour, compteur stocké en BDD (table `usage_quotas`), reset à minuit UTC
- **Compteur visible dans l'UI** : "Il te reste 7 scans aujourd'hui"
- **Taille image** : max 5 Mo, redimensionnée côté serveur à 1024px max grand côté avant envoi à l'API Anthropic (économie de tokens vision)
- **Timeout** : 30 secondes max sur l'appel API, sinon abandon avec message clair
- **Logging** : chaque appel API loggé (utilisateur, timestamp, nb d'ingrédients détectés, coût estimé en tokens) dans une table `ai_usage_log` pour que je puisse surveiller les coûts

### 8. Matching manuel d'ingrédients (feature complémentaire — V1, gratuite)

**Principe** : l'utilisateur peut taper manuellement une liste d'ingrédients qu'il a chez lui (autocomplétion sur `ingredients_reference`), et l'app propose les recettes faisables. Pas d'IA, pas de coût, juste du matching SQL local.

**Flow** :
1. Page dédiée "J'ai dans mon frigo..."
2. L'utilisateur ajoute des ingrédients un à un via un input avec autocomplétion sur `ingredients_reference`
3. Toggle de périmètre identique au Scan Frigo (mes recettes / publiques / les deux)
4. Le backend calcule le score de faisabilité par recette (même logique que Scan Frigo, étape 6) et renvoie la liste triée
5. Pour les substitutions sur les recettes presque-faisables : **optionnel** via un bouton "Demander des suggestions IA" sur chaque recette presque-faisable, qui déclenche un appel Claude text-only ciblé sur cette recette précise (compté dans le quota Scan Frigo)

Cette feature doit être pensée comme le **complément gratuit et illimité** du Scan Frigo : même résultat, sans IA, sans coût, sans limite.

## Périmètre V2 (à anticiper dans le schéma BDD mais à NE PAS coder)

- OAuth Google + Apple
- Système de **follow unilatéral** (type Twitter)
- **Likes** sur les recettes
- **Commentaires** sur les recettes
- Notifications in-app
- Tri "populaires" sur le feed
- Application effective de la visibilité `friends` (en V1 elle existe en BDD mais comportementalement équivalente à `private` puisque le système de follow n'est pas actif)
- Suggestions de courses ("achète ces 2 ingrédients pour débloquer 5 recettes")
- Historique des scans frigo (avec stockage opt-in)

→ Le schéma de BDD V1 doit déjà inclure les tables `follows`, `likes`, `comments` pour éviter une migration douloureuse plus tard. Les endpoints et l'UI ne sont pas implémentés.

## Exigences de sécurité (non négociables)

- **HTTPS obligatoire** en prod (Let's Encrypt via Nginx, déjà en place sur le VPS)
- **Hash mots de passe** : Argon2id avec paramètres OWASP 2024+
- **Sessions** : JWT d'accès courts (15 min) + refresh token rotatif stocké en cookie `httpOnly`, `Secure`, `SameSite=Lax`. Refresh tokens stockés **hashés** en base avec révocation possible (table dédiée).
- **2FA TOTP** : secret chiffré en base via AES-256-GCM, clé maîtresse dans variable d'environnement, jamais committée
- **Rate limiting** sur tous les endpoints sensibles : login, signup, reset password, vérification email, validation 2FA, upload d'image, **et particulièrement Scan Frigo (quota par jour, voir plus haut)**. Plugin Fastify ou middleware dédié, stockage en BDD pour les quotas Scan Frigo (persistance entre redémarrages).
- **CSRF** : protection sur toutes les routes mutantes (double submit cookie ou token synchronizer pattern)
- **CSP stricte** : pas de `unsafe-inline`, hash ou nonce pour les inline qu'Angular pourrait nécessiter (attention au build prod), `default-src 'self'`, autorisations explicites pour les images servies par l'API
- **Headers de sécurité** : Helmet ou équivalent Fastify, HSTS, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy minimaliste
- **Upload d'images (recettes ET scan frigo)** :
  - Vérification du **vrai MIME via magic bytes** (lib `file-type` par exemple), jamais confiance au `Content-Type` envoyé par le client
  - Whitelist stricte : JPEG, PNG, WebP uniquement
  - Taille max 5 Mo en upload
  - Pour les recettes : redimensionnement automatique à 1200px max grand côté, conversion en WebP qualité 80, renommage UUID v4, stockage filesystem hors webroot
  - Pour le scan frigo : redimensionnement à 1024px max grand côté, **traitement en mémoire uniquement, jamais écrit sur disque**
- **Validation stricte des inputs** côté serveur via Zod (jamais confiance au front)
- **Requêtes paramétrées** systématiques, même avec un query builder
- **Chiffrement applicatif** sur : secrets TOTP (AES-256-GCM), tokens de reset password (hashés SHA-256 + sel), refresh tokens (hashés). Pas de chiffrement sur le contenu des recettes (casserait FTS5).
- **Clé API Anthropic** : variable d'environnement, jamais committée, jamais exposée au client, jamais loggée
- **Gestion des secrets applicatifs** : toutes les clés sensibles (`ENCRYPTION_KEY` pour AES-256-GCM du TOTP, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CSRF_SECRET`, `ANTHROPIC_API_KEY`, credentials SMTP Hostinger) sont générées via `openssl rand -base64 32` ou équivalent au moment du setup initial, stockées dans le fichier `.env` sur le VPS (permissions `600`, owner `cookpote`), jamais committées, jamais loggées. Un script `scripts/generate-secrets.sh` doit être fourni pour bootstrap un `.env` en local et en prod. Procédure de rotation documentée pour chaque secret (impact : rotation de `ENCRYPTION_KEY` oblige à re-chiffrer tous les secrets TOTP en base, donc rare ; rotation de `JWT_*` invalide toutes les sessions, acceptable en cas de fuite).
- **Logs** : ne jamais logger mots de passe, tokens, secrets 2FA, headers Authorization, clé API Anthropic, contenu des photos. Logger les tentatives de login échouées avec IP pour détection brute force.
- **Audit log** minimal : créations/suppressions de compte, changements de mot de passe, activations/désactivations 2FA
- **Pas de backup automatisé du fichier SQLite en V1** (choix assumé). À mentionner dans le doc comme risque connu pour que je sois conscient de ce qui se passe en cas de perte du VPS.

## Exigences RGPD

- **Mentions légales**, **politique de confidentialité**, **CGU** : pages statiques à prévoir (squelette + TODO de contenu juridique)
- La politique de confidentialité doit **mentionner explicitement** l'usage de l'API Anthropic pour le Scan Frigo, avec sous-traitance hors UE possible (Anthropic est US), et le fait que les photos ne sont pas conservées
- **Export des données** au format JSON depuis le profil (toutes les données liées à l'utilisateur, y compris l'historique d'usage IA agrégé)
- **Suppression de compte** en cascade : recettes, refresh tokens, audit logs, quotas, ai_usage_log, et préparation de la cascade pour les tables V2 (likes, comments, follows)
- Choix soft delete vs hard delete à arbitrer et justifier dans l'archi
- Bandeau cookies **uniquement si** des analytics sont ajoutées (pas prévu en V1)
- Hébergement sur VPS perso en France/UE (à confirmer côté utilisateur)

---

## Ce que j'attends de toi

Produis un **document d'architecture complet et exploitable**, structuré exactement comme suit. Sois exhaustif mais structuré : titres clairs, code formaté, tableaux quand c'est plus lisible que de la prose. Justifie tes choix non triviaux.

### 1. Justification des choix techniques
Pour chaque brique non imposée (framework Node, query builder/ORM, lib de validation, lib auth/JWT, lib 2FA, lib upload, SDK Anthropic officiel ou fetch direct, etc.), donne ta reco avec un argumentaire court (perf, sécurité, DX, compatibilité SQLite, gratuité). Si tu identifies un risque dans la stack imposée — notamment **concurrence d'écriture SQLite**, performances FTS5 à grande échelle, single point of failure du VPS, latence/coût API Anthropic — dis-le et propose des mitigations.

### 2. Identité visuelle Cookpote
- **Palette de couleurs** : 5-6 couleurs avec codes hex, mode clair uniquement, variables CSS prêtes à coller
- **Typographies** : 2 polices Google Fonts (titres + corps), avec justification du choix
- **Logo** : description textuelle d'un concept simple (cocotte stylisée + clin d'œil anglo ?), implémentable en SVG par un dev sans designer
- **Ton de voix** : tutoiement ou vouvoiement (recommandation justifiée pour le ton "entre amis"), exemples de microcopy (boutons, messages d'erreur, écrans vides, message de chargement Scan Frigo)

### 3. Modèle de données complet
- **Schéma SQL SQLite** avec toutes les tables, contraintes, index, et configuration FTS5 pour la recherche
- Inclure les tables V2 (`follows`, `likes`, `comments`) dès maintenant
- Inclure les tables liées au Scan Frigo : `ingredients_reference`, `usage_quotas`, `ai_usage_log`
- Pour chaque table : rôle, choix non-évidents commentés (cascade ON DELETE, soft vs hard delete, types de colonnes spécifiques SQLite, stockage JSON pour les synonymes)
- **Diagramme ER** en mermaid
- **Seed initial** pour `ingredients_reference` : propose une structure et liste ~30 exemples représentatifs (pas les 200, juste pour montrer le format), je compléterai

### 4. Architecture backend
- **Structure de dossiers détaillée** (arbre)
- **Liste exhaustive des endpoints REST** sous forme de tableau : méthode, chemin, auth requise, payload attendu, réponse, codes d'erreur possibles. Doit inclure tous les endpoints Scan Frigo, matching manuel, quotas, et ingredients_reference.
- **Stratégie d'authentification détaillée** : flow inscription, flow vérification email, flow login, flow refresh token, flow activation 2FA, flow login avec 2FA, flow reset password — chacun illustré d'un **diagramme de séquence mermaid**
- **Diagramme de séquence mermaid pour le flow Scan Frigo complet** (du clic utilisateur au retour de la liste triée, en montrant les deux appels API Anthropic — vision puis text pour substitutions)
- **Stratégie de validation** : Zod, schemas partagés front/back ou dupliqués, où ils vivent
- **Format uniforme des réponses d'erreur** (exemple JSON)
- **Liste des middlewares/plugins de sécurité** à activer avec leur ordre d'application
- **Module IA dédié** : structure du wrapper autour de l'API Anthropic (gestion des erreurs, retry, timeout, logging des coûts, prompts système versionnés)

### 5. Architecture frontend Angular
- **Structure de dossiers** (core / shared / features, lazy loading)
- **Liste des routes** avec guards (auth guard pour les pages applicatives, anonymous guard pour login/signup, redirect automatique vers le feed si utilisateur déjà connecté accède à `/` ou `/login`)
- **State management** : Signals natifs Angular vs NgRx — recommandation justifiée pour ce scope
- **Gestion des tokens** : intercepteur HTTP, refresh automatique sur 401, queue des requêtes pendant le refresh, redirect login sur échec
- **Composants clés** à créer (liste avec rôle de chacun), incluant les composants Scan Frigo (caméra/upload, modale RGPD, écran de chargement avec animation, affichage des résultats triés avec badges) et matching manuel (input avec autocomplétion ingrédients)
- **Système de notifications toast** : service global `NotificationService` exposant des méthodes `success(msg)`, `error(msg)`, `info(msg)`, `warning(msg)`. Composant `<app-toast-container>` monté au niveau root qui écoute le service. Auto-dismiss après 4s (configurable), bouton close manuel, empilement en bas à droite desktop / haut mobile, animations d'entrée/sortie douces, file d'attente max 3 toasts simultanés. Utilisé pour : confirmation de création/édition/suppression, erreurs API non-bloquantes, info quota Scan Frigo, erreurs réseau. Les erreurs bloquantes (formulaires invalides, 401) utilisent plutôt des messages inline, pas des toasts.
- **Pagination infinite scroll** : directive ou composant générique `<app-infinite-scroll>` qui écoute le scroll du viewport (IntersectionObserver sur un sentinel en bas de liste), déclenche le chargement de la page suivante, gère l'état loading/erreur/fin de liste. Utilisé sur le feed et "Mes recettes".
- **Service SEO** : wrapper autour de `Title` et `Meta` d'Angular pour mettre à jour title + description + Open Graph sur chaque changement de route (au moins sur la landing et les pages légales)
- **Stratégie responsive** : breakpoints, approche mobile-first, layout des écrans clés
- **Gestion de la caméra mobile** : utilisation de l'attribut `capture` sur les inputs file pour ouvrir directement l'appareil photo sur mobile
- **Landing publique** : composant dédié `<app-landing>` servi sur `/` pour les visiteurs non connectés, avec layout distinct (pas de sidebar/header applicatif), pré-rendu statique si possible via Angular prerendering

### 6. Stratégie de stockage et traitement des images
Flow complet pour les **photos de recettes** : upload client → endpoint Node → validation MIME magic bytes → vérification taille → traitement Sharp (resize + WebP qualité 80) → renommage UUID → stockage filesystem hors webroot → enregistrement chemin en BDD → service via endpoint Node authentifié qui vérifie la visibilité → headers de cache navigateur appropriés. Inclure la gestion de la suppression d'image (orphelins, suppression cascade quand une recette ou un compte est supprimé).

Flow complet pour les **photos de scan frigo** : upload client → endpoint Node → validation MIME magic bytes → vérification taille → traitement Sharp en mémoire (resize 1024px) → envoi buffer base64 à l'API Anthropic → traitement de la réponse → libération mémoire. **Aucune écriture disque, jamais.**

### 7. Architecture de la feature Scan Frigo
Section dédiée détaillée :
- **Prompts système** Claude (vision et text) versionnés, en français, avec exemples de réponses attendues structurées (JSON strict). Le prompt vision doit contenir la liste des ingrédients de référence pour faciliter la normalisation.
- **Algorithme de matching** ingrédients détectés ↔ ingrédients de recettes (exact match sur `ingredient_id`, fallback fuzzy sur synonymes)
- **Calcul du score de faisabilité** : formule, gestion des ingrédients optionnels (ex: "à goût"), seuil de masquage à 60%
- **Stratégie d'appel API** : un seul appel vision pour l'extraction, puis un appel text par batch de recettes presque-faisables pour les substitutions (économie de coût)
- **Estimation des coûts** : combien coûte un scan moyen en tokens et en euros, pour que je puisse anticiper ma facture mensuelle selon le volume
- **Gestion des erreurs** : timeout, quota dépassé, API down, réponse mal formée, image rejetée par Anthropic (contenu sensible) — pour chaque cas, comportement attendu côté backend et front
- **Prompt injection** : risque qu'une image contienne du texte cherchant à manipuler le modèle ; mitigation à expliquer

### 8. Sécurité — checklist exhaustive
Reprends **chaque exigence sécurité** ci-dessus et explique **comment** elle est implémentée concrètement : lib utilisée, fichier où ça vit dans la structure, exemple de config quand pertinent. Format tableau ou liste détaillée. Insiste sur les spécificités Scan Frigo (pas de stockage, quota strict, clé API protégée).

### 9. Stratégie RGPD
Comment l'export JSON, la suppression cascade, et les pages légales sont gérés concrètement. Décision soft vs hard delete justifiée. Mention spécifique du sous-traitant Anthropic et du transfert hors UE pour la feature Scan Frigo.

### 10. Déploiement sur VPS Ubuntu existant
- **Configuration Nginx** (vhost dédié cookpote.fr) qui cohabite avec les 2 sites existants : reverse proxy vers le port Node, gestion des assets statiques Angular (build dans `/var/www/cookpote/` ou équivalent), headers de sécurité au niveau Nginx, certificat Let's Encrypt
- **Service systemd** pour le process Node (ou PM2 — recommandation justifiée). Restart auto, logs, user dédié non-root.
- **Variables d'environnement** : fichier `.env.example` complet et commenté, incluant `ANTHROPIC_API_KEY`, credentials SMTP Hostinger, tous les secrets JWT/CSRF/ENCRYPTION_KEY, et stratégie de chargement (dotenv ? variables systemd ?)
- **Script `scripts/generate-secrets.sh`** : génère un `.env` initial avec tous les secrets aléatoires via openssl
- **Stratégie de migration de schéma en prod** : commande, ordre d'exécution, rollback
- **Permissions filesystem** : user dédié `cookpote`, dossiers data/ et uploads/ avec les bons droits, `.env` en `600`
- **Note sur l'absence de backup** : risque assumé, mais documenter une procédure manuelle de copie du fichier SQLite que je pourrai lancer à la main quand je veux

### 10bis. Tests, CI/CD, logs & monitoring
- **Stratégie de tests** :
  - Backend : Vitest, couverture ciblée sur la logique métier critique (auth flows, chiffrement TOTP, matching ingrédients, calcul de score, endpoints sensibles). Pas de viser 100% de couverture, viser les chemins à risque.
  - E2E : Playwright, 3 parcours critiques — (1) signup + vérif email + login + 2FA, (2) création recette avec upload image + édition + suppression, (3) scan frigo happy path (avec API Anthropic mockée en test pour éviter les coûts)
  - Organisation : tests unitaires à côté des fichiers sources (`*.test.ts`), tests E2E dans un dossier dédié `e2e/`
- **GitHub Actions** :
  - Workflow `ci.yml` : déclenché sur PR, lance lint + typecheck + tests unitaires + tests E2E headless. Bloque le merge si échec.
  - Workflow `deploy.yml` : déclenché sur tag `v*`, se connecte en SSH au VPS (clé privée en secret GitHub), pull la branche main, installe les deps, build le frontend, lance les migrations, restart le service systemd. Notification du résultat.
  - Secrets GitHub nécessaires : `SSH_PRIVATE_KEY`, `SSH_HOST`, `SSH_USER`. Pas de secrets applicatifs dans GitHub (ils restent sur le VPS).
- **Logs** :
  - Lib : **pino** (JSON structuré, haute perf)
  - Destination : fichier sur le VPS (`/var/log/cookpote/app.log`), rotation par **logrotate** (conf fournie : rotation quotidienne, compression, rétention 14 jours)
  - Niveaux : `info` par défaut en prod, `debug` activable via variable d'env
  - Masquage automatique des champs sensibles (passwords, tokens, API keys, Authorization headers) via les redact options de pino
- **Monitoring** :
  - Endpoint `GET /health` public qui retourne `200 OK` avec un JSON `{ status, db: 'ok', fs: 'ok', uptime }`. Vérifie que SQLite répond à un SELECT trivial et que le dossier uploads est writable.
  - **UptimeRobot** (gratuit) configuré pour ping `/health` toutes les 5 min et alerter par email si down.
  - Pas d'APM (Sentry, Datadog) en V1, on reste minimaliste.

### 11. Plan de développement par étapes
Découpe le V1 en **10 à 13 phases livrables et testables**, dans l'ordre. Chaque phase :
- **Objectif** en une phrase
- **Fichiers à créer/modifier** (liste indicative)
- **Critère de "fait"** (ce qui doit fonctionner pour passer à la suivante)
- **Tests à écrire** pour la phase (unitaires et/ou E2E selon pertinence)

Granularité attendue :
- Phase 1 — Setup projet (monorepo ou deux repos ? à arbitrer) + scripts npm + linter + Prettier + git hooks + **config Vitest + Playwright + GitHub Actions CI dès le début**
- Phase 2 — Schéma BDD + migrations + seed `ingredients_reference`
- Phase 3 — Module emails (Nodemailer + SMTP Hostinger) + templates vérif email et reset password
- Phase 4 — Backend auth email/password + vérif email + 2FA TOTP + reset password
- Phase 5 — Frontend auth (signup, login, vérif email, 2FA, reset) + intercepteur tokens + NotificationService + toasts
- Phase 6 — Backend recettes CRUD + upload image + ingredients_reference + autocomplétion
- Phase 7 — Frontend recettes (création avec autocomplétion ingrédients, édition, vue détaillée avec scaling portions)
- Phase 8 — Feed + recherche FTS5 + filtres + pagination infinite scroll + matching manuel d'ingrédients
- Phase 9 — **Scan Frigo backend** (module IA Anthropic, endpoint, quotas, prompts vision + text, logging coûts)
- Phase 10 — **Scan Frigo frontend** (caméra mobile, modale RGPD, écran chargement, affichage résultats triés)
- Phase 11 — Profil + export RGPD + suppression compte en cascade
- Phase 12 — **Landing publique** + pages légales (mentions, confidentialité, CGU) + meta SEO + robots.txt + sitemap
- Phase 13 — Déploiement VPS (Nginx vhost, systemd, logrotate, healthcheck, UptimeRobot, workflow GitHub Actions deploy) + polish final

### 12. Ce qui n'est PAS dans le V1
Liste claire et explicite de ce qui est volontairement reporté en V2, pour éviter le scope creep en cours de dev.

### 13. Décisions à valider avant Phase 1
Liste des arbitrages que tu n'as pas pu trancher seul et qui méritent ma validation avant qu'on attaque le code (exemples possibles : monorepo vs deux repos, Angular Material vs custom, query builder choisi, soft vs hard delete, SDK Anthropic vs fetch direct, etc.). Pour chaque décision, donne **ta recommandation** justifiée + l'alternative.

---

## Règles pour ta réponse

- **Sois exhaustif mais structuré.** Titres clairs, tableaux, code formaté, mermaid pour les diagrammes.
- **Justifie les choix non triviaux.** Pas de "c'est mieux" sans pourquoi.
- **Anticipe les pièges** : concurrence d'écriture SQLite, refresh token rotation race conditions, CORS Angular ↔ API sur même domaine ou sous-domaine, CSP qui casse Angular en prod, cohabitation Nginx avec d'autres vhosts, permissions filesystem du user systemd, gestion mémoire lors du traitement des images Scan Frigo, coût API qui dérape, prompt injection via le contenu visuel d'une image. Pour chaque piège, donne la solution.
- **Ne code pas encore.** C'est un document d'architecture. Le code viendra phase par phase, dans des messages suivants, après validation de l'archi.
- Termine par la section "Décisions à valider avant Phase 1" pour qu'on puisse trancher ensemble avant d'attaquer.

Vas-y, prends ton temps : c'est la fondation du projet, je préfère 30 minutes d'archi solide que 30 heures de refacto plus tard.
