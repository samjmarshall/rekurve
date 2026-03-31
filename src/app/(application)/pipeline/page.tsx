import { Users } from "lucide-react";

export default function PipelinePage() {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="text-center">
        <Users size={48} className="mx-auto mb-4 text-muted-foreground/50" />
        <h1 className="font-semibold text-lg">No leads yet</h1>
        <p className="mt-1 max-w-sm text-muted-foreground text-sm">
          Your leads will appear here, grouped by stage
        </p>
      </div>
    </div>
  );
}
