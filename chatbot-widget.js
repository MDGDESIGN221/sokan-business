/**
 * SOKAN BUSINESS — Chatbot Widget v6
 * ✅ IA hybride : KB (confiance haute) + OpenRouter Mistral (confiance basse)
 * ✅ Config Firestore live via onSnapshot
 * ✅ Conversations sauvegardées Firestore (SDK compatible)
 * ✅ Bilingue FR/EN automatique + switch manuel
 * ✅ Anti double-envoi, fallback si IA échoue
 * ✅ Design identique v5 — aucune modification UI
 */
(function () {
'use strict';

/* ══ CONFIG ══════════════════════════════════════════ */
var CONFIG = {
  name: 'SOKAN Assistant',
  welcomeFr: 'Bonjour ! 👋 Je suis l\'assistant SOKAN BUSINESS. Je réponds à toutes vos questions sur la logistique, les délais, les tarifs et nos services. Comment puis-je vous aider ?',
  welcomeEn: 'Hello! 👋 I\'m the SOKAN BUSINESS assistant. I can answer all your questions about logistics, transit times, rates and our services. How can I help you?',
  context: 'SOKAN BUSINESS SARL est une entreprise de logistique internationale basée à Dakar, Sénégal. Elle propose: transport maritime (FCL/LCL) depuis la Chine (25-45j) et l\'Europe (15-25j), fret aérien express (3-7j), transport terrestre CEDEAO (Mali, Guinée, Gambie, Mauritanie), dédouanement complet, entreposage sécurisé à Dakar. Partenaires: Maersk, CMA CGM, Hapag-Lloyd, ONE. Contacts: +221 77 645 63 64 / +221 77 324 58 45 / contact@sokanbusiness.com',
  enabled: true
};

/* ══ CLÉ API OPENROUTER ══════════════════════════════ */
// ⚠️ Pour la production, déplacer vers une Cloud Function ou un proxy serverless
var OR_KEY = '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';
var OR_MODEL = 'mistralai/mistral-7b-instruct';
var OR_URL = 'https://openrouter.ai/api/v1/chat/completions';
var AI_TIMEOUT_MS = 5000; // 5 secondes max avant fallback KB

/* ══ ÉTAT ════════════════════════════════════════════ */
var lang = 'fr';
var isTyping = false;
var sessionId = 'sb-' + Date.now() + '-' + Math.random().toString(36).slice(2,8);
var history = [];
var unread = 0;
var isOpen = false;
var db = null;
var configUnsubscribe = null;
var saveConversationsEnabled = true; // contrôlé par Firestore settings/chatbot.saveConversations

/* ══ BASE DE CONNAISSANCES (25 catégories) ═══════════ */
var KB = [
  { kw:['bonjour','bonsoir','salut','coucou','hello','hi','hey','good morning','good evening'],
    fr:'Bonjour ! 😊 Je suis l\'assistant virtuel de SOKAN BUSINESS. Je suis là pour répondre à toutes vos questions sur nos services logistiques. Par où voulez-vous commencer ?',
    en:'Hello! 😊 I\'m the SOKAN BUSINESS virtual assistant. I\'m here to answer all your questions about our logistics services. Where would you like to start?' },

  { kw:['merci','thanks','thank you','au revoir','bye','goodbye','bonne journée','bonne nuit'],
    fr:'Avec plaisir ! 🙏 N\'hésitez pas à revenir si vous avez d\'autres questions. Toute l\'équipe SOKAN est à votre service. Bonne journée !',
    en:'You\'re welcome! 🙏 Feel free to come back if you have any other questions. The entire SOKAN team is at your service. Have a great day!' },

  { kw:['délai','durée','combien de temps','quand','temps de transit','how long','delay','transit time','when','delivery time'],
    fr:'📅 Nos délais de livraison :\n\n🚢 **Maritime Chine → Dakar** : 25 à 45 jours\n🚢 **Maritime Europe → Dakar** : 15 à 25 jours\n✈️ **Aérien** : 3 à 7 jours\n🚛 **Terrestre CEDEAO** : 3 à 10 jours\n\nVous avez une urgence ? Notre offre **SOKAN AIR URGENT** livre en 3 à 7 jours ! 🔥',
    en:'📅 Our delivery times:\n\n🚢 **Sea freight China → Dakar**: 25 to 45 days\n🚢 **Sea freight Europe → Dakar**: 15 to 25 days\n✈️ **Air freight**: 3 to 7 days\n🚛 **Road ECOWAS**: 3 to 10 days\n\nNeed it urgently? Our **SOKAN AIR URGENT** delivers in 3 to 7 days! 🔥' },

  { kw:['prix','tarif','coût','cout','combien coûte','cher','pas cher','economique','rate','price','cost','how much','quote','cheap','expensive'],
    fr:'💰 Nos tarifs sont personnalisés selon :\n\n• Volume et poids de votre cargaison\n• Origine et destination\n• Mode de transport (maritime, aérien, terrestre)\n• Urgence de la livraison\n\n📩 **Demandez votre devis GRATUIT** — réponse garantie sous 24h !\nOu appelez-nous : **+221 77 645 63 64** 📞',
    en:'💰 Our rates are customized based on:\n\n• Volume and weight of your cargo\n• Origin and destination\n• Transport mode (sea, air, road)\n• Urgency of delivery\n\n📩 **Request your FREE quote** — guaranteed reply within 24h!\nOr call us: **+221 77 645 63 64** 📞' },

  { kw:['maritime','conteneur','container','bateau','navire','fcl','lcl','groupage','sea freight','ship','vessel','cargo'],
    fr:'🚢 Notre **transport maritime** :\n\n📦 **FCL** (Full Container Load) — conteneur complet pour vos gros volumes\n📦 **LCL** (Less Container Load) — groupage, partagez et réduisez les coûts\n❄️ Conteneurs réfrigérés disponibles\n\n🤝 Partenaires : **Maersk · CMA CGM · Hapag-Lloyd · ONE**\n\nQuelle est votre destination ? Je vous conseille la meilleure option !',
    en:'🚢 Our **sea freight** services:\n\n📦 **FCL** (Full Container Load) — full container for large volumes\n📦 **LCL** (Less Container Load) — groupage, share and reduce costs\n❄️ Refrigerated containers available\n\n🤝 Partners: **Maersk · CMA CGM · Hapag-Lloyd · ONE**\n\nWhat is your destination? I\'ll advise the best option!' },

  { kw:['aérien','aerien','avion','fret aérien','air freight','urgent','rapide','express','fast','quick','airplane','fly'],
    fr:'✈️ Notre **fret aérien** :\n\n⚡ Livraison en **3 à 7 jours** selon destination\n🏥 Marchandises spéciales acceptées (DGR, pharmaceutiques, périssables)\n📍 Départ depuis tous les grands aéroports mondiaux\n🔍 Suivi heure par heure\n\n🌟 Offre phare : **SOKAN AIR URGENT** — dédouanement prioritaire inclus !',
    en:'✈️ Our **air freight** services:\n\n⚡ Delivery in **3 to 7 days** depending on destination\n🏥 Special goods accepted (DGR, pharmaceuticals, perishables)\n📍 Departures from all major airports worldwide\n🔍 Hour-by-hour tracking\n\n🌟 Featured offer: **SOKAN AIR URGENT** — priority customs included!' },

  { kw:['terrestre','camion','route','truck','road','cedeao','ecowas','mali','guinée','guinee','gambie','gambia','mauritanie','mauritania','afrique','africa'],
    fr:'🚛 Notre **transport terrestre** :\n\n🌍 Sénégal — couverture nationale complète\n🗺️ Corridors CEDEAO certifiés : **Mali · Guinée · Gambie · Mauritanie**\n🧊 Camions bâchés, frigorifiques et bennes disponibles\n✅ Chauffeurs certifiés, routes sécurisées\n\nQuelle est votre destination en Afrique de l\'Ouest ?',
    en:'🚛 Our **road transport** services:\n\n🌍 Senegal — full national coverage\n🗺️ Certified ECOWAS corridors: **Mali · Guinea · Gambia · Mauritania**\n🧊 Curtainside, refrigerated and tipper trucks available\n✅ Certified drivers, secured routes\n\nWhat is your West Africa destination?' },

  { kw:['douane','dédouanement','dedouanement','customs','formalité','formalite','import','export','taxe','droits','déclaration','hs code'],
    fr:'🏛️ Notre service **dédouanement** complet :\n\n✅ Déclarations en douane import/export/transit\n✅ Classification tarifaire HS Code\n✅ Gestion des licences et restrictions\n✅ Paiement des taxes et droits de douane\n✅ Mainlevée rapide\n\n💪 Nos experts douaniers à Dakar s\'occupent de TOUT — zéro blocage garanti !',
    en:'🏛️ Our complete **customs clearance** service:\n\n✅ Import/export/transit customs declarations\n✅ HS Code tariff classification\n✅ Licenses and restrictions management\n✅ Taxes and customs duties payment\n✅ Fast release\n\n💪 Our customs experts in Dakar handle EVERYTHING — zero delays guaranteed!' },

  { kw:['entrepôt','entrepot','stockage','stock','warehouse','storage','entreposage','garder','stocker'],
    fr:'🏭 Notre service **entreposage** à Dakar :\n\n🔒 Entrepôts sécurisés — surveillance 24h/24, 7j/7\n📊 Gestion des stocks en temps réel\n📦 Cross-docking et préparation de commandes\n🛡️ Marchandises assurées\n📋 Inventaire et rapports réguliers\n\nBesoin de stockage temporaire ou permanent ? On s\'en occupe !',
    en:'🏭 Our **warehousing** service in Dakar:\n\n🔒 Secured warehouses — 24/7 surveillance\n📊 Real-time inventory management\n📦 Cross-docking and order preparation\n🛡️ Insured goods\n📋 Regular inventory and reports\n\nNeed temporary or permanent storage? We\'ve got it covered!' },

  { kw:['tracking','suivi','suivre','track','tracer','localiser','où est','where is','numero','numéro','référence','reference','colis','shipment'],
    fr:'🔍 **Suivi de votre colis** :\n\n1️⃣ Allez dans la section **"Suivi colis"** sur le site\n2️⃣ Entrez votre numéro de référence (format: **SKB-XXXX-XXXXX**)\n3️⃣ Suivez en temps réel 📱\n\nVous avez un numéro de suivi ? Partagez-le et je vérifierai pour vous ! Ou créez un **Espace Client** pour tout gérer depuis votre téléphone.',
    en:'🔍 **Track your shipment**:\n\n1️⃣ Go to the **"Track shipment"** section on the website\n2️⃣ Enter your reference number (format: **SKB-XXXX-XXXXX**)\n3️⃣ Track in real time 📱\n\nDo you have a tracking number? Share it and I\'ll check for you! Or create a **Client Account** to manage everything from your phone.' },

  { kw:['contact','téléphone','telephone','phone','email','adresse','address','joindre','appeler','call','reach','whatsapp','bureau','office'],
    fr:'📞 **Contactez SOKAN BUSINESS** :\n\n📱 **+221 77 645 63 64**\n📱 **+221 77 324 58 45**\n✉️ **contact@sokanbusiness.com**\n📍 Dakar, Sénégal\n🕐 Lun–Ven · 08h–18h GMT\n\n⚡ Pour les urgences, nos lignes sont disponibles 24h/24 !',
    en:'📞 **Contact SOKAN BUSINESS**:\n\n📱 **+221 77 645 63 64**\n📱 **+221 77 324 58 45**\n✉️ **contact@sokanbusiness.com**\n📍 Dakar, Senegal\n🕐 Mon–Fri · 08am–6pm GMT\n\n⚡ For emergencies, our lines are available 24/7!' },

  { kw:['chine','china','guangzhou','shanghai','shenzhen','beijing','yiwu','alibaba','aliexpress','made in china','chinois'],
    fr:'🇨🇳 Notre offre phare **SOKAN CHINA EXPRESS** :\n\n✅ Prise en charge à l\'usine en Chine\n✅ Transport maritime FCL ou LCL\n✅ Dédouanement complet inclus\n✅ Délai : 25 à 45 jours\n✅ Suivi temps réel\n\nNous travaillons depuis **Guangzhou, Shanghai, Shenzhen, Yiwu** et tous les ports chinois. Besoin d\'un devis ?',
    en:'🇨🇳 Our flagship offer **SOKAN CHINA EXPRESS**:\n\n✅ Factory pickup in China\n✅ FCL or LCL sea freight\n✅ Full customs clearance included\n✅ Transit: 25 to 45 days\n✅ Real-time tracking\n\nWe work from **Guangzhou, Shanghai, Shenzhen, Yiwu** and all Chinese ports. Need a quote?' },

  { kw:['europe','france','paris','espagne','spain','italie','italy','pays-bas','netherlands','rotterdam','le havre','belgique','belgium','allemagne','germany'],
    fr:'🌍 Notre offre **SOKAN EUROPE DIRECT** :\n\n✅ Collecte chez vos fournisseurs européens\n✅ Groupage — partagez les frais, économisez jusqu\'à 60%\n✅ Délai : 15 à 25 jours\n✅ Dédouanement inclus\n\nNous opérons depuis **France, Espagne, Italie, Pays-Bas, Belgique, Allemagne** et plus !',
    en:'🌍 Our **SOKAN EUROPE DIRECT** offer:\n\n✅ Pickup from your European suppliers\n✅ Groupage — share costs, save up to 60%\n✅ Transit: 15 to 25 days\n✅ Customs clearance included\n\nWe operate from **France, Spain, Italy, Netherlands, Belgium, Germany** and more!' },

  { kw:['service','offre','prestation','que faites vous','what do you do','que proposez','what do you offer'],
    fr:'🏢 **SOKAN BUSINESS** propose :\n\n🚢 Transport maritime (FCL/LCL)\n✈️ Fret aérien express\n🚛 Transport terrestre CEDEAO\n🏛️ Dédouanement complet\n🏭 Entreposage sécurisé\n🌍 Distribution Afrique de l\'Ouest\n📦 Suivi colis temps réel\n\nQuel service vous intéresse ?',
    en:'🏢 **SOKAN BUSINESS** offers:\n\n🚢 Sea freight (FCL/LCL)\n✈️ Express air freight\n🚛 Road transport ECOWAS\n🏛️ Full customs clearance\n🏭 Secured warehousing\n🌍 West Africa distribution\n📦 Real-time shipment tracking\n\nWhich service interests you?' },

  { kw:['assurance','insurance','garantie','guarantee','sécurité','securite','perte','dommage','damage','loss','compensation'],
    fr:'🛡️ **Assurance marchandises** :\n\n✅ Couverture complète contre la casse, perte et vol\n✅ Valeur déclarée protégée\n✅ Gestion des sinistres par notre équipe\n✅ Certificats d\'assurance fournis\n\nVos marchandises voyagent en toute sécurité avec SOKAN ! 💪',
    en:'🛡️ **Cargo insurance**:\n\n✅ Full coverage against damage, loss and theft\n✅ Declared value protected\n✅ Claims handled by our team\n✅ Insurance certificates provided\n\nYour goods travel safely with SOKAN! 💪' },

  { kw:['fcl vs lcl','difference fcl','difference lcl','full container','less than container','quel conteneur','which container'],
    fr:'📦 **FCL vs LCL** — quelle différence ?\n\n**FCL** (Full Container Load) :\n✅ Conteneur entier pour vous seul\n✅ Idéal si vous avez **+15 m³** de marchandises\n✅ Plus rapide (pas de transit intermédiaire)\n\n**LCL** (Less Container Load) :\n✅ Vous partagez un conteneur\n✅ Idéal pour les **petits volumes**\n✅ Vous payez uniquement votre espace\n\nJe vous aide à choisir selon votre volume ?',
    en:'📦 **FCL vs LCL** — what\'s the difference?\n\n**FCL** (Full Container Load):\n✅ Entire container for you alone\n✅ Ideal if you have **+15 m³** of goods\n✅ Faster (no intermediate transit)\n\n**LCL** (Less Container Load):\n✅ You share a container\n✅ Ideal for **small volumes**\n✅ You pay only for your space\n\nWant help choosing based on your volume?' },

  { kw:['espace client','compte','inscription','connexion','login','register','account','mon compte','my account','portail'],
    fr:'👤 **Espace Client SOKAN** :\n\n✅ Suivi de toutes vos expéditions en temps réel\n✅ Historique complet de vos commandes\n✅ Téléchargement de vos documents\n✅ Demande de devis rapide\n\nCréez votre compte gratuit depuis le site en cliquant sur **"Espace client"** dans le menu ! 🚀',
    en:'👤 **SOKAN Client Portal**:\n\n✅ Real-time tracking of all your shipments\n✅ Complete order history\n✅ Document downloads\n✅ Quick quote requests\n\nCreate your free account from the website by clicking **"Client portal"** in the menu! 🚀' },

  { kw:['document','facture','invoice','bl','bill of lading','connaissement','packing list','certificat','certificate','attestation'],
    fr:'📋 **Documents logistiques** :\n\nNous gérons tous vos documents :\n✅ Bill of Lading (BL / Connaissement)\n✅ Packing List\n✅ Facture commerciale\n✅ Certificat d\'assurance\n✅ Documents douaniers\n✅ Certificat d\'origine\n\nTous les documents sont disponibles dans votre Espace Client.',
    en:'📋 **Logistics documents**:\n\nWe handle all your documents:\n✅ Bill of Lading (BL)\n✅ Packing List\n✅ Commercial Invoice\n✅ Insurance Certificate\n✅ Customs documents\n✅ Certificate of Origin\n\nAll documents are available in your Client Portal.' },

  { kw:['poids','volume','kg','kilogramme','tonne','m3','mètre cube','cbm','weight','dimension','taille','size'],
    fr:'⚖️ **Calcul poids/volume** :\n\nPour le fret maritime LCL, on utilise le **poids volumétrique** :\n📐 Formule : L × l × H (cm) ÷ 1000 = **CBM** (m³)\n\n💡 En LCL, vous payez le plus élevé entre poids réel et poids volumétrique.\n\nEnvoyez-moi vos dimensions et poids, je calcule le coût approximatif ! 📊',
    en:'⚖️ **Weight/volume calculation**:\n\nFor LCL sea freight, we use **volumetric weight**:\n📐 Formula: L × W × H (cm) ÷ 1000 = **CBM** (m³)\n\n💡 For LCL, you pay the higher of actual weight vs volumetric weight.\n\nSend me your dimensions and weight, I\'ll calculate the approximate cost! 📊' },

  { kw:['dangereux','fragile','périssable','perishable','alimentaire','food','médicament','medicament','chimique','chemical','dangerous','special','hazardous'],
    fr:'⚠️ **Marchandises spéciales** :\n\nNous gérons :\n🔥 Matières dangereuses (DGR)\n🥗 Produits alimentaires et périssables (réfrigéré)\n💊 Produits pharmaceutiques\n⚗️ Produits chimiques\n🏺 Marchandises fragiles et précieuses\n\nChaque type nécessite une documentation spécifique. Parlez-nous de votre marchandise !',
    en:'⚠️ **Special goods**:\n\nWe handle:\n🔥 Dangerous goods (DGR)\n🥗 Food and perishables (refrigerated)\n💊 Pharmaceutical products\n⚗️ Chemical products\n🏺 Fragile and valuable goods\n\nEach type requires specific documentation. Tell us about your goods!' },

  { kw:['sokan','qui êtes vous','qui etes vous','who are you','à propos','about','entreprise','company','histoire','history','confiance','trust'],
    fr:'🏢 **SOKAN BUSINESS SARL** :\n\nEntreprise de logistique internationale basée à **Dakar, Sénégal**. Nous connectons les entreprises d\'Afrique de l\'Ouest aux marchés mondiaux.\n\n✅ **50+** clients actifs\n✅ **20+** pays desservis\n✅ Partenaires : Maersk, CMA CGM, Hapag-Lloyd, ONE\n✅ Équipe d\'experts logistique et douane\n\n*"Vos marchandises arrivent. Toujours."* 💪',
    en:'🏢 **SOKAN BUSINESS SARL**:\n\nInternational logistics company based in **Dakar, Senegal**. We connect West African businesses to global markets.\n\n✅ **50+** active clients\n✅ **20+** countries served\n✅ Partners: Maersk, CMA CGM, Hapag-Lloyd, ONE\n✅ Logistics and customs expert team\n\n*"Your goods arrive. Always."* 💪' },

  { kw:['comment ça marche','comment fonctionne','how does it work','comment commencer','how to start','processus','process','étapes','steps','procedure'],
    fr:'🔄 **Comment ça marche ?**\n\n**1️⃣ Devis** — Remplissez le formulaire, réponse en 24h\n**2️⃣ Validation** — Acceptez le devis, on prend en charge\n**3️⃣ Expédition** — Enlèvement, transport, dédouanement\n**4️⃣ Livraison** — Réception + notification à chaque étape\n\nSimple comme 4 étapes ! Prêt à démarrer ? 🚀',
    en:'🔄 **How does it work?**\n\n**1️⃣ Quote** — Fill in the form, reply within 24h\n**2️⃣ Validation** — Accept the quote, we take over\n**3️⃣ Shipment** — Pickup, transport, customs\n**4️⃣ Delivery** — Receipt + notification at each step\n\nAs simple as 4 steps! Ready to start? 🚀' },

  { kw:['zone','couvre','destination','pays','country','livrez vous','do you deliver','où livrez','where do you deliver','coverage'],
    fr:'🌍 **Zones couvertes par SOKAN** :\n\n🇸🇳 **Sénégal** — couverture nationale\n🌍 **CEDEAO** — Mali, Guinée, Gambie, Mauritanie, Côte d\'Ivoire...\n🇨🇳 **Chine** — tous les ports et villes\n🌍 **Europe** — France, Espagne, Italie, Pays-Bas, Allemagne...\n🌎 **Monde entier** — via nos partenaires maritimes et aériens\n\nUne destination spécifique en tête ?',
    en:'🌍 **SOKAN coverage zones**:\n\n🇸🇳 **Senegal** — full national coverage\n🌍 **ECOWAS** — Mali, Guinea, Gambia, Mauritania, Ivory Coast...\n🇨🇳 **China** — all ports and cities\n🌍 **Europe** — France, Spain, Italy, Netherlands, Germany...\n🌎 **Worldwide** — via our sea and air partners\n\nA specific destination in mind?' },

  { kw:['maersk','cma cgm','hapag','hapag-lloyd','one ocean','partenaire','partner','compagnie','shipping line'],
    fr:'🤝 **Nos partenaires maritimes** :\n\n⭐ **Maersk** — leader mondial du transport maritime\n⭐ **CMA CGM** — 3ème armateur mondial\n⭐ **Hapag-Lloyd** — réseau mondial premium\n⭐ **ONE** (Ocean Network Express) — réseau Asie-Pacifique\n\nCes partenariats nous permettent de vous offrir les **meilleurs tarifs et délais** sur toutes les routes maritimes !',
    en:'🤝 **Our maritime partners**:\n\n⭐ **Maersk** — world leader in sea transport\n⭐ **CMA CGM** — 3rd largest shipping company\n⭐ **Hapag-Lloyd** — premium global network\n⭐ **ONE** (Ocean Network Express) — Asia-Pacific network\n\nThese partnerships allow us to offer you the **best rates and transit times** on all sea routes!' },

  { kw:['devis','formulaire','form','demande','request','commencer','start'],
    fr:'📝 **Demander un devis** :\n\nC\'est simple et rapide !\n\n1️⃣ Cliquez sur **"Devis gratuit"** sur le site\n2️⃣ Remplissez : origine, destination, type de marchandise, poids/volume\n3️⃣ Réception de votre devis sous **24h** !\n\nOu contactez-nous directement : **+221 77 645 63 64** 📞',
    en:'📝 **Request a quote**:\n\nSimple and fast!\n\n1️⃣ Click **"Free quote"** on the website\n2️⃣ Fill in: origin, destination, type of goods, weight/volume\n3️⃣ Receive your quote within **24h**!\n\nOr contact us directly: **+221 77 645 63 64** 📞' },
];

/* ══ MOTEUR KB — retourne {reply, score} ══════════════ */
function kbScore(userMsg) {
  var norm = userMsg.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9\s]/g,' ')
    .replace(/\s+/g,' ').trim();
  var words = norm.split(' ');
  var bestScore = 0, bestEntry = null;

  KB.forEach(function(entry) {
    var score = 0;
    entry.kw.forEach(function(kw) {
      var kwn = kw.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
        .replace(/[^a-z0-9\s]/g,' ').trim();
      if (norm.includes(kwn)) {
        score += kwn.length > 10 ? 6 : kwn.length > 6 ? 4 : kwn.length > 3 ? 3 : 2;
        if (words.includes(kwn)) score += 2;
        if (norm.startsWith(kwn)) score += 1;
      }
    });
    if (score > bestScore) { bestScore = score; bestEntry = entry; }
  });

  return { entry: bestEntry, score: bestScore };
}

