const router = require("express").Router();

router.get("/", (req, res, next) => {
  res.render("contact");
});

module.exports = router;
