import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
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
import { userInput } from "@/lib/validation";
const select = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  createdAt: true,
  updatedAt: true,
};
export async function GET() {
  try {
    const user = await actor();
    if (user.role !== "admin")
      throw new HttpError(403, "Administrator access required.");
    return json(
      await db().user.findMany({
        select,
        orderBy: { createdAt: "asc" },
        take: 200,
      }),
    );
  } catch (e) {
    return failure(e);
  }
}
async function mutate(request: Request) {
  try {
    sameOrigin(request);
    const user = await actor();
    if (user.role !== "admin")
      throw new HttpError(403, "Administrator access required.");
    const raw = await body(request);
    if (request.method === "POST") {
      const p = userInput.parse(raw);
      const password = await hashPassword(p.password);
      const id = randomUUID();
      const created = await db().$transaction(async (tx) => {
        const row = await tx.user.create({
          data: {
            id,
            name: p.name,
            email: p.email,
            role: p.role,
            accounts: {
              create: {
                id: randomUUID(),
                accountId: id,
                providerId: "credential",
                password,
              },
            },
          },
          select,
        });
        await audit(tx, user, "CREATE", "user", id, undefined, row);
        return row;
      });
      return json(created, 201);
    }
    const p = z
      .object({
        id: z.string(),
        name: z.string().trim().min(1).max(160),
        role: z.enum(["admin", "manager", "accountant", "viewer"]),
        active: z.boolean(),
        updatedAt: z.string(),
        password: z.string().min(12).max(128).optional(),
      })
      .parse(raw);
    const password = p.password ? await hashPassword(p.password) : undefined;
    return json(
      await db().$transaction(async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(74189233)::text AS locked`;
        const before = await tx.user.findUnique({
          where: { id: p.id },
          select,
        });
        if (!before) throw new HttpError(404, "User not found.");
        if (before.updatedAt.toISOString() !== p.updatedAt)
          throw new HttpError(409, "User was changed. Refresh first.");
        if (
          before.role === "admin" &&
          before.active &&
          (p.role !== "admin" || !p.active) &&
          (await tx.user.count({ where: { role: "admin", active: true } })) <= 1
        )
          throw new HttpError(
            409,
            "At least one active administrator must remain.",
          );
        const after = await tx.user.update({
          where: { id: p.id },
          data: { name: p.name, role: p.role, active: p.active },
          select,
        });
        if (password)
          await tx.account.updateMany({
            where: { userId: p.id, providerId: "credential" },
            data: { password },
          });
        if (!p.active || password || p.role !== before.role)
          await tx.session.deleteMany({ where: { userId: p.id } });
        await audit(tx, user, "UPDATE", "user", p.id, before, {
          ...after,
          passwordReset: Boolean(password),
        });
        return after;
      }),
    );
  } catch (e) {
    return failure(e);
  }
}
export const POST = mutate;
export const PATCH = mutate;
