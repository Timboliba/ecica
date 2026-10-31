/**
 * Script de création et d'initialisation de la table des emplois du temps dans PostgreSQL (Neon).
 * Table créée : `emplois_du_temps`
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { pool } = require("../database");

const DEFAULT_ITEMS = [
  { badge: "6e A", name: "6e A", description: "Année scolaire 2025-2026", file: "6e_A.pdf", badgeColor: "#2563eb", fileType: "pdf" },
  { badge: "6e B", name: "6e B", description: "Année scolaire 2025-2026", file: "6e_B.pdf", badgeColor: "#0d9488", fileType: "pdf" },
  { badge: "5e A", name: "5e A", description: "Année scolaire 2025-2026", file: "5e_A.pdf", badgeColor: "#7c3aed", fileType: "pdf" },
  { badge: "5e B", name: "5e B", description: "Année scolaire 2025-2026", file: "5e_B.pdf", badgeColor: "#f97316", fileType: "pdf" },
  { badge: "4e A", name: "4e A", description: "Année scolaire 2025-2026", file: "4e_A.pdf", badgeColor: "#0284c7", fileType: "pdf" },
  { badge: "4e B", name: "4e B", description: "Année scolaire 2025-2026", file: "4e_B.pdf", badgeColor: "#db2777", fileType: "pdf" },
  { badge: "3e A", name: "3e A", description: "Année scolaire 2025-2026", file: "3e_A.pdf", badgeColor: "#3730a3", fileType: "pdf" },
  { badge: "3e B", name: "3e B", description: "Année scolaire 2025-2026", file: "3e_B.pdf", badgeColor: "#16a34a", fileType: "pdf" }
];

async function initEmploisTable() {
  console.log("=========================================================");
  console.log("🚀 INITIALISATION DE LA TABLE EMPLOIS DU TEMPS (PostgreSQL)...");
  console.log("=========================================================");

  try {
    // 1. Création de la table `emplois_du_temps`
    await pool.query(`
      CREATE TABLE IF NOT EXISTS emplois_du_temps (
        id SERIAL PRIMARY KEY,
        class_name VARCHAR(150) NOT NULL,
        badge VARCHAR(50) NOT NULL,
        badge_color VARCHAR(30) DEFAULT '#2563eb',
        description VARCHAR(255) DEFAULT '—',
        filename VARCHAR(255) NOT NULL,
        file_type VARCHAR(50) DEFAULT 'pdf',
        file_size BIGINT DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Table 'emplois_du_temps' vérifiée / créée avec succès !");

    // 2. Vérifier si la table contient déjà des données
    const { rows: existingRows } = await pool.query(
      `SELECT COUNT(*) AS count FROM emplois_du_temps;`
    );

    const count = parseInt(existingRows[0].count, 10);
    if (count === 0) {
      console.log("🌱 Insertion des emplois du temps par défaut...");
      for (const item of DEFAULT_ITEMS) {
        await pool.query(
          `INSERT INTO emplois_du_temps (class_name, badge, badge_color, description, filename, file_type)
           VALUES ($1, $2, $3, $4, $5, $6);`,
          [item.name, item.badge, item.badgeColor, item.description, item.file, item.fileType]
        );
      }
      console.log(`✅ ${DEFAULT_ITEMS.length} emplois du temps initiaux insérés.`);
    } else {
      console.log(`ℹ️ La table contient déjà ${count} enregistrement(s).`);
    }

    // 3. Afficher la structure des colonnes
    const columnsRes = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'emplois_du_temps'
      ORDER BY ordinal_position;
    `);

    console.log("\n📋 Structure de la table 'emplois_du_temps' :");
    columnsRes.rows.forEach((col) => {
      console.log(
        `   - ${col.column_name.padEnd(16)} : ${col.data_type} (Nullable: ${col.is_nullable})`
      );
    });

    console.log("\n=========================================================");
    console.log("✨ TABLE EMPLOIS DU TEMPS INITIALISÉE AVEC SUCCÈS !");
    console.log("=========================================================");
  } catch (error) {
    console.error("\n❌ ERREUR LORS DE L'INITIALISATION DE LA TABLE EMPLOIS :", error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  initEmploisTable();
}

module.exports = { initEmploisTable };
