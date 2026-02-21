const { verifyToken } = require("../utils/jwt");
const { pool } = require("../db/db"); // ✅ FIXED

async function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: "Missing token" });
    }

    const decoded = verifyToken(token);

    const { rows } = await pool.query(
      "SELECT id, email, full_name, role, is_active, avatar_url, auth_provider FROM users WHERE id=$1",
      [decoded.userId]
    );

    if (!rows[0]) {
      return res.status(401).json({ message: "User not found" });
    }

    if (!rows[0].is_active) {
      return res.status(403).json({ message: "Account disabled" });
    }

    req.user = rows[0];
    next();
  } catch (err) {
    console.error("AUTH ERROR:", err); // 👈 helpful for debugging
    return res.status(401).json({ message: "Invalid token" });
  }
}

module.exports = { requireAuth };
