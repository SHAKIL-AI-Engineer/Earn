import { actor, body, failure, HttpError, json, sameOrigin } from "@/lib/http";
import { kinds, type Kind } from "@/lib/permissions";
import { mutateRecord } from "@/lib/records";
async function handle(
  request: Request,
  context: { params: Promise<{ kind: string }> },
) {
  try {
    sameOrigin(request);
    const user = await actor();
    const { kind } = await context.params;
    if (!kinds.includes(kind as Kind))
      throw new HttpError(404, "Unknown record type.");
    return json(
      await mutateRecord(
        kind as Kind,
        request.method,
        await body(request),
        user,
      ),
      request.method === "POST" ? 201 : 200,
    );
  } catch (e) {
    return failure(e);
  }
}
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
