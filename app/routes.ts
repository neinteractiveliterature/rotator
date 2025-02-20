import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("/incoming", "routes/incoming.ts"),
] satisfies RouteConfig;
