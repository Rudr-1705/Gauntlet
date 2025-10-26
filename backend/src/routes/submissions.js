import express from "express";
import { PrismaClient } from "../generated/prisma/index.js";
import { generateSHA256Hash, compareHashes } from "../utils/hashUtils.js";
import { 
  submitToValidatorDAO, 
  processValidatorResponse, 
  getChallengeEvents,
  getSubmissionStatus 
} from "../services/validatorService.js";

const router = express.Router();
const prisma = new PrismaClient();

/**
 * POST /api/submissions/submit
 * Submit an answer to a challenge
 */
router.post("/submit", async (req, res) => {
  try {
    const {
      challengeId,
      participantEmail,
      answer, // The participant's answer (will be hashed)
      proofURI // Optional: IPFS link or additional proof
    } = req.body;

    // Validation
    if (!challengeId || !participantEmail || !answer) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: challengeId, participantEmail, answer"
      });
    }

    // Check if challenge exists
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      select: {
        id: true,
        title: true,
        status: true,
        correctAnswerHash: true,
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

    if (challenge.status !== 'funded' && challenge.status !== 'live') {
      return res.status(400).json({
        success: false,
        error: `Challenge is not accepting submissions (status: ${challenge.status})`
      });
    }

    // Check if participant exists and has staked
    const participant = await prisma.participant.findFirst({
      where: {
        challengeId,
        userId: participantEmail.toLowerCase()
      }
    });

    if (!participant) {
      return res.status(403).json({
        success: false,
        error: "You must participate and stake PYUSD before submitting an answer"
      });
    }

    // Check if participant already submitted
    const existingSubmission = await prisma.submission.findFirst({
      where: {
        challengeId,
        participantId: participant.id
      }
    });

    if (existingSubmission) {
      return res.status(400).json({
        success: false,
        error: "You have already submitted an answer for this challenge"
      });
    }

    // Generate hash of participant's answer
    const answerHash = generateSHA256Hash(answer);
    console.log(`Generated submission hash for participant ${participantEmail}`);

    // Create submission
    const submission = await prisma.submission.create({
      data: {
        challengeId,
        participantId: participant.id,
        answerHash,
        answerText: null, // Don't store plain answer for security
        proofURI,
        status: 'PENDING' // Will be updated immediately after smart contract call
      }
    });

    console.log(`Submission created: ${submission.id}`);

    // Submit to ValidatorDAO smart contract
    // This calls ValidatorDAO.submitAnswer() which:
    // 1. Emits AnswerSubmitted(challengeId, participant, isCorrect)
    // 2. If correct: calls SponsorDAO.completeChallenge() to transfer PYUSD
    // 3. If correct: emits WinnerFound(challengeId, winner)
    const validatorResult = await submitToValidatorDAO(submission, challenge, participant);
    
    console.log(`ValidatorDAO response:`, validatorResult);

    // Process the smart contract response
    // If answer was correct, the smart contract already:
    // - Verified the challenge in SponsorDAO
    // - Transferred PYUSD to winner
    // - Emitted WinnerFound event
    // We just need to update our database
    if (validatorResult.isCorrect) {
      setTimeout(async () => {
        try {
          await processValidatorResponse(submission.id, true, validatorResult.txHash);
        } catch (error) {
          console.error('Error processing validator response:', error);
        }
      }, 1000); // Small delay to simulate blockchain confirmation
    }

    res.json({
      success: true,
      message: validatorResult.isCorrect 
        ? "🎉 Answer CORRECT! PYUSD reward is being transferred..." 
        : "Answer submitted - verification result will be available shortly",
      submission: {
        id: submission.id,
        challengeId: submission.challengeId,
        participantId: submission.participantId,
        answerHash: submission.answerHash,
        status: validatorResult.isCorrect ? 'VERIFIED' : 'REJECTED',
        submittedAt: submission.submittedAt,
        validatorTxHash: validatorResult.txHash
      },
      result: {
        isCorrect: validatorResult.isCorrect,
        message: validatorResult.message
      },
      nextSteps: {
        checkStatus: `/api/submissions/status/${submission.id}`,
        pollEvents: `/api/submissions/events/${challengeId}`
      }
    });
  } catch (error) {
    console.error("Error submitting answer:", error);
    res.status(500).json({ success: false, error: "Failed to submit answer" });
  }
});

/**
 * GET /api/submissions/challenge/:challengeId
 * Get all submissions for a challenge (admin/creator only)
 */
router.get("/challenge/:challengeId", async (req, res) => {
  try {
    const { challengeId } = req.params;
    const { requesterEmail } = req.query;

    // Verify requester is the challenge creator
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      select: { creator: true }
    });

    if (!challenge) {
      return res.status(404).json({ success: false, error: "Challenge not found" });
    }

    if (challenge.creator !== requesterEmail?.toLowerCase()) {
      return res.status(403).json({
        success: false,
        error: "Only the challenge creator can view all submissions"
      });
    }

    const submissions = await prisma.submission.findMany({
      where: { challengeId },
      include: {
        Participant: {
          select: {
            userId: true,
            stakeAmount: true,
            status: true,
            walletAddress: true
          }
        }
      },
      orderBy: { submittedAt: 'desc' }
    });

    res.json({ success: true, submissions });
  } catch (error) {
    console.error("Error fetching submissions:", error);
    res.status(500).json({ success: false, error: "Failed to fetch submissions" });
  }
});