// Seuil de confiance : ≥ 6 = KB répond, < 6 = IA prend le relais (threshold relevé pour éviter les faux positifs)
var KB_CONFIDENCE_THRESHOLD = 6;

function smartReply(userMsg) {
  var result = kbScore(userMsg);
  if (result.entry && result.score >= KB_CONFIDENCE_THRESHOLD) {
    return { source: 'kb', text: lang === 'fr' ? result.entry.fr : result.entry.en };
  }
  return { source: 'ai', text: null };
}

/* ══ FALLBACKS TEXTUELS ══════════════════════════════ */
var fbIdx = 0;
function getFallback() {
  var fr = [
    'Je vois ce que vous voulez dire ! 😊 Pour une réponse précise, notre équipe est disponible au **+221 77 645 63 64** ou par email : **contact@sokanbusiness.com**',
    'Excellente question ! Pour vous donner une réponse détaillée, pouvez-vous préciser : quelle est votre marchandise, l\'origine et la destination ? 📦',
    'Pour cette demande spécifique, je vous recommande de contacter directement nos experts — ils répondent en quelques minutes ! 📞 **+221 77 645 63 64**',
    'Je voudrais vous aider au mieux. Pouvez-vous me donner plus de détails sur votre besoin logistique ? (type de marchandise, volumes, trajet)',
  ];
  var en = [
    'I see what you mean! 😊 For a precise answer, our team is available at **+221 77 645 63 64** or by email: **contact@sokanbusiness.com**',
    'Great question! To give you a detailed answer, can you specify: what goods, origin and destination? 📦',
    'For this specific request, I recommend contacting our experts directly — they respond in minutes! 📞 **+221 77 645 63 64**',
    'I want to help you best. Can you give me more details about your logistics need? (type of goods, volumes, route)',
  ];
  var arr = lang === 'fr' ? fr : en;
  return arr[fbIdx++ % arr.length];
}

