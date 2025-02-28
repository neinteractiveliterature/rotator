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
    ...prefix("oauth", [
      route("login", "routes/oauth/login.ts"),
      route("logout", "routes/oauth/logout.ts"),
      route("redirect", "routes/oauth/redirect.ts"),
    ]),
    layout("routes/layouts/site-admin-required.tsx", [
      ...prefix("phone_numbers", [
        index("routes/phone-numbers/list.tsx"),
        route(":phoneNumberId", "routes/phone-numbers/show.tsx"),
        route(":phoneNumberId/edit", "routes/phone-numbers/edit.tsx"),
      ]),
      ...prefix("schedules", [
        index("routes/schedules/list.tsx"),
        route("new", "routes/schedules/new.tsx"),
        ...prefix(":scheduleId", [
          index("routes/schedules/show.tsx"),
          route("edit", "routes/schedules/edit.tsx"),
          ...prefix("shifts", [
            ...prefix(":shiftId", [route("edit", "routes/shifts/edit.tsx")]),
          ]),
        ]),
      ]),
    ]),
  ]),
  ...prefix("webhooks", [
    route("incoming", "routes/webhooks/incoming.ts"),
    route("text", "routes/webhooks/text.ts"),
    route("called/:responderId", "routes/webhooks/called.ts"),
    route("voicemail", "routes/webhooks/voicemail.ts"),
  ]),
] satisfies RouteConfig;
