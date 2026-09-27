(function () {
  "use strict";

  const form = document.getElementById("course-form");
  const resetFormBtn = document.getElementById("resetForm");
  const savedSection = document.getElementById("saved-records");
  const savedList = document.getElementById("saved-records-list");

  wireEvalTotal(form);
  const repeater = initOutcomeRepeater(form);
  repeater.addBlock(); // start with one empty outcome ready to fill

  function renderSavedList() {
    const records = loadRecords();
    if (records.length === 0) {
      savedSection.hidden = true;
      return;
    }
    savedSection.hidden = false;
    savedList.innerHTML = records
      .slice()
      .reverse()
      .map((r) => {
        const title = `${escapeHtml(r.courseCode || "Untitled")} ${escapeHtml(r.courseName || "")}`.trim();
        const sub = [r.program, r.semester ? "Sem " + r.semester : "", r.year].filter(Boolean).map(escapeHtml).join(" · ");
        return `<li><a href="record.html?id=${encodeURIComponent(r.id)}"><span class="saved-records__title">${title}</span><span class="saved-records__sub">${sub}</span></a></li>`;
      })
      .join("");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const data = readFormData(form, repeater.outcomeList);
    const id = generateId();
    const records = loadRecords();
    records.push(Object.assign({ id }, data));
    saveRecords(records);
    window.location.href = "record.html?id=" + encodeURIComponent(id);
  });

  resetFormBtn.addEventListener("click", function () {
    form.reset();
    repeater.outcomeList.innerHTML = "";
    repeater.addBlock();
    recalcTotal(form);
  });

  renderSavedList();
})();