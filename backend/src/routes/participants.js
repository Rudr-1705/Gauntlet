import express from "express";
import { PrismaClient } from "../generated/prisma/index.js";
import { generateProof } from "../services/aiService.js";

const router = express.Router();
const prisma = new PrismaClient();

/**
 * POST /api/participants/join
 * NEW: Join a challenge by staking PYUSD (hash-based system)
 */
router.post("/join", async (req, res) => {
  try {
    const {
      userEmail,
      challengeId,
      stakeAmount,
      walletAddress,
      // Old format support
      userId
    } = req.body;

    // Support both old and new parameter names
    const email = userEmail || userId;

    // Validation
    if (!email || !challengeId || !stakeAmount || !walletAddress) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: userEmail, challengeId, stakeAmount, walletAddress"
      });
    }

    if (parseFloat(stakeAmount) <= 0) {
      return res.status(400).json({
        success: false,
        error: "Stake amount must be greater than 0 PYUSD"
      });
    }

    // Check if challenge exists and is accepting participants
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      select: {
        id: true,
        title: true,
        status: true,
        chainChallengeId: true,
        sponsorDaoAddress: true
      }
    });

    if (!challenge) {
      return res.status(404).json({
        success: false,
        error: "Challenge not found"
      });
    }

    if (challenge.status !== 'funded' && challenge.status !== 'live' && challenge.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Challenge is not accepting participants (status: ${challenge.status})`
      });
    }

    // Check if user already joined
    const existingParticipant = await prisma.participant.findFirst({
      where: {
        userId: email.toLowerCase(),
        challengeId
      }
    });

    if (existingParticipant) {
      return res.status(400).json({
        success: false,
        error: "You have already joined this challenge"
      });
    }

    // Create participant record
    const participant = await prisma.participant.create({
      data: {
        userId: email.toLowerCase(),
        challengeId,
        stakeAmount: parseFloat(stakeAmount),
        escrowAddress: walletAddress.toLowerCase()
      }
    });

    console.log(`Participant created: ${participant.id}`);

    res.json({
      success: true,
      message: "Successfully joined challenge! Please complete the blockchain transaction.",
      participant: {
        id: participant.id,
        userId: participant.userId,
        challengeId: participant.challengeId,
        stakeAmount: participant.stakeAmount,
        joinedAt: participant.joinedAt
      },
      nextStep: {
        action: "STAKE_ON_BLOCKCHAIN",
        sponsorDaoAddress: challenge.sponsorDaoAddress,
        parameters: {
          chainChallengeId: challenge.chainChallengeId,
          stakeAmount: stakeAmount,
          participantAddress: walletAddress
        }
      }
    });
  } catch (error) {
    console.error("Error joining challenge:", error);
    res.status(500).json({ success: false, error: "Failed to join challenge" });
  }
});

/**
 * PATCH /api/participants/:id/confirm-stake
 * Confirm stake transaction on blockchain
 */
router.patch("/:id/confirm-stake", async (req, res) => {
  try {
    const { id } = req.params;
    const { txHash } = req.body;

    if (!txHash) {
      return res.status(400).json({
        success: false,
        error: "Transaction hash is required"
      });
    }

    const participant = await prisma.participant.update({
      where: { id },
      data: {
        stakeTxHash: txHash
      }
    });

    res.json({
      success: true,
      message: "Stake transaction confirmed",
      participant
    });
  } catch (error) {
    console.error("Error confirming stake:", error);
    res.status(500).json({ success: false, error: "Failed to confirm stake" });
  }
});

/**
 * POST /api/participants/submit
 * LEGACY: Use /api/submissions/submit instead
 * Body: { participantId, challengeId, answerText }
 */
router.post("/submit", async (req, res) => {
  try {
    const { participantId, challengeId, answerText } = req.body;


    const participant = await prisma.participant.findUnique({
      where: { id: participantId },
    });
    if (!participant) return res.status(404).json({ error: "Participant not found" });

    const submission = await prisma.submission.create({
      data: {
        participantId,
        challengeId,
        answerText,
        status: "PROOF_PENDING",
      },
    });

    // Generate zk-proof via ML model(Siddhant karega)
    // const proofResponse = await generateProof({ participantId, challengeId, answerText });
    // For now, mock response:
    const proofResponse = { zkProof: "0xMOCKZKPROOF", valid: true };

    // Send zk-proof to Validator DAO using ethers.js
    let verified = false;
    let validatorTxHash = null;
    try {
      // Import ethers.js and contract ABI/address
      const { ethers } = await import("ethers");
      // Replace with your actual Validator DAO contract ABI and address
      const validatorDaoAbi = [];
      const validatorDaoAddress = process.env.VALIDATOR_DAO_ADDRESS;
      const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
      const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
      const validatorDaoContract = new ethers.Contract(validatorDaoAddress, validatorDaoAbi, wallet);
      // Call contract method to verify proof (replace with actual method)
      // const tx = await validatorDaoContract.verifyProof(submission.id, proofResponse.zkProof);
      // await tx.wait();
      // validatorTxHash = tx.hash;
      validatorTxHash = "0xMOCKVALIDATORTX";
      verified = true; // Set based on contract response
    } catch (err) {
      console.error("Validator DAO contract error:", err);
      verified = false;
    }

    const updatedSubmission = await prisma.submission.update({
      where: { id: submission.id },
      data: {
        status: verified ? "VERIFIED" : "REJECTED",
        validatorTxHash,
      },
    });

    // If verified, trigger escrow payout
    let escrowTxHash = null;
    if (verified) {
      try {
        // Import escrowService
        const { releaseEscrow } = await import("../services/escrowService.js");
        const participant = await prisma.participant.findUnique({ where: { id: participantId }, include: { Challenge: true } });
        const result = await releaseEscrow({
          participantId,
          rewardAmount: participant.Challenge.reward,
          escrowAddress: participant.escrowAddress,
        });
        escrowTxHash = result.txHash;
        // to Update participant record verification ke baad
        await prisma.participant.update({
          where: { id: participantId },
          data: {
            rewardReleased: true,
            rewardTxHash: escrowTxHash,
            verified: true,
          },
        });
      } catch (err) {
        console.error("Escrow payout error:", err);
      }
    }

    return res.status(201).json({
      message: verified ? "Submission verified and reward released." : "Submission rejected.",
      submission: updatedSubmission,
      validatorTxHash,
      escrowTxHash,
    });
  } catch (error) {
    console.error("Error submitting answer:", error);
    return res.status(500).json({ error: "Failed to submit answer" });
  }
});

/**
 * POST /api/participants/validate
 * Trigger proof verification with Validator DAO
 * Body: { proofId }
 */
router.post("/validate", async (req, res) => {
  try {
    // Proof validation handled externally
    return res.json({
      message: "Proof validation is handled externally by the validator DAO.",
    });
  } catch (error) {
    console.error("Error validating proof:", error);
    return res.status(500).json({ error: "Validation failed" });
  }
});

/**
 * GET /api/participants/challenge/:challengeId
 * Get participants and their proofs for a challenge
 */
router.get("/challenge/:challengeId", async (req, res) => {
  try {
    const { challengeId } = req.params;

    const participants = await prisma.participant.findMany({
      where: { challengeId },
      orderBy: { joinedAt: 'desc' },
      include: {
        Submissions: {
          orderBy: { submittedAt: "desc" },
        },
        _count: {
          select: { Submissions: true }
        }
      },
    });

    const safeParticipants = participants.map(p => ({
      id: p.id,
      userId: p.userId,
      stakeAmount: p.stakeAmount,
      verified: p.verified,
      rewardReleased: p.rewardReleased,
      joinedAt: p.joinedAt,
      submissionCount: p._count.Submissions,
      submissions: p.Submissions
    }));

    return res.json({ success: true, participants: safeParticipants });
  } catch (error) {
    console.error("Error fetching participants:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch participants" });
  }
});

/**
 * GET /api/participants/user/:userId
 * Get all participant records for a user (their joined challenges)
 */
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const participants = await prisma.participant.findMany({
      where: { userId: userId.toLowerCase() },
      orderBy: { joinedAt: 'desc' },
      include: {
        Challenge: {
          select: {
            id: true,
            title: true,
            description: true,
            domain: true,
            reward: true,
            status: true
          }
        },
        Submissions: true,
        _count: {
          select: { Submissions: true }
        }
      },
    });

    const safeParticipants = participants.map(p => ({
      id: p.id,
      challengeId: p.challengeId,
      challenge: p.Challenge,
      stakeAmount: p.stakeAmount,
      verified: p.verified,
      rewardReleased: p.rewardReleased,
      rewardTxHash: p.rewardTxHash,
      joinedAt: p.joinedAt,
      submissionCount: p._count.Submissions,
      hasSubmitted: p._count.Submissions > 0,
      submissions: p.Submissions
    }));

    return res.json({ success: true, participants: safeParticipants, records: participants });
  } catch (error) {
    console.error("Error fetching user records:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch user records" });
  }
});

/**
 * GET /api/participants/:id
 * Get a specific participant
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const participant = await prisma.participant.findUnique({
      where: { id },
      include: {
        Challenge: {
          select: {
            id: true,
            title: true,
            domain: true,
            reward: true,
            status: true
          }
        },
        Submissions: {
          orderBy: { submittedAt: 'desc' }
        }
      }
    });

    if (!participant) {
      return res.status(404).json({ success: false, error: "Participant not found" });
    }

    res.json({ success: true, participant });
  } catch (error) {
    console.error("Error fetching participant:", error);
    res.status(500).json({ success: false, error: "Failed to fetch participant" });
  }
});

/**
 * PATCH /api/participants/:id/verify
 * Mark participant as verified (validator DAO only)
 */
router.patch("/:id/verify", async (req, res) => {
  try {
    const { id } = req.params;
    const { verified, rewardTxHash } = req.body;

    const updateData = { verified };
    if (verified && rewardTxHash) {
      updateData.rewardReleased = true;
      updateData.rewardTxHash = rewardTxHash;
    }

    const participant = await prisma.participant.update({
      where: { id },
      data: updateData
    });

    res.json({
      success: true,
      message: verified ? "Participant verified and rewarded" : "Participant marked as unverified",
      participant
    });
  } catch (error) {
    console.error("Error verifying participant:", error);
    res.status(500).json({ success: false, error: "Failed to verify participant" });
  }
});

export default router;