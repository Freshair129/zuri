import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function DashboardShell({ children, title, user }) {
  return (
    <div className="flex h-screen bg-[#1A1710] overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col my-0 md:my-2 ml-0 mr-0 md:mr-2 rounded-none md:rounded-[24px] overflow-hidden border border-white/5 relative">
        <Topbar title={title} user={user} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#F7F8FA] custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
}
