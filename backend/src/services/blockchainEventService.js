import { ethers } from 'ethers';
import { PrismaClient } from '../generated/prisma/index.js';

const prisma = new PrismaClient();

// ABI fragments for the events we care about
const SPONSOR_DAO_EVENTS = [
  "event ChallengeCreated(uint256 indexed id, address indexed creator, uint256 stakeAmount, bytes32 domain, string metadataURI, uint256 startTime, uint256 endTime)",
  "event ChallengeFunded(uint256 indexed id, address indexed participant, uint256 amount)",
  "event ChallengeVerified(uint256 indexed id, bool verified)",
  "event ChallengeCompleted(uint256 indexed id, address indexed winner, uint256 rewardAmount)",
  "event ChallengeSubmitted(uint256 indexed id, address indexed participant, string submissionURI)"
];

const VALIDATOR_DAO_EVENTS = [
  "event ChallengeReceived(uint256 indexed challengeId)",
  "event ValidationResultSubmitted(uint256 indexed challengeId, address indexed winner, bool success, string zkProofHash)"
];

/**
 * Initialize blockchain event listeners
 * @param {string} rpcUrl - Blockchain RPC URL
 * @param {string} sponsorDaoAddress - SponsorDAO contract address
 * @param {string} validatorDaoAddress - ValidatorDAO contract address
 */
export async function initializeEventListeners(rpcUrl, sponsorDaoAddress, validatorDaoAddress) {
  if (!rpcUrl || !sponsorDaoAddress || !validatorDaoAddress) {
    console.warn('Warning: Blockchain event listeners not initialized - missing configuration');
    return null;
  }

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Create contract instances
    const sponsorDao = new ethers.Contract(sponsorDaoAddress, SPONSOR_DAO_EVENTS, provider);
    const validatorDao = new ethers.Contract(validatorDaoAddress, VALIDATOR_DAO_EVENTS, provider);

    console.log('Blockchain event listeners initialized');

    // Listen to SponsorDAO events
    sponsorDao.on('ChallengeCreated', async (id, creator, stakeAmount, domain, metadataURI, startTime, endTime, event) => {
      await handleChallengeCreated(id, creator, stakeAmount, domain, metadataURI, startTime, endTime, event);
    });

    sponsorDao.on('ChallengeFunded', async (id, participant, amount, event) => {
      await handleChallengeFunded(id, participant, amount, event);
    });

    sponsorDao.on('ChallengeVerified', async (id, verified, event) => {
      await handleChallengeVerified(id, verified, event);
    });

    sponsorDao.on('ChallengeCompleted', async (id, winner, rewardAmount, event) => {
      await handleChallengeCompleted(id, winner, rewardAmount, event);
    });

    sponsorDao.on('ChallengeSubmitted', async (id, participant, submissionURI, event) => {
      await handleChallengeSubmitted(id, participant, submissionURI, event);
    });

    // Listen to ValidatorDAO events
    validatorDao.on('ChallengeReceived', async (challengeId, event) => {
      await handleChallengeReceived(challengeId, event);
    });

    validatorDao.on('ValidationResultSubmitted', async (challengeId, winner, success, zkProofHash, event) => {
      await handleValidationResult(challengeId, winner, success, zkProofHash, event);
    });

    return { sponsorDao, validatorDao, provider };
  } catch (error) {
    console.error('Failed to initialize blockchain event listeners:', error);
    return null;
  }
}

// Event Handlers

async function handleChallengeCreated(id, creator, stakeAmount, domain, metadataURI, startTime, endTime, event) {
  try {
    console.log(`ChallengeCreated Event: ID=${id}, Creator=${creator}`);
    
    // Find challenge in database by metadataURI or other identifier
    const challenge = await prisma.challenge.findFirst({
      where: { 
        creator: creator.toLowerCase(),
        status: 'pending'
      },
      orderBy: { createdAt: 'desc' }
    });

    if (challenge) {
      await prisma.challenge.update({
        where: { id: challenge.id },
        data: {
          chainChallengeId: Number(id),
          sponsorTxHash: event.transactionHash,
          status: 'funded'
        }
      });

      // Store event
      await prisma.challengeEvent.create({
        data: {
          challengeId: challenge.id,
          eventType: 'CREATED',
          txHash: event.transactionHash,
          blockNumber: event.blockNumber,
          eventData: JSON.stringify({ id: Number(id), stakeAmount: stakeAmount.toString(), domain, metadataURI })
        }
      });

      console.log(`Challenge ${challenge.id} updated with blockchain ID ${id}`);
    }
  } catch (error) {
    console.error('Error handling ChallengeCreated:', error);
  }
}

