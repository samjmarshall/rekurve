import { Inbox } from "lucide-react";
import { QuickCaptureButton } from "../_components/quick-capture/button";

export default function DashboardPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="text-center">
        <Inbox size={48} className="mx-auto mb-4 text-muted-foreground/50" />
        <h1 className="font-semibold text-lg">No pending actions</h1>
        <p className="mt-1 max-w-sm text-muted-foreground text-sm">
          AI-drafted messages will appear here for your review
        </p>
      </div>
      <QuickCaptureButton />
    </div>
  );
}
