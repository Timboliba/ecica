const fs = require("node:fs/promises");
const fsSync = require("node:fs");
const path = require("node:path");

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "contents.json");

const CATEGORIES = {
  actualite: { label: "Actualité", badgeClass: "cat-actu" },
  formation: { label: "Formation", badgeClass: "cat-form" },
  evenement: { label: "Événement", badgeClass: "cat-event" },
  annonce: { label: "Annonce", badgeClass: "cat-annonce" },
};

const STATUSES = {
  published: "Publié",
  draft: "Brouillon",
};

const MONTHS = ["janv", "févr", "mars", "avr", "mai", "juin", "juil", "août", "sept", "oct", "nov", "déc"];

function formatDate(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { date: "—", hour: "" };
  return {
    date: `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
    hour: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
  };
}

// Ajoute les champs d'affichage utilisés par la vue
function enrichContent(item) {
  const cat = CATEGORIES[item.category] || CATEGORIES.actualite;
  const { date, hour } = formatDate(item.publishedAt || item.createdAt);
  return {
    ...item,
    categoryLabel: cat.label,
    badgeClass: cat.badgeClass,
    statusLabel: STATUSES[item.status] || STATUSES.draft,
    authorInitial: (item.author || "A").trim().charAt(0).toUpperCase(),
    imageUrl: item.image ? `/uploads/contents/${encodeURIComponent(item.image)}` : "/img/logo_ecica.webp",
    displayDate: date,
    displayHour: hour,
  };
}

let memoryCache = null;

async function readAll() {
  if (!fsSync.existsSync(DATA_FILE)) return [];
  try {
    return JSON.parse(await fs.readFile(DATA_FILE, "utf-8"));
  } catch (err) {
    console.error("Erreur lecture contents.json :", err.message);
    return [];
  }
}

async function getAllContents() {
  if (memoryCache) {
    return memoryCache;
  }
  const list = await readAll();
  memoryCache = list
    .sort((a, b) => new Date(b.publishedAt || b.createdAt) - new Date(a.publishedAt || a.createdAt))
    .map(enrichContent);
  return memoryCache;
}

async function addContent({ title, summary, body, category, status, publishedAt, image, author, authorRole }) {
  const now = new Date().toISOString();
  const item = {
    id: `cnt-${Date.now()}`,
    title,
    summary: summary || "",
    body: body || "",
    category: CATEGORIES[category] ? category : "actualite",
    status: STATUSES[status] ? status : "draft",
    publishedAt: publishedAt || now,
    image: image || null,
    author: author || "Administrateur",
    authorRole: authorRole || "Administrateur",
    createdAt: now,
  };

  if (!fsSync.existsSync(DATA_DIR)) {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
  const list = await readAll();
  list.push(item);

  const content = JSON.stringify(list, null, 2);
  try {
    await fs.writeFile(DATA_FILE, content, "utf-8");
  } catch (err) {
    await new Promise((resolve) => setTimeout(resolve, 80));
    await fs.writeFile(DATA_FILE, content, "utf-8");
  }

  memoryCache = null; // Invalidation du cache
  return enrichContent(item);
}

module.exports = {
  CATEGORIES,
  STATUSES,
  getAllContents,
  addContent,
};
