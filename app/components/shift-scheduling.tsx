import type { InferSelectModel } from "drizzle-orm";
import { Temporal, toTemporalInstant } from "temporal-polyfill";
import type { respondersTable, schedulesTable } from "~/db/schema";
import type { TimestampRange } from "~/db/tsRange";
import BootstrapIcon from "./bootstrap-icon";
import sortBy from "lodash/sortBy";
import { Link, useFetcher } from "react-router";
import dateTimeFormats from "~/dateTimeFormats";
import { useTranslation } from "react-i18next";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BootstrapFormSelect,
  useArrayBasicSortableHandlers,
  useConfirm,
} from "@neinteractiveliterature/litform";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ControlledDatetimeInput } from "./forms/controlled-datetime-input";
import { DndContext } from "@dnd-kit/core";
import { getSortableStyle } from "./sortable-utils";
import z from "zod";
import { ErrorDisplay } from "./error-display";

export type ShiftForSchedule = {
  id: number;
  timespan: TimestampRange;
  shiftAssignments: {
    id: number;
    responderId: number;
    position: number;
    responder: { id: number; name: string };
  }[];
};

// The table has one row per hour, so a very long schedule timespan (e.g. the
// old 1970-2100 default) would mean over a million rows.  Cap the range shown.
const MAX_HOUR_BY_HOUR_RANGE_MS = 14 * 24 * 60 * 60 * 1000;

