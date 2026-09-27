/* ============================================================
   Shared logic: storage, data model, rendering, form read/populate.
   Loaded on both index.html (create) and record.html (view/edit).
   ============================================================ */

const STORAGE_KEY = "course-records-v4";
const EVAL_IDS = ["eTheoryExam", "eTheoryISE", "eTheoryMSE", "ePracticalISE", "ePracticalESE"];

/* ---------------- Storage ---------------- */
function loadRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}
function saveRecords(records) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    return true;
  } catch (e) {
    return false;
  }
}
function generateId() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return "rec-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

/* ---------------- Helpers ---------------- */
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}
const dash = (v) => (v === "" || v === undefined || v === null ? "-" : escapeHtml(v));

/* ============================================================
   Course Outcomes (CO) table — editable rows inside
   <tbody id="outcome-list"> using <template id="outcome-template">.
   Each row: auto CO label, auto code (courseCode.N), description,
   PO/PSO text, CO target.
   ============================================================ */
function initOutcomeRepeater(scopeEl) {
  const outcomeList = scopeEl.querySelector("#outcome-list");
  const addOutcomeBtn = scopeEl.querySelector("#addOutcome");
  const template = document.getElementById("outcome-template");
  const courseCodeInput = scopeEl.querySelector("#courseCode");

  function renumber() {
    const code = (courseCodeInput.value || "").trim() || "COURSE";
    outcomeList.querySelectorAll(".outcome-row").forEach((row, i) => {
      row.querySelector(".co-num").textContent = "CO" + (i + 1);
      row.querySelector(".co-code").textContent = code + "." + (i + 1);
    });
  }

  function addBlock(outcome) {
    const node = template.content.firstElementChild.cloneNode(true);
    node.querySelector(".remove-outcome").addEventListener("click", () => {
      node.remove();
      renumber();
    });
    outcomeList.appendChild(node);
    if (outcome) populateOutcomeBlock(node, outcome);
    renumber();
    return node;
  }

  addOutcomeBtn.addEventListener("click", () => addBlock());
  courseCodeInput.addEventListener("input", renumber);

  return { addBlock, renumber, outcomeList };
}

function populateOutcomeBlock(row, o) {
  row.querySelector(".f-desc").value = o.description || "";
  row.querySelector(".f-po").value = o.poText || "";
  row.querySelector(".f-target").value = o.target || "";
}

function readOutcomeBlock(row) {
  const description = row.querySelector(".f-desc").value.trim();
  const poText = row.querySelector(".f-po").value.trim();
  const target = row.querySelector(".f-target").value.trim();
  if (!description && !poText && !target) return null;
  return { description, poText, target };
}

function readOutcomes(outcomeListEl) {
  return Array.from(outcomeListEl.querySelectorAll(".outcome-row"))
    .map(readOutcomeBlock)
    .filter(Boolean);
}

/* ---------------- Full form read / populate ---------------- */
function readFormData(scopeEl, outcomeListEl) {
  const val = (id) => scopeEl.querySelector("#" + id).value.trim();
  return {
    program: val("program"),
    semester: val("semester"),
    year: val("year"),
    courseCode: val("courseCode"),
    courseName: val("courseName"),
    prerequisite: val("prerequisite"),
    pLecture: scopeEl.querySelector("#pLecture").value,
    pTutorial: scopeEl.querySelector("#pTutorial").value,
    pPractical: scopeEl.querySelector("#pPractical").value,
    faculty: val("faculty"),
    eTheoryExam: scopeEl.querySelector("#eTheoryExam").value,
    eTheoryISE: scopeEl.querySelector("#eTheoryISE").value,
    eTheoryMSE: scopeEl.querySelector("#eTheoryMSE").value,
    ePracticalISE: scopeEl.querySelector("#ePracticalISE").value,
    ePracticalESE: scopeEl.querySelector("#ePracticalESE").value,
    overview: val("overview"),
    outcomes: readOutcomes(outcomeListEl),
  };
}

function populateFormData(scopeEl, repeater, data) {
  const set = (id, v) => {
    const el = scopeEl.querySelector("#" + id);
    if (el) el.value = v || "";
  };
  set("program", data.program);
  set("semester", data.semester);
  set("year", data.year);
  set("courseCode", data.courseCode);
  set("courseName", data.courseName);
  set("prerequisite", data.prerequisite);
  set("pLecture", data.pLecture);
  set("pTutorial", data.pTutorial);
  set("pPractical", data.pPractical);
  set("faculty", data.faculty);
  set("eTheoryExam", data.eTheoryExam || 0);
  set("eTheoryISE", data.eTheoryISE || 0);
  set("eTheoryMSE", data.eTheoryMSE || 0);
  set("ePracticalISE", data.ePracticalISE || 0);
  set("ePracticalESE", data.ePracticalESE || 0);
  set("overview", data.overview);

  repeater.outcomeList.innerHTML = "";
  if (data.outcomes && data.outcomes.length) {
    data.outcomes.forEach((o) => repeater.addBlock(o));
  } else {
    repeater.addBlock();
  }
  repeater.renumber();

  recalcTotal(scopeEl);
}

function recalcTotal(scopeEl) {
  const totalEl = scopeEl.querySelector("#evalTotal");
  if (!totalEl) return;
  const total = EVAL_IDS.reduce((sum, id) => {
    const v = parseFloat(scopeEl.querySelector("#" + id).value);
    return sum + (isNaN(v) ? 0 : v);
  }, 0);
  totalEl.textContent = total;
}

function wireEvalTotal(scopeEl) {
  EVAL_IDS.forEach((id) => scopeEl.querySelector("#" + id).addEventListener("input", () => recalcTotal(scopeEl)));
}

