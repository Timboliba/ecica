const fs = require("node:fs/promises");
const fsSync = require("node:fs");
const path = require("node:path");

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "formations.json");

// Catégories prédéfinies et styles associés
const POLES = {
  "Génie Industriel": { label: "Génie Industriel", badgeClass: "badge-industrie", color: "#1e40af", bg: "#eff6ff" },
  "Commerce & Douanes": { label: "Commerce & Douanes", badgeClass: "badge-commerce", color: "#065f46", bg: "#ecfdf5" },
  "Commerce & Finance": { label: "Commerce & Finance", badgeClass: "badge-finance", color: "#047857", bg: "#d1fae5" },
  "Numérique & IT": { label: "Numérique & IT", badgeClass: "badge-it", color: "#6d28d9", bg: "#f5f3ff" },
  "Pôle Digital": { label: "Pôle Digital", badgeClass: "badge-digital", color: "#7c3aed", bg: "#faf5ff" },
  "Administration": { label: "Administration", badgeClass: "badge-admin", color: "#9a3412", bg: "#fff7ed" },
  "Génie Électrique": { label: "Génie Électrique", badgeClass: "badge-electricite", color: "#b45309", bg: "#fef3c7" },
  "BTP & Construction": { label: "BTP & Construction", badgeClass: "badge-btp", color: "#c2410c", bg: "#ffedd5" },
};

function slugify(text) {
  if (!text) return `formation-${Date.now()}`;
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Enlève les accents
    .replace(/[^a-z0-9\s-]/g, "") // Supprime les caractères non alphanumériques
    .trim()
    .replace(/\s+/g, "-") // Remplace espaces par tirets
    .replace(/-+/g, "-"); // Supprime tirets consécutifs
}

function parseArrayField(input) {
  if (Array.isArray(input)) {
    return input.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof input === "string") {
    // Si séparé par virgules ou retours à la ligne
    return input
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function parseProgrammeField(input) {
  if (Array.isArray(input)) {
    return input
      .map((item) => {
        if (typeof item === "object" && item !== null) {
          return {
            module: String(item.module || "").trim(),
            details: String(item.details || "").trim(),
          };
        }
        return null;
      })
      .filter((item) => item && item.module);
  }
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) return parseProgrammeField(parsed);
    } catch {
      // Ignorer
    }
  }
  return [];
}

function enrichFormation(item) {
  const badgeName = (item.badge || "").trim();
  const pole = POLES[badgeName] || {
    label: badgeName || "Formation",
    badgeClass: "badge-default",
    color: "#2563eb",
    bg: "#eff6ff",
  };

  return {
    ...item,
    poleLabel: pole.label,
    badgeClass: pole.badgeClass,
    badgeColor: pole.color,
    badgeBg: pole.bg,
    image: item.image || "/img/picture1.webp",
    objectifs: Array.isArray(item.objectifs) ? item.objectifs : [],
    programme: Array.isArray(item.programme) ? item.programme : [],
    debouches: Array.isArray(item.debouches) ? item.debouches : [],
  };
}

let memoryCache = null;

async function readAll() {
  if (!fsSync.existsSync(DATA_FILE)) return [];
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Erreur lecture data/formations.json :", err.message);
    return [];
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
    // Si Windows verrouille temporairement le fichier (ex: antivirus ou file watcher), retry
    await new Promise((resolve) => setTimeout(resolve, 80));
    await fs.writeFile(DATA_FILE, content, "utf-8");
  }
  memoryCache = list.map(enrichFormation);
}

async function getAllFormations() {
  if (memoryCache) {
    return memoryCache;
  }
  const list = await readAll();
  memoryCache = list.map(enrichFormation);
  return memoryCache;
}

async function getFormationById(id) {
  if (!id) return null;
  const list = await getAllFormations();
  return list.find((f) => f.id === id) || null;
}

