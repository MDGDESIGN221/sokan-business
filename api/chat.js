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
  const BOT_CONTEXT = process.env.BOT_CONTEXT || ''; // 🔥 CONTEXTE ICI

  if (!OR_KEY) {
    return res.status(500).json({ error: 'Configuration serveur manquante' });
  }

  const langInstruction = lang === 'fr'
    ? 'RÉPONDS UNIQUEMENT EN FRANÇAIS.'
    : 'REPLY ONLY IN ENGLISH.';

  const systemPrompt = (lang === 'fr'
    ? `Tu es l'assistant officiel de SOKAN BUSINESS.

RÈGLES :
- Tu réponds uniquement sur la logistique
- Si la question est floue → pose une question
- Si tu ne sais pas → dis-le
- Ne JAMAIS inventer

STYLE :
- Réponses courtes, claires
- Orientées action

CONTACT :
+221 77 645 63 64
contact@sokanbusiness.com`
    : `You are the assistant of SOKAN BUSINESS.`
  ) 
  + "\n\nCONTEXTE ENTREPRISE:\n" + BOT_CONTEXT
  + "\n\n" + langInstruction;

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
        model: 'openai/gpt-4o-mini',
        max_tokens: 300,
        temperature: 0.3,
        messages
      })
    });

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content?.trim();

    return res.status(200).json({ reply });

  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
