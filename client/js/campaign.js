import { listPosts } from "./posts.js";
import { fetchMe, getToken, clearSession } from "./auth.js";
import { toast } from "./ui.js";

if (!getToken()) window.location.href = "../index.html";

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

function getIdFromUrl() {
  const u = new URL(window.location.href);
  return u.searchParams.get("id");
}

function extractPitchJson(bodyText) {
  const body = String(bodyText || "");
  const m = body.match(/---PITCH_JSON---\s*([\s\S]*?)\s*---END_PITCH_JSON---/);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
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

function riskLabel(score) {
  const s = Number(score) || 0;
  if (s <= 33) return "Low Risk";
  if (s <= 66) return "Medium Risk";
  return "High Risk";
}

function defaultPitchFromPost(post) {
  // fallback if post body isn't JSON-marked
  return {
    startup: {
      name: post.title || "Startup Pitch",
      description: post.body || "",
      market: "Startup",
      revenueModel: "—",
      funding: "100K",
      teamExp: "—",
      location: "—",
      founded: "—",
      teamCount: 3,
      website: "#",
      coverUrl: "",
    },
    metrics: {
      goal: 100000,
      raised: 0,
      investors: 0,
      daysLeft: 30,
      minInvestment: 250,
    },
    analysis: {
      expectedReturnMin: 12,
      expectedReturnMax: 35,
      riskScore: 28,
      revenueHistory: [1000, 1800, 2600], // year1..year3
      tranches: [
        {
          title: "Tranche 1",
          amount: 250000,
          pct: 33,
          status: "Released",
          note: "Build MVP + onboard clients",
        },
        {
          title: "Tranche 2",
          amount: 250000,
          pct: 33,
          status: "Pending",
          note: "Reach ARR milestone",
        },
        {
          title: "Tranche 3",
          amount: 250000,
          pct: 34,
          status: "Locked",
          note: "Series A commitment",
        },
      ],
      rewards: [
        {
          label: "Early Access",
          price: 250,
          desc: "Priority access + updates",
        },
        {
          label: "Revenue Share",
          price: 5000,
          desc: "0.1% revenue share (3 years)",
        },
        {
          label: "Funding Investor Package",
          price: 25000,
          desc: "0.5% rev share + advisory seat",
        },
      ],
    },
  };
}

function renderRevenueChart(arr) {
  const el = document.getElementById("revChart");
  const a = Array.isArray(arr) && arr.length ? arr : [1000, 1500, 2200];
  const max = Math.max(...a, 1);

  // Simple SVG line chart (no libs)
  const w = 640,
    h = 220,
    pad = 26;
  const step = (w - pad * 2) / (a.length - 1);

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
      <polyline points="${pts} ${w - pad},${h - pad} ${pad},${
    h - pad
  }" fill="currentColor" opacity="0.10" />
      ${a
        .map((v, i) => {
          const x = pad + i * step;
          const y = h - pad - (v / max) * (h - pad * 2);
          return `<circle cx="${x}" cy="${y}" r="4" fill="currentColor" />`;
        })
        .join("")}
      <text x="${pad}" y="${
    h - 8
  }" font-size="12" fill="rgba(15,23,42,.55)">Year 1</text>
      <text x="${w / 2}" y="${
    h - 8
  }" font-size="12" fill="rgba(15,23,42,.55)" text-anchor="middle">Year 2</text>
      <text x="${w - pad}" y="${
    h - 8
  }" font-size="12" fill="rgba(15,23,42,.55)" text-anchor="end">Year 3</text>
    </svg>
  `;
}

function renderTranches(tr) {
  const box = document.getElementById("tranches");
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
        <div class="tr-amt">${fmtMoney(t.amount || 0)} <span class="tr-pct">(${
        t.pct || 0
      }%)</span></div>
      </div>
    `;
    })
    .join("");
}

