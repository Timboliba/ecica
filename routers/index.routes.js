const router = require("express").Router();
const student = require("./espaceStudent.routes");
const teacher = require("./espaceTeacher.routes");
const presentation = require("./presentations.routes");
const contact = require("./contact.routes");
const liens = require("./liens.routes");
const systemeEducatif = require("./formations.routes");
const emploisDuTemps = require('./emplois-list.routes')
const user = { name: "joen doe" };
router.get("/", (req, res) => {
  res.render("acceuil", { user });
});

router.use("/student", student);
router.use("/teacher", teacher);
router.use("/presentation", presentation);
router.use("/contact", contact);
router.use("/Liens", liens);
router.use("/Emplois", emploisDuTemps);
router.use("/Formation", systemeEducatif);

module.exports = router;
