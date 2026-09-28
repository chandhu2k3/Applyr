export default function SettingsPage() {
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">Settings — kill switch · retention · AI</h1>
      <ul className="list-disc pl-6 text-sm">
        <li>Kill switch stops new submissions, preserves records</li>
        <li>Evidence retention days (default 30) keeps R2/local usage tiny</li>
        <li>AI provider: stub (₹0) → local → cloud fallback, configurable</li>
      </ul>
    </div>
  );
}
