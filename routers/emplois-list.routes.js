const router = require("express").Router();
const emploisService = require("../services/emplois.service");

// GET /Emplois - Consultation publique des emplois du temps
router.get("/", async (req, res, next) => {
  try {
    const classes = await emploisService.getAllEmplois();
    res.render("emploisList.pug", {
      pageTitle: "Emplois du temps - ECICA",
      classes,
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
