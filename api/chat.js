export default async function handler(req, res) {

  res.setHeader('Access-Control-Allow-Origin', 'https://sokan-business.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { message, history = [], lang = 'fr' } = req.body;

    if (!message) return res.status(400).json({ error: 'Message requis' });

    const OR_KEY = process.env.OPENROUTER_KEY;
    if (!OR_KEY) return res.status(500).json({ error: 'Configuration serveur manquante' });

    const BOT_CONTEXT = `
SOKAN BUSINESS SARL — Logistique internationale basée à Dakar, Sénégal.

SERVICES :
- Transport maritime (conteneur FCL, groupage LCL)
- Fret aérien express
- Transport terrestre en Afrique de l’Ouest
- Dédouanement et accompagnement

DÉLAIS :
- Chine → Dakar : 25 à 45 jours
- Europe → Dakar : 15 à 25 jours
- Aérien : 3 à 7 jours

CONTACT :
- Téléphone : +221 77 645 63 64 / +221 77 324 58 45
- WhatsApp : +221 77 744 08 71

OBJECTIF :
Convertir le client → proposer devis → orienter vers WhatsApp
`;

    const systemPrompt = `
Tu es Pape Cheikh, assistant chez SOKAN BUSINESS à Dakar.

CONTEXTE :
${BOT_CONTEXT}

STYLE :
- Réponds en 2 à 4 phrases maximum
- Ton humain, direct, professionnel
- Donne des délais concrets si possible
- Ne pose qu’UNE seule question max

COMPORTEMENT BUSINESS :
- Si demande de prix → propose devis + WhatsApp
- Si client hésite → rassure + exemple concret
- Si client prêt → pousse vers WhatsApp

WHATSAPP :
Propose souvent :
"Je peux vous faire un devis rapide sur WhatsApp : https://wa.me/221777440871"

IMPORTANT :
- Ne sois jamais robotique
- Ne dis jamais "je suis une IA"
- Ne pose pas trop de questions
`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-6),
      { role: 'user', content: message }
    ];

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OR_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages,
        max_tokens: 200,
        temperature: 0.5
      })
    });

    const data = await response.json();
    let reply = data.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      reply = "Je peux vous aider pour vos expéditions. Écrivez-moi directement sur WhatsApp : https://wa.me/221777440871";
    }

    return res.status(200).json({ reply });

  } catch (err) {
    console.error(err);
    return res.status(200).json({
      reply: "Petit souci technique. Vous pouvez nous contacter directement sur WhatsApp : https://wa.me/221777440871"
    });
  }
}
