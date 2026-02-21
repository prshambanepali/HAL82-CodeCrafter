// intern.js (no backend) — saves profile + applications in localStorage

const LS = {
  session: "ut_session",
  theme: "ut_theme",
  internProfile: "ut_intern_profile",
  internSkills: "ut_intern_skills",
  internDirectory: "ut_intern_directory", // startup reads this
  startups: "ut_startups_seed",
  applications: "ut_applications",
};

function $(sel) {
  return document.querySelector(sel);
}
function $all(sel) {
  return Array.from(document.querySelectorAll(sel));
}

// -----------------------------
// THEME
// -----------------------------
function setTheme(theme) {
  document.body.dataset.theme = theme;
  localStorage.setItem(LS.theme, theme);
}

function initTheme() {
  const saved = localStorage.getItem(LS.theme);
  if (saved) setTheme(saved);

  const btn = $(".intern-icon-btn");
  if (btn) {
    btn.addEventListener("click", () => {
      const cur = document.body.dataset.theme === "dark" ? "dark" : "light";
      setTheme(cur === "dark" ? "light" : "dark");
    });
  }
}

// -----------------------------
// SESSION
// -----------------------------
function ensureSession() {
  let session = localStorage.getItem(LS.session);
  if (!session) {
    session = JSON.stringify({
      role: "INTERN",
      email: "intern@example.com",
      full_name: "Intern User",
      created_at: new Date().toISOString(),
    });
    localStorage.setItem(LS.session, session);
  }
  return JSON.parse(session);
}

function logout() {
  localStorage.removeItem(LS.session);
  window.location.href = "../index.html";
}

function initLogout() {
  const btn = document.getElementById("logout");
  if (btn) btn.addEventListener("click", logout);
}

// -----------------------------
// TABS
// -----------------------------
function initTabs() {
  const tabs = $all(".tab-btn");
  const panes = {
    profile: document.getElementById("tab-profile"),
    browse: document.getElementById("tab-browse"),
    apps: document.getElementById("tab-apps"),
  };

  tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabs.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      Object.values(panes).forEach((p) => p?.classList.remove("show"));
      panes[btn.dataset.tab]?.classList.add("show");

      if (btn.dataset.tab === "browse") renderBrowse();
      if (btn.dataset.tab === "apps") renderApplications();
    });
  });
}

// -----------------------------
// UI HELPERS
// -----------------------------
function showNote(form, msg, ok = true) {
  let note = form.querySelector(".form-note");
  if (!note) {
    note = document.createElement("div");
    note.className = "form-note";
    note.style.marginTop = "10px";
    note.style.fontSize = "14px";
    form.appendChild(note);
  }
  note.textContent = msg;
  note.style.color = ok ? "inherit" : "crimson";
}

function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function cap(s) {
  s = String(s || "");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function toKey(s) {
  return String(s || "")
    .replace(/\*/g, "")
    .replace(/\(.*?\)/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function readForm(form) {
  const data = {};
  const fields = form.querySelectorAll("input, textarea, select");
  fields.forEach((el) => {
    const label =
      el.closest(".fieldbox")?.querySelector("label")?.textContent?.trim() ||
      "";
    const key = toKey(label) || toKey(el.placeholder) || el.type || "field";

    data[key] = el.type === "checkbox" ? el.checked : (el.value || "").trim();
  });
  return data;
}

// -----------------------------
// STARTUP SEED (browse demo)
// -----------------------------
function seedStartups() {
  if (localStorage.getItem(LS.startups)) return;

  const demo = [
    {
      id: "st_1",
      name: "EcoCart",
      tagline: "Sustainable grocery delivery",
      description: "Help us grow community partnerships and social presence.",
      tags: ["Marketing", "Sustainability"],
      roles: ["Social Media Intern", "Content Creator"],
      location: "Remote",
      match: 9,
    },
    {
      id: "st_2",
      name: "FinBuddy",
      tagline: "Personal finance for students",
      description: "We need interns for product testing and outreach.",
      tags: ["FinTech", "Growth"],
      roles: ["Growth Intern", "Community Intern"],
      location: "Sydney / Remote",
      match: 8,
    },
  ];

  localStorage.setItem(LS.startups, JSON.stringify(demo));
}

// -----------------------------
// SKILLS
// -----------------------------
function getSkills() {
  const s = localStorage.getItem(LS.internSkills);
  return s ? JSON.parse(s) : [];
}

function setSkills(skills) {
  localStorage.setItem(LS.internSkills, JSON.stringify(skills));
}

function initSkillAdd() {
  const plus = $(".mini-plus");
  const input = document.querySelector(".skill-row input[type='text']");
  if (!plus || !input) return;

  // container to show skill pills
  let wrap = $(".skills-pill-wrap");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.className = "skills-pill-wrap";
    wrap.style.display = "flex";
    wrap.style.flexWrap = "wrap";
    wrap.style.gap = "8px";
    wrap.style.marginTop = "8px";
    input.closest(".intern-form")?.querySelector(".skill-row")?.after(wrap);
  }

  function renderPills() {
    wrap.innerHTML = "";
    const skills = getSkills();
    skills.forEach((s, idx) => {
      const pill = document.createElement("span");
      pill.textContent = s + " ×";
      pill.style.cursor = "pointer";
      pill.style.padding = "6px 10px";
      pill.style.borderRadius = "999px";
      pill.style.border = "1px solid rgba(255,255,255,0.15)";
      pill.addEventListener("click", () => {
        const next = getSkills().filter((_, i) => i !== idx);
        setSkills(next);
        renderPills();
      });
      wrap.appendChild(pill);
    });
  }

  function addSkillFromInput() {
    const v = input.value.trim();
    if (!v) return;
    const skills = getSkills();
    if (!skills.map((x) => x.toLowerCase()).includes(v.toLowerCase())) {
      skills.push(v);
      setSkills(skills);
    }
    input.value = "";
    renderPills();
  }

  plus.addEventListener("click", addSkillFromInput);

  // Enter key adds skill
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSkillFromInput();
    }
  });

  renderPills();
}

