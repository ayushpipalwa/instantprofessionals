(function () {
  "use strict";
  if (typeof document === "undefined") return;

  function normalise(value) {
    return String(value || "").toLocaleLowerCase("en-IN").replace(/\s+/g, " ").trim();
  }

  function initialiseDirectory() {
    const input = document.querySelector("[data-service-search]");
    const status = document.querySelector("[data-filter-status]");
    const empty = document.querySelector("[data-empty-state]");
    const groups = Array.from(document.querySelectorAll("[data-service-group]"));
    if (!input || !groups.length) return;

    function filter() {
      const query = normalise(input.value);
      let visibleCount = 0;

      groups.forEach(function (group) {
        let groupCount = 0;
        group.querySelectorAll("[data-service-link]").forEach(function (link) {
          const matches = !query || normalise(link.textContent + " " + (link.dataset.keywords || "")).includes(query);
          link.hidden = !matches;
          if (matches) {
            visibleCount += 1;
            groupCount += 1;
          }
        });
        group.hidden = groupCount === 0;
      });

      if (status) status.textContent = visibleCount + (visibleCount === 1 ? " service" : " services");
      if (empty) empty.hidden = visibleCount !== 0;
    }

    input.addEventListener("input", filter);
    filter();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialiseDirectory);
  } else {
    initialiseDirectory();
  }
})();
