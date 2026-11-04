// @vitest-environment node
import { describe, expect, test } from "vitest";
import {
  calculateHourByHourShiftSchedule,
  serializeShift,
  SerializedShift,
  type ShiftForSchedule,
} from "~/components/shift-scheduling";
import type { schedulesTable } from "~/db/schema";
import type { InferSelectModel } from "drizzle-orm";

const hourMs = 60 * 60 * 1000;
const base = Date.UTC(2026, 5, 1, 0, 0, 0);
const at = (hours: number) => new Date(base + hours * hourMs);
const range = (startHour: number, finishHour: number) => ({
  start: at(startHour),
  finish: at(finishHour),
  includeStart: true,
  includeFinish: false,
});

function schedule(startHour: number, finishHour: number) {
  // only the timespan matters to the calculation
  return { timespan: range(startHour, finishHour) } as InferSelectModel<
    typeof schedulesTable
  >;
}

function shift(
  id: number,
  startHour: number,
  finishHour: number,
): ShiftForSchedule {
  return {
    id,
    timespan: range(startHour, finishHour),
    shiftAssignments: [
      {
        id: id * 10,
        responderId: 1,
        position: 1,
        responder: { id: 1, name: "Pat" },
      },
    ],
  };
}

describe("calculateHourByHourShiftSchedule", () => {
  test("has one entry per hour of the schedule, each pointing at the shift covering it", () => {
    const result = calculateHourByHourShiftSchedule({
      schedule: schedule(0, 6),
      shifts: [shift(1, 0, 2), shift(2, 3, 5)],
    });

    expect(result.hourStarts.map((d) => d.getTime())).toEqual(
      [0, 1, 2, 3, 4, 5].map((h) => at(h).getTime()),
    );
    const covering = result.hourStarts.map((d) =>
      result.shiftIdByHourStart.get(d),
    );
    // hour 2 is a gap, and hour 5 is after the last shift but within the schedule
    expect(covering).toEqual([1, 1, undefined, 2, 2, undefined]);
  });

  test("clamps a huge schedule timespan to 14 days, starting at the first shift", () => {
    const result = calculateHourByHourShiftSchedule({
      schedule: {
        timespan: {
          start: new Date("1970-01-01T00:00:00Z"),
          finish: new Date("2100-01-01T00:00:00Z"),
          includeStart: true,
          includeFinish: false,
        },
      } as InferSelectModel<typeof schedulesTable>,
      shifts: [shift(1, 0, 2)],
    });

    expect(result.start.getTime()).toEqual(at(0).getTime());
    expect(result.hourStarts.length).toBeLessThanOrEqual(14 * 24);
    expect(result.shiftIdByHourStart.get(result.hourStarts[0])).toEqual(1);
  });

  test("a shift ends at its finish: the hour starting then isn't covered", () => {
    const result = calculateHourByHourShiftSchedule({
      schedule: schedule(0, 2),
      shifts: [shift(1, 0, 1)],
    });
    expect(
      result.hourStarts.map((d) => result.shiftIdByHourStart.get(d)),
    ).toEqual([1, undefined]);
  });

  test("stretches past the schedule to take in shifts outside it", () => {
    const result = calculateHourByHourShiftSchedule({
      schedule: schedule(2, 4),
      shifts: [shift(1, 0, 1), shift(2, 5, 7)],
    });
    expect(result.start).toEqual(at(0));
    expect(result.finish).toEqual(at(7));
    expect(result.hourStarts).toHaveLength(7);
  });

  test("sorts the shifts itself and indexes them by id", () => {
    const result = calculateHourByHourShiftSchedule({
      schedule: schedule(0, 4),
      shifts: [shift(2, 2, 4), shift(1, 0, 2)],
    });
    expect([...result.shiftsById.keys()]).toEqual([1, 2]);
    expect(
      result.hourStarts.map((d) => result.shiftIdByHourStart.get(d)),
    ).toEqual([1, 1, 2, 2]);
  });

  test("with no shifts it's just the schedule's hours, all uncovered", () => {
    const result = calculateHourByHourShiftSchedule({
      schedule: schedule(0, 3),
      shifts: [],
    });
    expect(result.hourStarts).toHaveLength(3);
    expect(
      result.hourStarts.every(
        (d) => result.shiftIdByHourStart.get(d) === undefined,
      ),
    ).toBe(true);
  });
});

describe("serializeShift", () => {
  test("turns a shift into the JSON the shift routes accept", () => {
    const serialized = serializeShift({
      timespan: range(0, 2),
      shiftAssignments: [
        {
          id: 1,
          responderId: 7,
          position: 1,
          responder: { id: 7, name: "Pat" },
        },
        {
          id: 2,
          responderId: 9,
          position: 2,
          responder: { id: 9, name: "Sam" },
        },
      ],
    });

    expect(serialized).toEqual({
      timespan: { start: at(0).toISOString(), finish: at(2).toISOString() },
      shiftAssignments: [{ responderId: 7 }, { responderId: 9 }],
    });
    expect(
      SerializedShift.parse(JSON.parse(JSON.stringify(serialized))),
    ).toEqual(serialized);
  });
});
