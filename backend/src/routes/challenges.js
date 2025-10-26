import express from "express";
import { PrismaClient } from "../generated/prisma/index.js";
import { generateSHA256Hash } from "../utils/hashUtils.js";
import axios from "axios";

const router = express.Router();
const prisma = new PrismaClient();

// ML Model endpoint
const ML_MODEL_URL = process.env.ML_MODEL_URL || "http://localhost:8080";

/**
 * POST /api/challenges/create
 * Create a new challenge with ML model validation and blockchain integration
 * Flow:
 * 1. Create challenge in DB (pending status)
 * 2. Send to ML model for fundibility & domain classification
 * 3. Update challenge with ML results
 * 4. If fundible, send to SponsorDAO
 * 5. Wait ~10 seconds
 * 6. Update status to 'live' or 'rejected'
 */
router.post("/create", async (req, res) => {
  try {
    const { 
      title, 
      description, 
      reward, 
      creator,
      walletAddress,
      correctAnswer,
      judgingCriteria
    } = req.body;

    if (!title || !description || !reward || !creator || !correctAnswer) {
      return res.status(400).json({ 
        success: false, 
        error: "Missing required fields: title, description, reward, creator, correctAnswer" 
      });
    }

    const correctAnswerHash = generateSHA256Hash(correctAnswer);
    console.log('Generated hash for challenge:', title);

    const challenge = await prisma.challenge.create({
      data: {
        title,
        description,
        reward: parseFloat(reward),
        domain: "Pending Classification", // Will be updated by ML model
        status: "pending",
        creator: creator.toLowerCase(),
        correctAnswerHash,
        judgingCriteria,
        fundibility: false, // Will be updated by ML model
        sponsorDaoAddress: process.env.SPONSOR_DAO_ADDRESS || null,
        validatorDaoAddress: process.env.VALIDATOR_DAO_ADDRESS || null
      },
    });

    console.log('Challenge created in DB:', challenge.id, '- Sending to ML model...');

    // Step 3: Send challenge to ML model for classification (non-blocking)
    processMLClassification(challenge.id, title, description, parseFloat(reward),walletAddress);

    // Respond immediately to frontend
    res.json({
      success: true,
      message: "Challenge created successfully. ML model is classifying your challenge...",
      challenge: {
        id: challenge.id,
        title: challenge.title,
        description: challenge.description,
        domain: challenge.domain,
        reward: challenge.reward,
        status: challenge.status,
        creator: challenge.creator,
        hasCorrectAnswer: true,
        createdAt: challenge.createdAt
      },
      info: {
        message: "Your challenge is being reviewed by our ML model. This will take a few seconds.",
        steps: [
          "1. ML model classifying domain and fundibility",
          "2. If fundible, sending to SponsorDAO",
          "3. Challenge will go live in ~10 seconds"
        ]
      }
    });
  } catch (error) {
    console.error("Error creating challenge:", error);
    res.status(500).json({ success: false, error: "Failed to create challenge" });
  }
});
async function processMLClassification(challengeId, title, description, stakeAmount,walletAddress) {
  try {
    const challenge_id=challengeId;
    const challenge_text=description;
    const requested_reward=stakeAmount;
    console.log(`[ML Classification] Processing challenge ${challengeId}...`);
    console.log(`[ML Classification] Calling ML Model at: ${ML_MODEL_URL}/classify`);

    const mlResponse = await axios.post(`${ML_MODEL_URL}/classify`, {
      challenge_id,
      challenge_text,
      requested_reward,
      proposer_wallet: walletAddress || null,
      urgency_level: "medium"
    }, {
      timeout: 60000  // Increased timeout for ML processing
    });

    const { fundible, domain } = mlResponse.data;
    console.log(`[ML Classification] Response received:`, mlResponse.data);

    console.log(`[ML Classification] Challenge ${challengeId} - Fundible: ${fundible}, Domain: ${domain}`);
    const isFundible = fundible === "yes" || fundible === true;

    const updatedChallenge = await prisma.challenge.update({
      where: { id: challengeId },
      data: {
        fundibility: isFundible,
        domain: domain || "Other"
      }
    });
    console.log(isFundible);
    if (isFundible) {
      console.log(`[SponsorDAO] Challenge ${challengeId} is fundible. Sending to blockchain...`);
      
      try {
        // CREATOR MUST CALL SponsorDAO.createChallenge() FROM FRONTEND
        // Backend just updates DB - no private key needed here
        // Frontend will call: createChallenge(stakeAmount, domain, metadataURI)
        // Then blockchain emits ChallengeCreated event with chainChallengeId
        // Our event listener will catch it and update the DB
        
        // Mark as 'funded' status (waiting for creator to fund on blockchain)
        await prisma.challenge.update({
          where: { id: challengeId },
          data: {
            status: 'funded', // Creator needs to call createChallenge on-chain
            sponsorDaoAddress: process.env.SPONSOR_DAO_ADDRESS
          }
        });

        console.log(`[SponsorDAO] Challenge ${challengeId} approved. Creator must now call createChallenge() on SponsorDAO.`);

        // After creator funds on blockchain, event listener will update status to 'live'

      } catch (blockchainError) {
        console.error(`[SponsorDAO] Error updating challenge ${challengeId}:`, blockchainError);
        
        // Mark as rejected if update fails
        await prisma.challenge.update({
          where: { id: challengeId },
          data: { status: 'rejected' }
        });
      }

    } else {
      // Challenge not fundible - reject it
      console.log(`[ML Classification] Challenge ${challengeId} marked as NOT fundible. Rejecting...`);
      console.log(isFundible);
      await prisma.challenge.update({
        where: { id: challengeId },
        data: { status: 'rejected' }
      });

      // Create event log
      await prisma.challengeEvent.create({
        data: {
          challengeId,
          eventType: 'REJECTED',
          txHash: null,
          blockNumber: 0,
          eventData: JSON.stringify({ 
            domain, 
            fundible: false,
            reason: 'ML model marked as not fundible'
          })
        }
      });
    }

  } catch (error) {
    console.error(`[ML Classification] Error processing challenge ${challengeId}:`, error);
    
    // Mark challenge as rejected if ML model fails
    try {
      await prisma.challenge.update({
        where: { id: challengeId },
        data: { 
          status: 'rejected',
          domain: 'Classification Failed'
        }
      });

      await prisma.challengeEvent.create({
        data: {
          challengeId,
          eventType: 'REJECTED',
          txHash: null,
          blockNumber: 0,
          eventData: JSON.stringify({ 
            error: error.message,
            reason: 'ML model classification failed'
          })
        }
      });
    } catch (dbError) {
      console.error(`[ML Classification] Error updating database for challenge ${challengeId}:`, dbError);
    }
  }
}

