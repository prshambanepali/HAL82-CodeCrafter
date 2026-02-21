// ../js/investor-page.js
// ✅ NO BACKEND FEED (localStorage) — keeps your UI/render logic the same
// FIXED:
// ✅ Investor cards now use ut_pitch_investments[id].raised (same as campaign page)
// ✅ Funding goal parsing uses same parseFundingGoal() as campaign page
// Everything else kept as you wrote.

import { getToken, clearSession } from "./auth.js";
import { toast } from "./ui.js";

/* =====================================================
   SESSION GUARD
===================================================== */
// if (!getToken()) {
//   window.location.href = "../index.html";
// }

const statusEl = document.getElementById("status");
const feedEl = document.getElementById("feed");

/* =====================================================
   LOGOUT
===================================================== */
document.getElementById("logout")?.addEventListener("click", () => {
  clearSession();
  toast("Logged out", "success");
  setTimeout(() => (window.location.href = "../index.html"), 400);
});

/* =====================================================
   UTIL
===================================================== */
function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function money(n) {
  const x = Number(n || 0);
  if (!Number.isFinite(x)) return "Rs 0";
  return "Rs " + x.toLocaleString();
}

function clampPct(p) {
  const x = Number(p);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(100, x));
}

// Converts "100K", "250k", "$100,000" → 100000 (kept)
function toNumber(val) {
  if (val == null) return 0;
  if (typeof val === "number") return val;

  const s = String(val)
    .trim()
    .toLowerCase()
    .replaceAll(",", "")
    .replaceAll("$", "");

  if (!s) return 0;

  if (s.endsWith("k")) {
    const num = Number(s.slice(0, -1));
    return Number.isFinite(num) ? num * 1000 : 0;
  }
  if (s.endsWith("m")) {
    const num = Number(s.slice(0, -1));
    return Number.isFinite(num) ? num * 1000000 : 0;
  }
  const num = Number(s);
  return Number.isFinite(num) ? num : 0;
}

/* =====================================================
   ✅ SAME FUNDING GOAL PARSER AS CAMPAIGN PAGE
   Converts "$750,000 Seed Round" / "500K" / "1.2M" → number
===================================================== */
function parseFundingGoal(fundingStr) {
  const s = String(fundingStr || "")
    .toUpperCase()
    .replaceAll(",", "")
    .replaceAll("$", "")
    .trim();

  if (!s) return 100000;

  const km = s.match(/(\d+(\.\d+)?)(\s*)(K|M)/);
  if (km) {
    const base = Number(km[1]);
    const mult = km[4] === "M" ? 1_000_000 : 1_000;
    return Math.round(base * mult);
  }

  const n = s.match(/(\d{3,})/);
  if (n) return Number(n[1]);

  // fallback
  const num = Number(s);
  return Number.isFinite(num) ? num : 100000;
}

/* =====================================================
   ✅ INVESTMENT STORAGE (SAME AS CAMPAIGN PAGE)
===================================================== */
const LS_INV = "ut_pitch_investments"; // { [id]: { raised, investorsBy } }

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function getCampaignInv(id) {
  const all = readJSON(LS_INV, {});
  const row = all?.[id];
  if (!row) return { raised: 0, investorsBy: {} };

  return {
    raised: Number(row.raised || 0),
    investorsBy:
      row.investorsBy && typeof row.investorsBy === "object"
        ? row.investorsBy
        : {},
  };
}

/* =====================================================
   PROFILE LOAD (LOCALSTORAGE)
===================================================== */
function loadProfileLocal() {
  const raw = localStorage.getItem("ut_session");
  const me = raw ? JSON.parse(raw) : null;

  if (!me) {
    window.location.href = "../index.html";
    return null;
  }

  const nameEl = document.getElementById("name");
  const emailEl = document.getElementById("email");
  const roleEl = document.getElementById("role");
  const img = document.getElementById("avatar");

  if (nameEl) nameEl.textContent = me.full_name || "User";
  if (emailEl) emailEl.textContent = me.email || "—";
  if (roleEl) roleEl.textContent = `Role: ${me.role || "INVESTOR"}`;

  if (img) {
    if (me.avatar_url) {
      img.src = me.avatar_url;
      img.style.display = "block";
    } else {
      img.style.display = "none";
    }
  }

  // Hard guard: investor only
  if (String(me.role || "").toUpperCase() !== "INVESTOR") {
    window.location.href = "./unauthorized.html";
    return null;
  }

  return me;
}

/* =====================================================
   PITCH JSON PARSER (UNCHANGED)
===================================================== */
function parsePitchBody(body) {
  const raw = String(body || "");

  const markerMatch = raw.match(
    /---PITCH_JSON---\s*([\s\S]*?)\s*---END_PITCH_JSON---/
  );
  if (markerMatch && markerMatch[1]) {
    try {
      return JSON.parse(markerMatch[1]);
    } catch {
      return null;
    }
  }

  try {
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? obj : null;
  } catch {
    return null;
  }
}

