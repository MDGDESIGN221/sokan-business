/**
 * SOKAN BUSINESS — Chatbot Widget "Pape Cheikh" v3
 * ✅ Personnalité : Pape Cheikh — chaleureux, intelligent, sénégalais
 * ✅ Base de connaissances enrichie (logistique + conversations + questions générales)
 * ✅ Moteur IA amélioré : scoring multi-critères + fallback contextuel
 * ✅ Config lue depuis Firestore : settings/chatbot
 * ✅ Conversations sauvegardées  : bot_conversations/{sessionId}
 * ✅ Réponses en FR/EN avec détection automatique
 */

(function () {
  'use strict';

  /* ══ 1. CONFIG PAR DÉFAUT ══════════════════════════════ */
  var BOT_CFG = {
    name:      'Pape Cheikh',
    enabled:   true,
    welcomeFr: 'Salut ! Moi c\'est **Pape Cheikh**, votre assistant SOKAN BUSINESS. 👋\n\nJe suis là pour tout ce qui concerne la logistique internationale — délais, tarifs, douane, import Chine... mais on peut aussi juste discuter ! Comment puis-je vous aider ?',
    welcomeEn: 'Hey! I\'m **Pape Cheikh**, your SOKAN BUSINESS assistant. 👋\n\nI\'m here for anything logistics — transit times, quotes, customs, China imports... but we can also just chat! How can I help you?',
    context:   'SOKAN BUSINESS SARL est une entreprise de logistique internationale basée à Dakar, Sénégal.'
  };

  var sessionId = 'sb_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now();
  var messages  = [];
  var isOpen    = false;
  var isTyping  = false;
  var lang      = 'fr';
  var db;
  var msgCount  = 0; // Pour les réponses contextuelles après plusieurs échanges

  /* ══ 2. BASE DE CONNAISSANCES ENRICHIE ════════════════ */
  var KB = [

    /* ── IDENTITÉ & PERSONNALITÉ ─────────────────────── */
    {
      kw: ['qui es-tu','qui etes-vous','tu es qui','c est quoi ton nom','ton nom','comment tu t appelles','comment vous appelez','t appelles comment','vous appelez comment','comment tu t\'appelles','prénom','name','who are you','what is your name','your name'],
      fr: 'Je m\'appelle **Pape Cheikh** ! 😄 Je suis l\'assistant virtuel de SOKAN BUSINESS, basé à Dakar. Je connais tout sur la logistique internationale — fret maritime, aérien, terrestre, dédouanement...\n\nMais je suis aussi là pour discuter ! Posez-moi ce que vous voulez. 🙌',
      en: 'My name is **Pape Cheikh**! 😄 I\'m the virtual assistant for SOKAN BUSINESS, based in Dakar. I know everything about international logistics — sea, air, road freight, customs...\n\nBut I\'m also here to chat! Ask me anything. 🙌'
    },
    {
      kw: ['comment vas-tu','comment tu vas','ca va','ça va','how are you','how are u','comment allez-vous'],
      fr: 'Je vais très bien, merci de demander ! 😊 Toujours motivé pour aider. Et vous, comment ça se passe ?\n\nSi vous avez une question sur la logistique, je suis là. Sinon, on peut aussi juste causer !',
      en: 'I\'m doing great, thanks for asking! 😊 Always ready to help. How are you doing?\n\nIf you have a logistics question I\'m here, otherwise we can just chat!'
    },
    {
      kw: ['tu es un robot','tu es une ia','vous etes un robot','intelligence artificielle','ai','bot','chatbot','machine','artificiel','virtuel'],
      fr: 'Techniquement oui, je suis un assistant virtuel ! 🤖 Mais j\'ai été conçu pour être utile et humain dans mes réponses.\n\nJe connais très bien SOKAN BUSINESS et la logistique en Afrique de l\'Ouest. Qu\'est-ce que je peux faire pour vous ?',
      en: 'Technically yes, I\'m a virtual assistant! 🤖 But I\'m designed to be helpful and human in my responses.\n\nI know SOKAN BUSINESS and West Africa logistics really well. What can I do for you?'
    },
    {
      kw: ['t es fort','tu es intelligent','tu es bien','bien fait','bravo','chapeau','impressionnant','amazing','smart','clever','good job'],
      fr: 'Merci beaucoup, ça me touche ! 😄 Je fais de mon mieux pour être utile. SOKAN BUSINESS m\'a bien préparé sur tous les sujets logistiques.\n\nQuest-ce que je peux encore faire pour vous ?',
      en: 'Thank you so much, that means a lot! 😄 I do my best to be helpful. SOKAN BUSINESS has prepared me well on all logistics topics.\n\nWhat else can I do for you?'
    },
    {
      kw: ['parle moi de toi','raconte moi','qui es tu vraiment','tell me about yourself','about you','présente toi','presentez vous'],
      fr: 'Avec plaisir ! Je suis **Pape Cheikh**, l\'assistant de SOKAN BUSINESS. 🌍\n\nJe suis là 24h/24, 7j/7 pour répondre à vos questions sur :\n• 🚢 Le transport maritime\n• ✈️ Le fret aérien\n• 🚛 Le transport terrestre\n• 📋 Le dédouanement\n• 💰 Les tarifs et délais\n\nMais je peux aussi discuter de sujets généraux — je suis curieux et ouvert ! 😊',
      en: 'With pleasure! I\'m **Pape Cheikh**, SOKAN BUSINESS\'s assistant. 🌍\n\nI\'m here 24/7 to answer your questions about:\n• 🚢 Sea freight\n• ✈️ Air freight\n• 🚛 Road transport\n• 📋 Customs clearance\n• 💰 Rates and transit times\n\nBut I can also chat about general topics — I\'m curious and open-minded! 😊'
    },

    /* ── SALUTATIONS ─────────────────────────────────── */
    {
      kw: ['bonjour','salut','hello','hi','bonsoir','hey','bjr','coucou','salam','assalam','yaakar','yo'],
      fr: 'Bonjour ! 👋 Je suis **Pape Cheikh**, l\'assistant SOKAN BUSINESS. Ravi de vous accueillir !\n\nJe peux vous aider sur nos services logistiques, les délais, les tarifs... ou simplement discuter. Qu\'est-ce qui vous amène ?',
      en: 'Hello! 👋 I\'m **Pape Cheikh**, the SOKAN BUSINESS assistant. Great to have you here!\n\nI can help with our logistics services, transit times, rates... or just chat. What brings you here?'
    },

    /* ── DÉLAIS & TRANSIT ────────────────────────────── */
    {
      kw: ['delai','duree','temps','combien de temps','livraison','arrivee','arriver','transit','delay','time','how long','duration','jours','semaines'],
      fr: 'Nos délais de transit ⏱️ :\n\n• **Maritime Chine → Dakar** : 25 à 45 jours\n• **Maritime Europe → Dakar** : 10 à 20 jours\n• **Fret aérien** : 3 à 7 jours (envois urgents)\n• **Terrestre CEDEAO** : 3 à 10 jours selon destination\n\n💡 Ces délais sont indicatifs. Pour un délai précis sur votre itinéraire, contactez-nous — devis sous 24h !',
      en: 'Our transit times ⏱️ :\n\n• **Sea freight China → Dakar** : 25 to 45 days\n• **Sea freight Europe → Dakar** : 10 to 20 days\n• **Air freight** : 3 to 7 days (urgent)\n• **Road ECOWAS** : 3 to 10 days depending on destination\n\n💡 These are indicative. For a precise timeline on your route, contact us — quote within 24h!'
    },

    /* ── PRIX & DEVIS ────────────────────────────────── */
    {
      kw: ['prix','tarif','cout','combien','devis','quote','cost','price','rate','budget','facture','facturation','montant','combien ca coute','how much'],
      fr: 'Nos tarifs sont personnalisés selon 📊 :\n\n• Type de transport (maritime, aérien, terrestre)\n• Volume et poids de votre marchandise\n• Origine et destination\n• Type de service (FCL, LCL, express...)\n\n✅ **Devis gratuit sous 24h** — remplissez le formulaire sur notre site ou appelez directement le **+221 77 645 63 64** !',
      en: 'Our rates are customized based on 📊 :\n\n• Transport type (sea, air, road)\n• Volume and weight of goods\n• Origin and destination\n• Service type (FCL, LCL, express...)\n\n✅ **Free quote within 24h** — fill in the form on our site or call **+221 77 645 63 64** directly!'
    },

    /* ── TRANSPORT MARITIME ──────────────────────────── */
    {
      kw: ['maritime','bateau','mer','container','conteneur','fcl','lcl','navire','ship','sea','ocean','groupage','maersk','cma','hapag'],
      fr: 'Notre service **transport maritime** 🚢 :\n\n• **FCL** (conteneur complet) : 20\', 40\', 45\' HC\n• **LCL** (groupage) : consolidation hebdomadaire\n• Transport réfrigéré et Ro-Ro\n• Partenaires : Maersk, CMA CGM, Hapag-Lloyd, ONE\n• Couverture de tous les ports UEMOA\n\nVous expédiez depuis quel port ?',
      en: 'Our **sea freight** service 🚢 :\n\n• **FCL** (full container) : 20\', 40\', 45\' HC\n• **LCL** (groupage) : weekly consolidation\n• Reefer and Ro-Ro transport\n• Partners: Maersk, CMA CGM, Hapag-Lloyd, ONE\n• All UEMOA ports covered\n\nWhich port are you shipping from?'
    },

    /* ── FRET AÉRIEN ─────────────────────────────────── */
    {
      kw: ['aerien','avion','air','fret aerien','express','urgent','ethiopian','royal air','air france','cargo','avion','rapide','vite'],
      fr: 'Notre **fret aérien** ✈️ est idéal pour vos envois urgents :\n\n• Délai **3 à 7 jours** selon la destination\n• Solutions économiques pour fret non urgent\n• Marchandises dangereuses (DGR)\n• Pharmaceutiques et périssables\n• Charter cargo pour envois volumineux\n\nAvez-vous un envoi urgent à planifier ?',
      en: 'Our **air freight** ✈️ is perfect for urgent shipments:\n\n• **3 to 7 days** depending on destination\n• Economy options for non-urgent freight\n• Dangerous goods (DGR)\n• Pharmaceuticals and perishables\n• Cargo charter for large volumes\n\nDo you have an urgent shipment to plan?'
    },

    /* ── TRANSPORT TERRESTRE ─────────────────────────── */
    {
      kw: ['terrestre','camion','route','truck','road','cedeao','mali','guinee','gambie','mauritanie','corridor','ecowas','bamako','conakry'],
      fr: 'Notre **transport terrestre** 🚛 couvre toute la région :\n\n• Distribution locale au Sénégal\n• Corridors CEDEAO : Mali, Guinée, Gambie, Mauritanie\n• Camions bâchés, frigorifiques et bennes\n• Service last-mile, chauffeurs certifiés\n• Flotte propre et sous-traitants fiables\n\nQuelle est votre destination ?',
      en: 'Our **road transport** 🚛 covers the entire region:\n\n• Local distribution in Senegal\n• ECOWAS corridors: Mali, Guinea, Gambia, Mauritania\n• Tarpaulin, refrigerated and tipper trucks\n• Last-mile service, certified drivers\n\nWhat is your destination?'
    },

    /* ── DÉDOUANEMENT ────────────────────────────────── */
    {
      kw: ['douane','dedouanement','customs','formalite','taxe','declaration','import','export','droit de douane','taxes'],
      fr: 'Notre service **dédouanement** 📋 :\n\n• Déclarations en douane import/export/transit\n• Conseil en classification tarifaire\n• Gestion complète des formalités SENEGAL\n• Expertise en réglementation sénégalaise et CEDEAO\n• Liaison directe avec la DGD\n\nNous gérons toute la paperasse pour vous ! Vous avez une marchandise à dédouaner ?',
      en: 'Our **customs clearance** service 📋 :\n\n• Import/export/transit declarations\n• Tariff classification advice\n• Complete formalities management\n• Expertise in Senegalese and ECOWAS regulations\n• Direct liaison with customs authorities\n\nWe handle all the paperwork for you! Do you have a shipment to clear?'
    },

    /* ── ENTREPOSAGE ─────────────────────────────────── */
    {
      kw: ['entrepot','entreposage','stockage','warehouse','stock','inventaire','cross-docking','depot','magasin','stocker'],
      fr: 'Notre service **entreposage** 🏭 :\n\n• Entrepôts sécurisés à Dakar, 24h/24 – 7j/7\n• Gestion des stocks en temps réel\n• Cross-docking et préparation de commandes\n• Accès contrôlé, surveillance vidéo\n• Conditions spéciales pour marchandises sensibles\n\nContactez-nous pour les disponibilités et tarifs actuels.',
      en: 'Our **warehousing** service 🏭 :\n\n• Secure warehouses in Dakar, 24/7\n• Real-time inventory management\n• Cross-docking and order preparation\n• Controlled access, video surveillance\n• Special conditions for sensitive goods\n\nContact us for current availability and rates.'
    },

    /* ── CHINE ───────────────────────────────────────── */
    {
      kw: ['chine','china','shanghai','guangzhou','shenzhen','canton','asie','asia','yiwu','alibaba','aliexpress'],
      fr: 'Nous sommes **spécialisés dans l\'import depuis la Chine** 🇨🇳 :\n\n• Maritime : 25-45 jours, FCL et LCL très compétitifs\n• Aérien : 3-7 jours pour vos envois urgents\n• Agents partenaires à Shanghai, Guangzhou, Shenzhen, Yiwu\n• Assistance achat et inspection usine disponible\n\nDites-moi ce que vous importez et je vous prépare un devis !',
      en: 'We specialize in **imports from China** 🇨🇳 :\n\n• Sea: 25-45 days, very competitive FCL and LCL rates\n• Air: 3-7 days for urgent shipments\n• Partner agents in Shanghai, Guangzhou, Shenzhen, Yiwu\n• Purchasing assistance and factory inspection available\n\nTell me what you\'re importing and I\'ll get you a quote!'
    },

    /* ── EUROPE ──────────────────────────────────────── */
    {
      kw: ['europe','france','paris','belgique','hollande','espagne','italie','allemagne','le havre','marseille','rotterdam','anvers','amsterdam'],
      fr: 'Pour les imports **Europe → Dakar** 🇪🇺 :\n\n• Maritime : 10-20 jours (Le Havre, Marseille, Rotterdam, Anvers)\n• Aérien : 2-4 jours\n• Partenaires en France, Belgique, Pays-Bas, Espagne, Italie\n• Enlèvement chez vos fournisseurs possible\n\nVous avez une commande en Europe ? Envoyez-nous les détails !',
      en: 'For **Europe → Dakar** imports 🇪🇺 :\n\n• Sea: 10-20 days (Le Havre, Marseille, Rotterdam, Antwerp)\n• Air: 2-4 days\n• Partners in France, Belgium, Netherlands, Spain, Italy\n• Pick-up from your suppliers available\n\nHave a shipment in Europe? Send us the details!'
    },

    /* ── CONTACT ─────────────────────────────────────── */
    {
      kw: ['contact','telephone','phone','email','adresse','address','appeler','call','joindre','whatsapp','coordonnee','numero','mail','localisation'],
      fr: '📞 **Contactez SOKAN BUSINESS** :\n\n• 📱 Tél 1 : **+221 77 645 63 64**\n• 📱 Tél 2 : **+221 77 324 58 45**\n• ✉️ Email : contact@sokanbusiness.com\n• 📍 Dakar, Sénégal\n• ⏰ Lun-Ven : 08h00 – 18h00 GMT\n\nNos commerciaux répondent à toute demande de devis sous 24h !',
      en: '📞 **Contact SOKAN BUSINESS** :\n\n• 📱 Phone 1: **+221 77 645 63 64**\n• 📱 Phone 2: **+221 77 324 58 45**\n• ✉️ Email: contact@sokanbusiness.com\n• 📍 Dakar, Senegal\n• ⏰ Mon-Fri: 8am – 6pm GMT\n\nOur team responds to all quote requests within 24h!'
    },

    /* ── SERVICES GÉNÉRAUX ───────────────────────────── */
    {
      kw: ['service','offre','que faites-vous','proposez','activite','what do you do','specialite','metier','domaine'],
      fr: 'SOKAN BUSINESS vous propose **4 services clés** 🌍 :\n\n1. 🚢 **Transport Maritime** — FCL/LCL, tous ports\n2. ✈️ **Fret Aérien** — Express 3-7 jours\n3. 🚛 **Transport Terrestre** — Sénégal & CEDEAO\n4. 📋 **Dédouanement & Entreposage** — clé en main\n\nQuel service vous intéresse le plus ?',
      en: 'SOKAN BUSINESS offers **4 key services** 🌍 :\n\n1. 🚢 **Sea Freight** — FCL/LCL, all ports\n2. ✈️ **Air Freight** — Express 3-7 days\n3. 🚛 **Road Transport** — Senegal & ECOWAS\n4. 📋 **Customs & Warehousing** — turnkey\n\nWhich service interests you most?'
    },

    /* ── SUIVI CARGAISON ─────────────────────────────── */
    {
      kw: ['suivi','tracking','tracabilite','where','localiser','statut','status','mon colis','ma marchandise','ou est'],
      fr: '📍 Pour le **suivi de votre cargaison** :\n\n• Suivi en temps réel via votre espace client\n• Notifications automatiques à chaque étape\n• Votre chargé de compte vous informe proactivement\n\nVous avez un envoi en cours ? Appelez le **+221 77 645 63 64** avec votre numéro de dossier et on vous donne une info fraîche !',
      en: '📍 For **cargo tracking** :\n\n• Real-time tracking via your client portal\n• Automatic step-by-step notifications\n• Your account manager keeps you proactively informed\n\nHave a shipment in progress? Call **+221 77 645 63 64** with your file number for live info!'
    },

    /* ── PARTENAIRES ─────────────────────────────────── */
    {
      kw: ['partenaire','partner','maersk','cma cgm','hapag','one','air france','ethiopian','armateur','compagnie'],
      fr: 'SOKAN BUSINESS travaille avec les **leaders mondiaux** 💪 :\n\n🚢 Maritime : Maersk, CMA CGM, Hapag-Lloyd, ONE\n✈️ Aérien : Air France, Ethiopian Airlines, Royal Air Maroc\n\nCes partenariats nous permettent de vous offrir les meilleurs tarifs et la plus grande fiabilité du marché.',
      en: 'SOKAN BUSINESS works with **global leaders** 💪 :\n\n🚢 Sea: Maersk, CMA CGM, Hapag-Lloyd, ONE\n✈️ Air: Air France, Ethiopian Airlines, Royal Air Maroc\n\nThese partnerships allow us to offer you the best rates and highest reliability on the market.'
    },

    /* ── À PROPOS DE SOKAN ───────────────────────────── */
    {
      kw: ['sokan','sokan business','entreprise','societe','dakar','senegal','histoire','fondation','equipe','team'],
      fr: '**SOKAN BUSINESS SARL** est une entreprise de logistique internationale basée à **Dakar, Sénégal** 🇸🇳\n\nNous sommes spécialisés dans :\n• L\'import depuis la Chine et l\'Europe\n• Le transport multimodal en Afrique de l\'Ouest\n• Le dédouanement au Sénégal\n\nNotre mission : rendre la logistique internationale **simple, fiable et accessible** pour les entreprises africaines. 🌍',
      en: '**SOKAN BUSINESS SARL** is an international logistics company based in **Dakar, Senegal** 🇸🇳\n\nWe specialize in:\n• Imports from China and Europe\n• Multimodal transport in West Africa\n• Customs clearance in Senegal\n\nOur mission: make international logistics **simple, reliable and accessible** for African businesses. 🌍'
    },

    /* ── QUESTIONS GÉNÉRALES / HORS-SUJET ────────────── */
    {
      kw: ['meteo','weather','pluie','soleil','temperature','chaud','froid','temps qu il fait'],
      fr: 'Ahh la météo ! 😄 Je ne suis pas météorologue, mais je sais que Dakar a un climat agréable la plupart de l\'année.\n\nPar contre pour la météo logistique — délais, disponibilités, conditions de transport — là je suis votre homme ! 😉',
      en: 'Ahh the weather! 😄 I\'m not a meteorologist, but I know Dakar has a pleasant climate most of the year.\n\nFor logistics weather though — delays, availability, transport conditions — I\'m your guy! 😉'
    },
    {
      kw: ['sport','football','foot','senegal','lions','coupe du monde','champion','match','ballon'],
      fr: 'Le sport, j\'adore ça ! 😄 Les Lions du Sénégal — champions d\'Afrique 2022, quelle fierté nationale !\n\nMais je suis surtout expert en logistique internationale. Si vous avez des marchandises à transporter, je suis là ! 🦁',
      en: 'Sports, I love it! 😄 The Lions of Senegal — 2022 African Champions, what national pride!\n\nBut I\'m mainly an international logistics expert. If you have goods to transport, I\'m here! 🦁'
    },
    {
      kw: ['cuisine','manger','nourriture','restaurant','thieboudienne','yassa','mafe','food','eat'],
      fr: 'Vous parlez de nourriture ? Le thiéboudiène, le yassa, le mafé... la cuisine sénégalaise c\'est une autre logistique — tout s\'assemble parfaitement ! 😄\n\nParlant de logistique, si vous avez des marchandises agroalimentaires à importer ou exporter, on peut vous aider avec ça aussi ! 🌾',
      en: 'Talking about food? Thiéboudiène, yassa, mafé... Senegalese cuisine is another kind of logistics — everything comes together perfectly! 😄\n\nSpeaking of logistics, if you have agri-food goods to import or export, we can help with that too! 🌾'
    },
    {
      kw: ['blague','joke','drole','humour','funny','rire','marrant','rigolo'],
      fr: 'Une blague logistique ? 😄\n\nPourquoi le conteneur n\'a jamais peur ? Parce qu\'il a toujours **ses deux pieds sur le port** ! 🚢\n\nBon, peut-être pas l\'humour du siècle... mais je suis bien meilleur en logistique qu\'en stand-up ! Comment puis-je vous aider ?',
      en: 'A logistics joke? 😄\n\nWhy does the container never worry? Because it always has **a port in the storm**! 🚢\n\nOkay, maybe not the joke of the century... but I\'m much better at logistics than stand-up! How can I help you?'
    },
    {
      kw: ['ennui','ennuyeux','boring','chiant','nul','mauvais'],
      fr: 'Oups ! Je vais faire mieux, promis. 😄 Donnez-moi une vraie question — sur la logistique, sur le Sénégal, sur n\'importe quoi — et je vous montrerai ce que je vaux vraiment !',
      en: 'Oops! I\'ll do better, I promise. 😄 Give me a real question — about logistics, about Senegal, about anything — and I\'ll show you what I\'m really worth!'
    },
    {
      kw: ['aide','help','besoin','question','demande','probleme','problem','issue','souci','difficulte'],
      fr: 'Je suis là pour vous aider ! 😊 Dites-moi ce dont vous avez besoin :\n\n• Questions sur nos **services** logistiques ?\n• Besoin d\'un **devis** ?\n• Informations sur les **délais** ou **tarifs** ?\n• Ou autre chose ?\n\nAllez-y, je vous écoute !',
      en: 'I\'m here to help! 😊 Tell me what you need:\n\n• Questions about our **logistics services**?\n• Need a **quote**?\n• Information on **transit times** or **rates**?\n• Or something else?\n\nGo ahead, I\'m listening!'
    },
    {
      kw: ['merci','thank','super','parfait','excellent','tres bien','genial','nickel','top','bravo','bien'],
      fr: 'Avec plaisir ! 😊 C\'est pour ça que je suis là. N\'hésitez pas à revenir pour toute autre question.\n\nVous pouvez aussi nous contacter directement :\n📞 **+221 77 645 63 64**\n✉️ **contact@sokanbusiness.com**',
      en: 'You\'re welcome! 😊 That\'s what I\'m here for. Don\'t hesitate to come back for any other questions.\n\nYou can also reach us directly:\n📞 **+221 77 645 63 64**\n✉️ **contact@sokanbusiness.com**'
    },
    {
      kw: ['au revoir','bye','goodbye','bonne journee','a bientot','ciao','adieu','salam','partis'],
      fr: 'À bientôt ! 👋 Ce fut un plaisir d\'échanger avec vous. Toute l\'équipe SOKAN BUSINESS reste à votre disposition.\n\nBonne journée et à très vite ! 🌟',
      en: 'Goodbye! 👋 It was a pleasure chatting with you. The entire SOKAN BUSINESS team is at your service.\n\nHave a great day and see you soon! 🌟'
    },
    {
      kw: ['oui','ok','daccord','bien sur','absolument','sure','yes','parfait','alright','entendu'],
      fr: 'Super ! 😊 Dites-moi la suite — comment puis-je vous aider concrètement ?',
      en: 'Great! 😊 Tell me more — how can I help you concretely?'
    },
    {
      kw: ['non','no','pas vraiment','nope','pas du tout','negatif'],
      fr: 'Pas de problème ! 😊 Si vous avez une autre question ou besoin d\'aide, je suis là. Qu\'est-ce que je peux faire pour vous ?',
      en: 'No problem! 😊 If you have another question or need help, I\'m here. What can I do for you?'
    }
  ];

  /* ══ 3. MOTEUR IA AMÉLIORÉ ═══════════════════════════ */
  function smartReply(userMsg) {
    // Normaliser : enlever accents, minuscules, ponctuation
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
          // Score basé sur la longueur du mot-clé (plus long = plus précis)
          score += kwNorm.length > 8 ? 5 : kwNorm.length > 5 ? 3 : 2;
          // Bonus si c'est un mot entier
          if (words.indexOf(kwNorm) !== -1) score += 1;
        }
      });
      if (score > bestScore) { bestScore = score; bestEntry = entry; }
    });

    if (bestEntry && bestScore >= 2) {
      return lang === 'fr' ? bestEntry.fr : bestEntry.en;
    }

    // Fallback intelligent — réponses variées selon le contexte
    return getFallbackReply(norm);
  }

  var fallbackIndex = 0;
  function getFallbackReply(norm) {
    // Détecter si c'est une question
    var isQuestion = norm.includes('?') || norm.startsWith('est') ||
      norm.startsWith('peut') || norm.startsWith('comment') ||
      norm.startsWith('pourquoi') || norm.startsWith('quoi') ||
      norm.startsWith('qui') || norm.startsWith('ou ') ||
      norm.startsWith('quand') || norm.startsWith('combien') ||
      norm.startsWith('what') || norm.startsWith('how') ||
      norm.startsWith('when') || norm.startsWith('where') ||
      norm.startsWith('can') || norm.startsWith('do you') ||
      norm.startsWith('is ') || norm.startsWith('are ');

    var fallbacksFr = [
      'Bonne question ! Je suis avant tout spécialisé en logistique internationale. 😊 Pouvez-vous reformuler ou me demander quelque chose sur nos services — délais, tarifs, transport, dédouanement ?\n\nOu contactez directement notre équipe : 📞 **+221 77 645 63 64**',
      'Je veux vous aider au mieux ! 🙏 Je ne suis pas sûr d\'avoir bien compris. Pouvez-vous m\'en dire plus, ou choisir un sujet dans les suggestions ci-dessous ?',
      'Intéressant ! Pour cette demande précise, il vaudrait mieux parler directement avec notre équipe commerciale. 📞 **+221 77 645 63 64** ou ✉️ contact@sokanbusiness.com\n\nJe reste là pour toute question logistique !',
      'Je suis **Pape Cheikh** et je connais très bien la logistique — mais pour ça, je dois avouer que je ne suis pas sûr de bien vous suivre ! 😄 Reformulez et je fais de mon mieux.',
    ];

    var fallbacksEn = [
      'Good question! I\'m mainly specialized in international logistics. 😊 Could you rephrase, or ask me about our services — transit times, rates, transport, customs?\n\nOr contact our team directly: 📞 **+221 77 645 63 64**',
      'I want to help you properly! 🙏 I\'m not sure I understood well. Could you tell me more, or choose a topic from the suggestions below?',
      'Interesting! For this specific request, it would be better to speak directly with our sales team. 📞 **+221 77 645 63 64** or ✉️ contact@sokanbusiness.com\n\nI\'m still here for any logistics question!',
      'I\'m **Pape Cheikh** and I know logistics really well — but for that one, I have to admit I\'m a bit lost! 😄 Rephrase and I\'ll do my best.',
    ];

    var replies = lang === 'fr' ? fallbacksFr : fallbacksEn;
    var reply = replies[fallbackIndex % replies.length];
    fallbackIndex++;
    return reply;
  }

  /* ══ 4. CHARGEMENT CONFIG FIRESTORE ══════════════════ */
  async function loadConfig() {
    try {
      if (typeof firebase === 'undefined') return;
      db = firebase.firestore();
      var snap = await db.collection('settings').doc('chatbot').get();
      if (snap.exists) {
        var d = snap.data();
        if (d.name)                           BOT_CFG.name      = d.name;
        if (d.welcomeFr)                      BOT_CFG.welcomeFr = d.welcomeFr;
        if (d.welcomeEn)                      BOT_CFG.welcomeEn = d.welcomeEn;
        if (d.context)                        BOT_CFG.context   = d.context;
        if (typeof d.enabled !== 'undefined') BOT_CFG.enabled   = d.enabled;
      }
    } catch (e) { /* utiliser les valeurs par défaut */ }
  }

  /* ══ 5. STYLES CSS ═══════════════════════════════════ */
  function injectStyles() {
    var css = `
      #sb-chatbot-btn {
        position:fixed;bottom:28px;right:28px;z-index:9990;
        width:60px;height:60px;border-radius:50%;
        background:linear-gradient(135deg,#1E6FD9,#60AEFF);
        border:none;cursor:pointer;box-shadow:0 4px 24px rgba(30,111,217,.6);
        display:flex;align-items:center;justify-content:center;
        transition:transform .25s cubic-bezier(.4,0,.2,1),box-shadow .25s;outline:none;
      }
      #sb-chatbot-btn:hover{transform:scale(1.1);box-shadow:0 8px 32px rgba(30,111,217,.75)}
      #sb-chatbot-btn svg{width:26px;height:26px;transition:opacity .22s,transform .22s}
      #sb-chatbot-btn .sb-ic-chat{opacity:1;position:absolute}
      #sb-chatbot-btn .sb-ic-close{opacity:0;position:absolute;transform:rotate(-90deg)}
      #sb-chatbot-btn.open .sb-ic-chat{opacity:0;transform:rotate(90deg)}
      #sb-chatbot-btn.open .sb-ic-close{opacity:1;transform:rotate(0deg)}
      #sb-badge{
        position:absolute;top:-4px;right:-4px;width:20px;height:20px;border-radius:50%;
        background:#F87171;color:#fff;font-size:11px;font-weight:700;font-family:system-ui,sans-serif;
        display:none;align-items:center;justify-content:center;border:2px solid #060912;
        animation:sb-pop .35s cubic-bezier(.175,.885,.32,1.275);
      }
      #sb-badge.show{display:flex}
      @keyframes sb-pop{from{transform:scale(0)}to{transform:scale(1)}}

      /* Tooltip */
      #sb-tooltip{
        position:fixed;bottom:36px;right:98px;z-index:9988;
        background:#0a0e1a;border:1px solid rgba(30,111,217,.25);
        color:rgba(255,255,255,.85);font-size:.76rem;font-family:'Inter',system-ui,sans-serif;
        padding:9px 15px;border-radius:12px;white-space:nowrap;
        box-shadow:0 8px 24px rgba(0,0,0,.4);
        opacity:0;transform:translateX(8px);pointer-events:none;
        transition:opacity .3s,transform .3s;
      }
      #sb-tooltip.show{opacity:1;transform:translateX(0);pointer-events:auto}
      #sb-tooltip::after{
        content:'';position:absolute;right:-7px;top:50%;transform:translateY(-50%);
        border:4px solid transparent;border-left-color:rgba(30,111,217,.25);
      }

      #sb-win{
        position:fixed;bottom:104px;right:28px;z-index:9989;
        width:380px;max-width:calc(100vw - 40px);
        height:540px;max-height:calc(100vh - 140px);
        background:#0a0e1a;border:1px solid rgba(255,255,255,.1);
        border-radius:22px;display:flex;flex-direction:column;
        overflow:hidden;box-shadow:0 32px 80px rgba(0,0,0,.65);
        transform:translateY(20px) scale(.95);opacity:0;pointer-events:none;
        transition:transform .32s cubic-bezier(.4,0,.2,1),opacity .3s;
        font-family:'Inter',system-ui,sans-serif;
      }
      #sb-win.open{transform:translateY(0) scale(1);opacity:1;pointer-events:all}

      /* Header */
      .sb-hd{
        padding:14px 18px;
        background:linear-gradient(135deg,rgba(30,111,217,.18),rgba(96,174,255,.06));
        border-bottom:1px solid rgba(255,255,255,.07);
        display:flex;align-items:center;gap:12px;flex-shrink:0;
      }
      .sb-av{
        width:42px;height:42px;border-radius:50%;
        background:linear-gradient(135deg,#1E6FD9,#60AEFF);
        display:flex;align-items:center;justify-content:center;
        font-size:15px;font-weight:800;color:#fff;flex-shrink:0;
        box-shadow:0 2px 12px rgba(30,111,217,.45);
        font-family:'Playfair Display',Georgia,serif;
        letter-spacing:-.01em;
      }
      .sb-hd-info{flex:1;min-width:0}
      .sb-hd-name{font-size:.85rem;font-weight:600;color:#fff;letter-spacing:.01em}
      .sb-hd-sub{font-size:.67rem;color:rgba(255,255,255,.4);margin-top:1px}
      .sb-hd-status{font-size:.68rem;color:#4ADE80;display:flex;align-items:center;gap:5px;margin-top:3px}
      .sb-hd-status::before{
        content:'';width:7px;height:7px;border-radius:50%;background:#4ADE80;display:block;
        animation:sb-pulse 2s infinite;
      }
      @keyframes sb-pulse{0%,100%{opacity:1}50%{opacity:.35}}
      .sb-lang{
        background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);
        border-radius:8px;padding:5px 10px;color:rgba(255,255,255,.6);
        font-size:.67rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;
        cursor:pointer;font-family:inherit;transition:all .2s;flex-shrink:0;
      }
      .sb-lang:hover{background:rgba(255,255,255,.15);color:#fff}

      /* Messages */
      .sb-msgs{
        flex:1;overflow-y:auto;padding:16px;
        display:flex;flex-direction:column;gap:12px;
        scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.07) transparent;
      }
      .sb-msgs::-webkit-scrollbar{width:3px}
      .sb-msgs::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:3px}
      .sb-msg{display:flex;gap:8px;max-width:88%;animation:sb-in .28s ease}
      @keyframes sb-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
      .sb-msg.usr{align-self:flex-end;flex-direction:row-reverse}
      .sb-msg-av{
        width:30px;height:30px;border-radius:50%;
        background:linear-gradient(135deg,#1E6FD9,#60AEFF);
        display:flex;align-items:center;justify-content:center;
        font-size:11px;font-weight:700;color:#fff;flex-shrink:0;align-self:flex-end;
        font-family:'Playfair Display',Georgia,serif;
      }
      .sb-bub{
        padding:10px 14px;border-radius:16px;
        font-size:.82rem;line-height:1.7;word-break:break-word;
      }
      .sb-msg.bot .sb-bub{
        background:rgba(30,111,217,.1);border:1px solid rgba(30,111,217,.18);
        color:rgba(255,255,255,.88);border-radius:4px 16px 16px 16px;
      }
      .sb-msg.usr .sb-bub{
        background:linear-gradient(135deg,#1E6FD9,#2b8bff);
        color:#fff;border-radius:16px 4px 16px 16px;
      }
      .sb-bub strong{color:#fff;font-weight:600}
      .sb-msg.usr .sb-bub strong{color:rgba(255,255,255,.95)}

      /* Typing dots */
      .sb-dots{display:flex;gap:4px;padding:4px 2px}
      .sb-dots span{
        width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.4);
        animation:sb-dt 1.2s infinite;
      }
      .sb-dots span:nth-child(2){animation-delay:.2s}
      .sb-dots span:nth-child(3){animation-delay:.4s}
      @keyframes sb-dt{0%,60%,100%{transform:none;opacity:.3}30%{transform:translateY(-7px);opacity:1}}

      /* Chips */
      .sb-chips{padding:0 14px 12px;display:flex;flex-wrap:wrap;gap:6px;flex-shrink:0}
      .sb-chip{
        padding:6px 13px;border-radius:100px;font-size:.72rem;
        background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);
        color:rgba(255,255,255,.6);cursor:pointer;font-family:inherit;
        transition:all .18s;white-space:nowrap;
      }
      .sb-chip:hover{background:rgba(30,111,217,.2);border-color:rgba(30,111,217,.4);color:#fff}

      /* Footer */
      .sb-ft{
        padding:12px 14px;border-top:1px solid rgba(255,255,255,.07);
        display:flex;gap:8px;align-items:flex-end;flex-shrink:0;
        background:rgba(0,0,0,.2);
      }
      #sb-inp{
        flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.09);
        border-radius:13px;padding:10px 14px;color:#fff;
        font-size:.82rem;font-family:inherit;outline:none;resize:none;
        transition:border-color .2s,background .2s;line-height:1.5;
        max-height:90px;scrollbar-width:none;
      }
      #sb-inp::placeholder{color:rgba(255,255,255,.2)}
      #sb-inp:focus{border-color:rgba(30,111,217,.5);background:rgba(255,255,255,.09)}
      #sb-snd{
        width:40px;height:40px;border-radius:11px;flex-shrink:0;
        background:linear-gradient(135deg,#1E6FD9,#2b8bff);
        border:none;cursor:pointer;
        display:flex;align-items:center;justify-content:center;
        transition:all .2s;box-shadow:0 2px 10px rgba(30,111,217,.4);
      }
      #sb-snd:hover{transform:scale(1.07);box-shadow:0 4px 18px rgba(30,111,217,.65)}
      #sb-snd:disabled{opacity:.35;cursor:not-allowed;transform:none;box-shadow:none}
      #sb-snd svg{width:17px;height:17px;stroke:#fff;fill:none;stroke-width:2;stroke-linecap:round}

      /* Powered by */
      .sb-powered{
        text-align:center;padding:8px;font-size:.62rem;
        color:rgba(255,255,255,.18);border-top:1px solid rgba(255,255,255,.04);
        flex-shrink:0;font-family:inherit;
      }

      /* Mobile */
      @media(max-width:480px){
        #sb-win{right:10px;left:10px;width:auto;bottom:90px;height:72vh;max-height:72vh}
        #sb-chatbot-btn{bottom:18px;right:18px;width:54px;height:54px}
        #sb-tooltip{display:none}
      }
    `;
    var el = document.createElement('style');
    el.textContent = css;
    document.head.appendChild(el);
  }

  /* ══ 6. HTML DU WIDGET ═══════════════════════════════ */
  function buildHTML() {
    var root = document.createElement('div');
    root.id = 'sb-root';
    root.innerHTML = `
      <div id="sb-tooltip">💬 Discutez avec Pape Cheikh !</div>

      <button id="sb-chatbot-btn" aria-label="Chat SOKAN" onclick="sbToggle()">
        <span id="sb-badge" aria-hidden="true">1</span>
        <svg class="sb-ic-chat" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <svg class="sb-ic-close" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>

      <div id="sb-win" role="dialog" aria-label="Chat avec Pape Cheikh">
        <div class="sb-hd">
          <div class="sb-av">PC</div>
          <div class="sb-hd-info">
            <div class="sb-hd-name" id="sb-bot-name">Pape Cheikh</div>
            <div class="sb-hd-sub">SOKAN BUSINESS · Assistant</div>
            <div class="sb-hd-status" id="sb-status">En ligne · Répond instantanément</div>
          </div>
          <button class="sb-lang" id="sb-lang-btn" onclick="sbSwitchLang()">EN</button>
        </div>
        <div class="sb-msgs" id="sb-msgs"></div>
        <div class="sb-chips" id="sb-chips"></div>
        <div class="sb-ft">
          <textarea id="sb-inp" rows="1" placeholder="Votre message…"></textarea>
          <button id="sb-snd" onclick="sbSend()" aria-label="Envoyer">
            <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
        <div class="sb-powered">SOKAN BUSINESS · Assistant virtuel</div>
      </div>
    `;
    document.body.appendChild(root);
  }

  /* ══ 7. RENDU MESSAGES ═══════════════════════════════ */
  function renderMsg(role, text) {
    var list = document.getElementById('sb-msgs');
    if (!list) return;
    if (role === 'bot') clearChips();
    var row = document.createElement('div');
    row.className = 'sb-msg ' + role;
    var html = escHtml(text)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
    var initials = role === 'bot' ? 'PC' : '?';
    row.innerHTML = role === 'bot'
      ? '<div class="sb-msg-av">' + initials + '</div><div class="sb-bub">' + html + '</div>'
      : '<div class="sb-bub">' + html + '</div>';
    list.appendChild(row);
    list.scrollTop = list.scrollHeight;
    messages.push({ role: role, content: text });
    msgCount++;
  }

  function showTyping() {
    var list = document.getElementById('sb-msgs');
    if (!list) return;
    clearChips();
    var el = document.createElement('div');
    el.className = 'sb-msg bot'; el.id = 'sb-typing';
    el.innerHTML = '<div class="sb-msg-av">PC</div><div class="sb-bub"><div class="sb-dots"><span></span><span></span><span></span></div></div>';
    list.appendChild(el);
    list.scrollTop = list.scrollHeight;
  }

  function hideTyping() {
    var el = document.getElementById('sb-typing');
    if (el) el.remove();
  }

  /* ══ 8. CHIPS / SUGGESTIONS ══════════════════════════ */
  function showChips() {
    var el = document.getElementById('sb-chips');
    if (!el) return;
    var chips = lang === 'fr'
      ? ['Délais de livraison', 'Demander un devis', 'Import depuis la Chine', 'Nous contacter']
      : ['Delivery times', 'Request a quote', 'Import from China', 'Contact us'];
    el.innerHTML = chips.map(function(c) {
      return '<button class="sb-chip" onclick="sbChip(this)">' + c + '</button>';
    }).join('');
  }

  function clearChips() {
    var el = document.getElementById('sb-chips');
    if (el) el.innerHTML = '';
  }

  /* ══ 9. ENVOI MESSAGE ════════════════════════════════ */
  window.sbSend = async function() {
    if (isTyping) return;
    var inp = document.getElementById('sb-inp');
    if (!inp) return;
    var text = inp.value.trim();
    if (!text) return;
    inp.value = ''; inp.style.height = 'auto';
    hideBadge();
    hideTooltip();
    renderMsg('usr', text);
    isTyping = true;
    document.getElementById('sb-snd').disabled = true;
    showTyping();
    // Délai naturel variable selon longueur réponse
    var delay = 700 + Math.random() * 600;
    await new Promise(function(r){ setTimeout(r, delay); });
    var reply = smartReply(text);
    hideTyping();
    renderMsg('bot', reply);
    saveConv();
    isTyping = false;
    document.getElementById('sb-snd').disabled = false;
    setTimeout(showChips, 400);
    inp.focus();
  };

  window.sbChip = function(btn) {
    var inp = document.getElementById('sb-inp');
    if (inp) { inp.value = btn.textContent; sbSend(); }
  };

  /* ══ 10. SAUVEGARDE FIRESTORE ════════════════════════ */
  async function saveConv() {
    try {
      if (!db) return;
      await db.collection('bot_conversations').doc(sessionId).set({
        messages: messages.slice(-20),
        lang: lang,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } catch (e) { /* silencieux */ }
  }

  /* ══ 11. TOGGLE FENÊTRE ══════════════════════════════ */
  window.sbToggle = function() {
    isOpen = !isOpen;
    var btn = document.getElementById('sb-chatbot-btn');
    var win = document.getElementById('sb-win');
    if (!btn || !win) return;
    btn.classList.toggle('open', isOpen);
    win.classList.toggle('open', isOpen);
    hideTooltip();
    if (isOpen) {
      hideBadge();
      setTimeout(function() {
        var inp = document.getElementById('sb-inp');
        if (inp) inp.focus();
        var list = document.getElementById('sb-msgs');
        if (list) list.scrollTop = list.scrollHeight;
      }, 350);
    }
  };

  /* ══ 12. TOGGLE LANGUE ═══════════════════════════════ */
  window.sbSwitchLang = function() {
    lang = lang === 'fr' ? 'en' : 'fr';
    var btn    = document.getElementById('sb-lang-btn');
    var status = document.getElementById('sb-status');
    var inp    = document.getElementById('sb-inp');
    var tip    = document.getElementById('sb-tooltip');
    if (btn)    btn.textContent = lang === 'fr' ? 'EN' : 'FR';
    if (status) status.textContent = lang === 'fr' ? 'En ligne · Répond instantanément' : 'Online · Instant replies';
    if (inp)    inp.placeholder  = lang === 'fr' ? 'Votre message…' : 'Your message…';
    if (tip)    tip.textContent  = lang === 'fr' ? '💬 Discutez avec Pape Cheikh !' : '💬 Chat with Pape Cheikh!';
    clearChips();
    setTimeout(showChips, 100);
  };

  /* ══ 13. BADGE ═══════════════════════════════════════ */
  function showBadge() {
    var b = document.getElementById('sb-badge');
    if (b && !isOpen) b.classList.add('show');
  }
  function hideBadge() {
    var b = document.getElementById('sb-badge');
    if (b) b.classList.remove('show');
  }

  /* ══ 14. TOOLTIP ═════════════════════════════════════ */
  function showTooltip() {
    var t = document.getElementById('sb-tooltip');
    if (t && !isOpen) t.classList.add('show');
  }
  function hideTooltip() {
    var t = document.getElementById('sb-tooltip');
    if (t) t.classList.remove('show');
  }

  /* ══ 15. ENTRÉE + AUTO-RESIZE ════════════════════════ */
  function bindInput() {
    var inp = document.getElementById('sb-inp');
    if (!inp) return;
    inp.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sbSend(); }
    });
    inp.addEventListener('input', function() {
      inp.style.height = 'auto';
      inp.style.height = Math.min(inp.scrollHeight, 90) + 'px';
    });
  }

  /* ══ 16. HELPERS ═════════════════════════════════════ */
  function escHtml(s) {
    return String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ══ 17. INITIALISATION ══════════════════════════════ */
  async function init() {
    await loadConfig();
    if (!BOT_CFG.enabled) return;
    lang = (navigator.language || 'fr').toLowerCase().startsWith('en') ? 'en' : 'fr';
    injectStyles();
    buildHTML();
    bindInput();

    // Nom depuis config ou défaut "Pape Cheikh"
    var nameEl = document.getElementById('sb-bot-name');
    if (nameEl) nameEl.textContent = BOT_CFG.name || 'Pape Cheikh';

    // Message de bienvenue
    renderMsg('bot', lang === 'fr' ? BOT_CFG.welcomeFr : BOT_CFG.welcomeEn);
    showChips();

    // Badge après 5s, tooltip après 8s
    setTimeout(showBadge, 5000);
    setTimeout(showTooltip, 8000);
    setTimeout(hideTooltip, 16000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