async function handleChallengeFunded(id, participant, amount, event) {
  try {
    console.log(`ChallengeFunded Event: ID=${id}, Participant=${participant}, Amount=${amount}`);
    
    const challenge = await prisma.challenge.findFirst({
      where: { chainChallengeId: Number(id) }
    });

    if (challenge) {
      // Update participant stake
      const participantRecord = await prisma.participant.findFirst({
        where: {
          challengeId: challenge.id,
          userId: participant.toLowerCase()
        }
      });

      if (participantRecord) {
        await prisma.participant.update({
          where: { id: participantRecord.id },
          data: {
            stakeTxHash: event.transactionHash,
            stakeAmount: Number(ethers.formatUnits(amount, 6)) // PYUSD has 6 decimals
          }
        });
      }

      // Store event
      await prisma.challengeEvent.create({
        data: {
          challengeId: challenge.id,
          eventType: 'FUNDED',
          txHash: event.transactionHash,
          blockNumber: event.blockNumber,
          eventData: JSON.stringify({ participant, amount: amount.toString() })
        }
      });

      console.log(`Participant ${participant} funding recorded`);
    }
  } catch (error) {
    console.error('Error handling ChallengeFunded:', error);
  }
}

async function handleChallengeVerified(id, verified, event) {
  try {
    console.log(`ChallengeVerified Event: ID=${id}, Verified=${verified}`);
    
    const challenge = await prisma.challenge.findFirst({
      where: { chainChallengeId: Number(id) }
    });

    if (challenge) {
      await prisma.challenge.update({
        where: { id: challenge.id },
        data: {
          status: verified ? 'live' : 'rejected',
          validatorTxHash: event.transactionHash
        }
      });

      await prisma.challengeEvent.create({
        data: {
          challengeId: challenge.id,
          eventType: 'VERIFIED',
          txHash: event.transactionHash,
          blockNumber: event.blockNumber,
          eventData: JSON.stringify({ verified })
        }
      });

      console.log(`Challenge ${challenge.id} verification status: ${verified}`);
    }
  } catch (error) {
    console.error('Error handling ChallengeVerified:', error);
  }
}

async function handleChallengeCompleted(id, winner, rewardAmount, event) {
  try {
    console.log(`ChallengeCompleted Event: ID=${id}, Winner=${winner}, Reward=${rewardAmount}`);
    
    const challenge = await prisma.challenge.findFirst({
      where: { chainChallengeId: Number(id) }
    });

    if (challenge) {
      await prisma.challenge.update({
        where: { id: challenge.id },
        data: {
          status: 'completed'
        }
      });

      // Update winner's participant record
      const winnerParticipant = await prisma.participant.findFirst({
        where: {
          challengeId: challenge.id,
          userId: winner.toLowerCase()
        }
      });

      if (winnerParticipant) {
        await prisma.participant.update({
          where: { id: winnerParticipant.id },
          data: {
            verified: true,
            rewardReleased: true,
            rewardTxHash: event.transactionHash
          }
        });
      }

      await prisma.challengeEvent.create({
        data: {
          challengeId: challenge.id,
          eventType: 'COMPLETED',
          txHash: event.transactionHash,
          blockNumber: event.blockNumber,
          eventData: JSON.stringify({ winner, rewardAmount: rewardAmount.toString() })
        }
      });

      console.log(`Challenge ${challenge.id} completed, winner: ${winner}`);
    }
  } catch (error) {
    console.error('Error handling ChallengeCompleted:', error);
  }
}

async function handleChallengeSubmitted(id, participant, submissionURI, event) {
  try {
    console.log(`ChallengeSubmitted Event: ID=${id}, Participant=${participant}`);
    
    const challenge = await prisma.challenge.findFirst({
      where: { chainChallengeId: Number(id) }
    });

    if (challenge) {
      await prisma.challengeEvent.create({
        data: {
          challengeId: challenge.id,
          eventType: 'SUBMITTED',
          txHash: event.transactionHash,
          blockNumber: event.blockNumber,
          eventData: JSON.stringify({ participant, submissionURI })
        }
      });

      console.log(`Submission from ${participant} recorded`);
    }
  } catch (error) {
    console.error('Error handling ChallengeSubmitted:', error);
  }
}

async function handleChallengeReceived(challengeId, event) {
  try {
    console.log(`ChallengeReceived Event (ValidatorDAO): ID=${challengeId}`);
    
    const challenge = await prisma.challenge.findFirst({
      where: { chainChallengeId: Number(challengeId) }
    });

    if (challenge) {
      await prisma.challengeEvent.create({
        data: {
          challengeId: challenge.id,
          eventType: 'RECEIVED_BY_VALIDATOR',
          txHash: event.transactionHash,
          blockNumber: event.blockNumber,
          eventData: JSON.stringify({ challengeId: Number(challengeId) })
        }
      });
    }
  } catch (error) {
    console.error('Error handling ChallengeReceived:', error);
  }
}

async function handleValidationResult(challengeId, winner, success, zkProofHash, event) {
  try {
    console.log(`ValidationResultSubmitted Event: ID=${challengeId}, Winner=${winner}, Success=${success}`);
    
    const challenge = await prisma.challenge.findFirst({
      where: { chainChallengeId: Number(challengeId) }
    });

    if (challenge) {
      await prisma.challengeEvent.create({
        data: {
          challengeId: challenge.id,
          eventType: 'VALIDATION_RESULT',
          txHash: event.transactionHash,
          blockNumber: event.blockNumber,
          eventData: JSON.stringify({ winner, success, zkProofHash })
        }
      });

      console.log(`Validation result recorded for challenge ${challenge.id}`);
    }
  } catch (error) {
    console.error('Error handling ValidationResult:', error);
  }
}

export default {
  initializeEventListeners
};
