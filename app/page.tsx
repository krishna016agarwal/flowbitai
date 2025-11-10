import Sidebar from "./components/slidebar";
import Dashboard from "./components/dashboard";

export default function HomePage() {
  const sidebarWidth = "20%";
  const dashboardWidth = "80%";

  return (
    <main className="flex h-screen w-full">
      <Sidebar width={sidebarWidth} />
      <Dashboard width={dashboardWidth} />
    </main>
  );
}
