const express = require("express");
const path = require("node:path");
const compression = require("compression");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
require("./database");
const { authenticateToken } = require("./config/jwt");
const router = require("./routers/index.routes");

const app = express();

// 1. En-têtes HTTP de sécurité avec Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "https://unpkg.com",
          "https://cdnjs.cloudflare.com",
          "https://cdn.jsdelivr.net",
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://unpkg.com",
          "https://fonts.googleapis.com",
        ],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https://*.tile.openstreetmap.org",
          "https://*.tile.openstreetmap.fr",
          "https://*.basemaps.cartocdn.com",
          "https://unpkg.com",
          "https:",
        ],
        connectSrc: ["'self'", "https:"],
        frameSrc: ["'self'", "blob:"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests:
          process.env.NODE_ENV === "production" ? [] : null,
      },
    },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// 2. Limiteur de requêtes global (Protection DoS / Flooding)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // 500 requêtes max par IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Trop de requêtes effectuées depuis cette adresse IP. Veuillez patienter un instant.",
  },
});
app.use(globalLimiter);

// 3. Compression gzip/brotli optimisée pour toutes les réponses HTTP
app.use(
  compression({
    level: 6, // Équilibre optimal entre ratio de compression et utilisation CPU
    threshold: 1024, // Ne compresse que les réponses > 1 Ko
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) return false;
      return compression.filter(req, res);
    },
  })
);

const isProd = process.env.NODE_ENV === "production";
// 3. Configuration et cache des vues Pug
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");
if (isProd) {
  app.enable("view cache");
}

// 4. Servir les fichiers statiques avec cache navigateur et ETags
app.use(
  express.static(path.join(__dirname, "public"), {
    maxAge: isProd ? "7d" : 0,
    etag: true,
    lastModified: true,
  })
);

// 5. Parsers légers et rapides
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use(authenticateToken);

// 6. Routes principales
app.use(router);

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server connected on port ${port} in ${process.env.NODE_ENV || "development"} mode.`);
  });
}

module.exports = app;

