import { listPosts } from "./posts.js";
import { api } from "./api.js";
import { fetchMe, getToken, clearSession } from "./auth.js";
import { toast } from "./ui.js";

/* =====================================================
   SESSION GUARD
===================================================== */
if (!getToken()) {
  window.location.href = "../index.html";
}

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
  if (!Number.isFinite(x)) return "$0";
  return "$" + x.toLocaleString();
}

function clampPct(p) {
  const x = Number(p);
  if (!Number.isFinite(x)) return 40;
  return Math.max(2, Math.min(100, x));
}

// Converts "100K", "250k", "$100,000" → 100000
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
   PROFILE LOAD
===================================================== */
async function loadProfile() {
  const me = await fetchMe();

  const nameEl = document.getElementById("name");
  const emailEl = document.getElementById("email");
  const roleEl = document.getElementById("role");
  const img = document.getElementById("avatar");

  if (nameEl) nameEl.textContent = me.full_name || "User";
  if (emailEl) emailEl.textContent = me.email;
  if (roleEl) roleEl.textContent = `Role: ${me.role}`;

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
  }

  return me;
}

/* =====================================================
   PITCH JSON PARSER (IMPORTANT FIX)
===================================================== */
// Supports BOTH:
// 1) Pure JSON string
// 2) Text + JSON between markers:
//
// ---PITCH_JSON---
// {...}
// ---END_PITCH_JSON---
function parsePitchBody(body) {
  const raw = String(body || "");

  // Try marker format first
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

  // Try pure JSON
  try {
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? obj : null;
  } catch {
    return null;
  }
}

/* =====================================================
   RENDER FEED
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

      const raised = toNumber(parsed?.lastRevenue ?? 0);
      const goal = toNumber(parsed?.funding ?? 100000);
      const pct = clampPct(goal ? (raised / goal) * 100 : 40);

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

            <!-- 🔥 NEW ANALYZE BUTTON -->
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
  attachAnalyzeHandlers(); // 🔥 IMPORTANT
}
function attachAnalyzeHandlers() {
  document.querySelectorAll(".analyze-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation(); // prevent opening detail page

      const id = btn.dataset.id;
      const box = document.getElementById(`analysis-${id}`);

      try {
        btn.disabled = true;
        btn.textContent = "Analyzing...";

        const res = await api(`/campaigns/${id}/analyze`, {
          method: "POST",
          token: getToken(),
        });

        const a = res.analysis;

        box.innerHTML = `
          <div><b>Market Score:</b> ${a.marketScore}</div>
          <div><b>Growth Rate:</b> ${a.growthRate}%</div>
          <div><b>Burn Rate:</b> $${a.burnRate}</div>
          <div><b>Runway:</b> ${a.runwayMonths} months</div>
          <div><b>Expected Profit:</b> $${a.expectedProfit}</div>
          <div><b>12m Forecast:</b> $${a.forecast12mRevenue}</div>
        `;

        box.style.display = "block";
        btn.textContent = "📊 Analyze";
      } catch (err) {
        console.error(err);
        btn.textContent = "📊 Analyze";
      } finally {
        btn.disabled = false;
      }
    });
  });
}
/* =====================================================
   LIKE HANDLERS
===================================================== */
function attachLikeHandlers() {
  document.querySelectorAll(".like-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation(); // IMPORTANT: do not open detail

      const postId = btn.dataset.id;

      try {
        const res = await api(`/posts/${postId}/interested`, {
          method: "POST",
          token: getToken(),
        });

        const countEl = btn.querySelector(".like-count");
        const current = parseInt(countEl?.textContent || "0", 10) || 0;

        if (res.liked) {
          btn.classList.add("liked");
          if (countEl) countEl.textContent = String(current + 1);
        } else {
          btn.classList.remove("liked");
          if (countEl) countEl.textContent = String(Math.max(0, current - 1));
        }
      } catch (e2) {
        toast(e2.message || "Failed to update interest", "error");
      }
    });
  });
}

/* =====================================================
   OPEN DETAIL PAGE HANDLERS
===================================================== */
function attachCardOpenHandlers() {
  document.querySelectorAll(".camp-click").forEach((card) => {
    card.addEventListener("click", () => {
      const id = card.dataset.openId;
      if (!id) return;

      // ✅ You should create campaign.html and load post by id there
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
    await loadProfile();

    if (statusEl) statusEl.textContent = "Loading startup ideas...";
    const data = await listPosts();

    if (statusEl) statusEl.textContent = "";
    renderFeed(data.posts || []);
  } catch (e) {
    console.error(e);
    toast("Session expired or API error. Please login again.", "error");
    clearSession();
    setTimeout(() => (window.location.href = "../index.html"), 800);
  }
}

main();
