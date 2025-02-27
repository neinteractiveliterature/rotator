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
  ...prefix("webhooks", [
    route("incoming", "routes/webhooks/incoming.ts"),
    route("called/:responderId", "routes/webhooks/called.ts"),
    route("voicemail", "routes/webhooks/voicemail.ts"),
  ]),
] satisfies RouteConfig;
