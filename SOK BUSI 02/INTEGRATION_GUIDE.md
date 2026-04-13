# 🤖 SOKAN BUSINESS — Guide d'intégration du Chatbot IA

---

## 📁 Fichiers livrés

| Fichier | Description |
|---|---|
| `chatbot-widget.js` | Widget chatbot complet (à déposer sur votre serveur) |
| `INTEGRATION_GUIDE.md` | Ce guide |

---

## ÉTAPE 1 — Structure Firestore

La config du bot est stockée dans `settings/chatbot` (collection déjà utilisée par votre admin).

**Structure du document :**
```json
{
  "name": "SOKAN Assistant",
  "enabled": true,
  "welcomeFr": "Bonjour ! Je suis l'assistant SOKAN BUSINESS...",
  "welcomeEn": "Hello! I'm SOKAN BUSINESS assistant...",
  "context": "SOKAN BUSINESS SARL est une entreprise de logistique...",
  "updatedAt": "timestamp"
}
```

Les conversations sont sauvegardées dans `bot_conversations/{sessionId}`.

---

## ÉTAPE 2 — Ajouter le widget dans index.html

**Une seule ligne à ajouter**, juste avant `</body>` dans `index.html` :

```html
<!-- Chatbot IA SOKAN — ajouter juste avant </body> -->
<script src="chatbot-widget.js"></script>
```

> ✅ Le widget détecte automatiquement si Firebase est déjà initialisé (il l'est dans index.html).
> ✅ Si `enabled = false` dans Firestore → le widget n'apparaît pas du tout.

---

## ÉTAPE 3 — Votre admin.html

**Bonne nouvelle** : votre `admin.html` a déjà une page `page-chatbot` complète avec tous les champs nécessaires et le JavaScript `saveBotConfig()` / `loadBotStats()`.

Il vous suffit d'ajouter **une seule fonction** : le chargement initial de la config au moment où on clique sur l'onglet Chatbot.

### 3.1 — Modifier la fonction `loadBotStats` dans admin.html

Cherchez dans le script :

```javascript
async function loadBotStats(){
  try{
    var snap=await db.collection('bot_conversations').get();
    ...
```

Et remplacez-la par cette version améliorée :

```javascript
async function loadBotStats(){
  // Charger la config sauvegardée
  try{
    var cfg = await db.collection('settings').doc('chatbot').get();
    if(cfg.exists){
      var d = cfg.data();
      if(d.name)      document.getElementById('bot-name').value      = d.name;
      if(d.welcomeFr) document.getElementById('bot-welcome-fr').value = d.welcomeFr;
      if(d.welcomeEn) document.getElementById('bot-welcome-en').value = d.welcomeEn;
      if(d.context)   document.getElementById('bot-context').value    = d.context;
      _botEnabled = d.enabled !== false;
      document.getElementById('bot-toggle').classList.toggle('on', _botEnabled);
      document.getElementById('bot-preview-msg').textContent = d.welcomeFr || d.welcomeEn || '';
    }
  }catch(e){ console.warn('Chatbot config load error:', e); }

  // Charger les stats conversations
  try{
    var snap=await db.collection('bot_conversations').get();
    var today=new Date().toLocaleDateString('fr-FR');
    var todayCount=snap.docs.filter(function(d){
      var dt=d.data().updatedAt;
      return dt&&dt.toDate&&dt.toDate().toLocaleDateString('fr-FR')===today;
    }).length;
    set('bot-stat-total',snap.size);
    set('bot-stat-today',todayCount);
  }catch(e){set('bot-stat-total','—');set('bot-stat-today','—');}
}
```

### 3.2 — Vérifier la fonction `saveBotConfig`

Votre fonction actuelle est correcte. Vérifiez juste qu'elle ressemble à ça :

```javascript
window.saveBotConfig=async function(){
  var data={
    name:     val('bot-name'),
    welcomeFr:val('bot-welcome-fr'),
    welcomeEn:val('bot-welcome-en'),
    context:  val('bot-context'),
    enabled:  _botEnabled,
    updatedAt:firebase.firestore.FieldValue.serverTimestamp()
  };
  try{
    await db.collection('settings').doc('chatbot').set(data,{merge:true});
    document.getElementById('bot-preview-msg').textContent = val('bot-welcome-fr');
    toast('Configuration du bot enregistrée','ok');
  }catch(e){toast('Erreur : '+e.message,'err');}
};
```

---

## ÉTAPE 4 — Règles Firestore (Security Rules)

Ajoutez ces règles dans la Console Firebase → Firestore → Règles :

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Config chatbot — lecture publique, écriture admin uniquement
    match /settings/chatbot {
      allow read: if true;
      allow write: if request.auth != null;
    }

    // Conversations bot — création publique (pour sauvegarder les chats)
    match /bot_conversations/{id} {
      allow read, write: if true; // ou restreindre à request.auth != null pour admin
    }
  }
}
```

---

## ÉTAPE 5 — Déploiement

1. Déposez `chatbot-widget.js` à la **racine de votre site** (même dossier que `index.html`)
2. Ajoutez `<script src="chatbot-widget.js"></script>` avant `</body>` dans `index.html`
3. Mettez à jour les règles Firestore
4. Ouvrez votre admin → onglet **Chatbot IA** → configurez et sauvegardez
5. Testez sur le site public !

---

## 🎨 Fonctionnalités incluses

| Fonctionnalité | Statut |
|---|---|
| Widget flottant bouton bas-droite | ✅ |
| Animation ouverture/fermeture fluide | ✅ |
| Messages bot & utilisateur stylisés | ✅ |
| Scroll automatique | ✅ |
| Détection langue FR/EN automatique | ✅ |
| Bouton bascule FR ↔ EN | ✅ |
| Suggestions rapides cliquables | ✅ |
| Indicateur de frappe (3 points animés) | ✅ |
| Badge non-lu sur le bouton | ✅ |
| IA Claude (contexte entreprise) | ✅ |
| Sauvegarde conversations Firestore | ✅ |
| Désactivation via admin (enabled=false) | ✅ |
| Compatible mobile | ✅ |
| Auto-resize zone texte | ✅ |
| Entrée sans Shift pour envoyer | ✅ |

---

## 🔧 Personnalisation avancée

### Changer la position du bouton
Dans `chatbot-widget.js`, modifiez les valeurs CSS dans `#sb-chatbot-btn` :
```css
bottom: 28px; right: 28px;  /* valeurs actuelles */
```

