# Guide Complet de Déploiement et Mise en Ligne — E.C.I.C.A

Ce document détaille la démarche pour mettre en ligne le site web de l'**E.C.I.C.A** (École Centrale pour l'Industrie, le Commerce et l'Administration), le type de serveur adapté à ses besoins, ainsi que les étapes techniques pas-à-pas.

---

## 1. Analyse Technique du Projet

Avant de choisir un serveur, voici les caractéristiques clés de votre application :

| Composant | Technologie utilisée | Impact sur le déploiement |
| :--- | :--- | :--- |
| **Backend** | Node.js (v20 ou v22), Express 4 | Nécessite un environnement d'exécution Node.js persistant |
| **Moteur de rendu** | Pug (SSR - Server Side Rendering) | Rendu côté serveur dynamique |
| **Base de données** | PostgreSQL Cloud (hébergé sur **Neon**) | Déjà accessible depuis n'importe quel serveur via SSL (aucun SGBD local obligatoire à installer) |
| **Gestion des uploads** | Multer (`public/emplois/`, `public/uploads/`) | **Point critique :** requiert un **disque persistant** pour que les emplois du temps et images uploadés ne disparaissent pas |
| **Sécurité** | Helmet, Rate-Limit, JWT HttpOnly, Bcrypt | Prêt pour un environnement de production sécurisé |

---

## 2. Quel Type de Serveur Choisir ?

### Option 1 : Serveur Dédié Virtuel — VPS Linux (Recommandé ★★★★★)

C'est la solution **la plus adaptée, la plus pérenne et la plus économique** pour une institution comme l'E.C.I.C.A.

* **Fournisseurs recommandés** :
  * **Hostinger VPS** : ~5 à 7 € / mois (très simple à configurer, support réactif).
  * **OVHcloud (VPS Starter ou Value)** : ~4 à 8 € / mois (data centers fiables et sécurisés).
  * **Hetzner Cloud (CX22 / CPX21)** : ~4 à 7 € / mois (excellentes performances).
* **Configuration minimale recommandée** :
  * **Système d'exploitation** : Ubuntu 22.04 LTS ou 24.04 LTS
  * **RAM** : 2 Go minimum (1 Go peut suffire mais 2 Go garantit une grande fluidité)
  * **vCPU** : 1 ou 2 cœurs
  * **Stockage** : 20 à 40 Go SSD / NVMe (amplement suffisant pour le code et les fichiers PDF/images)
* **Avantages** :
  * Vos fichiers téléversés (emplois du temps, photos) sont stockés durablement sur le disque dur.
  * Certificat SSL (HTTPS) gratuit à vie via Let's Encrypt / Certbot.
  * Adresse IP dédiée fixe, idéale pour lier le nom de domaine officiel (ex: `ecica.edu.ml` ou `ecica.ml`).
  * Coût maîtrisé et fixe sans mauvaise surprise de facturation à l'usage.

---

### Option 2 : Plateforme Cloud PaaS (Render ou Railway) (Alternative moderne ★★★★☆)

Si vous ne souhaitez pas administrer de serveur Linux (pas de configuration Nginx ou SSH) :

