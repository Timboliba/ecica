const router = require("express").Router();

router.get("/", (req, res, next) => {
  res.render("liens", {
    canonicalPath: "/Liens",
    pageTitle: "Liens Utiles - ECICA",
    metaDescription: "Liens utiles pour les élèves et enseignants de l'ECICA : ressources éducatives, partenaires et administrations.",
  });
});

module.exports = router;
