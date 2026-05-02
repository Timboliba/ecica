const router = require("express").Router();

router.get("/", (req, res) => {
  res.render("student");
});

router.get("/register", (req, res) => {
  res.render("acceuil");
});

router.get("/notes", (req, res) => {
  res.render("acceuil");
});

router.get("/register", (req, res) => {
  res.render("acceuil");
});

module.exports = router;
