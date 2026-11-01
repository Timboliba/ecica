const router = require("express").Router();
const bcrypt = require("bcryptjs");
const fs = require("node:fs/promises");
const path = require("node:path");
const rateLimit = require("express-rate-limit");
const { pool } = require("../database");
const { generateToken, requireAdminAuth } = require("../config/jwt");

// Protection anti-bruteforce sur la connexion admin (5 tentatives / 15 min)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return res.status(429).render("admin-login", {
      pageTitle: "Connexion - ECICA",
      cardTitle: req.query.title || "Espace Enseignant",
      error: "Trop de tentatives de connexion échouées. Compte temporairement verrouillé pour 15 minutes.",
    });
  },
});

// Page de login (si déjà connecté, redirige automatiquement vers le cpanel)
router.get("/", (req, res) => {
  if (req.user) {
    return res.redirect("/admin/cpanel");
  }
  res.render("admin-login", {
    pageTitle: "Connexion - ECICA",
    cardTitle: req.query.title || "Espace Enseignant",
    error:
      req.query.error === "session_expired"
        ? "Votre session a expiré. Veuillez vous reconnecter."
        : null,
    success:
      req.query.success === "logged_out"
        ? "Vous avez été déconnecté avec succès."
        : null,
  });
});

router.get("/login", (req, res) => {
  if (req.user) {
    return res.redirect("/admin/cpanel");
  }
  res.render("admin-login", {
    pageTitle: "Connexion - ECICA",
    cardTitle: req.query.title || "Espace Enseignant",
    error:
      req.query.error === "session_expired"
        ? "Votre session a expiré. Veuillez vous reconnecter."
        : null,
    success:
      req.query.success === "logged_out"
        ? "Vous avez été déconnecté avec succès."
        : null,
  });
});

// Traitement de la connexion avec création de session JWT et protection Rate-Limit
router.post("/login", loginLimiter, async (req, res) => {
  const { login, password, remember } = req.body;

  if (!login || !password) {
    return res.render("admin-login", {
      pageTitle: "Connexion - ECICA",
      cardTitle: req.query.title || "Espace Enseignant",
      error: "Veuillez renseigner votre login et mot de passe.",
    });
  }

  try {
    let authenticatedUser = null;

    // 1. Recherche dans la table admin PostgreSQL
    const { rows } = await pool.query(
      `SELECT * FROM admin WHERE (login = $1 OR email = $1) AND (is_active = TRUE OR is_active IS NULL) LIMIT 1;`,
      [login.trim()],
    );

    if (rows.length > 0) {
      const admin = rows[0];
      const isMatch = await bcrypt
        .compare(password, admin.password)
        .catch(() => false);

      if (isMatch) {
        authenticatedUser = {
          id: admin.id,
          login: admin.login,
          email: admin.email || admin.login,
          name: admin.name || "Administrateur ECICA",
          role: admin.role || "superadmin",
        };
      }
    }

    if (authenticatedUser) {
      const isRemember =
        remember === "on" || remember === true || remember === "true";
      const token = generateToken(authenticatedUser, isRemember);

      const maxAge = isRemember ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
      res.cookie("jwt_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: maxAge,
      });

      return res.redirect("/admin/cpanel");
    }

    return res.render("admin-login", {
      pageTitle: "Connexion - ECICA",
      cardTitle: req.query.title || "Espace Enseignant",
      error: "Identifiant ou mot de passe incorrect.",
    });
  } catch (err) {
    console.error("Erreur lors de la connexion admin :", err.message);
    return res.render("admin-login", {
      pageTitle: "Connexion - ECICA",
      cardTitle: req.query.title || "Espace Enseignant",
      error: "Erreur serveur lors de la connexion.",
    });
  }
});

// ==========================================
// ROUTES SPA DE L'ESPACE ADMIN (Protégées JWT)
// ==========================================

