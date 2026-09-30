// V1 content script: extract job + form context locally, send minimal payload to dashboard.
(() => {
  function clean(s) {
    return (s ?? "").replace(/[\u200B-\u200F\uFEFF]/g, "").replace(/[*\u26A1\u2022\u00B7\u203C!]+$/g, "").replace(/\s*[\(\[](required|optional|\*)\s*[\)\]]\s*$/i, "").replace(/\s+/g, " ").trim();
  }
  function extractFields() {
    const els = Array.from(document.querySelectorAll("input,textarea,select"));
    return els.slice(0, 200).map((el) => ({
      tag: el.tagName.toLowerCase(),
      type: el.getAttribute("type") ?? "",
      label: clean(document.querySelector(`label[for="${el.id}"]`)?.textContent ?? el.getAttribute("aria-label") ?? el.getAttribute("name") ?? "").slice(0, 200),
      name: el.getAttribute("name") ?? "",
      required: el.required || el.getAttribute("aria-required") === "true",
    }));
  }
  chrome.runtime.onMessage.addListener((msg, _s, send) => {
    if (msg?.type === "APPLY_AGENT_ANALYZE") {
      send({
        url: location.href,
        title: document.title,
        bodyText: document.body.innerText.slice(0, 20000),
        fields: extractFields(),
      });
    }
  });
})();
