const carousel_controle = document.querySelector(".carousel-controle");
const carousel = document.querySelector(".carousel");
if (carousel) {
  carousel.addEventListener("mouseenter", (e) => {
    carousel_controle.style.display = "flex";
  });
}
