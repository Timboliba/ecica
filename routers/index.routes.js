const router = require("express").Router();
const student = require("./espaceStudent.routes");
const teacher = require("./espaceTeacher.routes");
const presentation = require("./presentations.routes");
const contact = require("./contact.routes");
const liens = require("./liens.routes");
const systemeEducatif = require("./formations.routes");
const emploisDuTemps = require("./emplois-list.routes");
const admin = require("./admin.routes");
const user = { name: "joen doe" };

router.get("/", (req, res) => {
  res.render("acceuil", {
    user,
    canonicalPath: "/",
    pageTitle: "ECICA - École Centrale pour l'Industrie, le Commerce et l'Administration",
    metaDescription: "L'ECICA est une école privée de référence à Bamako, Mali. Formations professionnelles en industrie, commerce, administration et informatique.",
  });
});

router.use("/admin", admin);
router.use("/student", student);
router.use("/teacher", teacher);
router.use("/presentation", presentation);
router.use("/contact", contact);
router.use("/Liens", liens);
router.use("/Emplois", emploisDuTemps);
router.use("/Formation", systemeEducatif);

module.exports = router;
