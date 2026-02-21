const express = require("express");
const { pool } = require("../db/db"); // ✅ adjust if your db file path differs
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

/* =========================================
   CREATE CAMPAIGN (Startup only)
========================================= */
router.post("/", requireAuth, async (req, res) => {
  try {
    if (req.user.role !== "STARTUP") {
      return res
        .status(403)
        .json({ error: "Only startups can create campaigns" });
    }

    const {
      name,
      description,
      market,
      revenueModel,
      revenue_model,
      fundingGoal,
      funding_goal,
      minInvestment,
      min_investment,
      coverUrl,
      cover_url,
      location,
      foundedYear,
      founded_year,
      teamExp,
      team_exp,
    } = req.body;

    const finalRevenueModel = revenueModel ?? revenue_model;
    const finalFundingGoal = fundingGoal ?? funding_goal;
    const finalMinInvestment = minInvestment ?? min_investment ?? 250;
    const finalCoverUrl = coverUrl ?? cover_url ?? null;
    const finalFoundedYear = foundedYear ?? founded_year ?? null;
    const finalTeamExp = teamExp ?? team_exp ?? null;

    if (
      !name ||
      !description ||
      !market ||
      !finalRevenueModel ||
      !finalFundingGoal
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const result = await pool.query(
      `INSERT INTO campaigns
        (startup_user_id, name, description, market, revenue_model, funding_goal,
         min_investment, cover_url, location, founded_year, team_exp)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        req.user.id,
        name,
        description,
        market,
        finalRevenueModel,
        finalFundingGoal,
        finalMinInvestment,
        finalCoverUrl,
        location || null,
        finalFoundedYear,
        finalTeamExp,
      ]
    );

    res.json({ campaign: result.rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create campaign" });
  }
});

/* =========================================
   GET ALL CAMPAIGNS (Investor Dashboard)
========================================= */
router.get("/", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        c.*,
        COALESCE(SUM(i.amount),0) AS raised,
        COUNT(DISTINCT i.investor_user_id) AS investors
      FROM campaigns c
      LEFT JOIN investments i ON i.campaign_id = c.id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);

    const campaigns = result.rows.map((c) => ({
      ...c,
      percent_funded:
        Number(c.funding_goal) > 0
          ? Math.min(100, (Number(c.raised) / Number(c.funding_goal)) * 100)
          : 0,
    }));

    res.json({ campaigns });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch campaigns" });
  }
});

/* =========================================
   GET MY CAMPAIGNS (Startup Dashboard)
========================================= */
router.get("/mine", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        c.*,
        COALESCE(SUM(i.amount),0) AS raised,
        COUNT(DISTINCT i.investor_user_id) AS investors
      FROM campaigns c
      LEFT JOIN investments i ON i.campaign_id = c.id
      WHERE c.startup_user_id = $1
      GROUP BY c.id
      ORDER BY c.created_at DESC
      `,
      [req.user.id]
    );

    const campaigns = result.rows.map((c) => ({
      ...c,
      percent_funded:
        Number(c.funding_goal) > 0
          ? Math.min(100, (Number(c.raised) / Number(c.funding_goal)) * 100)
          : 0,
    }));

    res.json({ campaigns });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch your campaigns" });
  }
});

/* =========================================
   GET SINGLE CAMPAIGN
========================================= */
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT
        c.*,
        COALESCE(SUM(i.amount),0) AS raised,
        COUNT(DISTINCT i.investor_user_id) AS investors
      FROM campaigns c
      LEFT JOIN investments i ON i.campaign_id = c.id
      WHERE c.id = $1
      GROUP BY c.id
      `,
      [id]
    );

    if (!result.rows.length)
      return res.status(404).json({ error: "Campaign not found" });

    const c = result.rows[0];
    c.percent_funded =
      Number(c.funding_goal) > 0
        ? Math.min(100, (Number(c.raised) / Number(c.funding_goal)) * 100)
        : 0;

    res.json({ campaign: c });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch campaign" });
  }
});

/* =========================================
   INVEST
========================================= */
router.post("/:id/invest", requireAuth, async (req, res) => {
  try {
    if (req.user.role !== "INVESTOR") {
      return res.status(403).json({ error: "Only investors can invest" });
    }

    const { id } = req.params;
    const amount = Number(req.body.amount || 0);

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    // Optional: ensure meets min_investment
    const campaignRes = await pool.query(
      `SELECT min_investment FROM campaigns WHERE id=$1`,
      [id]
    );
    if (!campaignRes.rows.length)
      return res.status(404).json({ error: "Campaign not found" });

    const minInv = Number(campaignRes.rows[0].min_investment || 0);
    if (amount < minInv) {
      return res.status(400).json({ error: `Minimum investment is ${minInv}` });
    }

    await pool.query(
      `INSERT INTO investments (campaign_id, investor_user_id, amount)
       VALUES ($1,$2,$3)`,
      [id, req.user.id, amount]
    );

    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Investment failed" });
  }
});

// POST /api/campaigns/:id/analyze
router.post("/:id/analyze", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // fetch campaign + metrics from DB
    const r = await pool.query(
      `SELECT *
       FROM campaigns
       WHERE id = $1`,
      [id]
    );

    if (!r.rows.length)
      return res.status(404).json({ error: "Campaign not found" });

    const c = r.rows[0];

    // ✅ metrics_input can come from DB columns OR JSONB column
    // If you stored a JSONB payload:
    // const payload = c.payload;
    // const metrics = payload.metrics_input;

    // If you stored metrics as columns:
    const metrics = {
      tam: Number(c.tam || 0),
      cagr: Number(c.cagr || 0),
      lastRevenue: Number(c.last_revenue || 0),
      currentRevenue: Number(c.current_revenue || 0),
      expenses: Number(c.expenses || 0),
      cash: Number(c.cash || 0),
      grossMargin: Number(c.gross_margin || 0),
      activeUsers: Number(c.active_users || 0),
    };

    function clamp(n, min, max) {
      const x = Number(n);
      if (!Number.isFinite(x)) return min;
      return Math.min(max, Math.max(min, x));
    }
    function round2(n) {
      const x = Number(n);
      if (!Number.isFinite(x)) return 0;
      return Math.round(x * 100) / 100;
    }

    // ======= ANALYSIS =======
    const lastRevenue = metrics.lastRevenue;
    const currentRevenue = metrics.currentRevenue;
    const expenses = metrics.expenses;
    const cash = metrics.cash;
    const grossMargin = metrics.grossMargin;
    const cagr = metrics.cagr;
    const tam = metrics.tam;

    const growthRate =
      lastRevenue > 0
        ? ((currentRevenue - lastRevenue) / lastRevenue) * 100
        : 0;

    const burnRate = expenses - currentRevenue;
    const runwayMonths = burnRate > 0 ? cash / burnRate : 999;

    const expectedProfit = currentRevenue * (grossMargin / 100);
    const forecast12mRevenue = currentRevenue * (1 + cagr / 100);

    const tamScore = tam <= 0 ? 0 : clamp((Math.log10(tam) / 10) * 100, 0, 40);
    const cagrScore = clamp((cagr / 30) * 30, 0, 30);
    const burnPenalty =
      burnRate > 0 ? clamp((burnRate / 20000) * 30, 0, 30) : 0;
    const marketScore = clamp(tamScore + cagrScore - burnPenalty, 0, 100);

    const analysis = {
      marketScore: round2(marketScore),
      growthRate: round2(growthRate),
      burnRate: round2(burnRate),
      runwayMonths: round2(runwayMonths),
      lastRevenue: round2(lastRevenue),
      expectedProfit: round2(expectedProfit),
      forecast12mRevenue: round2(forecast12mRevenue),
    };

    // Optional: save analysis back into DB (recommended)
    await pool.query(`UPDATE campaigns SET analysis = $1 WHERE id = $2`, [
      analysis,
      id,
    ]);

    res.json({ analysis });
  } catch (err) {
    console.error("ANALYZE ERROR:", err);
    res.status(500).json({ error: "Failed to analyze campaign" });
  }
});
module.exports = router;
