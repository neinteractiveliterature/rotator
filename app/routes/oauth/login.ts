import type { Route } from "./+types/login";

export async function loader({ request, context }: Route.ActionArgs) {
  await context.authenticator.authenticate("oauth2", request);
}
