import { BoardView } from "@/components/board/board-view";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function BoardPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Board</h1>
          <p className="text-sm text-slate-500">Drag tickets between columns to update status</p>
        </div>
        <Link href="/app/tickets/new">
          <Button><Plus className="mr-2 h-4 w-4" />Create</Button>
        </Link>
      </div>
      <BoardView />
    </div>
  );
}
