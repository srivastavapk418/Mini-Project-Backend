const express = require("express");
const mongoose = require("mongoose");
const route = require("./route/route");
const app = express();
app.use(express.json());
mongoose
  .connect(
    "mongodb+srv://srivastavapk418:Lx1r8y2hJcnQngjN@cluster0.rl2pa3s.mongodb.net/",
    { useNewUrlParser: true }
  )
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));
app.listen(3000, function () {
  console.log("Connect to port 3000");
});
app.use("/", route);
