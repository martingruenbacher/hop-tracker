import Navigation from "@/components/Navigation";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-950 to-amber-900">
      <Navigation />
      <main className="md:ml-56 pt-0 pb-20 md:pb-6 px-4 md:px-6 lg:px-8 max-w-5xl">
        <div className="pt-6">{children}</div>
      </main>
    </div>
  );
}