/* ============================================================
   Document rendering (the generated course record)
   ============================================================ */
function periodsRows(data) {
  const rows = [
    ["Lecture", data.pLecture],
    ["Tutorial", data.pTutorial],
    ["Practical", data.pPractical],
  ].filter((r) => r[1] !== "" && r[1] !== null && !isNaN(parseFloat(r[1])) && parseFloat(r[1]) > 0);
  if (rows.length === 0) return "";
  return rows
    .map(
      (r, i) => `
      <tr>
        ${i === 0 ? `<td class="label" rowspan="${rows.length}">Periods per week<br><span style="font-weight:400;font-size:12.5px;">(each of 60 min.)</span></td>` : ""}
        <td>${escapeHtml(r[0])}</td>
        <td class="center">${escapeHtml(r[1])} hrs</td>
      </tr>`
    )
    .join("");
}

function topCardMarkup(data) {
  const total = EVAL_IDS.reduce((sum, id) => sum + (parseFloat(data[id]) || 0), 0);
  return `
      <table class="course-table">
        <tbody>
          <tr>
            <td class="label">Program: ${escapeHtml(data.program)}</td>
            <td colspan="2">Semester – ${escapeHtml(data.semester)}<br>Year - ${escapeHtml(data.year)}</td>
          </tr>
          <tr class="course-title">
            <td colspan="3">Course: ${escapeHtml(data.courseCode)} ${escapeHtml(data.courseName)}</td>
          </tr>
          ${
            data.prerequisite
              ? `<tr><td colspan="3"><span style="font-weight:600;">Prerequisite:</span> ${escapeHtml(data.prerequisite)}</td></tr>`
              : ""
          }
          ${periodsRows(data)}
          <tr><td colspan="3"><span style="font-weight:600;">Faculty in charge:</span> ${escapeHtml(data.faculty)}</td></tr>
          <tr>
            <td class="label" rowspan="6">Evaluation System</td>
            <td>Theory Examination</td><td class="center">${data.eTheoryExam || 0}</td>
          </tr>
          <tr><td>Theory ISE</td><td class="center">${data.eTheoryISE || 0}</td></tr>
          <tr><td>Theory MSE</td><td class="center">${data.eTheoryMSE || 0}</td></tr>
          <tr><td>Practical ISE</td><td class="center">${data.ePracticalISE || 0}</td></tr>
          <tr><td>Practical ESE</td><td class="center">${data.ePracticalESE || 0}</td></tr>
          <tr class="total-row"><td>Total</td><td class="center">${total}</td></tr>
        </tbody>
      </table>`;
}

function overviewMarkup(data) {
  if (!data.overview) return "";
  const paras = data.overview.split(/\n+/).filter((p) => p.trim());
  if (paras.length === 0) return "";
  return `
      <div class="course-doc__section">
        <h3>Course Overview</h3>
        ${paras.map((p) => `<p>${escapeHtml(p)}</p>`).join("")}
      </div>`;
}

function outcomesTableMarkup(data) {
  if (!data.outcomes || data.outcomes.length === 0) return "";
  const rows = data.outcomes
    .map(
      (o, i) => `
        <tr>
          <td style="font-weight:600;">CO${i + 1}</td>
          <td style="font-weight:600;white-space:nowrap;">${escapeHtml(data.courseCode)}.${i + 1}</td>
          <td class="left">${escapeHtml(o.description)}</td>
          <td class="left">${dash(o.poText)}</td>
          <td>${dash(o.target)}</td>
        </tr>`
    )
    .join("");
  return `
      <div class="course-doc__section">
        <h3>Course Outcomes (CO)</h3>
        <div class="doc-table-wrap">
        <table class="doc-table">
          <thead>
            <tr>
              <th>CO</th>
              <th colspan="2" class="left">At the end of the course student will be able to:</th>
              <th class="left">PO/PSO</th>
              <th>CO Target</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        </div>
      </div>`;
}

const RUBRIC_STATIC = `
      <div class="course-doc__section">
        <h3>Assessment Target Rubric for PO/PSO Attainment</h3>
        <p>Theory course — Attainment levels versus target:</p>
        <div class="doc-table-wrap">
        <table class="doc-table">
          <thead><tr><th class="left">CO Attainment Method</th><th>1 (low)</th><th>2 (medium)</th><th>3 (high)</th></tr></thead>
          <tbody>
            <tr>
              <td class="left" style="font-weight:600;">ESE/MSE</td>
              <td class="left">&lt; 40% students scoring more than class average in the final examination</td>
              <td class="left">40–60% students scoring more than class average in the final examination</td>
              <td class="left">&gt; 60% students scoring more than class average in the final examination</td>
            </tr>
            <tr>
              <td class="left" style="font-weight:600;">ISE</td>
              <td class="left">&lt; 50% students score more than class average in the internal assessment</td>
              <td class="left">50–70% students score more than class average in the internal assessment</td>
              <td class="left">&gt; 70% students score more than class average in the internal assessment</td>
            </tr>
            <tr>
              <td class="left" style="font-weight:600;">Course Exit Survey</td>
              <td class="left">&lt; 60% weightage average in course exit analysis</td>
              <td class="left">60–80% weightage average in course exit analysis</td>
              <td class="left">&gt; 80% weightage average in course exit analysis</td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>`;

function fullDocMarkup(data) {
  return `
      ${topCardMarkup(data)}
      <div class="course-doc">
        ${outcomesTableMarkup(data)}
        ${overviewMarkup(data)}
        ${RUBRIC_STATIC}
      </div>`;
}