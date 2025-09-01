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
    })
    .catch(err => console.error("Error loading nav:", err));
});
