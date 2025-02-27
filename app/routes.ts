import {
  type RouteConfig,
  index,
  layout,
  prefix,
  route,
} from "@react-router/dev/routes";

export default [
  layout("routes/layouts/application.tsx", [
    index("routes/home.tsx"),
    ...prefix("phone_numbers", [
      route(":phoneNumberId", "routes/phone-numbers/show.tsx"),
      route(":phoneNumberId/edit", "routes/phone-numbers/edit.tsx"),
    ]),
    ...prefix("schedules", [route(":scheduleId", "routes/schedules/show.tsx")]),
  ]),
  route("/incoming", "routes/incoming.ts"),
] satisfies RouteConfig;