/**
 * GET /api/challenges
 * Get all challenges with optional filters
 */
router.get("/", async (req, res) => {
  try {
    const { status, domain, creator } = req.query;

    const where = {};
    if (status) where.status = status;
    if (domain) where.domain = domain;
    if (creator) where.creator = creator.toLowerCase();

    const challenges = await prisma.challenge.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { 
            Participants: true,
            Submissions: true 
          }
        }
      }
    });

    const safeChallenges = challenges.map(c => ({
      ...c,
      correctAnswerHash: undefined,
      participantCount: c._count.Participants,
      submissionCount: c._count.Submissions,
      _count: undefined
    }));

    res.json({ success: true, challenges: safeChallenges });
  } catch (error) {
    console.error("Error fetching challenges:", error);
    res.status(500).json({ success: false, error: "Failed to fetch challenges" });
  }
});

/**
 * GET /api/challenges/:id
 * Get a specific challenge by ID
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const challenge = await prisma.challenge.findUnique({
      where: { id },
      include: {
        Participants: {
          select: {
            id: true,
            userId: true,
            stakeAmount: true,
            status: true,
            walletAddress: true,
            joinedAt: true
          }
        },
        Events: {
          orderBy: { timestamp: 'desc' },
          take: 10
        },
        _count: {
          select: { Submissions: true }
        }
      }
    });

    if (!challenge) {
      return res.status(404).json({ success: false, error: "Challenge not found" });
    }

    const safeChallenge = {
      ...challenge,
      correctAnswerHash: undefined,
      submissionCount: challenge._count.Submissions,
      _count: undefined
    };

    res.json({ success: true, challenge: safeChallenge });
  } catch (error) {
    console.error("Error fetching challenge:", error);
    res.status(500).json({ success: false, error: "Failed to fetch challenge" });
  }
});

/**
 * GET /api/challenges/creator/:email
 * Get all challenges created by a specific user
 */
