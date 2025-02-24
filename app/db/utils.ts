export function coerceId(id: number | string): number {
  return typeof id === "string" ? Number.parseInt(id, 10) : id;
}

export function assertFound<T>(record: T | undefined): T {
  if (!record) {
    throw new Response("Not found", { status: 404 });
  }

  return record;
}
