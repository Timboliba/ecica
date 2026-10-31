# 🛡️ RAPPORT D'AUDIT DE SÉCURITÉ ET DE PERFORMANCE
**Application :** ECICA (Portail Web & Espace d'Administration)  
**Date d'audit :** Septembre 2026  
**Version analysée :** En Production (`project_ecica_enProd`)  
**Type d'architecture :** Node.js / Express 4.x / PostgreSQL (Neon) / Pug SSR / Déploiement Vercel

---

## 📊 1. Synthèse Exécutive & Scores Globaux

| Domaine | Note / Score | Niveau de Risque | Statut |
| :--- | :---: | :---: | :--- |
| **Sécurité Globale** | **6.5 / 10** | 🟠 **Moyen à Élevé** | Plusieurs vulnérabilités critiques identifiées nécessitant une remédiation immédiate |
| **Performance Globale** | **8.0 / 10** | 🟢 **Faible** | Excellentes optimisations déjà en place (compression, cache Pug, static headers), mais incompatibilité serverless du stockage fichiers |
| **Qualité & Architecture** | **7.5 / 10** | 🟡 **Moyen** | Code propre et modulaire, quelques ajustements requis pour le cloud serverless |

```
TABLEAU DE BORD DES VULNÉRABILITÉS & ANOMALIES
-------------------------------------------------------------------------
🔴 CRITIQUE (P0)   : 2 vulnérabilités (Secrets JWT/Admin par défaut, Login mot de passe en clair)
🟠 ÉLEVÉ (P1)      : 3 vulnérabilités (Absence de Rate-Limiting, Upload SVG/MIME, Headers de sécurité)
🟡 MOYEN (P2)      : 3 anomalies (Stockage local sur Serverless Vercel, SSL rejectUnauthorized: false, CSRF)
🟢 FAIBLE (P3)     : 2 optimisations (Dépendance mongoose inutile, Indexation BDD)
```

---

## 🔍 2. Périmètre et Méthodologie d'Audit

L'audit a couvert l'intégralité du code source et de la configuration :
1. **Couche Contrôleur & Routage :** `app.js`, `routers/*.js`
2. **Couche Authentification & Sessions :** `config/jwt.js`, `routers/admin.routes.js`
3. **Couche Données & Base de données :** `database/index.js`, `database/models/`, `scripts/*.js`
4. **Gestion des Fichiers & Uploads :** `config/multer.config.js`, `services/emplois.service.js`
5. **Couche Rendu & Vues :** `views/**/*.pug`, `public/`
6. **Infrastructure & Déploiement :** `package.json`, `vercel.json`, `.env`

---

## 🔐 3. AUDIT DE SÉCURITÉ (Vulnérabilités & Risques)

### 🔴 3.1. [CRITIQUE] Clé secrète JWT et identifiants administrateurs codés en dur par défaut
- **Fichiers concernés :** [config/jwt.js](file:///c:/Users/LENOVO/Desktop/project_ecica_enProd/config/jwt.js#L7), [routers/admin.routes.js](file:///c:/Users/LENOVO/Desktop/project_ecica_enProd/routers/admin.routes.js#L86-L88), [scripts/init-admin.js](file:///c:/Users/LENOVO/Desktop/project_ecica_enProd/scripts/init-admin.js#L121-L133)
- **Description :**
  1. `config/jwt.js` définit un fallback prévisible si `process.env.JWT_SECRET` est omis :
     ```js
     const JWT_SECRET = process.env.JWT_SECRET || "ecica_super_secret_jwt_key_2026";
     ```
  2. `routers/admin.routes.js` contient un bypass de secours avec identifiants par défaut :
     ```js
     const envUser = process.env.USER || "ecica@gmail.com";
     const envPassword = process.env.PASSWORD || "password ecica";
     if (login === envUser && password === envPassword) { ... }
     ```
- **Impact :** En cas de défaut de chargement du `.env` en production, un attaquant connaissant cette chaîne peut forger des tokens JWT valides avec le rôle `superadmin` et compromettre l'intégralité de la plateforme.
- **Remédiation :**
  - Rendre la variable d'environnement `JWT_SECRET` strictement obligatoire : lever une exception fatale au démarrage si elle est absente.
  - Supprimer tout fallback d'authentification en dur dans le code.

---

### 🔴 3.2. [CRITIQUE] Tolérance des mots de passe administrateurs en clair (`isPlainMatch`)
- **Fichier concerné :** [routers/admin.routes.js](file:///c:/Users/LENOVO/Desktop/project_ecica_enProd/routers/admin.routes.js#L68-L73)
- **Description :**
  Lors de la connexion, le code autorise la comparaison directe sans hachage :
  ```javascript
  const isMatch = await bcrypt.compare(password, admin.password).catch(() => false);
  const isPlainMatch = password === admin.password;
  if (isMatch || isPlainMatch) { ... }
  ```
- **Impact :** Si une base de données contient des mots de passe non hachés ou si un attaquant parvient à injecter une chaîne brute, l'application valide l'accès sans exiger de signature bcrypt valide.
- **Remédiation :** Supprimer `isPlainMatch`. Tout mot de passe en base doit être obligatoirement haché avec `bcrypt` (facteur de coût $\ge 10$ ou $12$).

---

### 🟠 3.3. [ÉLEVÉ] Absence de Rate-Limiting (Brute Force & DoS)
- **Fichiers concernés :** [app.js](file:///c:/Users/LENOVO/Desktop/project_ecica_enProd/app.js), [routers/admin.routes.js](file:///c:/Users/LENOVO/Desktop/project_ecica_enProd/routers/admin.routes.js#L46), [routers/contact.routes.js](file:///c:/Users/LENOVO/Desktop/project_ecica_enProd/routers/contact.routes.js#L43)
- **Description :**
  Aucun limiteur de débit (`express-rate-limit`) n'est configuré sur les routes critiques :
  - `POST /admin/login` : vulnérable aux attaques par dictionnaire et force brute automatisée sur les comptes administrateurs.
  - `POST /contact` : vulnérable au spam massif, flooding d'emails ou saturation de la table PostgreSQL `contact`.
  - `POST /Emplois/add` : risque d'épuisement de l'espace disque.
- **Impact :** Déni de service (DoS), vol de comptes admin, saturation de la base de données Neon.
- **Remédiation :** Mettre en place `express-rate-limit` sur l'ensemble de l'application avec des règles strictes sur `/admin/login` (ex: 5 tentatives max par 15 minutes) et `/contact` (ex: 5 messages par heure).

---

### 🟠 3.4. [ÉLEVÉ] Upload de fichiers : Absence de validation MIME par Magic Bytes & Risque XSS via SVG
- **Fichier concerné :** [config/multer.config.js](file:///c:/Users/LENOVO/Desktop/project_ecica_enProd/config/multer.config.js#L28-L53)
- **Description :**
  1. La validation du fichier repose uniquement sur l'extension du nom original (`path.extname(file.originalname).toLowerCase()`). Un attaquant peut renommer un script malveillant en `.png` ou `.pdf`.
  2. L'extension `.svg` est acceptée. Un fichier SVG est un document XML pouvant contenir des balises `<script>` exécutables. Comme les fichiers sont servis statiquement sous `/emplois/`, l'accès direct au lien SVG exécute le script JavaScript dans le contexte de sécurité du domaine (Stored XSS).
- **Impact :** Cross-Site Scripting (XSS) stocké, vol de sessions/cookies JWT si l'administrateur ouvre un SVG malveillant.
- **Remédiation :**
  - Retirer `.svg` de la liste des fichiers acceptés pour les emplois du temps ou assainir avec un outil comme `DOMPurify` / `sharp`.
  - Valider le type MIME réel (Magic Bytes) via une bibliothèque comme `file-type`.

---

### 🟠 3.5. [ÉLEVÉ] Absence d'en-têtes HTTP de sécurité (Helmet, CSP, HSTS, X-Frame-Options)
- **Fichier concerné :** [app.js](file:///c:/Users/LENOVO/Desktop/project_ecica_enProd/app.js#L10-L11)
- **Description :**
  `app.js` utilise uniquement `app.disable("x-powered-by")`. Il manque les en-têtes cruciaux :
  - `Content-Security-Policy (CSP)` : protection contre les injections de scripts.
  - `X-Frame-Options: DENY` ou `SAMEORIGIN` : protection contre le Clickjacking.
  - `X-Content-Type-Options: nosniff` : empêche le MIME-sniffing.
  - `Strict-Transport-Security (HSTS)` : force l'utilisation de HTTPS.
  - `Referrer-Policy: strict-origin-when-cross-origin`.
- **Remédiation :** Intégrer le middleware standard `helmet`.

---

### 🟡 3.6. [MOYEN] Configuration SSL PostgreSQL avec `rejectUnauthorized: false`
- **Fichier concerné :** [database/index.js](file:///c:/Users/LENOVO/Desktop/project_ecica_enProd/database/index.js#L16)
- **Description :**
  ```javascript
  ssl: sslEnabled ? { rejectUnauthorized: false } : false
  ```
  La désactivation de la vérification du certificat SSL autorise les certificats auto-signés ou invalides sans validation de l'autorité émettrice.
- **Impact :** Risque potentiel d'interception Man-In-The-Middle (MITM) sur le trafic entre l'application et la base Neon si le réseau intermédiaire est compromis.
- **Remédiation :** Si possible, fournir le certificat CA racine de Neon ou utiliser le mode de validation approprié en production.

---

### 🟡 3.7. [MOYEN] Protection CSRF sur les formulaires d'administration
- **Fichiers concernés :** [routers/admin.routes.js](file:///c:/Users/LENOVO/Desktop/project_ecica_enProd/routers/admin.routes.js), [routers/emplois-list.routes.js](file:///c:/Users/LENOVO/Desktop/project_ecica_enProd/routers/emplois-list.routes.js)
- **Description :** Les actions de modification (création d'admin, suppression, upload d'emplois) reposent sur le cookie `jwt_token` (`sameSite: 'lax'`). Bien que `SameSite: Lax` offre une protection de base contre les requêtes GET cross-site, les requêtes d'action ou soumissions inter-sites peuvent être renforcées avec un jeton CSRF (Double Submit Cookie ou token de session).
- **Remédiation :** Vérifier systématiquement l'en-tête `Origin` / `Referer` sur les routes de mutation ou implémenter un token anti-CSRF pour les requêtes POST/DELETE.

---

### 🟢 3.8. [FAIBLE] Dépendance orpheline `mongoose`
- **Fichier concerné :** [package.json](file:///c:/Users/LENOVO/Desktop/project_ecica_enProd/package.json#L18)
- **Description :** `mongoose` est listé dans `package.json` et les fichiers dans `database/models/` sont vides (0 octet). L'application utilise exclusivement PostgreSQL (`pg`).
- **Impact :** Poids inutile du `node_modules`, temps d'installation allongé sur CI/CD, risque de dépendances vulnérables orphelines.
- **Remédiation :** Exécuter `npm uninstall mongoose` et supprimer les fichiers vides de modèles non utilisés.

---

## ⚡ 4. AUDIT DE PERFORMANCE (Vitesse, Scalabilité & Cloud)

### 🟢 Points Forts Identifiés (Excellentes pratiques) :
1. **Compression HTTP active :** Utilisation de `compression` avec seuil à 1 Ko et niveau 6 (équilibre optimal CPU/ratio).
2. **Cache des Vues Pug :** `app.enable("view cache")` précompile les templates en mémoire, divisant par 10 le temps de rendu SSR en production.
3. **Mise en cache des fichiers statiques :**
   - Dans `app.js` : `maxAge: "7d"`, `etag: true`, `lastModified: true`.
   - Dans `vercel.json` : `Cache-Control: public, max-age=31536000, immutable` sur les assets `/img`, `/css`, `/javascript`.
4. **Optimisation des Images :** Conversion des images en `.webp` et préchargement (`rel="preload"`, `fetchpriority="high"`) dans le template HTML.

---

### 🟡 4.1. [CRITIQUE CLOUD] Stockage de fichiers local incompatible avec l'environnement Serverless (Vercel)
- **Fichiers concernés :** [config/multer.config.js](file:///c:/Users/LENOVO/Desktop/project_ecica_enProd/config/multer.config.js#L5-L14), [services/emplois.service.js](file:///c:/Users/LENOVO/Desktop/project_ecica_enProd/services/emplois.service.js#L6-L9)
- **Constat :**
  L'application écrit les fichiers uploadés dans `public/emplois/` et synchronise les métadonnées dans `data/emplois.json`.
- **Problème en Production (Vercel Serverless) :**
  Les fonctions Lambdas de Vercel sont **en lecture seule (read-only)** (hors `/tmp` éphémère) et sont détruites après exécution.
  - Tout fichier uploadé sur Vercel sera perdu au prochain redémarrage/nouvelle instance.
  - Les écritures `fs.writeFile(DATA_FILE, ...)` généreront une erreur d'I/O `EROFS: read-only file system`.
- **Recommandation :**
  1. Confier le stockage des métadonnées exclusivement à la table PostgreSQL `emplois_du_temps`.
  2. Utiliser un stockage objet Cloud (Cloudinary, AWS S3, Supabase Storage ou Vercel Blob) pour les fichiers d'emplois du temps.

---

### 🟡 4.2. Gestion du Pool de Connexions PostgreSQL (Neon Serverless)
- **Fichier concerné :** [database/index.js](file:///c:/Users/LENOVO/Desktop/project_ecica_enProd/database/index.js#L7-L25)
- **Constat :**
  Le pool utilise `max: 10`. En environnement serverless classique, chaque requête peut instancier un nouveau container et ouvrir jusqu'à 10 connexions, risquant de saturer la limite de connexions de la base Neon.
- **Recommandation :**
  - Utiliser l'URL de connexion Neon avec **Pooling activé** (port `6543` avec `?pgbouncer=true` ou l'endpoint Neon Pooler).
  - En mode serverless, réduire `max: 1` à `max: 3` par instance lambda.

---

### 🟢 4.3. Indexation des requêtes fréquentes
- **Fichiers concernés :** [scripts/init-admin.js](file:///c:/Users/LENOVO/Desktop/project_ecica_enProd/scripts/init-admin.js#L90), `contact.routes.js`, `emplois.service.js`
- **Recommandation :**
  S'assurer que les index suivants sont créés en base :
  ```sql
  CREATE INDEX IF NOT EXISTS idx_admin_email ON admin (email);
  CREATE INDEX IF NOT EXISTS idx_contact_created_at ON contact (created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_emplois_created_at ON emplois_du_temps (created_at DESC);
  ```

---

## 🛠️ 5. PLAN D'ACTION & EXTRAITS DE CODE DE REMÉDIATION

### Étape 1 : Installer les modules de sécurité essentiels
```bash
npm install helmet express-rate-limit
npm uninstall mongoose
```

---

### Étape 2 : Sécuriser `app.js` (Headers & Rate Limiting)
```javascript
const express = require("express");
const path = require("node:path");
const compression = require("compression");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
require("./database");
const { authenticateToken } = require("./config/jwt");
const router = require("./routers/index.routes");

const app = express();

// 1. Headers de sécurité HTTP via Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: process.env.NODE_ENV === "production" ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// 2. Limiteur de requêtes global (Protection DoS)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // max 300 requêtes par IP
  standardHeaders: true,
  legacyHeaders: false,
  message: "Trop de requêtes depuis cette adresse IP, veuillez réessayer plus tard."
});
app.use(globalLimiter);

// 3. Compression
app.use(compression({ level: 6, threshold: 1024 }));

// 4. Moteur de Vues
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");
app.enable("view cache");

// 5. Statiques & Parsers
const isProd = process.env.NODE_ENV === "production";
app.use(express.static(path.join(__dirname, "public"), {
  maxAge: isProd ? "7d" : "1h",
  etag: true,
  lastModified: true,
}));

app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use(authenticateToken);

app.use(router);

module.exports = app;
```

---

### Étape 3 : Sécuriser `config/jwt.js` (Blocage strict sans fallback)
```javascript
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === "production") {
  console.error("❌ ERREUR FATALE : JWT_SECRET n'est pas défini dans les variables d'environnement !");
  process.exit(1);
}
const SECRET_KEY = JWT_SECRET || "dev_secret_key_only_for_local_env_9988";

function generateToken(payload, remember = false) {
  const expiresIn = remember ? "7d" : "24h";
  return jwt.sign(payload, SECRET_KEY, { expiresIn });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET_KEY);
  } catch (error) {
    return null;
  }
}
```

---

### Étape 4 : Protéger `/admin/login` et `/contact` contre le Brute-Force
```javascript
// Dans routers/admin.routes.js
const rateLimit = require("express-rate-limit");

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 tentatives par fenêtre
  message: "Trop de tentatives de connexion échouées. Compte temporairement verrouillé pour 15 minutes.",
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/login", loginLimiter, async (req, res) => {
  // Traitement sécurisé sans mot de passe en clair ni fallback en dur
});
```

---

## 📋 6. Matrice Récapitulative & Priorités de Mise en Œuvre

| Priorité | Tâche | Effort | Impact Sécurité / Perf |
| :---: | :--- | :---: | :---: |
| 🚨 **P0** | Supprimer `isPlainMatch` et les identifiants admin en dur | 10 min | 🔴 **Critique** |
| 🚨 **P0** | Forcer `JWT_SECRET` obligatoire depuis l'environnement | 5 min | 🔴 **Critique** |
| ⚡ **P1** | Intégrer `helmet` et `express-rate-limit` | 20 min | 🟠 **Élevé** |
| ⚡ **P1** | Supprimer `.svg` de `multer` et assainir la validation des fichiers | 15 min | 🟠 **Élevé** |
| ☁️ **P1** | Déporter le stockage d'emplois du temps vers un Bucket Cloud / BDD (compatibilité Vercel) | 1-2 h | 🟠 **Élevé** |
| 🧹 **P2** | Nettoyer `mongoose` et les fichiers de modèles vides | 5 min | 🟢 **Faible** |
| 📊 **P2** | Activer Neon connection pooling (`?pgbouncer=true`) | 10 min | 🟢 **Moyen** |

---

*Rapport généré par le moteur d'audit d'ingénierie logicielle Antigravity.*
