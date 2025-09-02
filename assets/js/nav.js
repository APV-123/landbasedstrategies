document.addEventListener("DOMContentLoaded", () => {
  const navContainer = document.getElementById("nav");
  if (!navContainer) return;

  fetch("/partials/nav.html")
    .then(response => response.text())
    .then(html => {
      navContainer.innerHTML = html;

      const current = window.location.pathname;

      // Define parent sections that should highlight on subtree
      const sections = ["/strategies/", "/insights/"];

      navContainer.querySelectorAll("a").forEach(a => {
        const href = a.getAttribute("href");

        // Exact page match
        if (href === current) {
          a.setAttribute("aria-current", "page");
        }

        // Section match (e.g. /strategies/retail/ -> highlight /strategies/)
        sections.forEach(section => {
          if (current.startsWith(section) && href === section) {
            a.setAttribute("aria-current", "page");
          }
        });
      });

      // ===== Mobile Nav Behavior =====
      const nav = navContainer.querySelector(".nav");
      const navToggle = navContainer.querySelector(".nav-toggle");
      const backdrop = document.querySelector(".nav-backdrop"); // lives outside navContainer

      if (nav && navToggle && backdrop) {
        // Toggle drawer open/close
        navToggle.addEventListener("click", () => {
          nav.classList.toggle("open");
          backdrop.classList.toggle("open");
        });

        // Close when clicking backdrop
        backdrop.addEventListener("click", () => {
          nav.classList.remove("open");
          backdrop.classList.remove("open");
        });
      }

      // ===== Submenu toggles (caret buttons only) =====
navContainer.querySelectorAll(".caret-toggle").forEach(btn => {
  btn.addEventListener("click", e => {
    e.preventDefault();
    btn.closest(".nav-item").classList.toggle("open");
  });
});

    })
    .catch(err => console.error("Error loading nav:", err));
});