// -----------------------------
// DIRECTORY (startup reads this)
// -----------------------------
function getDirectory() {
  const raw = localStorage.getItem(LS.internDirectory);
  return raw ? JSON.parse(raw) : [];
}

function saveToDirectory(profile) {
  const list = getDirectory();

  const id =
    (profile.email && profile.email.trim()) ||
    (profile.full_name && profile.full_name.trim()) ||
    "intern_" + Math.random().toString(16).slice(2);

  const record = { ...profile, id };

  const idx = list.findIndex((x) => x.id === id);
  if (idx >= 0) list[idx] = record;
  else list.unshift(record);

  localStorage.setItem(LS.internDirectory, JSON.stringify(list));
}

// -----------------------------
// FILL FORM FROM SAVED
// -----------------------------
function fillFormFromSaved() {
  const form = document.getElementById("internProfileForm");
  if (!form) return;

  const saved = localStorage.getItem(LS.internProfile);
  const session = ensureSession();

  const data = saved
    ? JSON.parse(saved)
    : {
        full_name: session.full_name || "",
        headline: "",
        bio: "",
        university: "",
        graduation_year: "",
        location: "",
        portfolio_url: "",
        linkedin_url: "",
        github_url: "",
        availability: "",
        hours_per_week: "",
        open_to_remote: false,
        paid_internships_only: false,
      };

  const map = {
    "Full Name": "full_name",
    Headline: "headline",
    Bio: "bio",
    University: "university",
    "Graduation Year": "graduation_year",
    Location: "location",
    "Portfolio URL": "portfolio_url",
    "LinkedIn URL": "linkedin_url",
    "GitHub URL": "github_url",
    Availability: "availability",
    "Hours per Week": "hours_per_week",
    "Paid internships only": "paid_internships_only",
    "Open to Remote": "open_to_remote",
  };

  form.querySelectorAll(".fieldbox").forEach((box) => {
    const label = box.querySelector("label")?.textContent?.trim() || "";
    const key = map[label] || toKey(label);

    const input = box.querySelector("input, textarea, select");
    if (!input) return;

    if (input.type === "checkbox") input.checked = !!data[key];
    else input.value = data[key] ?? "";
  });
}

// -----------------------------
// SAVE PROFILE (and publish)
// -----------------------------
function initProfileSave() {
  const form = document.getElementById("internProfileForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const data = readForm(form);

    // ✅ Auto-add typed skill if user forgot "+"
    let skills = getSkills();
    const skillInput = document.querySelector(".skill-row input[type='text']");
    const typed = skillInput?.value.trim();
    if (
      typed &&
      !skills.map((s) => s.toLowerCase()).includes(typed.toLowerCase())
    ) {
      skills.push(typed);
      setSkills(skills);
      if (skillInput) skillInput.value = "";
    }

    if (!data.full_name) {
      showNote(form, "Full Name is required.", false);
      return;
    }
    if (skills.length === 0) {
      showNote(form, "Please add at least one skill.", false);
      return;
    }

    const session = ensureSession();

    const savedProfile = {
      ...data,
      full_name: data.full_name,
      open_to_remote: !!data.open_to_remote,
      paid_internships_only: !!data.paid_internships_only,
      skills,
      email: session.email || "",
      role: "INTERN",
      saved_at: new Date().toISOString(),
    };

    localStorage.setItem(LS.internProfile, JSON.stringify(savedProfile));
    saveToDirectory(savedProfile);

    showNote(
      form,
      "✅ Profile saved + published to Startup Hire Interns!",
      true
    );
  });
}

