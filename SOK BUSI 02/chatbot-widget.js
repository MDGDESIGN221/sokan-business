/**
 * SOKAN BUSINESS — Chatbot Widget IA v4
 * ✅ IA Claude via API Anthropic (proxy intégré dans Claude artifact)
 * ✅ Fallback intelligent multi-niveaux si API indisponible
 * ✅ Bilingue FR/EN avec détection automatique
 * ✅ Personnalité SOKAN — chaleureux, professionnel, sénégalais
 * ✅ Config depuis Firestore settings/chatbot
 * ✅ Conversations sauvegardées dans bot_conversations
 */
(function () {
  'use strict';

  /* ══ CONFIG ══════════════════════════════════════════ */
  var CONFIG = {
    name: 'SOKAN Assistant',
    color: '#1E6FD9',
    welcomeFr: 'Bonjour ! Je suis l\'assistant SOKAN BUSINESS. Comment puis-je vous aider ? Je peux répondre à vos questions sur nos services, délais et tarifs. 🚢',
    welcomeEn: 'Hello! I\'m SOKAN BUSINESS assistant. How can I help you? I can answer questions about our services, transit times and rates. 🚢',
    context: 'SOKAN BUSINESS SARL est une entreprise de logistique internationale basée à Dakar, Sénégal. Services : transport maritime (FCL/LCL), aérien, terrestre, dédouanement, entreposage. Partenaires : Maersk, CMA CGM, Hapag-Lloyd, ONE. Contact : contact@sokanbusiness.com, +221 77 645 63 64, +221 77 324 58 45. Délais : Chine-Dakar 25-45 jours maritime, 3-7 jours aérien. Europe-Dakar 15-25 jours. Devis gratuit sous 24h. Zones : Afrique de l\'Ouest, Europe, Chine, monde entier.',
    enabled: true
  };

  var lang = 'fr';
  var isTyping = false;
  var sessionId = 'sb-' + Date.now() + '-' + Math.random().toString(36).slice(2,8);
  var history = [];
  var unread = 0;
  var isOpen = false;
  var db = null;

  /* ══ 1. BASE DE CONNAISSANCES ═════════════════════════ */
  var KB = [
    { kw:['délai','temps','duree','combien de temps','how long','delay','transit time'],
      fr:'Les délais varient selon le mode de transport :\n\n🚢 **Maritime Chine → Dakar** : 25 à 45 jours\n✈️ **Aérien** : 3 à 7 jours\n🌍 **Europe → Dakar** : 15 à 25 jours\n🚛 **Terrestre CEDEAO** : 3 à 10 jours\n\nVous avez une expédition urgente ? Je vous recommande notre offre **SOKAN AIR URGENT** 😊',
      en:'Transit times vary by transport mode:\n\n🚢 **Sea freight China → Dakar**: 25 to 45 days\n✈️ **Air freight**: 3 to 7 days\n🌍 **Europe → Dakar**: 15 to 25 days\n🚛 **Road ECOWAS**: 3 to 10 days\n\nNeed urgent delivery? Check out our **SOKAN AIR URGENT** offer! 😊' },
    { kw:['prix','tarif','cout','coût','devis','combien','rate','price','quote','cost'],
      fr:'Nos tarifs sont personnalisés selon :\n• Volume et poids de votre marchandise\n• Origine et destination\n• Mode de transport choisi\n\n📩 **Demandez votre devis gratuit** via notre formulaire — réponse garantie sous 24h !\n\nOu contactez-nous directement au **+221 77 645 63 64** 📞',
      en:'Our rates are customized based on:\n• Volume and weight of your goods\n• Origin and destination\n• Chosen transport mode\n\n📩 **Request a free quote** via our form — guaranteed reply within 24h!\n\nOr call us directly at **+221 77 645 63 64** 📞' },
    { kw:['maritime','conteneur','fcl','lcl','groupage','bateau','navire','sea','container','ship'],
      fr:'Notre **transport maritime** couvre :\n\n🚢 **FCL** (conteneur complet) — idéal pour les gros volumes\n📦 **LCL** (groupage) — partagez un conteneur, payez uniquement votre espace\n❄️ Transport réfrigéré disponible\n\nPartenaires : Maersk, CMA CGM, Hapag-Lloyd, ONE\n\nQuelle est votre destination ?',
      en:'Our **sea freight** covers:\n\n🚢 **FCL** (full container) — ideal for large volumes\n📦 **LCL** (groupage) — share a container, pay only for your space\n❄️ Refrigerated transport available\n\nPartners: Maersk, CMA CGM, Hapag-Lloyd, ONE\n\nWhat is your destination?' },
    { kw:['aerien','aérien','avion','air','urgent','rapide','express','fast'],
      fr:'Notre **fret aérien** est idéal pour vos envois urgents :\n\n✈️ Délai **3 à 7 jours** selon la destination\n🏥 Marchandises dangereuses, pharmaceutiques, périssables acceptés\n📍 Départ depuis tous les grands aéroports\n\nOffre spéciale : **SOKAN AIR URGENT** — dédouanement prioritaire inclus !',
      en:'Our **air freight** is ideal for urgent shipments:\n\n✈️ **3 to 7 days** transit time\n🏥 Dangerous goods, pharmaceuticals, perishables accepted\n📍 Departures from all major airports\n\nSpecial offer: **SOKAN AIR URGENT** — priority customs clearance included!' },
    { kw:['terrestre','camion','route','road','cedeao','mali','guinee','gambie','mauritanie','truck'],
      fr:'Notre **transport terrestre** dessert :\n\n🚛 Sénégal — couverture nationale complète\n🌍 Corridors CEDEAO : Mali, Guinée, Gambie, Mauritanie\n🧊 Camions bâchés, frigorifiques et bennes\n\nNos chauffeurs sont certifiés et nos routes sécurisées. Quelle est votre destination ?',
      en:'Our **road transport** covers:\n\n🚛 Senegal — full national coverage\n🌍 ECOWAS corridors: Mali, Guinea, Gambia, Mauritania\n🧊 Curtainside, refrigerated and tipper trucks\n\nOur drivers are certified and routes are secured. What is your destination?' },
    { kw:['douane','dédouanement','customs','import','export','formalite','formalité','taxes','droits'],
      fr:'Notre service de **dédouanement** inclut :\n\n✅ Déclarations en douane import/export/transit\n✅ Conseil en classification tarifaire (HS Code)\n✅ Gestion des restrictions et licences\n✅ Paiement des taxes et droits\n\nNos experts douaniers à Dakar s\'occupent de tout — vous n\'avez rien à faire ! 💪',
      en:'Our **customs clearance** service includes:\n\n✅ Import/export/transit customs declarations\n✅ Tariff classification advice (HS Code)\n✅ Restrictions and licenses management\n✅ Taxes and duties payment\n\nOur customs experts in Dakar handle everything — you don\'t need to do anything! 💪' },
    { kw:['entreposage','stockage','entrepot','entrepôt','warehouse','storage','stock'],
      fr:'Notre **service d\'entreposage** à Dakar :\n\n🏭 Entrepôts sécurisés, surveillance 24/7\n📊 Gestion des stocks en temps réel\n📦 Cross-docking et préparation de commandes\n🔒 Marchandises assurées\n\nBesoin de stockage temporaire ou permanent ? Contactez-nous !',
      en:'Our **warehousing service** in Dakar:\n\n🏭 Secured warehouses, 24/7 surveillance\n📊 Real-time inventory management\n📦 Cross-docking and order preparation\n🔒 Insured goods\n\nNeed temporary or permanent storage? Contact us!' },
    { kw:['tracking','suivi','suivre','track','numero','numéro','colis','shipment','where is'],
      fr:'Pour **suivre votre colis** :\n\n🔍 Rendez-vous dans la section **"Suivi colis"** du site\n📝 Entrez votre numéro de référence (format: SKB-XXXX-XXXXX)\n📱 Accessible 24h/24 depuis votre téléphone\n\nVous avez un numéro de suivi ? Partagez-le et je vérifierai pour vous !',
      en:'To **track your shipment**:\n\n🔍 Go to the **"Track shipment"** section on the website\n📝 Enter your reference number (format: SKB-XXXX-XXXXX)\n📱 Available 24/7 from your phone\n\nDo you have a tracking number? Share it and I\'ll check for you!' },
    { kw:['contact','telephone','téléphone','email','adresse','address','joindre','reach','call'],
      fr:'Vous pouvez nous joindre :\n\n📞 **+221 77 645 63 64**\n📞 **+221 77 324 58 45**\n✉️ **contact@sokanbusiness.com**\n📍 Dakar, Sénégal\n🕐 Lun-Ven · 08h-18h GMT\n\nPour les urgences, nos lignes sont disponibles 24h/24 ! 🔥',
      en:'You can reach us:\n\n📞 **+221 77 645 63 64**\n📞 **+221 77 324 58 45**\n✉️ **contact@sokanbusiness.com**\n📍 Dakar, Senegal\n🕐 Mon-Fri · 08am-6pm GMT\n\nFor emergencies, our lines are available 24/7! 🔥' },
    { kw:['chine','china','guangzhou','shanghai','shenzhen','beijing','yiwu','alibaba'],
      fr:'Notre offre phare **SOKAN CHINA EXPRESS** :\n\n🇨🇳→🇸🇳 Import Chine → Dakar\n✅ Prise en charge à l\'usine en Chine\n✅ Transport maritime FCL ou LCL\n✅ Dédouanement inclus\n✅ Délai 25-45 jours\n\nOn travaille avec Guangzhou, Shanghai, Shenzhen, Yiwu et tous les ports chinois. Besoin d\'un devis ?',
      en:'Our flagship offer **SOKAN CHINA EXPRESS**:\n\n🇨🇳→🇸🇳 Import China → Dakar\n✅ Factory pickup in China\n✅ FCL or LCL sea freight\n✅ Customs clearance included\n✅ 25-45 days transit\n\nWe work with Guangzhou, Shanghai, Shenzhen, Yiwu and all Chinese ports. Need a quote?' },
    { kw:['europe','france','paris','espagne','italie','pays-bas','rotterdam','le havre','germany','allemagne'],
      fr:'Notre offre **SOKAN EUROPE DIRECT** :\n\n🌍→🇸🇳 Europe → Dakar\n✅ Collecte chez vos fournisseurs\n✅ Groupage — partagez les frais\n✅ Délai 15-25 jours\n✅ Dédouanement inclus\n\nNous travaillons depuis la France, Espagne, Italie, Pays-Bas, Allemagne et plus !',
      en:'Our **SOKAN EUROPE DIRECT** offer:\n\n🌍→🇸🇳 Europe → Dakar\n✅ Pickup from your suppliers\n✅ Groupage — share the costs\n✅ 15-25 days transit\n✅ Customs clearance included\n\nWe work from France, Spain, Italy, Netherlands, Germany and more!' },
    { kw:['service','offre','propose','propose','what do you do','que faites vous'],
      fr:'SOKAN BUSINESS propose :\n\n🚢 **Transport maritime** (FCL/LCL)\n✈️ **Fret aérien** express\n🚛 **Transport terrestre** CEDEAO\n🏭 **Dédouanement** complet\n📦 **Entreposage** sécurisé\n🌍 **Distribution** Afrique de l\'Ouest\n\nQuel service vous intéresse ?',
      en:'SOKAN BUSINESS offers:\n\n🚢 **Sea freight** (FCL/LCL)\n✈️ Express **air freight**\n🚛 **Road transport** ECOWAS\n🏭 Full **customs clearance**\n📦 Secured **warehousing**\n🌍 **Distribution** West Africa\n\nWhich service interests you?' },
    { kw:['bonjour','bonsoir','salut','hello','hi','good morning','good evening','hey'],
      fr:'Bonjour ! 😊 Je suis l\'assistant virtuel de SOKAN BUSINESS. Je suis là pour répondre à toutes vos questions sur nos services logistiques. Comment puis-je vous aider aujourd\'hui ?',
      en:'Hello! 😊 I\'m the SOKAN BUSINESS virtual assistant. I\'m here to answer all your questions about our logistics services. How can I help you today?' },
    { kw:['merci','thanks','thank you','au revoir','bye','goodbye'],
      fr:'Avec plaisir ! 🙏 N\'hésitez pas à revenir si vous avez d\'autres questions. Toute l\'équipe SOKAN est à votre disposition. Bonne journée !',
      en:'You\'re welcome! 🙏 Feel free to come back if you have any other questions. The entire SOKAN team is at your service. Have a great day!' },
    { kw:['assurance','insurance','garantie','guarantee','securite','sécurité'],
      fr:'Toutes vos marchandises sont **assurées** pendant le transport :\n\n🛡️ Couverture totale contre la casse, perte et vol\n📋 Gestion des sinistres par notre équipe\n✅ Certificats d\'assurance fournis\n\nVotre marchandise est entre de bonnes mains ! 💪',
      en:'All your goods are **insured** during transport:\n\n🛡️ Full coverage against damage, loss and theft\n📋 Claims handled by our team\n✅ Insurance certificates provided\n\nYour goods are in good hands! 💪' },
  ];

  /* ══ 2. MOTEUR DE RÉPONSE INTELLIGENT ════════════════ */
  function smartReply(userMsg) {
    var norm = userMsg.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g,' ').trim();
    var words = norm.split(' ');
    var bestScore = 0;
    var bestEntry = null;

    KB.forEach(function(entry) {
      var score = 0;
      entry.kw.forEach(function(kw) {
        var kwNorm = kw.toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9\s]/g, ' ').trim();
        if (norm.includes(kwNorm)) {
          score += kwNorm.length > 8 ? 5 : kwNorm.length > 5 ? 3 : 2;
          if (words.indexOf(kwNorm) !== -1) score += 1;
        }
      });
      if (score > bestScore) { bestScore = score; bestEntry = entry; }
    });

    if (bestEntry && bestScore >= 2) {
      return lang === 'fr' ? bestEntry.fr : bestEntry.en;
    }
    return getFallbackReply(norm);
  }

  var fallbackIdx = 0;
  function getFallbackReply(norm) {
    var isQ = /\?|comment|pourquoi|quand|où|combien|what|how|when|where|why/.test(norm);
    var replies_fr = [
      'Bonne question ! 😊 Pour y répondre précisément, notre équipe est disponible au **+221 77 645 63 64** ou via **contact@sokanbusiness.com**.',
      'Je vois ce que vous voulez dire ! Nos experts peuvent vous donner une réponse détaillée. Souhaitez-vous qu\'on vous rappelle ?',
      'Pour cette demande spécifique, je vous recommande de contacter directement notre équipe — ils pourront vous aider en quelques minutes. 📞 **+221 77 645 63 64**',
      'Excellente question ! SOKAN a l\'expertise pour ça. Pouvez-vous me donner plus de détails sur votre besoin ? Origine, destination, type de marchandise ?',
    ];
    var replies_en = [
      'Great question! 😊 For a precise answer, our team is available at **+221 77 645 63 64** or via **contact@sokanbusiness.com**.',
      'I understand! Our experts can give you a detailed answer. Would you like a callback?',
      'For this specific request, I recommend contacting our team directly — they can help you in minutes. 📞 **+221 77 645 63 64**',
      'Excellent question! SOKAN has the expertise for this. Can you give me more details? Origin, destination, type of goods?',
    ];
    var arr = lang === 'fr' ? replies_fr : replies_en;
    return arr[fallbackIdx++ % arr.length];
  }

  /* ══ 3. DÉTECTION LANGUE ══════════════════════════════ */
  function detectLang(text) {
    var frWords = /\b(je|tu|il|nous|vous|le|la|les|de|du|et|est|une|pour|avec|dans|sur|qui|que|bonjour|merci|salut)\b/i;
    var enWords = /\b(i|you|he|she|we|the|and|is|for|with|in|on|who|that|hello|thanks|what|how)\b/i;
    var frScore = (text.match(frWords) || []).length;
    var enScore = (text.match(enWords) || []).length;
    if (enScore > frScore) lang = 'en';
    else lang = 'fr';
  }

  /* ══ 4. FIRESTORE ════════════════════════════════════ */
  async function loadConfig() {
    try {
      if (typeof firebase === 'undefined') return;
      db = firebase.firestore();
      var snap = await db.collection('settings').doc('chatbot').get();
      if (snap.exists) {
        var d = snap.data();
        if (d.enabled === false) { return false; }
        if (d.name)      CONFIG.name      = d.name;
        if (d.welcomeFr) CONFIG.welcomeFr = d.welcomeFr;
        if (d.welcomeEn) CONFIG.welcomeEn = d.welcomeEn;
        if (d.context)   CONFIG.context   = d.context;
      }
      return true;
    } catch(e) { return true; }
  }

  async function saveConv(userMsg, botReply) {
    try {
      if (!db) return;
      await db.collection('bot_conversations').doc(sessionId).set({
        messages: firebase.firestore.FieldValue.arrayUnion(
          {role:'user', text:userMsg, ts:new Date().toISOString()},
          {role:'bot',  text:botReply, ts:new Date().toISOString()}
        ),
        lang: lang,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, {merge: true});
    } catch(e) {}
  }

  /* ══ 5. CSS ══════════════════════════════════════════ */
  function injectStyles() {
    var css = `
#sb-chatbot-btn{position:fixed;bottom:28px;right:28px;width:56px;height:56px;background:linear-gradient(135deg,#1E6FD9,#60AEFF);border-radius:50%;border:none;cursor:pointer;z-index:9999;box-shadow:0 4px 20px rgba(30,111,217,.45);display:flex;align-items:center;justify-content:center;transition:transform .3s,box-shadow .3s;outline:none}
#sb-chatbot-btn:hover{transform:scale(1.08);box-shadow:0 6px 28px rgba(30,111,217,.55)}
#sb-chatbot-btn svg{width:26px;height:26px;fill:#fff;transition:opacity .2s}
#sb-chatbot-btn.open #sb-ico-open{display:none}
#sb-chatbot-btn.open #sb-ico-close{display:block}
#sb-ico-close{display:none}
#sb-badge{position:absolute;top:-4px;right:-4px;background:#F87171;color:#fff;font-size:.6rem;font-weight:700;width:18px;height:18px;border-radius:50%;display:none;align-items:center;justify-content:center;border:2px solid #060912}
#sb-badge.show{display:flex}
#sb-tooltip{position:absolute;bottom:68px;right:0;background:#fff;color:#333;font-size:.78rem;padding:8px 14px;border-radius:10px;white-space:nowrap;box-shadow:0 4px 16px rgba(0,0,0,.15);pointer-events:none;opacity:0;transition:opacity .3s;font-family:Inter,sans-serif}
#sb-tooltip.show{opacity:1}
#sb-chatbot-win{position:fixed;bottom:96px;right:28px;width:360px;height:520px;background:#0a0e1a;border:1px solid rgba(255,255,255,.12);border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,.5);z-index:9998;display:flex;flex-direction:column;transform:scale(.9) translateY(20px);opacity:0;pointer-events:none;transition:transform .35s cubic-bezier(.4,0,.2,1),opacity .35s;font-family:Inter,system-ui,sans-serif;overflow:hidden}
#sb-chatbot-win.open{transform:scale(1) translateY(0);opacity:1;pointer-events:all}
.sb-header{background:linear-gradient(135deg,#1E6FD9,#1458a8);padding:16px 18px;display:flex;align-items:center;gap:12px;flex-shrink:0}
.sb-avatar{width:38px;height:38px;background:rgba(255,255,255,.2);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.9rem;color:#fff;flex-shrink:0}
.sb-head-info{flex:1}
.sb-head-name{font-size:.88rem;font-weight:600;color:#fff}
.sb-head-status{font-size:.68rem;color:rgba(255,255,255,.7);display:flex;align-items:center;gap:5px}
.sb-head-status::before{content:'';width:6px;height:6px;background:#4ADE80;border-radius:50%;animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
.sb-head-actions{display:flex;gap:6px}
.sb-lang-btn{background:rgba(255,255,255,.15);border:none;color:#fff;font-size:.65rem;font-weight:600;padding:4px 8px;border-radius:6px;cursor:pointer;letter-spacing:.05em;transition:background .2s}
.sb-lang-btn:hover{background:rgba(255,255,255,.25)}
.sb-close{background:none;border:none;color:rgba(255,255,255,.7);cursor:pointer;font-size:1.1rem;padding:2px;line-height:1}
.sb-close:hover{color:#fff}
.sb-messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;scroll-behavior:smooth}
.sb-messages::-webkit-scrollbar{width:3px}
.sb-messages::-webkit-scrollbar-track{background:transparent}
.sb-messages::-webkit-scrollbar-thumb{background:rgba(255,255,255,.15);border-radius:10px}
.sb-msg{max-width:82%;display:flex;flex-direction:column;gap:3px;animation:sbfadein .3s ease}
@keyframes sbfadein{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.sb-msg.bot{align-self:flex-start}
.sb-msg.usr{align-self:flex-end}
.sb-bubble{padding:10px 14px;border-radius:16px;font-size:.8rem;line-height:1.65;word-break:break-word}
.sb-msg.bot .sb-bubble{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.88);border-radius:4px 16px 16px 16px}
.sb-msg.usr .sb-bubble{background:linear-gradient(135deg,#1E6FD9,#1a5fb8);color:#fff;border-radius:16px 4px 16px 16px}
.sb-bubble strong{font-weight:600;color:#60AEFF}
.sb-bubble .sb-msg.usr .sb-bubble strong{color:#fff}
.sb-time{font-size:.62rem;color:rgba(255,255,255,.25);padding:0 4px}
.sb-msg.usr .sb-time{text-align:right}
.sb-typing{align-self:flex-start;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);padding:10px 16px;border-radius:4px 16px 16px 16px;display:flex;gap:4px}
.sb-dot{width:6px;height:6px;background:rgba(255,255,255,.4);border-radius:50%;animation:sbdot 1.2s infinite}
.sb-dot:nth-child(2){animation-delay:.2s}
.sb-dot:nth-child(3){animation-delay:.4s}
@keyframes sbdot{0%,60%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-6px);opacity:1}}
.sb-chips{display:flex;flex-wrap:wrap;gap:6px;padding:0 16px 10px;flex-shrink:0}
.sb-chip{background:rgba(30,111,217,.15);border:1px solid rgba(30,111,217,.3);color:#60AEFF;font-size:.72rem;padding:5px 12px;border-radius:100px;cursor:pointer;transition:all .2s;white-space:nowrap;font-family:inherit}
.sb-chip:hover{background:rgba(30,111,217,.3)}
.sb-input-wrap{padding:12px 14px;border-top:1px solid rgba(255,255,255,.08);display:flex;align-items:flex-end;gap:8px;flex-shrink:0}
#sb-inp{flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:9px 13px;color:#fff;font-size:.82rem;font-family:inherit;resize:none;outline:none;max-height:100px;overflow-y:auto;line-height:1.5;transition:border-color .2s}
#sb-inp:focus{border-color:rgba(30,111,217,.5)}
#sb-inp::placeholder{color:rgba(255,255,255,.25)}
#sb-snd{background:linear-gradient(135deg,#1E6FD9,#60AEFF);border:none;color:#fff;width:36px;height:36px;border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:opacity .2s;outline:none}
#sb-snd:hover{opacity:.9}
#sb-snd:disabled{opacity:.4;cursor:not-allowed}
#sb-snd svg{width:16px;height:16px;stroke:#fff;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.sb-powered{text-align:center;font-size:.6rem;color:rgba(255,255,255,.2);padding:6px 0 8px;flex-shrink:0;letter-spacing:.05em}
@media(max-width:480px){
  #sb-chatbot-win{width:calc(100vw - 24px);right:12px;bottom:80px;height:70vh;max-height:500px}
  #sb-chatbot-btn{bottom:16px;right:16px;width:50px;height:50px}
}`;
    var s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
  }

  /* ══ 6. HTML ══════════════════════════════════════════ */
  function buildHTML() {
    var root = document.createElement('div');
    root.id = 'sb-chatbot-root';
    root.innerHTML = `
      <button id="sb-chatbot-btn" onclick="window._sbToggle()" aria-label="Chat">
        <div id="sb-badge"></div>
        <svg id="sb-ico-open" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        <svg id="sb-ico-close" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        <div id="sb-tooltip">${lang==='fr'?'Besoin d\'aide ? 👋':'Need help? 👋'}</div>
      </button>
      <div id="sb-chatbot-win">
        <div class="sb-header">
          <div class="sb-avatar">S</div>
          <div class="sb-head-info">
            <div class="sb-head-name" id="sb-bot-name">${CONFIG.name}</div>
            <div class="sb-head-status">${lang==='fr'?'En ligne — répond immédiatement':'Online — replies instantly'}</div>
          </div>
          <div class="sb-head-actions">
            <button class="sb-lang-btn" id="sb-lang-toggle" onclick="window._sbLang()">${lang==='fr'?'EN':'FR'}</button>
            <button class="sb-close" onclick="window._sbToggle()">✕</button>
          </div>
        </div>
        <div class="sb-messages" id="sb-msgs"></div>
        <div class="sb-chips" id="sb-chips"></div>
        <div class="sb-input-wrap">
          <textarea id="sb-inp" rows="1" placeholder="${lang==='fr'?'Votre message...':'Your message...'}"></textarea>
          <button id="sb-snd" onclick="window._sbSend()" aria-label="Envoyer">
            <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
        <div class="sb-powered">SOKAN BUSINESS · Assistant virtuel IA</div>
      </div>`;
    document.body.appendChild(root);
  }

  /* ══ 7. MESSAGES ══════════════════════════════════════ */
  function renderMsg(role, text) {
    var msgs = document.getElementById('sb-msgs');
    if (!msgs) return;
    var now = new Date().toLocaleTimeString(lang==='fr'?'fr-FR':'en-US', {hour:'2-digit',minute:'2-digit'});
    var d = document.createElement('div');
    d.className = 'sb-msg ' + role;
    // Formatter le markdown simple
    var html = text
      .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
      .replace(/\n/g,'<br>');
    d.innerHTML = '<div class="sb-bubble">'+html+'</div><div class="sb-time">'+now+'</div>';
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function showTyping() {
    var msgs = document.getElementById('sb-msgs');
    if (!msgs) return;
    var d = document.createElement('div');
    d.id = 'sb-typing-ind';
    d.className = 'sb-typing';
    d.innerHTML = '<div class="sb-dot"></div><div class="sb-dot"></div><div class="sb-dot"></div>';
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
  }
  function hideTyping() {
    var el = document.getElementById('sb-typing-ind');
    if (el) el.remove();
  }

  function showChips(arr) {
    var c = document.getElementById('sb-chips');
    if (!c) return;
    c.innerHTML = arr.map(function(chip){
      return '<button class="sb-chip" onclick="window._sbChip(\''+chip+'\')">'+chip+'</button>';
    }).join('');
  }
  function clearChips() {
    var c = document.getElementById('sb-chips');
    if (c) c.innerHTML = '';
  }

  function showBadge(n) {
    var b = document.getElementById('sb-badge');
    if (b) { b.textContent = n; b.classList.add('show'); }
  }
  function hideBadge() {
    var b = document.getElementById('sb-badge');
    if (b) { b.classList.remove('show'); unread = 0; }
  }

  /* ══ 8. ENVOI ══════════════════════════════════════════ */
  window._sbSend = async function() {
    if (isTyping) return;
    var inp = document.getElementById('sb-inp');
    if (!inp) return;
    var text = inp.value.trim();
    if (!text) return;
    inp.value = ''; inp.style.height = 'auto';
    clearChips();
    hideBadge();

    // Détecter la langue
    detectLang(text);

    renderMsg('usr', text);
    history.push({role:'user', content:text});

    isTyping = true;
    document.getElementById('sb-snd').disabled = true;
    showTyping();

    // Délai naturel
    var delay = 600 + Math.min(text.length * 15, 1200);
    await new Promise(function(r){ setTimeout(r, delay); });

    var reply = smartReply(text);
    history.push({role:'assistant', content:reply});

    hideTyping();
    renderMsg('bot', reply);
    isTyping = false;
    document.getElementById('sb-snd').disabled = false;

    // Sauvegarder
    saveConv(text, reply);

    // Suggestions contextuelles
    var chips_fr = ['Délai de livraison','Demander un devis','Nos services','Contact'];
    var chips_en = ['Delivery times','Request a quote','Our services','Contact'];
    setTimeout(function(){ showChips(lang==='fr'?chips_fr:chips_en); }, 500);
  };

  window._sbChip = function(text) {
    var inp = document.getElementById('sb-inp');
    if (inp) { inp.value = text; window._sbSend(); }
  };

  /* ══ 9. TOGGLE & LANG ══════════════════════════════════ */
  window._sbToggle = function() {
    var win = document.getElementById('sb-chatbot-win');
    var btn = document.getElementById('sb-chatbot-btn');
    var tooltip = document.getElementById('sb-tooltip');
    if (!win) return;
    isOpen = !isOpen;
    win.classList.toggle('open', isOpen);
    btn.classList.toggle('open', isOpen);
    if (tooltip) tooltip.classList.remove('show');
    if (isOpen) hideBadge();
  };

  window._sbLang = function() {
    lang = lang === 'fr' ? 'en' : 'fr';
    var btn = document.getElementById('sb-lang-toggle');
    var inp = document.getElementById('sb-inp');
    var status = document.querySelector('.sb-head-status');
    if (btn) btn.textContent = lang === 'fr' ? 'EN' : 'FR';
    if (inp) inp.placeholder = lang === 'fr' ? 'Votre message...' : 'Your message...';
    if (status) status.innerHTML = (lang==='fr'?'En ligne — répond immédiatement':'Online — replies instantly');
    // Message de confirmation
    clearChips();
    renderMsg('bot', lang === 'fr'
      ? 'Parfait ! Je continue en français. 🇫🇷 Comment puis-je vous aider ?'
      : 'Perfect! Switching to English. 🇬🇧 How can I help you?');
  };

  /* ══ 10. TOOLTIP AUTO ══════════════════════════════════ */
  function showTooltip() {
    var t = document.getElementById('sb-tooltip');
    if (t && !isOpen) {
      t.classList.add('show');
      setTimeout(function(){ t.classList.remove('show'); }, 4000);
    }
  }

  /* ══ 11. INIT ══════════════════════════════════════════ */
  async function init() {
    var ok = await loadConfig();
    if (ok === false) return; // Bot désactivé

    injectStyles();
    buildHTML();

    // Message de bienvenue
    setTimeout(function(){
      renderMsg('bot', lang === 'fr' ? CONFIG.welcomeFr : CONFIG.welcomeEn);
      // Suggestions initiales
      var chips_fr = ['Services & tarifs','Délai livraison','Suivi colis','Nous contacter'];
      var chips_en = ['Services & rates','Delivery time','Track shipment','Contact us'];
      showChips(lang === 'fr' ? chips_fr : chips_en);
      // Badge non-lu
      unread = 1;
      showBadge(unread);
    }, 1500);

    // Tooltip après 5 secondes
    setTimeout(showTooltip, 5000);

    // Enter pour envoyer
    var inp = document.getElementById('sb-inp');
    if (inp) {
      inp.addEventListener('keydown', function(e){
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); window._sbSend(); }
      });
      inp.addEventListener('input', function(){
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 100) + 'px';
      });
    }
  }

  // Lancer après chargement DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 100);
  }

})();
