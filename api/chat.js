// api/chat.js — Vercel Serverless Function

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

  const { message, history = [], lang = 'fr', context = '' } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'Message requis' });
  }

  const OR_KEY = process.env.OPENROUTER_KEY;
  if (!OR_KEY) {
    console.error('[SOKAN] OPENROUTER_KEY manquante');
    return res.status(500).json({ error: 'Configuration serveur manquante' });
  }

  // 🌍 Langue
  const langInstruction = lang === 'fr'
    ? 'RÈGLE ABSOLUE : Tu DOIS répondre UNIQUEMENT en français.'
    : 'ABSOLUTE RULE: You MUST reply ONLY in English.';

  // 🧠 Prompt optimisé
  const basePrompt = lang === 'fr'
    ? `Tu es l'assistant officiel de SOKAN BUSINESS SARL, entreprise de logistique internationale basée à Dakar.

OBJECTIF :
Aider les clients à comprendre nos services et les orienter vers un devis.

RÈGLES IMPORTANTES :
- Tu réponds uniquement sur la logistique (transport, douane, délais, etc.)
- Si la question est floue → pose une question avant de répondre
- Si tu ne sais pas → dis clairement que tu ne sais pas
- Ne JAMAIS inventer d'informations
- Si hors sujet → dis que tu es spécialisé en logistique

STYLE :
- Réponses courtes, claires, utiles
- Ton professionnel mais simple
- Toujours orienté action (proposer un devis)

CONTACT :
+221 77 645 63 64
contact@sokanbusiness.com

INFOS :
- Maritime: Chine 25-45 jours, Europe 15-25 jours
- Aérien: 3-7 jours
- Terrestre CEDEAO (Mali, Guinée, Gambie, Mauritanie)`
    : `You are the official assistant of SOKAN BUSINESS SARL, international logistics company based in Dakar.

GOAL:
Help customers understand services and guide them toward a quote.

RULES:
- Only answer about logistics
- If unclear → ask a question first
- If you don't know → say it clearly
- Never invent information

STYLE:
- Short, clear, useful
- Action-oriented

CONTACT:
+221 77 645 63 64
contact@sokanbusiness.com`;

  const systemPrompt =
    basePrompt +
    "\n\nCONTEXTE ENTREPRISE:\n" + (context || '') +
    "\n\n" + langInstruction;

  // 💬 Messages
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'system', content: "Si la question est imprécise, demande des détails avant de répondre." },
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
        model: 'openai/gpt-4o-mini', // 🔥 meilleur modèle
        max_tokens: 300,
        temperature: 0.3,
        messages
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[SOKAN] OpenRouter error:', response.status, errText);
      return res.status(502).json({ error: 'Service IA indisponible' });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return res.status(502).json({ error: 'Réponse vide du service IA' });
    }

    return res.status(200).json({ reply });

  } catch (err) {
    console.error('[SOKAN] Proxy error:', err.message);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
