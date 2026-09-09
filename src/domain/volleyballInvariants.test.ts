import { describe, it, expect } from 'vitest';

describe('Volleyball Domain Invariants', () => {
  // 1. 25-point regular / 15-point tiebreak threshold checks
  describe('Set Score Threshold Checks', () => {
    function isValidSetScore(setNumber: number, scoreA: number, scoreB: number): boolean {
      const target = setNumber === 5 ? 15 : 25;
      const maxScore = Math.max(scoreA, scoreB);
      const minScore = Math.min(scoreA, scoreB);
      const diff = maxScore - minScore;

      // Must reach target and win by at least 2 points
      if (maxScore < target) return false;
      if (maxScore === target && diff < 2) return false;
      if (maxScore > target && diff !== 2) return false;
      return true;
    }

    it('validates standard 25-point sets (Sets 1-4)', () => {
      expect(isValidSetScore(1, 25, 21)).toBe(true);
      expect(isValidSetScore(2, 23, 25)).toBe(true);
      expect(isValidSetScore(3, 25, 18)).toBe(true);
      expect(isValidSetScore(4, 25, 22)).toBe(true);
      expect(isValidSetScore(1, 24, 21)).toBe(false); // under 25
      expect(isValidSetScore(1, 25, 25)).toBe(false); // tied at target
    });

    it('validates 15-point tiebreak set (Set 5)', () => {
      expect(isValidSetScore(5, 15, 13)).toBe(true);
      expect(isValidSetScore(5, 15, 10)).toBe(true);
      expect(isValidSetScore(5, 14, 12)).toBe(false); // under 15
      expect(isValidSetScore(5, 15, 14)).toBe(false); // only 1-point margin
    });

    it('enforces total match sets won is strictly 3', () => {
      const matchSets = [
        { home: 25, away: 21 },
        { home: 23, away: 25 },
        { home: 25, away: 18 },
        { home: 25, away: 22 },
      ];
      const homeWon = matchSets.filter(s => s.home > s.away).length;
      const awayWon = matchSets.filter(s => s.away > s.home).length;
      expect(homeWon).toBe(3);
      expect(awayWon).toBe(1);
    });
  });

  // 2. 2-Point Margin Deuces
  describe('2-Point Margin Deuce Rules', () => {
    function isValidDeuce(scoreA: number, scoreB: number, target = 25): boolean {
      const max = Math.max(scoreA, scoreB);
      const min = Math.min(scoreA, scoreB);
      if (max <= target) return (max === target && max - min >= 2);
      return (max - min === 2);
    }

    it('accepts valid deuce scores', () => {
      expect(isValidDeuce(26, 24)).toBe(true);
      expect(isValidDeuce(27, 25)).toBe(true);
      expect(isValidDeuce(31, 29)).toBe(true);
      expect(isValidDeuce(18, 16, 15)).toBe(true);
    });

    it('rejects invalid 1-point margin or over-extended scores', () => {
      expect(isValidDeuce(25, 24)).toBe(false);
      expect(isValidDeuce(26, 25)).toBe(false);
      expect(isValidDeuce(28, 25)).toBe(false); // diff must be exactly 2 beyond target
    });
  });

  // 3. Lentopalloliitto 3-1 / 3-2 Standing Point Rules
  describe('Lentopalloliitto Standings Point Invariants', () => {
    function computeMatchPoints(setsWinner: number, setsLoser: number): { winPts: number; lossPts: number } {
      if (setsWinner !== 3) throw new Error('Winner must win exactly 3 sets');
      if (setsLoser === 0 || setsLoser === 1) {
        return { winPts: 3, lossPts: 0 };
      }
      if (setsLoser === 2) {
        return { winPts: 2, lossPts: 1 };
      }
      throw new Error(`Invalid sets loser: ${setsLoser}`);
    }

    it('awards 3-0 points for 3-0 and 3-1 wins', () => {
      expect(computeMatchPoints(3, 0)).toEqual({ winPts: 3, lossPts: 0 });
      expect(computeMatchPoints(3, 1)).toEqual({ winPts: 3, lossPts: 0 });
    });

    it('awards 2-1 points for 3-2 tiebreak wins', () => {
      expect(computeMatchPoints(3, 2)).toEqual({ winPts: 2, lossPts: 1 });
    });

    it('verifies that total points distributed per played match is strictly 3', () => {
      const r1 = computeMatchPoints(3, 1);
      const r2 = computeMatchPoints(3, 2);
      expect(r1.winPts + r1.lossPts).toBe(3);
      expect(r2.winPts + r2.lossPts).toBe(3);
    });

    it('calculates set quotient (Q_set) accurately', () => {
      const setsWon = 24;
      const setsLost = 8;
      const qSet = setsWon / setsLost;
      expect(qSet).toBe(3.0);
    });
  });

  // 4. WhatsApp Briefing Token Safety
  describe('Volleyball WhatsApp Briefing Token Safety', () => {
    const TOKEN_LEAK_REGEX = /(?:\b(?:undefined|null|NaN)\b|\[object Object\]|\[SYÖTÄ TULOS\]|\[PVM\])/;

    it('passes for clean volleyball briefing', () => {
      const briefing = '🏐 OTTELURAPORTTI: Sampo 3 – 1 Isku-Veikot\nErät: 25–22, 25–18, 23–25, 25–22\nEräsuhde: 3–1 (Pisteet: 98–87)';
      expect(TOKEN_LEAK_REGEX.test(briefing)).toBe(false);
    });

    it('does not false-positive on Finnish word annulloitu', () => {
      const text = 'Ottelutulos on annulloitu tuomarivirheen vuoksi.';
      expect(TOKEN_LEAK_REGEX.test(text)).toBe(false);
    });

    it('detects unrendered template placeholders', () => {
      expect(TOKEN_LEAK_REGEX.test('Eräpisteet: [object Object]')).toBe(true);
      expect(TOKEN_LEAK_REGEX.test('Pistejako: undefined')).toBe(true);
      expect(TOKEN_LEAK_REGEX.test('Eräsuhde: NaN')).toBe(true);
      expect(TOKEN_LEAK_REGEX.test('Pisteet: null')).toBe(true);
      expect(TOKEN_LEAK_REGEX.test('Pelipäivä: [PVM]')).toBe(true);
      expect(TOKEN_LEAK_REGEX.test('Tulos: [SYÖTÄ TULOS]')).toBe(true);
    });
  });
});
