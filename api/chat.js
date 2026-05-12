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
- Transport terrestre en Afrique de l'Ouest
- Dédouanement et accompagnement
- Entreposage et distribution

DÉLAIS :
- Chine → Dakar : 25 à 45 jours (maritime)
- Europe → Dakar : 15 à 25 jours (maritime)
- Aérien : 3 à 7 jours

ADRESSE :
- 3085, Amitié 1 x Avenue Bourguiba, Dakar, Sénégal

CONTACT :
- Téléphone : +221 77 645 63 64 / +221 77 324 58 45
- WhatsApp : +221 77 744 08 71
- Email : contact@sokanbusiness.com

OFFRES :
- SOKAN CHINA EXPRESS : Chine → Sénégal, FCL/LCL, délai 25-45j, dédouanement inclus
- SOKAN EUROPE DIRECT : Europe → Dakar, groupage, délai 15-25j, économique
- SOKAN AIR URGENT : Monde entier → Dakar, 3-7 jours, prioritaire
- SOKAN WEST AFRICA : Distribution régionale Sénégal + Mali, Guinée, Gambie, Mauritanie

OBJECTIF :
Convertir le client → proposer devis → orienter vers WhatsApp
`;

    const systemPrompt = `
Tu es Pape Cheikh, assistant commercial chez SOKAN BUSINESS à Dakar.

CONTEXTE ENTREPRISE :
${BOT_CONTEXT}

STYLE DE RÉPONSE :
- Réponds en 2 à 4 phrases maximum
- Ton humain, chaleureux, direct et professionnel
- Donne des délais concrets et des informations précises si possible
- Ne pose qu'UNE seule question max par réponse
- Utilise le prénom du client si tu le connais
- Réponds toujours dans la langue utilisée par le client (français ou anglais)

COMPORTEMENT COMMERCIAL :
- Si demande de prix ou devis → propose devis personnalisé + lien WhatsApp
- Si client hésite → rassure avec un exemple concret ou un témoignage
- Si client est prêt → redirige directement vers WhatsApp
- Si question sur les délais → donne les fourchettes précises selon le mode de transport
- Si question sur le dédouanement → explique que SOKAN gère tout, aucune démarche pour le client

LIEN WHATSAPP À PROPOSER RÉGULIÈREMENT :
"Je peux vous faire un devis rapide sur WhatsApp : https://wa.me/221777440871"

RÈGLES IMPORTANTES :
- Ne sois jamais robotique ou générique
- Ne dis jamais "je suis une IA" ou "je suis un assistant virtuel"
- Ne pose pas plusieurs questions à la suite
- Si tu ne sais pas quelque chose, oriente vers WhatsApp ou le téléphone
- Ne réponds pas à des questions sans rapport avec la logistique ou SOKAN
`;

    const messages = [
      { role: 'system', content: systemPrompt },
      // On garde les 10 derniers messages pour un meilleur contexte conversationnel
      ...history.slice(-10),
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
        max_tokens: 350,   // Augmenté pour éviter les réponses tronquées
        temperature: 0.4   // Légèrement réduit pour plus de cohérence
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
