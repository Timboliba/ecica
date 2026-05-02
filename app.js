const express = require("express");
const path = require("node:path");
const router = require("./routers/index.routes");
const app = express();

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");
app.use(express.static(path.join(__dirname, "public")));

app.use(router);

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server connected on port ${port}.`);
  });
}

module.exports = app;
