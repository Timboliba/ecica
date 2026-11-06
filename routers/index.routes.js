const router = require("express").Router();
const student = require("./espaceStudent.routes");
const teacher = require("./espaceTeacher.routes");
const presentation = require("./presentations.routes");
const contact = require("./contact.routes");
const liens = require("./liens.routes");
const systemeEducatif = require("./formations.routes");
const emploisDuTemps = require("./emplois-list.routes");
const admin = require("./admin.routes");
const formationsService = require("../services/formations.service");
const user = { name: "joen doe" };

router.get("/", async (req, res, next) => {
  try {
    const formations = await formationsService.getAllFormations();
    res.render("acceuil", {
      user,
      canonicalPath: "/",
      pageTitle: "ECICA - École Centrale pour l'Industrie, le Commerce et l'Administration",
      metaDescription: "L'ECICA est une école privée de référence à Bamako, Mali. Formations professionnelles en industrie, commerce, administration et informatique.",
      formations,
    });
  } catch (err) {
    next(err);
  }
});

router.use("/admin", admin);
router.use("/student", student);
router.use("/teacher", teacher);
router.use("/presentation", presentation);
router.use("/contact", contact);
router.use("/Liens", liens);
router.use("/Emplois", emploisDuTemps);
router.use("/Formation", systemeEducatif);

// Redirection directe vers la page des détails de formation
router.get("/detailsFormation", (req, res) => {
  const query = req.url.includes("?") ? req.url.substring(req.url.indexOf("?")) : "";
  res.redirect(302, `/Formation/detailsFormation${query}`);
});

module.exports = router;