/**
 * GET /api/submissions/participant/:participantId
 * Get all submissions by a participant
 */
router.get("/participant/:participantId", async (req, res) => {
  try {
    const { participantId } = req.params;

    const submissions = await prisma.submission.findMany({
      where: { participantId },
      include: {
        Challenge: {
          select: {
            id: true,
            title: true,
            domain: true,
            reward: true,
            status: true
          }
        }
      },
      orderBy: { submittedAt: 'desc' }
    });

    res.json({ success: true, submissions });
  } catch (error) {
    console.error("Error fetching participant submissions:", error);
    res.status(500).json({ success: false, error: "Failed to fetch submissions" });
  }
});

/**
 * GET /api/submissions/user/:email
 * Get all submissions by a user (by email)
 */
router.get("/user/:email", async (req, res) => {
  try {
    const { email } = req.params;

    // Find all participants for this user
    const participants = await prisma.participant.findMany({
      where: { userId: email.toLowerCase() },
      select: { id: true }
    });

    const participantIds = participants.map(p => p.id);

    const submissions = await prisma.submission.findMany({
      where: {
        participantId: {
          in: participantIds
        }
      },
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
        Participant: {
          select: {
            stakeAmount: true,
            status: true,
            walletAddress: true,
            rewardTxHash: true
          }
        }
      },
      orderBy: { submittedAt: 'desc' }
    });

    res.json({ success: true, submissions });
  } catch (error) {
    console.error("Error fetching user submissions:", error);
    res.status(500).json({ success: false, error: "Failed to fetch submissions" });
  }
});

/**
 * PATCH /api/submissions/:id/status
 * Update submission status (validator DAO only)
 */
router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, validatorTxHash } = req.body;

    const submission = await prisma.submission.update({
      where: { id },
      data: {
        status,
        validatorTxHash
      }
    });

    // If verified, update participant to WINNER status
    if (status === 'VERIFIED') {
      await prisma.participant.update({
        where: { id: submission.participantId },
        data: { status: 'WINNER' }
      });
    }

    res.json({
      success: true,
      message: `Submission status updated to ${status}`,
      submission
    });
  } catch (error) {
    console.error("Error updating submission status:", error);
    res.status(500).json({ success: false, error: "Failed to update submission" });
  }
});

/**
 * GET /api/submissions/:id
 * Get a specific submission
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const submission = await prisma.submission.findUnique({
      where: { id },
      include: {
        Challenge: {
          select: {
            id: true,
            title: true,
            domain: true,
            reward: true,
            status: true,
            creator: true
          }
        },
        Participant: {
          select: {
            userId: true,
            stakeAmount: true,
            status: true,
            walletAddress: true,
            rewardTxHash: true
          }
        }
      }
    });

    if (!submission) {
      return res.status(404).json({ success: false, error: "Submission not found" });
    }

    res.json({ success: true, submission });
  } catch (error) {
    console.error("Error fetching submission:", error);
    res.status(500).json({ success: false, error: "Failed to fetch submission" });
  }
});

/**
 * GET /api/submissions/status/:submissionId
 * Get detailed status of a submission with related events
 * Used by frontend to poll for updates
 */
router.get("/status/:submissionId", async (req, res) => {
  try {
    const { submissionId } = req.params;
    
    const statusData = await getSubmissionStatus(submissionId);
    
    res.json({
      success: true,
      ...statusData
    });
  } catch (error) {
    console.error("Error fetching submission status:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message || "Failed to fetch submission status" 
    });
  }
});

/**
 * GET /api/submissions/events/:challengeId
 * Get all events for a challenge (useful events: ANSWER_SUBMITTED, CHALLENGE_COMPLETED)
 * Frontend polls this endpoint for status updates
 */
router.get("/events/:challengeId", async (req, res) => {
  try {
    const { challengeId } = req.params;
    const { types } = req.query; // Optional: filter by event types
    
    let eventTypes = null;
    if (types) {
      eventTypes = types.split(',');
    }
    
    const events = await getChallengeEvents(challengeId, eventTypes);
    
    res.json({
      success: true,
      challengeId,
      events,
      eventCount: events.length
    });
  } catch (error) {
    console.error("Error fetching challenge events:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch challenge events" 
    });
  }
});

/**
 * POST /api/submissions/verify/:submissionId
 * Manually trigger verification (for testing or admin purposes)
 * Note: In production with real smart contract, this wouldn't exist
 * The smart contract handles verification automatically
 */
router.post("/verify/:submissionId", async (req, res) => {
  try {
    const { submissionId } = req.params;
    
    // Get submission to check correctness
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        Challenge: true,
        Participant: true
      }
    });

    if (!submission) {
      return res.status(404).json({ success: false, error: 'Submission not found' });
    }

    const isCorrect = compareHashes(
      submission.answerHash,
      submission.Challenge.correctAnswerHash
    );

    const txHash = `0x${Math.random().toString(16).substr(2, 64)}`;
    
    // Process as if smart contract responded
    const result = await processValidatorResponse(submissionId, isCorrect, txHash);
    
    res.json({
      success: true,
      message: `Submission ${result.isCorrect ? 'verified as CORRECT' : 'marked as INCORRECT'}`,
      isCorrect: result.isCorrect,
      submissionId: result.submissionId,
      status: result.status
    });
  } catch (error) {
    console.error("Error verifying submission:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message || "Failed to verify submission" 
    });
  }
});

export default router;
