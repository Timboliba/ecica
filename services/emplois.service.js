const fs = require("node:fs/promises");
const fsSync = require("node:fs");
const path = require("node:path");
const { pool } = require("../database");

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "emplois.json");
const EMPLOIS_DIR = path.join(process.cwd(), "public", "emplois");

const BADGE_PALETTE = [
  "#2563eb", // Blue
  "#0d9488", // Teal
  "#7c3aed", // Purple
  "#f97316", // Orange
  "#0284c7", // Sky Blue
  "#db2777", // Pink
  "#3730a3", // Indigo
  "#16a34a", // Green
  "#d97706", // Amber
  "#4f46e5"  // Indigo-600
];

const DEFAULT_ITEMS = [
  { id: "cls-1", badge: "6e A", name: "6e A", description: "Année scolaire 2025-2026", file: "6e_A.pdf", badgeColor: "#2563eb", createdAt: "2025-09-01T08:00:00.000Z" },
  { id: "cls-2", badge: "6e B", name: "6e B", description: "Année scolaire 2025-2026", file: "6e_B.pdf", badgeColor: "#0d9488", createdAt: "2025-09-01T08:00:00.000Z" },
  { id: "cls-3", badge: "5e A", name: "5e A", description: "Année scolaire 2025-2026", file: "5e_A.pdf", badgeColor: "#7c3aed", createdAt: "2025-09-01T08:00:00.000Z" },
  { id: "cls-4", badge: "5e B", name: "5e B", description: "Année scolaire 2025-2026", file: "5e_B.pdf", badgeColor: "#f97316", createdAt: "2025-09-01T08:00:00.000Z" },
  { id: "cls-5", badge: "4e A", name: "4e A", description: "Année scolaire 2025-2026", file: "4e_A.pdf", badgeColor: "#0284c7", createdAt: "2025-09-01T08:00:00.000Z" },
  { id: "cls-6", badge: "4e B", name: "4e B", description: "Année scolaire 2025-2026", file: "4e_B.pdf", badgeColor: "#db2777", createdAt: "2025-09-01T08:00:00.000Z" },
  { id: "cls-7", badge: "3e A", name: "3e A", description: "Année scolaire 2025-2026", file: "3e_A.pdf", badgeColor: "#3730a3", createdAt: "2025-09-01T08:00:00.000Z" },
  { id: "cls-8", badge: "3e B", name: "3e B", description: "Année scolaire 2025-2026", file: "3e_B.pdf", badgeColor: "#16a34a", createdAt: "2025-09-01T08:00:00.000Z" }
];