function renderRewards(arr) {
  const el = document.getElementById("rewards");
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

function applyPitch(pitch, post) {
  const s = pitch.startup || {};
  const m = pitch.metrics || {};
  const a = pitch.analysis || {};

  // hero
  document.getElementById("campTitle").textContent =
    s.name || post.title || "Campaign";
  document.getElementById("campSub").textContent = s.description
    ? s.description
    : post.body || "—";

  document.getElementById("tagBadge").textContent = s.market || "Startup";

  const cover = document.getElementById("cover");
  if (s.coverUrl) {
    cover.style.backgroundImage = `url("${s.coverUrl}")`;
    cover.classList.add("has-img");
  } else {
    cover.style.backgroundImage = "";
    cover.classList.remove("has-img");
  }

  // funding
  const goal = Number(m.goal ?? 100000);
  const raised = Number(m.raised ?? 0);
  const pct = clampPct(goal ? (raised / goal) * 100 : 0);

  document.getElementById("raised").textContent = fmtMoney(raised);
  document.getElementById("goal").textContent = fmtMoney(goal);
  document.getElementById("pct").textContent = `${Math.round(pct)}%`;
  document.getElementById("bar").style.width = `${pct}%`;

  document.getElementById("investors").textContent = String(m.investors ?? 0);
  document.getElementById("daysLeft").textContent = String(m.daysLeft ?? 30);
  document.getElementById("minInv").textContent = fmtMoney(
    m.minInvestment ?? 250
  );

  // about
  document.getElementById("about").textContent =
    s.description || post.body || "—";
  document.getElementById("about2").textContent =
    s.longDescription ||
    "Founded by passionate builders with a clear growth path and measurable traction.";

  // company
  document.getElementById("location").textContent = s.location || "—";
  document.getElementById("founded").textContent = s.founded || "—";
  document.getElementById("teamCount").textContent = String(s.teamCount ?? 3);

  const web = document.getElementById("website");
  if (s.website && s.website !== "#") {
    web.href = s.website;
    web.textContent = "Website ↗";
  } else {
    web.href = "#";
    web.textContent = "Website";
  }

  // return + risk
  const minR = Number(a.expectedReturnMin ?? 12);
  const maxR = Number(a.expectedReturnMax ?? 35);
  document.getElementById("returnRange").textContent = `${minR}% – ${maxR}%`;

  const risk = Number(a.riskScore ?? 28);
  document.getElementById("riskScore").textContent = String(risk);
  document.getElementById("riskLabel").textContent = riskLabel(risk);
  document.getElementById("riskBar").style.width = `${clampPct(risk)}%`;

  // charts / lists
  renderRevenueChart(a.revenueHistory);
  renderTranches(a.tranches);
  renderRewards(a.rewards);
  // Show analysis from backend if exists
  // if (pitch.analysis) {
  //   document.getElementById("analysisSection").innerHTML = `
  //     <div><b>Market Score:</b> ${pitch.analysis.marketScore}</div>
  //     <div><b>Growth Rate:</b> ${pitch.analysis.growthRate}%</div>
  //     <div><b>Burn Rate:</b> $${pitch.analysis.burnRate}</div>
  //     <div><b>Runway:</b> ${pitch.analysis.runwayMonths} months</div>
  //     <div><b>Expected Profit:</b> $${pitch.analysis.expectedProfit}</div>
  //     <div><b>12m Forecast:</b> $${pitch.analysis.forecast12mRevenue}</div>
  //   `;
  // }
}

async function main() {
  try {
    const me = await fetchMe();
    if (String(me.role).toUpperCase() !== "INVESTOR") {
      window.location.href = "./unauthorized.html";
      return;
    }

    const id = getIdFromUrl();
    if (!id) {
      toast("Missing campaign id", "error");
      window.location.href = "./investor.html";
      return;
    }

    // We use listPosts and find by id (safe even if /posts/:id doesn't exist)
    const data = await listPosts();
    const post = (data.posts || []).find((x) => String(x.id) === String(id));

    if (!post) {
      toast("Campaign not found", "error");
      window.location.href = "./investor.html";
      return;
    }

    const pitch = extractPitchJson(post.body);
    applyPitch(pitch || defaultPitchFromPost(post), post);
  } catch (e) {
    console.error(e);
    toast("Session expired or API error. Please login again.", "error");
    clearSession();
    setTimeout(() => (window.location.href = "../index.html"), 800);
  }
}

main();
