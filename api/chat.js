// api/chat.js — Vercel Serverless Function (FIXED VERSION)

export default async function handler(req, res) {

  // CORS
  res.setHeader('Access-Control-Allow-Origin', 'https://sokan-business.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {

    const { message, history = [], lang = 'fr' } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message requis' });
    }

    const OR_KEY = process.env.OPENROUTER_KEY;
    const BOT_CONTEXT = process.env.BOT_CONTEXT || '';

    // DEBUG IMPORTANT
    console.log("BOT_CONTEXT:", BOT_CONTEXT ? "OK" : "EMPTY");

    if (!OR_KEY) {
      return res.status(500).json({ error: 'Configuration serveur manquante' });
    }

    // LANG
    const langInstruction = lang === 'fr'
      ? 'Tu réponds principalement en français sauf si l’utilisateur parle anglais.'
      : 'Reply mainly in English unless the user writes in French.';

    // 🔥 PROMPT ULTRA OPTIMISÉ
    const basePrompt = lang === 'fr'
      ? `Tu es l'assistant officiel de SOKAN BUSINESS, entreprise de logistique internationale basée à Dakar.

🎯 OBJECTIF :
Répondre directement, clairement et utilement aux clients.

⚠️ RÈGLES CRITIQUES :
- Tu DOIS répondre immédiatement à la question.
- Tu NE DOIS JAMAIS répondre uniquement par une question.
- Tu dois DEVINER l’intention même si la demande est vague.
- Tu donnes une réponse utile même avec peu d’informations.

✅ EXEMPLE :
Client : "vous transportez voitures ?"
Réponse :
"Oui, nous transportons des véhicules par voie maritime. Nous pouvons organiser l’expédition depuis plusieurs pays vers Dakar. Les délais et tarifs dépendent du point de départ."

❌ INTERDIT :
- "Pouvez-vous préciser ?"
- Réponse vide ou hésitante
- Bloquer la conversation

🧠 COMPORTEMENT :
- Naturel, humain, fluide
- Proactif
- Orienté solution

📦 SPÉCIALITÉ :
- Transport maritime, aérien, terrestre
- Dédouanement
- Import / export
- Suivi de colis

📌 SI INFO MANQUANTE :
- Tu fais une hypothèse logique
- Tu ajoutes UNE courte question à la fin (optionnel)

📞 CONTACT :
+221 77 645 63 64
contact@sokanbusiness.com`
      : `You are a proactive logistics assistant. Always answer first, never ask clarification first.`;

    const systemPrompt =
      basePrompt +
      "\n\nCONTEXTE ENTREPRISE:\n" +
      (BOT_CONTEXT || "Informations générales de logistique internationale depuis Dakar.") +
      "\n\n" +
      langInstruction;

    // 🧠 MESSAGES
    const messages = [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'system',
        content: "Réponds comme un humain, sois direct et utile."
      },
      ...history.slice(-6).map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      })),
      {
        role: 'user',
        content: message.trim()
      }
    ];

    // 🚀 CALL OPENROUTER
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OR_KEY}`,
        'HTTP-Referer': 'https://sokan-business.com',
        'X-Title': 'SOKAN BUSINESS Chatbot'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        max_tokens: 300,
        temperature: 0.4,
        top_p: 0.9,
        messages
      })
    });

    const data = await response.json();

    console.log("AI RAW:", JSON.stringify(data));

    let reply = data.choices?.[0]?.message?.content?.trim();

    // 🛑 FALLBACK SI IA FOIRE
    if (!reply || reply.length < 3) {
      reply = lang === 'fr'
        ? "Je peux vous aider pour vos besoins en transport et logistique (maritime, aérien, import/export). Que souhaitez-vous expédier ?"
        : "I can help with shipping and logistics (sea, air, import/export). What would you like to ship?";
    }

    return res.status(200).json({ reply });

  } catch (err) {
    console.error('[SOKAN CHAT ERROR]', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
