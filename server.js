const express = require("express");
const cors = require("cors");
const path = require("path");
const Groq = require("groq-sdk");

require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

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

const messages = [
  {
    role: "system",
    content: `
You are NEX-GPT.

Always respond in clean markdown formatting.

Use:
- headings
- bullet points
- spacing
- code blocks
- separate paragraphs
- Put every step on a new line.
- Use markdown numbered lists properly.
- Keep steps short and separated.

Never write everything in one paragraph.
`
  },
  {
    role: "user",
    content: userMessage
  }
];

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
