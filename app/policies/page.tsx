export default function PoliciesPage() {
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">Policies — deterministic permission</h1>
      <pre className="rounded bg-neutral-100 p-4 text-xs">{JSON.stringify({ enabledRoleFamilies: ["PM","SDE"], allowedEmploymentTypes: ["Internship","Full-time"], maxExperienceYears: 2, allowedLocations: [], minConfidence: 0.7, maxPerDay: 25, maxPerHour: 5, maxPerCompanyPerDay: 2, killSwitch: false }, null, 2)}</pre>
    </div>
  );
}
