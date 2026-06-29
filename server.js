const express = require("express");
const cors = require("cors");

const app = express();

// middleware
app.use(cors());
app.use(express.json());

// PORT (Render assigns automatically)
const PORT = process.env.PORT || 10000;

/**
 * HEALTH CHECK ROUTE
 * Used to confirm server is alive
 */
app.get("/", (req, res) => {
  res.json({
    status: "online",
    message: "AI server is running 24/7"
  });
});

/**
 * CHAT API ROUTE
 * This is where your AI logic will go later
 */
app.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;

    if (!userMessage) {
      return res.status(400).json({
        error: "message is required"
      });
    }

    // temporary response (replace with real AI later)
    const reply = `You said: ${userMessage}`;

    res.json({
      reply: reply
    });

  } catch (error) {
    res.status(500).json({
      error: "server error"
    });
  }
});

/**
 * START SERVER
 */
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});