/* ══ APPEL IA OPENROUTER ══════════════════════════════ */
async function askAI(userMsg) {
  var systemPrompt = (lang === 'fr'
    ? 'Tu es l\'assistant virtuel de SOKAN BUSINESS, une entreprise de logistique internationale basée à Dakar, Sénégal. Réponds UNIQUEMENT en français, de façon concise, professionnelle et chaleureuse. Utilise des emojis avec modération. Ne mentionne jamais d\'autres entreprises concurrentes. Si tu ne sais pas, redirige vers le contact (+221 77 645 63 64).\n\nCONTEXTE ENTREPRISE :\n'
    : 'You are the virtual assistant of SOKAN BUSINESS, an international logistics company based in Dakar, Senegal. Reply ONLY in English, in a concise, professional and warm tone. Use emojis in moderation. Never mention competing companies. If unsure, redirect to contact (+221 77 645 63 64).\n\nCOMPANY CONTEXT:\n'
  ) + CONFIG.context;

  // Construire l'historique (max 6 derniers échanges pour rester dans le context)
  var msgs = [];
  var recent = history.slice(-6);
  recent.forEach(function(m) {
    msgs.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content });
  });
  msgs.push({ role: 'user', content: userMsg });

  var controller = new AbortController();
  var timeout = setTimeout(function(){ controller.abort(); }, AI_TIMEOUT_MS);

  try {
    var res = await fetch(OR_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + OR_KEY,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'SOKAN BUSINESS Chatbot'
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: OR_MODEL,
        max_tokens: 400,
        temperature: 0.6,
        messages: [{ role: 'system', content: systemPrompt }].concat(msgs)
      })
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error('HTTP ' + res.status);
    var data = await res.json();
    var text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!text || !text.trim()) throw new Error('Empty response');
    return text.trim();
  } catch(e) {
    clearTimeout(timeout);
    return null; // Signale l'échec → fallback KB
  }
}

