import { describe, expect, it } from 'vitest';
import { allowedTransitions, canTransition, isActive } from './ticket-workflow';

describe('requester transitions', () => {
  it('can withdraw a ticket nobody has solved yet', () => {
    expect(allowedTransitions('new', 'user')).toEqual(['closed']);
    expect(canTransition('pending', 'closed', 'user')).toBe(true);
  });

  it('can reopen or confirm a resolved ticket', () => {
    expect(allowedTransitions('resolved', 'user')).toEqual(['open', 'closed']);
  });

  it('cannot move tickets along for the agents', () => {
    expect(canTransition('new', 'open', 'user')).toBe(false);
    expect(canTransition('open', 'resolved', 'user')).toBe(false);
    expect(allowedTransitions('closed', 'user')).toEqual([]);
  });
});

describe('staff transitions', () => {
  it('lets agents and admins reopen closed tickets', () => {
    expect(canTransition('closed', 'open', 'agent')).toBe(true);
    expect(canTransition('closed', 'open', 'admin')).toBe(true);
  });

  it('never offers the current status', () => {
    for (const status of [
      'new',
      'open',
      'pending',
      'resolved',
      'closed',
    ] as const) {
      expect(allowedTransitions(status, 'agent')).not.toContain(status);
    }
  });
});

describe('isActive', () => {
  it('is true until a ticket is resolved', () => {
    expect(['new', 'open', 'pending'].every((s) => isActive(s as 'new'))).toBe(
      true,
    );
    expect(isActive('resolved')).toBe(false);
    expect(isActive('closed')).toBe(false);
  });
});
