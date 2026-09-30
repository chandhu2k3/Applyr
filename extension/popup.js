// ApplyX popup — Jobright-style side-panel UX over our deterministic pipeline.
// Flow: Analyze (page + dashboard context → /api/analyze) → Autofill & Apply
// (POST /api/apply runs the local pipeline async; we poll the run to verdict).
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
function resetSteps() {
  ["s-job", "s-resume", "s-fields", "s-valid", "s-sub"].forEach((id) => setStep(id, "", $(id).textContent.slice(2)));
}

async function dashboard(path) {
  const r = await fetch(`${API}${path}`);
  if (!r.ok) throw new Error("Start the dashboard first: npm run dev");
  return r.json();
}

let mode = "analyze"; // analyze → apply → polling
let lastTabUrl = "";

function showJobCard(out, page) {
  $("jobEmpty").style.display = "none";
  $("jobCard").style.display = "block";
  $("jTitle").textContent = out.job.title || page.title || "Unknown role";
  $("jMeta").textContent = `${out.job.company || "Unknown company"} · ${out.job.location || "anywhere"}`;
  $("jPlat").textContent = out.page.platform;
  $("jScore").textContent = out.match ? `${Math.round(Math.min(out.match.confidence, out.job.confidence) * 100)}%` : "—";
  $("jResume").textContent = out.resume ? out.resume.resumeId : "—";
}

async function pollRun(runId, verdict, tabUrl) {
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    try {
      const d = await dashboard("/runs");
      const run = (d.runs ?? []).find((x) => x.id === runId);
      if (run && ["done", "blocked", "failed"].includes(run.status)) {
        const last = run.events?.[run.events.length - 1];
        setStep("s-sub", run.status === "done" ? "done" : "", "Submission");
        if (run.status === "done") {
          verdict.innerHTML = `<span class="ok">✓ Application submitted — verified.\n${last?.msg ?? ""}\nSee Applications in the dashboard.</span>`;
        } else {
          verdict.innerHTML = `<span class="err">■ Paused (${run.stage}): ${(last?.msg ?? "").slice(0, 220)}\nRecorded — help below, then retry.</span>`;
          showNeedsYou(tabUrl);
        }
        $("cta").disabled = false;
        $("cta").textContent = "Analyze this page";
        mode = "analyze";
        return;
      }
    } catch { /* keep polling */ }
  }
  verdict.innerHTML = `<span class="err">Still running — follow it in Agent Runs.</span>`;
  $("cta").disabled = false;
  $("cta").textContent = "Analyze this page";
  mode = "analyze";
}

// Needs-you handoff: fetch the recorded BLOCKED application for this URL,
// render its missing questions + profile gaps as inputs, save, retry.
async function showNeedsYou(tabUrl) {
  const card = $("needCard"), body = $("needBody");
  card.style.display = "none";
  body.innerHTML = "";
  $("needMsg").textContent = "";
  try {
    const d = await dashboard("/applications");
    const app = (d.applications ?? []).find((a) => a.url === tabUrl && a.status === "BLOCKED");
    if (!app) return;
    const qs = app.missingQuestions ?? [];
    const pf = app.missingProfile ?? [];
    if (!qs.length && !pf.length) return;
    for (const f of pf) {
      body.insertAdjacentHTML("beforeend", `<label><span class="tag">PROFILE · ${f}</span><input data-p="${f}" placeholder="Your ${f} (saved to profile)" /></label>`);
    }
    for (const q of qs) {
      body.insertAdjacentHTML("beforeend", `<label><span class="tag">QUESTION</span><span>${q}</span><input data-q="${q.replace(/"/g, "&quot;")}" placeholder="Your answer (saved to bank)" /></label>`);
    }
    card.style.display = "block";
    $("needSave").onclick = async () => {
      $("needMsg").textContent = "Saving…";
      const prof = {};
      body.querySelectorAll("[data-p]").forEach((el) => { if (el.value.trim()) prof[el.dataset.p] = el.value.trim().slice(0, 2000); });
      if (Object.keys(prof).length) {
        await fetch(`${API}/profile`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ profile: prof }) });
      }
      for (const el of body.querySelectorAll("[data-q]")) {
        if (!el.value.trim()) continue;
        await fetch(`${API}/answers`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pattern: el.dataset.q.slice(0, 200), answer: el.value.trim().slice(0, 2000), category: "FACTUAL", approved: true }) });
      }
      $("needMsg").textContent = "Saved — hit Retry application.";
    };
    $("needRetry").onclick = async () => {
      $("needMsg").textContent = "Retrying…";
      const r = await fetch(`${API}/apply`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: tabUrl }) });
      const out = await r.json();
      if (r.status === 202 && out.runId) {
        card.style.display = "none";
        $("verdict").innerHTML = `<span class="muted">Retry running…</span>`;
        pollRun(out.runId, $("verdict"), tabUrl);
      } else $("needMsg").textContent = `Failed: ${out.error ?? "error"}`;
    };
  } catch { /* dashboard unreachable — verdict text already explains */ }
}

