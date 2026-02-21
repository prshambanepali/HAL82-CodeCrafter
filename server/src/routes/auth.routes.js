const express = require("express");
const { pool } = require("../db/db");
const { hashPassword, verifyPassword } = require("../utils/password");
const { signToken } = require("../utils/jwt");

const { OAuth2Client } = require("google-auth-library");
const { GOOGLE_CLIENT_ID } = require("../config/env");

const router = express.Router();

const ROLES = ["INVESTOR", "STARTUP", "INTERN_SEEKER", "INFLUENCER", "ADMIN"];
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

/* ===============================
   Local signup
================================= */
router.post("/signup", async (req, res) => {
  try {
    const { full_name, email, password, role } = req.body;

    if (!email || !password || !role) {
      return res
        .status(400)
        .json({ message: "email, password, role required" });
    }
    if (!ROLES.includes(role) || role === "ADMIN") {
      return res.status(400).json({ message: "Invalid role" });
    }
    if (String(password).length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    const normEmail = String(email).toLowerCase().trim();

    const existing = await pool.query("SELECT id FROM users WHERE email=$1", [
      normEmail,
    ]);
    if (existing.rows[0])
      return res.status(409).json({ message: "Email already in use" });

    const password_hash = await hashPassword(password);

    const { rows } = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, auth_provider)
       VALUES ($1,$2,$3,$4,'local')
       RETURNING id, email, full_name, role, is_active, avatar_url, auth_provider`,
      [full_name || null, normEmail, password_hash, role]
    );

    const user = rows[0];
    const token = signToken({ userId: user.id });

    res.json({ token, user });
  } catch (err) {
    console.error("SIGNUP ERROR:", err);
    res.status(500).json({ message: "Signup failed" });
  }
});

/* ===============================
   Local signin
================================= */
router.post("/signin", async (req, res) => {
  try {
    const { email, password } = req.body;

    const normEmail = String(email || "")
      .toLowerCase()
      .trim();

    const { rows } = await pool.query("SELECT * FROM users WHERE email=$1", [
      normEmail,
    ]);
    const user = rows[0];

    if (!user) return res.status(401).json({ message: "Invalid credentials" });
    if (!user.is_active)
      return res.status(403).json({ message: "Account disabled" });
    if (!user.password_hash) {
      return res
        .status(401)
        .json({ message: "Use Google sign-in for this account" });
    }

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const token = signToken({ userId: user.id });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        is_active: user.is_active,
        avatar_url: user.avatar_url,
        auth_provider: user.auth_provider,
      },
    });
  } catch (err) {
    console.error("SIGNIN ERROR:", err);
    res.status(500).json({ message: "Signin failed" });
  }
});

/* ===============================
   Google verify (id_token)
================================= */
router.post("/google/verify", async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential)
      return res.status(400).json({ message: "Missing credential" });

    // Helpful debug:
    // console.log("GOOGLE_CLIENT_ID:", GOOGLE_CLIENT_ID);

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const googleId = payload.sub;
    const email = String(payload.email || "")
      .toLowerCase()
      .trim();
    const fullName = payload.name || null;
    const avatarUrl = payload.picture || null;

    if (!email)
      return res.status(400).json({ message: "Google account has no email" });

    // Find user by google_id
    let userRow = null;

    const byGoogle = await pool.query(
      "SELECT * FROM users WHERE google_id=$1",
      [googleId]
    );
    if (byGoogle.rows[0]) userRow = byGoogle.rows[0];

    // If not found, link by email
    if (!userRow) {
      const byEmail = await pool.query("SELECT * FROM users WHERE email=$1", [
        email,
      ]);

      if (byEmail.rows[0]) {
        userRow = byEmail.rows[0];

        await pool.query(
          `UPDATE users
           SET google_id=$1,
               auth_provider='google',
               avatar_url=COALESCE(avatar_url,$2),
               full_name=COALESCE(full_name,$3),
               updated_at=NOW()
           WHERE id=$4`,
          [googleId, avatarUrl, fullName, userRow.id]
        );

        const linked = await pool.query("SELECT * FROM users WHERE id=$1", [
          userRow.id,
        ]);
        userRow = linked.rows[0];
      }
    }

    // Create if not exists
    if (!userRow) {
      const created = await pool.query(
        `INSERT INTO users (full_name, email, google_id, avatar_url, role, auth_provider)
         VALUES ($1,$2,$3,$4,'INTERN_SEEKER','google')
         RETURNING *`,
        [fullName, email, googleId, avatarUrl]
      );
      userRow = created.rows[0];
    }

    if (!userRow.is_active)
      return res.status(403).json({ message: "Account disabled" });

    const token = signToken({ userId: userRow.id });

    res.json({
      token,
      user: {
        id: userRow.id,
        email: userRow.email,
        full_name: userRow.full_name,
        role: userRow.role,
        is_active: userRow.is_active,
        avatar_url: userRow.avatar_url,
        auth_provider: userRow.auth_provider,
      },
    });
  } catch (err) {
    console.error("GOOGLE VERIFY ERROR:", err);
    // Common actual reasons:
    // - wrong GOOGLE_CLIENT_ID
    // - wrong origin in Google Cloud console
    // - credential is not ID token
    res.status(401).json({ message: "Google token verification failed" });
  }
});

module.exports = router;
