import type { InferSelectModel } from "drizzle-orm";
import { Temporal, toTemporalInstant } from "temporal-polyfill";
import type { schedulesTable } from "~/db/schema";
import type { TimestampRange } from "~/db/tsRange";
import BootstrapIcon from "./bootstrap-icon";
import sortBy from "lodash/sortBy";
import { Link } from "react-router";
import dateTimeFormats from "~/dateTimeFormats";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";

export function calculateHourByHourShiftSchedule({
  shifts: unsortedShifts,
  schedule,
}: {
  shifts: {
    id: number;
    timespan: TimestampRange;
    shiftAssignments: {
      responderId: number;
      position: number;
      responder: { id: number; name: string };
    }[];
  }[];
  schedule: InferSelectModel<typeof schedulesTable>;
}) {
  const shifts = [...unsortedShifts].sort(
    (a, b) => a.timespan.start.getTime() - b.timespan.start.getTime(),
  );
  const shiftsById = new Map(shifts.map((shift) => [shift.id, shift]));

  const start = new Date(
    Math.min(
      shifts[0].timespan.start.getTime(),
      schedule.timespan.start.getTime(),
    ),
  );
  const finish = new Date(
    Math.max(
      shifts[shifts.length - 1].timespan.finish.getTime(),
      schedule.timespan.finish.getTime(),
    ),
  );

  const hourStarts: Date[] = [];
  const shiftIdByHourStart = new Map();
  for (
    let hourStart = start;
    hourStart.getTime() < finish.getTime();
    hourStart = new Date(
      toTemporalInstant
        .apply(hourStart)
        .add(Temporal.Duration.from({ hours: 1 })).epochMilliseconds,
    )
  ) {
    hourStarts.push(hourStart);
    shiftIdByHourStart.set(
      hourStart,
      shifts.find(
        (shift) =>
          shift.timespan.start.getTime() <= hourStart.getTime() &&
          shift.timespan.finish.getTime() > hourStart.getTime(),
      )?.id,
    );
  }

  return { shiftIdByHourStart, shiftsById, hourStarts, start, finish };
}

export function ShiftScheduleRow({
  hourStart,
  shiftsById,
  shiftIdByHourStart,
  index,
}: Pick<
  ReturnType<typeof calculateHourByHourShiftSchedule>,
  "shiftIdByHourStart" | "shiftsById"
> & { hourStart: Date; index: number }) {
  const shift = shiftsById.get(shiftIdByHourStart.get(hourStart));
  const isShiftStartRow =
    shift && hourStart.getTime() === shift.timespan.start.getTime();
  const isShiftFinishRow = shift
    ? toTemporalInstant
        .apply(hourStart)
        .add(Temporal.Duration.from({ hours: 1 })).epochMilliseconds >=
      toTemporalInstant.apply(shift.timespan.finish).epochMilliseconds
    : false;
  const shiftHours = shift
    ? toTemporalInstant
        .apply(shift.timespan.finish)
        .since(toTemporalInstant.apply(shift.timespan.start))
        .round("hours").hours
    : 1;

  return (
    <tr>
      <td className={shift && !isShiftFinishRow ? "border-bottom-0" : ""}>
        {Intl.DateTimeFormat(
          undefined,
          index === 0 || hourStart.getHours() === 0
            ? dateTimeFormats.ampmDateTime
            : dateTimeFormats.ampmTime,
        ).format(hourStart)}
      </td>
      {shift ? (
        isShiftStartRow && (
          <>
            <td rowSpan={shiftHours}>
              <ol className="mb-0">
                {sortBy(
                  shift.shiftAssignments,
                  (shiftAssignment) => shiftAssignment.position,
                ).map(({ responder }) => (
                  <li key={responder.id}>
                    <Link to={`/responders/${responder.id}`}>
                      {responder.name}
                    </Link>
                  </li>
                ))}
              </ol>
            </td>
            <td rowSpan={shiftHours}>
              <button className="btn btn-outline-primary btn-sm">
                <BootstrapIcon name="pencil-fill" /> Edit shift
              </button>
            </td>
          </>
        )
      ) : (
        <>
          <td />
          <td>
            <button className="btn btn-outline-primary btn-sm">
              <BootstrapIcon name="plus-circle-fill" /> Add shift
            </button>
          </td>
        </>
      )}
    </tr>
  );
}

export function ShiftScheduleTable({
  shifts,
  schedule,
}: Parameters<typeof calculateHourByHourShiftSchedule>[0]) {
  const { t } = useTranslation();
  const { shiftIdByHourStart, shiftsById, hourStarts } = useMemo(
    () => calculateHourByHourShiftSchedule({ shifts, schedule }),
    [shifts, schedule],
  );

  return (
    <table className="table">
      <thead>
        <th>{t("schedules.shifts.timespan")}</th>
        <th>{t("schedules.shifts.responders")}</th>
      </thead>
      <tbody>
        {hourStarts.map((hourStart, index) => (
          <ShiftScheduleRow
            key={hourStart.toISOString()}
            hourStart={hourStart}
            index={index}
            shiftIdByHourStart={shiftIdByHourStart}
            shiftsById={shiftsById}
          />
        ))}
      </tbody>
    </table>
  );
}
