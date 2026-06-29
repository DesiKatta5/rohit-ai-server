const express = require("express");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

// Health check
app.get("/", (req, res) => {
  res.json({ status: "AI online" });
});

// REAL AI CHAT ROUTE
app.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;

    if (!userMessage) {
      return res.status(400).json({ error: "Message required" });
    }

    // 🔥 AI REQUEST (replace with Groq/OpenAI endpoint)
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: userMessage }]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.AI_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const reply = response.data.choices[0].message.content;

    res.json({ reply });

  } catch (err) {
    res.status(500).json({ error: "AI request failed" });
  }
});

app.listen(PORT, () => {
  console.log("AI server running on", PORT);
});