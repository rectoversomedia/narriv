import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import signalsRoutes from "./routes/signals.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
    res.send("API is running 🚀");
});

app.use("/signals", signalsRoutes);

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});