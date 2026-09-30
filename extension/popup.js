// ApplyX popup — Jobright-style side-panel UX over our deterministic pipeline.
// Flow: page context → dashboard context → /api/analyze → verdict card.
// The big button never submits by itself: submission happens in the local
// runner (CLI), whose exact command we show + copy.
const API = "http://localhost:3000/api";
const $ = (id) => document.getElementById(id);

function openDash(path = "") {
  chrome.tabs.create({ url: `http://localhost:3000${path}` });
}
$("gear").onclick = () => openDash("/settings");
$("openDash").onclick = (e) => { e.preventDefault(); openDash(); };
$("openProfile").onclick = (e) => { e.preventDefault(); openDash("/profile"); };
$("openResumes").onclick = (e) => { e.preventDefault(); openDash("/resumes"); };

function setStep(id, state, label) {
  const el = $(id);
  el.className = state;
  el.textContent = `${state === "done" ? "✓" : state === "act" ? "⟳" : "○"} ${label}`;
}

async function dashboard(path) {
  const r = await fetch(`${API}${path}`);
  if (!r.ok) throw new Error("dashboard unreachable");
  return r.json();
}

let ready = null; // verdict waiting for local run
let lastTabUrl = "";

$("cta").onclick = async () => {
  if (ready) {
    $("cmdCard").style.display = "block";
    $("cmd").textContent = `npm run apply:local -- "${lastTabUrl}"`;
    return;
  };
  const cta = $("cta"), verdict = $("verdict");
  cta.disabled = true;
  cta.classList.remove("blocked");
  ready = null;
  $("cmdCard").style.display = "none";
  cta.textContent = "Analyzing…";
  $("steps").style.display = "grid";
  ["s-job", "s-resume", "s-fields", "s-valid", "s-sub"].forEach((id) => setStep(id, "", $(id).textContent.slice(2)));
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const page = await chrome.tabs.sendMessage(tab.id, { type: "APPLY_AGENT_ANALYZE" });
    setStep("s-job", "act", "Job identified");
    const [prof, res, pol] = await Promise.all([
      dashboard("/profile").catch(() => ({ profile: {} })),
      dashboard("/resumes").catch(() => ({ resumes: [] })),
      dashboard("/policy").catch(() => ({ policy: {} })),
    ]);
    const profile = prof.profile ?? {};
    const resumes = (res.resumes ?? []).map((r) => ({ id: r.id, roleFamily: r.roleFamily, active: r.active, isDefault: r.isDefault, keywords: r.keywords ?? [] }));
    const skills = (profile.skills ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const got = Object.values(profile).filter(Boolean).length;
    $("profLine").textContent = `${got} fields · ${skills.length} skills — trusted data only`;
    $("resLine").textContent = resumes.length ? resumes.map((r) => `${r.roleFamily}${r.isDefault ? " ★" : ""}`).join(" · ") : "No resumes yet — upload one first";

    const res2 = await fetch(`${API}/analyze`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...page, skills, experienceYears: Number(profile.experienceYears ?? 0), resumes, policy: pol.policy ?? {} }),
    });
    const out = await res2.json();
    if (!out.ok) throw Object.assign(new Error(out.reason || out.stage || "blocked"), { out });

    // APPLY verdict
    $("jobEmpty").style.display = "none";
    $("jobCard").style.display = "block";
    $("jTitle").textContent = out.job.title || page.title;
    $("jMeta").textContent = `${out.job.company || "Unknown company"} · ${out.job.location || "anywhere"}`;
    $("jPlat").textContent = out.page.platform;
    $("jScore").textContent = `${Math.round(Math.min(out.match.confidence, out.job.confidence) * 100)}%`;
    $("jResume").textContent = out.resume.resumeId;
    ["s-job", "s-resume", "s-fields", "s-valid"].forEach((id) => setStep(id, "done", $(id).textContent.slice(2)));
    setStep("s-sub", "", "Submission");
    cta.disabled = false;
    cta.textContent = "✓ Ready — run locally to apply";
    ready = out;
    lastTabUrl = tab.url;
    $("cmdCard").style.display = "block";
    $("cmd").textContent = `npm run apply:local -- "${tab.url}"`;
    verdict.innerHTML = `<span class="ok">✓ ${out.job.title}\nResume: ${out.resume.resumeId} (${out.resume.confidence})\nValidation preview: ${out.page.unmappedRequired.length ? "blocked: " + out.page.unmappedRequired.join(", ") : "all required fields mapped"}</span>`;
    $("copy").onclick = () => navigator.clipboard.writeText($("cmd").textContent);
    $("cost").textContent = "0 AI calls · deterministic";
  } catch (e) {
    ready = null;
    const out = e.out;
    cta.disabled = false;
    cta.textContent = "Analyze this page";
    cta.classList.add("blocked");
    if (out?.job) {
      $("jobEmpty").style.display = "none";
      $("jobCard").style.display = "block";
      $("jTitle").textContent = out.job.title || "Unknown role";
      $("jMeta").textContent = out.job.company || "";
      $("jPlat").textContent = out.page?.platform ?? "generic";
      $("jScore").textContent = out.match ? `${Math.round(out.match.confidence * 100)}%` : "—";
      $("jResume").textContent = "—";
    }
    const why = out?.page?.unmappedRequired?.length ? `Unknown required: ${out.page.unmappedRequired.join(", ")}` : (out?.match?.reasons ?? []).join(" · ") || e.message;
    verdict.innerHTML = `<span class="err">■ Paused — ${e.message}\n${why}\nNothing was filled. Nothing was submitted.</span>`;
  }
};
