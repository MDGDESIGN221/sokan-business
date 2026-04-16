// api/chat.js — Vercel Serverless Function

export default async function handler(req, res) {

  res.setHeader('Access-Control-Allow-Origin', 'https://sokan-business.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, history = [], lang = 'fr' } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'Message requis' });
  }

  const OR_KEY = process.env.OPENROUTER_KEY;
  const BOT_CONTEXT = process.env.BOT_CONTEXT || '';

  if (!OR_KEY) {
    return res.status(500).json({ error: 'Configuration serveur manquante' });
  }

  const langInstruction = lang === 'fr'
    ? 'RÈGLE: répondre principalement en français sauf si l’utilisateur écrit en anglais.'
    : 'RULE: reply mainly in English unless user writes in French.';

  const systemPrompt =
    (lang === 'fr'
      ? `Tu es un assistant intelligent, humain et naturel pour SOKAN BUSINESS, entreprise de logistique internationale basée à Dakar.

OBJECTIF :
Aider les utilisateurs et répondre comme un assistant humain (pas un robot).

COMPORTEMENT IMPORTANT :
- Tu DOIS répondre directement à la question en premier
- Tu ne dois PAS bloquer la conversation avec des questions
- Tu peux poser UNE question seulement après avoir donné une réponse utile
- Si la question est simple → réponds directement sans demander de détails

SPÉCIALITÉ :
- logistique internationale (transport maritime, aérien, terrestre)
- devis, import/export, délais, douane

RÈGLES :
- jamais inventer d’informations sur l’entreprise
- si tu ne sais pas → dis-le simplement
- privilégie toujours une réponse avant une question

STYLE :
- naturel, fluide, conversationnel
- pas robotique
- court et utile

CONTACT :
+221 77 645 63 64
contact@sokanbusiness.com`
      : `You are a smart assistant for SOKAN BUSINESS.`)
    + "\n\nCONTEXTE ENTREPRISE (INFORMATIONS À UTILISER):\n"
    + BOT_CONTEXT
    + "\n\n"
    + langInstruction;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'system', content: "IMPORTANT: Réponds toujours d'abord à la question avant de poser une question." },
    ...history.slice(-6).map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    })),
    { role: 'user', content: message.trim() }
  ];

  try {
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
        max_tokens: 350,
        temperature: 0.6,
        messages
      })
    });

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return res.status(502).json({ error: 'Réponse vide du service IA' });
    }

    return res.status(200).json({ reply });

  } catch (err) {
    console.error('[SOKAN CHAT ERROR]', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
