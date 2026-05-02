const mongoose = require("mongoose");

try {
  mongoose.connect(
    "mongodb+srv://liceriadev_db:0000@cluster0.qmp6yrn.mongodb.net/revisions",
  );
  console.log("Connect to database successfuly!");
} catch (error) {
  console.log(`Connect to database failled :${error}`);
}
