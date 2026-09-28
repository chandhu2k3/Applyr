// Popup: ask content.js for page context, POST to local dashboard /api/analyze, render verdict.
const API = "http://localhost:3000/api/analyze";
document.getElementById("go").onclick = async () => {
  const st = document.getElementById("st");
  st.textContent = "Analyzing…";
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const page = await chrome.tabs.sendMessage(tab.id, { type: "APPLY_AGENT_ANALYZE" });
  const res = await fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(page) });
  const out = await res.json();
  st.textContent = out.ok
    ? `✓ ${out.job.title} @ ${out.job.company || "?"}\nResume: ${out.resume.resumeId} (${out.resume.confidence})\nDecision: ${out.decision}`
    : `■ ${out.reason || out.stage}\n${(out.match?.reasons ?? []).join("\n")}`;
};
