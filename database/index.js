const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://liceriadev_db:0000@cluster0.qmp6yrn.mongodb.net/revisions";

mongoose
  .connect(MONGODB_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
  })
  .then(() => {
    console.log("Connect to database successfully!");
  })
  .catch((error) => {
    console.error(`Connect to database failed: ${error.message}`);
  });

module.exports = mongoose;
