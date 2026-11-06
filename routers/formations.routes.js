const routes = require("express").Router();
const formationsService = require("../services/formations.service");

// Données détaillées des formations de l'E.C.I.C.A
const formationsData = {
  "commerce-international": {
    id: "commerce-international",
    title: "Commerce International, Logistique & Transit",
    badge: "Commerce & Douanes",
    image: "/img/picture4.webp",
    date: "05 Février 2027",
    duree: "9 mois (cours du jour et du soir)",
    rythme: "Formation initiale & continue",
    niveau: "Baccalauréat / CAP avec expérience / Équivalent",
    lieu: "Campus E.C.I.C.A — Bamako Médina-Coura",
    organisateur: "E.C.I.C.A — Département Commerce",
    frais: "Tarif conventionné / Facilités de paiement",
    places: "30 places disponibles",
    description: "La formation en Commerce International, Logistique et Transit de l'E.C.I.C.A est un cursus d'excellence préparant des cadres techniques et des gestionnaires opérationnels. Elle forme aux mécanismes des échanges internationaux, à la maîtrise intégrale des procédures douanières maliennes et sous-régionales (UEMOA, CEDEAO), ainsi qu'à la gestion stratégique et opérationnelle des chaînes d'approvisionnement et des transports multimodaux.",
    objectifs: [
      "Maîtriser les réglementations douanières et les régimes économiques en vigueur au Mali et dans l'espace UEMOA/CEDEAO.",
      "Gérer de bout en bout les opérations d'import-export et maîtriser les Incoterms 2020.",
      "Piloter le dédouanement informatisé avec les outils modernes (notamment SYDONIA World / Guichet Unique).",
      "Planifier, coordonner et optimiser la logistique d'acheminement des marchandises (maritime, routier, aérien et ferroviaire).",
      "Sécuriser les transactions financières internationales (crédit documentaire, remise documentaire, risque de change).",
      "Négocier et manager les relations avec les transitaires, armateurs, banques, assurances et transporteurs."
    ],
    programme: [
      {
        module: "Module 1 : Économie & Droit du Commerce International",
        details: "Contrats de vente internationaux, Incoterms 2020, conventions internationales de transport et réglementation du commerce extérieur."
      },
      {
        module: "Module 2 : Procédures Douanières & Fiscalité de Porte",
        details: "Tarif douanier, valeur en douane, régimes douaniers suspensifs, contentieux douanier et pratique du dédouanement informatisé (SYDONIA)."
      },
      {
        module: "Module 3 : Logistique Globale & Supply Chain Management",
        details: "Gestion d'entrepôt, gestion des stocks, chaîne logistique intégrée, traçabilité et gestion des flux de marchandises."
      },
      {
        module: "Module 4 : Gestion des Transports Internationaux & Transit",
        details: "Affrètement maritime, fret aérien, corridors routiers (Dakar, Abidjan, Lomé, San Pedro), multimodalité et assurances transport."
      },
      {
        module: "Module 5 : Techniques Bancaires & Financement International",
        details: "Crédit documentaire, encaissement documentaire, garanties bancaires internationales et couverture du risque de change."
      },
      {
        module: "Module 6 : Projet Professionnel & Stage Pratique",
        details: "Immersion professionnelle en agence de transit, direction des douanes ou département import-export avec soutenance de mémoire."
      }
    ],
    debouches: [
      "Déclarant en douane agréé",
      "Agent d'exploitation transit et fret",
      "Responsable logistique & chaîne d'approvisionnement",
      "Gestionnaire des opérations import / export",
      "Courtier maritime ou aérien",
      "Cadre des services commerciaux et d'expédition internationale",
      "Consultant junior en commerce international"
    ],
    prerequis: "Titulaire d'un Baccalauréat (toutes séries confondues), d'un Brevet de Technicien (BT) ou d'un CAP avec au moins 3 années d'expérience professionnelle dans le secteur commercial ou administratif.",
    certification: "Brevet de Technicien Professionnel / Certificat de Qualification E.C.I.C.A reconnu par le Ministère en charge de l'Enseignement Technique et Professionnel."
  },

  "maintenance-industrielle": {
    id: "maintenance-industrielle",
    title: "Maintenance des Systèmes Industriels & Automatismes",
    badge: "Génie Industriel",
    image: "/img/picture1.webp",
    date: "18 Novembre 2026",
    duree: "10 mois",
    rythme: "Formation théorique et pratique en atelier",
    niveau: "Bac Technique / CAP Industriel / BT",
    lieu: "Campus E.C.I.C.A — Ateliers Génie Industriel",
    organisateur: "E.C.I.C.A — Département Industrie",
    frais: "Tarif conventionné",
    places: "25 places disponibles",
    description: "Cette formation de pointe forme des techniciens supérieurs capables d'assurer l'installation, le diagnostic, la maintenance préventive et corrective des équipements industriels électromécaniques, pneumatiques, hydrauliques et automatisés.",
    objectifs: [
      "Diagnostiquer les pannes mécaniques, électriques et pneumatiques sur des lignes de production automatisées.",
      "Programmer et dépanner des automates programmables industriels (API).",
      "Concevoir et appliquer des plans de maintenance préventive et prédictive.",
      "Appliquer scrupuleusement les normes de sécurité industrielle et environnementales (HSE)."
    ],
    programme: [
      { module: "Module 1 : Électrotechnique appliquée et schémas industriels", details: "Moteurs, variateurs de vitesse et distribution électrique." },
      { module: "Module 2 : Mécanique industrielle, pneumatique et hydraulique", details: "Pompes, vérins, compresseurs et circuits fluidiques." },
      { module: "Module 3 : Automatisme et supervision industrielle", details: "Programmation API, capteurs industriels et interfaces homme-machine." },
      { module: "Module 4 : GMAO et organisation de la maintenance", details: "Logiciels de GMAO, gestion des pièces de rechange et analyse des coûts." }
    ],
    debouches: [
      "Technicien de maintenance industrielle",
      "Automaticien de ligne de production",
      "Responsable d'atelier mécanique",
      "Agent technique de contrôle et régulation"
    ],
    prerequis: "Niveau Baccalauréat technique ou professionnel, BT mécanique/électromécanique ou CAP avec expérience.",
    certification: "Certificat de Qualification Professionnelle E.C.I.C.A en Maintenance Industrielle."
  },

  "comptabilite-finance": {
    id: "comptabilite-finance",
    title: "Comptabilité, Finance & Gestion des Entreprises",
    badge: "Commerce & Finance",
    image: "/img/picture2.webp",
    date: "02 Décembre 2026",
    duree: "9 mois",
    rythme: "Cours du jour / Cours du soir",
    niveau: "Baccalauréat toutes séries / BT / CAP",
    lieu: "Campus E.C.I.C.A — Pôle Gestion",
    organisateur: "E.C.I.C.A — Département Commerce",
    frais: "Tarif conventionné",
    places: "35 places disponibles",
    description: "Une formation complète et rigoureuse pour maîtriser l'ensemble des opérations comptables, fiscales, budgétaires et financières des entreprises et administrations selon le système comptable SYSCOHADA révisé.",
    objectifs: [
      "Tenir la comptabilité générale et analytique conformément au SYSCOHADA.",
      "Établir les déclarations fiscales et sociales (TVA, ITS, INPS, etc.).",
      "Maîtriser les logiciels comptables de référence (Sage Saari, Excel avancé).",
      "Analyser les états financiers et participer à la gestion de trésorerie."
    ],
    programme: [
      { module: "Module 1 : Comptabilité générale selon le SYSCOHADA révisé", details: "Écritures comptables, inventaire, clôture et états financiers." },
      { module: "Module 2 : Fiscalité et législation sociale malienne", details: "Taxes, impôts sur les sociétés, charges sociales et paie." },
      { module: "Module 3 : Outils informatiques et progiciels comptables", details: "Pratique intensive sur Sage Compta, Sage Paie et modélisation Excel." },
      { module: "Module 4 : Contrôle de gestion et analyse financière", details: "Seuil de rentabilité, budgets, ratios et tableaux de bord." }
    ],
    debouches: [
      "Comptable d'entreprise ou d'ONG",
      "Assistant auditeur en cabinet d'expertise comptable",
      "Gestionnaire de paie et de trésorerie",
      "Contrôleur de gestion junior"
    ],
    prerequis: "Niveau Baccalauréat toutes séries, BT Comptabilité ou diplôme équivalent.",
    certification: "Brevet Professionnel / Certificat E.C.I.C.A en Comptabilité et Gestion."
  },

  "reseaux-cybersecurite": {
    id: "reseaux-cybersecurite",
    title: "Administration Réseaux, Systèmes & Cybersécurité",
    badge: "Numérique & IT",
    image: "/img/picture3.webp",
    date: "15 Décembre 2026",
    duree: "9 mois",
    rythme: "Formation pratique en laboratoire informatique",
    niveau: "Bac Scientifique / Technique / Informatique",
    lieu: "Campus E.C.I.C.A — Laboratoire Numérique",
    organisateur: "E.C.I.C.A — Pôle Informatique & Technologies",
    frais: "Tarif conventionné",
    places: "20 places disponibles",
    description: "Formation de pointe axée sur le déploiement d'infrastructures réseaux, la gestion des serveurs Linux/Windows et la protection des données d'entreprise contre les cybermenaces.",
    objectifs: [
      "Concevoir, configurer et interconnecter des réseaux informatiques d'entreprise (Cisco, Mikrotik).",
      "Administrer des parcs serveurs sous Linux (Debian/Ubuntu) et Windows Server (Active Directory).",
      "Déployer des mesures de sécurité défensive (Firewall, VPN, sauvegardes, audit de vulnérabilités)."
    ],
    programme: [
      { module: "Module 1 : Architecture des Réseaux Informatiques", details: "Routage, commutation, VLANs, protocoles TCP/IP et Wi-Fi sécurisé." },
      { module: "Module 2 : Administration Système Windows & Linux", details: "Active Directory, DNS, DHCP, serveurs web, virtualisation VMware/Proxmox." },
      { module: "Module 3 : Cybersécurité et Protection des Données", details: "Sécurité réseau, pare-feu pfSense/Fortinet, durcissement et plans de continuité." }
    ],
    debouches: [
      "Administrateur systèmes et réseaux",
      "Technicien support informatique & infrastructure",
      "Assistant sécurité informatique / Cybersécurité"
    ],
    prerequis: "Baccalauréat, forte appétence pour l'informatique ou diplôme de base IT.",
    certification: "Certificat Professionnel E.C.I.C.A en Administration Réseaux & Cybersécurité."
  },

  "management-public": {
    id: "management-public",
    title: "Management Public, Gestion de Projets & Administration",
    badge: "Administration",
    image: "/img/picture5.webp",
    date: "10 Janvier 2027",
    duree: "8 mois",
    rythme: "Cours du soir et week-end",
    niveau: "Baccalauréat / BT / Diplôme universitaire",
    lieu: "Campus E.C.I.C.A — Amphithéâtre Administration",
    organisateur: "E.C.I.C.A — Département Administration",
    frais: "Tarif conventionné",
    places: "30 places disponibles",
    description: "Prépare les agents et cadres des institutions publiques, des collectivités territoriales et des organisations non-gouvernementales à la conduite efficace des politiques publiques et au management de projets.",
    objectifs: [
      "Maîtriser les rouages de l'administration publique malienne et la passation des marchés publics.",
      "Concevoir, planifier et piloter des projets de développement socio-économique.",
      "Manager les équipes administratives et rédiger les actes administratifs officiels."
    ],
    programme: [
      { module: "Module 1 : Droit administratif et gouvernance publique", details: "Organisation de l'État, décentralisation et rédaction administrative." },
      { module: "Module 2 : Passation et gestion des marchés publics", details: "Code des marchés publics, élaboration des DAO et suivi d'exécution." },
      { module: "Module 3 : Méthodologie de gestion de projets", details: "Cadre logique, budget, planification Gantt et suivi-évaluation (S&E)." }
    ],
    debouches: [
      "Gestionnaire de projet en ONG ou institution",
      "Secrétaire général de mairie ou de collectivité",
      "Agent de passation des marchés publics"
    ],
    prerequis: "Baccalauréat ou expérience avérée dans le secteur public ou associatif.",
    certification: "Certificat de Qualification E.C.I.C.A en Management Public."
  },

  "electrotechnique": {
    id: "electrotechnique",
    title: "Électrotechnique Industrielle & Énergies Renouvelables",
    badge: "Génie Électrique",
    image: "/img/first.webp",
    date: "22 Janvier 2027",
    duree: "10 mois",
    rythme: "Cours théoriques et travaux pratiques sur banc d'essai",
    niveau: "Baccalauréat Technique / CAP / BT Électrotechnique",
    lieu: "Campus E.C.I.C.A — Laboratoire Énergie",
    organisateur: "E.C.I.C.A — Département Industrie",
    frais: "Tarif conventionné",
    places: "25 places disponibles",
    description: "Une formation pratique répondant aux forts besoins en énergie électrique industrielle et solaire photovoltaïque au Mali et dans la sous-région.",
    objectifs: [
      "Dimensionner, installer et maintenir des systèmes solaires photovoltaïques autonomes et raccordés.",
      "Réaliser des installations électriques industrielles et tertiaires en haute/basse tension.",
      "Dépanner les moteurs électriques et les armoires de commande industrielle."
    ],
    programme: [
      { module: "Module 1 : Installations électriques industrielles", details: "Armoires électriques, transformateurs, appareillage et protection." },
      { module: "Module 2 : Énergie solaire photovoltaïque", details: "Dimensionnement, onduleurs, parcs batteries, régulateurs et maintenance solaire." },
      { module: "Module 3 : Sécurité électrique et habilitation", details: "Normes NFC 15-100, mise à la terre et habilitation électrique." }
    ],
    debouches: [
      "Technicien installateur solaire photovoltaïque",
      "Électrotechnicien d'usine ou de bâtiment",
      "Chef d'équipe d'installation électrique"
    ],
    prerequis: "Niveau Bac technique, BT électromécanique ou CAP électricité.",
    certification: "Brevet Professionnel E.C.I.C.A en Électrotechnique & Énergies Solaires."
  },

  "developpement-applications": {
    id: "developpement-applications",
    title: "Développement d'Applications & Systèmes d'Information",
    badge: "Pôle Digital",
    image: "/img/IMG_0288.webp",
    date: "18 Février 2027",
    duree: "9 mois",
    rythme: "Formation projet par projet / coding lab",
    niveau: "Baccalauréat / Passion pour la programmation",
    lieu: "Campus E.C.I.C.A — Salle Multimédia",
    organisateur: "E.C.I.C.A — Pôle Informatique & Technologies",
    frais: "Tarif conventionné",
    places: "25 places disponibles",
    description: "Apprenez à concevoir et développer des applications web et mobiles modernes, de la base de données jusqu'à l'interface utilisateur interactive.",
    objectifs: [
      "Maîtriser les technologies web fondamentales (HTML5, CSS3, JavaScript moderne).",
      "Développer des backends performants et des APIs REST avec Node.js/Express ou Python.",
      "Modéliser et administrer des bases de données relationnelles (PostgreSQL/MySQL)."
    ],
    programme: [
      { module: "Module 1 : Développement Front-End", details: "Interfaces modernes, responsive design, JavaScript ES6+ et frameworks." },
      { module: "Module 2 : Développement Back-End & Base de données", details: "Node.js, Express, architecture MVC, API REST et PostgreSQL." },
      { module: "Module 3 : Conception logicielle & Bonnes pratiques", details: "Git, GitHub, sécurité web, déploiement serveur et tests." }
    ],
    debouches: [
      "Développeur web & mobile junior",
      "Intégrateur d'applications d'entreprise",
      "Gestionnaire de systèmes d'information"
    ],
    prerequis: "Baccalauréat ou bonne culture numérique et logique algorithmique.",
    certification: "Certificat Professionnel E.C.I.C.A de Développeur d'Applications."
  },

  "ressources-humaines": {
    id: "ressources-humaines",
    title: "Gestion des Ressources Humaines & Droit du Travail",
    badge: "Administration",
    image: "/img/picture1.webp",
    date: "03 Mars 2027",
    duree: "8 mois",
    rythme: "Cours du soir et ateliers pratiques",
    niveau: "Baccalauréat / BT / Expérience administrative",
    lieu: "Campus E.C.I.C.A — Pôle Administration",
    organisateur: "E.C.I.C.A — Département Administration",
    frais: "Tarif conventionné",
    places: "30 places disponibles",
    description: "Une formation stratégique pour maîtriser la gestion administrative du personnel, le droit du travail malien, le recrutement et la politique de rémunération.",
    objectifs: [
      "Appliquer la législation du travail malienne (Code du travail, conventions collectives).",
      "Gérer le recrutement, l'intégration, la formation continue et l'évaluation du personnel.",
      "Élaborer et vérifier les bulletins de paie et les déclarations aux organismes sociaux."
    ],
    programme: [
      { module: "Module 1 : Droit du travail et relations sociales", details: "Contrats de travail, congés, licenciement, délégués du personnel et contentieux." },
      { module: "Module 2 : Gestion prévisionnelle des emplois et des compétences (GPEC)", details: "Recrutement, fiches de poste, plans de formation et entretiens annuels." },
      { module: "Module 3 : Administration du personnel et paie", details: "Logiciels de paie, déclarations INPS, calcul des cotisations et charges." }
    ],
    debouches: [
      "Assistant / Chargé des ressources humaines",
      "Gestionnaire de la paie et du personnel",
      "Responsable de formation en entreprise ou ONG"
    ],
    prerequis: "Niveau Baccalauréat toutes séries ou diplôme équivalent.",
    certification: "Certificat de Qualification E.C.I.C.A en Gestion des Ressources Humaines."
  }
};

