/**
 * Frontend Event Polling Utility
 * 
 * This utility helps the frontend poll for submission and challenge events
 * to update the UI in real-time as validators process submissions.
 * 
 * Important Events:
 * 1. ANSWER_SUBMITTED - When participant submits an answer
 * 3. CHALLENGE_COMPLETED - When challenge is completed with winners
 * 
 * Usage Example:
 * 
 * ```javascript
 * import { pollSubmissionStatus, pollChallengeEvents } from './utils/eventPolling';
 * 
 * // After submitting an answer:
 * const submissionId = response.submission.id;
 * pollSubmissionStatus(submissionId, (status) => {
 *   console.log('Submission status:', status);
 *   if (status.submission.status === 'VERIFIED') {
 *     // Answer was correct! Show success message
 *   } else if (status.submission.status === 'REJECTED') {
 *     // Answer was incorrect
 *   }
 *   
 *   // Check if challenge is completed
 *   if (status.challenge.status === 'completed') {
 *     // Challenge is done! Check if user won
 *     const winnerEvent = status.events.find(e => 
 *       e.eventType === 'WINNER_FOUND' && 
 *       e.eventData.participantEmail === userEmail
 *     );
 *     if (winnerEvent) {
 *       // User won! Show celebration
 *     }
 *   }
 * });
 * ```
 */

import api from './api';

/**
 * Poll for submission status updates
 * @param {string} submissionId - The submission ID to poll
 * @param {function} onUpdate - Callback function called with latest status
 * @param {object} options - Polling options
 * @returns {function} Stop polling function
 */
export function pollSubmissionStatus(
  submissionId, 
  onUpdate, 
  options = {}
) {
  const {
    interval = 3000, // Poll every 3 seconds
    maxAttempts = 60, // Stop after 60 attempts (3 minutes)
    onError = (error) => console.error('Polling error:', error),
    stopCondition = (status) => {
      // Stop when submission is verified/rejected AND challenge is completed
      return (
        (status.submission.status === 'VERIFIED' || status.submission.status === 'REJECTED') &&
        status.challenge.status === 'completed'
      );
    }
  } = options;

  let attempts = 0;
  let stopped = false;

  const poll = async () => {
    if (stopped || attempts >= maxAttempts) {
      console.log('Polling stopped');
      return;
    }

    attempts++;

    try {
      const response = await api.get(`/submissions/status/${submissionId}`);
      
      if (response.success) {
        onUpdate(response);

        // Check if we should stop polling
        if (stopCondition(response)) {
          console.log('Stop condition met, ending poll');
          stopped = true;
          return;
        }
      }

      // Continue polling if not stopped
      if (!stopped) {
        setTimeout(poll, interval);
      }
    } catch (error) {
      onError(error);
      // Continue polling even on error (might be temporary network issue)
      if (!stopped) {
        setTimeout(poll, interval);
      }
    }
  };

  // Start polling
  poll();

  // Return function to stop polling
  return () => {
    stopped = true;
  };
}

/**
 * Poll for challenge events
 * @param {string} challengeId - The challenge ID to poll
 * @param {function} onUpdate - Callback function called with latest events
 * @param {object} options - Polling options
 * @returns {function} Stop polling function
 */
export function pollChallengeEvents(
  challengeId,
  onUpdate,
  options = {}
) {
  const {
    interval = 5000, // Poll every 5 seconds
    maxAttempts = 60,
    onError = (error) => console.error('Polling error:', error),
    eventTypes = ['ANSWER_SUBMITTED', 'CHALLENGE_COMPLETED'], // Only poll for important events
    stopCondition = (events) => {
      // Stop when challenge is completed
      return events.some(e => e.eventType === 'CHALLENGE_COMPLETED');
    }
  } = options;

  let attempts = 0;
  let stopped = false;
  let lastEventCount = 0;

  const poll = async () => {
    if (stopped || attempts >= maxAttempts) {
      console.log('Event polling stopped');
      return;
    }

    attempts++;

    try {
      const params = eventTypes ? { types: eventTypes.join(',') } : {};
      const response = await api.get(`/submissions/events/${challengeId}`, { params });
      
      if (response.success) {
        // Only call onUpdate if there are new events
        if (response.events.length > lastEventCount) {
          lastEventCount = response.events.length;
          onUpdate(response);
        }

        // Check if we should stop polling
        if (stopCondition(response.events)) {
          console.log('Challenge completed, ending event poll');
          stopped = true;
          return;
        }
      }

      // Continue polling if not stopped
      if (!stopped) {
        setTimeout(poll, interval);
      }
    } catch (error) {
      onError(error);
      // Continue polling even on error
      if (!stopped) {
        setTimeout(poll, interval);
      }
    }
  };

  // Start polling
  poll();

  // Return function to stop polling
  return () => {
    stopped = true;
  };
}

/**
 * Get human-readable event message
 * @param {object} event - Event object
 * @returns {string} Human-readable message
 */
export function getEventMessage(event) {
  switch (event.eventType) {
    case 'ANSWER_SUBMITTED':
      return '✅ Your answer has been submitted for verification';
    case 'ANSWER_VERIFIED':
      return event.eventData?.isCorrect
        ? '🎉 Your answer is CORRECT!'
        : '❌ Your answer was incorrect';
    case 'CHALLENGE_COMPLETED':
      return `🏁 Challenge completed with ${event.eventData?.winnersCount || 0} winner(s)`;
    case 'WINNER_FOUND':
      return `🏆 Winner found! Reward: ${event.eventData?.rewardAmount || 0} PYUSD`;
    default:
      return `Event: ${event.eventType}`;
  }
}
