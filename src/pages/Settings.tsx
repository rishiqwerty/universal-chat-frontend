import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

export default function Settings() {
  return (
    <div className="flex h-screen min-h-0 overflow-hidden bg-background">
      <Sidebar activeNav="settings" />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-8">
          <h1 className="text-2xl font-bold text-textPrimary">Settings</h1>
          <p className="mt-2 pl-1 text-sm text-textSecondary">
            Systems offline. Settings module is currently under construction.
          </p>
        </main>
      </div>
    </div>
  );
}
