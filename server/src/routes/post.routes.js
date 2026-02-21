const express = require("express");
const { pool } = require("../db/db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

/* =====================================================
   CREATE POST (Startup only)
===================================================== */
router.post("/", requireAuth, async (req, res) => {
  try {
    if (req.user.role !== "STARTUP") {
      return res.status(403).json({ message: "Only startups can post ideas" });
    }

    const title = String(req.body.title || "").trim();
    const body = String(req.body.body || "").trim();

    if (!title || !body) {
      return res.status(400).json({ message: "title and body required" });
    }

    const { rows } = await pool.query(
      `INSERT INTO posts (author_id, title, body)
       VALUES ($1,$2,$3)
       RETURNING *`,
      [req.user.id, title, body]
    );

    res.json({ post: rows[0] });
  } catch (err) {
    console.error("POST CREATE ERROR:", err);
    res.status(500).json({ message: "Failed to create post" });
  }
});

/* =====================================================
   GET ALL POSTS (Investor feed)
===================================================== */
router.get("/", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT
        p.id,
        p.author_id,
        p.title,
        p.body,
        p.created_at,
        u.full_name,
        u.email,
        COALESCE(COUNT(pi.post_id),0)::int AS interest_count,
        COALESCE(BOOL_OR(pi.investor_id = $1), false) AS liked_by_me
      FROM posts p
      JOIN users u ON u.id = p.author_id
      LEFT JOIN post_interests pi ON pi.post_id = p.id
      WHERE p.is_published = true AND p.is_hidden = false
      GROUP BY p.id, u.full_name, u.email
      ORDER BY p.created_at DESC
      `,
      [req.user.id]
    );

    res.json({ posts: rows });
  } catch (err) {
    console.error("POST LIST ERROR:", err);
    res.status(500).json({ message: "Failed to fetch posts" });
  }
});

/* =====================================================
   GET MY POSTS (Startup dashboard)
===================================================== */
router.get("/mine", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT
        p.id,
        p.author_id,
        p.title,
        p.body,
        p.created_at,
        COALESCE(COUNT(pi.post_id),0)::int AS interest_count
      FROM posts p
      LEFT JOIN post_interests pi ON pi.post_id = p.id
      WHERE p.author_id = $1
      GROUP BY p.id
      ORDER BY p.created_at DESC
      `,
      [req.user.id]
    );

    res.json({ posts: rows });
  } catch (err) {
    console.error("MY POSTS ERROR:", err);
    res.status(500).json({ message: "Failed to fetch my posts" });
  }
});

/* =====================================================
   TOGGLE INTEREST (Investor like)
===================================================== */
router.post("/:id/interested", requireAuth, async (req, res) => {
  try {
    if (req.user.role !== "INVESTOR") {
      return res.status(403).json({ message: "Only investors can like posts" });
    }

    const postId = req.params.id;

    const existing = await pool.query(
      `SELECT 1 FROM post_interests WHERE post_id=$1 AND investor_id=$2`,
      [postId, req.user.id]
    );

    if (existing.rows.length) {
      await pool.query(
        `DELETE FROM post_interests WHERE post_id=$1 AND investor_id=$2`,
        [postId, req.user.id]
      );
      return res.json({ liked: false });
    }

    await pool.query(
      `INSERT INTO post_interests (post_id, investor_id)
       VALUES ($1,$2)`,
      [postId, req.user.id]
    );

    res.json({ liked: true });
  } catch (err) {
    console.error("INTEREST ERROR:", err);
    res.status(500).json({ message: "Failed to update interest" });
  }
});

module.exports = router;
