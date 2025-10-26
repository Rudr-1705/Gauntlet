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
  "event AnswerSubmitted(uint256 indexed challengeId, address indexed participant, bool isCorrect)",
  "event WinnerFound(uint256 indexed challengeId, address indexed winner)"
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
    validatorDao.on('AnswerSubmitted', async (challengeId, participant, isCorrect, event) => {
      await handleAnswerSubmitted(challengeId, participant, isCorrect, event);
    });

    validatorDao.on('WinnerFound', async (challengeId, winner, event) => {
      await handleWinnerFound(challengeId, winner, event);
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
            status: 'WINNER',
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
      where: { chainChallengeId: Number(id) },
      select: {
        id: true,
        chainChallengeId: true,
        correctAnswerHash: true,
        validatorDaoAddress: true
      }
    });

    if (challenge) {
      // Find participant and their submission
      const participantRecord = await prisma.participant.findFirst({
        where: {
          challengeId: challenge.id,
          walletAddress: participant.toLowerCase()
        },
        include: {
          Submissions: {
            where: { status: 'PENDING' },
            orderBy: { submittedAt: 'desc' },
            take: 1
          }
        }
      });

      if (participantRecord && participantRecord.Submissions.length > 0) {
        const submission = participantRecord.Submissions[0];

        // Update submission status to SUBMITTED
        await prisma.submission.update({
          where: { id: submission.id },
          data: { status: 'SUBMITTED' }
        });

        console.log(`Submission ${submission.id} marked as SUBMITTED. Triggering ValidatorDAO...`);

        // 🚀 TRIGGER VALIDATORDAO VERIFICATION
        // Import and call submitToValidatorDAO
        const { submitToValidatorDAO } = await import('./validatorService.js');
        
        // Call ValidatorDAO.submitAnswer() to verify on-chain
        const validatorResult = await submitToValidatorDAO(submission, challenge, participantRecord);
        
        console.log(`ValidatorDAO verification triggered:`, validatorResult);
      } else {
        console.warn(`No pending submission found for participant ${participant} in challenge ${challenge.id}`);
      }

      // Log event
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

// ValidatorDAO event handlers
async function handleAnswerSubmitted(challengeId, participant, isCorrect, event) {
  try {
    console.log(`AnswerSubmitted Event (ValidatorDAO): ID=${challengeId}, Participant=${participant}, IsCorrect=${isCorrect}`);
    
    const challenge = await prisma.challenge.findFirst({
      where: { chainChallengeId: Number(challengeId) }
    });

    if (challenge) {
      // Find the participant and submission
      const participantRecord = await prisma.participant.findFirst({
        where: {
          challengeId: challenge.id,
          walletAddress: participant.toLowerCase()
        },
        include: {
          Submissions: {
            orderBy: { submittedAt: 'desc' },
            take: 1
          }
        }
      });

      if (participantRecord && participantRecord.Submissions.length > 0) {
        const submission = participantRecord.Submissions[0];
        
        // Update submission status based on correctness
        await prisma.submission.update({
          where: { id: submission.id },
          data: {
            status: isCorrect ? 'VERIFIED' : 'REJECTED'
          }
        });

        console.log(`Submission ${submission.id} marked as ${isCorrect ? 'VERIFIED' : 'REJECTED'}`);
      }

      // Log event
      await prisma.challengeEvent.create({
        data: {
          challengeId: challenge.id,
          eventType: 'ANSWER_SUBMITTED',
          txHash: event.transactionHash,
          blockNumber: event.blockNumber,
          eventData: JSON.stringify({ participant, isCorrect })
        }
      });
    }
  } catch (error) {
    console.error('Error handling AnswerSubmitted:', error);
  }
}

async function handleWinnerFound(challengeId, winner, event) {
  try {
    console.log(`WinnerFound Event (ValidatorDAO): ID=${challengeId}, Winner=${winner}`);
    
    const challenge = await prisma.challenge.findFirst({
      where: { chainChallengeId: Number(challengeId) }
    });

    if (challenge) {
      // Find winner participant
      const winnerParticipant = await prisma.participant.findFirst({
        where: {
          challengeId: challenge.id,
          walletAddress: winner.toLowerCase()
        }
      });

      if (winnerParticipant) {
        // Update participant as winner
        await prisma.participant.update({
          where: { id: winnerParticipant.id },
          data: { status: 'WINNER' }
        });

        console.log(`Participant ${winnerParticipant.id} marked as WINNER`);
      }

      // Log event
      await prisma.challengeEvent.create({
        data: {
          challengeId: challenge.id,
          eventType: 'WINNER_FOUND',
          txHash: event.transactionHash,
          blockNumber: event.blockNumber,
          eventData: JSON.stringify({ winner })
        }
      });
    }
  } catch (error) {
    console.error('Error handling WinnerFound:', error);
  }
}

async function handleChallengeFunded(id, participant, amount, event) {
  try {
    console.log(`ChallengeFunded Event: ChallengeID=${id}, Participant=${participant}, Amount=${amount}`);
    
    const challenge = await prisma.challenge.findFirst({
      where: { chainChallengeId: Number(id) }
    });

    if (challenge) {
      // Find the participant by wallet address
      const participantRecord = await prisma.participant.findFirst({
        where: {
          challengeId: challenge.id,
          walletAddress: participant.toLowerCase()
        }
      });

      if (participantRecord) {
        // Update participant with stake transaction hash
        await prisma.participant.update({
          where: { id: participantRecord.id },
          data: {
            stakeTxHash: event.transactionHash,
            stakeAmount: parseFloat(ethers.formatEther(amount))
          }
        });

        // Update submission status to SUBMITTED (answer already stored in DB)
        await prisma.submission.updateMany({
          where: {
            participantId: participantRecord.id,
            status: 'PENDING'
          },
          data: {
            status: 'SUBMITTED'
          }
        });

        // Create event record
        await prisma.challengeEvent.create({
          data: {
            challengeId: challenge.id,
            eventType: 'PARTICIPANT_FUNDED',
            txHash: event.transactionHash,
            blockNumber: event.blockNumber,
            eventData: JSON.stringify({ 
              participant, 
              amount: amount.toString()
            })
          }
        });

        console.log(`Participant ${participant} funded challenge ${challenge.id} with ${ethers.formatEther(amount)} PYUSD`);

        // TODO: Backend should now trigger ValidatorDAO to verify the answer
        // ValidatorDAO will call completeChallenge(id, winner) if answer is correct
      } else {
        console.warn(`Participant record not found for ${participant} in challenge ${challenge.id}`);
      }
    }
  } catch (error) {
    console.error('Error handling ChallengeFunded:', error);
  }
}

export default {
  initializeEventListeners
};
