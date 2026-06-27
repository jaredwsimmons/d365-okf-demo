import { DashboardHeader } from "@/components/layout/header";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { TabPanel } from "@/components/layout/tab-panel";
import { CommandPalette } from "@/components/command-palette";

export default function Home() {
  return (
    <div className="flex flex-col h-full min-h-0">
      <DashboardHeader />
      <div className="flex flex-1 min-h-0">
        <SidebarNav />
        <div className="flex-1 min-w-0 flex flex-col">
          <TabPanel />
        </div>
      </div>
      <CommandPalette />
    </div>
  );
}
