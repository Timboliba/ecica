/**
 * Script d'initialisation et de vérification de la table admin dans PostgreSQL (Neon).
 *
 * Ce script :
 * 1. Vérifie si la table "admin" existe dans la base de données.
 * 2. Si elle n'existe pas, la crée avec tous les champs nécessaires.
 * 3. Si elle existe, vérifie les colonnes et ajoute les champs manquants (ALTER TABLE ... ADD COLUMN IF NOT EXISTS).
 * 4. Vérifie si un compte administrateur existe déjà.
 * 5. Si aucun administrateur n'existe, en crée un automatiquement avec mot de passe haché (bcryptjs)
 *    en se basant sur les variables d'environnement (.env) ou valeurs par défaut.
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const bcrypt = require("bcryptjs");
const { pool } = require("../database");

async function initAdminTable() {
  console.log("====================================================");
  console.log("🔍 VÉRIFICATION DE LA TABLE ADMIN DANS LA BASE...");
  console.log("====================================================");

  try {
    // 1. Vérifier si la table admin existe
    const checkTableQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name = 'admin'
      ) AS table_exists;
    `;
    const { rows: tableRows } = await pool.query(checkTableQuery);
    const tableExists = tableRows[0].table_exists;

    if (!tableExists) {
      console.log("⚠️ La table 'admin' n'existe pas. Création en cours...");
      await pool.query(`
        CREATE TABLE admin (
          id SERIAL PRIMARY KEY,
          login VARCHAR(150) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE,
          password VARCHAR(255) NOT NULL,
          name VARCHAR(150) DEFAULT 'Administrateur',
          role VARCHAR(50) DEFAULT 'superadmin',
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log(
        "✅ Table 'admin' créée avec succès avec tous les champs requis.",
      );
    } else {
      console.log(
        "ℹ️ La table 'admin' existe déjà. Vérification des colonnes nécessaires...",
      );

      // 2. Ajouter les colonnes nécessaires si elles sont manquantes
      const alterColumns = [
        "ALTER TABLE admin ADD COLUMN IF NOT EXISTS login VARCHAR(150)",
        "ALTER TABLE admin ADD COLUMN IF NOT EXISTS email VARCHAR(255)",
        "ALTER TABLE admin ADD COLUMN IF NOT EXISTS password VARCHAR(255)",
        "ALTER TABLE admin ADD COLUMN IF NOT EXISTS name VARCHAR(150) DEFAULT 'Administrateur'",
        "ALTER TABLE admin ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'superadmin'",
        "ALTER TABLE admin ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE",
        "ALTER TABLE admin ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP",
        "ALTER TABLE admin ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP",
      ];

      for (const query of alterColumns) {
        await pool.query(query);
      }

      // S'assurer que l'id utilise bien la séquence auto-incrémentée si elle existe
      try {
        await pool.query(`
          DO $$
          BEGIN
            IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'admin_id_seq') THEN
              ALTER TABLE admin ALTER COLUMN id SET DEFAULT nextval('admin_id_seq');
            END IF;
          END $$;
        `);
      } catch (seqErr) {
        // La séquence est déjà attachée ou gérée par SERIAL/IDENTITY
      }

      // Créer un index unique sur le login pour éviter les doublons
      try {
        await pool.query(
          `CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_login ON admin (login);`,
        );
      } catch (idxErr) {
        // L'index ou contrainte existe déjà
      }

      console.log(
        "✅ Tous les champs nécessaires sont présents et à jour dans la table 'admin'.",
      );
    }

    // Afficher les colonnes actuelles pour information
    const columnsRes = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'admin'
      ORDER BY ordinal_position;
    `);
    console.log("\n📋 Structure actuelle de la table 'admin' :");
    columnsRes.rows.forEach((col) => {
      console.log(
        `   - ${col.column_name.padEnd(15)} : ${col.data_type} (Nullable: ${col.is_nullable})`,
      );
    });

    // 3. Vérifier l'existence d'un administrateur
    console.log("\n----------------------------------------------------");
    console.log("👤 VÉRIFICATION DU COMPTE ADMINISTRATEUR...");
    console.log("----------------------------------------------------");

    const defaultLogin =
      process.env.USER ||
      process.env.SEED_SUPER_ADMIN_EMAIL ||
      "ecica@gmail.com";
    const defaultEmail =
      process.env.USER ||
      process.env.SEED_SUPER_ADMIN_EMAIL ||
      "ecica@gmail.com";
    const defaultPassword =
      process.env.PASSWORD ||
      process.env.SEED_SUPER_ADMIN_PASSWORD ||
      "password ecica";
    const defaultName = "Administrateur ECICA";
    const defaultRole = "superadmin";

    // Vérifier si un admin existe déjà
    const checkAdminQuery = `
      SELECT id, login, email, name, role, is_active, created_at 
      FROM admin 
      WHERE login = $1 OR email = $2
      LIMIT 1;
    `;
    const { rows: existingAdmins } = await pool.query(checkAdminQuery, [
      defaultLogin,
      defaultEmail,
    ]);

    if (existingAdmins.length > 0) {
      const admin = existingAdmins[0];
      // Synchronisation du mot de passe avec le .env
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds);
      await pool.query(
        "UPDATE admin SET password = $1, email = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3",
        [hashedPassword, defaultEmail, admin.id],
      );

      console.log(
        `ℹ️ Un compte administrateur existe déjà (ID: ${admin.id}) :`,
      );
      console.log(`   - Login        : ${admin.login}`);
      console.log(`   - Email        : ${defaultEmail}`);
      console.log(
        `   - Mot de passe (synchronisé avec .env) : ${defaultPassword}`,
      );
      console.log(`   - Rôle         : ${admin.role}`);
      console.log(`   - Actif        : ${admin.is_active}`);
      console.log(
        `✅ Le mot de passe de l'administrateur a été mis à jour avec la valeur de votre .env !`,
      );
    } else {
      console.log(
        `⏳ Aucun administrateur trouvé pour '${defaultLogin}'. Création en cours...`,
      );

      // Hachage du mot de passe avec bcrypt
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds);

      const insertAdminQuery = `
        INSERT INTO admin (login, email, password, name, role, is_active)
        VALUES ($1, $2, $3, $4, $5, TRUE)
        RETURNING id, login, email, name, role, is_active, created_at;
      `;
      const { rows: newAdminRows } = await pool.query(insertAdminQuery, [
        defaultLogin,
        defaultEmail,
        hashedPassword,
        defaultName,
        defaultRole,
      ]);

      const created = newAdminRows[0];
      console.log("\n🎉 NOUVEL ADMINISTRATEUR CRÉÉ AVEC SUCCÈS !");
      console.log("----------------------------------------------------");
      console.log(`   - ID       : ${created.id}`);
      console.log(`   - Login    : ${created.login}`);
      console.log(`   - Email    : ${created.email}`);
      console.log(`   - Mot de passe (en clair) : ${defaultPassword}`);
      console.log(`   - Rôle     : ${created.role}`);
      console.log(`   - Date     : ${created.created_at}`);
      console.log("----------------------------------------------------");
      console.log(
        "💡 Vous pouvez maintenant vous connecter sur /admin avec ces identifiants !",
      );
    }

    console.log("\n====================================================");
    console.log("✨ OPÉRATION TERMINÉE AVEC SUCCÈS !");
    console.log("====================================================");
  } catch (error) {
    console.error("\n❌ ERREUR LORS DE L'INITIALISATION :", error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Exécution directe du script
if (require.main === module) {
  initAdminTable();
}

module.exports = { initAdminTable };
