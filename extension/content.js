// V1 content script: extract job + form context locally, send minimal payload to dashboard.
(() => {
  function extractFields() {
    const els = Array.from(document.querySelectorAll("input,textarea,select"));
    return els.slice(0, 200).map((el) => ({
      tag: el.tagName.toLowerCase(),
      type: el.getAttribute("type") ?? "",
      label: (document.querySelector(`label[for="${el.id}"]`)?.textContent ?? el.getAttribute("aria-label") ?? el.getAttribute("name") ?? "").trim().slice(0, 200),
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
