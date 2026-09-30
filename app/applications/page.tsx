import { Badge } from "@/components/ui/card";
import { getStore } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage() {
  const apps = await (await getStore()).listApplications();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Applications — tracker ({apps.length})</h1>
      <div className="panel">
        {apps.length === 0 ? <p className="p-4 text-sm text-neutral-500">No applications recorded yet.</p> :
        <table className="w-full text-left text-[13px]">
          <thead><tr className="border-b border-hairline font-mono text-[11px] uppercase text-neutral-400">
            <th className="px-4 py-2 font-medium">Company & Role</th><th className="px-4 py-2 font-medium">Resume</th><th className="px-4 py-2 font-medium">Status</th><th className="px-4 py-2 font-medium">Applied</th>
          </tr></thead>
          <tbody>{apps.map((a) => (
            <tr key={a.id} className="border-b border-hairline last:border-0 hover:bg-canvas/60">
              <td className="px-4 py-2.5"><a href={`/applications/${a.id}`} className="font-semibold hover:underline">{a.company}</a><br /><span className="text-neutral-500">{a.title}</span></td>
              <td className="px-4 py-2.5 text-neutral-600">{a.resumeName || "—"}</td>
              <td className="px-4 py-2.5"><Badge tone={a.status === "SUBMITTED" || a.status === "VERIFIED" ? "verified" : a.status === "BLOCKED" ? "blocked" : a.status === "FAILED" ? "failed" : "submitted"}>{a.status}</Badge></td>
              <td className="metric-num px-4 py-2.5 text-neutral-600">{new Date(a.createdAt).toLocaleString()}</td>
            </tr>
          ))}</tbody>
        </table>}
      </div>
    </div>
  );
}
