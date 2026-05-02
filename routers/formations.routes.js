const routes = require("express").Router();
routes.get("/SystemeEducatif", (req, res, next) => {
  res.render("systeme-educatif");
});
module.exports = routes;