/* ══ DÉTECTION LANGUE ════════════════════════════════ */
function detectLang(text) {
  var frPat = /\b(je|tu|il|nous|vous|le|la|les|de|du|et|est|une|pour|avec|dans|sur|qui|que|bonjour|merci|salut|comment|quand|où|pourquoi|combien|quel|quelle|nos|mon|ma|mes)\b/gi;
  var enPat = /\b(i|you|he|she|we|they|the|and|is|are|for|with|in|on|who|that|hello|thanks|what|how|when|where|why|our|my|your|their|do|does|can|will)\b/gi;
  var fr = (text.match(frPat)||[]).length;
  var en = (text.match(enPat)||[]).length;
  if (en > fr + 1) lang = 'en';
  else lang = 'fr';
}

/* ══ FIREBASE — config live via onSnapshot ═══════════ */
async function loadConfig() {
  try {
    if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) return true;
    db = firebase.firestore();

    // Écoute en temps réel : si l'admin change la config, le widget se met à jour
    configUnsubscribe = db.collection('settings').doc('chatbot').onSnapshot(function(snap) {
      if (!snap.exists) return;
      var d = snap.data();
      if (d.enabled === false) {
        // Désactiver le widget à la volée
        var root = document.getElementById('sb-root');
        if (root) root.style.display = 'none';
        return;
      }
      if (d.name) {
        CONFIG.name = d.name;
        var hn = document.getElementById('sb-hn');
        if (hn) hn.textContent = d.name;
        var av = document.getElementById('sb-av');
        if (av) av.textContent = d.name.charAt(0).toUpperCase();
      }
      if (d.welcomeFr) CONFIG.welcomeFr = d.welcomeFr;
      if (d.welcomeEn) CONFIG.welcomeEn = d.welcomeEn;
      if (d.context)   CONFIG.context   = d.context;
      // Mise à jour live du flag sauvegarde conversations
      if (d.saveConversations !== undefined) saveConversationsEnabled = d.saveConversations !== false;
    }, function(err) {
      console.warn('[SOKAN Bot] Config snapshot error:', err);
    });

    // Lecture initiale pour le premier rendu
    var snap = await db.collection('settings').doc('chatbot').get();
    if (snap.exists) {
      var d = snap.data();
      if (d.enabled === false) return false;
      if (d.name)      CONFIG.name      = d.name;
      if (d.welcomeFr) CONFIG.welcomeFr = d.welcomeFr;
      if (d.welcomeEn) CONFIG.welcomeEn = d.welcomeEn;
      if (d.context)   CONFIG.context   = d.context;
      if (d.saveConversations !== undefined) saveConversationsEnabled = d.saveConversations !== false;
    }
    return true;
  } catch(e) {
    console.warn('[SOKAN Bot] Firebase init error:', e);
    return true; // Continue sans Firebase
  }
}