/* =====================================================
   LOAD POSTS FROM LOCALSTORAGE (UNCHANGED)
===================================================== */
function makeIdFromPitch(p, idx) {
  const t = p?.createdAt || "";
  const name = p?.startup?.name || "startup";
  const safeName = String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
  const safeTime = String(t).replace(/[^0-9a-z]+/gi, "");
  return `ls-${safeName}-${safeTime || idx}`;
}

function loadPostsFromLocalStorage() {
  const raw = localStorage.getItem("ut_pitches");
  const pitches = raw ? JSON.parse(raw) : [];

  const posts = (Array.isArray(pitches) ? pitches : []).map((p, idx) => {
    const id = makeIdFromPitch(p, idx);

    // object that parsePitchBody understands
    const payload = {
      market: p?.startup?.market || "",
      funding: p?.startup?.funding || "",
      lastRevenue: p?.metrics_input?.lastRevenue ?? 0,
      description: p?.startup?.description || "",
    };

    const title = `${p?.startup?.name || "Startup"} • ${
      p?.startup?.market || "Industry"
    } • Funding: ${p?.startup?.funding || "100K"}`;

    return {
      id,
      title,
      body: JSON.stringify(payload),
      full_name: p?.startup?.name || "Startup",
      email: "startup@local",
      interest_count: 0,
    };
  });

  return { posts };
}

/* =====================================================
   RENDER FEED (YOUR CODE — kept, ONLY FIXED raised/goal/pct)
===================================================== */
function renderFeed(posts) {
  if (!feedEl) return;

  if (!posts || posts.length === 0) {
    feedEl.innerHTML = `<p class="inv-empty">No startup ideas yet.</p>`;
    return;
  }

  feedEl.innerHTML = posts
    .map((p) => {
      const parsed = parsePitchBody(p.body);

      const title = escapeHtml(p.title);
      const author = escapeHtml(p.full_name || p.email || "Startup");
      const count = Number(p.interest_count || 0);

      const desc = parsed?.description
        ? escapeHtml(parsed.description)
        : escapeHtml(p.body || "");

      // ✅ FIX #1: goal from funding ask using SAME parser as campaign page
      const goal = parseFundingGoal(parsed?.funding ?? "");

      // ✅ FIX #2: raised from investments (same as campaign page)
      const inv = getCampaignInv(p.id);
      const raised = Number(inv.raised || 0);

      // ✅ FIX #3: percent based on raised/goal (no fake 40%)
      const pct = clampPct(goal ? (raised / goal) * 100 : 0);

      const tag = escapeHtml(parsed?.market || "Startup");

      return `
        <article class="camp-card camp-click" data-open-id="${p.id}">
          <div class="camp-body">
            <h3 class="camp-title">${title}</h3>
            <p class="camp-sub">${desc}</p>

            <div class="camp-money">
              <div>${money(raised)}</div>
              <div class="muted">of ${money(goal)}</div>
            </div>

            <div class="camp-progress">
              <span style="width:${pct}%;"></span>
            </div>

            <div class="camp-meta">
              <span class="meta-pill">👤 ${author}</span>
              <span class="meta-pill tag">🏷 ${tag}</span>
            </div>

            <button class="btn btn-ghost analyze-btn" data-id="${p.id}">
              📊 Analyze
            </button>

            <div class="analysis-box" id="analysis-${
              p.id
            }" style="display:none;"></div>
          </div>
        </article>
      `;
    })
    .join("");

  attachLikeHandlers();
  attachCardOpenHandlers();
  attachAnalyzeHandlers();
}

/* =====================================================
   ANALYZE HANDLERS (kept)
===================================================== */
function attachAnalyzeHandlers() {
  document.querySelectorAll(".analyze-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = btn.dataset.id;
      if (!id) return;
      window.location.href = `./campaign.html?id=${encodeURIComponent(id)}`;
    });
  });
}

/* =====================================================
   LIKE HANDLERS (kept)
===================================================== */
function attachLikeHandlers() {
  document.querySelectorAll(".like-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      toast("Like is backend-only in this version", "info");
    });
  });
}

/* =====================================================
   OPEN DETAIL PAGE HANDLERS (kept)
===================================================== */
function attachCardOpenHandlers() {
  document.querySelectorAll(".camp-click").forEach((card) => {
    card.addEventListener("click", () => {
      const id = card.dataset.openId;
      if (!id) return;
      window.location.href = `./campaign.html?id=${encodeURIComponent(id)}`;
    });
  });
}

/* =====================================================
   MAIN
===================================================== */
async function main() {
  try {
    if (statusEl) statusEl.textContent = "Loading your profile...";
    const me = loadProfileLocal();
    if (!me) return;

    if (statusEl) statusEl.textContent = "Loading startup ideas...";
    const data = loadPostsFromLocalStorage();

    if (statusEl) statusEl.textContent = "";
    renderFeed(data.posts || []);

    // ✅ auto-refresh if investments changed in another tab/page
    window.addEventListener("storage", (e) => {
      if (e.key === "ut_pitch_investments" || e.key === "ut_pitches") {
        const updated = loadPostsFromLocalStorage();
        renderFeed(updated.posts || []);
      }
    });
  } catch (e) {
    console.error(e);
    toast("Session error. Please login again.", "error");
    clearSession();
    setTimeout(() => (window.location.href = "../index.html"), 800);
  }
}

main();
