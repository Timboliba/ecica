/**
 * Script de création et d'initialisation des tables de contact dans PostgreSQL (Neon).
 * 
 * Tables créées :
 * 1. `contact` : stocke les messages et requêtes envoyés via le formulaire de contact (localhost:3000/contact).
 * 2. `contact_info` : stocke les coordonnées et informations institutionnelles de l'ECICA affichées sur la page.
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { pool } = require("../database");

async function initContactTables() {
  console.log("====================================================");
  console.log("🚀 INITIALISATION DE LA TABLE CONTACT (PostgreSQL)...");
  console.log("====================================================");

  try {
    // 1. Création de la table 'contact' (messages du formulaire)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contact (
        id SERIAL PRIMARY KEY,
        fullname VARCHAR(150) NOT NULL,
        email VARCHAR(255) NOT NULL,
        sujet VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'unread',
        is_archived BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Table 'contact' vérifiée / créée avec succès !");

    // 2. Création de la table 'contact_info' (informations de contact de l'établissement)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contact_info (
        id SERIAL PRIMARY KEY,
        adresse_postale VARCHAR(255) DEFAULT 'BP:1828',
        fax VARCHAR(100) DEFAULT '20 22 26 91',
        telephone VARCHAR(100) DEFAULT '20 22 26 91',
        email VARCHAR(255) DEFAULT 'contact@ecica.edu.ml',
        nom_etablissement VARCHAR(150) DEFAULT 'E.C.I.C.A',
        latitude DOUBLE PRECISION DEFAULT 12.6549,
        longitude DOUBLE PRECISION DEFAULT -7.9965,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Table 'contact_info' vérifiée / créée avec succès !");

    // 3. Insérer les coordonnées par défaut de l'ECICA si la table contact_info est vide
    const { rows: infoRows } = await pool.query(
      `SELECT id FROM contact_info LIMIT 1;`
    );

    if (infoRows.length === 0) {
      await pool.query(`
        INSERT INTO contact_info (adresse_postale, fax, telephone, email, nom_etablissement, latitude, longitude)
        VALUES ('BP:1828', '20 22 26 91', '20 22 26 91', 'contact@ecica.edu.ml', 'E.C.I.C.A', 12.6549, -7.9965);
      `);
      console.log("ℹ️ Coordonnées par défaut de l'ECICA insérées dans 'contact_info'.");
    }

    // 4. Afficher la structure des colonnes de la table 'contact'
    const columnsRes = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'contact'
      ORDER BY ordinal_position;
    `);

    console.log("\n📋 Structure de la table 'contact' :");
    columnsRes.rows.forEach((col) => {
      console.log(
        `   - ${col.column_name.padEnd(16)} : ${col.data_type} (Nullable: ${col.is_nullable})`
      );
    });

    console.log("\n====================================================");
    console.log("✨ TABLES CONTACT INITIALISÉES AVEC SUCCÈS !");
    console.log("====================================================");
  } catch (error) {
    console.error("\n❌ ERREUR LORS DE L'INITIALISATION DU CONTACT :", error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  initContactTables();
}

module.exports = { initContactTables };