/* ══ SAUVEGARDE CONVERSATION FIRESTORE ═══════════════ */
async function saveConv(userMsg, botReply) {
  try {
    if (!db || !saveConversationsEnabled) return;
    var ts = (firebase.firestore && firebase.firestore.FieldValue)
      ? firebase.firestore.FieldValue.serverTimestamp()
      : new Date();
    // ✅ Chaque échange = document séparé dans collection "messages"
    await db.collection('messages').add({
      user:      userMsg,
      bot:       botReply,
      lang:      lang,
      sessionId: sessionId,
      createdAt: ts
    });
  } catch(e) {
    console.warn('[SOKAN Bot] Firestore save error:', e);
  }
}

/* ══ CSS ══════════════════════════════════════════════ */
function injectStyles() {
  if (document.getElementById('sb-styles')) return;
  var css = `
#sb-btn{position:fixed;bottom:24px;right:24px;width:56px;height:56px;background:linear-gradient(135deg,#1E6FD9,#60AEFF);border-radius:50%;border:none;cursor:pointer;z-index:9998;box-shadow:0 4px 24px rgba(30,111,217,.5);display:flex;align-items:center;justify-content:center;transition:transform .3s,box-shadow .3s;outline:none}
#sb-btn:hover{transform:scale(1.1);box-shadow:0 6px 32px rgba(30,111,217,.6)}
#sb-btn svg{width:26px;height:26px;stroke:#fff;fill:none;stroke-width:2;stroke-linecap:round;transition:opacity .2s}
#sb-btn .sb-ico-open{display:block}
#sb-btn .sb-ico-close{display:none}
#sb-btn.open .sb-ico-open{display:none}
#sb-btn.open .sb-ico-close{display:block}
#sb-badge{position:absolute;top:-3px;right:-3px;background:#F87171;color:#fff;font-size:.6rem;font-weight:700;min-width:18px;height:18px;border-radius:9px;display:none;align-items:center;justify-content:center;border:2px solid #060912;padding:0 3px}
#sb-badge.show{display:flex}
#sb-tip{position:absolute;bottom:66px;right:0;background:#fff;color:#1a1a2e;font-size:.75rem;padding:8px 14px;border-radius:10px;white-space:nowrap;box-shadow:0 4px 20px rgba(0,0,0,.15);pointer-events:none;opacity:0;transition:opacity .3s;font-family:Inter,sans-serif;font-weight:500}
#sb-tip.show{opacity:1}
#sb-tip::after{content:'';position:absolute;bottom:-5px;right:22px;width:10px;height:10px;background:#fff;transform:rotate(45deg)}
#sb-win{position:fixed;bottom:92px;right:24px;width:360px;max-height:560px;background:#0a0e1a;border:1px solid rgba(255,255,255,.12);border-radius:20px;box-shadow:0 24px 64px rgba(0,0,0,.6);z-index:9997;display:flex;flex-direction:column;transform:scale(.92) translateY(16px);opacity:0;pointer-events:none;transition:transform .35s cubic-bezier(.4,0,.2,1),opacity .35s;font-family:Inter,system-ui,sans-serif;overflow:hidden}
#sb-win.open{transform:scale(1) translateY(0);opacity:1;pointer-events:all}
.sb-hdr{background:linear-gradient(135deg,#1E6FD9 0%,#1458a8 100%);padding:14px 16px;display:flex;align-items:center;gap:12px;flex-shrink:0}
.sb-av{width:38px;height:38px;background:rgba(255,255,255,.2);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.85rem;color:#fff;flex-shrink:0;letter-spacing:.05em}
.sb-hi{flex:1;min-width:0}
.sb-hn{font-size:.86rem;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sb-hs{font-size:.67rem;color:rgba(255,255,255,.7);display:flex;align-items:center;gap:5px;margin-top:2px}
.sb-hs::before{content:'';width:6px;height:6px;background:#4ADE80;border-radius:50%;animation:sbpulse 2s infinite;flex-shrink:0}
@keyframes sbpulse{0%,100%{opacity:1}50%{opacity:.4}}
.sb-ha{display:flex;gap:6px;flex-shrink:0}
.sb-lbtn{background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.25);color:#fff;font-size:.64rem;font-weight:700;padding:4px 9px;border-radius:6px;cursor:pointer;font-family:inherit;letter-spacing:.06em;transition:background .2s}
.sb-lbtn:hover{background:rgba(255,255,255,.28)}
.sb-xbtn{background:none;border:none;color:rgba(255,255,255,.7);cursor:pointer;font-size:1rem;padding:4px;line-height:1;display:flex;align-items:center;justify-content:center;border-radius:6px;transition:background .2s}
.sb-xbtn:hover{background:rgba(255,255,255,.15);color:#fff}
.sb-msgs{flex:1;overflow-y:auto;padding:14px 14px 8px;display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth}
.sb-msgs::-webkit-scrollbar{width:3px}
.sb-msgs::-webkit-scrollbar-thumb{background:rgba(255,255,255,.12);border-radius:10px}
.sb-msg{max-width:84%;display:flex;flex-direction:column;gap:3px;animation:sbfade .3s ease}
@keyframes sbfade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.sb-msg.bot{align-self:flex-start}
.sb-msg.usr{align-self:flex-end}
.sb-bbl{padding:9px 13px;font-size:.8rem;line-height:1.65;word-break:break-word}
.sb-msg.bot .sb-bbl{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.9);border-radius:4px 14px 14px 14px}
.sb-msg.usr .sb-bbl{background:linear-gradient(135deg,#1E6FD9,#1658b0);color:#fff;border-radius:14px 4px 14px 14px}
.sb-bbl strong{color:#60AEFF;font-weight:600}
.sb-msg.usr .sb-bbl strong{color:#fff}
.sb-time{font-size:.6rem;color:rgba(255,255,255,.22);padding:0 3px}
.sb-msg.usr .sb-time{text-align:right}
.sb-typing{align-self:flex-start;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);padding:10px 14px;border-radius:4px 14px 14px 14px;display:flex;gap:5px;animation:sbfade .3s ease}
.sb-dot{width:6px;height:6px;background:rgba(255,255,255,.4);border-radius:50%;animation:sbdot 1.2s infinite}
.sb-dot:nth-child(2){animation-delay:.2s}
.sb-dot:nth-child(3){animation-delay:.4s}
@keyframes sbdot{0%,60%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-5px);opacity:1}}
.sb-chips{display:flex;flex-wrap:wrap;gap:6px;padding:6px 14px 8px;flex-shrink:0}
.sb-chip{background:rgba(30,111,217,.15);border:1px solid rgba(30,111,217,.3);color:#60AEFF;font-size:.7rem;padding:5px 11px;border-radius:100px;cursor:pointer;transition:all .2s;white-space:nowrap;font-family:inherit;line-height:1}
.sb-chip:hover{background:rgba(30,111,217,.3);transform:translateY(-1px)}
.sb-inp-wrap{padding:10px 12px 12px;border-top:1px solid rgba(255,255,255,.08);display:flex;align-items:flex-end;gap:8px;flex-shrink:0}
#sb-inp{flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:11px;padding:9px 12px;color:#fff;font-size:.82rem;font-family:inherit;resize:none;outline:none;max-height:90px;overflow-y:auto;line-height:1.5;transition:border-color .2s}
#sb-inp:focus{border-color:rgba(30,111,217,.5)}
#sb-inp::placeholder{color:rgba(255,255,255,.22)}
#sb-snd{background:linear-gradient(135deg,#1E6FD9,#60AEFF);border:none;color:#fff;width:36px;height:36px;border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:opacity .2s,transform .2s;outline:none}
#sb-snd:hover{opacity:.9;transform:scale(1.05)}
#sb-snd:disabled{opacity:.35;cursor:not-allowed;transform:none}
#sb-snd svg{width:15px;height:15px;stroke:#fff;fill:none;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
.sb-pwd{text-align:center;font-size:.6rem;color:rgba(255,255,255,.18);padding:6px 0 8px;flex-shrink:0;letter-spacing:.04em}
@media(max-width:480px){
  #sb-win{width:calc(100vw - 20px);right:10px;bottom:78px;max-height:72vh}
  #sb-btn{bottom:14px;right:14px;width:50px;height:50px}
  #sb-btn svg{width:22px;height:22px}
}`;
  var s = document.createElement('style');
  s.id = 'sb-styles';
  s.textContent = css;
  document.head.appendChild(s);
}

