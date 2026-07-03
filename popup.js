(() => {
  "use strict";
  const button = document.getElementById("open-panel");
  const status = document.getElementById("status");

  button.addEventListener("click", async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) throw new Error("没有找到当前标签页");
      await chrome.tabs.sendMessage(tab.id, { type: "CCA_OPEN_PANEL" });
      status.textContent = "已发送打开面板指令。";
      window.close();
    } catch (error) {
      status.textContent = "当前页面可能还没注入插件，请刷新商品页后再试。";
    }
  });
})();
