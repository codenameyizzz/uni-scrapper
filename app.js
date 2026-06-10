const RAW_ROWS = Array.isArray(window.USNEWS_CS_RANKINGS) ? window.USNEWS_CS_RANKINGS : [];

const state = {
  query: "",
  selectedState: "all",
  rankBand: "all",
  sortBy: "rank-asc",
};

const elements = {
  topStrip: document.querySelector("#top-strip"),
  statsGrid: document.querySelector("#stats-grid"),
  cards: document.querySelector("#cards"),
  emptyState: document.querySelector("#empty-state"),
  resultMeta: document.querySelector("#result-meta"),
  searchInput: document.querySelector("#search-input"),
  stateFilter: document.querySelector("#state-filter"),
  rankFilter: document.querySelector("#rank-filter"),
  sortSelect: document.querySelector("#sort-select"),
};

const rows = RAW_ROWS.map((row) => ({
  rank: Number.parseInt(row.rank, 10) || null,
  rankLabel: row.rank_label || "Unranked",
  schoolName: row.school_name || "Unknown school",
  city: row.city || "",
  state: row.state || "",
  tuition: row.tuition || "N/A",
  enrollment: parseInteger(row.enrollment_full_time),
  enrollmentLabel: row.enrollment_full_time || "N/A",
  summary: row.summary || "Details not available in the scraped result.",
  url: row.url || "#",
  tuitionValue: parseMoney(row.tuition),
}));

initialize();

function initialize() {
  populateStateFilter(rows);
  renderTopStrip(rows);
  renderStats(rows);
  bindEvents();
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
}

function render() {
  const filtered = applyFilters(rows);
  const sorted = sortRows(filtered, state.sortBy);

  elements.resultMeta.textContent = `${sorted.length} of ${rows.length} schools shown`;
  elements.cards.innerHTML = sorted.map(renderCard).join("");
  elements.emptyState.classList.toggle("hidden", sorted.length !== 0);
}

function applyFilters(items) {
  return items.filter((item) => {
    const matchesQuery =
      !state.query ||
      [item.schoolName, item.city, item.state, item.tuition, item.rankLabel]
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

    if (sortBy === "enrollment-desc") {
      return compareNullableNumber(right.enrollment, left.enrollment) || left.schoolName.localeCompare(right.schoolName);
    }

    if (sortBy === "tuition-asc") {
      return compareNullableNumber(left.tuitionValue, right.tuitionValue) || compareNullableNumber(left.rank, right.rank);
    }

    if (sortBy === "tuition-desc") {
      return compareNullableNumber(right.tuitionValue, left.tuitionValue) || compareNullableNumber(left.rank, right.rank);
    }

    return compareNullableNumber(left.rank, right.rank) || left.schoolName.localeCompare(right.schoolName);
  });
}

function renderTopStrip(items) {
  const topSchools = [...items]
    .filter((item) => item.rank !== null)
    .sort((a, b) => a.rank - b.rank || a.schoolName.localeCompare(b.schoolName))
    .slice(0, 5);

  elements.topStrip.innerHTML = topSchools
    .map(
      (item) => `
        <span class="top-chip">
          <strong>#${item.rank}</strong>
          <span>${escapeHtml(item.schoolName)}</span>
        </span>
      `
    )
    .join("");
}

function renderStats(items) {
  const ranked = items.filter((item) => item.rank !== null);
  const knownTuition = items.filter((item) => item.tuitionValue !== null);
  const uniqueStates = new Set(items.map((item) => item.state).filter(Boolean));
  const averageTuition = knownTuition.length
    ? Math.round(knownTuition.reduce((sum, item) => sum + item.tuitionValue, 0) / knownTuition.length)
    : null;

  const cards = [
    { label: "Programs", value: items.length },
    { label: "States represented", value: uniqueStates.size },
    { label: "Best visible rank", value: ranked.length ? `#${ranked[0].rank}` : "N/A" },
    { label: "Avg. known tuition", value: averageTuition !== null ? formatMoney(averageTuition) : "N/A" },
  ];

  elements.statsGrid.innerHTML = cards
    .map(
      (card) => `
        <article class="stat-card">
          <span class="stat-label">${escapeHtml(card.label)}</span>
          <span class="stat-value">${escapeHtml(String(card.value))}</span>
        </article>
      `
    )
    .join("");
}

function populateStateFilter(items) {
  const states = [...new Set(items.map((item) => item.state).filter(Boolean))].sort();
  const options = states
    .map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)
    .join("");

  elements.stateFilter.insertAdjacentHTML("beforeend", options);
}

function renderCard(item) {
  const location = [item.city, item.state].filter(Boolean).join(", ") || "Location not available";
  const summary = item.summary || "Details not available in the scraped result.";

  return `
    <article class="card">
      <div class="card-top">
        <div>
          <h3>${escapeHtml(item.schoolName)}</h3>
          <p class="rank-label">${escapeHtml(item.rankLabel)}</p>
        </div>
        <div class="rank-badge">${item.rank !== null ? `#${item.rank}` : "N/A"}</div>
      </div>

      <p class="location">${escapeHtml(location)}</p>

      <div class="metric-row">
        <div class="metric">
          <span class="metric-label">Tuition</span>
          <span class="metric-value">${escapeHtml(item.tuition || "N/A")}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Enrollment</span>
          <span class="metric-value">${escapeHtml(item.enrollmentLabel || "N/A")}</span>
        </div>
      </div>

      <p class="summary">${escapeHtml(summary)}</p>

      <a class="card-link" href="${escapeAttribute(item.url)}" target="_blank" rel="noreferrer">
        Open source page
      </a>
    </article>
  `;
}

function parseInteger(value) {
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
