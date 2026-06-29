const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

app.get("/", (req, res) => {
  res.json({
    status: "AI online"
  });
});

app.post("/chat", (req, res) => {

  const userMessage = req.body.message;

  if (!userMessage) {
    return res.status(400).json({
      error: "message required"
    });
  }

  res.json({
    reply: "AI says: " + userMessage
  });

});

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
