import { z } from "zod";
import { db } from "@/lib/db";
import {
  actor,
  audit,
  body,
  failure,
  HttpError,
  json,
  sameOrigin,
} from "@/lib/http";
export async function PATCH(request: Request) {
  try {
    sameOrigin(request);
    const user = await actor();
    if (user.role !== "admin")
      throw new HttpError(403, "Administrator access required.");
    const p = z
      .object({
        name: z.string().trim().min(1).max(80),
        openingCash: z.string().regex(/^-?\d{1,10}(\.\d{1,2})?$/),
        updatedAt: z.string(),
      })
      .parse(await body(request));
    return json(
      await db().$transaction(async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(74189234)::text AS locked`;
        const before = await tx.workspace.findUniqueOrThrow({
          where: { id: "default" },
        });
        if (before.updatedAt.toISOString() !== p.updatedAt)
          throw new HttpError(409, "Settings changed. Refresh first.");
        const after = await tx.workspace.update({
          where: { id: "default" },
          data: { name: p.name, openingCash: p.openingCash },
        });
        await audit(tx, user, "UPDATE", "workspace", "default", before, after);
        return after;
      }),
    );
  } catch (e) {
    return failure(e);
  }
}
