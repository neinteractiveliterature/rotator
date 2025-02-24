import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  layout("routes/layouts/application.tsx", [
    index("routes/home.tsx"),
    route("phone_numbers/:phoneNumberId", "routes/phone-number.tsx"),
  ]),
  route("/incoming", "routes/incoming.ts"),
] satisfies RouteConfig;
