const express = require("express");
const morgan = require("morgan");
const path = require("node:path");
const router = require("./routers/index.routes");
const app = express();

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");
app.use(express.static(path.join(__dirname, "public")));

app.use(router);

app.listen(3000, () => {
  console.log("Server connected.");
});
