const rows = Array.isArray(window.USNEWS_CS_RANKINGS)
  ? window.USNEWS_CS_RANKINGS.map((row, index) => normalizeRow(row, index))
  : [];

const state = {
  query: "",
  selectedState: "all",
  rankBand: "all",
  sortBy: "rank-asc",
  selectedId: rows[0]?.id ?? null,
};

const elements = {
  searchInput: document.querySelector("#search-input"),
  stateFilter: document.querySelector("#state-filter"),
  rankFilter: document.querySelector("#rank-filter"),
  sortSelect: document.querySelector("#sort-select"),
  resultMeta: document.querySelector("#result-meta"),
  heroStats: document.querySelector("#hero-stats"),
  tableBody: document.querySelector("#table-body"),
  detailCard: document.querySelector("#detail-card"),
  stateList: document.querySelector("#state-list"),
  emptyState: document.querySelector("#empty-state"),
};

initialize();

function initialize() {
  populateStateFilter();
  bindEvents();
  renderHeroStats();
  renderStateCoverage();
  render();
}

function bindEvents() {
  elements.searchInput.addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLowerCase();
    render();
  });

  elements.stateFilter.addEventListener("change", (event) => {
    state.selectedState = event.target.value;
    render();
  });

  elements.rankFilter.addEventListener("change", (event) => {
    state.rankBand = event.target.value;
    render();
  });

  elements.sortSelect.addEventListener("change", (event) => {
    state.sortBy = event.target.value;
    render();
  });

  elements.tableBody.addEventListener("click", (event) => {
    const row = event.target.closest("[data-id]");
    if (!row) {
      return;
    }
    state.selectedId = row.dataset.id;
    render();
  });
}

function render() {
  const filtered = applyFilters(rows);
  const sorted = sortRows(filtered, state.sortBy);

  if (!sorted.some((row) => row.id === state.selectedId)) {
    state.selectedId = sorted[0]?.id ?? null;
  }

  elements.resultMeta.textContent = `${sorted.length} of ${rows.length} data rows shown`;
  elements.tableBody.innerHTML = sorted.map(renderTableRow).join("");
  elements.emptyState.classList.toggle("hidden", sorted.length > 0);
  renderDetailPanel(sorted.find((row) => row.id === state.selectedId) ?? null);
}

function applyFilters(items) {
  return items.filter((item) => {
    const matchesQuery =
      !state.query ||
      [
        item.schoolName,
        item.city,
        item.state,
        item.rankLabel,
        item.tuition,
        item.bandLabel,
      ]
        .join(" ")
        .toLowerCase()
        .includes(state.query);

    const matchesState =
      state.selectedState === "all" || item.state === state.selectedState;

    const matchesRank =
      state.rankBand === "all" ||
      (item.rank !== null && item.rank <= Number.parseInt(state.rankBand, 10));

    return matchesQuery && matchesState && matchesRank;
  });
}

function sortRows(items, sortBy) {
  return [...items].sort((left, right) => {
    if (sortBy === "name-asc") {
      return left.schoolName.localeCompare(right.schoolName);
    }

    if (sortBy === "tuition-desc") {
      return compareNullableNumber(right.tuitionValue, left.tuitionValue) || compareNullableNumber(left.rank, right.rank);
    }

    if (sortBy === "tuition-asc") {
      return compareNullableNumber(left.tuitionValue, right.tuitionValue) || compareNullableNumber(left.rank, right.rank);
    }

    if (sortBy === "enrollment-desc") {
      return compareNullableNumber(right.enrollmentValue, left.enrollmentValue) || compareNullableNumber(left.rank, right.rank);
    }

    return compareNullableNumber(left.rank, right.rank) || left.schoolName.localeCompare(right.schoolName);
  });
}

function renderHeroStats() {
  const knownTuition = rows.filter((row) => row.tuitionValue !== null);
  const topTen = rows.filter((row) => row.rank !== null && row.rank <= 10).length;
  const averageTuition = knownTuition.length
    ? Math.round(knownTuition.reduce((sum, row) => sum + row.tuitionValue, 0) / knownTuition.length)
    : null;

  const cards = [
    {
      label: "Visible programs",
      value: String(rows.length),
      subtext: "Scraped from the ranking list",
      featured: true,
    },
    {
      label: "Top 10 schools",
      value: String(topTen),
      subtext: "Programs in the leading band",
    },
    {
      label: "States covered",
      value: String(new Set(rows.map((row) => row.state).filter(Boolean)).size),
      subtext: "Unique locations represented",
    },
    {
      label: "Average tuition",
      value: averageTuition !== null ? formatMoney(averageTuition) : "N/A",
      subtext: "Based on rows with known values",
    },
  ];

  elements.heroStats.innerHTML = cards
    .map(
      (card) => `
        <article class="metric-card${card.featured ? " featured" : ""}">
          <span class="metric-kicker">${escapeHtml(card.label)}</span>
          <strong class="metric-value">${escapeHtml(card.value)}</strong>
          <span class="metric-subtext">${escapeHtml(card.subtext)}</span>
        </article>
      `
    )
    .join("");
}

function renderStateCoverage() {
  const counts = new Map();
  rows.forEach((row) => {
    if (!row.state) {
      return;
    }
    counts.set(row.state, (counts.get(row.state) ?? 0) + 1);
  });

  const topStates = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 6);

  const max = topStates[0]?.[1] ?? 1;

  elements.stateList.innerHTML = topStates
    .map(
      ([code, count]) => `
        <div class="state-item">
          <span class="state-code">${escapeHtml(code)}</span>
          <div class="state-bar"><span style="width:${(count / max) * 100}%"></span></div>
          <span class="state-value">${count}</span>
        </div>
      `
    )
    .join("");
}

