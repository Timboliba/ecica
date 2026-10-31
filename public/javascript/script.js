// // const dropdown_menu = document.querySelectorAll(".dropdown-menu");

// // dropdown_menu.forEach(el=>{
// //     el.addEventListener('mous')
// // })
// const imgs = [
//   "/img/first.png",
//   "/img/imgi_3_2026-03-13-01-50-18_e1f2b357db0f8a24e0865b5e9f096589d1b06de9.png",
//   "/img/imgi_4_2026-03-10-12-34-13_44137027455037663c328af634c83ea4d25a70f1.png",
//   "/img/imgi_5_2025-10-04-12-35-46_8beb0a304eef6eb40e20d7f07f175f75d2399499.png",
// ];
// const carousel_controle = document.querySelector(".carousel-controle");
// const carousel = document.querySelector(".carousel");
// const article_img = document.querySelector(".article_imgs");
// if (carousel) {
//   const prev = document.querySelector(".prev");
//   const next = document.querySelector(".next");
//   let i = 0;

//   carousel.addEventListener("mouseover", (e) => {
//     carousel_controle.style.opacity = 1;
//   });
//   carousel.addEventListener("mouseleave", (e) => {
//     carousel_controle.style.opacity = 0;
//   });

//   prev.addEventListener("click", () => {
//     if (i > 0) {
//       i -= 1;
//       article_img.src = imgs[i];
//     }
//     console.log("prev", i, imgs[i]);
//   });

//   next.addEventListener("click", () => {
//     if (i <= imgs.length - 1) {
//       article_img.src = imgs[i];
//       i += 1;
//     }
//     if (i >= imgs.length) i = imgs.length - 1;
//     console.log("next", i, imgs[i]);
//   });

//   setInterval(() => {
//     i++;
//     if (i >= imgs.length) {
//       i = 0;
//     }
//     article_img.src = imgs[i];
//     console.log(i);
//   }, 4000);
// }

// IMAGES
const imgs = [
  "/img/picture1.webp",
  "/img/picture2.webp",
  "/img/picture3.webp",
  "/img/picture4.webp",
  "/img/picture5.webp",
];

// ELEMENTS
const carousel = document.querySelector(".carousel");
const carouselControle = document.querySelector(".carousel-controle");
const imgElement = document.querySelector(".article_imgs");
const prev = document.querySelector(".prev");
const next = document.querySelector(".next");

//=============== SECURITÉ =================//
if (!carousel || !imgElement || !prev || !next) {
  console.warn("Carousel elements not found");
} else {
  let index = 0;
  let interval;

  //================= FUNCTIONS =================//

  const updateImage = () => {
    imgElement.src = imgs[index];
  };

  const nextSlide = () => {
    index = (index + 1) % imgs.length;
    updateImage();
  };

  const prevSlide = () => {
    index = (index - 1 + imgs.length) % imgs.length;
    updateImage();
  };

  const startAutoSlide = () => {
    interval = setInterval(nextSlide, 4000);
  };

  const stopAutoSlide = () => {
    clearInterval(interval);
  };

  //================= EVENTS =================//

  next.addEventListener("click", () => {
    nextSlide();
  });

  prev.addEventListener("click", () => {
    prevSlide();
  });

  // Hover (desktop)
  carousel.addEventListener("mouseenter", () => {
    carouselControle.style.opacity = 1;
    stopAutoSlide();
  });

  carousel.addEventListener("mouseleave", () => {
    carouselControle.style.opacity = 0;
    startAutoSlide();
  });

  carousel.addEventListener("touchstart", stopAutoSlide);
  carousel.addEventListener("touchend", startAutoSlide);

  updateImage();
  startAutoSlide();
}

// AIzaSyASO-lTWNXEx-ycUt6rMQmCp1c3V9ou6AU
function initMap() {
  const location = { lat: 12.6392, lgn: -8.0029 }; //Bamako
  const map = new google.maps.Map(document.querySelector(".map-container"), {
    zoom: 12,
    center: location,
  });
}

//=================== Navigation bar script
const mobileNavWidth = 1024;

const hamburger = document.getElementById("hamburger");
const navi = document.getElementById("nav");

if (hamburger && navi) {
  hamburger.addEventListener("click", () => {
    navi.classList.toggle("active");
  });
}

//====================== Gestion des sous-menus en mobile
document.querySelectorAll(".dropdown-menu > a").forEach((link) => {
  link.addEventListener("click", (e) => {
    const dropdownMenu = link.parentElement;
    const hasSubmenu = dropdownMenu.querySelector(":scope > .dropdown-submenu");

    if (window.innerWidth <= mobileNavWidth && hasSubmenu) {
      e.preventDefault();
      dropdownMenu.classList.toggle("active");
    }
  });
});

window.addEventListener("resize", () => {
  if (window.innerWidth > mobileNavWidth) {
    navi?.classList.remove("active");
    document
      .querySelectorAll(".dropdown-menu.active")
      .forEach((menu) => menu.classList.remove("active"));
  }
});

//====================== Pagination & Carrousel des formations
const sliderWrapper = document.querySelector(".formation-slider-wrapper");
const cardsContainer = document.querySelector(".formation-cards");
const prevBtn = document.querySelector(".formation-nav-btn--prev");
const nextBtn = document.querySelector(".formation-nav-btn--next");
const pageIndicator = document.querySelector(".formation-page-indicator");

if (sliderWrapper && cardsContainer && prevBtn && nextBtn) {
  const cards = cardsContainer.querySelectorAll(".formation-card");
  let currentPage = 0;

  const getVisibleCount = () => {
    if (window.innerWidth <= 600) return 1;
    if (window.innerWidth <= 1024) return 2;
    return 4;
  };

  const getTotalPages = () => {
    const visible = getVisibleCount();
    return Math.max(1, Math.ceil(cards.length / visible));
  };

  const updatePagination = () => {
    const visible = getVisibleCount();
    const totalPages = getTotalPages();

    if (currentPage >= totalPages) currentPage = totalPages - 1;
    if (currentPage < 0) currentPage = 0;

    const wrapperWidth = sliderWrapper.offsetWidth;
    const offset = currentPage * (wrapperWidth + 20);

    cardsContainer.style.transform = `translateX(-${offset}px)`;

    if (pageIndicator) {
      pageIndicator.textContent = `${currentPage + 1} / ${totalPages}`;
    }

    prevBtn.disabled = currentPage === 0;
    nextBtn.disabled = currentPage >= totalPages - 1;
  };

  prevBtn.addEventListener("click", () => {
    if (currentPage > 0) {
      currentPage--;
      updatePagination();
    }
  });

  nextBtn.addEventListener("click", () => {
    const totalPages = getTotalPages();
    if (currentPage < totalPages - 1) {
      currentPage++;
      updatePagination();
    }
  });

  window.addEventListener("resize", () => {
    updatePagination();
  });

  // Support tactile mobile (glisser / swipe)
  let touchStartX = 0;
  sliderWrapper.addEventListener(
    "touchstart",
    (e) => {
      touchStartX = e.touches[0].clientX;
    },
    { passive: true }
  );

  sliderWrapper.addEventListener(
    "touchend",
    (e) => {
      const diff = touchStartX - e.changedTouches[0].clientX;
      const totalPages = getTotalPages();
      if (diff > 50 && currentPage < totalPages - 1) {
        currentPage++;
        updatePagination();
      } else if (diff < -50 && currentPage > 0) {
        currentPage--;
        updatePagination();
      }
    },
    { passive: true }
  );

  updatePagination();
}
