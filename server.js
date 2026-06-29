const fetch = require("node-fetch");

async function isValidUrl(url) {
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.ok;
  } catch (e) {
    return false;
  }
}
async function cleanLinks(text) {

  const urlRegex = /(https?:\/\/[^\s]+)/g;

  const links = text.match(urlRegex);

  if (!links) return text;

  for (let link of links) {

    const valid = await isValidUrl(link);

    if (!valid) {

      const googleSearch =
        "https://www.google.com/search?q=" +
        encodeURIComponent(link);

      text = text.replace(link, googleSearch);
    }

  }

  return text;
}
const express = require("express");
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.post("/chat", async (req, res) => {
  try {
    const message = req.body.message;

    const response = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `
You are a PRO AI assistant.

RULES:
- Only return real, valid links
- Never invent fake URLs
- Always use https:// links
- Keep answers clean, structured, readable
- If unsure about a link, say "No official link found"
`
        },
        { role: "user", content: message }
      ]
    });

    res.json({
      reply: response.choices[0].message.content
    });

  } catch (err) {
    console.log(err);
    res.json({ reply: "Server error occurred." });
  }
});

app.listen(3000, () => {
  console.log("PRO AI running on http://localhost:3000");


app.listen(3000, () => {
  console.log("PRO AI running on http://localhost:3000");


app.listen(3000, () => {
  console.log("PRO AI running on http://localhost:3000");
});