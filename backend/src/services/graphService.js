import axios from "axios";
import { PrismaClient } from "../generated/prisma/index.js";

// Your Graph endpoint — replace when deployed
const GRAPH_API_URL = process.env.GRAPH_API_URL || "https://api.thegraph.com/subgraphs/name/yourproject/subgraph";

/**
 * Generic GraphQL query helper
 */
async function queryGraph(query, variables = {}) {
  try {
    const response = await axios.post(GRAPH_API_URL, { query, variables });
    return response.data.data;
  } catch (error) {
    console.error("GraphQL query failed:", error.response?.data || error.message);
    throw new Error("Failed to query The Graph");
  }
}

/**
 * Fetch global platform stats
 */
export async function getPlatformStats() {
  // Using Prisma to get real counts from database
  const prisma = new PrismaClient();
  
  try {
    console.log('📊 [getPlatformStats] Fetching platform stats from database...');
    
    const [challengeCount, participantCount, totalRewardsResult, challenges, participants] = await Promise.all([
      prisma.challenge.count(),
      prisma.participant.count(),
      prisma.challenge.aggregate({
        _sum: { reward: true },
        where: { status: 'funded' }
      }),
      // Get recent challenges for activity feed
      prisma.challenge.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          title: true,
          domain: true,
          reward: true,
          status: true,
          createdAt: true,
          creator: true
        }
      }),
      // Get recent participants for activity feed
      prisma.participant.findMany({
        orderBy: { joinedAt: 'desc' },
        take: 10,
        include: {
          Challenge: {
            select: {
              title: true,
              domain: true
            }
          }
        }
      })
    ]);
    
    console.log('[getPlatformStats] Raw database counts:', { 
      challengeCount, 
      participantCount,
      totalRewardsResult 
    });
    
    // Get unique users (creators + participants)
    const uniqueCreators = await prisma.challenge.findMany({
      distinct: ['creator'],
      select: { creator: true }
    });
    
    const uniqueParticipants = await prisma.participant.findMany({
      distinct: ['userId'],
      select: { userId: true }
    });
    
    console.log('[getPlatformStats] Unique creators:', uniqueCreators.length);
    console.log('[getPlatformStats] Unique participants:', uniqueParticipants.length);
    
    // Combine and deduplicate
    const allUsers = new Set([
      ...uniqueCreators.map(c => c.creator),
      ...uniqueParticipants.map(p => p.userId)
    ]);
    
    // Convert Decimal to number for totalRewards
    const rewardSum = totalRewardsResult._sum.reward;
    const totalRewards = rewardSum ? Number(rewardSum) : 0;
    
    // Calculate domain distribution
    const domainCounts = {};
    challenges.forEach(challenge => {
      const domain = challenge.domain || 'Other';
      domainCounts[domain] = (domainCounts[domain] || 0) + 1;
    });
    
    // Convert to percentage
    const totalChallengesForDomains = challenges.length || 1; // Avoid division by zero
    const topDomains = Object.entries(domainCounts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / totalChallengesForDomains) * 100)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5 domains
    
    // Create recent activity feed
    const recentActivity = [];
    
    // Add funded challenges
    challenges
      .filter(c => c.status === 'funded')
      .slice(0, 3)
      .forEach(challenge => {
        recentActivity.push({
          type: 'challenge_funded',
          title: 'New challenge funded',
          description: `${challenge.title} - ${Number(challenge.reward)} PYUSD`,
          timestamp: challenge.createdAt,
          icon: 'CheckCircle',
          color: 'green'
        });
      });
    
    // Add recent participants
    participants.slice(0, 2).forEach(participant => {
      recentActivity.push({
        type: 'participant_joined',
        title: 'New participant joined',
        description: participant.challenge?.title || 'Challenge',
        timestamp: participant.joinedAt,
        icon: 'Zap',
        color: 'orange'
      });
    });
    
    // Add winner submissions (status === 'WINNER')
    participants
      .filter(p => p.status === 'WINNER')
      .slice(0, 2)
      .forEach(participant => {
        recentActivity.push({
          type: 'submission_verified',
          title: 'Submission verified',
          description: participant.challenge?.title || 'Challenge',
          timestamp: participant.joinedAt,
          icon: 'CheckCircle',
          color: 'blue'
        });
      });
    
    // Sort by timestamp
    recentActivity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    const stats = {
      totalUsers: allUsers.size,
      totalChallenges: challengeCount,
      totalRewards: totalRewards,
      activeParticipants: participantCount,
      topDomains: topDomains.length > 0 ? topDomains : [
        { name: 'No challenges yet', count: 0, percentage: 0 }
      ],
      recentActivity: recentActivity.slice(0, 4) // Show top 4 activities
    };
    
    console.log('[getPlatformStats] Final stats being returned:', {
      ...stats,
      topDomainsCount: stats.topDomains.length,
      recentActivityCount: stats.recentActivity.length
    });
    return stats;
    
  } catch (error) {
    console.error('[getPlatformStats] Error fetching stats from database:', error.message);
    console.error('[getPlatformStats] Error details:', error);
    console.error('[getPlatformStats] Stack trace:', error.stack);
    
    console.warn('[getPlatformStats] Returning fallback zeros due to error');
    return {
      totalUsers: 0,
      totalChallenges: 0,
      totalRewards: 0,
      activeParticipants: 0,
      topDomains: [{ name: 'No data', count: 0, percentage: 0 }],
      recentActivity: []
    };
  } finally {
    console.log('[getPlatformStats] Disconnecting Prisma client...');
    await prisma.$disconnect();
  }

  // Once The Graph is ready, replace above with:
  /*
  const query = `
    {
      platformStats(id: "1") {
        totalUsers
        totalChallenges
        totalRewards
        activeParticipants
      }
    }
  `;
  const data = await queryGraph(query);
  return data.platformStats;
  */
}

/**
 * Fetch challenge-level data
 */
export async function getChallengeStats(challengeId) {
  return {
    challengeId,
    participants: 10,
    verifiedParticipants: 7,
    totalSubmissions: 14,
  };

  /*
  const query = `
    query($id: ID!) {
      challenge(id: $id) {
        id
        title
        participantsCount
        verifiedCount
        submissionsCount
      }
    }
  `;
  const data = await queryGraph(query, { id: challengeId });
  return data.challenge;
  */
}

/**
 * Fetch user participation and proofs
 */
export async function getUserActivity(userId) {
  // TEMP MOCK
  return {
    userId,
    joinedChallenges: 3,
    verifiedProofs: 2,
  };

  // Once live:
  /*
  const query = `
    query($id: ID!) {
      user(id: $id) {
        id
        joinedChallengesCount
        verifiedProofsCount
      }
    }
  `;
  const data = await queryGraph(query, { id: userId });
  return data.user;
  */
}
