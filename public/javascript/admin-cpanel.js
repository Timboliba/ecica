/**
 * Admin CPanel - Single Page Application (SPA) Engine & UI Interactions
 */

document.addEventListener("DOMContentLoaded", () => {
  const sidebar = document.querySelector(".admin-sidebar");
  const collapseBtn = document.getElementById("btn-collapse-sidebar");
  const toggleMenuBtn = document.getElementById("btn-toggle-menu");
  const searchInput = document.getElementById("admin-search-input");
  const spaContainer = document.getElementById("admin-spa-content");

  // =========================================================
  // 1. GESTION DE LA BARRE LATÉRALE (COLLAPSE & MOBILE)
  // =========================================================
  if (collapseBtn && sidebar) {
    collapseBtn.addEventListener("click", () => {
      sidebar.classList.toggle("collapsed");
      const isCollapsed = sidebar.classList.contains("collapsed");
      localStorage.setItem("admin_sidebar_collapsed", isCollapsed);
    });

    if (localStorage.getItem("admin_sidebar_collapsed") === "true") {
      sidebar.classList.add("collapsed");
    }
  }

  if (toggleMenuBtn && sidebar) {
    toggleMenuBtn.addEventListener("click", () => {
      sidebar.classList.toggle("mobile-open");
    });
  }

  // Raccourci clavier Ctrl+K / Cmd+K
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      if (searchInput) {
        searchInput.focus();
      }
    }
  });

  // =========================================================
  // 2. MOTEUR SPA (SINGLE PAGE APPLICATION)
  // =========================================================

  // Création de la barre de chargement supérieure (Progress Bar)
  let progressBar = document.getElementById("spa-progress-bar");
  if (!progressBar) {
    progressBar = document.createElement("div");
    progressBar.id = "spa-progress-bar";
    progressBar.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 0%;
      height: 3px;
      background: linear-gradient(90deg, #2563eb, #38bdf8);
      z-index: 99999;
      transition: width 0.25s ease, opacity 0.3s ease;
      opacity: 0;
      pointer-events: none;
    `;
    document.body.appendChild(progressBar);
  }

  function startProgress() {
    progressBar.style.opacity = "1";
    progressBar.style.width = "35%";
    setTimeout(() => {
      if (progressBar.style.opacity === "1") {
        progressBar.style.width = "75%";
      }
    }, 150);
  }

  function finishProgress() {
    progressBar.style.width = "100%";
    setTimeout(() => {
      progressBar.style.opacity = "0";
      setTimeout(() => {
        progressBar.style.width = "0%";
      }, 300);
    }, 150);
  }

  // Fonction de navigation SPA
  async function navigateTo(url, pushHistory = true) {
    if (!spaContainer) {
      window.location.href = url;
      return;
    }

    startProgress();
    spaContainer.style.opacity = "0.5";
    spaContainer.style.transition = "opacity 0.15s ease";

    try {
      const response = await fetch(url, {
        headers: {
          "X-Requested-With": "SPA",
        },
      });

      // Si redirection (ex: session expirée redirigeant vers /admin/login)
      if (response.redirected && response.url.includes("/admin/login")) {
        window.location.href = response.url;
        return;
      }

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const htmlText = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, "text/html");

      // 1. Mettre à jour le titre du document
      if (doc.title) {
        document.title = doc.title;
      }

      // 2. Mettre à jour le titre de la page dans la barre supérieure
      const newPageTitle = doc.querySelector(".topbar-left .page-title");
      const currentPageTitle = document.querySelector(
        ".topbar-left .page-title",
      );
      if (newPageTitle && currentPageTitle) {
        currentPageTitle.textContent = newPageTitle.textContent;
      }

      // 3. Mettre à jour le contenu principal du conteneur SPA
      const newContent =
        doc.getElementById("admin-spa-content") ||
        doc.querySelector(".dashboard-container");
      if (newContent) {
        spaContainer.innerHTML = newContent.innerHTML;
      } else {
        spaContainer.innerHTML = htmlText;
      }

      // 4. Mettre à jour l'URL dans l'historique du navigateur
      if (pushHistory) {
        window.history.pushState({ url }, "", url);
      }

      // 5. Mettre à jour l'élément actif dans la barre latérale
      updateActiveSidebarLink(url);

      // 6. Fermer le menu mobile si ouvert
      if (sidebar && sidebar.classList.contains("mobile-open")) {
        sidebar.classList.remove("mobile-open");
      }

      // 7. Réinitialiser les écouteurs interactifs de la vue chargée
      initInteractiveElements();

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error("Erreur navigation SPA :", error);
      // Fallback vers navigation classique en cas de problème
      window.location.href = url;
    } finally {
      spaContainer.style.opacity = "1";
      finishProgress();
    }
  }

  // Met à jour la classe .active sur le menu correspondant et actualise le titre .page-title
  function updateActiveSidebarLink(url) {
    const currentPath = new URL(url, window.location.origin).pathname;
    const navLinks = document.querySelectorAll(".sidebar-nav a.nav-item");
    const currentPageTitle = document.querySelector(".topbar-left .page-title");
    let activeLabel = null;

    navLinks.forEach((link) => {
      const linkPath = new URL(
        link.getAttribute("href"),
        window.location.origin,
      ).pathname;
      if (linkPath === currentPath) {
        link.classList.add("active");
        const labelElem = link.querySelector(".nav-label");
        if (labelElem) {
          activeLabel = labelElem.textContent.trim();
        }
      } else {
        link.classList.remove("active");
      }
    });

    if (activeLabel && currentPageTitle) {
      currentPageTitle.textContent = activeLabel;
    }
  }

  // Interception des clics sur les liens internes de l'espace admin
  document.addEventListener("click", (e) => {
    const link = e.target.closest("a");
    if (!link) return;

    const href = link.getAttribute("href");
    if (!href) return;

    // Conditions pour navigation SPA :
    // - Lien interne commençant par /admin/
    // - Pas de déconnexion (/admin/logout nécessite une vraie redirection)
    // - Pas d'ouverture dans un nouvel onglet
    // - Pas de lien d'ancrage simple (#)
    const isInternalAdmin =
      href.startsWith("/admin/") && href !== "/admin/logout" && href !== "#";
    const isSpecialClick =
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey ||
      (link.target && link.target !== "_self");

    if (isInternalAdmin && !isSpecialClick) {
      e.preventDefault();
      navigateTo(href);
    }
  });

  // Gestion des boutons Suivant / Précédent du navigateur
  window.addEventListener("popstate", () => {
    navigateTo(window.location.pathname, false);
  });

  // =========================================================
  // 3. ÉLÉMENTS INTERACTIFS DES VUES
  // =========================================================
  function initInteractiveElements() {
    // Checkboxes des tâches avec effet visuel
    const taskCheckboxes = document.querySelectorAll(".task-checkbox");
    taskCheckboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", (e) => {
        const taskItem = e.target.closest(".task-item");
        if (taskItem) {
          const title = taskItem.querySelector(".task-title");
          if (e.target.checked) {
            title.style.textDecoration = "line-through";
            title.style.opacity = "0.6";
          } else {
            title.style.textDecoration = "none";
            title.style.opacity = "1";
          }
        }
      });
    });
  }

  // =========================================================
  // 4. GESTION DES MODALES ET CRUD ADMINISTRATEURS (SPA)
  // =========================================================

  // Fonction utilitaire d'affichage du toast de notification
  function showToast(message) {
    let toast = document.getElementById("user-feedback-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "user-feedback-toast";
      toast.className = "feedback-toast";
      toast.innerHTML = `<span class="toast-icon">✓</span><span class="toast-message"></span>`;
      document.body.appendChild(toast);
    }
    const msgElem = toast.querySelector(".toast-message");
    if (msgElem) msgElem.textContent = message;
    toast.style.display = "flex";

    setTimeout(() => {
      toast.style.display = "none";
    }, 3500);
  }

  // Délégation des clics pour les modales
  document.addEventListener("click", (e) => {
    // 1. Ouvrir la modale de création
    const openCreateBtn = e.target.closest("#btn-open-create-admin");
    if (openCreateBtn) {
      e.preventDefault();
      const modal = document.getElementById("modal-create-admin");
      if (modal) {
        const form = document.getElementById("form-create-admin");
        if (form) form.reset();
        const alertBox = modal.querySelector(".modal-alert");
        if (alertBox) {
          alertBox.style.display = "none";
          alertBox.className = "modal-alert";
          alertBox.textContent = "";
        }
        modal.style.display = "flex";
        const firstInput = modal.querySelector("#create-name");
        if (firstInput) firstInput.focus();
      }
      return;
    }

    // 2. Ouvrir la modale d'édition
    const editBtn = e.target.closest(".btn-edit-admin");
    if (editBtn) {
      e.preventDefault();
      const modal = document.getElementById("modal-edit-admin");
      if (modal) {
        const alertBox = modal.querySelector(".modal-alert");
        if (alertBox) {
          alertBox.style.display = "none";
          alertBox.className = "modal-alert";
          alertBox.textContent = "";
        }

        // Récupération des attributs de données
        const id = editBtn.getAttribute("data-id") || "";
        const name = editBtn.getAttribute("data-name") || "";
        const login = editBtn.getAttribute("data-login") || "";
        const email = editBtn.getAttribute("data-email") || "";
        const role = editBtn.getAttribute("data-role") || "admin";
        const isActive = editBtn.getAttribute("data-is_active") === "true";

        const editIdInput = document.getElementById("edit-id");
        const editNameInput = document.getElementById("edit-name");
        const editLoginInput = document.getElementById("edit-login");
        const editEmailInput = document.getElementById("edit-email");
        const editRoleInput = document.getElementById("edit-role");
        const editStatusInput = document.getElementById("edit-status");
        const editPasswordInput = document.getElementById("edit-password");

        if (editIdInput) editIdInput.value = id;
        if (editNameInput) editNameInput.value = name;
        if (editLoginInput) editLoginInput.value = login;
        if (editEmailInput) editEmailInput.value = email;
        if (editRoleInput) editRoleInput.value = role;
        if (editStatusInput)
          editStatusInput.value = isActive ? "true" : "false";
        if (editPasswordInput) editPasswordInput.value = "";

        modal.style.display = "flex";
        if (editNameInput) editNameInput.focus();
      }
      return;
    }

    // 2 bis. Ouvrir la modale d'ajout de contenu
    const openCreateContentBtn = e.target.closest("#btn-open-create-content");
    if (openCreateContentBtn) {
      e.preventDefault();
      const modal = document.getElementById("modal-create-content");
      if (modal) {
        const form = document.getElementById("form-create-content");
        if (form) form.reset();
        const preview = document.getElementById("content-image-preview");
        if (preview) {
          preview.style.display = "none";
          preview.removeAttribute("src");
        }
        const alertBox = modal.querySelector(".modal-alert");
        if (alertBox) {
          alertBox.style.display = "none";
          alertBox.className = "modal-alert";
          alertBox.textContent = "";
        }
        modal.style.display = "flex";
        const firstInput = modal.querySelector("#content-title");
        if (firstInput) firstInput.focus();
      }
      return;
    }

    // 3. Fermer les modales (Bouton croix ou Annuler)
    const closeBtn = e.target.closest(".admin-modal-close, .btn-modal-cancel");
    if (closeBtn) {
      e.preventDefault();
      const modal = closeBtn.closest(".admin-modal-backdrop");
      if (modal) {
        modal.style.display = "none";
      }
      return;
    }

    // 4. Fermer en cliquant sur le backdrop
    if (e.target.classList.contains("admin-modal-backdrop")) {
      e.target.style.display = "none";
    }
  });

  // Fermer la modale avec la touche Echap (Escape)
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const openModals = document.querySelectorAll(".admin-modal-backdrop");
      openModals.forEach((m) => {
        if (m.style.display !== "none") {
          m.style.display = "none";
        }
      });
    }
  });

  // Aperçu de l'image de couverture d'un contenu
  document.addEventListener("change", (e) => {
    if (!e.target || e.target.id !== "content-image") return;
    const preview = document.getElementById("content-image-preview");
    if (!preview) return;
    if (preview.src && preview.src.startsWith("blob:")) {
      URL.revokeObjectURL(preview.src);
    }
    const file = e.target.files && e.target.files[0];
    if (file) {
      preview.src = URL.createObjectURL(file);
      preview.style.display = "block";
    } else {
      preview.style.display = "none";
      preview.removeAttribute("src");
    }
  });

  // Délégation de la soumission asynchrone des formulaires
  document.addEventListener("submit", async (e) => {
    // Soumission Ajout de contenu (multipart pour l'image)
    if (e.target && e.target.id === "form-create-content") {
      e.preventDefault();
      const form = e.target;
      const modal = form.closest(".admin-modal-backdrop");
      const submitBtn = form.querySelector(".btn-modal-submit");
      const btnText = submitBtn ? submitBtn.querySelector(".btn-text") : null;
      const btnSpinner = submitBtn
        ? submitBtn.querySelector(".btn-spinner")
        : null;
      const alertBox = modal ? modal.querySelector(".modal-alert") : null;

      try {
        if (submitBtn) submitBtn.disabled = true;
        if (btnText && btnSpinner) {
          btnText.style.display = "none";
          btnSpinner.style.display = "inline";
        }
        if (alertBox) alertBox.style.display = "none";

        const response = await fetch("/admin/contents", {
          method: "POST",
          headers: {
            "X-Requested-With": "SPA",
            Accept: "application/json",
          },
          body: new FormData(form),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Erreur lors de l'ajout du contenu.");
        }

        if (modal) modal.style.display = "none";
        showToast(data.message || "Contenu ajouté avec succès !");
        // Rafraîchir la vue SPA
        await navigateTo("/admin/contents", false);
      } catch (err) {
        if (alertBox) {
          alertBox.className = "modal-alert error";
          alertBox.textContent = err.message;
          alertBox.style.display = "block";
        }
      } finally {
        if (submitBtn) submitBtn.disabled = false;
        if (btnText && btnSpinner) {
          btnText.style.display = "inline";
          btnSpinner.style.display = "none";
        }
      }
      return;
    }

    // Soumission Création
    if (e.target && e.target.id === "form-create-admin") {
      e.preventDefault();
      const form = e.target;
      const modal = form.closest(".admin-modal-backdrop");
      const submitBtn = form.querySelector(".btn-modal-submit");
      const btnText = submitBtn ? submitBtn.querySelector(".btn-text") : null;
      const btnSpinner = submitBtn
        ? submitBtn.querySelector(".btn-spinner")
        : null;
      const alertBox = modal ? modal.querySelector(".modal-alert") : null;

      const formData = new FormData(form);
      const payload = {
        name: formData.get("name"),
        login: formData.get("login"),
        email: formData.get("email"),
        role: formData.get("role"),
        is_active: formData.get("is_active"),
        password: formData.get("password"),
      };

      try {
        if (submitBtn) submitBtn.disabled = true;
        if (btnText && btnSpinner) {
          btnText.style.display = "none";
          btnSpinner.style.display = "inline";
        }
        if (alertBox) alertBox.style.display = "none";

        const response = await fetch("/admin/users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Requested-With": "SPA",
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.success) {
          throw new Error(
            data.message || "Erreur lors de la création de l'administrateur.",
          );
        }

        if (modal) modal.style.display = "none";
        showToast(data.message || "Nouvel administrateur créé avec succès !");
        // Rafraîchir la vue SPA
        await navigateTo("/admin/users", false);
      } catch (err) {
        if (alertBox) {
          alertBox.className = "modal-alert error";
          alertBox.textContent = err.message;
          alertBox.style.display = "block";
        }
      } finally {
        if (submitBtn) submitBtn.disabled = false;
        if (btnText && btnSpinner) {
          btnText.style.display = "inline";
          btnSpinner.style.display = "none";
        }
      }
      return;
    }

    // Soumission Modification
    if (e.target && e.target.id === "form-edit-admin") {
      e.preventDefault();
      const form = e.target;
      const modal = form.closest(".admin-modal-backdrop");
      const submitBtn = form.querySelector(".btn-modal-submit");
      const btnText = submitBtn ? submitBtn.querySelector(".btn-text") : null;
      const btnSpinner = submitBtn
        ? submitBtn.querySelector(".btn-spinner")
        : null;
      const alertBox = modal ? modal.querySelector(".modal-alert") : null;

      const formData = new FormData(form);
      const adminId = formData.get("id");
      const payload = {
        name: formData.get("name"),
        login: formData.get("login"),
        email: formData.get("email"),
        role: formData.get("role"),
        is_active: formData.get("is_active"),
        password: formData.get("password"),
      };

      try {
        if (submitBtn) submitBtn.disabled = true;
        if (btnText && btnSpinner) {
          btnText.style.display = "none";
          btnSpinner.style.display = "inline";
        }
        if (alertBox) alertBox.style.display = "none";

        const response = await fetch(`/admin/users/${adminId}/edit`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Requested-With": "SPA",
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.success) {
          throw new Error(
            data.message ||
              "Erreur lors de la modification de l'administrateur.",
          );
        }

        if (modal) modal.style.display = "none";
        showToast(data.message || "Administrateur mis à jour avec succès !");
        // Rafraîchir la vue SPA
        await navigateTo("/admin/users", false);
      } catch (err) {
        if (alertBox) {
          alertBox.className = "modal-alert error";
          alertBox.textContent = err.message;
          alertBox.style.display = "block";
        }
      } finally {
        if (submitBtn) submitBtn.disabled = false;
        if (btnText && btnSpinner) {
          btnText.style.display = "inline";
          btnSpinner.style.display = "none";
        }
      }
      return;
    }
  });

  // Initialisation au chargement initial
  updateActiveSidebarLink(window.location.pathname);
  initInteractiveElements();
});
