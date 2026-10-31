/**
 * Gestion et vérification des tokens JWT pour les sessions utilisateur et administrateur.
 */

require("dotenv").config();
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  if (process.env.NODE_ENV === "production") {
    console.error("❌ ERREUR DE SÉCURITÉ CRITIQUE : La variable d'environnement JWT_SECRET est obligatoire en production.");
    process.exit(1);
  } else {
    console.warn("⚠️ AVERTISSEMENT : JWT_SECRET non défini dans .env, utilisation d'une clé temporaire de développement.");
  }
}

const SECRET_KEY = JWT_SECRET || "dev_only_temporary_jwt_secret_ecica_394857201948";
const JWT_DEFAULT_EXPIRES = process.env.JWT_EXPIRES_IN || "7d";

/**
 * Génère un token JWT signé.
 * @param {Object} payload Données à inclure dans le token (id, login, email, role, etc.)
 * @param {boolean} remember Si true, expire en 7 jours, sinon en 24h
 * @returns {string} Token JWT
 */
function generateToken(payload, remember = false) {
  const expiresIn = remember ? "7d" : "24h";
  return jwt.sign(payload, SECRET_KEY, { expiresIn });
}

/**
 * Décode et vérifie un token JWT.
 * @param {string} token
 * @returns {Object|null} Payload décodé ou null si invalide
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET_KEY);
  } catch (error) {
    return null;
  }
}

/**
 * Middleware pour extraire l'utilisateur connecté depuis le cookie JWT ou l'en-tête Authorization.
 */
function authenticateToken(req, res, next) {
  let token = null;

  // 1. Récupération depuis le cookie HTTP-Only (Navigation web SSR)
  if (req.cookies && req.cookies.jwt_token) {
    token = req.cookies.jwt_token;
  }
  // 2. Récupération depuis l'en-tête Authorization: Bearer <token> (Requêtes API)
  else if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = decoded;
      res.locals.currentUser = decoded;
      res.locals.user = decoded;
    }
  }

  next();
}

/**
 * Middleware strict qui bloque l'accès si l'administrateur n'est pas connecté.
 */
function requireAdminAuth(req, res, next) {
  authenticateToken(req, res, () => {
    if (!req.user) {
      // Redirection vers la page de login admin si non authentifié
      return res.redirect("/admin/login?error=session_expired");
    }
    next();
  });
}

module.exports = {
  generateToken,
  verifyToken,
  authenticateToken,
  requireAdminAuth,
};