function renderTableRow(item) {
  const location = item.city && item.state ? `${item.city}, ${item.state}` : item.state || item.city || "Location unknown";
  const tuitionMain = item.tuition === "N/A" ? "Not disclosed" : item.tuition;
  const isSelected = item.id === state.selectedId;

  return `
    <tr data-id="${escapeAttribute(item.id)}" class="${isSelected ? "is-selected" : ""}">
      <td>
        <div class="school-cell">
          <span class="school-mark">${escapeHtml(item.code)}</span>
          <div class="school-text">
            <strong>${escapeHtml(item.schoolName)}</strong>
            <span>${escapeHtml(location)}</span>
          </div>
        </div>
      </td>
      <td><span class="rank-pill">${item.rank !== null ? `#${item.rank}` : "N/A"}</span></td>
      <td><span class="value-main">${escapeHtml(item.state || "N/A")}</span></td>
      <td>
        <span class="value-main">${escapeHtml(tuitionMain)}</span>
      </td>
      <td>
        <span class="value-main">${escapeHtml(item.enrollmentLabel)}</span>
      </td>
      <td><span class="band-pill ${escapeHtml(item.bandClass)}">${escapeHtml(item.bandLabel)}</span></td>
      <td><a class="open-link" href="${escapeAttribute(item.url)}" target="_blank" rel="noreferrer">Open</a></td>
    </tr>
  `;
}

function renderDetailPanel(item) {
  if (!item) {
    elements.detailCard.innerHTML = `
      <p class="section-label">Selection</p>
      <h3>No row selected</h3>
      <p class="detail-summary">Adjust the filters or choose a row from the table.</p>
    `;
    return;
  }

  const location = item.city && item.state ? `${item.city}, ${item.state}` : item.state || item.city || "Location unknown";

  elements.detailCard.innerHTML = `
    <p class="section-label">Selected item</p>
    <div class="detail-top">
      <div>
        <h3>${escapeHtml(item.schoolName)}</h3>
        <p class="detail-location">${escapeHtml(location)}</p>
      </div>
      <div class="detail-badge">${item.rank !== null ? `#${item.rank}` : "N/A"}</div>
    </div>

    <p class="detail-summary">${escapeHtml(item.summary || "No summary available for this row.")}</p>

    <div class="detail-grid">
      <div class="detail-metric">
        <span>Rank label</span>
        <strong>${escapeHtml(item.rankLabel)}</strong>
      </div>
      <div class="detail-metric">
        <span>Tuition</span>
        <strong>${escapeHtml(item.tuition)}</strong>
      </div>
      <div class="detail-metric">
        <span>Enrollment</span>
        <strong>${escapeHtml(item.enrollmentLabel)}</strong>
      </div>
      <div class="detail-metric">
        <span>Band</span>
        <strong>${escapeHtml(item.bandLabel)}</strong>
      </div>
    </div>

    <a class="detail-link" href="${escapeAttribute(item.url)}" target="_blank" rel="noreferrer">Visit source page</a>
  `;
}

function populateStateFilter() {
  const states = [...new Set(rows.map((row) => row.state).filter(Boolean))].sort();
  elements.stateFilter.insertAdjacentHTML(
    "beforeend",
    states.map((code) => `<option value="${escapeAttribute(code)}">${escapeHtml(code)}</option>`).join("")
  );
}

function normalizeRow(row, index) {
  const rank = parseNullableInteger(row.rank);
  const state = (row.state || "").trim();
  const city = (row.city || "").trim();

  return {
    id: `row-${index}`,
    code: createCode(row.school_name || "UN"),
    rank,
    rankLabel: row.rank_label || "Unranked",
    schoolName: row.school_name || "Unknown university",
    city,
    state,
    tuition: row.tuition || "N/A",
    tuitionValue: parseMoney(row.tuition),
    enrollmentLabel: row.enrollment_full_time || "N/A",
    enrollmentValue: parseNullableInteger(row.enrollment_full_time),
    summary: row.summary || "",
    url: row.url || "#",
    ...getBand(rank),
  };
}

function getBand(rank) {
  if (rank !== null && rank <= 10) {
    return { bandLabel: "Elite", bandClass: "band-elite" };
  }
  if (rank !== null && rank <= 25) {
    return { bandLabel: "Strong", bandClass: "band-strong" };
  }
  if (rank !== null && rank <= 50) {
    return { bandLabel: "Solid", bandClass: "band-solid" };
  }
  return { bandLabel: "Wide", bandClass: "band-wide" };
}

function createCode(name) {
  const parts = String(name)
    .replace(/[^A-Za-z\s-]/g, "")
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "UN";
  }

  return parts.map((part) => part[0].toUpperCase()).join("");
}

function parseNullableInteger(value) {
  if (!value || value === "N/A") {
    return null;
  }
  const normalized = String(value).replace(/[^\d]/g, "");
  return normalized ? Number.parseInt(normalized, 10) : null;
}

function parseMoney(value) {
  if (!value || value === "N/A") {
    return null;
  }
  const match = String(value).match(/\$([\d,]+)/);
  return match ? Number.parseInt(match[1].replace(/,/g, ""), 10) : null;
}

function compareNullableNumber(left, right) {
  if (left === null && right === null) {
    return 0;
  }
  if (left === null) {
    return 1;
  }
  if (right === null) {
    return -1;
  }
  return left - right;
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