$("cta").onclick = async () => {
  const cta = $("cta"), verdict = $("verdict");
  if (mode === "apply") {
    // User confirmed: run the local pipeline async, poll to verdict.
    cta.disabled = true;
    cta.textContent = "Applying… (local browser)";
    setStep("s-sub", "act", "Submission");
    verdict.innerHTML = `<span class="muted">Local browser is filling the form — you can keep browsing. Do not close the dashboard server.</span>`;
    try {
      const r = await fetch(`${API}/apply`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: lastTabUrl }) });
      const d = await r.json();
      if (r.status !== 202 || !d.runId) throw new Error(d.error || "apply failed to start");
      mode = "polling";
      pollRun(d.runId, verdict, lastTabUrl);
    } catch (e) {
      verdict.innerHTML = `<span class="err">■ Could not start: ${e.message}</span>`;
      cta.disabled = false;
      cta.textContent = "Autofill & Apply";
    }
    return;
  }
  if (mode === "polling") return;

  // ANALYZE
  cta.disabled = true;
  cta.classList.remove("blocked");
  cta.textContent = "Analyzing…";
  $("needCard").style.display = "none";
  $("steps").style.display = "grid";
  resetSteps();
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    lastTabUrl = tab.url;
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

    showJobCard(out, page);
    ["s-job", "s-resume", "s-fields", "s-valid"].forEach((id) => setStep(id, "done", $(id).textContent.slice(2)));
    setStep("s-sub", "", "Submission");
    cta.disabled = false;
    cta.textContent = "Autofill & Apply";
    mode = "apply";
    verdict.innerHTML = `<span class="ok">✓ ${out.job.title}\nResume: ${out.resume.resumeId} (${out.resume.confidence})\nValidation preview: ${out.page.unmappedRequired.length ? "blocked: " + out.page.unmappedRequired.join(", ") : "all required fields mapped"}\nClick Apply to run the local browser.</span>`;
    $("cost").textContent = "0 AI calls · deterministic";
  } catch (e) {
    const out = e.out;
    cta.disabled = false;
    cta.textContent = "Analyze this page";
    if (out?.decision === "SKIP") {
      if (out?.job) showJobCard(out, {});
      verdict.innerHTML = `<span class="muted">○ Skipped — weak fit, recorded quietly.\n${(out?.match?.reasons ?? []).join(" · ")}\nNothing was filled. Nothing was submitted.</span>`;
      return;
    }
    cta.classList.add("blocked");
    if (out?.job) showJobCard(out, {});
    const why = out?.page?.unmappedRequired?.length ? `Unknown required: ${out.page.unmappedRequired.join(", ")}` : (out?.match?.reasons ?? []).join(" · ") || e.message;
    verdict.innerHTML = `<span class="err">■ Paused — ${e.message}\n${why}\nNothing was filled. Nothing was submitted.</span>`;
  }
};
