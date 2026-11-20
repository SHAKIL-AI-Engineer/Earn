import "server-only";
import { APIError } from "better-auth/api";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "./db";
let instance: ReturnType<typeof createAuth> | undefined;
function createAuth() {
  return betterAuth({
    database: prismaAdapter(db(), {
      provider: "postgresql",
      transaction: true,
    }),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 12,
    },
    user: {
      additionalFields: {
        role: { type: "string", defaultValue: "viewer", input: false },
        active: { type: "boolean", defaultValue: true, input: false },
      },
    },
    databaseHooks: {
      session: {
        create: {
          before: async (session) => {
            const user = await db().user.findUnique({
              where: { id: session.userId },
              select: { active: true },
            });
            if (!user?.active)
              throw new APIError("FORBIDDEN", {
                message:
                  "Your account is inactive. Contact your administrator.",
              });
            return { data: session };
          },
        },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: false },
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 30,
      customRules: { "/sign-in/email": { window: 60, max: 5 } },
    },
    advanced: { database: { generateId: () => crypto.randomUUID() } },
  });
}
export function auth() {
  return (instance ??= createAuth());
}
