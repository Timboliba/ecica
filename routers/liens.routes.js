const router = require("express").Router();

router.get("/", (req, res, next) => {
  res.render("liens");
});

module.exports = router;
