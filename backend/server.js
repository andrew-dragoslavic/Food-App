const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./database.js");
const authRoutes = require("./auth.js");
const speechRoutes = require("./speechRoutes.js");
const doordashService = require("./services/doordashService.js");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

const app = express();
dotenv.config();

app.use(cors());
app.use(express.json());
async function startServer() {
  await connectDB("food-app");

  app.use("/api/auth", authRoutes);
  app.use("/api/speech", upload.single("audio"), speechRoutes);

  app.get("/api/test", (req, res) => {
    res.json({
      message: "Backend is working!",
    });
  });

  await doordashService.initialize();

  app.listen(5000, () => {
    console.log(`Server listening on port 5000`);
  });
}
startServer();
