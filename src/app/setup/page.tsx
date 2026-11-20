import { db } from "@/lib/db";
import { AuthForm } from "@/components/auth-form";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function Setup() {
  if (await db().workspace.findUnique({ where: { id: "default" } }))
    redirect("/login");
  return <AuthForm setup />;
}