// Route pour la page Système Éducatif
routes.get("/SystemeEducatif", (req, res, next) => {
  res.render("systeme-educatif", {
    canonicalPath: "/Formation/SystemeEducatif",
    pageTitle: "Système Éducatif - ECICA",
    metaDescription: "Le système éducatif de l'ECICA à Bamako, Mali : filières, niveaux et programmes de formation.",
  });
});

// Route détails de formation par paramètre d'URL (ex: /Formation/detailsFormation/commerce-international)
routes.get("/detailsFormation/:id", async (req, res, next) => {
  try {
    const formationId = req.params.id;
    const allFormations = await formationsService.getAllFormations();
    const formation =
      (await formationsService.getFormationById(formationId)) ||
      allFormations[0] ||
      formationsData["commerce-international"];
    const otherFormations = allFormations.filter((f) => f.id !== formation.id).slice(0, 4);

    res.render("detailsFormation", {
      canonicalPath: `/Formation/detailsFormation/${formation.id}`,
      pageTitle: `${formation.title} - Formation ECICA`,
      metaDescription: `${formation.title} à l'E.C.I.C.A Bamako : programme complet, débouchés, date de rentrée ${formation.date} et inscription.`,
      formation,
      otherFormations,
    });
  } catch (err) {
    next(err);
  }
});

// Route détails de formation par query param ou par défaut (ex: /Formation/detailsFormation?id=commerce-international)
routes.get("/detailsFormation", async (req, res, next) => {
  try {
    const formationId = req.query.id;
    const allFormations = await formationsService.getAllFormations();
    const formation =
      (formationId ? await formationsService.getFormationById(formationId) : null) ||
      allFormations[0] ||
      formationsData["commerce-international"];
    const otherFormations = allFormations.filter((f) => f.id !== formation.id).slice(0, 4);

    res.render("detailsFormation", {
      canonicalPath: `/Formation/detailsFormation?id=${formation.id}`,
      pageTitle: `${formation.title} - Formation ECICA`,
      metaDescription: `${formation.title} à l'E.C.I.C.A Bamako : programme complet, débouchés, date de rentrée ${formation.date} et inscription.`,
      formation,
      otherFormations,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = routes;