### Changer la couleur principale
Remplacez `#1E6FD9` (bleu SOKAN) par votre couleur dans le CSS injecté.

### Désactiver la sauvegarde Firestore
Dans `chatbot-widget.js`, commentez l'appel à `saveConversation(...)` dans `sbSend()`.

---

## ⚠️ Note importante — Clé API

Le widget utilise l'API Anthropic via `https://api.anthropic.com/v1/messages`.

**Pour la production**, la clé API ne doit pas être exposée côté client.
Options recommandées :
1. **Firebase Cloud Function** : créez une fonction qui proxie les requêtes Claude
2. **Vercel / Netlify Edge Function** : endpoint serverless sécurisé
3. **Mode démo sans API** : remplacez `askClaude()` par des réponses statiques

Pour un démo immédiat sans backend, voir la section "Mode fallback" ci-dessous.

---

## 🔄 Mode fallback (sans API — réponses statiques)

Remplacez la fonction `askClaude` dans `chatbot-widget.js` par :

```javascript
async function askClaude(userMsg) {
  var lower = userMsg.toLowerCase();
  var fr = lang === 'fr';

  if (lower.includes('délai') || lower.includes('temps') || lower.includes('delay') || lower.includes('time')) {
    return fr
      ? 'Les délais varient selon le mode : maritime Chine-Dakar 25-45 jours, aérien 3-7 jours. Besoin d\'un devis précis ? 📦'
      : 'Transit times vary: China-Dakar sea freight 25-45 days, air freight 3-7 days. Need a precise quote? 📦';
  }
  if (lower.includes('prix') || lower.includes('tarif') || lower.includes('devis') || lower.includes('price') || lower.includes('quote')) {
    return fr
      ? 'Nos tarifs sont calculés selon le volume, le poids et la destination. Envoyez-nous votre demande via le formulaire — réponse sous 24h ! 📩'
      : 'Our rates depend on volume, weight and destination. Send us your request via the form — reply within 24h! 📩';
  }
  if (lower.includes('contact') || lower.includes('téléphone') || lower.includes('phone') || lower.includes('email')) {
    return fr
      ? 'Contactez-nous : 📞 +221 77 645 63 64 · +221 77 324 58 45\n✉️ contact@sokanbusiness.com\n📍 Dakar, Sénégal'
      : 'Contact us: 📞 +221 77 645 63 64 · +221 77 324 58 45\n✉️ contact@sokanbusiness.com\n📍 Dakar, Senegal';
  }
  if (lower.includes('douane') || lower.includes('customs') || lower.includes('dédouanement')) {
    return fr
      ? 'Nous gérons toutes les formalités douanières import/export au Sénégal. Notre équipe vous accompagne à chaque étape. ✅'
      : 'We handle all customs formalities for import/export in Senegal. Our team guides you every step of the way. ✅';
  }
  if (lower.includes('service') || lower.includes('offre')) {
    return fr
      ? 'Nos services : Transport maritime (FCL/LCL), fret aérien, transport terrestre CEDEAO, dédouanement et entreposage. Quel service vous intéresse ? 🚢✈️🚛'
      : 'Our services: Sea freight (FCL/LCL), air freight, road transport ECOWAS, customs & warehousing. Which service interests you? 🚢✈️🚛';
  }
  return fr
    ? 'Merci pour votre message ! Pour un conseil personnalisé, contactez notre équipe au +221 77 645 63 64 ou via le formulaire de contact. 😊'
    : 'Thank you for your message! For personalized advice, contact our team at +221 77 645 63 64 or via the contact form. 😊';
}
```
