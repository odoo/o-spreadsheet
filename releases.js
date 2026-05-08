/* ═══════════════════════════════════════════════════════════ */

/* ── Apply OS dark/light preference via Bootstrap 5.3 ─────── */
(function () {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  document.documentElement.setAttribute(
    "data-bs-theme",
    mq.matches ? "dark" : "light",
  );
  mq.addEventListener("change", (e) =>
    document.documentElement.setAttribute(
      "data-bs-theme",
      e.matches ? "dark" : "light",
    ),
  );
})();

/* ── state ─────────────────────────────────────────────────── */
let allReleases = [];
let activeFilter = "all";

/* ── fetch all pages from GitHub API ──────────────────────── */
async function fetchAll() {
  let page = 1,
    out = [];
  while (true) {
    const res = await fetch(
      `https://api.github.com/repos/odoo/o-spreadsheet/releases?per_page=100&page=${page}`,
      { headers: { Accept: "application/vnd.github+json" } },
    );
    if (!res.ok) throw new Error(`GitHub API returned ${res.status}`);
    const data = await res.json();
    if (!data.length) break;
    out = out.concat(data);
    if (data.length < 100) break;
    page++;
  }
  return out;
}

/* ── helpers ───────────────────────────────────────────────── */
function majorOf(tag) {
  const m = (tag || "").match(/^v?(\d+)[.\-]/);
  return m ? parseInt(m[1], 10) : null;
}

/* Returns "MAJOR.MINOR" string used as the grouping key */
function minorKeyOf(tag) {
  const m = (tag || "").match(/^v?(\d+)\.(\d+)/);
  return m ? `${+m[1]}.${+m[2]}` : null;
}

function semverOf(tag) {
  const m = (tag || "").match(/^v?(\d+)\.(\d+)\.(\d+)/);
  return m ? [+m[1], +m[2], +m[3]] : null;
}

/* Compare two tag strings by semver, descending (newest first).
   Pre-release suffixes (-alpha.N, -beta.N, -rc.N) sort BELOW the
   equivalent stable release but are compared numerically among
   themselves so alpha.10 > alpha.9. */
function compareTags(a, b) {
  const semA = semverOf(a),
    semB = semverOf(b);
  if (!semA && !semB) return 0;
  if (!semA) return 1;
  if (!semB) return -1;
  for (let i = 0; i < 3; i++) {
    if (semB[i] !== semA[i]) return semB[i] - semA[i];
  }
  /* same major.minor.patch — compare pre-release suffixes */
  const preA = (a.match(/^v?\d+\.\d+\.\d+-(.+)$/) || [])[1];
  const preB = (b.match(/^v?\d+\.\d+\.\d+-(.+)$/) || [])[1];
  if (!preA && !preB) return 0;
  if (!preA) return -1; /* stable > pre-release */
  if (!preB) return 1;
  /* both have pre-release — split on "." and compare segment by segment */
  const segsA = preA.split(".");
  const segsB = preB.split(".");
  const len = Math.max(segsA.length, segsB.length);
  for (let i = 0; i < len; i++) {
    const sA = segsA[i] ?? "",
      sB = segsB[i] ?? "";
    const nA = Number(sA),
      nB = Number(sB);
    const cmp =
      !isNaN(nA) && !isNaN(nB)
        ? nB - nA /* numeric: 10 > 9 */
        : sB.localeCompare(sA); /* lexicographic fallback */
    if (cmp !== 0) return cmp;
  }
  return 0;
}

