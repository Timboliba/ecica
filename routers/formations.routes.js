const routes = require("express").Router();

routes.get("/SystemeEducatif", (req, res, next) => {
  res.render("systeme-educatif", {
    canonicalPath: "/Formation/SystemeEducatif",
    pageTitle: "Système Éducatif - ECICA",
    metaDescription: "Le système éducatif de l'ECICA à Bamako, Mali : filières, niveaux et programmes de formation.",
  });
});

module.exports = routes;
