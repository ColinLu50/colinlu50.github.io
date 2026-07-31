(function () {
  "use strict";

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var newsTabs = Array.prototype.slice.call(document.querySelectorAll("[data-news-year]"));
  var newsPanels = Array.prototype.slice.call(document.querySelectorAll("[data-news-panel]"));
  var newsDecks = Array.prototype.slice.call(document.querySelectorAll("[data-news-deck]"));
  var newsBrowser = document.querySelector("[data-news-browser]");

  var newsScrollState = document.querySelector("[data-news-scroll-state]");
  var newsScrollTrack = document.querySelector("[data-news-scroll-track]");
  var newsScrollCursor = document.querySelector("[data-news-scroll-cursor]");
  var newsScrollCurrent = document.querySelector("[data-news-scroll-current]");
  var newsScrollTotal = document.querySelector("[data-news-scroll-total]");

  function formatNewsPosition(value) {
    return value < 10 ? "0" + value : String(value);
  }

  function updateNewsScrollState(deck) {
    if (!deck || !newsScrollState) return;
    var panel = deck.closest("[data-news-panel]");
    if (!panel || panel.hidden) return;
    var items = Array.prototype.slice.call(deck.querySelectorAll("[data-news-item]"));
    var total = items.length;
    var maxScroll = Math.max(0, deck.scrollHeight - deck.clientHeight);
    var progress = maxScroll ? deck.scrollTop / maxScroll : 0;
    var visibleRatio = deck.scrollHeight ? Math.min(1, deck.clientHeight / deck.scrollHeight) : 1;
    var marker = deck.scrollTop + Math.min(36, deck.clientHeight * .12);
    var currentIndex = 0;

    items.forEach(function (item, index) {
      if (item.offsetTop <= marker) currentIndex = index;

    });

    if (newsScrollTrack && newsScrollCursor) {
      var trackHeight = newsScrollTrack.clientHeight;
      var offset = trackHeight * (1 - visibleRatio) * progress;
      newsScrollCursor.style.transform = "translate3d(0," + offset.toFixed(2) + "px,0)";
      if (newsScrollCursor.firstElementChild) {
        newsScrollCursor.firstElementChild.style.transform = "scaleY(" + visibleRatio.toFixed(4) + ")";
      }
    }

    if (newsScrollCurrent) newsScrollCurrent.textContent = formatNewsPosition(total ? currentIndex + 1 : 0);
    if (newsScrollTotal) newsScrollTotal.textContent = formatNewsPosition(total);

    if (newsBrowser) newsBrowser.classList.toggle("is-scrolled", deck.scrollTop > 12);
  }

  function resetNewsDeck(panel) {
    var deck = panel && panel.querySelector("[data-news-deck]");
    if (!deck) return;
    deck.scrollTop = 0;
    updateNewsScrollState(deck);
  }

  function selectNewsYear(year, moveFocus) {
    newsTabs.forEach(function (tab) {
      var selected = tab.getAttribute("data-news-year") === year;
      tab.setAttribute("aria-selected", selected ? "true" : "false");
      tab.setAttribute("tabindex", selected ? "0" : "-1");
      if (selected && moveFocus) tab.focus();
    });

    newsPanels.forEach(function (panel) {
      var selected = panel.getAttribute("data-news-panel") === year;
      panel.hidden = !selected;
      panel.classList.toggle("is-active", selected);
      if (selected) {
        window.requestAnimationFrame(function () {
          resetNewsDeck(panel);
        });
      }
    });
  }

  newsTabs.forEach(function (tab, index) {
    tab.addEventListener("click", function () {
      selectNewsYear(tab.getAttribute("data-news-year"), false);
    });

    tab.addEventListener("keydown", function (event) {
      var nextIndex = index;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (index + 1) % newsTabs.length;
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (index - 1 + newsTabs.length) % newsTabs.length;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = newsTabs.length - 1;
      if (nextIndex === index) return;
      event.preventDefault();
      selectNewsYear(newsTabs[nextIndex].getAttribute("data-news-year"), true);
    });
  });

  newsDecks.forEach(function (deck) {
    var newsScrollFrame = 0;
    deck.addEventListener("scroll", function () {
      if (newsScrollFrame) return;
      newsScrollFrame = window.requestAnimationFrame(function () {
        updateNewsScrollState(deck);
        newsScrollFrame = 0;
      });
    }, { passive: true });

    if ("ResizeObserver" in window) {
      var deckResizeObserver = new ResizeObserver(function () {
        updateNewsScrollState(deck);
      });
      deckResizeObserver.observe(deck);
    }
  });

  if (newsPanels.length) {
    window.requestAnimationFrame(function () {
      resetNewsDeck(newsPanels[0]);
    });
  }
  var revealElements = document.querySelectorAll(".home-reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    revealElements.forEach(function (element) { revealObserver.observe(element); });
  } else {
    revealElements.forEach(function (element) { element.classList.add("is-visible"); });
  }
}());