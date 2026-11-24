import { describe, expect, it } from 'vitest';
import { containsPattern } from '@/server/sql';
import { niceTicks } from './chart';
import { dayKey, formatDayKey, formatDuration, lastDayKeys } from './format';
import { excerpt } from './markdown';
import { SLUG_MAX_LENGTH, slugify } from './slug';

describe('slugify', () => {
  it('keeps letters and numbers and joins words with dashes', () => {
    expect(slugify('Connecting to the VPN')).toBe('connecting-to-the-vpn');
    expect(slugify('  Wi-Fi: 2nd floor!! ')).toBe('wi-fi-2nd-floor');
  });

  it('turns accented letters into plain ones', () => {
    expect(slugify('Kako spojiti VPN? Đurđevac čćšž')).toBe(
      'kako-spojiti-vpn-durdevac-ccsz',
    );
    expect(slugify('Ærø Łódź Straße')).toBe('aero-lodz-strasse');
  });

  it('returns an empty string when nothing usable is left', () => {
    expect(slugify('---')).toBe('');
    expect(slugify('???')).toBe('');
  });

  it('caps the length without a trailing dash', () => {
    const slug = slugify(`${'word '.repeat(40)}end`);
    expect(slug.length).toBeLessThanOrEqual(SLUG_MAX_LENGTH);
    expect(slug.endsWith('-')).toBe(false);
  });
});

describe('excerpt', () => {
  it('drops headings and Markdown syntax', () => {
    const md =
      '## Connect to the VPN\n\n1. Open the **VPN client**.\n2. See [the guide](https://example.test).';
    expect(excerpt(md)).toBe('Open the VPN client. See the guide.');
  });

  it('cuts long text at a word boundary', () => {
    const text = excerpt('alpha beta gamma delta epsilon', 14);
    expect(text).toBe('alpha beta…');
  });
});

describe('niceTicks', () => {
  it('starts at zero and ends at or above the max', () => {
    expect(niceTicks(0)).toEqual([0, 1]);
    expect(niceTicks(1)).toEqual([0, 1]);
    expect(niceTicks(3)).toEqual([0, 1, 2, 3]);
    expect(niceTicks(7)).toEqual([0, 2, 4, 6, 8]);
    expect(niceTicks(23)).toEqual([0, 10, 20, 30]);
  });
});

describe('dates in the team time zone', () => {
  it('assigns a moment to the local calendar day', () => {
    // 23:30 UTC is already the next day in Zagreb.
    expect(dayKey(new Date('2026-11-23T23:30:00Z'))).toBe('2026-11-24');
  });

  it('lists each day once across the end of daylight saving time', () => {
    // Clocks go back on 25 October 2026. This is 00:30 on 26 October in Zagreb.
    const now = new Date('2026-10-25T23:30:00Z');
    expect(lastDayKeys(3, now)).toEqual([
      '2026-10-24',
      '2026-10-25',
      '2026-10-26',
    ]);
  });

  it('formats day keys and durations for people', () => {
    expect(formatDayKey('2026-11-24')).toBe('24 Nov');
    expect(formatDuration(45 * 60)).toBe('45m');
    expect(formatDuration(3 * 3600 + 20 * 60)).toBe('3h 20m');
    expect(formatDuration(52 * 3600)).toBe('2d 4h');
  });
});

describe('containsPattern', () => {
  it('matches the user text literally inside ILIKE', () => {
    expect(containsPattern('vpn')).toBe('%vpn%');
    expect(containsPattern('50%_off\\')).toBe('%50\\%\\_off\\\\%');
  });
});
