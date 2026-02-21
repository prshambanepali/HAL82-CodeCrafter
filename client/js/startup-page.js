import { api } from "./api.js";
import { fetchMe, getToken, clearSession } from "./auth.js";
import { toast } from "./ui.js";

if (!getToken()) window.location.href = "../index.html";

const statusEl = document.getElementById("status");

// Logout
document.getElementById("logout")?.addEventListener("click", () => {
  clearSession();
  toast("Logged out", "success");
  setTimeout(() => (window.location.href = "../index.html"), 400);
});

function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// =============================
// PROFILE
// =============================
async function loadProfile() {
  const me = await fetchMe();

  document.getElementById("name").textContent = me.full_name || "User";
  document.getElementById("email").textContent = me.email;

  const role = String(me.role || "").toUpperCase();
  document.getElementById("role").textContent = `Role: ${role}`;

  const img = document.getElementById("avatar");
  const fallback = document.querySelector(".dashpro-avatar-fallback");

  if (me.avatar_url) {
    img.src = me.avatar_url;
    img.style.display = "block";
    if (fallback) fallback.style.display = "none";
  } else {
    img.style.display = "none";
    if (fallback) fallback.style.display = "block";
  }

  // ✅ Hard guard
  if (role !== "STARTUP") window.location.href = "./unauthorized.html";

  return me;
}

// =============================
// ANALYTICS + JSON
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

// Also push into /posts for investor feed (optional but useful)
function buildInvestorFeedPost(p) {
  const title = `${p.startup.name} • ${p.startup.market} • Funding: ${p.startup.funding}`;

  const body = `Name: ${p.startup.name}
Description: ${p.startup.description}
Market: ${p.startup.market}
Revenue: ${p.startup.revenueModel}
Funding: ${p.startup.funding}
Team: ${p.startup.teamExp}

Expected Profit: $${p.analysis.expectedProfit}
Growth Rate: ${p.analysis.growthRate}%
Burn Rate: $${p.analysis.burnRate}
Last Revenue: $${p.analysis.lastRevenue}
Runway: ${
    p.analysis.runwayMonths === null
      ? "Not burning (profit)"
      : p.analysis.runwayMonths + " months"
  }`;

  return { title, body };
}

async function publishPitch() {
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

    // download JSON
    const safe = payload.startup.name.replace(/[^a-z0-9]+/gi, "_");
    downloadJsonFile(payload, `pitch_${safe}_${Date.now()}.json`);

    // publish summary post for investors
    const post = buildInvestorFeedPost(payload);
    await api("/posts", {
      method: "POST",
      token: getToken(),
      body: post,
    });

    toast("Pitch published ✅ JSON downloaded", "success");
  } catch (e) {
    console.error(e);
    toast(e.message || "Pitch publish failed", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = oldText || "Publish";
  }
}

document
  .getElementById("publishPitch")
  ?.addEventListener("click", publishPitch);

// =============================
// MAIN
// =============================
async function main() {
  try {
    statusEl.textContent = "Loading your profile...";
    await loadProfile();

    statusEl.textContent = "";
  } catch (e) {
    console.error(e);
    toast("Session expired or API error. Please login again.", "error");
    clearSession();
    setTimeout(() => (window.location.href = "../index.html"), 800);
  }
}

main();
