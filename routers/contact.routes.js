const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const { pool } = require("../database");

// Limiteur de requêtes anti-spam (5 messages max par heure par IP)
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const errorMsg = "Trop de messages envoyés depuis cette adresse. Veuillez patienter avant de renvoyer un message.";
    if (req.xhr || req.headers.accept?.includes("application/json")) {
      return res.status(429).json({ success: false, message: errorMsg });
    }
    return res.status(429).redirect(`/contact?error=${encodeURIComponent(errorMsg)}`);
  },
});

// Page de contact (GET)
router.get("/", async (req, res, next) => {
  try {
    let contactInfo = {
      adresse_postale: "BP:1828",
      fax: "20 22 26 91",
      telephone: "20 22 26 91",
      email: "contact@ecica.edu.ml",
      nom_etablissement: "E.C.I.C.A",
      latitude: 12.6549,
      longitude: -7.9965,
    };

    try {
      const { rows } = await pool.query(
        "SELECT * FROM contact_info ORDER BY id ASC LIMIT 1;"
      );
      if (rows.length > 0) {
        contactInfo = { ...contactInfo, ...rows[0] };
      }
    } catch (dbErr) {
      console.warn(
        "⚠️ Impossible de charger contact_info depuis la base :",
        dbErr.message
      );
    }

    res.render("contact", {
      pageTitle: "Contactez-nous - ECICA",
      metaDescription: "Contactez l'ECICA à Bamako, Mali. Téléphone, adresse, fax et formulaire de contact en ligne.",
      canonicalPath: "/contact",
      contactInfo,
      success: req.query.success === "1",
      error: req.query.error || null,
    });
  } catch (error) {
    next(error);
  }
});

// Traitement du formulaire de contact (POST) avec protection anti-spam
router.post("/", contactLimiter, async (req, res) => {
  const { fullname, email, sujet, message } = req.body;

  if (!fullname || !email || !sujet || !message) {
    const errorMsg = "Veuillez remplir tous les champs obligatoires.";
    if (req.xhr || req.headers.accept?.includes("application/json")) {
      return res.status(400).json({ success: false, message: errorMsg });
    }
    return res.redirect(`/contact?error=${encodeURIComponent(errorMsg)}`);
  }

  try {
    const insertQuery = `
      INSERT INTO contact (fullname, email, sujet, message)
      VALUES ($1, $2, $3, $4)
      RETURNING id, created_at;
    `;
    const { rows } = await pool.query(insertQuery, [
      fullname.trim(),
      email.trim(),
      sujet.trim(),
      message.trim(),
    ]);

    if (req.xhr || req.headers.accept?.includes("application/json")) {
      return res.status(201).json({
        success: true,
        message: "Votre message a été envoyé avec succès !",
        id: rows[0].id,
      });
    }

    return res.redirect("/contact?success=1");
  } catch (error) {
    console.error("❌ Erreur lors de l'enregistrement du message de contact :", error.message);
    const errorMsg = "Une erreur est survenue lors de l'envoi de votre message.";
    if (req.xhr || req.headers.accept?.includes("application/json")) {
      return res.status(500).json({ success: false, message: errorMsg });
    }
    return res.redirect(`/contact?error=${encodeURIComponent(errorMsg)}`);
  }
});

module.exports = router;