* **Plateforme** : [Render.com](https://render.com) ou [Railway.app](https://railway.app)
* **Plan** : Plan Web Service Node.js + **Persistent Disk** (Disque persistant obligatoire).
* **Attention** : Les plans gratuits "Serverless" sans disque persistant (comme Vercel pur sans S3) suppriment les fichiers uploadés par Multer dès que le serveur redémarre. Si vous choisissez Render, vous devez configurer un "Disk" attaché à `/app/public/emplois`.

---

## 3. Prérequis à la Mise en Ligne

1. **Un Nom de Domaine** (ex. `ecica.edu.ml`, `ecica-mali.com`, `ecica.ml`) :
   * Acheté chez l'AGETIC / NIC.ML (pour les domaines nationaux maliens `.edu.ml` ou `.ml`) ou chez Namecheap / OVH / Hostinger.
2. **Un Compte GitHub ou GitLab** :
   * Dépôt privé contenant le code du projet à jour.
3. **Les variables d'environnement de production** :
   * La chaîne de connexion Neon PostgreSQL (`DATABASE_URL`).
   * La clé secrète JWT (`JWT_SECRET`).
   * Les identifiants SMTP pour les emails de contact (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`).

---

## 4. Guide Pas-à-Pas de Déploiement sur un VPS Ubuntu

Voici la procédure complète pour installer et publier votre site sur un VPS Ubuntu :

### Étape 1 : Connexion et mise à jour du VPS

Connectez-vous à votre serveur via votre terminal (PowerShell, Git Bash ou PuTTY) :

```bash
ssh root@IP_DE_VOTRE_SERVEUR
```

Mettez à jour le système d'exploitation :

```bash
sudo apt update && sudo apt upgrade -y
```

---

### Étape 2 : Installer Node.js 22 LTS, Git et PM2

Installez Node.js depuis le dépôt officiel NodeSource :

```bash
# Installation de curl et git
sudo apt install -y curl git ufw

# Ajout du dépôt Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -

# Installation de Node.js
sudo apt install -y nodejs

# Vérification des versions
node -v
npm -v

# Installation de PM2 (gestionnaire de processus pour maintenir le site actif 24h/24)
sudo npm install -g pm2
```

---

### Étape 3 : Cloner le projet et installer les dépendances

Placez-vous dans le dossier `/var/www` :

```bash
sudo mkdir -p /var/www
cd /var/www

# Cloner votre dépôt GitHub
sudo git clone https://github.com/votre-nom-utilisateur/project_ecica_enProd.git ecica

# Donner les permissions à l'utilisateur courant
sudo chown -R $USER:$USER /var/www/ecica
cd /var/www/ecica

# Installer uniquement les dépendances nécessaires à la production
npm ci --omit=dev
```

---

### Étape 4 : Configurer l'environnement de production (.env)

Créez le fichier `.env` sur le serveur :

```bash
nano .env
```

Collez vos variables de production :

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://neondb_owner:VOTRE_MOT_DE_PASSE@ep-xxxx.neon.tech/neondb?sslmode=require
JWT_SECRET=une_cle_secrete_tres_longue_et_aleatoire_de_production
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=contact@ecica.edu.ml
SMTP_PASS=mot_de_passe_application_securise
```

Sauvegardez en faisant `Ctrl + O`, `Entrée`, puis quittez avec `Ctrl + X`.

Initialisez les administrateurs et répertoires de données si besoin :
```bash
node scripts/init-admin.js
```

---

### Étape 5 : Lancer l'application avec PM2

PM2 permet de garder l'application en cours d'exécution en continu, de la redémarrer automatiquement en cas d'erreur ou après un redémarrage du serveur :

```bash
# Lancement de l'application
pm2 start app.js --name "ecica-web"

# Sauvegarde de la liste des processus
pm2 save

# Configuration du redémarrage automatique au boot du serveur
pm2 startup
# (Exécutez la ligne de commande que PM2 vous affiche à l'écran)
```

Commandes utiles pour surveiller votre serveur :
* Voir le statut : `pm2 status`
* Voir les logs en direct : `pm2 logs ecica-web`
* Redémarrer le site : `pm2 reload ecica-web`

---

### Étape 6 : Installer et Configurer Nginx (Reverse Proxy)

Nginx servira de serveur frontal : il reçoit les requêtes Web sur les ports 80/443 (HTTP/HTTPS) et les redirige de manière ultra-rapide vers Node.js sur le port 3000.

1. Installer Nginx :
```bash
sudo apt install -y nginx
```

2. Créer le fichier de configuration pour le site de l'E.C.I.C.A :
```bash
sudo nano /etc/nginx/sites-available/ecica
```

Collez la configuration suivante (remplacez `ecica.edu.ml` par votre domaine ou l'adresse IP de votre serveur) :

```nginx
server {
    listen 80;
    server_name ecica.edu.ml www.ecica.edu.ml;

    # Limite de taille pour les uploads de fichiers (emplois du temps PDF, etc.)
    client_max_body_size 35M;

    # Servir directement les fichiers statiques pour des performances optimales
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

3. Activer le site et tester la configuration :
```bash
sudo ln -s /etc/nginx/sites-available/ecica /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

### Étape 7 : Configurer le Domaine (DNS) et le Certificat SSL Gratuit (HTTPS)

1. **Lier le domaine (DNS)** :
   * Chez votre registraire de domaine, créez un enregistrement de type **A** :
     * **Nom / Hôte** : `@` ➔ **Valeur** : `IP_DE_VOTRE_VPS`
     * **Nom / Hôte** : `www` ➔ **Valeur** : `IP_DE_VOTRE_VPS`

2. **Installer le certificat SSL HTTPS gratuit (Certbot Let's Encrypt)** :
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d ecica.edu.ml -d www.ecica.edu.ml
```

Certbot configure automatiquement le renouvellement automatique et redirige tout le trafic HTTP vers HTTPS sécurisé.

---

### Étape 8 : Sécuriser le Serveur avec le Pare-feu UFW

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## 5. Comment Mettre à Jour le Site après une Modification de Code ?

Une fois le serveur en place, le flux de mise à jour quotidien devient extrêmement simple :

1. Sur votre PC local, committez et poussez vos modifications :
   ```bash
   git add .
   git commit -m "Mise à jour des formations"
   git push origin main
   ```
2. Sur votre serveur VPS :
   ```bash
   cd /var/www/ecica
   git pull origin main
   npm ci --omit=dev # (si vous avez ajouté de nouvelles dépendances)
   pm2 reload ecica-web
   ```
*(Cette procédure peut même être 100% automatisée via un webhook GitHub Actions en quelques minutes).*

---

## 6. Synthèse des Recommandations Financières et Techniques

| Élément | Fournisseur suggéré | Coût indicatif |
| :--- | :--- | :--- |
| **Nom de domaine** | Registraire local (.edu.ml / .ml) ou Hostinger | 10 à 25 € / an |
| **Serveur VPS Linux** | Hostinger, OVHcloud ou Hetzner (Ubuntu 24.04, 2 Go RAM) | ~5 à 8 € / mois |
| **Base de Données** | Neon PostgreSQL (actuellement connecté) | Gratuit (Tier gratuit généreux) ou 19 $/mois |
| **Certificat SSL (HTTPS)**| Let's Encrypt / Certbot | **Gratuit** |
| **Total annuel estimé** | | **~70 à 100 € / an tout inclus** |