/* Returns [Bootstrap badge bg class, label text] */
function badgeType(release, isLatestInGroup) {
  if (release.prerelease) {
    return ["text-bg-danger", "pre-release"];
  }
  if (isLatestInGroup) {
    return ["text-bg-success", "latest"];
  }
  const sv = semverOf(release.tag_name);
  if (!sv) {
    return ["text-bg-secondary", "patch"];
  }
  if (sv[1] === 0 && sv[2] === 0) {
    return ["text-bg-primary", "major"];
  }
  if (sv[2] === 0) {
    return ["text-bg-warning", "minor"];
  }
  return ["text-bg-secondary", "patch"];
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function escHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ── group releases by minor version (MAJOR.MINOR) ──────── */
function groupByMinor(releases) {
  const map = new Map();
  for (const r of releases) {
    const key = minorKeyOf(r.tag_name) ?? "other";
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(r);
  }
  /* sort each group's releases by semver descending */
//   for (const arr of map.values())
//     arr.sort((a, b) => compareTags(a.tag_name, b.tag_name));
  return new Map(
    [...map.entries()].sort((a, b) => {
      if (a[0] === "other") return 1;
      if (b[0] === "other") return -1;
      const [aMaj, aMin] = a[0].split(".").map(Number);
      const [bMaj, bMin] = b[0].split(".").map(Number);
      return bMaj !== aMaj ? bMaj - aMaj : bMin - aMin;
    }),
  );
}

/* ── filter pipeline ───────────────────────────────────────── */
function applyFilter(releases, filter, query) {
  let out = releases;
  if (filter === "stable") out = out.filter((r) => !r.prerelease);
  if (filter === "latest") {
    const seen = new Set();
    out = out.filter((r) => {
      const k = minorKeyOf(r.tag_name) ?? "other";
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }
  if (query) {
    const q = query.toLowerCase();
    out = out.filter(
      (r) =>
        r.tag_name.toLowerCase().includes(q) ||
        (r.name || "").toLowerCase().includes(q) ||
        (r.body || "").toLowerCase().includes(q),
    );
  }
  return out;
}

/* ── render ────────────────────────────────────────────────── */
function render() {
  const query = document.getElementById("search").value.trim();
  const filtered = applyFilter(allReleases, activeFilter, query);
  const grouped = groupByMinor(filtered);
  const main = document.getElementById("main");

  if (grouped.size === 0) {
    main.innerHTML = `<p class="text-center text-secondary py-5">No releases match your search.</p>`;
    return;
  }

  const totalVersions = grouped.size;
  const totalReleases = filtered.length;
  const latestTag = filtered[0]?.tag_name ?? "—";

  /* stat cards */
  let html = `<div class="row g-3 mb-4">`;
  for (const [val, lbl] of [
    [totalVersions, `Minor version${totalVersions !== 1 ? "s" : ""}`],
    [totalReleases, `Release${totalReleases !== 1 ? "s" : ""}`],
    [latestTag, "Latest tag"],
  ]) {
    html += `
      <div class="col-auto">
        <div class="card border text-center px-4 py-2">
          <div class="stat-val font-monospace">${val}</div>
          <div class="stat-lbl text-secondary">${lbl}</div>
        </div>
      </div>`;
  }
  html += `</div>`;

  /* accordion */
  html += `<div class="accordion" id="ver-accordion">`;
  let i = 0;
  for (const [key, releases] of grouped) {
    const label = key === "other" ? "other" : `v${key}.x`;
    const collapseId = `collapse-${key.replace(".", "-")}`;
    const headId = `head-${key.replace(".", "-")}`;
    const isOpen = i === 0;

    html += `
      <div class="accordion-item">
        <h2 class="accordion-header" id="${headId}">
          <button class="accordion-button${
            isOpen ? "" : " collapsed"
          } d-flex align-items-center gap-2 py-3"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#${collapseId}"
                  aria-expanded="${isOpen}"
                  aria-controls="${collapseId}">
            <span class="font-monospace fw-semibold" style="min-width:5rem">${label}</span>
            <span class="badge text-bg-secondary fw-normal">
              ${releases.length} release${releases.length !== 1 ? "s" : ""}
            </span>
            <span class="text-secondary ms-1" style="font-size:.8rem">
              latest&nbsp;<span class="text-body">${releases[0].tag_name}</span>
            </span>
          </button>
        </h2>
        <div id="${collapseId}"
             class="accordion-collapse collapse${isOpen ? " show" : ""}"
             aria-labelledby="${headId}"
             data-bs-parent="#ver-accordion">
          <div class="accordion-body p-0">
            <table class="table table-hover mb-0" aria-label="Releases for ${label}">
              <tbody>`;

    const hasStable = releases.some((r) => !r.prerelease);
    const visibleReleases = hasStable
      ? releases.filter((r) => !r.prerelease)
      : releases;
    visibleReleases.forEach((r, idx) => {
      const [badgeCls, badgeLbl] = badgeType(r, idx === 0);
      const name = r.name || r.tag_name;
      html += `
                <tr class="release-row">
                  <td style="width:130px">
                    <code class="text-primary">${r.tag_name}</code>
                  </td>
                  <td>
                    <a href="${r.html_url}" target="_blank" rel="noopener"
                       class="tag-link text-body">${escHtml(name)}</a>
                  </td>
                  <td style="width:110px" class="text-end">
                    <span class="badge rounded-pill ${badgeCls}">${badgeLbl}</span>
                  </td>
                  <td style="width:120px" class="text-end text-secondary font-monospace">
                    ${fmtDate(r.published_at)}
                  </td>
                </tr>`;
    });

    html += `
              </tbody>
            </table>
          </div>
        </div>
      </div>`;
    i++;
  }

  html += `</div>`; /* /accordion */
  main.innerHTML = html;
}

/* ── wire up controls ──────────────────────────────────────── */
document.querySelectorAll("[data-f]").forEach((lbl) => {
  lbl.addEventListener("click", () => {
    activeFilter = lbl.dataset.f;
    render();
  });
});
document.getElementById("search").addEventListener("input", render);

/* ── init ──────────────────────────────────────────────────── */
(async () => {
  document.getElementById("repo-label").textContent = `odoo / o-spreadsheet`;
  try {
    allReleases = await fetchAll();
    render();
  } catch (err) {
    document.getElementById("main").innerHTML = `
      <div class="alert alert-danger" role="alert">
        <strong>Could not load releases.</strong><br>
        <small>${escHtml(err.message)}</small><br>
        <small class="text-secondary d-block mt-1">
          Check that OWNER and REPO are correct and the repository is public,
          or add an <code>Authorization</code> header with a personal access token.
        </small>
      </div>`;
  }
})();
