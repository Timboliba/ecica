const router = require("express").Router();

router.get("/Presentation", (req, res) => {
  res.render("presentation");
});

router.get("/MotDirecteur", (req, res) => {
  res.render("mot_du_directeur");
});

router.get("/Administration", (req, res) => {
  res.render("administration");
});

router.get("/lois", (req, res) => {
  res.render("lois");
});

router.get("/historique", (req, res) => {
  res.render("historiques");
});
module.exports = router;
