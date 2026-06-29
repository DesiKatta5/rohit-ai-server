const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

app.get("/", (req, res) => {
  res.send("🚀 AI Server running 24/7");
});

app.post("/chat", (req, res) => {
  const message = req.body.message;

  res.json({
    reply: "Server received: " + message
  });
});

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});