// Dashboard principal
router.get("/cpanel", requireAdminAuth, (req, res) => {
  res.render("admin_home", {
    pageTitle: "Dashboard Admin - ECICA",
    user: req.user,
    activeMenu: "dashboard",
  });
});

router.get("/dashboard", requireAdminAuth, (req, res) => {
  res.redirect("/admin/cpanel");
});

// Gestion des utilisateurs et administrateurs
router.get("/users", requireAdminAuth, async (req, res) => {
  try {
    const { rows: admins } = await pool.query(
      `SELECT id, login, email, name, role, is_active, created_at FROM admin ORDER BY id ASC;`,
    );
    res.render("admin_users", {
      pageTitle: "Utilisateurs - ECICA Admin",
      user: req.user,
      admins: admins,
      activeMenu: "users",
    });
  } catch (err) {
    console.error("Erreur récupération utilisateurs :", err.message);
    res.render("admin_users", {
      pageTitle: "Utilisateurs - ECICA Admin",
      user: req.user,
      admins: [],
      activeMenu: "users",
    });
  }
});

// Création d'un nouvel administrateur
router.post("/users", requireAdminAuth, async (req, res) => {
  const { name, login, email, password, role, is_active } = req.body;

  if (!login || !login.trim() || !password || !password.trim()) {
    return res.status(400).json({
      success: false,
      message: "L'identifiant (login) et le mot de passe sont obligatoires.",
    });
  }

  try {
    const trimmedLogin = login.trim();
    const trimmedEmail = email && email.trim() ? email.trim() : null;

    // Vérifier si le login ou l'email existe déjà
    const existing = await pool.query(
      `SELECT id FROM admin WHERE login = $1 OR (email IS NOT NULL AND email = $2) LIMIT 1;`,
      [trimmedLogin, trimmedEmail || trimmedLogin],
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Cet identifiant ou cette adresse email est déjà utilisé(e).",
      });
    }

    const hashedPassword = await bcrypt.hash(password.trim(), 10);
    const activeBool =
      is_active === "true" ||
      is_active === true ||
      is_active === "1" ||
      is_active === "on";

    const { rows } = await pool.query(
      `INSERT INTO admin (name, login, email, password, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING id, name, login, email, role, is_active, created_at;`,
      [
        name && name.trim() ? name.trim() : null,
        trimmedLogin,
        trimmedEmail,
        hashedPassword,
        role || "admin",
        activeBool,
      ],
    );

    const isAjax =
      req.xhr ||
      req.headers["x-requested-with"] === "SPA" ||
      (req.headers.accept && req.headers.accept.includes("application/json")) ||
      req.is("application/json");

    if (!isAjax) {
      return res.redirect("/admin/users");
    }

    return res.status(201).json({
      success: true,
      message: "Nouvel administrateur créé avec succès !",
      admin: rows[0],
    });
  } catch (err) {
    console.error("Erreur création administrateur :", err.message);
    const isAjax =
      req.xhr ||
      req.headers["x-requested-with"] === "SPA" ||
      (req.headers.accept && req.headers.accept.includes("application/json")) ||
      req.is("application/json");
    if (!isAjax) {
      return res.redirect("/admin/users?error=create_failed");
    }
    return res.status(500).json({
      success: false,
      message:
        "Erreur serveur lors de la création de l'administrateur : " +
        err.message,
    });
  }
});

