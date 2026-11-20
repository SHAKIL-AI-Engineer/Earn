import "server-only";
import { headers } from "next/headers";
import { auth } from "./auth";
import { db } from "./db";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function actor() {
  const session = await auth().api.getSession({ headers: await headers() });
  if (!session) throw new HttpError(401, "Please sign in to continue.");
  const user = await db().user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true, active: true },
  });
  if (!user?.active)
    throw new HttpError(
      403,
      "Your account is inactive. Contact an administrator.",
    );
  return user;
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const allowed = new Set(
    [new URL(request.url).origin, process.env.BETTER_AUTH_URL].filter(Boolean),
  );
  if (!origin || !allowed.has(origin))
    throw new HttpError(403, "Request origin is not allowed.");
}
export async function body(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 32000)
    throw new HttpError(413, "Request is too large.");
  const text = await request.text();
  if (text.length > 32000) throw new HttpError(413, "Request is too large.");
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "Invalid JSON request.");
  }
}
export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}
export function failure(error: unknown) {
  if (error instanceof HttpError)
    return json({ error: error.message }, error.status);
  if (error instanceof ZodError)
    return json(
      {
        error: error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .slice(0, 3)
          .join("; "),
      },
      400,
    );
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002")
      return json(
        {
          error:
            "This date already has a daily total, or this email is already registered.",
        },
        409,
      );
    if (error.code === "P2025")
      return json(
        { error: "Record not found or changed. Refresh and try again." },
        409,
      );
    if (error.code === "P2034")
      return json({ error: "Another update occurred. Please retry." }, 409);
  }
  console.error(
    "Earn request failed",
    error instanceof Error ? error.name : "UnknownError",
  );
  return json(
    { error: "We couldn’t complete this request. Please try again." },
    500,
  );
}
export async function audit(
  tx: Prisma.TransactionClient,
  user: { id: string; name: string },
  action: string,
  entity: string,
  entityId: string,
  before?: unknown,
  after?: unknown,
) {
  const clean = (v: unknown) =>
    v == null
      ? undefined
      : (JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue);
  await tx.auditLog.create({
    data: {
      actorId: user.id,
      actorName: user.name,
      action,
      entity,
      entityId,
      before: clean(before),
      after: clean(after),
    },
  });
}
