const fs = require("node:fs/promises");
const fsSync = require("node:fs");
const path = require("node:path");

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "reglements.json");
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "reglements");

const CATEGORIES = {
  "reglement-interieur": {
    label: "Règlement Intérieur",
    badgeClass: "badge-reglement",
    color: "#1e40af",
    bg: "#eff6ff",
  },
  "texte-officiel": {
    label: "Loi & Décret Ministériel",
    badgeClass: "badge-loi",
    color: "#b45309",
    bg: "#fef3c7",
  },
  "charte-ethique": {
    label: "Charte & Éthique",
    badgeClass: "badge-charte",
    color: "#047857",
    bg: "#d1fae5",
  },
  "note-service": {
    label: "Note de Service & Circulaire",
    badgeClass: "badge-note",
    color: "#6d28d9",
    bg: "#f5f3ff",
  },
  "pedagogie": {
    label: "Organisation Pédagogique",
    badgeClass: "badge-pedagogie",
    color: "#0284c7",
    bg: "#e0f2fe",
  },
  "autre": {
    label: "Autre Document",
    badgeClass: "badge-autre",
    color: "#475569",
    bg: "#f1f5f9",
  },
};

const DEFAULT_REGLEMENTS = [
  {
    id: "reglement-interieur-ecica",
    title: "Règlement Intérieur Général de l'E.C.I.C.A",
    category: "reglement-interieur",
    date: "15 Octobre 2024",
    description: "Ensemble des règles relatives à la vie scolaire, l'assiduité, les droits et devoirs des apprenants et la sécurité au sein du campus.",
    filename: null,
    fileUrl: "/docs/reglement_interieur_ecica.pdf",
    fileType: "pdf",
    fileSize: "1.2 Mo",
    createdAt: "2024-10-15T08:00:00.000Z",
  },
  {
    id: "decret-statuts-organisation",
    title: "Décret Portant Statuts et Organisation de l'E.C.I.C.A",
    category: "texte-officiel",
    date: "04 Janvier 2023",
    description: "Texte officiel régissant le statut juridique, les organes de gouvernance et les prérogatives pédagogiques de l'institution.",
    filename: null,
    fileUrl: "/docs/decret_organisation_ecica.pdf",
    fileType: "pdf",
    fileSize: "840 Ko",
    createdAt: "2023-01-04T09:30:00.000Z",
  },
  {
    id: "charte-examens-discipline",
    title: "Charte des Examens, Contrôles Continus & Discipline",
    category: "charte-ethique",
    date: "20 Septembre 2024",
    description: "Conditions de déroulement des épreuves, prévention de la fraude académique, barèmes et commissions de discipline.",
    filename: null,
    fileUrl: "/docs/charte_examens_ecica.docx",
    fileType: "docx",
    fileSize: "450 Ko",
    createdAt: "2024-09-20T10:15:00.000Z",
  },
  {
    id: "guide-stages-conventionnes",
    title: "Guide et Règlement des Stages en Entreprise",
    category: "pedagogie",
    date: "12 Novembre 2024",
    description: "Modalités d'attribution, conventions de stage, suivi en milieu professionnel et critères d'évaluation des rapports de stage.",
    filename: null,
    fileUrl: "/docs/guide_stages_ecica.pdf",
    fileType: "pdf",
    fileSize: "620 Ko",
    createdAt: "2024-11-12T14:00:00.000Z",
  },
];

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 Ko";
  const k = 1024;
  const sizes = ["Octets", "Ko", "Mo", "Go"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function slugify(text) {
  if (!text) return `reglement-${Date.now()}`;
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function enrichReglement(item) {
  const cat = CATEGORIES[item.category] || CATEGORIES.autre;
  const ext = item.fileType || (item.filename ? path.extname(item.filename).replace(".", "") : "pdf");
  const isPdf = ext.toLowerCase() === "pdf";
  const isWord = ["doc", "docx"].includes(ext.toLowerCase());

  return {
    ...item,
    categoryLabel: cat.label,
    badgeClass: cat.badgeClass,
    badgeColor: cat.color,
    badgeBg: cat.bg,
    fileType: ext.toLowerCase(),
    isPdf,
    isWord,
    downloadUrl: item.filename ? `/uploads/reglements/${item.filename}` : (item.fileUrl || "#"),
  };
}

let memoryCache = null;

async function readAll() {
  if (!fsSync.existsSync(DATA_FILE)) {
    if (!fsSync.existsSync(DATA_DIR)) {
      await fs.mkdir(DATA_DIR, { recursive: true });
    }
    await fs.writeFile(DATA_FILE, JSON.stringify(DEFAULT_REGLEMENTS, null, 2), "utf-8");
    return DEFAULT_REGLEMENTS;
  }

  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Erreur lecture data/reglements.json :", err.message);
    return DEFAULT_REGLEMENTS;
  }
}

async function saveAll(list) {
  if (!fsSync.existsSync(DATA_DIR)) {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
  const content = JSON.stringify(list, null, 2);
  try {
    await fs.writeFile(DATA_FILE, content, "utf-8");
  } catch (err) {
    await new Promise((resolve) => setTimeout(resolve, 80));
    await fs.writeFile(DATA_FILE, content, "utf-8");
  }
  memoryCache = list.map(enrichReglement);
}

async function getAllReglements() {
  if (memoryCache) {
    return memoryCache;
  }
  const list = await readAll();
  memoryCache = list.map(enrichReglement);
  return memoryCache;
}

async function getReglementById(id) {
  if (!id) return null;
  const list = await getAllReglements();
  return list.find((r) => r.id === id) || null;
}

async function addReglement(payload, file = null) {
  const title = (payload.title || "").trim();
  if (!title) {
    throw new Error("Le titre du règlement ou de la loi est obligatoire.");
  }

  const list = await readAll();

  // Protection anti-doublon concurrent
  const recentDuplicate = list.find((r) => {
    const isSameTitle = (r.title || "").toLowerCase() === title.toLowerCase();
    const timeDiff = Math.abs(Date.now() - new Date(r.createdAt || 0).getTime());
    return isSameTitle && timeDiff < 4000;
  });
  if (recentDuplicate) {
    return recentDuplicate;
  }

  let id = slugify(payload.id || title);
  if (list.some((r) => r.id === id)) {
    id = `${id}-${Date.now().toString().slice(-4)}`;
  }

  let filename = null;
  let fileType = "pdf";
  let fileSize = "—";

  if (file && file.filename) {
    filename = file.filename;
    fileType = path.extname(file.originalname).replace(".", "").toLowerCase();
    fileSize = formatBytes(file.size);
  }

  const category = (payload.category || "").trim();
  const validCategory = CATEGORIES[category] ? category : (payload.customCategory || "autre");

  const newReglement = {
    id,
    title,
    category: validCategory,
    date: (payload.date || "Rentrée 2026").trim(),
    description: (payload.description || "").trim(),
    filename,
    fileUrl: filename ? `/uploads/reglements/${filename}` : null,
    fileType,
    fileSize,
    createdAt: new Date().toISOString(),
  };

  list.unshift(newReglement);
  await saveAll(list);
  return enrichReglement(newReglement);
}

async function updateReglement(id, payload, file = null) {
  const list = await readAll();
  const index = list.findIndex((r) => r.id === id);
  if (index === -1) {
    throw new Error(`Règlement "${id}" introuvable.`);
  }

  const existing = list[index];
  let filename = existing.filename;
  let fileType = existing.fileType;
  let fileSize = existing.fileSize;

  if (file && file.filename) {
    // Si un ancien fichier uploadé existe, on le supprime proprement
    if (existing.filename) {
      const oldPath = path.join(UPLOAD_DIR, existing.filename);
      if (fsSync.existsSync(oldPath)) {
        await fs.unlink(oldPath).catch(() => {});
      }
    }
    filename = file.filename;
    fileType = path.extname(file.originalname).replace(".", "").toLowerCase();
    fileSize = formatBytes(file.size);
  }

  const updatedReglement = {
    ...existing,
    title: payload.title !== undefined ? payload.title.trim() : existing.title,
    category: payload.category !== undefined ? payload.category.trim() : existing.category,
    date: payload.date !== undefined ? payload.date.trim() : existing.date,
    description: payload.description !== undefined ? payload.description.trim() : existing.description,
    filename,
    fileUrl: filename ? `/uploads/reglements/${filename}` : existing.fileUrl,
    fileType,
    fileSize,
    updatedAt: new Date().toISOString(),
  };

  list[index] = updatedReglement;
  await saveAll(list);
  return enrichReglement(updatedReglement);
}

async function deleteReglement(id) {
  const list = await readAll();
  const index = list.findIndex((r) => r.id === id);
  if (index === -1) {
    return false;
  }

  const existing = list[index];
  if (existing.filename) {
    const filePath = path.join(UPLOAD_DIR, existing.filename);
    if (fsSync.existsSync(filePath)) {
      await fs.unlink(filePath).catch(() => {});
    }
  }

  list.splice(index, 1);
  await saveAll(list);
  return true;
}

module.exports = {
  CATEGORIES,
  getAllReglements,
  getReglementById,
  addReglement,
  updateReglement,
  deleteReglement,
};

