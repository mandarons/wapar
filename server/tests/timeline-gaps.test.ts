import { describe, it, expect } from 'bun:test';
import { fillTimelineGaps } from '../src/utils/timeline-gaps';

describe('fillTimelineGaps', () => {
  const dayMs = 86400000;

  it('should fill missing days with zero entries', () => {
    const now = new Date('2026-08-10T12:00:00Z');
    const start = new Date(now.getTime() - 6 * dayMs); // 7 days total
    const timeline = [
      { date: '2026-08-10', activeUsers: 5, totalHeartbeats: 20 },
      { date: '2026-08-08', activeUsers: 3, totalHeartbeats: 10 },
      { date: '2026-08-04', activeUsers: 2, totalHeartbeats: 8 },
    ];

    const { timeline: filled, gaps } = fillTimelineGaps(
      timeline,
      start,
      now,
      'day',
      { activeUsers: 0, totalHeartbeats: 0 }
    );

    expect(filled.length).toBe(7);
    // Should be sorted ascending
    expect(filled[0].date).toBe('2026-08-04');
    expect(filled[6].date).toBe('2026-08-10');

    // Missing dates should have zero values
    const aug5 = filled.find(e => e.date === '2026-08-05');
    expect(aug5).toBeDefined();
    expect(aug5!.activeUsers).toBe(0);
    expect(aug5!.totalHeartbeats).toBe(0);

    const aug9 = filled.find(e => e.date === '2026-08-09');
    expect(aug9).toBeDefined();
    expect(aug9!.activeUsers).toBe(0);
  });

  it('should return empty gaps when no missing dates', () => {
    const now = new Date('2026-08-10T12:00:00Z');
    const start = new Date(now.getTime() - 2 * dayMs); // 3 days total
    const timeline = [
      { date: '2026-08-08', activeUsers: 1, totalHeartbeats: 5 },
      { date: '2026-08-09', activeUsers: 2, totalHeartbeats: 10 },
      { date: '2026-08-10', activeUsers: 3, totalHeartbeats: 15 },
    ];

    const { timeline: filled, gaps } = fillTimelineGaps(
      timeline,
      start,
      now,
      'day',
      { activeUsers: 0, totalHeartbeats: 0 }
    );

    expect(filled.length).toBe(3);
    expect(gaps.length).toBe(0);
  });

  it('should detect a full gap (all dates zero)', () => {
    const now = new Date('2026-08-10T12:00:00Z');
    const start = new Date(now.getTime() - 6 * dayMs); // 7 days total
    const timeline: Array<{ date: string; activeUsers: number; totalHeartbeats: number }> = [];

    const { timeline: filled, gaps } = fillTimelineGaps(
      timeline,
      start,
      now,
      'day',
      { activeUsers: 0, totalHeartbeats: 0 }
    );

    expect(filled.length).toBe(7);
    expect(gaps.length).toBe(1);
    expect(gaps[0].from).toBe('2026-08-04');
    expect(gaps[0].to).toBe('2026-08-10');
    expect(gaps[0].days).toBe(7);
  });

  it('should detect a partial gap in the middle', () => {
    const now = new Date('2026-08-10T12:00:00Z');
    const start = new Date(now.getTime() - 6 * dayMs); // 7 days: Aug 4-10
    const timeline = [
      { date: '2026-08-04', activeUsers: 5, totalHeartbeats: 20 },
      { date: '2026-08-05', activeUsers: 3, totalHeartbeats: 10 },
      // Aug 6, 7 missing (zero) = gap
      { date: '2026-08-08', activeUsers: 4, totalHeartbeats: 15 },
      { date: '2026-08-09', activeUsers: 2, totalHeartbeats: 8 },
      { date: '2026-08-10', activeUsers: 6, totalHeartbeats: 25 },
    ];

    const { timeline: filled, gaps } = fillTimelineGaps(
      timeline,
      start,
      now,
      'day',
      { activeUsers: 0, totalHeartbeats: 0 }
    );

    expect(filled.length).toBe(7);
    expect(gaps.length).toBe(1);
    expect(gaps[0].from).toBe('2026-08-06');
    expect(gaps[0].to).toBe('2026-08-07');
    expect(gaps[0].days).toBe(2);
  });

  it('should detect multiple disjoint gaps', () => {
    const now = new Date('2026-08-10T12:00:00Z');
    const start = new Date(now.getTime() - 9 * dayMs); // 10 days: Aug 1-10
    const timeline = [
      { date: '2026-08-01', activeUsers: 5, totalHeartbeats: 20 },
      // Aug 2-3 gap
      { date: '2026-08-04', activeUsers: 3, totalHeartbeats: 10 },
      { date: '2026-08-05', activeUsers: 2, totalHeartbeats: 8 },
      // Aug 6-8 gap
      { date: '2026-08-09', activeUsers: 4, totalHeartbeats: 15 },
      { date: '2026-08-10', activeUsers: 6, totalHeartbeats: 25 },
    ];

    const { timeline: filled, gaps } = fillTimelineGaps(
      timeline,
      start,
      now,
      'day',
      { activeUsers: 0, totalHeartbeats: 0 }
    );

    expect(filled.length).toBe(10);
    expect(gaps.length).toBe(2);
    expect(gaps[0].from).toBe('2026-08-02');
    expect(gaps[0].to).toBe('2026-08-03');
    expect(gaps[0].days).toBe(2);
    expect(gaps[1].from).toBe('2026-08-06');
    expect(gaps[1].to).toBe('2026-08-08');
    expect(gaps[1].days).toBe(3);
  });

  it('should handle empty timeline by returning a full-period gap', () => {
    const now = new Date('2026-08-10T12:00:00Z');
    const start = new Date(now.getTime() - 2 * dayMs);

    const { timeline: filled, gaps } = fillTimelineGaps(
      [],
      start,
      now,
      'day',
      { activeUsers: 0, totalHeartbeats: 0 }
    );

    expect(filled.length).toBe(3);
    expect(gaps.length).toBe(1);
    expect(gaps[0].days).toBe(3);
  });

  it('should fill missing weeks with zero entries', () => {
    const now = new Date('2026-08-10T12:00:00Z');
    const start = new Date('2026-07-01T00:00:00Z');
    const timeline = [
      { date: '2026-W27', newUsers: 10, reinstalls: 2, total: 12 },
      { date: '2026-W32', newUsers: 15, reinstalls: 3, total: 18 },
    ];

    const { timeline: filled, gaps } = fillTimelineGaps(
      timeline,
      start,
      now,
      'week',
      { newUsers: 0, reinstalls: 0, total: 0 }
    );

    // Should have entries for all weeks
    expect(filled.length).toBeGreaterThan(2);
    // Gap detected between week 27 and 32
    expect(gaps.length).toBeGreaterThanOrEqual(1);
  });

  it('should fill missing months with zero entries', () => {
    const now = new Date('2026-08-10T12:00:00Z');
    const start = new Date('2026-01-01T00:00:00Z');
    const timeline = [
      { date: '2026-01', newUsers: 100, reinstalls: 10, total: 110 },
      { date: '2026-08', newUsers: 150, reinstalls: 15, total: 165 },
    ];

    const { timeline: filled, gaps } = fillTimelineGaps(
      timeline,
      start,
      now,
      'month',
      { newUsers: 0, reinstalls: 0, total: 0 }
    );

    expect(filled.length).toBe(8); // Jan through Aug
    expect(gaps.length).toBe(1); // Feb-Jul is a gap
    expect(gaps[0].from).toBe('2026-02');
    expect(gaps[0].to).toBe('2026-07');
  });

  it('should preserve existing entries and only fill missing ones', () => {
    const now = new Date('2026-08-10T12:00:00Z');
    const start = new Date(now.getTime() - 2 * dayMs);
    const timeline = [
      { date: '2026-08-08', activeUsers: 7, totalHeartbeats: 42 },
      { date: '2026-08-10', activeUsers: 3, totalHeartbeats: 12 },
    ];

    const { timeline: filled } = fillTimelineGaps(
      timeline,
      start,
      now,
      'day',
      { activeUsers: 0, totalHeartbeats: 0 }
    );

    const aug8 = filled.find(e => e.date === '2026-08-08');
    expect(aug8!.activeUsers).toBe(7);
    expect(aug8!.totalHeartbeats).toBe(42);

    const aug10 = filled.find(e => e.date === '2026-08-10');
    expect(aug10!.activeUsers).toBe(3);
    expect(aug10!.totalHeartbeats).toBe(12);
  });
});
