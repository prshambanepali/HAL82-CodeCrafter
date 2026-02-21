// ../js/campaign.js
// ✅ NO BACKEND campaign page (localStorage)
// - Reads pitch from ut_pitches using ?id=...
// - Tracks investments in ut_pitch_investments
// - Raised = investment only (NOT revenue), investors count = unique investors
// - Shows analysis in #analysisSection

import { getToken, clearSession } from "./auth.js";
import { toast } from "./ui.js";

/* =====================================================
   AUTH GUARD + LOGOUT
===================================================== */
if (!getToken()) {
  window.location.href = "../index.html";
}

document.getElementById("logout")?.addEventListener("click", () => {
  clearSession();
  toast("Logged out", "success");
  setTimeout(() => (window.location.href = "../index.html"), 400);
});

/* =====================================================
   LOCAL STORAGE KEYS
===================================================== */
const LS = {
  session: "ut_session",
  pitches: "ut_pitches",
  investments: "ut_pitch_investments",
  // Shape:
  // ut_pitch_investments = {
  //   [pitchId]: { raised: number, investorsBy: { [email]: true } }
  // }
};

/* =====================================================
   HELPERS
===================================================== */
function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function fmtMoney(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "$0";
  return "$" + x.toLocaleString();
}

function clampPct(p) {
  const x = Number(p);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(100, x));
}

function getIdFromUrl() {
  const u = new URL(window.location.href);
  return u.searchParams.get("id");
}

// MUST match investor-page.js local id generator
function makeIdFromPitch(p, idx) {
  const t = p?.createdAt || "";
  const name = p?.startup?.name || "startup";
  const safeName = String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
  const safeTime = String(t).replace(/[^0-9a-z]+/gi, "");
  return `ls-${safeName}-${safeTime || idx}`;
}

// Converts "$750,000 Seed Round" / "100K" / "250k" → number
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

  return 100000;
}

function riskLabel(score) {
  const s = Number(score) || 0;
  if (s <= 33) return "Low Risk";
  if (s <= 66) return "Medium Risk";
  return "High Risk";
}

/* =====================================================
   INVESTMENT STATE (LOCAL)
===================================================== */
function getInvState() {
  const s = readJSON(LS.investments, {});
  return s && typeof s === "object" ? s : {};
}

function getCampaignInv(id) {
  const all = getInvState();
  const row = all[id];
  if (!row) return { raised: 0, investorsBy: {} };

  return {
    raised: Number(row.raised || 0),
    investorsBy:
      row.investorsBy && typeof row.investorsBy === "object"
        ? row.investorsBy
        : {},
  };
}

function setCampaignInv(id, data) {
  const all = getInvState();
  all[id] = {
    raised: Number(data.raised || 0),
    investorsBy:
      data.investorsBy && typeof data.investorsBy === "object"
        ? data.investorsBy
        : {},
  };
  writeJSON(LS.investments, all);
}

function investorCountFrom(inv) {
  return Object.keys(inv.investorsBy || {}).length;
}

