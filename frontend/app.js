/* ============================================================
   Shared logic: storage, data model, rendering, form read/populate.
   Loaded on both index.html (create) and record.html (view/edit).
   ============================================================ */

const STORAGE_KEY = "course-records-v3";
const PO_KEYS = ["PO1", "PO2", "PO3", "PO4", "PO5", "PO6", "PO7", "PO8", "PSO1", "PSO2"];
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

function coCode(data, o) {
  return `${data.courseCode}${o.suffix ? "." + o.suffix : ""}`;
}

/* ============================================================
   Outcome repeater (used inside any <form id="course-form">
   that contains #outcome-list, #addOutcome and #outcome-template)
   ============================================================ */
function initOutcomeRepeater(scopeEl) {
  const outcomeList = scopeEl.querySelector("#outcome-list");
  const addOutcomeBtn = scopeEl.querySelector("#addOutcome");
  const template = document.getElementById("outcome-template");

  function renumber() {
    outcomeList.querySelectorAll(".outcome-block").forEach((block, i) => {
      block.querySelector(".o-num").textContent = i + 1;
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

  return { addBlock, renumber, outcomeList };
}

function populateOutcomeBlock(block, o) {
  block.querySelector(".f-suffix").value = o.suffix || "";
  block.querySelector(".f-target").value = o.target || "";
  block.querySelector(".f-desc").value = o.description || "";
  block.querySelector(".f-bloom").value = o.bloom || "Application";
  block.querySelector(".f-tool").value = o.tool || "";
  block.querySelectorAll(".f-po").forEach((inp) => {
    inp.value = (o.poStrengths && o.poStrengths[inp.dataset.po]) || "";
  });
  [0, 1, 2].forEach((cycle) => {
    const h = (o.history && o.history[cycle]) || {};
    ["target", "actual", "remarks"].forEach((field) => {
      const inp = block.querySelector(`.f-hist[data-cycle="${cycle}"][data-field="${field}"]`);
      if (inp) inp.value = h[field] || "";
    });
  });
}

function readOutcomeBlock(block) {
  const suffix = block.querySelector(".f-suffix").value.trim();
  const description = block.querySelector(".f-desc").value.trim();
  if (!suffix && !description) return null;

  const poStrengths = {};
  block.querySelectorAll(".f-po").forEach((inp) => {
    const v = inp.value.trim();
    if (v !== "") poStrengths[inp.dataset.po] = Math.max(1, Math.min(3, parseInt(v, 10) || 0));
  });

  const history = [0, 1, 2].map((cycle) => {
    const get = (field) => block.querySelector(`.f-hist[data-cycle="${cycle}"][data-field="${field}"]`).value.trim();
    return { target: get("target"), actual: get("actual"), remarks: get("remarks") };
  });

  return {
    suffix,
    description,
    target: block.querySelector(".f-target").value.trim(),
    bloom: block.querySelector(".f-bloom").value,
    tool: block.querySelector(".f-tool").value.trim(),
    poStrengths,
    history,
  };
}

function readOutcomes(outcomeListEl) {
  return Array.from(outcomeListEl.querySelectorAll(".outcome-block"))
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
    historyLabels: Array.from(scopeEl.querySelectorAll(".hist-label")).map((i) => i.value.trim()),
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

  const histInputs = scopeEl.querySelectorAll(".hist-label");
  (data.historyLabels || []).forEach((l, i) => {
    if (histInputs[i]) histInputs[i].value = l || "";
  });

  repeater.outcomeList.innerHTML = "";
  if (data.outcomes && data.outcomes.length) {
    data.outcomes.forEach((o) => repeater.addBlock(o));
  } else {
    repeater.addBlock();
  }

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
   Document rendering (the generated multi-table course record)
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
    .map((o) => {
      const pos = PO_KEYS.filter((k) => o.poStrengths[k]).join(", ") || "-";
      return `
        <tr>
          <td class="left" style="font-weight:600;">${escapeHtml(coCode(data, o))}</td>
          <td class="left">${escapeHtml(o.description)}</td>
          <td>${pos}</td>
          <td>${dash(o.target)}</td>
        </tr>`;
    })
    .join("");
  return `
      <div class="course-doc__section">
        <h3>Course Outcomes (CO)</h3>
        <p>At the end of the course student will be able to:</p>
        <div class="doc-table-wrap">
        <table class="doc-table">
          <thead><tr><th class="left">CO</th><th class="left">Outcome</th><th>PO/PSO</th><th>CO Target</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        </div>
      </div>`;
}

function historyTableMarkup(data) {
  if (!data.outcomes || data.outcomes.length === 0) return "";
  const labels = data.historyLabels.map((l, i) => l || `Cycle ${i + 1}`);
  const head1 = labels.map((l) => `<th colspan="3">CO attainment ${escapeHtml(l)}</th>`).join("");
  const head2 = labels.map(() => `<th>target</th><th>actual</th><th>Remarks</th>`).join("");
  const rows = data.outcomes
    .map((o) => {
      const cells = [0, 1, 2]
        .map((i) => {
          const h = o.history[i] || { target: "", actual: "", remarks: "" };
          return `<td>${dash(h.target)}</td><td>${dash(h.actual)}</td><td>${dash(h.remarks)}</td>`;
        })
        .join("");
      return `<tr><td style="font-weight:600;">${escapeHtml(coCode(data, o))}</td>${cells}</tr>`;
    })
    .join("");
  return `
      <div class="course-doc__section">
        <h3>Justification for CO setting in ${escapeHtml(data.year)} target</h3>
        <div class="doc-table-wrap">
        <table class="doc-table">
          <thead><tr><th></th>${head1}</tr><tr><th></th>${head2}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
        </div>
      </div>`;
}

function poMappingMarkup(data) {
  if (!data.outcomes || data.outcomes.length === 0) return "";
  const head = PO_KEYS.map((k) => `<th>${k}</th>`).join("");
  const rows = data.outcomes
    .map((o) => {
      const cells = PO_KEYS.map((k) => `<td>${o.poStrengths[k] || "-"}</td>`).join("");
      return `<tr><td style="font-weight:600;">${escapeHtml(coCode(data, o))}</td>${cells}</tr>`;
    })
    .join("");

  const totals = PO_KEYS.map((k) => {
    const vals = data.outcomes.map((o) => o.poStrengths[k]).filter((v) => v);
    return vals.reduce((s, v) => s + v, 0);
  });
  const strengths = PO_KEYS.map((k) => {
    const vals = data.outcomes.map((o) => o.poStrengths[k]).filter((v) => v);
    if (vals.length === 0) return "-";
    return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
  });

  return `
      <div class="course-doc__section">
        <h3>Mapping of CO with PO (correlation / strength matrix)</h3>
        <p class="legend-text">Correlation Levels: 1 (weak) &nbsp; 2 (medium) &nbsp; 3 (strong)</p>
        <p class="legend-text">It is decided based on depth of the teaching-learning required and questions planned to be asked in exams across the various assessment modes during a semester.</p>
        <div class="doc-table-wrap">
        <table class="doc-table">
          <thead><tr><th></th>${head}</tr></thead>
          <tbody>
            ${rows}
            <tr><td style="font-weight:600;">PO TOTAL</td>${totals.map((t) => `<td>${t || "-"}</td>`).join("")}</tr>
            <tr><td style="font-weight:600;">STRENGTH</td>${strengths.map((s) => `<td>${s}</td>`).join("")}</tr>
          </tbody>
        </table>
        </div>
      </div>`;
}

function assessmentToolsMarkup(data) {
  if (!data.outcomes || data.outcomes.length === 0) return "";
  const rows = data.outcomes
    .map(
      (o) => `
        <tr>
          <td class="left">${escapeHtml(o.description)}</td>
          <td>${escapeHtml(o.bloom || "-")}</td>
          <td>${dash(o.tool)}</td>
        </tr>`
    )
    .join("");
  return `
      <div class="course-doc__section">
        <h3>Course Outcomes Assessment Tools Mapping</h3>
        <div class="doc-table-wrap">
        <table class="doc-table">
          <thead><tr><th class="left">At the end of the course student will be able to</th><th>Bloom Level</th><th>Assessment Tool</th></tr></thead>
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
        ${overviewMarkup(data)}
        ${outcomesTableMarkup(data)}
        ${historyTableMarkup(data)}
        ${poMappingMarkup(data)}
        ${assessmentToolsMarkup(data)}
        ${RUBRIC_STATIC}
      </div>`;
}