async function addFormation(payload, file = null) {
  const title = (payload.title || "").trim();
  if (!title) {
    throw new Error("Le titre de la formation est obligatoire.");
  }

  const list = await readAll();

  // Protection anti-doublon strict (si même titre soumis à quelques secondes d'intervalle)
  const recentDuplicate = list.find((f) => {
    const isSameTitle = (f.title || "").toLowerCase() === title.toLowerCase();
    const timeDiff = Math.abs(Date.now() - new Date(f.createdAt || 0).getTime());
    return isSameTitle && timeDiff < 4000;
  });
  if (recentDuplicate) {
    console.warn("⚠️ Soumission en double interceptée et ignorée :", title);
    return recentDuplicate;
  }

  let id = slugify(payload.id || title);

  // Éviter les doublons d'ID
  if (list.some((f) => f.id === id)) {
    id = `${id}-${Date.now().toString().slice(-4)}`;
  }

  // Image
  let imagePath = payload.image || "/img/picture1.webp";
  if (file && file.filename) {
    imagePath = `/uploads/formations/${file.filename}`;
  }

  // Programme
  let programme = [];
  if (payload.module_titles && Array.isArray(payload.module_titles)) {
    const details = payload.module_details || [];
    programme = payload.module_titles
      .map((modTitle, idx) => ({
        module: String(modTitle).trim(),
        details: String(details[idx] || "").trim(),
      }))
      .filter((p) => p.module);
  } else if (payload.programme) {
    programme = parseProgrammeField(payload.programme);
  }

  const newFormation = {
    id,
    title,
    badge: (payload.badge || "").trim(),
    image: imagePath,
    date: (payload.date || "Prochaine rentrée").trim(),
    duree: (payload.duree || "9 mois").trim(),
    rythme: (payload.rythme || "Formation initiale & continue").trim(),
    niveau: (payload.niveau || "Baccalauréat / CAP / Équivalent").trim(),
    lieu: (payload.lieu || "Campus E.C.I.C.A — Bamako").trim(),
    organisateur: (payload.organisateur || "E.C.I.C.A").trim(),
    frais: (payload.frais || "Tarif conventionné").trim(),
    places: (payload.places || "30 places disponibles").trim(),
    description: (payload.description || "").trim(),
    objectifs: parseArrayField(payload.objectifs),
    programme,
    debouches: parseArrayField(payload.debouches),
    prerequis: (payload.prerequis || "Baccalauréat ou expérience professionnelle équivalente.").trim(),
    certification: (payload.certification || "Certificat de Qualification E.C.I.C.A").trim(),
    createdAt: new Date().toISOString(),
  };

  list.unshift(newFormation);
  await saveAll(list);
  return enrichFormation(newFormation);
}

async function updateFormation(id, payload, file = null) {
  const list = await readAll();
  const index = list.findIndex((f) => f.id === id);
  if (index === -1) {
    throw new Error(`Formation "${id}" introuvable.`);
  }

  const existing = list[index];

  let imagePath = existing.image;
  if (file && file.filename) {
    imagePath = `/uploads/formations/${file.filename}`;
  } else if (payload.image) {
    imagePath = payload.image;
  }

  // Programme
  let programme = existing.programme;
  if (payload.module_titles && Array.isArray(payload.module_titles)) {
    const details = payload.module_details || [];
    programme = payload.module_titles
      .map((modTitle, idx) => ({
        module: String(modTitle).trim(),
        details: String(details[idx] || "").trim(),
      }))
      .filter((p) => p.module);
  } else if (payload.programme !== undefined) {
    programme = parseProgrammeField(payload.programme);
  }

  const updatedFormation = {
    ...existing,
    title: payload.title !== undefined ? payload.title.trim() : existing.title,
    badge: payload.badge !== undefined ? payload.badge.trim() : existing.badge,
    image: imagePath,
    date: payload.date !== undefined ? payload.date.trim() : existing.date,
    duree: payload.duree !== undefined ? payload.duree.trim() : existing.duree,
    rythme: payload.rythme !== undefined ? payload.rythme.trim() : existing.rythme,
    niveau: payload.niveau !== undefined ? payload.niveau.trim() : existing.niveau,
    lieu: payload.lieu !== undefined ? payload.lieu.trim() : existing.lieu,
    organisateur: payload.organisateur !== undefined ? payload.organisateur.trim() : existing.organisateur,
    frais: payload.frais !== undefined ? payload.frais.trim() : existing.frais,
    places: payload.places !== undefined ? payload.places.trim() : existing.places,
    description: payload.description !== undefined ? payload.description.trim() : existing.description,
    objectifs: payload.objectifs !== undefined ? parseArrayField(payload.objectifs) : existing.objectifs,
    programme,
    debouches: payload.debouches !== undefined ? parseArrayField(payload.debouches) : existing.debouches,
    prerequis: payload.prerequis !== undefined ? payload.prerequis.trim() : existing.prerequis,
    certification: payload.certification !== undefined ? payload.certification.trim() : existing.certification,
    updatedAt: new Date().toISOString(),
  };

  list[index] = updatedFormation;
  await saveAll(list);
  return enrichFormation(updatedFormation);
}

async function deleteFormation(id) {
  const list = await readAll();
  const index = list.findIndex((f) => f.id === id);
  if (index === -1) {
    throw new Error(`Formation "${id}" introuvable.`);
  }

  const [removed] = list.splice(index, 1);
  await saveAll(list);
  return removed;
}

module.exports = {
  POLES,
  getAllFormations,
  getFormationById,
  addFormation,
  updateFormation,
  deleteFormation,
};

