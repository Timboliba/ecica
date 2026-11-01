/**
 * Script de réinitialisation directe du mot de passe superadmin.
 * Usage : node scripts/reset-admin-password.js [nouveau_mot_de_passe]
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const bcrypt = require("bcryptjs");
const { pool } = require("../database");

async function resetAdminPassword() {
  const newPassword = process.argv[2] || process.env.ADMIN_PASSWORD || process.env.PASSWORD || "Admin123!";
  const targetEmail = process.argv[3] || process.env.ADMIN_EMAIL || process.env.USER || "ecica@gmail.com";

  console.log("====================================================");
  console.log("🔑 RÉINITIALISATION DU MOT DE PASSE ADMINISTRATEUR...");
  console.log("====================================================");
  console.log(`Cible : ${targetEmail} (ou rôle superadmin)`);
  console.log(`Nouveau mot de passe : ${newPassword}`);

  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    const updateQuery = `
      UPDATE admin 
      SET password = $1, is_active = TRUE, updated_at = CURRENT_TIMESTAMP
      WHERE login = $2 OR email = $2 OR role = 'superadmin'
      RETURNING id, login, email, role;
    `;

    const { rows } = await pool.query(updateQuery, [hashedPassword, targetEmail]);

    if (rows.length === 0) {
      console.log("⚠️ Aucun compte existant trouvé. Création d'un nouveau superadmin...");
      const insertQuery = `
        INSERT INTO admin (login, email, password, name, role, is_active)
        VALUES ($1, $2, $3, 'Super Administrateur', 'superadmin', TRUE)
        RETURNING id, login, email, role;
      `;
      const { rows: inserted } = await pool.query(insertQuery, [targetEmail, targetEmail, hashedPassword]);
      console.log("🎉 Compte administrateur créé :", inserted[0]);
    } else {
      console.log(`✅ ${rows.length} compte(s) administrateur mis à jour avec succès :`);
      rows.forEach(r => console.log(`   - ID: ${r.id} | Login: ${r.login} | Email: ${r.email} | Rôle: ${r.role}`));
    }

    console.log("====================================================");
    console.log("✅ RÉINITIALISATION TERMINÉE AVEC SUCCÈS !");
    console.log(`👉 Vous pouvez vous connecter avec :`);
    console.log(`   Identifiant : ecica@gmail.com`);
    console.log(`   Mot de passe : ${newPassword}`);
    console.log("====================================================");
  } catch (error) {
    console.error("❌ Erreur lors de la réinitialisation :", error.message);
  } finally {
    await pool.end();
  }
}

resetAdminPassword();

