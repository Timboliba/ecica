const multer = require("multer");
const path = require("node:path");
const fs = require("node:fs");

const uploadDir = path.join(process.cwd(), "public", "emplois");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Sanitize file name: remove dangerous characters and keep extension
const sanitizedFilename = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const baseName = path
    .basename(file.originalname, ext)
    .replace(/[^a-zA-Z0-9_\-\s]/g, "")
    .trim()
    .replace(/\s+/g, "_");
  const uniqueSuffix = Date.now() + "_" + Math.round(Math.random() * 1e4);
  cb(null, `${baseName}_${uniqueSuffix}${ext}`);
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: sanitizedFilename,
});

const fileFilter = (req, file, cb) => {
  // Liste des extensions strictement sécurisées (exclusion expresse de .svg pour prévenir le risque XSS)
  const allowedExts = [
    ".pdf",
    ".doc",
    ".docx",
    ".dot",
    ".dotx",
    ".xls",
    ".xlsx",
    ".csv",
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".gif",
    ".txt"
  ];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Format de fichier non supporté. Veuillez importer un fichier Word (.doc, .docx), PDF, Excel ou Image (.png, .jpg, .webp)."), false);
  }
};

const uploadEmploi = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 30 * 1024 * 1024, // 30 MB max
  },
});

// Images des contenus (publications, formations, événements, annonces)
const contentsUploadDir = path.join(process.cwd(), "public", "uploads", "contents");

if (!fs.existsSync(contentsUploadDir)) {
  fs.mkdirSync(contentsUploadDir, { recursive: true });
}

const uploadContentImage = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, contentsUploadDir);
    },
    filename: sanitizedFilename,
  }),
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if ([".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Format d'image non supporté. Formats acceptés : .png, .jpg, .jpeg, .webp, .gif."), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max
  },
});

module.exports = {
  uploadEmploi,
  uploadContentImage,
};