export function calculateHourByHourShiftSchedule({
  shifts: unsortedShifts,
  schedule,
}: {
  shifts: ShiftForSchedule[];
  schedule: InferSelectModel<typeof schedulesTable>;
}) {
  const shifts = [...unsortedShifts].sort(
    (a, b) => a.timespan.start.getTime() - b.timespan.start.getTime(),
  );
  const shiftsById = new Map(shifts.map((shift) => [shift.id, shift]));

  let start = new Date(
    Math.min(
      ...(shifts.length > 0 ? [shifts[0].timespan.start.getTime()] : []),
      schedule.timespan.start.getTime(),
    ),
  );
  let finish = new Date(
    Math.max(
      ...(shifts.length > 0
        ? [shifts[shifts.length - 1].timespan.finish.getTime()]
        : []),
      schedule.timespan.finish.getTime(),
    ),
  );

  if (finish.getTime() - start.getTime() > MAX_HOUR_BY_HOUR_RANGE_MS) {
    // Start from the first shift if there is one, otherwise from now, but
    // never before the beginning of the range.
    const anchor = shifts.length > 0 ? shifts[0].timespan.start : new Date();
    start = new Date(
      Math.min(Math.max(start.getTime(), anchor.getTime()), finish.getTime()),
    );
    finish = new Date(
      Math.min(finish.getTime(), start.getTime() + MAX_HOUR_BY_HOUR_RANGE_MS),
    );
  }

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

export function ShiftAssignmentRow({
  shiftAssignment,
  setShiftAssignment,
  responders,
}: {
  shiftAssignment: ShiftForSchedule["shiftAssignments"][number];
  setShiftAssignment: React.Dispatch<
    ShiftForSchedule["shiftAssignments"][number]
  >;
  responders: InferSelectModel<typeof respondersTable>[];
}) {
  const {
    setNodeRef,
    isDragging,
    attributes,
    listeners,
    transform,
    transition,
  } = useSortable({ id: shiftAssignment.id.toString() });
  const { t } = useTranslation();
  const style = getSortableStyle(transform, transition, isDragging);
  const sortedResponders = useMemo(
    () => sortBy(responders, (responder) => responder.name),
    [responders],
  );

  return (
    <li className="list-group-item" ref={setNodeRef} style={style}>
      <div className="d-flex">
        <div className="me-2" {...attributes} {...listeners}>
          <span className="visually-hidden">{t("buttons.dragToReorder")}</span>
          <i className="cursor-grab bi-grip-vertical" />
        </div>
        <div className="flex-grow-1">
          <select
            className="form-select"
            value={shiftAssignment.responderId}
            onChange={(event) => {
              const responder = responders.find(
                (r) => r.id.toString() === event.target.value,
              );
              if (responder) {
                setShiftAssignment({
                  ...shiftAssignment,
                  responderId: responder.id,
                  responder: {
                    id: responder.id,
                    name: responder.name,
                  },
                });
              }
            }}
          >
            {sortedResponders.map((responder) => (
              <option key={responder.id} value={responder.id}>
                {responder.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </li>
  );
}

export function AddResponderRow({
  responders,
  cancel,
  save,
}: {
  responders: InferSelectModel<typeof respondersTable>[];
  cancel: () => void;
  save: (responderId: string) => void;
}) {
  const sortedResponders = useMemo(
    () => sortBy(responders, (responder) => responder.name),
    [responders],
  );
  const [responderId, setResponderId] = useState<string>();
  const { t } = useTranslation();

  return (
    <>
      <BootstrapFormSelect
        label={t("shifts.respondersTable.addResponderSelect")}
        value={responderId}
        onValueChange={(value) => setResponderId(value)}
      >
        <option />
        {sortedResponders.map((responder) => (
          <option key={responder.id} value={responder.id}>
            {responder.name}
          </option>
        ))}
      </BootstrapFormSelect>

      <div className="text-end">
        <button className="btn btn-sm btn-outline-secondary" onClick={cancel}>
          {t("buttons.cancel")}
        </button>{" "}
        <button
          className="btn btn-sm btn-outline-primary"
          onClick={() => {
            if (responderId) {
              save(responderId);
            }
          }}
        >
          {t("buttons.save")}
        </button>
      </div>
    </>
  );
}

export function ShiftForm({
  initialShift,
  save,
  cancel,
  responders,
  timeZone,
}: {
  initialShift: Omit<ShiftForSchedule, "id">;
  save: (shift: Omit<ShiftForSchedule, "id">) => Promise<unknown>;
  cancel: () => void;
  responders: InferSelectModel<typeof respondersTable>[];
  timeZone: string;
}) {
  const [shift, setShift] = useState(initialShift);
  const { t } = useTranslation();
  const [shiftAssignments, setShiftAssignments] = useState(() =>
    sortBy(
      shift.shiftAssignments,
      (shiftAssignment) => shiftAssignment.position,
    ),
  );
  const [addingResponder, setAddingResponder] = useState(false);
  const [error, setError] = useState<unknown>();

  const sortableHandlers = useArrayBasicSortableHandlers(
    shiftAssignments,
    (activeIndex, overIndex) => {
      setShiftAssignments((prevShiftAssignments) => {
        return arrayMove(prevShiftAssignments, activeIndex, overIndex);
      });
    },
    "id",
  );

  return (
    <>
      <fieldset>
        <legend>{t("shifts.respondersTable.header")}</legend>
        <ul className="list-group mb-3">
          <DndContext {...sortableHandlers}>
            <SortableContext
              items={shiftAssignments}
              strategy={verticalListSortingStrategy}
            >
              {shiftAssignments.map((shiftAssignment) => (
                <ShiftAssignmentRow
                  shiftAssignment={shiftAssignment}
                  setShiftAssignment={(newShiftAssignment) => {
                    setShiftAssignments((prevShiftAssignments) =>
                      prevShiftAssignments.map((sa) => {
                        if (sa.id === newShiftAssignment.id) {
                          return newShiftAssignment;
                        } else {
                          return sa;
                        }
                      }),
                    );
                  }}
                  responders={responders}
                  key={shiftAssignment.id}
                />
              ))}
              <li className="list-group-item">
                {addingResponder ? (
                  <AddResponderRow
                    responders={responders}
                    cancel={() => setAddingResponder(false)}
                    save={(responderId) => {
                      const responder = responders.find(
                        (r) => r.id.toString() === responderId,
                      );
                      if (responder) {
                        setShiftAssignments((prevShiftAssignments) => [
                          ...prevShiftAssignments,
                          {
                            id: new Date().getTime(),
                            position:
                              Math.max(
                                0,
                                ...prevShiftAssignments.map(
                                  (shiftAssignment) => shiftAssignment.position,
                                ),
                              ) + 1,
                            responderId: responder.id,
                            responder: {
                              id: responder.id,
                              name: responder.name,
                            },
                          },
                        ]);
                      }
                      setAddingResponder(false);
                    }}
                  />
                ) : (
                  <button
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => setAddingResponder(true)}
                  >
                    <BootstrapIcon name="plus-circle" />{" "}
                    {t("shifts.respondersTable.addResponderButton")}
                  </button>
                )}
              </li>
            </SortableContext>
          </DndContext>
        </ul>
      </fieldset>

      <ControlledDatetimeInput
        label={t("shifts.timespan.startLabel")}
        name="timespan.start"
        value={toTemporalInstant
          .apply(shift.timespan.start)
          .toZonedDateTimeISO(timeZone)}
        onChange={(value) =>
          setShift((prevShift) => ({
            ...prevShift,
            timespan: {
              ...prevShift.timespan,
              start: new Date(value.epochMilliseconds),
            },
          }))
        }
      />

      <ControlledDatetimeInput
        label={t("shifts.timespan.finishLabel")}
        name="timespan.finish"
        value={toTemporalInstant
          .apply(shift.timespan.finish)
          .toZonedDateTimeISO(timeZone)}
        onChange={(value) =>
          setShift((prevShift) => ({
            ...prevShift,
            timespan: {
              ...prevShift.timespan,
              finish: new Date(value.epochMilliseconds),
            },
          }))
        }
      />

      <div className="text-end">
        <button className="btn btn-secondary" onClick={cancel}>
          {t("buttons.cancel")}
        </button>{" "}
        <button
          className="btn btn-primary"
          onClick={async () => {
            setError(undefined);
            try {
              await save({ ...shift, shiftAssignments });
            } catch (err) {
              setError(err);
            }
          }}
        >
          {t("buttons.save")}
        </button>
      </div>

      <ErrorDisplay error={error} />
    </>
  );
}

export const SerializedShift = z.object({
  timespan: z.object({
    start: z.string(),
    finish: z.string(),
  }),
  shiftAssignments: z.array(
    z.object({
      responderId: z.number(),
    }),
  ),
});

export function serializeShift(
  shift: Omit<ShiftForSchedule, "id">,
): z.infer<typeof SerializedShift> {
  return {
    timespan: {
      start: shift.timespan.start.toISOString(),
      finish: shift.timespan.finish.toISOString(),
    },
    shiftAssignments: shift.shiftAssignments.map((sa) => ({
      responderId: sa.responder.id,
    })),
  };
}

/**
 * `useFetcher` with a `submit` that settles when the route's action has finished: it resolves if the action returned
 * nothing, and rejects with whatever it returned (a returned Error, say) otherwise.
 *
 * `fetcher.submit()`'s own promise can't be used for this: the fetcher's data isn't available to the code that awaits
 * it (a click handler only sees the render it was created in), so the result has to be read once the fetcher goes idle.
 */
function useSettlingFetcher() {
  const fetcher = useFetcher();
  const pending = useRef<{
    resolve: () => void;
    reject: (reason: unknown) => void;
  }>(undefined);
  const previousState = useRef(fetcher.state);

  useEffect(() => {
    const wasBusy = previousState.current !== "idle";
    previousState.current = fetcher.state;

    if (wasBusy && fetcher.state === "idle" && pending.current) {
      const { resolve, reject } = pending.current;
      pending.current = undefined;
      if (fetcher.data) {
        reject(fetcher.data);
      } else {
        resolve();
      }
    }
  }, [fetcher.state, fetcher.data]);

  const submit = (...args: Parameters<typeof fetcher.submit>) => {
    fetcher.reset();
    return new Promise<void>((resolve, reject) => {
      pending.current = { resolve, reject };
      void fetcher.submit(...args);
    });
  };

  return { submit };
}

export function ShiftScheduleRow({
  hourStart,
  shiftsById,
  shiftIdByHourStart,
  index,
  timeZone,
  responders,
}: Pick<
  ReturnType<typeof calculateHourByHourShiftSchedule>,
  "shiftIdByHourStart" | "shiftsById"
> & {
  hourStart: Date;
  index: number;
  timeZone: string;
  responders: InferSelectModel<typeof respondersTable>[];
}) {
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
  const [editing, setEditing] = useState(false);
  const hourStartInZone = toTemporalInstant
    .apply(hourStart)
    .toZonedDateTimeISO(timeZone);
  const { t } = useTranslation();
  const fetcher = useSettlingFetcher();
  const confirm = useConfirm();

  return (
    <tr>
      <td className={shift && !isShiftFinishRow ? "border-bottom-0" : ""}>
        <time dateTime={hourStartInZone.toString()}>
          {hourStartInZone.toLocaleString(
            undefined,
            index === 0 || hourStartInZone.hour === 0
              ? dateTimeFormats.ampmDateTime
              : dateTimeFormats.ampmTime,
          )}
        </time>
      </td>
      {shift ? (
        isShiftStartRow &&
        (editing ? (
          <td colSpan={2} rowSpan={shiftHours}>
            <ShiftForm
              initialShift={shift}
              cancel={() => setEditing(false)}
              save={async (newShift) => {
                await fetcher.submit(serializeShift(newShift), {
                  action: `./${shift.id}`,
                  method: "patch",
                  encType: "application/json",
                });
                setEditing(false);
              }}
              responders={responders}
              timeZone={timeZone}
            />
          </td>
        ) : (
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
              <div className="d-flex flex-column gap-2 ">
                <div className="text-end">
                  <button
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => setEditing(true)}
                  >
                    <BootstrapIcon name="pencil-fill" />{" "}
                    {t("shifts.buttons.edit")}
                  </button>
                </div>
                <div className="text-end">
                  <button
                    className="btn btn-outline-danger btn-sm"
                    onClick={() =>
                      confirm({
                        prompt: "Are you sure you want to delete this shift?",
                        action: () =>
                          fetcher.submit(null, {
                            action: `./${shift.id}`,
                            method: "delete",
                          }),
                        renderError: (error) => <ErrorDisplay error={error} />,
                      })
                    }
                  >
                    <BootstrapIcon name="trash-fill" />{" "}
                    {t("shifts.buttons.delete")}
                  </button>
                </div>
              </div>
            </td>
          </>
        ))
      ) : editing ? (
        <td colSpan={2}>
          <ShiftForm
            initialShift={{
              shiftAssignments: [],
              timespan: {
                start: new Date(hourStartInZone.epochMilliseconds),
                finish: new Date(
                  hourStartInZone.add({ hours: 1 }).epochMilliseconds,
                ),
                includeStart: true,
                includeFinish: false,
              },
            }}
            cancel={() => setEditing(false)}
            save={async (newShift) => {
              await fetcher.submit(serializeShift(newShift), {
                method: "post",
                encType: "application/json",
              });
              setEditing(false);
            }}
            responders={responders}
            timeZone={timeZone}
          />
        </td>
      ) : (
        <>
          <td />
          <td className="text-end">
            <button
              className="btn btn-outline-success btn-sm"
              onClick={() => setEditing(true)}
            >
              <BootstrapIcon name="plus-circle-fill" />{" "}
              {t("shifts.buttons.new")}
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
  responders,
}: Parameters<typeof calculateHourByHourShiftSchedule>[0] & {
  responders: InferSelectModel<typeof respondersTable>[];
}) {
  const { t } = useTranslation();
  const { shiftIdByHourStart, shiftsById, hourStarts } = useMemo(
    () => calculateHourByHourShiftSchedule({ shifts, schedule }),
    [shifts, schedule],
  );

  return (
    <table className="table">
      <thead>
        <tr>
          <th>{t("schedules.shifts.timespan")}</th>
          <th>{t("schedules.shifts.responders")}</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {hourStarts.map((hourStart, index) => (
          <ShiftScheduleRow
            key={hourStart.toISOString()}
            hourStart={hourStart}
            index={index}
            shiftIdByHourStart={shiftIdByHourStart}
            shiftsById={shiftsById}
            timeZone={schedule.timeZone}
            responders={responders}
          />
        ))}
      </tbody>
    </table>
  );
}
