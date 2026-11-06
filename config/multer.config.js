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

// Images des formations
const formationsUploadDir = path.join(process.cwd(), "public", "uploads", "formations");

if (!fs.existsSync(formationsUploadDir)) {
  fs.mkdirSync(formationsUploadDir, { recursive: true });
}

const uploadFormationImage = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, formationsUploadDir);
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
    fileSize: 10 * 1024 * 1024, // 10 MB max
  },
});

// Fichiers des lois et règlements (Word .doc/.docx et PDF .pdf)
const reglementsUploadDir = path.join(process.cwd(), "public", "uploads", "reglements");

if (!fs.existsSync(reglementsUploadDir)) {
  fs.mkdirSync(reglementsUploadDir, { recursive: true });
}

const uploadReglement = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, reglementsUploadDir);
    },
    filename: sanitizedFilename,
  }),
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if ([".pdf", ".doc", ".docx"].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Format de document non supporté. Formats acceptés : PDF (.pdf) ou Word (.doc, .docx)."), false);
    }
  },
  limits: {
    fileSize: 30 * 1024 * 1024, // 30 MB max
  },
});

let sharp = null;
try {
  sharp = require("sharp");
  // Désactive le cache de fichiers interne de sharp pour éviter les verrous de fichiers (EPERM) sur Windows
  sharp.cache(false);
} catch (e) {
  console.warn("Module sharp non chargé : optimisation désactivée.", e.message);
}

/**
 * Assainit et optimise un fichier image via sharp :
 * - Vérifie l'intégrité binaire
 * - Supprime les métadonnées (EXIF, géolocalisation)
 * - Redimensionne si nécessaire
 * - Convertit en WebP haute performance
 * - Utilise des buffers pour éviter tout verrou Windows EPERM
 */
async function optimizeImageFile(filePath, options = {}) {
  if (!sharp || !filePath || !fs.existsSync(filePath)) {
    return null;
  }
  const { maxWidth = 1600, quality = 82 } = options;
  const dir = path.dirname(filePath);
  const ext = path.extname(filePath);
  const baseName = path.basename(filePath, ext);
  const webpFilename = `${baseName}.webp`;
  const webpPath = path.join(dir, webpFilename);

  try {
    const inputBuffer = await fs.promises.readFile(filePath);
    const outputBuffer = await sharp(inputBuffer)
      .rotate()
      .resize({ width: maxWidth, withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();

    await fs.promises.writeFile(webpPath, outputBuffer);

    // Supprime le fichier d'origine s'il avait une autre extension (.jpg, .png, etc.)
    if (filePath.toLowerCase() !== webpPath.toLowerCase() && fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath).catch(() => {});
    }

    return { filename: webpFilename, path: webpPath };
  } catch (err) {
    throw err;
  }
}

/**
 * Middleware Express pour optimiser req.file (image)
 */
const optimizeUploadedImage = (options = {}) => {
  return async (req, res, next) => {
    if (!req.file || !sharp) return next();

    const isImage =
      (req.file.mimetype && req.file.mimetype.startsWith("image/")) ||
      [".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(
        path.extname(req.file.originalname).toLowerCase()
      );

    if (!isImage) return next();

    try {
      const optimized = await optimizeImageFile(req.file.path, options);
      if (optimized) {
        req.file.filename = optimized.filename;
        req.file.path = optimized.path;
        req.file.mimetype = "image/webp";
      }
      next();
    } catch (err) {
      console.error("Erreur lors de l'optimisation de l'image :", err.message);
      // Fichier corrompu ou falsifié -> suppression de sécurité
      if (req.file.path && fs.existsSync(req.file.path)) {
        await fs.promises.unlink(req.file.path).catch(() => {});
      }
      const isAjax =
        req.xhr ||
        (req.headers.accept && req.headers.accept.includes("json")) ||
        req.headers["x-requested-with"] === "SPA";

      if (isAjax) {
        return res.status(400).json({
          success: false,
          message: "L'image importée est corrompue ou n'est pas un format valide.",
        });
      }
      return next(new Error("L'image importée est corrompue ou n'est pas un format valide."));
    }
  };
};

module.exports = {
  uploadEmploi,
  uploadContentImage,
  uploadFormationImage,
  uploadReglement,
  optimizeUploadedImage,
  optimizeImageFile,
};