// Modification d'un administrateur existant
const updateAdminHandler = async (req, res) => {
  const adminId = parseInt(req.params.id || req.body.id, 10);
  if (isNaN(adminId)) {
    return res
      .status(400)
      .json({ success: false, message: "ID d'administrateur invalide." });
  }

  const { name, login, email, password, role, is_active } = req.body;

  if (!login || !login.trim()) {
    return res.status(400).json({
      success: false,
      message: "L'identifiant (login) est obligatoire.",
    });
  }

  try {
    const trimmedLogin = login.trim();
    const trimmedEmail = email && email.trim() ? email.trim() : null;

    // Vérifier l'existence
    const target = await pool.query(`SELECT id FROM admin WHERE id = $1;`, [
      adminId,
    ]);
    if (target.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Administrateur introuvable." });
    }

    // Vérifier conflit d'identifiant avec un autre administrateur
    const conflict = await pool.query(
      `SELECT id FROM admin WHERE (login = $1 OR (email IS NOT NULL AND email = $2)) AND id != $3 LIMIT 1;`,
      [trimmedLogin, trimmedEmail || trimmedLogin, adminId],
    );

    if (conflict.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cet identifiant ou cette adresse email est déjà attribué(e) à un autre compte.",
      });
    }

    const activeBool =
      is_active === "true" ||
      is_active === true ||
      is_active === "1" ||
      is_active === "on";

    let updatedRows;
    if (password && password.trim().length > 0) {
      const hashedPassword = await bcrypt.hash(password.trim(), 10);
      const result = await pool.query(
        `UPDATE admin
         SET name = $1, login = $2, email = $3, password = $4, role = $5, is_active = $6, updated_at = NOW()
         WHERE id = $7
         RETURNING id, name, login, email, role, is_active, updated_at;`,
        [
          name && name.trim() ? name.trim() : null,
          trimmedLogin,
          trimmedEmail,
          hashedPassword,
          role || "admin",
          activeBool,
          adminId,
        ],
      );
      updatedRows = result.rows;
    } else {
      const result = await pool.query(
        `UPDATE admin
         SET name = $1, login = $2, email = $3, role = $4, is_active = $5, updated_at = NOW()
         WHERE id = $6
         RETURNING id, name, login, email, role, is_active, updated_at;`,
        [
          name && name.trim() ? name.trim() : null,
          trimmedLogin,
          trimmedEmail,
          role || "admin",
          activeBool,
          adminId,
        ],
      );
      updatedRows = result.rows;
    }

    const isAjax =
      req.xhr ||
      req.headers["x-requested-with"] === "SPA" ||
      (req.headers.accept && req.headers.accept.includes("application/json")) ||
      req.is("application/json");

    if (!isAjax) {
      return res.redirect("/admin/users");
    }

    return res.json({
      success: true,
      message: "Administrateur mis à jour avec succès !",
      admin: updatedRows[0],
    });
  } catch (err) {
    console.error("Erreur modification administrateur :", err.message);
    const isAjax =
      req.xhr ||
      req.headers["x-requested-with"] === "SPA" ||
      (req.headers.accept && req.headers.accept.includes("application/json")) ||
      req.is("application/json");
    if (!isAjax) {
      return res.redirect("/admin/users?error=update_failed");
    }
    return res.status(500).json({
      success: false,
      message:
        "Erreur serveur lors de la modification de l'administrateur : " +
        err.message,
    });
  }
};

router.post("/users/edit", requireAdminAuth, updateAdminHandler);
router.post("/users/:id/edit", requireAdminAuth, updateAdminHandler);
router.put("/users/:id", requireAdminAuth, updateAdminHandler);

// Suppression d'un administrateur
router.delete("/users/:id", requireAdminAuth, async (req, res) => {
  const adminId = parseInt(req.params.id, 10);
  if (isNaN(adminId)) {
    return res.status(400).json({ success: false, message: "ID d'administrateur invalide." });
  }

  if (req.user && req.user.id === adminId) {
    return res.status(400).json({
      success: false,
      message: "Vous ne pouvez pas supprimer votre propre compte actuellement connecté.",
    });
  }

  try {
    const check = await pool.query(`SELECT id FROM admin WHERE id = $1;`, [adminId]);
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Administrateur introuvable." });
    }

    await pool.query(`DELETE FROM admin WHERE id = $1;`, [adminId]);
    return res.json({ success: true, message: "Administrateur supprimé avec succès." });
  } catch (err) {
    console.error("Erreur suppression administrateur :", err.message);
    return res.status(500).json({
      success: false,
      message: "Erreur serveur lors de la suppression : " + err.message,
    });
  }
});

