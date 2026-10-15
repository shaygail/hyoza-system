import { BoardView } from "@/components/board/board-view";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function BoardPage() {
  return (
    <div className="space-y-4">
      <div>
        <nav className="text-sm text-slate-500">
          <Link href="/app/dashboard" className="hover:underline">
            Projects
          </Link>
          <span className="mx-2">/</span>
          <span>HYOZA Service Desk</span>
        </nav>
        <div className="mt-2 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-slate-900">Board</h1>
          <Link href="/app/tickets/new">
            <Button>Create ticket</Button>
          </Link>
        </div>
        <p className="mt-1 text-sm text-slate-500">Drag cards between columns to change status.</p>
      </div>
      <BoardView />
    </div>
  );
}
