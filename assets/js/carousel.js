document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".carousel").forEach(carousel => {
    try {
      const images = JSON.parse(carousel.dataset.images);

      const inner = document.createElement("div");
      inner.classList.add("carousel-inner");

      images.forEach((imgData, i) => {
        const item = document.createElement("div");
        item.classList.add("carousel-item");
        if (i === 0) item.classList.add("active");

        const img = document.createElement("img");
        img.src = imgData.src;
        img.alt = imgData.caption || `Carousel image ${i+1}`;
        item.appendChild(img);

        if (imgData.caption) {
          const caption = document.createElement("div");
          caption.classList.add("carousel-caption");
          caption.innerText = imgData.caption;
          item.appendChild(caption);
        }

        inner.appendChild(item);
      });

      carousel.appendChild(inner);

      // Controls
      const prevBtn = document.createElement("button");
      prevBtn.className = "carousel-control prev";
      prevBtn.innerText = "‹";
      prevBtn.onclick = () => moveCarousel(carousel, -1);

      const nextBtn = document.createElement("button");
      nextBtn.className = "carousel-control next";
      nextBtn.innerText = "›";
      nextBtn.onclick = () => moveCarousel(carousel, 1);

      carousel.appendChild(prevBtn);
      carousel.appendChild(nextBtn);

      // === Auto-play ===
      let autoPlay = setInterval(() => moveCarousel(carousel, 1), 5000); // 5s
      carousel.addEventListener("mouseenter", () => clearInterval(autoPlay));
      carousel.addEventListener("mouseleave", () => {
        autoPlay = setInterval(() => moveCarousel(carousel, 1), 5000);
      });

      // === Swipe Support ===
      let startX = 0;
      carousel.addEventListener("touchstart", e => {
        startX = e.touches[0].clientX;
      });
      carousel.addEventListener("touchend", e => {
        const endX = e.changedTouches[0].clientX;
        if (endX - startX > 50) {
          moveCarousel(carousel, -1); // swipe right
        } else if (startX - endX > 50) {
          moveCarousel(carousel, 1); // swipe left
        }
      });

    } catch (err) {
      console.error("Carousel JSON parse error:", err, carousel.dataset.images);
    }
  });
});

function moveCarousel(carousel, step) {
  const items = carousel.querySelectorAll(".carousel-item");
  let currentIndex = [...items].findIndex(item => item.classList.contains("active"));

  if (currentIndex === -1) currentIndex = 0;

  items[currentIndex].classList.remove("active");
  currentIndex = (currentIndex + step + items.length) % items.length;
  items[currentIndex].classList.add("active");
}
