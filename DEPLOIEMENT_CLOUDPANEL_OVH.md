# Guide de Déploiement — E.C.I.C.A sur VPS OVH avec CloudPanel

Ce guide récapitule toutes les étapes concrètes et adaptées à votre configuration pour déployer le projet **ECICA** en production.

---

## 📋 Informations Clés de la Configuration

| Paramètre | Valeur |
| :--- | :--- |
| **IP du VPS OVH** | `149.56.213.131` |
| **URL CloudPanel** | `https://149.56.213.131:8443` |
| **Nom de domaine** | `ecica.ml` & `www.ecica.ml` (Point.ml) |
| **Dépôt GitHub** | `https://github.com/Timboliba/ecica.git` |
| **Utilisateur CloudPanel** | `ecica` |
| **Dossier du projet sur le serveur** | `/home/ecica/htdocs/ecica.ml` |
| **Port de l'application** | `3000` |

---

## Étape 1 : Pousser votre code à jour sur GitHub (sur votre PC)

Ouvrez votre terminal PowerShell dans le dossier du projet local et exécutez :

```powershell
git add .
git commit -m "Version finale pour production ECICA"
git push origin main
```

---

## Étape 2 : Créer le site Node.js dans CloudPanel

1. Rendez-vous sur votre interface CloudPanel : `https://149.56.213.131:8443`
2. Cliquez sur **Sites** dans le menu de gauche.
3. Cliquez sur le bouton bleu **+ Add Site** puis sélectionnez **Create a Node.js Site**.
4. Remplissez le formulaire :
   - **Domain Name** : `ecica.ml`
   - **Node.js Version** : `Node.js 20` (ou `Node.js 22`)
   - **App Port** : `3000`
   - **Site User** : `ecica`
   - **Site User Password** : *(définissez un mot de passe sécurisé)*
5. Cliquez sur **Create**.
6. Dans la fiche du site, allez dans l'onglet **Settings** / **Domain Names** et ajoutez l'alias `www.ecica.ml` si nécessaire.

---

## Étape 3 : Connexion SSH et déploiement du code

Connectez-vous à votre serveur en tant que `root` via votre terminal local :

```powershell
ssh root@149.56.213.131
```

Exécutez ensuite les commandes suivantes pour nettoyer le dossier par défaut et cloner votre code :

```bash
cd /home/ecica/htdocs/ecica.ml
rm -rf *
git clone https://github.com/Timboliba/ecica.git .
chown -R ecica:ecica /home/ecica/htdocs/ecica.ml
```

---

## Étape 4 : Configurer le fichier `.env` sur le serveur

Créez le fichier de variables d'environnement de production :

```bash
nano .env
```

Collez-y votre configuration de production (ajustez les identifiants réels) :

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://neondb_owner:VOTRE_MOT_DE_PASSE@ep-xxxx.neon.tech/neondb?sslmode=require
JWT_SECRET=une_cle_secrete_longue_et_aleatoire_de_production
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=contact@ecica.ml
SMTP_PASS=votre_mot_de_passe_application
```

> **Raccourcis Nano :**
> - Pour sauvegarder : appuyez sur `Ctrl + O` puis tapez `Entrée`.
> - Pour quitter : appuyez sur `Ctrl + X`.

Assurez-vous que les permissions appartiennent bien à l'utilisateur `ecica` :

```bash
chown ecica:ecica .env
```

---

## Étape 5 : Installer les dépendances et initialiser les données

Exécutez la commande suivante pour installer les modules Node.js et initialiser les tables/comptes :

```bash
su - ecica -c "cd /home/ecica/htdocs/ecica.ml && npm ci --omit=dev && npm run init:admin && npm run init:emplois"
```

---

## Étape 6 : Ajuster la taille d'upload Nginx (Multer)

Pour permettre l'upload des emplois du temps (PDF) et documents volumineux sans erreur `413 Request Entity Too Large` :

1. Dans CloudPanel, ouvrez le site **ecica.ml**.
2. Cliquez sur l'onglet **Vhost**.
3. À l'intérieur du bloc `server { ... }`, ajoutez la ligne suivante :
   ```nginx
   client_max_body_size 35M;
   ```
4. Cliquez sur **Save**.

---

## Étape 7 : Démarrer l'application Node.js

1. Dans CloudPanel, allez sur l'onglet **Node.js Settings** de votre site.
2. Vérifiez que :
   - **Entry Point** est bien fixé à `app.js`
   - **Port** est bien `3000`
3. Cliquez sur **Restart** (ou **Start**).

---

## Étape 8 : Activer le Certificat SSL Gratuit (HTTPS)

1. Dans CloudPanel, allez dans l'onglet **SSL/TLS**.
2. Cliquez sur **New Let's Encrypt Certificate**.
3. Cochez `ecica.ml` et `www.ecica.ml`.
4. Cliquez sur **Create and Install**.

Votre site sera immédiatement accessible en HTTPS : **`https://ecica.ml`** avec le cadenas sécurisé !

---

## 🔄 Comment mettre à jour le site à l'avenir ?

Lorsque vous modifierez votre code localement :

1. **Sur votre PC :**
   ```powershell
   git add .
   git commit -m "Description des modifications"
   git push origin main
   ```

2. **Sur le serveur (en SSH) :**
   ```bash
   su - ecica -c "cd /home/ecica/htdocs/ecica.ml && git pull origin main && npm ci --omit=dev"
   ```

3. **Dans CloudPanel :**
   - Allez sur l'onglet **Node.js Settings** et cliquez sur le bouton **Restart**.

