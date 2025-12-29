import { Loader2 } from "lucide-react";

export function LoadingState() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-mono">Loading...</p>
      </div>
    </div>
  );
}