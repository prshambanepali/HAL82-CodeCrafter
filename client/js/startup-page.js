// ../js/startup-page.js
// ✅ NO BACKEND version (localStorage)
// - Startup profile shown from ut_session
// - Publish pitch -> saves in localStorage + downloads JSON
// - Hire Interns/Influencers scroll
// - Hire Interns list -> renders from ut_intern_directory

// =============================
// LOCAL STORAGE KEYS
// =============================
const LS = {
  session: "ut_session", // {role,email,full_name,avatar_url}
  pitches: "ut_pitches", // array of pitch payloads
  internDirectory: "ut_intern_directory", // array of intern profiles
};

// =============================
// HELPERS
// =============================
function $(sel) {
  return document.querySelector(sel);
}

function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toast(msg, type = "info") {
  // Uses your existing #toast if present. Falls back to alert.
  const el = document.getElementById("toast");
  if (!el) return alert(msg);

  el.textContent = msg;
  el.classList.remove("success", "error", "info");
  el.classList.add(type);
  el.style.display = "block";
  el.style.opacity = "1";

  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    el.style.opacity = "0";
    setTimeout(() => (el.style.display = "none"), 180);
  }, 2000);
}

function getSession() {
  const raw = localStorage.getItem(LS.session);
  return raw ? JSON.parse(raw) : null;
}

function ensureStartupSession() {
  // If you want strict auth, redirect if missing.
  // Since you said no backend, we create a demo session if missing.
  let s = getSession();
  if (!s) {
    s = {
      role: "STARTUP",
      email: "startup@example.com",
      full_name: "Startup",
      avatar_url: "",
      created_at: new Date().toISOString(),
    };
    localStorage.setItem(LS.session, JSON.stringify(s));
  }
  return s;
}

function clearSession() {
  localStorage.removeItem(LS.session);
}

function initials(name) {
  return (
    String(name || "S")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => (w[0] || "").toUpperCase())
      .join("") || "S"
  );
}

// =============================
// DOM HELPERS (PITCH INPUT)
// =============================
function num(id) {
  const el = document.getElementById(id);
  const v = Number(el?.value || 0);
  return Number.isFinite(v) ? v : 0;
}
function str(id) {
  return (document.getElementById(id)?.value || "").trim();
}
function round2(x) {
  return Math.round((x + Number.EPSILON) * 100) / 100;
}

// =============================
// PROFILE (NO BACKEND)
// =============================
function loadProfile() {
  const me = ensureStartupSession();

  // Guard: must be STARTUP
  const role = String(me.role || "").toUpperCase();
  if (role !== "STARTUP") {
    window.location.href = "./unauthorized.html";
    return null;
  }

  $("#name") && ($("#name").textContent = me.full_name || "Startup");
  $("#email") && ($("#email").textContent = me.email || "—");
  $("#role") && ($("#role").textContent = `Role: ${role}`);

  const statusEl = document.getElementById("status");
  if (statusEl) statusEl.textContent = "";

  const img = document.getElementById("avatar");
  const fallback = document.querySelector(".dashpro-avatar-fallback");

  if (me.avatar_url) {
    img.src = me.avatar_url;
    img.style.display = "block";
    if (fallback) fallback.style.display = "none";
  } else {
    // Show fallback initials if available
    if (img) img.style.display = "none";
    if (fallback) {
      fallback.style.display = "block";
      fallback.textContent = initials(me.full_name || "Startup");
    }
  }

  return me;
}

// =============================
// PITCH ANALYSIS
// =============================
function calcAnalysis(m) {
  const growthRate =
    m.lastRevenue > 0
      ? ((m.currentRevenue - m.lastRevenue) / m.lastRevenue) * 100
      : m.currentRevenue > 0
      ? 100
      : 0;

  const burnRate = m.expenses - m.currentRevenue;
  const runwayMonths = burnRate > 0 ? m.cash / burnRate : null;

  const expectedProfit = m.currentRevenue * (m.grossMargin / 100);

  const monthlyGrowth = Math.pow(1 + m.cagr / 100, 1 / 12) - 1;
  const forecast12mRevenue = m.currentRevenue * Math.pow(1 + monthlyGrowth, 12);

  const tamScore = Math.min(60, Math.log10(Math.max(1, m.tam)) * 10);
  const cagrScore = Math.min(40, Math.max(0, m.cagr));
  const marketScore = round2(Math.min(100, tamScore + cagrScore));

  return {
    marketScore,
    growthRate: round2(growthRate),
    burnRate: round2(burnRate),
    runwayMonths: runwayMonths === null ? null : round2(runwayMonths),
    lastRevenue: round2(m.lastRevenue),
    expectedProfit: round2(expectedProfit),
    forecast12mRevenue: round2(forecast12mRevenue),
  };
}

