import { PrismaClient } from "../generated/prisma/index.js";
import { compareHashes } from "../utils/hashUtils.js";

const prisma = new PrismaClient();

/**
 * Submit answer to ValidatorDAO smart contract for verification
 * This calls the ValidatorDAO.submitAnswer() function which:
 * 1. Emits AnswerSubmitted event (with isCorrect boolean)
 * 2. If correct: calls SponsorDAO.verifyChallenge() and completeChallenge()
 * 3. If correct: emits WinnerFound event
 * 4. Transfers PYUSD reward to winner automatically
 */
export async function submitToValidatorDAO(submission, challenge, participant) {
  try {
    console.log(`[ValidatorDAO] Submitting answer for challenge ${challenge.id}`);
    
    // Get wallet address from participant (should be stored during join)
    // For now, use userId as placeholder - MUST be actual wallet in production
    const participantAddress = participant.escrowAddress || participant.userId;
    
    const blockchainData = {
      validatorDaoAddress: challenge.validatorDaoAddress || process.env.VALIDATOR_DAO_ADDRESS,
      chainChallengeId: challenge.chainChallengeId,
      participantAddress: participantAddress,
      submittedAnswerHash: submission.answerHash,
      correctAnswerHash: challenge.correctAnswerHash
    };

    console.log('[ValidatorDAO] Calling ValidatorDAO.submitAnswer():', blockchainData);

    // TODO: Actual blockchain call
    // const { ethers } = await import("ethers");
    // const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    // const wallet = new ethers.Wallet(process.env.VALIDATOR_PRIVATE_KEY, provider);
    // const validatorDAO = new ethers.Contract(
    //   blockchainData.validatorDaoAddress,
    //   VALIDATOR_DAO_ABI,
    //   wallet
    // );
    // const tx = await validatorDAO.submitAnswer(
    //   blockchainData.chainChallengeId,
    //   blockchainData.submittedAnswerHash,
    //   blockchainData.correctAnswerHash,
    //   blockchainData.participantAddress
    // );
    // await tx.wait();
    // const txHash = tx.hash;

    // Simulate blockchain transaction for now
    const txHash = `0x${Math.random().toString(16).substr(2, 64)}`;
    
    // Simulate checking if answer is correct
    const isCorrect = compareHashes(submission.answerHash, challenge.correctAnswerHash);
    
    // Log Event 1: Answer Submitted (mimics smart contract event)
    await prisma.challengeEvent.create({
      data: {
        challengeId: challenge.id,
        eventType: 'ANSWER_SUBMITTED',
        txHash,
        eventData: JSON.stringify({
          submissionId: submission.id,
          participantId: participant.id,
          participantAddress: participantAddress,
          participantEmail: participant.userId,
          answerHash: submission.answerHash,
          isCorrect, // Smart contract includes this in AnswerSubmitted event
          timestamp: new Date().toISOString()
        })
      }
    });

    console.log(`[ValidatorDAO] Smart contract event: AnswerSubmitted(challengeId=${challenge.chainChallengeId}, participant=${participantAddress}, isCorrect=${isCorrect})`);

    // Update submission with validator tx hash
    await prisma.submission.update({
      where: { id: submission.id },
      data: { 
        validatorTxHash: txHash,
        status: isCorrect ? 'VERIFIED' : 'REJECTED'
      }
    });

    return {
      success: true,
      txHash,
      isCorrect,
      message: `Answer submitted to ValidatorDAO - ${isCorrect ? 'CORRECT' : 'INCORRECT'}`
    };
  } catch (error) {
    console.error('[ValidatorDAO] Error submitting to validator:', error);
    throw error;
  }
}

/**
 * Process smart contract response after answer submission
 * The ValidatorDAO smart contract automatically:
 * 1. Verifies the answer
 * 2. If correct: calls SponsorDAO.completeChallenge() which transfers PYUSD
 * 3. Emits WinnerFound event
 * 
 * This function processes those events and updates our database
 */
export async function processValidatorResponse(submissionId, isCorrect, txHash) {
  try {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        Challenge: true,
        Participant: true
      }
    });

    if (!submission) {
      throw new Error('Submission not found');
    }

    console.log(`[ValidatorDAO] Processing validator response: ${isCorrect ? 'CORRECT' : 'INCORRECT'}`);

    // If correct, the smart contract already completed the challenge
    // We just need to update our database to reflect this
    if (isCorrect) {
      await completeChallenge(submission.Challenge.id, submission.Participant.id, txHash);
    }

    return {
      success: true,
      isCorrect,
      submissionId,
      status: isCorrect ? 'VERIFIED' : 'REJECTED'
    };
  } catch (error) {
    console.error('[ValidatorDAO] Error processing validator response:', error);
    throw error;
  }
}

/**
 * Complete challenge and distribute rewards
 * This is called when the smart contract emits WinnerFound event
 * The smart contract already transferred PYUSD, we just update our records
 */
