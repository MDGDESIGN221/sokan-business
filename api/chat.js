// api/chat.js — Vercel Serverless Function
// La clé OpenRouter est dans les variables d'environnement Vercel (jamais dans le code)

export default async function handler(req, res) {

  // CORS — autoriser uniquement ton domaine
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

  // Clé stockée dans Vercel → Settings → Environment Variables
  const OR_KEY = process.env.OPENROUTER_KEY;
  if (!OR_KEY) {
    console.error('[SOKAN] OPENROUTER_KEY manquante dans les variables d\'environnement');
    return res.status(500).json({ error: 'Configuration serveur manquante' });
  }

  // System prompt
  const langInstruction = lang === 'fr'
    ? 'RÈGLE ABSOLUE : Tu DOIS répondre UNIQUEMENT en français. Pas un seul mot en anglais.'
    : 'ABSOLUTE RULE: You MUST reply ONLY in English. Not a single word in French.';

  const systemPrompt = (lang === 'fr'
    ? `Tu es l'assistant officiel de SOKAN BUSINESS SARL, entreprise de logistique internationale basée à Dakar, Sénégal.
Tu réponds UNIQUEMENT sur : logistique, transport maritime/aérien/terrestre, dédouanement, entreposage, devis, délais, tarifs.
Si la question est hors sujet, réponds : "Je suis uniquement disponible pour les questions liées à nos services logistiques."
Réponses courtes, claires, orientées action. Pour tout contact humain : +221 77 645 63 64 ou contact@sokanbusiness.com.
Partenaires : Maersk, CMA CGM, Hapag-Lloyd, ONE.
Services : Maritime FCL/LCL (Chine 25-45j, Europe 15-25j), Aérien express (3-7j), Terrestre CEDEAO (Mali, Guinée, Gambie, Mauritanie).`
    : `You are the official assistant of SOKAN BUSINESS SARL, international logistics company based in Dakar, Senegal.
You ONLY answer questions about: logistics, sea/air/road transport, customs clearance, warehousing, quotes, transit times, rates.
If off-topic, reply: "I am only available for questions related to our logistics services."
Keep answers short, clear and action-oriented. For human contact: +221 77 645 63 64 or contact@sokanbusiness.com.
Partners: Maersk, CMA CGM, Hapag-Lloyd, ONE.
Services: Sea freight FCL/LCL (China 25-45d, Europe 15-25d), Air express (3-7d), Road ECOWAS (Mali, Guinea, Gambia, Mauritania).`
  ) + '\n\n' + langInstruction;

  // Historique : 6 derniers échanges max
  const messages = [
    { role: 'system', content: systemPrompt },
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
        model: 'mistralai/mistral-7b-instruct',
        max_tokens: 400,
        temperature: 0.5,
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
