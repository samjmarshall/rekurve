import { MapPin } from "lucide-react";

export default function LotsPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="text-center">
        <MapPin size={48} className="mx-auto mb-4 text-muted-foreground/50" />
        <h1 className="font-semibold text-lg">No lots tracked</h1>
        <p className="mt-1 max-w-sm text-muted-foreground text-sm">
          Add available lots to find matching leads
        </p>
      </div>
    </div>
  );
}