router.get("/creator/:email", async (req, res) => {
  try {
    const { email } = req.params;

    const challenges = await prisma.challenge.findMany({
      where: { creator: email.toLowerCase() },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { 
            Participants: true,
            Submissions: true 
          }
        }
      }
    });

    const safeChallenges = challenges.map(c => ({
      ...c,
      correctAnswerHash: undefined,
      participantCount: c._count.Participants,
      submissionCount: c._count.Submissions,
      _count: undefined
    }));

    res.json({ success: true, challenges: safeChallenges });
  } catch (error) {
    console.error("Error fetching creator challenges:", error);
    res.status(500).json({ success: false, error: "Failed to fetch creator challenges" });
  }
});

/**
 * PATCH /api/challenges/:id/blockchain-confirm
 * Update challenge with blockchain transaction information
 */
router.patch("/:id/blockchain-confirm", async (req, res) => {
  try {
    const { id } = req.params;
    const { txHash, chainChallengeId } = req.body;

    const challenge = await prisma.challenge.update({
      where: { id },
      data: {
        sponsorTxHash: txHash,
        chainChallengeId: parseInt(chainChallengeId),
        status: 'funded'
      }
    });

    res.json({
      success: true,
      message: "Challenge confirmed on blockchain",
      challenge
    });
  } catch (error) {
    console.error("Error confirming challenge:", error);
    res.status(500).json({ success: false, error: "Failed to confirm challenge" });
  }
});

/**
 * PATCH /api/challenges/status/:id  
 * Update challenge status
 */
router.patch("/status/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, txHash } = req.body;

    const updateData = { status };
    if (txHash && (status === 'live' || status === 'completed')) {
      updateData.validatorTxHash = txHash;
    }

    const updated = await prisma.challenge.update({
      where: { id },
      data: updateData
    });

    res.json({
      success: true,
      message: `Challenge status updated to ${status}`,
      challenge: updated
    });
  } catch (error) {
    console.error("Error updating challenge status:", error);
    res.status(500).json({ success: false, error: "Failed to update challenge" });
  }
});

/**
 * POST /api/challenges/:id/update-chain-id
 * Update chainChallengeId after frontend creates challenge on blockchain
 */
router.post("/:id/update-chain-id", async (req, res) => {
  try {
    const { id } = req.params;
    const { chainChallengeId, txHash, blockNumber } = req.body;

    console.log(`[update-chain-id] Received request for challenge ${id}:`, { chainChallengeId, txHash, blockNumber });

    if (!chainChallengeId) {
      console.error('[update-chain-id] Missing chainChallengeId');
      return res.status(400).json({ 
        success: false, 
        error: "chainChallengeId is required" 
      });
    }

    // Check if challenge exists first
    const existingChallenge = await prisma.challenge.findUnique({
      where: { id }
    });

    if (!existingChallenge) {
      console.error(`[update-chain-id] Challenge ${id} not found`);
      return res.status(404).json({
        success: false,
        error: "Challenge not found"
      });
    }

    console.log(`[update-chain-id] Updating challenge ${id}...`);

    // Update challenge with blockchain data
    // chainChallengeId is Int in schema, convert from string
    const updatedChallenge = await prisma.challenge.update({
      where: { id },
      data: {
        chainChallengeId: parseInt(chainChallengeId, 10),
        status: 'live' // Challenge is now live on blockchain
      }
    });

    console.log(`[update-chain-id] Challenge updated, creating event log...`);

    // Create event log
    await prisma.challengeEvent.create({
      data: {
        challengeId: id,
        eventType: 'CHALLENGE_CREATED',
        txHash: txHash || null,
        blockNumber: blockNumber ? parseInt(blockNumber, 10) : null,
        eventData: JSON.stringify({ 
          chainChallengeId: parseInt(chainChallengeId, 10)
        })
      }
    });

    console.log(`[Blockchain] Challenge ${id} created on-chain with ID: ${chainChallengeId}`);

    res.json({ 
      success: true, 
      message: "Challenge chain ID updated successfully",
      challenge: updatedChallenge 
    });

  } catch (error) {
    console.error("[update-chain-id] Error updating chain ID:", error);
    console.error("[update-chain-id] Error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      success: false, 
      error: "Failed to update chain ID",
      details: error.message 
    });
  }
});

/**
 * GET /api/challenges/:id/events
 * Get all blockchain events for a challenge
 */
router.get("/:id/events", async (req, res) => {
  try {
    const { id } = req.params;

    const events = await prisma.challengeEvent.findMany({
      where: { challengeId: id },
      orderBy: { timestamp: 'desc' }
    });

    res.json({ success: true, events });
  } catch (error) {
    console.error("Error fetching challenge events:", error);
    res.status(500).json({ success: false, error: "Failed to fetch events" });
  }
});

export default router;