/* ══ HTML ════════════════════════════════════════════ */
function buildHTML() {
  if (document.getElementById('sb-root')) return;
  var root = document.createElement('div');
  root.id = 'sb-root';
  var tipTxt = lang === 'fr' ? 'Besoin d\'aide ? 👋' : 'Need help? 👋';
  root.innerHTML =
    '<button id="sb-btn" onclick="window._sbToggle()" aria-label="Chat SOKAN">' +
      '<div id="sb-badge"></div>' +
      '<svg class="sb-ico-open" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>' +
      '<svg class="sb-ico-close" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
      '<div id="sb-tip">' + tipTxt + '</div>' +
    '</button>' +
    '<div id="sb-win">' +
      '<div class="sb-hdr">' +
        '<div class="sb-av" id="sb-av">' + CONFIG.name.charAt(0).toUpperCase() + '</div>' +
        '<div class="sb-hi">' +
          '<div class="sb-hn" id="sb-hn">' + CONFIG.name + '</div>' +
          '<div class="sb-hs" id="sb-hs">' + (lang==='fr'?'En ligne · répond instantanément':'Online · replies instantly') + '</div>' +
        '</div>' +
        '<div class="sb-ha">' +
          '<button class="sb-lbtn" id="sb-lbtn" onclick="window._sbLang()">' + (lang==='fr'?'EN':'FR') + '</button>' +
          '<button class="sb-xbtn" onclick="window._sbToggle()">✕</button>' +
        '</div>' +
      '</div>' +
      '<div class="sb-msgs" id="sb-msgs"></div>' +
      '<div class="sb-chips" id="sb-chips"></div>' +
      '<div class="sb-inp-wrap">' +
        '<textarea id="sb-inp" rows="1" placeholder="' + (lang==='fr'?'Votre message...':'Your message...') + '"></textarea>' +
        '<button id="sb-snd" onclick="window._sbSend()" aria-label="Envoyer">' +
          '<svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>' +
        '</button>' +
      '</div>' +
      '<div class="sb-pwd">SOKAN BUSINESS · Assistant virtuel IA</div>' +
    '</div>';
  document.body.appendChild(root);
}

