const router = require("express").Router();
const reglementsService = require("../services/reglements.service");

router.get("/Presentation", (req, res) => {
  res.render("presentation", {
    canonicalPath: "/presentation/Presentation",
    pageTitle: "Présentation - ECICA",
    metaDescription: "Découvrez l'ECICA, école privée à Bamako, Mali. Histoire, mission et valeurs de l'établissement.",
  });
});

router.get("/MotDirecteur", (req, res) => {
  res.render("mot_du_directeur", {
    canonicalPath: "/presentation/MotDirecteur",
    pageTitle: "Mot du Directeur - ECICA",
    metaDescription: "Lisez le mot du directeur de l'ECICA, école de référence à Bamako, Mali.",
  });
});

router.get("/Administration", (req, res) => {
  res.render("administration", {
    canonicalPath: "/presentation/Administration",
    pageTitle: "Administration - ECICA",
    metaDescription: "L'équipe administrative de l'ECICA à Bamako, Mali.",
  });
});

router.get("/lois", async (req, res, next) => {
  try {
    const reglements = await reglementsService.getAllReglements();
    res.render("lois", {
      canonicalPath: "/presentation/lois",
      pageTitle: "Lois & Règlements - ECICA",
      metaDescription: "Cadre légal, décrets officiels et règlements intérieurs de l'ECICA à Bamako, Mali.",
      reglements,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/historique", (req, res) => {
  res.render("historiques", {
    canonicalPath: "/presentation/historique",
    pageTitle: "Historique - ECICA",
    metaDescription: "L'histoire de l'ECICA, fondée à Bamako, Mali, et son évolution au fil des années.",
  });
});

module.exports = router;
