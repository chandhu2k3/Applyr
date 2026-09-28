import { Card } from "@/components/ui/card";
import { KillSwitch } from "@/components/dashboard/kill-switch";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Dashboard / Control Center</h1>
        <KillSwitch />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {["Today", "This week", "Submitted", "Blocked", "Failed", "Uncertain", "PM", "SDE"].map((k) => (
          <Card key={k} title={k} value="—" />
        ))}
      </div>
      <p className="text-sm text-neutral-500">
        Funnel: Discovered → Parsed → Evaluated → Qualified → Started → Filled → Validated →
        Submitted. V1 starts at current page (no discovery yet).
      </p>
    </div>
  );
}
