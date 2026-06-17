import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { AssistantWidget } from "@/components/layout/AssistantWidget";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const role = (session?.user as any)?.role;

  return (
    <div className="flex min-h-screen">
      <Sidebar role={role} />
      <main className="flex-1 overflow-auto bg-gray-50">
        {children}
        <AssistantWidget />
      </main>
    </div>
  );
}
