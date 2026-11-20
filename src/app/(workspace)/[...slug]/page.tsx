import { redirect, notFound } from "next/navigation";
import { actor, HttpError } from "@/lib/http";
import { Dashboard } from "@/components/dashboard";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const section = (await params).slug.join("/");
  if (
    ![
      "dashboard",
      "production",
      "salaries",
      "expenses",
      "cashflow",
      "employees",
      "reports/daily",
      "reports/monthly",
      "team",
      "settings",
      "system",
    ].includes(section)
  )
    notFound();
  let user;
  try {
    user = await actor();
  } catch (e) {
    if (e instanceof HttpError && [401, 403].includes(e.status))
      redirect("/login");
    throw e;
  }
  if (["team", "settings"].includes(section) && user.role !== "admin")
    redirect("/dashboard");
  return <Dashboard key={section} section={section} user={user} />;
}
