import { SessionProvider } from "@/components/shared/session-provider";
import { Sidebar } from "@/components/shared/sidebar";

export default function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <div className="min-h-screen bg-bg">
        <Sidebar />
        <main className="md:ml-56 pb-20 md:pb-0">
          <div className="max-w-7xl mx-auto p-4 md:p-6">{children}</div>
        </main>
      </div>
    </SessionProvider>
  );
}
