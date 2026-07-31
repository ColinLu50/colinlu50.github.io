(function () {
  "use strict";

  var reveals = document.querySelectorAll(".studio-reveal");
  if ("IntersectionObserver" in window) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    reveals.forEach(function (element, index) {
      element.style.transitionDelay = Math.min(index % 3, 2) * 80 + "ms";
      revealObserver.observe(element);
    });
  } else {
    reveals.forEach(function (element) { element.classList.add("is-visible"); });
  }

}());
