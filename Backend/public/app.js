// FRONTEND ONLY — safe code

let links = document.querySelectorAll("a");

links.forEach(link => {
  link.addEventListener("click", () => {
    link.style.color = "hsl(271, 68.5%, 32.4%)";
  });
});