router.post("/users/:id/delete", requireAdminAuth, async (req, res) => {
  const adminId = parseInt(req.params.id, 10);
  if (isNaN(adminId)) {
    return res.status(400).json({ success: false, message: "ID d'administrateur invalide." });
  }

  if (req.user && req.user.id === adminId) {
    return res.status(400).json({
      success: false,
      message: "Vous ne pouvez pas supprimer votre propre compte actuellement connecté.",
    });
  }

  try {
    await pool.query(`DELETE FROM admin WHERE id = $1;`, [adminId]);
    const isAjax =
      req.xhr ||
      req.headers["x-requested-with"] === "SPA" ||
      (req.headers.accept && req.headers.accept.includes("application/json")) ||
      req.is("application/json");

    if (!isAjax) {
      return res.redirect("/admin/users");
    }

    return res.json({ success: true, message: "Administrateur supprimé avec succès." });
  } catch (err) {
    console.error("Erreur suppression administrateur :", err.message);
    return res.status(500).json({
      success: false,
      message: "Erreur serveur lors de la suppression : " + err.message,
    });
  }
});

// Gestion des contenus
const contentsService = require("../services/contents.service");
const { uploadContentImage } = require("../config/multer.config");

router.get("/contents", requireAdminAuth, async (req, res, next) => {
  try {
    const contents = await contentsService.getAllContents();
    res.render("admin_contents", {
      pageTitle: "Contenus & Formations - ECICA Admin",
      user: req.user,
      activeMenu: "contents",
      contents,
    });
  } catch (err) {
    next(err);
  }
});

// Ajout d'un nouveau contenu (publication, formation, événement, annonce)
router.post("/contents", requireAdminAuth, (req, res, next) => {
  uploadContentImage.single("image")(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    try {
      const { title, summary, body, category, status, published_at } = req.body;

      if (!title || !title.trim()) {
        return res.status(400).json({ success: false, message: "Le titre est obligatoire." });
      }
      if (!contentsService.CATEGORIES[category]) {
        return res.status(400).json({ success: false, message: "Veuillez choisir une catégorie valide." });
      }

      let publishedAt = null;
      if (published_at) {
        const d = new Date(published_at);
        if (isNaN(d.getTime())) {
          return res.status(400).json({ success: false, message: "Date de publication invalide." });
        }
        publishedAt = d.toISOString();
      }

      const item = await contentsService.addContent({
        title: title.trim(),
        summary: summary?.trim(),
        body: body?.trim(),
        category,
        status,
        publishedAt,
        image: req.file ? req.file.filename : null,
        author: req.user?.name,
        authorRole: req.user?.role === "superadmin" ? "Super Administrateur" : "Administrateur",
      });

      return res.status(201).json({
        success: true,
        message: "Contenu ajouté avec succès !",
        item,
      });
    } catch (error) {
      next(error);
    }
  });
});

// Paramètres
router.get("/settings", requireAdminAuth, async (req, res) => {
  try {
    let dbUser = req.user;
    if (req.user && req.user.id) {
      const { rows } = await pool.query(
        `SELECT id, login, email, name, role, is_active, created_at FROM admin WHERE id = $1 LIMIT 1;`,
        [req.user.id]
      );
      if (rows.length > 0) {
        dbUser = { ...req.user, ...rows[0] };
      }
    }
    res.render("admin_settings", {
      pageTitle: "Paramètres - ECICA Admin",
      user: dbUser,
      activeMenu: "settings",
    });
  } catch (err) {
    console.error("Erreur chargement paramètres :", err.message);
    res.render("admin_settings", {
      pageTitle: "Paramètres - ECICA Admin",
      user: req.user,
      activeMenu: "settings",
    });
  }
});

