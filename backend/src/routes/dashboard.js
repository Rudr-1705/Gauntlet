import express from "express";
import { getPlatformStats, getChallengeStats, getUserActivity } from "../services/graphService.js";

const router = express.Router();

/**GET /api/dashboard/overview ,,Returns global platform stats — total users, challenges, proofs, etc.*/
router.get("/overview", async (req, res) => {
  try {
    const stats = await getPlatformStats();
    return res.json({ success: true, stats });
  } catch (error) {
    console.error("Dashboard overview error:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch overview stats" });
  }
});

/**GET /api/dashboard/challenge/:challengeId,,Returns analytics for a specific challenge (participant count, proofs, etc.)*/
router.get("/challenge/:challengeId", async (req, res) => {
  try {
    const { challengeId } = req.params;
    const data = await getChallengeStats(challengeId);
    return res.json({ success: true, challenge: data });
  } catch (error) {
    console.error("Dashboard challenge error:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch challenge stats" });
  }
});

/*GET /api/dashboard/user/:userId, Returns participation summary for a user*/
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const activity = await getUserActivity(userId);
    return res.json({ success: true, user: activity });
  } catch (error) {
    console.error("Dashboard user error:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch user stats" });
  }
});

export default router;
