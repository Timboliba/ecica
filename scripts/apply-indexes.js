/**
 * Script de création des index de performance SQL dans PostgreSQL (Neon).
 */
const { pool } = require("../database");

async function applyIndexes() {
  console.log("⚡ Application des index de performance PostgreSQL...");
  const indexes = [
    {
      name: "idx_admin_login",
      sql: "CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_login ON admin (login);",
    },
    {
      name: "idx_admin_email",
      sql: "CREATE INDEX IF NOT EXISTS idx_admin_email ON admin (email);",
    },
    {
      name: "idx_contact_created_at",
      sql: "CREATE INDEX IF NOT EXISTS idx_contact_created_at ON contact (created_at DESC);",
    },
    {
      name: "idx_emplois_created_at",
      sql: "CREATE INDEX IF NOT EXISTS idx_emplois_created_at ON emplois_du_temps (created_at DESC);",
    },
    {
      name: "idx_emplois_class_name",
      sql: "CREATE INDEX IF NOT EXISTS idx_emplois_class_name ON emplois_du_temps (class_name);",
    },
  ];

  for (const idx of indexes) {
    try {
      await pool.query(idx.sql);
      console.log(`✅ Index '${idx.name}' vérifié / créé avec succès.`);
    } catch (err) {
      console.warn(`⚠️ Avertissement pour l'index '${idx.name}' :`, err.message);
    }
  }

  console.log("✨ Tous les index de performance ont été appliqués avec succès !");
  await pool.end();
}

if (require.main === module) {
  applyIndexes().catch((err) => {
    console.error("❌ Erreur lors de l'application des index :", err);
    process.exit(1);
  });
}

module.exports = { applyIndexes };
