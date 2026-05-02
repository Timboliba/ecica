const router = require("express").Router();
const app = require("../app");

router.get("/", (req, res, next) => {
  res.render("liens");
});

module.exports = router;