function buildPitchPayload() {
  const startup = {
    name: str("s_name"),
    description: str("s_description"),
    market: str("s_market"),
    revenueModel: str("s_revenueModel"),
    funding: str("s_funding"),
    teamExp: str("s_teamExp"),
  };

  const metrics = {
    tam: num("m_tam"),
    cagr: num("m_cagr"),
    lastRevenue: num("m_lastRevenue"),
    currentRevenue: num("m_currentRevenue"),
    expenses: num("m_expenses"),
    cash: num("m_cash"),
    grossMargin: num("m_grossMargin"),
    activeUsers: num("m_users"),
  };

  const analysis = calcAnalysis(metrics);

  return {
    startup,
    metrics_input: metrics,
    analysis,
    createdAt: new Date().toISOString(),
  };
}

function validatePitch(p) {
  if (!p.startup.name) return "Startup name is required";
  if (!p.startup.description) return "Description is required";
  if (!p.startup.market) return "Market is required";
  if (!p.startup.revenueModel) return "Revenue model is required";
  if (!p.startup.funding) return "Funding ask is required";
  if (!p.startup.teamExp) return "Team experience is required";
  return null;
}

function renderPitchBoxes(startup) {
  const el = document.getElementById("pitchBoxes");
  if (!el) return;

  el.innerHTML = `
    <div class="pitch-preview">
      <div class="pitch-box"><h4>NAME</h4><p>${escapeHtml(
        startup.name
      )}</p></div>
      <div class="pitch-box"><h4>DESCRIPTION</h4><p>${escapeHtml(
        startup.description
      )}</p></div>
      <div class="pitch-box"><h4>MARKET</h4><p>${escapeHtml(
        startup.market
      )}</p></div>
      <div class="pitch-box"><h4>REVENUE MODEL</h4><p>${escapeHtml(
        startup.revenueModel
      )}</p></div>
      <div class="pitch-box"><h4>FUNDING</h4><p>${escapeHtml(
        startup.funding
      )}</p></div>
      <div class="pitch-box"><h4>TEAM</h4><p>${escapeHtml(
        startup.teamExp
      )}</p></div>
    </div>
  `;
}

function renderAnalysisCards(a) {
  const out = document.getElementById("analysisOut");
  if (!out) return;

  const runwayText =
    a.runwayMonths === null
      ? "Not burning (profit)"
      : `${a.runwayMonths} months`;

  out.innerHTML = `
    <div class="analysis-grid">
      <div class="analysis-card">
        <div class="analysis-kicker">MARKET SCORE</div>
        <div class="analysis-value">${a.marketScore}/100</div>
        <div class="analysis-sub">Based on TAM + Industry CAGR</div>
      </div>

      <div class="analysis-card">
        <div class="analysis-kicker">GROWTH RATE</div>
        <div class="analysis-value">${a.growthRate}%</div>
        <div class="analysis-sub">MoM revenue growth</div>
      </div>

      <div class="analysis-card">
        <div class="analysis-kicker">BURN RATE</div>
        <div class="analysis-value">$${a.burnRate}</div>
        <div class="analysis-sub">Expenses − revenue</div>
      </div>

      <div class="analysis-card">
        <div class="analysis-kicker">RUNWAY</div>
        <div class="analysis-value">${runwayText}</div>
        <div class="analysis-sub">Cash / burn rate</div>
      </div>

      <div class="analysis-card">
        <div class="analysis-kicker">LAST REVENUE</div>
        <div class="analysis-value">$${a.lastRevenue}</div>
        <div class="analysis-sub">Previous month revenue</div>
      </div>

      <div class="analysis-card">
        <div class="analysis-kicker">EXPECTED PROFIT</div>
        <div class="analysis-value">$${a.expectedProfit}</div>
        <div class="analysis-sub">Revenue × gross margin</div>
      </div>

      <div class="analysis-card">
        <div class="analysis-kicker">12M FORECAST</div>
        <div class="analysis-value">$${a.forecast12mRevenue}</div>
        <div class="analysis-sub">Forecast using CAGR</div>
      </div>
    </div>
  `;
}