/* ══ RENDER MESSAGES ══════════════════════════════════ */
function renderMsg(role, text) {
  var msgs = document.getElementById('sb-msgs');
  if (!msgs) return;
  var now = new Date().toLocaleTimeString(lang==='fr'?'fr-FR':'en-US', {hour:'2-digit',minute:'2-digit'});
  var d = document.createElement('div');
  d.className = 'sb-msg ' + role;
  var html = text
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\n/g,'<br>');
  d.innerHTML = '<div class="sb-bbl">' + html + '</div><div class="sb-time">' + now + '</div>';
  msgs.appendChild(d);
  msgs.scrollTop = msgs.scrollHeight;
}

function showTyping() {
  var msgs = document.getElementById('sb-msgs');
  if (!msgs || document.getElementById('sb-typing')) return;
  var el = document.createElement('div');
  el.id = 'sb-typing';
  el.className = 'sb-typing';
  el.innerHTML = '<div class="sb-dot"></div><div class="sb-dot"></div><div class="sb-dot"></div>';
  msgs.appendChild(el);
  msgs.scrollTop = msgs.scrollHeight;
}
function hideTyping() { var el=document.getElementById('sb-typing'); if(el) el.remove(); }

function showChips(arr) {
  var c = document.getElementById('sb-chips');
  if (!c) return;
  c.innerHTML = arr.map(function(ch){
    return '<button class="sb-chip" onclick="window._sbChip(this.textContent)">' + ch + '</button>';
  }).join('');
}
function clearChips() { var c=document.getElementById('sb-chips'); if(c) c.innerHTML=''; }

