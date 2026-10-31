# 🛠️ PLAN D'ACTION ET DE CORRECTION - SÉCURITÉ & PERFORMANCE
**Application :** ECICA (Portail Web & Espace d'Administration)  
**Document de référence :** [`AUDIT_SECURITE_PERFORMANCE_ECICA.md`](./AUDIT_SECURITE_PERFORMANCE_ECICA.md)  
**Statut :** Prêt à l'exécution  

---

## 🧭 Vue d'ensemble du Plan de Remédiation

```
                                 CHRONOLOGIE DES TRAVAUX
 ┌─────────────────────────────────────────────────────────────────────────────────────────┐
 │ PHASE 1 (P0 - Immédiat)   : Sécurisation Authentification & Secrets JWT                 │
 ├─────────────────────────────────────────────────────────────────────────────────────────┤
 │ PHASE 2 (P1 - Prioritaire): Durcissement HTTP (Helmet), Anti-Bruteforce & Upload        │
 ├─────────────────────────────────────────────────────────────────────────────────────────┤
 │ PHASE 3 (P2 - Cloud/Data) : Optimisation PostgreSQL Neon, Index BDD & Stockage Vercel  │
 ├─────────────────────────────────────────────────────────────────────────────────────────┤
 │ PHASE 4 (P3 - Nettoyage)  : Nettoyage des dépendances & Validation / Benchmark          │
 └─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔴 PHASE 1 : Urgences Sécurité & Authentification (Priorité P0)
> **Objectif :** Éliminer immédiatement les failles critiques permettant le vol de sessions ou le contournement de l'authentification.

### 1.1. Sécuriser la clé secrète JWT
- **Fichier :** [`config/jwt.js`](./config/jwt.js)
- **Actions :**
  - [x] Retirer la chaîne par défaut codée en dur (`"ecica_super_secret_jwt_key_2026"`).
  - [x] En mode production (`NODE_ENV === 'production'`), bloquer le démarrage si `process.env.JWT_SECRET` est absent.
  - [x] Générer une clé robuste dans le fichier `.env` si elle n'est pas encore définie.

### 1.2. Supprimer les identifiants administrateurs de secours en dur
- **Fichier :** [`routers/admin.routes.js`](./routers/admin.routes.js) (lignes 86-97)
- **Actions :**
  - [x] Supprimer le bloc de secours `login === envUser && password === envPassword`.
  - [x] Restreindre l'authentification strictement aux enregistrements existants dans la table PostgreSQL `admin`.

### 1.3. Supprimer l'authentification en mot de passe brut (`isPlainMatch`)
- **Fichier :** [`routers/admin.routes.js`](./routers/admin.routes.js) (lignes 68-73)
- **Actions :**
  - [x] Supprimer la variable `isPlainMatch` qui valide les mots de passe non hachés.
  - [x] Valider les accès **exclusivement** via `await bcrypt.compare(password, admin.password)`.

---

## 🟠 PHASE 2 : Durcissement Applicatif, Anti-Bruteforce & Upload (Priorité P1)
> **Objectif :** Protéger les routes exposées contre le déni de service, les attaques par force brute et les injections XSS.

### 2.1. Installation des modules requis
- **Commande :**
  ```bash
  npm install helmet express-rate-limit
  ```
  - [x] Paquets `helmet` et `express-rate-limit` installés avec succès.

### 2.2. Configuration des en-têtes HTTP de sécurité (Helmet)
- **Fichier :** [`app.js`](./app.js)
- **Actions :**
  - [x] Intégrer `helmet()` avec une politique CSP (*Content Security Policy*) permissive pour les ressources nécessaires (Pug SSR, Google Fonts, Leaflet, Mammoth, SheetJS).
  - [x] Activer `X-Frame-Options: SAMEORIGIN` (protection anti-clickjacking).
  - [x] Activer `X-Content-Type-Options: nosniff`.
  - [x] Activer `Strict-Transport-Security` (HSTS) en production.

### 2.3. Mise en place du Rate Limiting (Limitation de débit)
- **Fichiers :** [`app.js`](./app.js), [`routers/admin.routes.js`](./routers/admin.routes.js), [`routers/contact.routes.js`](./routers/contact.routes.js)
- **Actions :**
  - [x] **Limiteur Global :** 500 requêtes / 15 minutes par IP sur l'ensemble du site.
  - [x] **Limiteur Login Admin (`POST /admin/login`) :** 5 tentatives / 15 minutes pour stopper le Brute Force.
  - [x] **Limiteur Formulaire Contact (`POST /contact`) :** 5 messages / heure par IP pour stopper le spam.

### 2.4. Sécurisation de l'Upload de Fichiers (Multer)
- **Fichier :** [`config/multer.config.js`](./config/multer.config.js)
- **Actions :**
  - [x] Retirer `.svg` de la liste des extensions autorisées (élimination du risque de Stored XSS via script SVG).
  - [x] Maintenir la liste sécurisée : `.pdf`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.png`, `.jpg`, `.jpeg`, `.webp`.

---

## 🟡 PHASE 3 : Base de Données & Adaptation Cloud Serverless (Priorité P2)
> **Objectif :** Éviter l'épuisement des connexions PostgreSQL Neon et adapter la persistance pour Vercel.

### 3.1. Optimisation du Pool PostgreSQL pour Serverless
- **Fichier :** [`database/index.js`](./database/index.js)
- **Actions :**
  - [x] Ajuster le pool `max: 3` si exécuté en environnement serverless (Vercel Lambdas) pour ne pas saturer Neon.
  - [x] Vérifier la prise en charge de la chaîne avec pooling Neon.

### 3.2. Création des Index SQL de performance
- **Fichier :** [`scripts/apply-indexes.js`](./scripts/apply-indexes.js)
- **Actions :**
  - [x] Index `idx_admin_login` vérifié.
  - [x] Index `idx_admin_email` créé sur `admin(email)`.
  - [x] Index `idx_contact_created_at` créé sur `contact(created_at DESC)`.
  - [x] Index `idx_emplois_created_at` créé sur `emplois_du_temps(created_at DESC)`.
  - [x] Index `idx_emplois_class_name` créé sur `emplois_du_temps(class_name)`.

### 3.3. Découplage du stockage local pour Vercel
- **Fichier :** [`services/emplois.service.js`](./services/emplois.service.js)
- **Actions :**
  - [x] Gérer gracieusement les erreurs d'écriture sur le disque local `fs.writeFile` lorsque le système est en lecture seule (`EROFS` sur Vercel Lambda).
  - [x] Garantir que PostgreSQL est la source de vérité principale pour toutes les requêtes.

---

## 🟢 PHASE 4 : Nettoyage des Dépendances & Tests Finaux (Priorité P3)
> **Objectif :** Alléger le projet, supprimer le code mort et valider les performances.

### 4.1. Nettoyage du projet
- **Actions :**
  - [x] Désinstaller `mongoose` (`npm uninstall mongoose` - 20 paquets retirés).
  - [x] Supprimer les fichiers modèles orphelins vides dans `database/models/`.

### 4.2. Validation & Recette
- **Actions :**
  - [x] Tester la connexion au panneau d'administration (`/admin/login`).
  - [x] Vérifier la réponse des en-têtes de sécurité Helmet.
  - [x] Exécuter le benchmark de performance (`node scripts/perf_test.js`).
  - [x] Valider que les temps de réponse restent optimaux (200 à 240+ req/s sur les pages et assets).

---

## 📋 Tableau de Suivi de l'Avancement

| ID | Tâche | Fichier(s) | Priorité | Statut |
| :--- | :--- | :--- | :---: | :---: |
| **T1** | Rendre `JWT_SECRET` obligatoire & supprimer fallback | `config/jwt.js` | 🔴 P0 | ✅ **Terminé** |
| **T2** | Supprimer admin par défaut en dur & `isPlainMatch` | `routers/admin.routes.js` | 🔴 P0 | ✅ **Terminé** |
| **T3** | Installer `helmet` et `express-rate-limit` | `package.json` | 🟠 P1 | ✅ **Terminé** |
| **T4** | Configurer Helmet (CSP, HSTS, X-Frame) | `app.js` | 🟠 P1 | ✅ **Terminé** |
| **T5** | Activer Rate-Limiting (Global, Login, Contact) | `app.js`, `routers/*.js` | 🟠 P1 | ✅ **Terminé** |
| **T6** | Retirer SVG et durcir le filtre Multer | `config/multer.config.js` | 🟠 P1 | ✅ **Terminé** |
| **T7** | Optimiser pool PostgreSQL Neon & Index | `database/index.js`, `scripts/apply-indexes.js` | 🟡 P2 | ✅ **Terminé** |
| **T8** | Désinstaller `mongoose` et supprimer modèles vides | `package.json`, `database/models/` | 🟢 P3 | ✅ **Terminé** |
| **T9** | Validation fonctionnelle & tests de performance | `scripts/perf_test.js` | 🟢 P3 | ✅ **Terminé** |

---


---