function downloadJsonFile(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function savePitch(payload) {
  const raw = localStorage.getItem(LS.pitches);
  const list = raw ? JSON.parse(raw) : [];
  list.unshift(payload);
  localStorage.setItem(LS.pitches, JSON.stringify(list));
}

function publishPitch() {
  const btn = document.getElementById("publishPitch");
  if (!btn) return;

  const payload = buildPitchPayload();
  const err = validatePitch(payload);
  if (err) return toast(err, "error");

  btn.disabled = true;
  const oldText = btn.textContent;
  btn.textContent = "Publishing...";

  try {
    renderPitchBoxes(payload.startup);
    renderAnalysisCards(payload.analysis);

    // Save locally
    savePitch(payload);

    // download JSON
    const safe = payload.startup.name.replace(/[^a-z0-9]+/gi, "_");
    downloadJsonFile(payload, `pitch_${safe}_${Date.now()}.json`);

    toast("Pitch published ✅ saved locally + JSON downloaded", "success");
  } catch (e) {
    console.error(e);
    toast(e.message || "Pitch publish failed", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = oldText || "Publish";
  }
}

// =============================
// SCROLL BUTTONS
// =============================
function initScrollButtons() {
  document.getElementById("hireInternsBtn")?.addEventListener("click", () => {
    document
      .getElementById("hireInternsSection")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document
    .getElementById("hireInfluencersBtn")
    ?.addEventListener("click", () => {
      document
        .getElementById("hireInfluencersSection")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
}

// =============================
// INTERN DIRECTORY RENDER
// =============================
function loadInternDirectory() {
  const raw = localStorage.getItem(LS.internDirectory);
  return raw ? JSON.parse(raw) : [];
}

function renderInternCards() {
  const wrap = document.getElementById("internCards");
  if (!wrap) return;

  const interns = loadInternDirectory();

  if (!interns.length) {
    wrap.innerHTML = `
      <article class="overview-card">
        <div class="overview-kicker">NO INTERN PROFILES YET</div>
        <p>No intern has created a profile yet. Ask interns to fill the Intern Dashboard profile.</p>
      </article>
    `;
    return;
  }

  wrap.innerHTML = "";

  interns.forEach((p) => {
    const skills = Array.isArray(p.skills) ? p.skills : [];
    const topSkills = skills.slice(0, 4);

    const card = document.createElement("article");
    card.className = "overview-card";
    card.innerHTML = `
      <div style="display:flex; gap:14px; align-items:flex-start;">
        <div style="
          width:64px;height:64px;border-radius:18px;
          background:linear-gradient(135deg,#4f46e5,#3b82f6);
          display:flex;align-items:center;justify-content:center;
          color:#fff;font-weight:800;font-size:22px; flex:0 0 auto;
        ">
          ${escapeHtml(initials(p.full_name))}
        </div>

        <div style="flex:1;">
          <div style="font-size:20px;font-weight:800;line-height:1.2;">
            ${escapeHtml(p.full_name || "Intern")}
          </div>
          <div style="margin-top:4px; color:#5b6b83; font-weight:600;">
            ${escapeHtml(p.headline || "")}
          </div>

          <div style="margin-top:10px; display:flex; gap:10px; flex-wrap:wrap;">
            ${topSkills
              .map((s) => `<span class="chip2">${escapeHtml(s)}</span>`)
              .join("")}
          </div>

          <div style="margin-top:10px; color:#5b6b83;">
            ${escapeHtml(p.university || "")}
            ${
              p.graduation_year
                ? ` • ${escapeHtml(String(p.graduation_year))}`
                : ""
            }
            ${p.location ? ` • ${escapeHtml(p.location)}` : ""}
          </div>

          <div style="margin-top:14px; display:flex; gap:10px; flex-wrap:wrap;">
            <button class="btn btn-primary" type="button" data-view="${escapeHtml(
              p.id || ""
            )}">View Profile</button>
            <button class="btn btn-ghost" type="button" data-contact="${escapeHtml(
              p.id || ""
            )}">Contact</button>
          </div>
        </div>
      </div>
    `;

    card
      .querySelector(`[data-view="${p.id || ""}"]`)
      ?.addEventListener("click", () => {
        alert(
          `Intern Profile\n\n` +
            `Name: ${p.full_name || ""}\n` +
            `Headline: ${p.headline || ""}\n` +
            `Bio: ${p.bio || ""}\n` +
            `University: ${p.university || ""}\n` +
            `Year: ${p.graduation_year || ""}\n` +
            `Location: ${p.location || ""}\n` +
            `Skills: ${(p.skills || []).join(", ")}\n\n` +
            `Portfolio: ${p.portfolio_url || ""}\n` +
            `LinkedIn: ${p.linkedin_url || ""}\n` +
            `GitHub: ${p.github_url || ""}\n` +
            `Email: ${p.email || ""}`
        );
      });

    card
      .querySelector(`[data-contact="${p.id || ""}"]`)
      ?.addEventListener("click", () => {
        alert(
          `Contact Intern\n\n` +
            `Email: ${p.email || "(no email saved)"}\n` +
            `LinkedIn: ${p.linkedin_url || "(none)"}\n` +
            `Portfolio: ${p.portfolio_url || "(none)"}`
        );
      });

    wrap.appendChild(card);
  });
}

const INFLUENCER_DIR_KEY = "ut_influencer_directory";

function loadInfluencerDirectory() {
  const raw = localStorage.getItem(INFLUENCER_DIR_KEY);
  return raw ? JSON.parse(raw) : [];
}

function renderInfluencerCards() {
  const wrap = document.getElementById("influencerCards");
  if (!wrap) return;

  const infs = loadInfluencerDirectory();

  if (!infs.length) {
    wrap.innerHTML = `
      <article class="overview-card">
        <div class="overview-kicker">NO INFLUENCER PROFILES YET</div>
        <p>No influencer has published a profile yet. Ask them to open Influencer Dashboard and click “Hire Me”.</p>
      </article>
    `;
    return;
  }

  wrap.innerHTML = "";

  infs.forEach((p) => {
    const card = document.createElement("article");
    card.className = "overview-card";
    card.innerHTML = `
      <div style="display:flex; gap:14px; align-items:flex-start;">
        <div style="
          width:64px;height:64px;border-radius:18px;
          background:linear-gradient(135deg,#ec4899,#f43f5e);
          display:flex;align-items:center;justify-content:center;
          color:#fff;font-weight:800;font-size:22px; flex:0 0 auto;
        ">
          ${escapeHtml((p.full_name || "I").slice(0, 1).toUpperCase())}
        </div>

        <div style="flex:1;">
          <div style="font-size:20px;font-weight:800;line-height:1.2;">
            ${escapeHtml(p.full_name || "Influencer")}
          </div>
          <div style="margin-top:4px; color:#5b6b83; font-weight:600;">
            ${escapeHtml(p.handle || "")}
          </div>

          <div style="margin-top:10px; display:flex; gap:10px; flex-wrap:wrap;">
            <span class="chip2">${escapeHtml(p.niche || "Creator")}</span>
            <span class="chip2">${escapeHtml(
              p.availability || "Available"
            )}</span>
          </div>

          <div style="margin-top:10px; color:#5b6b83;">
            Followers: ${escapeHtml(p.followers || "—")} •
            Engagement: ${escapeHtml(p.engagement || "—")} •
            Avg Views: ${escapeHtml(p.avgViews || "—")}
          </div>

          <div style="margin-top:14px; display:flex; gap:10px; flex-wrap:wrap;">
            <button class="btn btn-primary" type="button" data-view="${escapeHtml(
              p.id
            )}">View Profile</button>
            <button class="btn btn-ghost" type="button" data-contact="${escapeHtml(
              p.id
            )}">Contact</button>
          </div>
        </div>
      </div>
    `;

    card
      .querySelector(`[data-view="${p.id}"]`)
      ?.addEventListener("click", () => {
        alert(
          `Influencer Profile\n\n` +
            `Name: ${p.full_name || ""}\n` +
            `Handle: ${p.handle || ""}\n` +
            `Bio: ${p.bio || ""}\n` +
            `Niche: ${p.niche || ""}\n` +
            `Followers: ${p.followers || ""}\n` +
            `Engagement: ${p.engagement || ""}\n` +
            `Avg Views: ${p.avgViews || ""}`
        );
      });

    card
      .querySelector(`[data-contact="${p.id}"]`)
      ?.addEventListener("click", () => {
        alert(
          `Contact Influencer\n\n` +
            `Email: ${p.email || "(no email saved)"}\n` +
            `Handle: ${p.handle || "(none)"}`
        );
      });

    wrap.appendChild(card);
  });
}

// =============================
// INIT
// =============================
function initLogout() {
  document.getElementById("logout")?.addEventListener("click", () => {
    clearSession();
    toast("Logged out", "success");
    setTimeout(() => (window.location.href = "../index.html"), 300);
  });
}

function main() {
  // Load profile + guard
  const me = loadProfile();
  if (!me) return;

  initLogout();
  initScrollButtons();

  // Pitch publish
  document
    .getElementById("publishPitch")
    ?.addEventListener("click", publishPitch);

  // Render intern list
  renderInternCards();
  renderInfluencerCards();
  window.addEventListener("focus", () => {
    renderInternCards();
    renderInfluencerCards();
  });
}

document.addEventListener("DOMContentLoaded", main);
