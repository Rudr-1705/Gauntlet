import crypto from 'crypto';
import { PrismaClient } from '../generated/prisma/index.js';

const prisma = new PrismaClient();

/**
 * Hash an answer using SHA-256
 * @param {string} answer - Plain text answer
 * @returns {string} - Hex string with 0x prefix
 */
export function hashAnswer(answer) {
  return '0x' + crypto
    .createHash('sha256')
    .update(answer.trim().toLowerCase())
    .digest('hex');
}

/**
 * Verify if a participant's answer matches the challenge's correct answer
 * This simulates what the ValidatorDAO smart contract will do
 * @param {string} participantId - Participant ID
 * @param {string} challengeId - Challenge ID
 * @returns {Promise<Object>} - Verification result
 */
export async function verifyParticipantAnswer(participantId, challengeId) {
  try {
    // Get participant's submission
    const submission = await prisma.submission.findFirst({
      where: {
        participantId,
        challengeId
      }
    });

    if (!submission) {
      return {
        success: false,
        error: 'Submission not found'
      };
    }

    // Get challenge with correct answer hash
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      select: {
        id: true,
        title: true,
        correctAnswerHash: true,
        hasCorrectAnswer: true
      }
    });

    if (!challenge) {
      return {
        success: false,
        error: 'Challenge not found'
      };
    }

    if (!challenge.hasCorrectAnswer || !challenge.correctAnswerHash) {
      return {
        success: false,
        error: 'Challenge does not have a correct answer set'
      };
    }

    // Compare answer hashes
    const isCorrect = submission.answerHash.toLowerCase() === challenge.correctAnswerHash.toLowerCase();

    // Update submission status
    await prisma.submission.update({
      where: { id: submission.id },
      data: {
        status: isCorrect ? 'VERIFIED' : 'REJECTED'
      }
    });

    // Update participant status (WINNER if correct, LOSER if wrong)
    if (isCorrect) {
      await prisma.participant.update({
        where: { id: participantId },
        data: {
          status: 'WINNER'
        }
      });
    }

    return {
      success: true,
      isCorrect,
      participantId,
      challengeId,
      submissionId: submission.id,
      status: isCorrect ? 'VERIFIED' : 'REJECTED'
    };

  } catch (error) {
    console.error('Error verifying answer:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Simulate reward release (will be replaced by SponsorDAO smart contract)
 * @param {string} participantId - Participant ID
 * @returns {Promise<Object>} - Release result
 */
export async function releaseReward(participantId) {
  try {
    const participant = await prisma.participant.findUnique({
      where: { id: participantId },
      include: {
        Challenge: {
          select: {
            reward: true,
            title: true
          }
        }
      }
    });

    if (!participant) {
      return {
        success: false,
        error: 'Participant not found'
      };
    }

    if (participant.status !== 'WINNER') {
      return {
        success: false,
        error: 'Participant answer not verified as winner'
      };
    }

    if (participant.rewardTxHash) {
      return {
        success: false,
        error: 'Reward already released'
      };
    }

    // Simulate transaction hash
    const mockTxHash = '0x' + crypto.randomBytes(32).toString('hex');

    // Update participant with reward release info
    await prisma.participant.update({
      where: { id: participantId },
      data: {
        rewardReleased: true,
        rewardTxHash: mockTxHash
      }
    });

    return {
      success: true,
      participantId,
      rewardAmount: participant.Challenge.reward,
      txHash: mockTxHash,
      message: `Reward of ${participant.Challenge.reward} PYUSD released to participant`
    };

  } catch (error) {
    console.error('Error releasing reward:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export default {
  hashAnswer,
  verifyParticipantAnswer,
  releaseReward
};