async function completeChallenge(challengeId, winnerId, txHash) {
  try {
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      include: {
        Submissions: {
          where: { status: 'VERIFIED' },
          include: {
            Participant: true
          }
        }
      }
    });

    if (!challenge) return;

    // Get all verified submissions (winners)
    const verifiedSubmissions = challenge.Submissions.filter(s => s.status === 'VERIFIED');
    
    if (verifiedSubmissions.length === 0) {
      console.log('[ValidatorDAO] No verified submissions found');
      return;
    }

    // Update challenge status to completed
    if (challenge.status !== 'completed') {
      await prisma.challenge.update({
        where: { id: challengeId },
        data: { 
          status: 'completed',
          validatorTxHash: txHash
        }
      });

      console.log(`[ValidatorDAO] Challenge ${challengeId} marked as completed`);
    }

    // Calculate reward per winner (if multiple winners)
    const rewardPerWinner = challenge.reward / verifiedSubmissions.length;

    // Log Event: Challenge Completed (mimics SponsorDAO event)
    await prisma.challengeEvent.create({
      data: {
        challengeId,
        eventType: 'CHALLENGE_COMPLETED',
        txHash,
        eventData: JSON.stringify({
          winnersCount: verifiedSubmissions.length,
          totalReward: challenge.reward,
          rewardPerWinner,
          winners: verifiedSubmissions.map(s => ({
            participantId: s.participantId,
            participantEmail: s.Participant.userId,
            participantAddress: s.Participant.escrowAddress || s.Participant.userId,
            submissionId: s.id
          })),
          timestamp: new Date().toISOString()
        })
      }
    });

    console.log(`[ValidatorDAO] Smart contract event: ChallengeCompleted with ${verifiedSubmissions.length} winner(s)`);

    // Update each winner's participant record
    // Mark reward as released (smart contract already transferred PYUSD)
    for (const submission of verifiedSubmissions) {
      await prisma.participant.update({
        where: { id: submission.participantId },
        data: {
          verified: true,
          rewardReleased: true,
          rewardTxHash: txHash
        }
      });

      // Log Event: Winner Found (mimics ValidatorDAO event)
      const winnerTxHash = txHash; // Same tx that completed the challenge
      await prisma.challengeEvent.create({
        data: {
          challengeId,
          eventType: 'WINNER_FOUND',
          txHash: winnerTxHash,
          eventData: JSON.stringify({
            challengeId,
            participantId: submission.participantId,
            participantEmail: submission.Participant.userId,
            participantAddress: submission.Participant.escrowAddress || submission.Participant.userId,
            rewardAmount: rewardPerWinner,
            pyusdTransferred: true, // Smart contract already sent PYUSD
            timestamp: new Date().toISOString()
          })
        }
      });

      console.log(`[ValidatorDAO] Smart contract event: WinnerFound(challengeId=${challenge.chainChallengeId}, winner=${submission.Participant.userId}, reward=${rewardPerWinner} PYUSD)`);
    }

    return {
      success: true,
      winnersCount: verifiedSubmissions.length,
      rewardPerWinner
    };
  } catch (error) {
    console.error('[ValidatorDAO] Error completing challenge:', error);
    throw error;
  }
}

/**
 * Get all events for a challenge
 * Used by frontend to poll for status updates
 */
export async function getChallengeEvents(challengeId, eventTypes = null) {
  try {
    const whereClause = { challengeId };
    if (eventTypes && eventTypes.length > 0) {
      whereClause.eventType = { in: eventTypes };
    }

    const events = await prisma.challengeEvent.findMany({
      where: whereClause,
      orderBy: { timestamp: 'desc' }
    });

    return events.map(event => ({
      ...event,
      eventData: event.eventData ? JSON.parse(event.eventData) : null
    }));
  } catch (error) {
    console.error('[ValidatorDAO] Error fetching events:', error);
    throw error;
  }
}

/**
 * Get submission status and related events
 */
export async function getSubmissionStatus(submissionId) {
  try {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        Challenge: {
          include: {
            Events: {
              where: {
                eventType: {
                  in: ['ANSWER_SUBMITTED', 'ANSWER_VERIFIED', 'CHALLENGE_COMPLETED', 'WINNER_FOUND']
                }
              },
              orderBy: { timestamp: 'desc' }
            }
          }
        },
        Participant: true
      }
    });

    if (!submission) {
      throw new Error('Submission not found');
    }

    // Filter events related to this submission
    const relatedEvents = submission.Challenge.Events.filter(event => {
      if (!event.eventData) return false;
      try {
        const data = JSON.parse(event.eventData);
        return data.submissionId === submissionId || 
               data.participantId === submission.participantId ||
               event.eventType === 'CHALLENGE_COMPLETED';
      } catch {
        return false;
      }
    });

    return {
      submission: {
        id: submission.id,
        status: submission.status,
        answerHash: submission.answerHash,
        submittedAt: submission.submittedAt,
        validatorTxHash: submission.validatorTxHash
      },
      challenge: {
        id: submission.Challenge.id,
        title: submission.Challenge.title,
        status: submission.Challenge.status
      },
      events: relatedEvents.map(event => ({
        ...event,
        eventData: event.eventData ? JSON.parse(event.eventData) : null
      }))
    };
  } catch (error) {
    console.error('[ValidatorDAO] Error fetching submission status:', error);
    throw error;
  }
}