// Sauvegarde des informations de profil
router.post("/settings/profile", requireAdminAuth, async (req, res) => {
  const { name, email, role } = req.body;
  if (!req.user || !req.user.id) {
    return res.status(401).json({ success: false, message: "Non authentifié." });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE admin
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           updated_at = NOW()
       WHERE id = $3
       RETURNING id, login, email, name, role, is_active, updated_at;`,
      [name && name.trim() ? name.trim() : null, email && email.trim() ? email.trim() : null, req.user.id]
    );

    const isAjax =
      req.xhr ||
      req.headers["x-requested-with"] === "SPA" ||
      (req.headers.accept && req.headers.accept.includes("application/json")) ||
      req.is("application/json");

    if (!isAjax) {
      return res.redirect("/admin/settings?success=profile_saved");
    }

    return res.json({
      success: true,
      message: "Profil mis à jour avec succès !",
      user: rows[0],
    });
  } catch (err) {
    console.error("Erreur mise à jour profil :", err.message);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la mise à jour du profil : " + err.message,
    });
  }
});

// Sauvegarde de l'entreprise
router.post("/settings/company", requireAdminAuth, (req, res) => {
  return res.json({
    success: true,
    message: "Informations de l'entreprise enregistrées avec succès !",
  });
});

// Analytics
router.get("/analytics", requireAdminAuth, (req, res) => {
  res.render("admin_generic", {
    pageTitle: "Analytics - ECICA Admin",
    user: req.user,
    activeMenu: "analytics",
    sectionTitle: "Analytics & Fréquentation",
    sectionSubtitle:
      "Statistiques des visites et consultations des formations.",
  });
});

const emploisService = require("../services/emplois.service");
const { uploadEmploi } = require("../config/multer.config");

// Gestion Emploi du temps (Admin)
const handleEmploisAdmin = async (req, res, next) => {
  try {
    const classes = await emploisService.getAllEmplois();

    res.render("admin_emplois", {
      pageTitle: "Gestion des Emplois du temps - ECICA Admin",
      user: req.user,
      activeMenu: "crm",
      classes,
    });
  } catch (err) {
    next(err);
  }
};

router.get("/crm", requireAdminAuth, handleEmploisAdmin);
router.get("/emplois", requireAdminAuth, handleEmploisAdmin);

// Admin POST: Ajouter un emploi du temps
router.post("/emplois/add", requireAdminAuth, (req, res, next) => {
  uploadEmploi.single("file")(req, res, async (err) => {
    if (err) {
      if (req.xhr || req.headers.accept?.includes("application/json")) {
        return res.status(400).json({ error: err.message });
      }
      return res.redirect("/admin/emplois?error=" + encodeURIComponent(err.message));
    }

    try {
      const { name, description, badge } = req.body;
      if (!name || !name.trim()) {
        const errorMsg = "Le nom de la classe est requis.";
        if (req.xhr || req.headers.accept?.includes("application/json")) {
          return res.status(400).json({ error: errorMsg });
        }
        return res.redirect("/admin/emplois?error=" + encodeURIComponent(errorMsg));
      }

      if (!req.file) {
        const errorMsg = "Veuillez sélectionner un fichier (Word, PDF, Excel ou Image).";
        if (req.xhr || req.headers.accept?.includes("application/json")) {
          return res.status(400).json({ error: errorMsg });
        }
        return res.redirect("/admin/emplois?error=" + encodeURIComponent(errorMsg));
      }

      const newItem = await emploisService.addEmploi({
        name: name.trim(),
        description: description?.trim() || "—",
        badge: badge?.trim(),
        file: req.file.filename,
        fileSize: req.file.size,
      });

      if (req.xhr || req.headers.accept?.includes("application/json")) {
        return res.status(201).json({
          success: true,
          message: "Emploi du temps ajouté avec succès !",
          item: newItem,
        });
      }

      res.redirect("/admin/emplois?success=1");
    } catch (error) {
      next(error);
    }
  });
});

// Admin POST: Modifier un emploi du temps
const handleEditEmploi = (req, res, next) => {
  uploadEmploi.single("file")(req, res, async (err) => {
    if (err) {
      if (req.xhr || req.headers.accept?.includes("application/json")) {
        return res.status(400).json({ error: err.message });
      }
      return res.redirect("/admin/emplois?error=" + encodeURIComponent(err.message));
    }

    try {
      const { id } = req.params;
      const { name, description, badge } = req.body;

      if (!name || !name.trim()) {
        const errorMsg = "Le nom de la classe est requis.";
        if (req.xhr || req.headers.accept?.includes("application/json")) {
          return res.status(400).json({ error: errorMsg });
        }
        return res.redirect("/admin/emplois?error=" + encodeURIComponent(errorMsg));
      }

      const updatePayload = {
        name: name.trim(),
        description: description !== undefined ? description.trim() : undefined,
        badge: badge?.trim(),
      };

      if (req.file) {
        updatePayload.file = req.file.filename;
        updatePayload.fileSize = req.file.size;
      }

      const updatedItem = await emploisService.updateEmploi(id, updatePayload);

      if (!updatedItem) {
        const errorMsg = "Emploi du temps non trouvé.";
        if (req.xhr || req.headers.accept?.includes("application/json")) {
          return res.status(404).json({ error: errorMsg });
        }
        return res.redirect("/admin/emplois?error=" + encodeURIComponent(errorMsg));
      }

      if (req.xhr || req.headers.accept?.includes("application/json")) {
        return res.json({
          success: true,
          message: "Emploi du temps modifié avec succès !",
          item: updatedItem,
        });
      }

      res.redirect("/admin/emplois?success=updated");
    } catch (error) {
      next(error);
    }
  });
};

router.post("/emplois/edit/:id", requireAdminAuth, handleEditEmploi);
router.put("/emplois/:id", requireAdminAuth, handleEditEmploi);

// Admin POST/DELETE: Supprimer un emploi du temps
router.post("/emplois/delete/:id", requireAdminAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await emploisService.deleteEmploi(id);

    if (req.xhr || req.headers.accept?.includes("application/json")) {
      return res.json({ success: deleted, message: deleted ? "Emploi du temps supprimé." : "Non trouvé." });
    }

    res.redirect("/admin/emplois");
  } catch (error) {
    next(error);
  }
});
router.delete("/emplois/:id", requireAdminAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await emploisService.deleteEmploi(id);
    return res.json({ success: deleted, message: deleted ? "Emploi du temps supprimé." : "Non trouvé." });
  } catch (error) {
    next(error);
  }
});

// Rendez-vous
router.get("/appointments", requireAdminAuth, (req, res) => {
  res.render("admin_generic", {
    pageTitle: "Rendez-vous - ECICA Admin",
    user: req.user,
    activeMenu: "appointments",
    sectionTitle: "Rendez-vous & Calendrier",
    sectionSubtitle:
      "Planning des entretiens d'admission et rencontres pédagogiques.",
  });
});

// Projets
router.get("/projects", requireAdminAuth, (req, res) => {
  res.render("admin_generic", {
    pageTitle: "Projets - ECICA Admin",
    user: req.user,
    activeMenu: "projects",
    sectionTitle: "Projets & Partenariats",
    sectionSubtitle: "Gestion des projets industriels et académiques en cours.",
  });
});

// Demandes
router.get("/requests", requireAdminAuth, (req, res) => {
  res.render("admin_generic", {
    pageTitle: "Demandes - ECICA Admin",
    user: req.user,
    activeMenu: "requests",
    sectionTitle: "Demandes d'inscription & Contacts",
    sectionSubtitle:
      "Traitement des dossiers et requêtes reçues via le portail.",
  });
});

// Déconnexion
router.get("/logout", (req, res) => {
  res.clearCookie("jwt_token");
  res.redirect("/admin/login?success=logged_out");
});

module.exports = router;
