const SOURCE_URL =
  "https://www.usnews.com/best-graduate-schools/top-computer-science-schools/computer-science-rankings";
const METHODOLOGY_URL =
  "https://www.usnews.com/education/best-graduate-schools/articles/science-schools-methodology";

const rows = Array.isArray(window.USNEWS_CS_RANKINGS)
  ? window.USNEWS_CS_RANKINGS.map((row, index) => normalizeRow(row, index))
  : [];

const appState = {
  activeView: getInitialView(),
  query: "",
  selectedState: "all",
  rankBand: "all",
  sortBy: "rank-asc",
  pageSize: 20,
  currentPage: 1,
  selectedId: rows[0]?.id ?? null,
};

const elements = {
  navButtons: [...document.querySelectorAll("[data-view]")],
  viewPanels: [...document.querySelectorAll(".view-panel")],
  searchInput: document.querySelector("#search-input"),
  stateFilter: document.querySelector("#state-filter"),
  rankFilter: document.querySelector("#rank-filter"),
  sortSelect: document.querySelector("#sort-select"),
  pageSizeSelect: document.querySelector("#page-size-select"),
  prevPageButton: document.querySelector("#prev-page-button"),
  nextPageButton: document.querySelector("#next-page-button"),
  pageNumbers: document.querySelector("#page-numbers"),
  pageIndicator: document.querySelector("#page-indicator"),
  resultMeta: document.querySelector("#result-meta"),
  heroStats: document.querySelector("#hero-stats"),
  featuredGrid: document.querySelector("#featured-grid"),
  overviewSummary: document.querySelector("#overview-summary"),
  tableBody: document.querySelector("#table-body"),
  detailCard: document.querySelector("#detail-card"),
  emptyState: document.querySelector("#empty-state"),
  stateGrid: document.querySelector("#state-grid"),
  stateList: document.querySelector("#state-list"),
  highestTuitionList: document.querySelector("#highest-tuition-list"),
  lowestTuitionList: document.querySelector("#lowest-tuition-list"),
  tuitionSummary: document.querySelector("#tuition-summary"),
  methodologySummary: document.querySelector("#methodology-summary"),
};

initialize();

function initialize() {
  populateStateFilter();
  bindEvents();
  renderHeroStats();
  setActiveView(appState.activeView, false);
  renderAll();
}

function bindEvents() {
  elements.navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setActiveView(button.dataset.view);
    });
  });

  window.addEventListener("hashchange", () => {
    const nextView = getInitialView();
    if (nextView !== appState.activeView) {
      setActiveView(nextView, false);
      renderViewState();
    }
  });

  elements.searchInput.addEventListener("input", (event) => {
    appState.query = event.target.value.trim().toLowerCase();
    appState.currentPage = 1;
    renderAll();
  });

  elements.stateFilter.addEventListener("change", (event) => {
    appState.selectedState = event.target.value;
    appState.currentPage = 1;
    renderAll();
  });

  elements.rankFilter.addEventListener("change", (event) => {
    appState.rankBand = event.target.value;
    appState.currentPage = 1;
    renderAll();
  });

  elements.sortSelect.addEventListener("change", (event) => {
    appState.sortBy = event.target.value;
    appState.currentPage = 1;
    renderAll();
  });

  elements.pageSizeSelect.addEventListener("change", (event) => {
    appState.pageSize = Number.parseInt(event.target.value, 10);
    appState.currentPage = 1;
    renderAll();
  });

  elements.tableBody.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      return;
    }

    const row = event.target.closest("[data-id]");
    if (!row) {
      return;
    }

    appState.selectedId = row.dataset.id;
    renderUniversityTable(getSearchFilteredRows());
  });

  elements.prevPageButton.addEventListener("click", () => {
    if (appState.currentPage > 1) {
      appState.currentPage -= 1;
      renderUniversityTable(getSearchFilteredRows());
    }
  });

  elements.nextPageButton.addEventListener("click", () => {
    const filtered = sortRows(applyUniversityFilters(getSearchFilteredRows()), appState.sortBy);
    const totalPages = Math.max(1, Math.ceil(filtered.length / appState.pageSize));

    if (appState.currentPage < totalPages) {
      appState.currentPage += 1;
      renderUniversityTable(getSearchFilteredRows());
    }
  });

  elements.pageNumbers.addEventListener("click", (event) => {
    const button = event.target.closest("[data-page]");
    if (!button) {
      return;
    }

    appState.currentPage = Number.parseInt(button.dataset.page, 10);
    renderUniversityTable(getSearchFilteredRows());
  });

  elements.stateGrid.addEventListener("click", handleJumpToState);
  elements.stateList.addEventListener("click", handleJumpToState);
}

