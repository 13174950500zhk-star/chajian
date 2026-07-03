(() => {
  "use strict";

  function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    let binary = "";
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, chunk);
    }
    return btoa(binary);
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || !message.type) return false;

    if (message.type === "CCA_FETCH_IMAGE") {
      const url = String(message.url || "").trim();
      if (!/^https?:\/\//i.test(url)) {
        sendResponse({ ok: false, error: "图片地址无效" });
        return false;
      }

      (async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 20000);
        try {
          const response = await fetch(url, {
            method: "GET",
            credentials: "omit",
            cache: "force-cache",
            signal: controller.signal
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const blob = await response.blob();
          if (!blob.size) throw new Error("图片为空");
          if (blob.size > 10 * 1024 * 1024) throw new Error("图片超过 10MB，已跳过");
          const buffer = await blob.arrayBuffer();
          sendResponse({ ok: true, base64: arrayBufferToBase64(buffer), mimeType: blob.type || "", size: blob.size });
        } catch (error) {
          sendResponse({ ok: false, error: error.message || String(error) });
        } finally {
          clearTimeout(timer);
        }
      })();
      return true;
    }

    if (message.type === "CCA_CAPTURE_VISIBLE_TAB") {
      (async () => {
        try {
          const tab = sender && sender.tab ? sender.tab : null;
          const windowId = tab ? tab.windowId : undefined;
          const dataUrl = await chrome.tabs.captureVisibleTab(windowId, { format: "png" });
          sendResponse({ ok: true, dataUrl });
        } catch (error) {
          sendResponse({ ok: false, error: error.message || String(error) });
        }
      })();
      return true;
    }

    return false;
  });
})();
