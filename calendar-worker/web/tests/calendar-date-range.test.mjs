import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { after, test } from 'node:test';
import ts from 'typescript';

const previousTimezone = process.env.TZ;
process.env.TZ = 'America/New_York';
after(() => {
  if (previousTimezone === undefined) delete process.env.TZ;
  else process.env.TZ = previousTimezone;
});

const sourceUrl = new URL('../src/lib/date/index.ts', import.meta.url);
const { outputText } = ts.transpileModule(readFileSync(sourceUrl, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
});
const dateModule = {};
new Function('require', 'exports', outputText)(createRequire(sourceUrl), dateModule);
const { getCalendarDateRange, getNavigationDates, getWeekDays, getMonthDays, getWeekdayNames } = dateModule;

function assertRange(date, view, firstDay, lastDay) {
  const { startDate, endDate } = getCalendarDateRange(date, view);
  assert.equal(startDate.getTime(), new Date(`${firstDay}T00:00:00.000`).getTime());
  assert.equal(endDate.getTime(), new Date(`${lastDay}T23:59:59.999`).getTime());
}

test('the reported Sunday anchor loads September 7-13, including the Monday appointment', () => {
  const date = new Date('2026-09-13T21:45:00');
  assertRange(date, 'week', '2026-09-07', '2026-09-13');
  const range = getCalendarDateRange(date, 'week');
  const appointment = new Date('2026-09-07T09:00:00');
  assert.ok(appointment >= range.startDate && appointment <= range.endDate);
});

test('every day in the same visible week produces the same full-day range', () => {
  for (let day = 7; day <= 13; day++) {
    assertRange(new Date(2026, 8, day, 21, 45), 'week', '2026-09-07', '2026-09-13');
  }
});

test('navigating away and back restores the range, including returning to Today', () => {
  const today = new Date();
  const next = getNavigationDates(today, 'week').next;
  const back = getNavigationDates(next, 'week').prev;
  assert.deepEqual(getCalendarDateRange(back, 'week'), getCalendarDateRange(today, 'week'));
  assert.notDeepEqual(getCalendarDateRange(next, 'week'), getCalendarDateRange(today, 'week'));
});

test('the requested week includes all rendered columns through late Sunday', () => {
  const date = new Date('2026-09-13T21:45:00');
  const range = getCalendarDateRange(date, 'week');
  for (const day of getWeekDays(date, 1)) {
    for (const hour of [0, 9, 23]) {
      const eventStart = new Date(day);
      eventStart.setHours(hour, 59, 59, 999);
      assert.ok(eventStart >= range.startDate && eventStart <= range.endDate);
    }
  }
});

test('day navigation loads the whole day, independent of the anchor time', () => {
  const date = new Date('2026-09-07T21:45:00');
  assertRange(date, 'day', '2026-09-07', '2026-09-07');
  assertRange(getNavigationDates(date, 'day').next, 'day', '2026-09-08', '2026-09-08');
});

test('month requests include the last evening and clickable adjacent-month cells', () => {
  const date = new Date('2026-09-13T21:45:00');
  assertRange(date, 'month', '2026-08-31', '2026-10-04');
  const { startDate, endDate } = getCalendarDateRange(date, 'month');
  for (const day of getMonthDays(date)) {
    const lateEvent = new Date(day);
    lateEvent.setHours(23, 59, 59, 999);
    assert.ok(day >= startDate && lateEvent <= endDate);
  }
});

test('month columns run Monday-Sunday across four-, five-, and six-week grids', () => {
  assert.deepEqual(getWeekdayNames(1), ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  const cases = [
    ['2027-02-15', '2027-02-01', '2027-02-28', 28],
    ['2026-02-15', '2026-01-26', '2026-03-01', 35],
    ['2026-09-15', '2026-08-31', '2026-10-04', 35],
    ['2026-08-15', '2026-07-27', '2026-09-06', 42],
    ['2026-12-15', '2026-11-30', '2027-01-03', 35],
  ];

  for (const [anchor, firstDay, lastDay, dayCount] of cases) {
    const date = new Date(`${anchor}T21:45:00`);
    assertRange(date, 'month', firstDay, lastDay);
    const days = getMonthDays(date);
    assert.equal(days.length, dayCount);
    for (let index = 0; index < days.length; index++) {
      assert.equal(days[index].getDay(), (index + 1) % 7);
    }
  }
});

test('weeks spanning daylight saving changes retain the correct local boundaries', () => {
  assertRange(new Date('2026-03-08T21:45:00'), 'week', '2026-03-02', '2026-03-08');
  assertRange(new Date('2026-11-01T21:45:00'), 'week', '2026-10-26', '2026-11-01');
  assertRange(new Date('2026-03-08T21:45:00'), 'day', '2026-03-08', '2026-03-08');
  assertRange(new Date('2026-11-01T21:45:00'), 'day', '2026-11-01', '2026-11-01');
});

test('list loading consistently uses the selected week', () => {
  assertRange(new Date('2026-09-13T21:45:00'), 'list', '2026-09-07', '2026-09-13');
});

test('calculating ranges does not mutate the selected date', () => {
  const date = new Date('2026-09-13T21:45:00');
  const original = date.getTime();
  for (const view of ['week', 'day', 'month', 'list']) {
    getCalendarDateRange(date, view);
    assert.equal(date.getTime(), original);
  }
});
