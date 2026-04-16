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
    ? 'RÈGLE ABSOLUE : Tu dois répondre uniquement en français.'
    : 'ABSOLUTE RULE: You must reply only in English.';

  const basePrompt = lang === 'fr'
    ? `Tu es l'assistant officiel de SOKAN BUSINESS, entreprise de logistique internationale basée à Dakar.

RÈGLES IMPORTANTES :
- Tu es spécialisé en logistique, transport, douane, stockage et devis
- Utilise TOUJOURS le contexte entreprise pour répondre
- Si la question est floue → demande des précisions
- Si tu ne sais pas → dis-le clairement
- Ne JAMAIS inventer d'informations
- Si l'information n'est pas dans le contexte → demande au lieu d'inventer

STYLE :
- Réponses courtes, claires et professionnelles
- Toujours orienté action (devis, contact, solution)

CONTACT :
+221 77 645 63 64
contact@sokanbusiness.com`
    : `You are the official assistant of SOKAN BUSINESS, a logistics company based in Dakar.`

  const systemPrompt =
    basePrompt +
    "\n\nCONTEXTE ENTREPRISE (UTILISE OBLIGATOIREMENT CES INFORMATIONS):\n" +
    BOT_CONTEXT +
    "\n\n" +
    langInstruction;

  const messages = [
    {
      role: 'system',
      content: systemPrompt
    },
    {
      role: 'system',
      content: "IMPORTANT: Si une question concerne les services, utilise toujours le contexte entreprise avant de répondre."
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
        max_tokens: 300,
        temperature: 0.3,
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
