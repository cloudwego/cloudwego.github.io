document.addEventListener("DOMContentLoaded", () => {
  let anchors = document.querySelectorAll('a[href^="#"]');
  anchors.forEach((anchor) => {
    anchor.addEventListener("click", (event) => {
      event.preventDefault();
      let target = anchor.getAttribute("href").substring(1);
      let element = document.getElementById(target);
      if (element) {
        window.scrollTo({
          top: element.offsetTop - 70,
          behavior: "smooth",
        });
      }
    });
  });
});