/* =====================================================
   SMALL UI RENDERERS (SVG CHART + LISTS)
===================================================== */
function renderRevenueChart(arr) {
  const el = document.getElementById("revChart");
  if (!el) return;

  const a =
    Array.isArray(arr) && arr.length ? arr : [12000, 18000, 24000, 30000];
  const max = Math.max(...a, 1);

  const w = 640,
    h = 220,
    pad = 26;
  const step = a.length > 1 ? (w - pad * 2) / (a.length - 1) : 1;

  const pts = a
    .map((v, i) => {
      const x = pad + i * step;
      const y = h - pad - (v / max) * (h - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");

  el.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" class="rev-svg" aria-label="Revenue chart">
      <polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="3" />
      <polyline points="${pts} ${w - pad},${h - pad} ${pad},${h - pad}"
        fill="currentColor" opacity="0.10" />
      ${a
        .map((v, i) => {
          const x = pad + i * step;
          const y = h - pad - (v / max) * (h - pad * 2);
          return `<circle cx="${x}" cy="${y}" r="4" fill="currentColor" />`;
        })
        .join("")}
    </svg>
  `;
}

function renderTranches(tr) {
  const box = document.getElementById("tranches");
  if (!box) return;

  const arr = Array.isArray(tr) ? tr : [];
  box.innerHTML = arr
    .map((t, idx) => {
      const status = t.status || "Pending";
      const pill =
        status === "Released"
          ? `<span class="tr-tag ok">Released</span>`
          : status === "Pending"
          ? `<span class="tr-tag warn">Pending Review</span>`
          : `<span class="tr-tag lock">Locked</span>`;

      const ic =
        status === "Released" ? "✅" : status === "Pending" ? "🕒" : "🔒";

      return `
        <div class="tr-item">
          <div class="tr-ic">${ic}</div>
          <div class="tr-mid">
            <div class="tr-title">${escapeHtml(
              t.title || `Tranche ${idx + 1}`
            )}</div>
            <div class="tr-desc">${escapeHtml(t.note || "")}</div>
            ${pill}
          </div>
          <div class="tr-amt">${fmtMoney(
            t.amount || 0
          )} <span class="tr-pct">(${t.pct || 0}%)</span></div>
        </div>
      `;
    })
    .join("");
}

function renderRewards(arr) {
  const el = document.getElementById("rewards");
  if (!el) return;

  const rewards = Array.isArray(arr) ? arr : [];
  el.innerHTML = rewards
    .map(
      (r) => `
      <div class="rw">
        <div class="rw-top">
          <span class="rw-chip">${escapeHtml(r.label || "Tier")}</span>
          <span class="rw-price">${fmtMoney(r.price || 0)}</span>
        </div>
        <div class="rw-desc">${escapeHtml(r.desc || "")}</div>
      </div>
    `
    )
    .join("");
}

/* =====================================================
   MAIN RENDER
===================================================== */
let CURRENT_ID = null;
let CURRENT_PITCH = null;

function applyPitchToPage(pitch) {
  const s = pitch.startup || {};
  const m = pitch.metrics_input || {};
  const a = pitch.analysis || {};

  // HERO
  document.getElementById("campTitle").textContent = s.name || "Campaign";
  document.getElementById("campSub").textContent = s.description || "—";
  document.getElementById("tagBadge").textContent = s.market || "Startup";

  // FUNDING (IMPORTANT FIX)
  // ✅ Raised must be based on investments only, not revenue.
  const goal = parseFundingGoal(s.funding);
  const inv = getCampaignInv(CURRENT_ID);
  const raised = Number(inv.raised || 0);
  const investors = investorCountFrom(inv);
  const pct = clampPct(goal ? (raised / goal) * 100 : 0);

  document.getElementById("raised").textContent = fmtMoney(raised);
  document.getElementById("goal").textContent = fmtMoney(goal);
  document.getElementById("pct").textContent = `${Math.round(pct)}%`;
  document.getElementById("bar").style.width = `${pct}%`;

  document.getElementById("investors").textContent = String(investors);

  // Optional defaults
  document.getElementById("daysLeft").textContent = "30";
  document.getElementById("minInv").textContent = "Rs 250";

  // ABOUT
  document.getElementById("about").textContent = s.description || "—";
  document.getElementById("about2").textContent =
    "Funding supports product development, customer acquisition, and growth milestones.";

  // Company details (optional placeholders)
  document.getElementById("location").textContent = "—";
  document.getElementById("founded").textContent = "—";
  document.getElementById("teamCount").textContent = "3";
  const web = document.getElementById("website");
  web.href = "#";
  web.textContent = "Website";

  // Predicted return + risk (use marketScore if present)
  document.getElementById("returnRange").textContent = "Up to 25% return";

  const risk = Number(100 - a.marketScore ?? 28);
  document.getElementById("riskScore").textContent = String(risk);
  document.getElementById("riskLabel").textContent = riskLabel(risk);
  document.getElementById("riskBar").style.width = `${clampPct(risk)}%`;

  // Revenue chart / tranches / rewards (use defaults if none stored)
  renderRevenueChart(a.revenueHistory || [12000, 18000, 24000, 30000]);
  renderTranches(
    a.tranches || [
      {
        title: "Tranche 1",
        amount: Math.round(goal * 0.33),
        pct: 33,
        status: "Released",
        note: "MVP + initial user onboarding",
      },
      {
        title: "Tranche 2",
        amount: Math.round(goal * 0.33),
        pct: 33,
        status: "Pending",
        note: "Revenue and retention milestones",
      },
      {
        title: "Tranche 3",
        amount: goal - Math.round(goal * 0.66),
        pct: 34,
        status: "Locked",
        note: "Scale growth and partnerships",
      },
    ]
  );
  renderRewards(
    a.rewards || [
      { label: "Early Access", price: 250, desc: "Priority access + updates" },
      {
        label: "Revenue Share",
        price: 5000,
        desc: "0.1% revenue share (3 years)",
      },
      {
        label: "Investor Package",
        price: 25000,
        desc: "0.5% rev share + advisory seat",
      },
    ]
  );

  // ✅ ANALYSIS SECTION (shows startup metrics + computed analysis)
  const analysisBox = document.getElementById("analysisSection");
  if (analysisBox) {
    analysisBox.innerHTML = `
      <div><b>Market Score:</b> ${escapeHtml(a.marketScore ?? "—")}</div>
      <div><b>Growth Rate:</b> ${escapeHtml(a.growthRate ?? "—")}%</div>
      <div><b>Burn Rate:</b> $${escapeHtml(a.burnRate ?? "—")}</div>
      <div><b>Runway:</b> ${
        a.runwayMonths === null || a.runwayMonths === undefined
          ? "Not burning (profit)"
          : `${escapeHtml(a.runwayMonths)} months`
      }</div>
      <div><b>Expected Profit:</b> $${escapeHtml(a.expectedProfit ?? "—")}</div>
      <div><b>12m Forecast:</b> $${escapeHtml(
        a.forecast12mRevenue ?? "—"
      )}</div>
      <hr style="margin:12px 0; opacity:.2;">
      <div><b>TAM:</b> ${escapeHtml(m.tam ?? "—")}</div>
      <div><b>CAGR:</b> ${escapeHtml(m.cagr ?? "—")}%</div>
      <div><b>This Month Revenue:</b> $${escapeHtml(
        m.currentRevenue ?? "—"
      )}</div>
    `;
    analysisBox.style.display = "block";
  }
}

/* =====================================================
   INVEST NOW
===================================================== */
function initInvestButton() {
  const btn = document.querySelector(".camp-invest-btn");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const amtStr = prompt("Enter investment amount (USD):", "250");
    if (amtStr == null) return;

    const amt = Number(amtStr);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast("Enter a valid amount", "error");
      return;
    }

    const me = readJSON(LS.session, null);
    const email = me?.email || "investor@local";

    const inv = getCampaignInv(CURRENT_ID);
    inv.raised = Number(inv.raised || 0) + amt;
    inv.investorsBy[email] = true; // ✅ unique investor per email
    setCampaignInv(CURRENT_ID, inv);

    toast(`Invested ${fmtMoney(amt)} ✅`, "success");

    // Re-render funding section + investors count
    applyPitchToPage(CURRENT_PITCH);
  });
}

/* =====================================================
   MAIN
===================================================== */
function main() {
  const me = readJSON(LS.session, null);
  if (!me || String(me.role || "").toUpperCase() !== "INVESTOR") {
    window.location.href = "./unauthorized.html";
    return;
  }

  const id = getIdFromUrl();
  if (!id) {
    toast("Missing campaign id", "error");
    window.location.href = "./investor.html";
    return;
  }

  const pitches = readJSON(LS.pitches, []);
  const found = (Array.isArray(pitches) ? pitches : []).find((p, idx) => {
    return makeIdFromPitch(p, idx) === id;
  });

  if (!found) {
    toast("Campaign not found", "error");
    window.location.href = "./investor.html";
    return;
  }

  CURRENT_ID = id;
  CURRENT_PITCH = found;

  applyPitchToPage(found);
  initInvestButton();

  // Keep page updated if another tab invests
  window.addEventListener("storage", (e) => {
    if (e.key === LS.investments) {
      applyPitchToPage(CURRENT_PITCH);
    }
  });
}

document.addEventListener("DOMContentLoaded", main);
