// api/chat.js — Vercel Serverless Function (FINAL OPTIMIZED)

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

    if (!OR_KEY) {
      return res.status(500).json({ error: 'Configuration serveur manquante' });
    }

    // CONTEXTE SOKAN PAR DÉFAUT
    const BOT_CONTEXT = process.env.BOT_CONTEXT || `
SOKAN BUSINESS SARL — Logistique internationale basée à Dakar, Sénégal.
Services : transport maritime FCL/LCL, fret aérien express, transport terrestre CEDEAO, dédouanement, entreposage.
Routes et délais : Chine→Dakar (25-45j maritime), Europe→Dakar (15-25j), Aérien monde entier (3-7j), Terrestre CEDEAO (3-10j).
Tarifs : personnalisés selon volume, poids, origine, destination et urgence. Devis gratuit sous 24h.
Contact : +221 77 645 63 64 | +221 77 324 58 45 | contact@sokanbusiness.com
Partenaires maritimes : Maersk, CMA CGM, Hapag-Lloyd, ONE.
`;

    // PROMPT FR
    const systemPromptFr = `Tu es l'assistant de SOKAN BUSINESS SARL, spécialiste en logistique internationale à Dakar.

CONTEXTE :
${BOT_CONTEXT}

STYLE DE RÉPONSE :
- Réponds en 3 à 5 phrases maximum
- Ton humain, direct, professionnel (pas robotique)
- Donne des infos concrètes (délais, types de transport, exemples)
- Tu peux poser une question simple si cela aide à avancer (pas obligatoire)
- Parle comme un conseiller, pas comme une machine

ORIENTATION BUSINESS :
- Question de prix → propose devis + demande origine et volume
- Client hésitant → rassure avec un exemple concret
- Client prêt → donne contact ou guide vers action

EXEMPLES :

Q: "vous transportez des voitures ?"
R: "Oui, nous transportons des véhicules vers Dakar par voie maritime, soit en conteneur soit en roulier selon votre budget. Depuis l'Europe, comptez environ 15 à 25 jours. Vous importez depuis quel pays ?"

Q: "prix Chine Dakar ?"
R: "Le tarif dépend du volume — on travaille en conteneur complet ou en groupage si vous avez peu de marchandises. Depuis la Chine, les délais sont généralement de 25 à 45 jours. Je peux vous faire un devis rapide si vous avez les dimensions."

Q: "délai depuis la France ?"
R: "Depuis la France, comptez environ 15 à 25 jours en maritime ou 3 à 7 jours en aérien. Tout dépend de l'urgence et du type de marchandise. Vous expédiez quoi exactement ?"

LANGUE : réponds toujours en français.`;

    // PROMPT EN
    const systemPromptEn = `You are the assistant of SOKAN BUSINESS SARL, international logistics company based in Dakar.

CONTEXT:
${BOT_CONTEXT}

RESPONSE STYLE:
- 3 to 5 sentences max
- Human, direct, professional
- Include concrete info (transit time, shipping type)
- You may ask one simple follow-up question if useful

BUSINESS GOAL:
- Help the client and guide toward a quote or action

LANGUAGE: Always reply in English.`;

    const systemPrompt = lang === 'fr' ? systemPromptFr : systemPromptEn;

    // MESSAGES
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-6).map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      })),
      { role: 'user', content: message.trim() }
    ];

    // CALL OPENROUTER
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
        messages
      })
    });

    const data = await response.json();
    let reply = data.choices?.[0]?.message?.content?.trim();

    // FALLBACK INTELLIGENT
    if (!reply || reply.length < 5) {
      reply = lang === 'fr'
        ? "Je peux vous aider pour vos besoins en transport (maritime, aérien, import/export). D’où souhaitez-vous expédier votre marchandise ?"
        : "I can help with your shipping needs (sea, air, import/export). Where are you shipping from?";
    }

    return res.status(200).json({ reply });

  } catch (err) {
    console.error('[SOKAN CHAT ERROR]', err);

    return res.status(200).json({
      reply: "Un petit souci technique, mais je peux toujours vous aider 😊 Dites-moi simplement ce que vous souhaitez expédier."
    });
  }
}