function handleJumpToState(event) {
  const button = event.target.closest("[data-jump-state]");
  if (!button) {
    return;
  }

  const nextState = button.dataset.jumpState;
  if (!nextState) {
    return;
  }

  appState.selectedState = nextState;
  appState.currentPage = 1;
  elements.stateFilter.value = nextState;
  setActiveView("universities");
  renderAll();
}

function renderAll() {
  const searchFiltered = getSearchFilteredRows();

  renderViewState();
  renderOverview(searchFiltered);
  renderLocations(searchFiltered);
  renderTuitions(searchFiltered);
  renderMethodology(searchFiltered);
  renderUniversityTable(searchFiltered);
}

function renderViewState() {
  elements.navButtons.forEach((button) => {
    button.classList.toggle("nav-pill-active", button.dataset.view === appState.activeView);
  });

  elements.viewPanels.forEach((panel) => {
    panel.classList.toggle("view-panel-active", panel.id === `view-${appState.activeView}`);
  });
}

function setActiveView(view, updateHash = true) {
  const nextView = isKnownView(view) ? view : "overview";
  appState.activeView = nextView;
  renderViewState();

  if (updateHash) {
    const nextHash = `#${nextView}`;
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    }
  }
}

function renderHeroStats() {
  const knownTuition = rows.filter((row) => row.tuitionValue !== null);
  const topTen = rows.filter((row) => row.rank !== null && row.rank <= 10).length;
  const statesCovered = new Set(rows.map((row) => row.state).filter(Boolean)).size;
  const averageTuition = knownTuition.length
    ? Math.round(knownTuition.reduce((sum, row) => sum + row.tuitionValue, 0) / knownTuition.length)
    : null;

  const cards = [
    {
      label: "Ranked universities",
      value: String(rows.length),
      subtext: "Rows captured from the U.S. News ranking page",
      featured: true,
    },
    {
      label: "Top 10 entries",
      value: String(topTen),
      subtext: "Schools occupying the highest rank band",
    },
    {
      label: "States covered",
      value: String(statesCovered),
      subtext: "Distinct state codes in the extracted list",
    },
    {
      label: "Average known tuition",
      value: averageTuition !== null ? formatMoney(averageTuition) : "N/A",
      subtext: "Average of rows with a disclosed first tuition figure",
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

function renderOverview(items) {
  const featured = sortRows(items, "rank-asc").slice(0, 6);
  const officialCount = rows.filter((row) => row.officialUrl).length;
  const imageCount = rows.filter((row) => row.imageUrl).length;
  const knownTuitionCount = rows.filter((row) => row.tuitionValue !== null).length;
  const statesCovered = new Set(rows.map((row) => row.state).filter(Boolean)).size;

  elements.featuredGrid.innerHTML =
    featured.length > 0
      ? featured.map(renderFeaturedCard).join("")
      : `
        <article class="info-item">
          <strong>No universities match the current search.</strong>
          <span>Clear the search field to restore the featured campus cards.</span>
        </article>
      `;

  const summaryItems = [
    {
      title: "Coverage",
      body: `${rows.length} ranked computer science graduate school rows are available in this local dashboard, spanning ${statesCovered} state-level locations.`,
    },
    {
      title: "University links",
      body: `${officialCount} rows include a matched official university website button in addition to the U.S. News profile link.`,
    },
    {
      title: "Campus imagery",
      body: `${imageCount} rows include a campus image captured from the ranking cards or a source placeholder when U.S. News did not expose a specific photo.`,
    },
    {
      title: "Tuition availability",
      body: `${knownTuitionCount} rows disclose at least one tuition amount. Missing values stay visible as N/A instead of being imputed.`,
    },
    {
      title: appState.query ? "Current search" : "Source note",
      body: appState.query
        ? `The current search narrows featured content to ${items.length} matching schools across all views.`
        : "This interface reorganizes public ranking data from U.S. News into overview, location, tuition, and methodology views.",
    },
  ];

  elements.overviewSummary.innerHTML = summaryItems
    .map(
      (item) => `
        <article class="info-item">
          <strong>${escapeHtml(item.title)}</strong>
          <span>${escapeHtml(item.body)}</span>
        </article>
      `
    )
    .join("");
}

function renderUniversityTable(searchFiltered) {
  const filtered = applyUniversityFilters(searchFiltered);
  const sorted = sortRows(filtered, appState.sortBy);
  const totalPages = Math.max(1, Math.ceil(sorted.length / appState.pageSize));

  if (appState.currentPage > totalPages) {
    appState.currentPage = totalPages;
  }

  const startIndex = (appState.currentPage - 1) * appState.pageSize;
  const paged = sorted.slice(startIndex, startIndex + appState.pageSize);

  if (!sorted.some((row) => row.id === appState.selectedId)) {
    appState.selectedId = sorted[0]?.id ?? null;
  }

  const selectedItem =
    paged.find((row) => row.id === appState.selectedId) ??
    sorted.find((row) => row.id === appState.selectedId) ??
    null;

  const startLabel = sorted.length === 0 ? 0 : startIndex + 1;
  const endLabel = sorted.length === 0 ? 0 : Math.min(startIndex + appState.pageSize, sorted.length);
  const searchSuffix = appState.query ? ` for "${appState.query}"` : "";

  elements.resultMeta.textContent = `${startLabel}-${endLabel} of ${sorted.length} universities shown${searchSuffix}`;
  elements.tableBody.innerHTML = paged.map(renderTableRow).join("");
  elements.emptyState.classList.toggle("hidden", sorted.length > 0);
  elements.pageIndicator.textContent = `Page ${sorted.length === 0 ? 0 : appState.currentPage} of ${totalPages}`;
  elements.prevPageButton.disabled = appState.currentPage <= 1;
  elements.nextPageButton.disabled = appState.currentPage >= totalPages;
  renderPageNumbers(totalPages);
  renderDetailPanel(selectedItem);
}

function renderLocations(items) {
  const stateStats = buildStateStats(items);

  elements.stateGrid.innerHTML =
    stateStats.length > 0
      ? stateStats.slice(0, 10).map(renderStateCard).join("")
      : `
        <article class="info-item">
          <strong>No locations match the current search.</strong>
          <span>Try a broader query to restore the location summaries.</span>
        </article>
      `;

  elements.stateList.innerHTML =
    stateStats.length > 0
      ? renderStateList(stateStats)
      : `
        <article class="info-item">
          <strong>No state summary available.</strong>
          <span>The search currently excludes every extracted school row.</span>
        </article>
      `;
}

function renderTuitions(items) {
  const known = items.filter((row) => row.tuitionValue !== null);
  const highest = [...known]
    .sort((left, right) => compareNullableNumber(right.tuitionValue, left.tuitionValue) || compareNullableNumber(left.rank, right.rank))
    .slice(0, 8);
  const lowest = [...known]
    .sort((left, right) => compareNullableNumber(left.tuitionValue, right.tuitionValue) || compareNullableNumber(left.rank, right.rank))
    .slice(0, 8);

  elements.highestTuitionList.innerHTML =
    highest.length > 0
      ? highest.map((row) => renderTuitionItem(row, "Highest")).join("")
      : renderUnavailableListItem("No tuition rows match the current search.");

  elements.lowestTuitionList.innerHTML =
    lowest.length > 0
      ? lowest.map((row) => renderTuitionItem(row, "Lowest")).join("")
      : renderUnavailableListItem("No tuition rows match the current search.");

  const missingCount = items.length - known.length;
  const average = known.length
    ? Math.round(known.reduce((sum, row) => sum + row.tuitionValue, 0) / known.length)
    : null;

  const summaryItems = [
    {
      title: "Known tuition rows",
      body: `${known.length} rows in the current view expose at least one tuition amount.`,
    },
    {
      title: "Missing tuition rows",
      body: `${missingCount} rows remain undisclosed and are preserved as N/A.`,
    },
    {
      title: "Average shown amount",
      body: average !== null ? `${formatMoney(average)} based on the first monetary figure shown in each tuition field.` : "No average is available for the current search.",
    },
    {
      title: "Interpretation",
      body: "Tuition strings can mix per-year and per-credit values. Rankings on this page compare the first displayed amount, so treat them as quick navigation rather than a perfect apples-to-apples cost comparison.",
    },
  ];

  elements.tuitionSummary.innerHTML = summaryItems
    .map(
      (item) => `
        <article class="info-item">
          <strong>${escapeHtml(item.title)}</strong>
          <span>${escapeHtml(item.body)}</span>
        </article>
      `
    )
    .join("");
}

function renderMethodology(items) {
  const officialCount = rows.filter((row) => row.officialUrl).length;
  const imageCount = rows.filter((row) => row.imageUrl).length;
  const withSummaries = rows.filter((row) => row.summary).length;

  const summaryItems = [
    {
      title: "Primary ranking source",
      body: "Rank, location, tuition, enrollment, short summary, and profile links are displayed from the extracted U.S. News computer science graduate rankings page.",
    },
    {
      title: "Official university buttons",
      body: `${officialCount} rows have a matched official university homepage so users can move from the ranking page to the institution site directly.`,
    },
    {
      title: "Images and summaries",
      body: `${imageCount} rows expose an image URL and ${withSummaries} rows include a summary snippet. Missing media or text is left blank rather than invented.`,
    },
    {
      title: "Local transformation",
      body: "This dashboard reorganizes the source data into overview, locations, tuition, and list views. It is a presentation layer for easier browsing, not an official ranking publication.",
    },
    {
      title: appState.query ? "Current search context" : "Current dataset context",
      body: appState.query
        ? `The active search currently leaves ${items.length} rows visible across the dashboard.`
        : `The current local dataset contains ${rows.length} extracted ranking rows as of 2026-06-11.`,
    },
    {
      title: "Reference links",
      body: `For the source page and its methodology reference, use the links on this panel or open ${SOURCE_URL} and ${METHODOLOGY_URL}.`,
    },
  ];

  elements.methodologySummary.innerHTML = summaryItems
    .map(
      (item) => `
        <article class="info-item">
          <strong>${escapeHtml(item.title)}</strong>
          <span>${escapeHtml(item.body)}</span>
        </article>
      `
    )
    .join("");
}

function renderPageNumbers(totalPages) {
  const pages = buildPagination(totalPages, appState.currentPage);
  elements.pageNumbers.innerHTML = pages
    .map((item) => {
      if (item === "...") {
        return `<span class="page-ellipsis">...</span>`;
      }

      return `
        <button
          class="page-number${item === appState.currentPage ? " is-active" : ""}"
          type="button"
          data-page="${item}"
        >
          ${item}
        </button>
      `;
    })
    .join("");
}

function renderFeaturedCard(item) {
  return `
    <article class="featured-card">
      ${item.imageUrl ? `<img class="featured-image" src="${escapeAttribute(item.imageUrl)}" alt="${escapeAttribute(item.schoolName)} campus photo" loading="lazy" />` : ""}
      <div class="featured-body">
        <span class="featured-rank">${escapeHtml(item.rankLabel)}</span>
        <h3>${escapeHtml(item.schoolName)}</h3>
        <p class="featured-meta">${escapeHtml(item.locationLabel)}</p>
        <p class="featured-summary">${escapeHtml(item.summary || "Profile summary is not exposed in the extracted source row.")}</p>
        <div class="button-row">
          ${renderLinkButton(item.officialUrl, "Official site", "mini-button mini-button-primary")}
          ${renderLinkButton(item.url, "U.S. News profile", "mini-button")}
        </div>
      </div>
    </article>
  `;
}

function renderTableRow(item) {
  const tuitionMain = item.tuition === "N/A" ? "Not disclosed" : item.tuition;
  const isSelected = item.id === appState.selectedId;

  return `
    <tr data-id="${escapeAttribute(item.id)}" class="${isSelected ? "is-selected" : ""}">
      <td data-label="University">
        <div class="school-cell">
          <span class="school-mark">${escapeHtml(item.code)}</span>
          <div class="school-text">
            <strong>${escapeHtml(item.schoolName)}</strong>
            <span>${escapeHtml(item.rankLabel)}</span>
          </div>
        </div>
      </td>
      <td data-label="Rank"><span class="rank-pill">${item.rank !== null ? `#${item.rank}` : "N/A"}</span></td>
      <td data-label="Location"><span class="value-main">${escapeHtml(item.locationLabel)}</span></td>
      <td data-label="Tuition"><span class="value-main">${escapeHtml(tuitionMain)}</span></td>
      <td data-label="Enrollment"><span class="value-main">${escapeHtml(item.enrollmentLabel)}</span></td>
      <td data-label="Links">
        <div class="link-pair">
          ${renderLinkButton(item.officialUrl, "Official", "open-link")}
          ${renderLinkButton(item.url, "Profile", "ghost-link")}
        </div>
      </td>
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

  elements.detailCard.innerHTML = `
    <p class="section-label">Selected university</p>
    <div class="detail-top">
      <div>
        <h3>${escapeHtml(item.schoolName)}</h3>
        <p class="detail-location">${escapeHtml(item.locationLabel)}</p>
      </div>
      <div class="detail-badge">${item.rank !== null ? `#${item.rank}` : "N/A"}</div>
    </div>

    ${item.imageUrl ? `<img class="detail-photo" src="${escapeAttribute(item.imageUrl)}" alt="${escapeAttribute(item.schoolName)} campus photo" loading="lazy" />` : ""}

    <p class="detail-summary">${escapeHtml(item.summary || "No summary snippet was exposed for this school in the extracted source row.")}</p>

    <div class="detail-grid">
      <div class="detail-metric">
        <span>Ranking note</span>
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
        <span>Location</span>
        <strong>${escapeHtml(item.locationLabel)}</strong>
      </div>
    </div>

    <div class="detail-actions">
      ${renderLinkButton(item.officialUrl, "Official university site", "detail-link")}
      ${renderLinkButton(item.url, "Open U.S. News profile", "detail-link")}
    </div>
  `;
}

function renderStateCard(stat) {
  const body = `${stat.count} ranked schools are listed under ${stat.stateLabel}. ${
    stat.bestSchool ? `Best shown rank: ${stat.bestSchool.rankLabel} for ${stat.bestSchool.schoolName}.` : ""
  }`;

  return `
    <article class="state-card">
      <span class="state-stat">${escapeHtml(stat.count)} schools</span>
      <div class="button-row">
        <span class="state-code">${escapeHtml(stat.stateLabel)}</span>
      </div>
      <h3>${escapeHtml(stat.stateLabel)}</h3>
      <p>${escapeHtml(body)}</p>
      ${
        stat.bestSchool
          ? `
            <div class="button-row">
              <button class="mini-button" type="button" data-jump-state="${escapeAttribute(stat.stateKey)}">Browse state</button>
              ${renderLinkButton(stat.bestSchool.officialUrl, "Best school's site", "mini-button mini-button-primary")}
            </div>
          `
          : ""
      }
    </article>
  `;
}

function renderStateList(stats) {
  const max = stats[0]?.count ?? 1;

  return stats
    .slice(0, 8)
    .map(
      (stat) => `
        <div class="state-item">
          <span class="state-code">${escapeHtml(stat.stateLabel)}</span>
          <div class="state-bar"><span style="width:${(stat.count / max) * 100}%"></span></div>
          <button class="mini-button" type="button" data-jump-state="${escapeAttribute(stat.stateKey)}">${stat.count}</button>
        </div>
      `
    )
    .join("");
}

function renderTuitionItem(item, directionLabel) {
  return `
    <article class="list-item">
      <div class="list-item-title">
        <div>
          <strong>${escapeHtml(item.schoolName)}</strong>
          <div class="list-item-meta">${escapeHtml(item.locationLabel)}</div>
        </div>
        <span class="rank-pill">${directionLabel}</span>
      </div>
      <div class="list-item-meta">${escapeHtml(item.tuition)}</div>
      <div class="list-item-meta">${escapeHtml(item.rankLabel)}</div>
      <div class="list-item-actions">
        ${renderLinkButton(item.officialUrl, "Official site", "mini-button mini-button-primary")}
        ${renderLinkButton(item.url, "U.S. News profile", "mini-button")}
      </div>
    </article>
  `;
}

function renderUnavailableListItem(message) {
  return `
    <article class="info-item">
      <strong>No rows available</strong>
      <span>${escapeHtml(message)}</span>
    </article>
  `;
}

function renderLinkButton(href, label, className) {
  if (!href) {
    return "";
  }

  return `<a class="${escapeAttribute(className)}" href="${escapeAttribute(href)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`;
}

function populateStateFilter() {
  const states = [...new Set(rows.map((row) => row.state).filter(Boolean))].sort((left, right) => left.localeCompare(right));
  elements.stateFilter.insertAdjacentHTML(
    "beforeend",
    states.map((code) => `<option value="${escapeAttribute(code)}">${escapeHtml(code)}</option>`).join("")
  );
}

function getSearchFilteredRows() {
  return rows.filter((item) => {
    if (!appState.query) {
      return true;
    }

    return [
      item.schoolName,
      item.city,
      item.state,
      item.locationLabel,
      item.rankLabel,
      item.summary,
      item.tuition,
    ]
      .join(" ")
      .toLowerCase()
      .includes(appState.query);
  });
}

function applyUniversityFilters(items) {
  return items.filter((item) => {
    const matchesState = appState.selectedState === "all" || item.state === appState.selectedState;
    const matchesRank =
      appState.rankBand === "all" ||
      (item.rank !== null && item.rank <= Number.parseInt(appState.rankBand, 10));

    return matchesState && matchesRank;
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

function buildStateStats(items) {
  const statsMap = new Map();

  items.forEach((row) => {
    const stateKey = row.state || "Other";
    const stateLabel = row.state || "Other";
    const existing = statsMap.get(stateKey) || {
      stateKey,
      stateLabel,
      count: 0,
      schools: [],
    };

    existing.count += 1;
    existing.schools.push(row);
    statsMap.set(stateKey, existing);
  });

  return [...statsMap.values()]
    .map((entry) => ({
      ...entry,
      bestSchool: [...entry.schools].sort(
        (left, right) => compareNullableNumber(left.rank, right.rank) || left.schoolName.localeCompare(right.schoolName)
      )[0] ?? null,
    }))
    .sort((left, right) => right.count - left.count || left.stateLabel.localeCompare(right.stateLabel));
}

function normalizeRow(row, index) {
  const rank = parseNullableInteger(row.rank);
  const schoolName = (row.school_name || "Unknown university").trim();
  const stateCode = (row.state || "").trim();
  const city = (row.city || "").trim();
  const normalizedCity = stateCode && city.endsWith(`, ${stateCode}`) ? city.slice(0, -`, ${stateCode}`.length) : city;
  const locationLabel = buildLocationLabel(normalizedCity, stateCode);

  return {
    id: `row-${index}`,
    code: createCode(schoolName),
    rank,
    rankLabel: row.rank_label || "Unranked",
    schoolName,
    city: normalizedCity,
    state: stateCode,
    locationLabel,
    tuition: row.tuition || "N/A",
    tuitionValue: parseMoney(row.tuition),
    enrollmentLabel: row.enrollment_full_time || "N/A",
    enrollmentValue: parseNullableInteger(row.enrollment_full_time),
    summary: (row.summary || "").trim(),
    url: normalizeUrl(row.url),
    officialUrl: normalizeUrl(row.official_url),
    imageUrl: resolveImageUrl(row.image_url),
  };
}

function buildPagination(totalPages, currentPage) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, 2, totalPages - 1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  const filtered = [...pages].filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);
  const result = [];

  for (let index = 0; index < filtered.length; index += 1) {
    const page = filtered[index];
    const previous = filtered[index - 1];

    if (index > 0 && page - previous > 1) {
      result.push("...");
    }

    result.push(page);
  }

  return result;
}

function buildLocationLabel(city, state) {
  if (city && state) {
    return `${city}, ${state}`;
  }

  if (state) {
    return state;
  }

  if (city) {
    return city;
  }

  return "Location unknown";
}

function getInitialView() {
  const hash = window.location.hash.replace(/^#/, "").trim().toLowerCase();
  return isKnownView(hash) ? hash : "overview";
}

function isKnownView(value) {
  return ["overview", "universities", "locations", "tuitions", "methodology"].includes(value);
}

function normalizeUrl(value) {
  if (!value) {
    return "";
  }

  const trimmed = String(value).trim();
  if (!trimmed || trimmed === "#") {
    return "";
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  if (trimmed.startsWith("/")) {
    return `https://www.usnews.com${trimmed}`;
  }

  return trimmed;
}

function resolveImageUrl(value) {
  const normalized = normalizeUrl(value);
  return normalized || "";
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
