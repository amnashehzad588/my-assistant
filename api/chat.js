// ╔══════════════════════════════════════════════════╗
// ║           api/chat.js — Vercel Function          ║
// ║                                                  ║
// ║  Yeh file SERVER pe chalti hai, browser mein     ║
// ║  nahi. API key yahan safe rahti hai.             ║
// ║                                                  ║
// ║  User ka browser → yeh function → Groq API       ║
// ╚══════════════════════════════════════════════════╝

export default async function handler(req, res) {

  // Sirf POST requests allowed hain
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // API key Vercel ke environment variables se aati hai
  // (koi code mein nahi likhi, safe hai)
  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: "API key not configured on server" });
  }

  // User ka message aur history frontend se aata hai
  const { messages, systemPrompt } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  try {
    // Groq API ko call karo (server side se)
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 900,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages
        ]
      })
    });

    if (!groqResponse.ok) {
      const err = await groqResponse.json();
      return res.status(groqResponse.status).json({ error: err?.error?.message || "Groq API error" });
    }

    const data = await groqResponse.json();
    const reply = data.choices[0].message.content;

    // Sirf reply wapas bhejo frontend ko
    return res.status(200).json({ reply });

  } catch (error) {
    return res.status(500).json({ error: "Server error: " + error.message });
  }
}
