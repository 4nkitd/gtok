import { describe, expect, it } from 'vitest';
import { describeAge, formatCount, formatStars } from './format';

describe('formatCount', () => {
  it.each([
    [0, '0'],
    [999, '999'],
    [1200, '1.2k'],
    [45_000, '45k'],
    [1_250_000, '1.3m'],
  ])('%d -> %s', (value, expected) => {
    expect(formatCount(value)).toBe(expected);
  });
});

describe('formatStars', () => {
  it.each([
    [1, '1 star'],
    [6012, '6,012 stars'],
    [45_300, '45.3k stars'],
  ])('%d -> %s', (value, expected) => {
    expect(formatStars(value)).toBe(expected);
  });
});

describe('describeAge', () => {
  const now = new Date('2026-10-05T12:00:00Z');

  it.each([
    ['2026-10-05T01:00:00Z', 'today'],
    ['2026-10-04T11:00:00Z', 'in 1 day'],
    ['2026-10-01T12:00:00Z', 'in 4 days'],
    ['2026-10-06T00:00:00Z', 'today'],
  ])('%s -> %s', (createdAt, expected) => {
    expect(describeAge(createdAt, now)).toBe(expected);
  });
});
