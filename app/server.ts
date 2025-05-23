// generated by react-router-hono-server/dev
import { createHonoServer } from "react-router-hono-server/node";
import { buildAppLoadContext } from "./server/appLoadContext.server";

export default await createHonoServer({
  getLoadContext() {
    return buildAppLoadContext();
  },
});
