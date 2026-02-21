// influencer.js (NO BACKEND) — publish influencer profiles to startup directory

const LS = {
  session: "ut_session",
  userId: "ut_user_id",
  theme: "ut_theme",
  influencerProfile: "ut_influencer_profile",
  influencerDirectory: "ut_influencer_directory",
};

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

function setTheme(theme) {
  document.body.dataset.theme = theme;
  localStorage.setItem(LS.theme, theme);
}

function initTheme() {
  const saved = localStorage.getItem(LS.theme);
  if (saved) setTheme(saved);

  $(".inf-icon")?.addEventListener("click", () => {
    const cur = document.body.dataset.theme === "dark" ? "dark" : "light";
    setTheme(cur === "dark" ? "light" : "dark");
  });
}

function getOrCreateUserId() {
  let id = localStorage.getItem(LS.userId);
  if (!id) {
    id = "u_" + crypto.getRandomValues(new Uint32Array(4)).join("_");
    localStorage.setItem(LS.userId, id);
  }
  return id;
}

function ensureSession() {
  let session = localStorage.getItem(LS.session);
  if (!session) {
    const uid = getOrCreateUserId();
    session = JSON.stringify({
      role: "INFLUENCER",
      uid,
      email: `${uid}@local.test`,
      full_name: "Influencer User",
      created_at: new Date().toISOString(),
    });
    localStorage.setItem(LS.session, session);
  }
  const obj = JSON.parse(session);
  // keep role consistent
  obj.role = "INFLUENCER";
  localStorage.setItem(LS.session, JSON.stringify(obj));
  return obj;
}

function logout() {
  localStorage.removeItem(LS.session);
  window.location.href = "../index.html";
}

function initialsFrom(name) {
  return (
    String(name || "I")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() || "")
      .join("") || "I"
  );
}

function safeText(sel, value, fallback = "—") {
  const el = $(sel);
  if (!el) return;
  el.textContent = value ?? fallback;
}

function loadProfileLocal() {
  const session = ensureSession();
  const saved = localStorage.getItem(LS.influencerProfile);

  const profile = saved
    ? JSON.parse(saved)
    : {
        full_name: session.full_name || "Influencer User",
        handle: session.email ? `@${session.email.split("@")[0]}` : "@creator",
        bio: "Welcome to UdyamTank.",
        niche: "Tech & Startups",
        availability: "Available",
        followers: "0",
        engagement: "0%",
        avgViews: "0",
      };

  return profile;
}

function renderInfluencerUI(profile) {
  // Your influencer.html uses these classes (from your earlier UI)
  safeText(".profile-name", profile.full_name);
  safeText(".profile-handle", profile.handle);
  safeText(".profile-bio", profile.bio);

  const av = $(".avatar span");
  if (av) av.textContent = initialsFrom(profile.full_name);

  const nums = document.querySelectorAll(".reach-num");
  if (nums?.length >= 3) {
    nums[0].textContent = profile.followers || nums[0].textContent;
    nums[1].textContent = profile.engagement || nums[1].textContent;
    nums[2].textContent = profile.avgViews || nums[2].textContent;
  }
}

function getDirectory() {
  const raw = localStorage.getItem(LS.influencerDirectory);
  return raw ? JSON.parse(raw) : [];
}

function saveToDirectory(profile) {
  const session = ensureSession();
  const id = session.uid || getOrCreateUserId();

  const record = {
    id,
    ...profile,
    email: session.email || "",
    role: "INFLUENCER",
    saved_at: new Date().toISOString(),
  };

  const list = getDirectory();
  const idx = list.findIndex((x) => x.id === id);
  if (idx >= 0) list[idx] = record;
  else list.unshift(record);

  localStorage.setItem(LS.influencerDirectory, JSON.stringify(list));
  localStorage.setItem(LS.influencerProfile, JSON.stringify(profile));
}

function promptEditProfile(existing) {
  const full_name =
    prompt("Full Name", existing.full_name || "") ?? existing.full_name;
  const handle =
    prompt("Handle (e.g. @name)", existing.handle || "") ?? existing.handle;
  const bio = prompt("Bio", existing.bio || "") ?? existing.bio;
  const niche =
    prompt("Niche (e.g. Fashion/Tech/Fitness)", existing.niche || "") ??
    existing.niche;

  const followers =
    prompt("Followers (e.g. 12.4K)", existing.followers || "") ??
    existing.followers;
  const engagement =
    prompt("Engagement (e.g. 4.8%)", existing.engagement || "") ??
    existing.engagement;
  const avgViews =
    prompt("Avg Views (e.g. 8.2K)", existing.avgViews || "") ??
    existing.avgViews;

  const availability =
    prompt(
      "Availability (e.g. Available / Busy)",
      existing.availability || ""
    ) ?? existing.availability;

  return {
    full_name,
    handle,
    bio,
    niche,
    followers,
    engagement,
    avgViews,
    availability,
  };
}

function initPublishButton(profile) {
  // If your influencer.html has a "Hire Me" button, we can reuse it too.
  const publishBtn = document.getElementById("publishInfluencerBtn");
  const hireBtn = document.querySelector(".hire-btn");

  const handler = () => {
    const updated = promptEditProfile(profile);
    saveToDirectory(updated);
    renderInfluencerUI(updated);
    alert(
      "✅ Influencer profile published! (Startup → Hire Influencers will show it)"
    );
  };

  publishBtn?.addEventListener("click", handler);
  hireBtn?.addEventListener("click", handler); // optional reuse
}

(function main() {
  initTheme();
  document.getElementById("logout")?.addEventListener("click", logout);

  const profile = loadProfileLocal();
  renderInfluencerUI(profile);
  initPublishButton(profile);
})();
