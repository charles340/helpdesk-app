import { describe, expect, it } from 'vitest';
import { formatSlaRemaining, slaDueAt, slaState } from './sla';

const HOUR = 60 * 60 * 1000;
const created = new Date('2026-11-24T08:00:00Z');
const at = (hours: number) => new Date(created.getTime() + hours * HOUR);

function ticket(overrides: Partial<Parameters<typeof slaState>[0]> = {}) {
  return {
    status: 'open' as const,
    priority: 'normal' as const,
    createdAt: created,
    slaDueAt: slaDueAt('normal', created), // 24 hours
    resolvedAt: null,
    ...overrides,
  };
}

describe('slaDueAt', () => {
  it('adds the target hours for the priority', () => {
    expect(slaDueAt('urgent', created)).toEqual(at(4));
    expect(slaDueAt('low', created)).toEqual(at(72));
  });
});

describe('slaState', () => {
  it('is on track with plenty of time left', () => {
    expect(slaState(ticket(), at(1))).toBe('on_track');
  });

  it('is at risk in the last quarter of the window', () => {
    expect(slaState(ticket(), at(17.9))).toBe('on_track');
    expect(slaState(ticket(), at(18))).toBe('at_risk');
  });

  it('is breached once the deadline passes', () => {
    expect(slaState(ticket(), at(24.1))).toBe('breached');
  });

  it('compares the resolution time for finished tickets', () => {
    expect(
      slaState(ticket({ status: 'resolved', resolvedAt: at(20) }), at(100)),
    ).toBe('met');
    expect(
      slaState(ticket({ status: 'closed', resolvedAt: at(30) }), at(100)),
    ).toBe('missed');
  });
});

describe('formatSlaRemaining', () => {
  it('shows time left or overdue', () => {
    const due = at(24);
    expect(formatSlaRemaining(due, at(20.5))).toBe('3h 30m left');
    expect(formatSlaRemaining(due, at(26))).toBe('2h 0m overdue');
    expect(formatSlaRemaining(due, at(23.75))).toBe('15m left');
    expect(formatSlaRemaining(at(24 + 52), at(24))).toBe('2d 4h left');
  });
});