// Helper to determine file metadata
function enrichFileInfo(item) {
  const fileName = item.file || item.filename || "";
  const ext = path.extname(fileName).toLowerCase();
  const encodedFile = encodeURIComponent(fileName);

  const isWord = [".doc", ".docx", ".dot", ".dotx"].includes(ext);
  const isDocx = ext === ".docx";
  const isPdf = ext === ".pdf";
  const isExcel = [".xlsx", ".xls", ".csv", ".ods"].includes(ext);
  const isImage = [".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(ext);

  let fileTypeLabel = "Document";
  let fileTypeIcon = "file";
  let fileTypeBadge = "AUTRE";

  if (isWord) {
    fileTypeLabel = isDocx ? "Word (.docx)" : "Word (.doc)";
    fileTypeIcon = "word";
    fileTypeBadge = "WORD";
  } else if (isPdf) {
    fileTypeLabel = "PDF";
    fileTypeIcon = "pdf";
    fileTypeBadge = "PDF";
  } else if (isExcel) {
    fileTypeLabel = "Excel";
    fileTypeIcon = "excel";
    fileTypeBadge = "EXCEL";
  } else if (isImage) {
    fileTypeLabel = "Image";
    fileTypeIcon = "image";
    fileTypeBadge = "IMAGE";
  }

  return {
    id: String(item.id),
    name: item.name || item.class_name || fileName,
    badge: item.badge || "EDT",
    description: item.description || "—",
    badgeColor: item.badgeColor || item.badge_color || "#2563eb",
    file: fileName,
    createdAt: item.createdAt || item.created_at || new Date().toISOString(),
    url: `/emplois/${encodedFile}`,
    ext,
    isWord,
    isDocx,
    isPdf,
    isExcel,
    isImage,
    fileTypeLabel,
    fileTypeIcon,
    fileTypeBadge
  };
}

// Ensure local backup storage exists
async function ensureStorage() {
  if (!fsSync.existsSync(DATA_DIR)) {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
  if (!fsSync.existsSync(EMPLOIS_DIR)) {
    await fs.mkdir(EMPLOIS_DIR, { recursive: true });
  }
  if (!fsSync.existsSync(DATA_FILE)) {
    await fs.writeFile(DATA_FILE, JSON.stringify(DEFAULT_ITEMS, null, 2), "utf-8");
  }
}

async function getAllEmplois() {
  try {
    const { rows } = await pool.query(`
      SELECT id, class_name AS name, badge, badge_color AS "badgeColor", description, filename AS file, file_type AS "fileType", created_at AS "createdAt"
      FROM emplois_du_temps
      ORDER BY id ASC;
    `);

    if (rows && rows.length > 0) {
      return rows.map(enrichFileInfo);
    }
  } catch (dbErr) {
    console.warn("⚠️ PostgreSQL non accessible pour emplois_du_temps, basculement sur stockage local :", dbErr.message);
  }

  // Fallback to JSON file
  await ensureStorage();
  try {
    const rawData = await fs.readFile(DATA_FILE, "utf-8");
    const list = JSON.parse(rawData);
    return list.map(enrichFileInfo);
  } catch (err) {
    console.error("Error reading emplois.json:", err);
    return DEFAULT_ITEMS.map(enrichFileInfo);
  }
}

async function addEmploi({ name, description, badge, file, badgeColor, fileSize = 0 }) {
  // Compute badge if missing
  let computedBadge = badge;
  if (!computedBadge || !computedBadge.trim()) {
    const words = name.trim().split(" ");
    computedBadge = words.length > 1 ? `${words[0]} ${words[1].slice(0, 1).toUpperCase()}` : name.trim().slice(0, 4);
  }

  const ext = path.extname(file || "").toLowerCase();
  let fileType = "other";
  if ([".doc", ".docx"].includes(ext)) fileType = "word";
  else if (ext === ".pdf") fileType = "pdf";
  else if ([".xlsx", ".xls", ".csv"].includes(ext)) fileType = "excel";
  else if ([".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(ext)) fileType = "image";

  let color = badgeColor;
  if (!color) {
    const existing = await getAllEmplois();
    color = BADGE_PALETTE[existing.length % BADGE_PALETTE.length];
  }

  let dbItem = null;
  try {
    const { rows } = await pool.query(`
      INSERT INTO emplois_du_temps (class_name, badge, badge_color, description, filename, file_type, file_size)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, class_name AS name, badge, badge_color AS "badgeColor", description, filename AS file, file_type AS "fileType", created_at AS "createdAt";
    `, [name.trim(), computedBadge, color, (description && description.trim()) ? description.trim() : "—", file, fileType, fileSize]);

    if (rows && rows.length > 0) {
      dbItem = rows[0];
    }
  } catch (dbErr) {
    console.warn("⚠️ Impossible d'insérer dans PostgreSQL :", dbErr.message);
  }

  // Also sync to JSON file as fallback (avec tolérance lecture-seule pour Vercel)
  try {
    await ensureStorage();
    const rawData = await fs.readFile(DATA_FILE, "utf-8");
    const list = JSON.parse(rawData);
    const id = dbItem ? `cls-${dbItem.id}` : `cls-${Date.now()}`;

    const newItem = dbItem ? dbItem : {
      id,
      badge: computedBadge,
      name: name.trim(),
      description: (description && description.trim()) ? description.trim() : "—",
      file: file,
      badgeColor: color,
      createdAt: new Date().toISOString()
    };

    list.push(newItem);
    await fs.writeFile(DATA_FILE, JSON.stringify(list, null, 2), "utf-8");
    return enrichFileInfo(newItem);
  } catch (fsErr) {
    console.warn("ℹ️ Système de fichier en lecture seule (Serverless) : synchronisation JSON ignorée.", fsErr.message);
    if (dbItem) {
      return enrichFileInfo(dbItem);
    }
  }
}

async function deleteEmploi(id) {
  let deletedFromDb = false;

  // Try DB deletion
  try {
    const numId = parseInt(String(id).replace("cls-", ""), 10);
    if (!isNaN(numId)) {
      const { rowCount } = await pool.query(`DELETE FROM emplois_du_temps WHERE id = $1;`, [numId]);
      if (rowCount > 0) deletedFromDb = true;
    }
  } catch (dbErr) {
    console.warn("⚠️ Impossible de supprimer de PostgreSQL :", dbErr.message);
  }

  // Delete from JSON
  await ensureStorage();
  const rawData = await fs.readFile(DATA_FILE, "utf-8");
  let list = JSON.parse(rawData);
  const target = list.find((item) => String(item.id) === String(id) || item.name === id || String(item.id) === `cls-${id}`);
  
  if (target) {
    list = list.filter((item) => String(item.id) !== String(id) && item.name !== id && String(item.id) !== `cls-${id}`);
    await fs.writeFile(DATA_FILE, JSON.stringify(list, null, 2), "utf-8");

    const defaultFiles = DEFAULT_ITEMS.map(i => i.file);
    if (target.file && !defaultFiles.includes(target.file)) {
      const filePath = path.join(EMPLOIS_DIR, target.file);
      try {
        if (fsSync.existsSync(filePath)) {
          await fs.unlink(filePath);
        }
      } catch (e) {
        console.warn("Could not delete file:", filePath, e.message);
      }
    }
    return true;
  }

  return deletedFromDb;
}

async function updateEmploi(id, { name, description, badge, file, badgeColor, fileSize = 0 }) {
  const numId = parseInt(String(id).replace("cls-", ""), 10);
  let dbItem = null;

  // Compute badge if missing
  let computedBadge = badge;
  if (name && (!computedBadge || !computedBadge.trim())) {
    const words = name.trim().split(" ");
    computedBadge = words.length > 1 ? `${words[0]} ${words[1].slice(0, 1).toUpperCase()}` : name.trim().slice(0, 4);
  }

  let fileType = undefined;
  if (file) {
    const ext = path.extname(file || "").toLowerCase();
    if ([".doc", ".docx"].includes(ext)) fileType = "word";
    else if (ext === ".pdf") fileType = "pdf";
    else if ([".xlsx", ".xls", ".csv"].includes(ext)) fileType = "excel";
    else if ([".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(ext)) fileType = "image";
    else fileType = "other";
  }

  // Update in DB
  if (!isNaN(numId)) {
    try {
      if (file) {
        const { rows } = await pool.query(`
          UPDATE emplois_du_temps
          SET class_name = COALESCE($1, class_name),
              badge = COALESCE($2, badge),
              badge_color = COALESCE($3, badge_color),
              description = COALESCE($4, description),
              filename = $5,
              file_type = $6,
              file_size = $7,
              updated_at = NOW()
          WHERE id = $8
          RETURNING id, class_name AS name, badge, badge_color AS "badgeColor", description, filename AS file, file_type AS "fileType", created_at AS "createdAt";
        `, [name ? name.trim() : null, computedBadge || null, badgeColor || null, (description !== undefined && description !== null) ? description.trim() : null, file, fileType, fileSize, numId]);
        if (rows && rows.length > 0) dbItem = rows[0];
      } else {
        const { rows } = await pool.query(`
          UPDATE emplois_du_temps
          SET class_name = COALESCE($1, class_name),
              badge = COALESCE($2, badge),
              badge_color = COALESCE($3, badge_color),
              description = COALESCE($4, description),
              updated_at = NOW()
          WHERE id = $5
          RETURNING id, class_name AS name, badge, badge_color AS "badgeColor", description, filename AS file, file_type AS "fileType", created_at AS "createdAt";
        `, [name ? name.trim() : null, computedBadge || null, badgeColor || null, (description !== undefined && description !== null) ? description.trim() : null, numId]);
        if (rows && rows.length > 0) dbItem = rows[0];
      }
    } catch (dbErr) {
      console.warn("⚠️ Impossible de mettre à jour dans PostgreSQL :", dbErr.message);
    }
  }

  // Sync to JSON file
  try {
    await ensureStorage();
    const rawData = await fs.readFile(DATA_FILE, "utf-8");
    let list = JSON.parse(rawData);
    const index = list.findIndex((item) => String(item.id) === String(id) || item.name === id || String(item.id) === `cls-${id}`);

    if (index !== -1) {
      const oldItem = list[index];
      const updatedJsonItem = {
        ...oldItem,
        name: name ? name.trim() : oldItem.name,
        badge: computedBadge || oldItem.badge,
        description: (description !== undefined && description !== null) ? description.trim() : oldItem.description,
        badgeColor: badgeColor || oldItem.badgeColor,
        file: file || oldItem.file,
        updatedAt: new Date().toISOString()
      };
      list[index] = updatedJsonItem;
      await fs.writeFile(DATA_FILE, JSON.stringify(list, null, 2), "utf-8");
      if (!dbItem) return enrichFileInfo(updatedJsonItem);
    }
  } catch (fsErr) {
    console.warn("ℹ️ Système de fichier en lecture seule : synchronisation JSON ignorée.", fsErr.message);
  }

  if (dbItem) {
    return enrichFileInfo(dbItem);
  }
  return null;
}

module.exports = {
  BADGE_PALETTE,
  getAllEmplois,
  addEmploi,
  updateEmploi,
  deleteEmploi,
  enrichFileInfo,
  EMPLOIS_DIR
};