function showBadge() { var b=document.getElementById('sb-badge'); if(b){b.textContent=unread;b.classList.add('show');} }
function hideBadge() { var b=document.getElementById('sb-badge'); if(b)b.classList.remove('show'); unread=0; }

/* ══ ENVOI — logique hybride KB + IA ════════════════ */
window._sbSend = async function() {
  if (isTyping) return; // Anti double-envoi

  var inp = document.getElementById('sb-inp');
  if (!inp) return;
  var text = inp.value.trim();
  if (!text) return;

  inp.value = ''; inp.style.height = 'auto';
  clearChips();
  hideBadge();
  detectLang(text);
  renderMsg('usr', text);
  history.push({ role: 'user', content: text });

  isTyping = true;
  var sndBtn = document.getElementById('sb-snd');
  if (sndBtn) sndBtn.disabled = true;
  showTyping();

  // Délai naturel minimal
  await new Promise(function(r){ setTimeout(r, 500 + Math.min(text.length * 8, 800)); });

  var reply;
  var kbResult = smartReply(text);

  if (kbResult.source === 'kb') {
    // Réponse KB directe (confiance haute)
    reply = kbResult.text;
  } else {
    // Appel IA (confiance basse)
    var aiReply = await askAI(text);
    if (aiReply) {
      reply = aiReply;
    } else {
      // Fallback si IA échoue ou timeout
      reply = getFallback();
    }
  }

  hideTyping();
  renderMsg('bot', reply);
  history.push({ role: 'assistant', content: reply });
  isTyping = false;
  if (sndBtn) sndBtn.disabled = false;

  saveConv(text, reply);

  // Chips contextuelles
  var chips_fr = ['Délais livraison','Demander un devis','Nos services','Nous contacter'];
  var chips_en = ['Delivery times','Request a quote','Our services','Contact us'];
  setTimeout(function(){ showChips(lang==='fr'?chips_fr:chips_en); }, 400);
};

window._sbChip = function(text) {
  var inp = document.getElementById('sb-inp');
  if (inp) { inp.value = text; window._sbSend(); }
};

/* ══ TOGGLE ═══════════════════════════════════════════ */
window._sbToggle = function() {
  isOpen = !isOpen;
  var win = document.getElementById('sb-win');
  var btn = document.getElementById('sb-btn');
  var tip = document.getElementById('sb-tip');
  if (win) win.classList.toggle('open', isOpen);
  if (btn) btn.classList.toggle('open', isOpen);
  if (tip) tip.classList.remove('show');
  if (isOpen) hideBadge();
};

/* ══ SWITCH LANGUE ════════════════════════════════════ */
window._sbLang = function() {
  lang = lang === 'fr' ? 'en' : 'fr';
  var lbtn = document.getElementById('sb-lbtn');
  var inp  = document.getElementById('sb-inp');
  var hs   = document.getElementById('sb-hs');
  if (lbtn) lbtn.textContent = lang==='fr'?'EN':'FR';
  if (inp)  inp.placeholder  = lang==='fr'?'Votre message...':'Your message...';
  if (hs)   hs.textContent   = lang==='fr'?'En ligne · répond instantanément':'Online · replies instantly';
  clearChips();
  renderMsg('bot', lang==='fr'
    ? 'Parfait ! Je continue en français 🇫🇷 Comment puis-je vous aider ?'
    : 'Perfect! Switching to English 🇬🇧 How can I help you?');
};

/* ══ INIT ════════════════════════════════════════════ */
async function init() {
  var ok = await loadConfig();
  if (ok === false) return; // Widget désactivé via Firestore

  injectStyles();
  buildHTML();

  // Message de bienvenue
  setTimeout(function(){
    renderMsg('bot', lang==='fr' ? CONFIG.welcomeFr : CONFIG.welcomeEn);
    showChips(lang==='fr'
      ? ['Nos services','Délais livraison','Demander un devis','Nous contacter']
      : ['Our services','Delivery times','Request a quote','Contact us']);
    unread = 1;
    showBadge();
  }, 1200);

  // Tooltip
  setTimeout(function(){
    var t = document.getElementById('sb-tip');
    if (t && !isOpen) { t.classList.add('show'); setTimeout(function(){ t.classList.remove('show'); }, 4500); }
  }, 4000);

  // Events clavier
  var inp = document.getElementById('sb-inp');
  if (inp) {
    inp.addEventListener('keydown', function(e){
      if (e.key==='Enter' && !e.shiftKey){ e.preventDefault(); window._sbSend(); }
    });
    inp.addEventListener('input', function(){
      this.style.height='auto';
      this.style.height=Math.min(this.scrollHeight,90)+'px';
    });
  }
}

if (document.readyState==='loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  setTimeout(init, 200);
}

})();
