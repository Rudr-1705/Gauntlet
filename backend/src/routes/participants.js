import express from "express";
import crypto from "crypto";
import { PrismaClient } from "../generated/prisma/index.js";
import { generateProof } from "../services/aiService.js";
import { verifyParticipantAnswer, releaseReward } from "../services/answerVerificationService.js";

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
      answer, // Plain text answer from user
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

    if (!answer || answer.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Answer is required"
      });
    }

    if (parseFloat(stakeAmount) <= 0) {
      return res.status(400).json({
        success: false,
        error: "Stake amount must be greater than 0 PYUSD"
      });
    }

    // Hash the answer on backend for security
    const answerHash = '0x' + crypto
      .createHash('sha256')
      .update(answer.trim().toLowerCase())
      .digest('hex');

    console.log('Answer hashed:', answerHash);

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

    // Check if user already joined (using wallet address as userId for blockchain integration)
    const existingParticipant = await prisma.participant.findFirst({
      where: {
        userId: walletAddress.toLowerCase(),
        challengeId
      }
    });

    if (existingParticipant) {
      return res.status(400).json({
        success: false,
        error: "You have already joined this challenge"
      });
    }

    // Create participant record (userId is the wallet address for blockchain integration)
    const participant = await prisma.participant.create({
      data: {
        userId: walletAddress.toLowerCase(), // Use wallet address as userId
        challengeId,
        stakeAmount: parseFloat(stakeAmount),
        walletAddress: walletAddress.toLowerCase(),
        status: 'PENDING' // Will become STAKED after blockchain confirmation
      }
    });

    // Create submission record with the answer hash
    const submission = await prisma.submission.create({
      data: {
        participantId: participant.id,
        challengeId,
        answerHash: answerHash,
        answerText: answer.trim(), // Store plain answer for DAO verification
        status: 'PENDING'
      }
    });

    console.log(`Participant created: ${participant.id}, Submission created: ${submission.id}`);

    // TODO: Emit event to DAO smart contract for verification
    // This will be handled when we integrate with ValidatorDAO
    // The DAO will:
    // 1. Listen for ParticipantJoined event
    // 2. Verify the answer hash against challenge's correct answer hash
    // 3. If correct: trigger SponsorDAO to release reward
    // 4. If incorrect: participant loses their stake

    res.json({
      success: true,
      message: "Successfully joined challenge! Please complete the blockchain transaction to stake your PYUSD.",
      participant: {
        id: participant.id,
        userId: participant.userId,
        challengeId: participant.challengeId,
        stakeAmount: participant.stakeAmount,
        joinedAt: participant.joinedAt,
        walletAddress: participant.walletAddress
      },
      submission: {
        id: submission.id,
        answerHash: answerHash,
        status: submission.status
      },
      nextStep: {
        action: "FUND_CHALLENGE_ON_BLOCKCHAIN",
        description: "Call SponsorDAO.fundChallenge() to stake PYUSD. Answer hash is NOT sent to contract - stored only in backend DB. Your wallet address is automatically captured via msg.sender.",
        sponsorDaoAddress: challenge.sponsorDaoAddress,
        parameters: {
          chainChallengeId: challenge.chainChallengeId,
          amount: stakeAmount
        },
        notes: {
          answerHash: answerHash, // Backend keeps this for verification
          participantAddress: walletAddress, // Automatically sent as msg.sender when you call fundChallenge
          verification: "After staking, backend will submit your answer hash to ValidatorDAO for verification"
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


    // Call ValidatorDAO to verify the answer on-chain
    // ValidatorDAO will compare answer hashes and call SponsorDAO.completeChallenge() if correct
    const validatorService = await import("../services/validatorService.js");
    
    // Get the challenge data needed for blockchain verification
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId }
    });

    // Check if challenge exists on blockchain
    if (!challenge.chainChallengeId) {
      console.error(`❌ Challenge "${challenge.title}" has no chainChallengeId - it was never created on blockchain!`);
      return res.status(400).json({
        success: false,
        error: `This challenge was never created on the blockchain and cannot verify answers. Please join a different challenge or ask the creator to create a new one. (Old challenges before the blockchain integration update cannot be used)`,
        details: {
          challengeTitle: challenge.title,
          issue: "chainChallengeId is null",
          solution: "Create a NEW challenge - the updated frontend will automatically create it on-chain"
        }
      });
    }

    const validationResult = await validatorService.submitToValidatorDAO(
      submission,
      challenge,
      participant
    );

    if (!validationResult.success) {
      return res.status(500).json({
        success: false,
        error: "Failed to verify answer on blockchain: " + (validationResult.error || "Unknown error")
      });
    }

    const updatedSubmission = await prisma.submission.update({
      where: { id: submission.id },
      data: {
        status: validationResult.isCorrect ? "VERIFIED" : "REJECTED",
        validatorTxHash: validationResult.txHash,
      },
    });

    // Note: Reward payout is handled by SponsorDAO.completeChallenge() automatically
    // ValidatorDAO calls SponsorDAO.completeChallenge(challengeId, winner) on-chain
    // SponsorDAO transfers all staked PYUSD to the winner's wallet
    // Backend listeners will catch ChallengeCompleted event and update participant status

    return res.status(201).json({
      success: true,
      message: validationResult.isCorrect ? "Answer verified as CORRECT! Reward will be released by SponsorDAO" : "Answer verified as INCORRECT.",
      submission: updatedSubmission,
      validatorTxHash: validationResult.txHash,
      isCorrect: validationResult.isCorrect
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
      status: p.status,
      walletAddress: p.walletAddress,
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
      status: p.status,
      walletAddress: p.walletAddress,
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
 * Note: Status is now handled via the 'status' field (WINNER/LOSER)
 */
router.patch("/:id/verify", async (req, res) => {
  try {
    const { id } = req.params;
    const { verified, rewardTxHash } = req.body;

    const updateData = { 
      status: verified ? "WINNER" : "LOSER"
    };
    if (verified && rewardTxHash) {
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

/**
 * POST /api/participants/:id/verify-answer
 * Verify participant's answer (simulates ValidatorDAO smart contract)
 * This is for testing before smart contract integration
 */
router.post("/:id/verify-answer", async (req, res) => {
  try {
    const { id } = req.params;

    // Get participant
    const participant = await prisma.participant.findUnique({
      where: { id },
      select: {
        id: true,
        challengeId: true,
        userId: true
      }
    });

    if (!participant) {
      return res.status(404).json({
        success: false,
        error: "Participant not found"
      });
    }

    // Verify answer
    const verificationResult = await verifyParticipantAnswer(id, participant.challengeId);

    if (!verificationResult.success) {
      return res.status(400).json(verificationResult);
    }

    // If answer is correct, release reward
    if (verificationResult.isCorrect) {
      const rewardResult = await releaseReward(id);
      
      return res.json({
        success: true,
        message: "Answer verified and reward released!",
        verification: verificationResult,
        reward: rewardResult
      });
    }

    // Answer was incorrect
    return res.json({
      success: true,
      message: "Answer verification completed",
      verification: verificationResult
    });

  } catch (error) {
    console.error("Error verifying answer:", error);
    res.status(500).json({ success: false, error: "Failed to verify answer" });
  }
});

export default router;