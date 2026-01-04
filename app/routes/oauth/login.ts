import { authenticatorContext } from "~/contexts";
import type { Route } from "./+types/login";

export async function loader({ request, context }: Route.ActionArgs) {
  const authenticator = context.get(authenticatorContext);
  await authenticator.authenticate("oauth2", request);
}
