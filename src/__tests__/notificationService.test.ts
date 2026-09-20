import { describe, it, expect } from 'vitest';
import { parseReminderTime, isValidReminderTime } from '../utils/notificationService';

describe('Notification Service — Reminder Time Validation (Bug #1)', () => {
  it('allows valid reminder times (09:30 and 23:59 remain schedulable)', () => {
    expect(parseReminderTime('09:30')).toEqual({ hour: 9, minute: 30 });
    expect(isValidReminderTime('09:30')).toBe(true);

    expect(parseReminderTime('23:59')).toEqual({ hour: 23, minute: 59 });
    expect(isValidReminderTime('23:59')).toBe(true);

    expect(parseReminderTime('00:00')).toEqual({ hour: 0, minute: 0 });
    expect(isValidReminderTime('00:00')).toBe(true);
  });

  it('rejects invalid reminder times (25:90, 12:99, -1:30, 99:99)', () => {
    expect(parseReminderTime('25:90')).toBeNull();
    expect(isValidReminderTime('25:90')).toBe(false);

    expect(parseReminderTime('12:99')).toBeNull();
    expect(isValidReminderTime('12:99')).toBe(false);

    expect(parseReminderTime('-1:30')).toBeNull();
    expect(isValidReminderTime('-1:30')).toBe(false);

    expect(parseReminderTime('99:99')).toBeNull();
    expect(isValidReminderTime('99:99')).toBe(false);

    expect(parseReminderTime('abc:def')).toBeNull();
    expect(isValidReminderTime('abc:def')).toBe(false);

    expect(parseReminderTime('12:34:56')).toBeNull();
    expect(isValidReminderTime('12:34:56')).toBe(false);
  });

  it('preserves existing default behavior when reminder time is legitimately omitted', () => {
    expect(parseReminderTime(undefined)).toEqual({ hour: 9, minute: 0 });
    expect(isValidReminderTime(undefined)).toBe(true);

    expect(parseReminderTime(null)).toEqual({ hour: 9, minute: 0 });
    expect(isValidReminderTime(null)).toBe(true);

    expect(parseReminderTime('')).toEqual({ hour: 9, minute: 0 });
    expect(isValidReminderTime('')).toBe(true);

    expect(parseReminderTime('   ')).toEqual({ hour: 9, minute: 0 });
    expect(isValidReminderTime('   ')).toBe(true);
  });

  it('supports Persian digit inputs for valid times', () => {
    expect(parseReminderTime('۰۹:۳۰')).toEqual({ hour: 9, minute: 30 });
    expect(isValidReminderTime('۰۹:۳۰')).toBe(true);

    expect(parseReminderTime('۲۳:۵۹')).toEqual({ hour: 23, minute: 59 });
    expect(isValidReminderTime('۲۳:۵۹')).toBe(true);
  });
});
