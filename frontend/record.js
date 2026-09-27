(function () {
  "use strict";

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  const notFound = document.getElementById("not-found");
  const appEl = document.getElementById("record-app");
  const viewDoc = document.getElementById("view-doc");
  const viewActions = document.getElementById("view-actions");
  const editWrap = document.getElementById("edit-wrap");
  const editBtn = document.getElementById("editBtn");
  const cancelEditBtn = document.getElementById("cancelEdit");
  const printBtn = document.getElementById("printBtn");
  const deleteBtn = document.getElementById("deleteBtn");
  const recordTitle = document.getElementById("record-title");
  const form = document.getElementById("course-form");

  let records = loadRecords();
  let index = records.findIndex((r) => r.id === id);

  if (!id || index === -1) {
    notFound.hidden = false;
    return;
  }

  appEl.hidden = false;
  wireEvalTotal(form);
  const repeater = initOutcomeRepeater(form);

  function currentData() {
    return records[index];
  }

  function renderView() {
    const data = currentData();
    recordTitle.textContent = [data.courseCode, data.courseName].filter(Boolean).join(" ") || "Course Record";
    viewDoc.innerHTML = fullDocMarkup(data);
  }

  function enterEditMode() {
    populateFormData(form, repeater, currentData());
    viewActions.hidden = true;
    viewDoc.hidden = true;
    editWrap.hidden = false;
    editWrap.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function exitEditMode() {
    editWrap.hidden = true;
    viewDoc.hidden = false;
    viewActions.hidden = false;
  }

  editBtn.addEventListener("click", enterEditMode);
  cancelEditBtn.addEventListener("click", exitEditMode);

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const data = readFormData(form, repeater.outcomeList);
    records[index] = Object.assign({ id }, data);
    saveRecords(records);
    renderView();
    exitEditMode();
  });

  printBtn.addEventListener("click", function () {
    window.print();
  });

  deleteBtn.addEventListener("click", function () {
    if (confirm("Delete this course record? This cannot be undone.")) {
      records.splice(index, 1);
      saveRecords(records);
      window.location.href = "index.html";
    }
  });

  renderView();
})();