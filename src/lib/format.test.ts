import { describe, expect, it } from 'vitest';
import { formatCount } from './format';

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
