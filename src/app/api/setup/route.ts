import { createHash, timingSafeEqual, randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit, body, failure, HttpError, json, sameOrigin } from "@/lib/http";
import { date, dateText, userInput } from "@/lib/validation";
export async function GET() {
  try {
    return json({
      available: !(await db().workspace.findUnique({
        where: { id: "default" },
      })),
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const input = userInput
      .omit({ role: true })
      .extend({
        key: z.string().min(1).max(200),
        workspace: z.string().trim().min(1).max(80),
        openingDate: dateText,
      })
      .parse(await body(request));
    if (!process.env.ADMIN_SETUP_KEY)
      throw new HttpError(503, "Administrator setup has not been configured.");
    const digest = (v: string) => createHash("sha256").update(v).digest();
    if (
      !timingSafeEqual(digest(input.key), digest(process.env.ADMIN_SETUP_KEY))
    )
      throw new HttpError(403, "The setup key is incorrect.");
    if (await db().workspace.findUnique({ where: { id: "default" } }))
      throw new HttpError(409, "Setup is already complete. Please sign in.");
    const password = await hashPassword(input.password);
    const id = randomUUID();
    await db().$transaction(async (tx) => {
      await tx.workspace.create({
        data: {
          id: "default",
          name: input.workspace,
          openingDate: date(input.openingDate),
        },
      });
      await tx.user.create({
        data: {
          id,
          name: input.name,
          email: input.email,
          role: "admin",
          accounts: {
            create: {
              id: randomUUID(),
              providerId: "credential",
              accountId: id,
              password,
            },
          },
        },
      });
      await audit(
        tx,
        { id, name: input.name },
        "SETUP",
        "workspace",
        "default",
        undefined,
        { name: input.workspace },
      );
    });
    return json({ success: true }, 201);
  } catch (e) {
    return failure(e);
  }
}
