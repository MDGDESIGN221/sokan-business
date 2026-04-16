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
  const BOT_CONTEXT = process.env.BOT_CONTEXT || `
SOKAN BUSINESS SARL — Logistique internationale basée à Dakar, Sénégal.
Services : transport maritime FCL/LCL, fret aérien express, transport terrestre CEDEAO, dédouanement, entreposage.
Routes principales : Chine→Dakar (25-45j maritime), Europe→Dakar (15-25j), Aérien monde entier (3-7j), Terrestre CEDEAO (3-10j).
Tarifs : personnalisés selon volume, poids, origine, destination et urgence. Devis gratuit sous 24h.
Contact : +221 77 645 63 64 | +221 77 324 58 45 | contact@sokanbusiness.com
Partenaires maritimes : Maersk, CMA CGM, Hapag-Lloyd, ONE.
Offres : SOKAN CHINA EXPRESS (Chine→Dakar), SOKAN EUROPE DIRECT (Europe→Dakar), SOKAN AIR URGENT (express mondial), SOKAN WEST AFRICA (distribution CEDEAO).
Espace client : suivi en temps réel, historique expéditions, demande de devis en ligne.
`;

  if (!OR_KEY) {
    return res.status(500).json({ error: 'Configuration serveur manquante' });
  }

  const langInstruction = lang === 'fr'
    ? 'RÈGLE: tu réponds principalement en français sauf si l’utilisateur écrit en anglais.'
    : 'RULE: reply mainly in English unless user writes in French.';

  const basePrompt = lang === 'fr'
    ? `Tu es un assistant intelligent, naturel et professionnel pour SOKAN BUSINESS, entreprise de logistique internationale basée à Dakar.

PERSONNALITÉ :
- Tu peux discuter naturellement (conversation humaine, amicale ou professionnelle)
- Tu n’es pas un bot robotique
- Tu peux répondre à des questions générales et simples
- Tu restes intelligent, utile et poli

SPÉCIALITÉ PRINCIPALE :
- Logistique internationale (transport maritime, aérien, terrestre)
- Dédouanement, import/export, devis, délais

RÈGLES IMPORTANTES :
- Si la question concerne la logistique → réponse précise et utile
- Si la question est générale → réponse naturelle et conversationnelle
- Si la question concerne les services → propose une solution ou un devis
- Ne jamais inventer d’informations sur l’entreprise
- Si tu ne sais pas → répond honnêtement

STYLE :
- Naturel, fluide, humain
- Pas trop formel
- Pas de réponses robotisées

CONTACT :
+221 77 645 63 64
contact@sokanbusiness.com`
    : `You are a smart, natural assistant for SOKAN BUSINESS, a logistics company based in Dakar.`;

  const systemPrompt =
    basePrompt +
    "\n\nCONTEXTE ENTREPRISE (UTILISE POUR LES REPONSES BUSINESS):\n" +
    BOT_CONTEXT +
    "\n\n" +
    langInstruction;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'system', content: "Réponds naturellement comme un assistant humain, pas comme un robot." },
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
