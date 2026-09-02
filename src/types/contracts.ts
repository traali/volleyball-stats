/**
 * Cross-Repo Contract Adapter for volleyball-stats
 * Implements / re-exports the canonical contracts defined in contracts/index.ts.
 */

export type {
  SupportedSport,
  MatchdayContextContract,
  SportStatsContract,
  CrossRepoQueryContract
} from '../../../contracts/index';

import type { SportStatsContract, CrossRepoQueryContract } from '../../../contracts/index';

/**
 * Transforms internal volleyball statistics and set scores into the canonical SportStatsContract.
 */
export function formatVolleyballStatsContract(data: {
  matchId: string;
  recentForm?: string[];
  rank?: number;
  totalTeams?: number;
  points?: number;
  playedMatches?: number;
  h2h?: { wins: number; draws: number; losses: number; lastResult?: string };
  setWinRate?: string;
  topAttacker?: string;
  baseUrl?: string;
}): SportStatsContract {
  const base = data.baseUrl || 'https://volleyball-stats.pages.dev';
  return {
    sport: 'volleyball',
    matchOrTeamId: data.matchId,
    recentForm: data.recentForm,
    standingsSummary: data.rank && data.totalTeams && data.points !== undefined && data.playedMatches !== undefined ? {
      rank: data.rank,
      totalTeams: data.totalTeams,
      points: data.points,
      playedMatches: data.playedMatches
    } : undefined,
    headToHead: data.h2h,
    keyMetrics: {
      ...(data.setWinRate ? { setWinRate: data.setWinRate } : {}),
      ...(data.topAttacker ? { topAttacker: data.topAttacker } : {})
    },
    deepLinkUrl: `${base}/match/${data.matchId}?theme=night-captain`
  };
}

/**
 * Parses incoming query params according to CrossRepoQueryContract.
 */
export function parseIncomingCrossRepoQuery(searchParams: URLSearchParams): CrossRepoQueryContract {
  return {
    theme: searchParams.get('theme') || 'night-captain',
    embed: searchParams.get('embed') === 'true',
    parentOrigin: searchParams.get('parentOrigin') || undefined,
    targetId: searchParams.get('targetId') || searchParams.get('matchId') || undefined
  };
}
