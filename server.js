const express = require("express");
const cors = require("cors");
const path = require("path");
const Groq = require("groq-sdk");

require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

app.use(express.static("public"));

const groq = new Groq({
apiKey: process.env.GROQ_API_KEY
});

const PORT = process.env.PORT || 10000;

app.get("/", (req, res) => {

res.sendFile(
path.join(__dirname, "public", "index.html")
);

});

const systemRule = `
You are an AI assistant.

Always follow:
- respond in step-by-step format
- use separate paragraphs
- never write everything in one line
`;

app.post("/chat", async (req, res) => {

const userMessage = req.body.message.toLowerCase();

if (
  userMessage.includes("who made you") ||
  userMessage.includes("who is your owner") ||
  userMessage.includes("who created you") ||
  userMessage.includes("developer")
) {
  return res.json({
    reply: "My owner is MR ROHIT."
  });
}

try {

const userMessage =
  req.body.message;

const completion =
  await groq.chat.completions.create({

    model: "llama-3.3-70b-versatile",

    messages: [
      {
        role: "user",
        content: userMessage
      }
    ]

  });

const aiReply =
  completion.choices[0].message.content;

res.json({
  reply: aiReply
});



} catch (error) {


console.error(error);

res.status(500).json({
  reply: "AI Error"
});

function cleanAI(text) {
  return text
    // remove JSON escaping
    .replace(/\\\//g, "/")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\{/g, "{")
    .replace(/\\\}/g, "}")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}


}

});

app.listen(PORT, () => {

console.log(
"Server running on port " + PORT
);

});
