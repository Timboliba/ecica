const router = require("express").Router();
const app = require("../app");

router.get("/", (req, res, next) => {
  res.render("contact");
});

module.exports = router;