// -----------------------------
// BROWSE + APPLY
// -----------------------------
function renderBrowse() {
  seedStartups();
  const grid = $(".browse-grid");
  if (!grid) return;

  const startups = JSON.parse(localStorage.getItem(LS.startups) || "[]");
  grid.innerHTML = "";

  startups.forEach((s) => {
    const card = document.createElement("article");
    card.className = "startup-mini";
    card.innerHTML = `
      <div class="startup-top">
        <div class="startup-logo">${String(s.name || "S")
          .slice(0, 1)
          .toUpperCase()}</div>
        <div class="startup-top-meta">
          <div class="startup-name">
            ${escapeHtml(s.name)} <span class="match-pill">↗ ${escapeHtml(
      String(s.match || 1)
    )}</span>
          </div>
          <div class="startup-sub">${escapeHtml(s.tagline)}</div>
        </div>
      </div>

      <p class="startup-desc">${escapeHtml(s.description)}</p>

      <div class="tag-row">
        ${(s.tags || [])
          .slice(0, 2)
          .map((t) => `<span class="tag amber">${escapeHtml(t)}</span>`)
          .join("")}
      </div>

      <div class="chip-row">
        ${(s.roles || [])
          .slice(0, 3)
          .map((r) => `<span class="chip2">${escapeHtml(r)}</span>`)
          .join("")}
      </div>

      <div class="startup-bottom">
        <div class="startup-loc">📍 ${escapeHtml(s.location || "Remote")}</div>
        <button class="apply-btn" type="button">Apply</button>
      </div>
    `;

    card
      .querySelector(".apply-btn")
      ?.addEventListener("click", () => applyToStartup(s));
    grid.appendChild(card);
  });
}

function applyToStartup(startup) {
  const apps = JSON.parse(localStorage.getItem(LS.applications) || "[]");

  if (apps.some((a) => a.startup_id === startup.id)) {
    alert("You already applied to this startup.");
    return;
  }

  apps.unshift({
    id: "app_" + Math.random().toString(16).slice(2),
    startup_id: startup.id,
    company: startup.name,
    status: "reviewing",
    score: startup.match || 0,
    message: "Application received. We’ll review it soon.",
    created_at: new Date().toISOString(),
  });

  localStorage.setItem(LS.applications, JSON.stringify(apps));
  alert("✅ Applied! Check 'My Applications' tab.");
}

// -----------------------------
// APPLICATIONS
// -----------------------------
function renderApplications() {
  const list = $(".apps-list");
  if (!list) return;

  const apps = JSON.parse(localStorage.getItem(LS.applications) || "[]");
  if (!apps.length) return;

  list.innerHTML = "";
  apps.forEach((a) => {
    const row = document.createElement("div");
    row.className = "app-row";

    const statusClass =
      a.status === "accepted"
        ? "accepted"
        : a.status === "rejected"
        ? "rejected"
        : "reviewing";

    row.innerHTML = `
      <div class="app-left">
        <div class="app-logo">${String(a.company || "C")
          .slice(0, 1)
          .toUpperCase()}</div>
        <div class="app-meta">
          <div class="app-name">
            ${escapeHtml(a.company || "Company")}
            <span class="app-status ${statusClass}">${cap(statusClass)}</span>
            <span class="app-score">★ ${escapeHtml(
              String(a.score ?? "")
            )}</span>
          </div>
          <div class="app-text">${escapeHtml(a.message || "")}</div>
        </div>
      </div>
      <div class="app-right">
        <button class="app-ic" type="button" aria-label="Info">ⓘ</button>
      </div>
    `;

    row.querySelector(".app-ic")?.addEventListener("click", () => {
      alert(
        `Application\n\n${a.company}\nStatus: ${a.status}\nScore: ${
          a.score
        }\nDate: ${new Date(a.created_at).toLocaleString()}`
      );
    });

    list.appendChild(row);
  });
}

// -----------------------------
// INIT
// -----------------------------
(function main() {
  ensureSession();
  initTheme();
  initLogout();
  initTabs();
  initSkillAdd();
  fillFormFromSaved();
  initProfileSave();
})();
