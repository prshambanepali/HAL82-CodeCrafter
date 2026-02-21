// ../js/posts.js
// NO BACKEND: convert ut_pitches -> posts for investor dashboard
// Also supports updating raised_amount in the same localStorage.

const LS_PITCHES = "ut_pitches";

function safeParse(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function safeString(x) {
  return String(x ?? "").trim();
}

// Supports: "500000", "$500,000", "USD 500000", "500k", "0.5m"
export function parseFundingNumber(fundingText) {
  const s = safeString(fundingText).toLowerCase().replace(/,/g, "");
  if (!s) return 0;

  const k = s.match(/([\d.]+)\s*k/);
  if (k) return Math.round(Number(k[1]) * 1000);

  const m = s.match(/([\d.]+)\s*m/);
  if (m) return Math.round(Number(m[1]) * 1000000);

  const n = s.match(/[\d.]+/);
  return n ? Number(n[0]) : 0;
}

export function readPitches() {
  return safeParse(localStorage.getItem(LS_PITCHES), []);
}

export function writePitches(pitches) {
  localStorage.setItem(LS_PITCHES, JSON.stringify(pitches || []));
}

export function listPosts() {
  const pitches = readPitches();

  return pitches.map((p, idx) => {
    // stable local id
    const id = p.id || `pitch_${idx}_${p.createdAt || Date.now()}`;

    // goal from funding ask
    const goal = parseFundingNumber(p?.startup?.funding);

    // raised amount stored in payload (if not present, default 0)
    const raised = Number(p?.raised_amount ?? 0);

    return {
      id,
      title: p?.startup?.name || "Untitled Startup",
      body: p?.startup?.description || "",
      funding_goal: Number.isFinite(goal) ? goal : 0,
      raised_amount: Number.isFinite(raised) ? raised : 0,
      created_at: p?.createdAt || new Date().toISOString(),

      // keep original pitch for later if you need campaign detail page
      _pitch: p,
    };
  });
}

// Update raised_amount for a pitch by id (persistent in localStorage)
export function investInPost(postId, amount) {
  const pitches = readPitches();

  // find pitch by saved id or by computed id
  let foundIndex = -1;

  for (let i = 0; i < pitches.length; i++) {
    const p = pitches[i];
    const computed = p.id || `pitch_${i}_${p.createdAt || ""}`;
    if (p.id === postId || computed === postId) {
      foundIndex = i;
      break;
    }
  }

  if (foundIndex === -1) return false;

  const p = pitches[foundIndex];
  const curr = Number(p.raised_amount ?? 0);
  p.raised_amount = curr + Number(amount || 0);

  // also store id to keep stable
  if (!p.id) p.id = postId;

  pitches[foundIndex] = p;
  writePitches(pitches);
  return true;
}

// Optional: reset raised_amount (used by reset button)
export function resetRaised(postId) {
  const pitches = readPitches();
  for (let i = 0; i < pitches.length; i++) {
    const p = pitches[i];
    const computed = p.id || `pitch_${i}_${p.createdAt || ""}`;
    if (p.id === postId || computed === postId) {
      p.raised_amount = 0;
      if (!p.id) p.id = postId;
      writePitches(pitches);
      return true;
    }
  }
  return false;
}