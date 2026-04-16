async function sendMessage(message, history = []) {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: message,
        history: history,
        lang: 'fr',

        // 🔥 AJOUT IMPORTANT (le cerveau du bot)
        context: localStorage.getItem('bot-context') || ''
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erreur serveur');
    }

    return data.reply;

  } catch (err) {
    console.error('Chat error:', err);
    return "Une erreur est survenue. Réessaie.";
  }
}
