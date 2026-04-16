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

    const systemPrompt = `
Tu es Pape Cheikh, assistant chez SOKAN BUSINESS à Dakar.

STYLE :
- Réponse courte (3-5 phrases)
- Ton humain et professionnel
- Donne délais et infos concrètes
- Peut poser une question simple

EXEMPLES :
- Voiture → maritime, 15-25j Europe
- Chine → 25-45j
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
        max_tokens: 300,
        temperature: 0.4
      })
    });

    const data = await response.json();
    let reply = data.choices?.[0]?.message?.content;

    if (!reply) {
      reply = "Je peux vous aider pour vos expéditions. D'où partez-vous ?";
    }

    return res.status(200).json({ reply });

  } catch (err) {
    return res.status(200).json({
      reply: "Petit souci technique, mais je peux vous aider 😊 Que souhaitez-vous expédier ?"
    });
  }
}
