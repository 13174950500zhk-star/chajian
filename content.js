(() => {
  "use strict";

  const EXT_VERSION = "1.0.3.7";
  const BUTTON_ID = "cca-v1034-float";
  const PANEL_ID = "cca-v1034-panel";
  const HIGHLIGHT_ID = "cca-v1034-highlight";
  const SELECTOR_ID = "cca-v1034-selector";
  const STYLE_ID = "cca-v1034-style";

  const imageTypes = [
    ["main", "主图"],
    ["sku", "SKU图"],
    ["detail", "详情图"],
    ["review", "评价图"],
    ["other", "其他图"]
  ];

  const state = {
    product: {
      title: "",
      platform: detectPlatform(),
      shopName: "",
      price: "",
      url: location.href,
      productId: detectProductId(),
      skuId: detectSkuId(),
      skuText: "",
      skus: [],
      skuMatrix: {
        dimensions: [
          { name: "款式", values: [] },
          { name: "规格", values: [] }
        ],
        items: []
      },
      source: "commodity-capture-extension",
      extensionVersion: EXT_VERSION,
      capturedAt: ""
    },
    candidates: [],
    images: [],
    failedImages: [],
    pickingHandler: null,
    screenshotOverlay: null,
    panelCollapsed: false,
    hiddenForCapture: false
  };

  const fieldMap = {
    title: { label: "标题", input: "cca-title", valueType: "text" },
    price: { label: "价格", input: "cca-price", valueType: "price" },
    shopName: { label: "店铺", input: "cca-shop", valueType: "text" }
  };

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${BUTTON_ID} {
        position: fixed; right: 18px; top: 42%; z-index: 2147483640;
        width: 54px; height: 54px; border-radius: 16px; border: 0;
        background: linear-gradient(135deg,#fb923c,#f97316); color:#fff;
        box-shadow: 0 12px 28px rgba(249,115,22,.34);
        font: 800 13px/1.15 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
        cursor:pointer; display:flex; align-items:center; justify-content:center; text-align:center;
      }
      #${PANEL_ID} {
        position: fixed; right: 18px; top: 18px; width: 390px; max-height: 84vh;
        z-index: 2147483641; background:#fff; color:#111827;
        border-radius:16px; border:1px solid rgba(15,23,42,.14); box-shadow:0 22px 52px rgba(15,23,42,.24);
        font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; display:none; overflow:hidden;
      }
      #${PANEL_ID}.open { display:flex; flex-direction:column; }
      #${PANEL_ID}.mini { width: 268px; max-height: 58px; }
      #${PANEL_ID}.mini .cca-body { display:none; }
      #${PANEL_ID}.hidden-capture { display:none !important; }
      .cca-head { padding:10px 12px; border-bottom:1px solid #e5e7eb; display:flex; gap:8px; align-items:center; justify-content:space-between; background:#fff7ed; cursor:move; user-select:none; }
      .cca-title-wrap { min-width:0; }
      .cca-head h2 { margin:0; font-size:15px; color:#111827; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .cca-head p { margin:2px 0 0; font-size:11px; color:#64748b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .cca-head-actions { display:flex; gap:4px; flex-shrink:0; }
      .cca-icon-btn { border:1px solid #fed7aa; background:#fff; color:#9a3412; border-radius:8px; padding:4px 7px; cursor:pointer; font-size:12px; font-weight:800; }
      .cca-body { padding:10px; overflow:auto; flex:1; background:#f8fafc; }
      .cca-status { margin-bottom:8px; padding:7px 9px; border-radius:10px; background:#eef2ff; color:#3730a3; font-size:12px; line-height:1.45; }
      .cca-status.warn { background:#fff7ed; color:#9a3412; }
      .cca-status.ok { background:#ecfdf5; color:#047857; }
      .cca-card { background:#fff; border:1px solid #e5e7eb; border-radius:13px; padding:10px; margin-bottom:10px; }
      .cca-card h3 { margin:0 0 8px; font-size:13px; color:#0f172a; display:flex; justify-content:space-between; align-items:center; }
      .cca-row { display:grid; grid-template-columns:1fr 1fr; gap:7px; }
      .cca-row3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:7px; }
      .cca-field { display:flex; flex-direction:column; gap:4px; margin-bottom:7px; }
      .cca-field span { font-size:11px; color:#64748b; }
      .cca-field input,.cca-field textarea,.cca-field select { width:100%; box-sizing:border-box; border:1px solid #d1d5db; border-radius:9px; padding:7px 8px; font-size:12px; color:#111827; background:#fff; }
      .cca-field textarea { resize:vertical; min-height:70px; }
      .cca-actions { display:flex; flex-wrap:wrap; gap:7px; }
      .cca-btn,.cca-actions button { border:1px solid #e5e7eb; background:#fff; color:#334155; border-radius:9px; padding:7px 9px; font-size:12px; font-weight:700; cursor:pointer; }
      .cca-btn:hover,.cca-actions button:hover { border-color:#f97316; color:#ea580c; }
      .cca-primary { background:#f97316 !important; border-color:#f97316 !important; color:#fff !important; }
      .cca-danger { color:#b91c1c !important; }
      .cca-muted { color:#64748b; font-size:11px; line-height:1.5; }
      .cca-mini { font-size:11px; color:#94a3b8; line-height:1.45; margin-top:6px; }
      .cca-candidate-toolbar { display:flex; flex-wrap:wrap; gap:7px; align-items:center; margin-bottom:8px; }
      .cca-img-tools { display:flex; flex-direction:column; gap:7px; margin-bottom:8px; }
      .cca-img-group { display:flex; flex-wrap:wrap; gap:6px; align-items:center; padding:7px; background:#f8fafc; border:1px solid #e5e7eb; border-radius:12px; }
      .cca-img-group-title { font-size:11px; color:#64748b; font-weight:800; margin-right:2px; }
      .cca-img-group button { border:1px solid #dbeafe; background:#fff; color:#1e3a8a; border-radius:999px; padding:6px 10px; font-size:12px; font-weight:800; cursor:pointer; box-shadow:0 1px 2px rgba(15,23,42,.04); }
      .cca-img-group button:hover { border-color:#fb923c; color:#ea580c; background:#fff7ed; }
      .cca-img-group button.cca-danger { border-color:#fecaca; background:#fff5f5; color:#b91c1c !important; }
      .cca-img-group button.cca-primary, .cca-img-group [data-add-candidate-type="main"] { background:#f97316 !important; border-color:#f97316 !important; color:#fff !important; }
      .cca-img-group [data-add-candidate-type="sku"] { border-color:#bfdbfe; background:#eff6ff; color:#1d4ed8; }
      .cca-img-group [data-add-candidate-type="detail"] { border-color:#c7d2fe; background:#eef2ff; color:#4338ca; }
      .cca-img-group [data-add-candidate-type="review"] { border-color:#fbcfe8; background:#fdf2f8; color:#be185d; }
      .cca-img-group [data-add-candidate-type="other"] { border-color:#e5e7eb; background:#f8fafc; color:#475569; }
      .cca-candidate-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; max-height:330px; overflow:auto; }
      .cca-candidate { border:1px solid #e5e7eb; border-radius:10px; background:#fff; overflow:hidden; position:relative; }
      .cca-candidate.selected { border-color:#f97316; box-shadow:0 0 0 2px rgba(249,115,22,.13); }
      .cca-candidate img { width:100%; height:92px; object-fit:cover; background:#f1f5f9; display:block; }
      .cca-candidate .meta { padding:5px 6px; font-size:10px; color:#64748b; line-height:1.35; }
      .cca-candidate input[type=checkbox] { position:absolute; left:6px; top:6px; width:16px; height:16px; accent-color:#f97316; }
      .cca-image-list { display:grid; grid-template-columns:1fr; gap:7px; max-height:290px; overflow:auto; }
      .cca-image-card { display:grid; grid-template-columns:70px 1fr; gap:8px; border:1px solid #e5e7eb; border-radius:11px; padding:7px; background:#fff; }
      .cca-image-card img { width:70px; height:70px; object-fit:cover; border-radius:8px; background:#f1f5f9; }
      .cca-img-info { min-width:0; font-size:11px; color:#475569; }
      .cca-img-info .url { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#94a3b8; margin:3px 0; }
      .cca-img-line { display:flex; align-items:center; gap:5px; margin-bottom:4px; }
      .cca-img-line select { border:1px solid #d1d5db; border-radius:7px; padding:3px 5px; font-size:11px; }
      .cca-sku-preview { max-height:180px; overflow:auto; background:#f8fafc; border:1px solid #e5e7eb; border-radius:10px; padding:7px; font-size:11px; color:#334155; white-space:pre-wrap; }
      .cca-sku-matrix { display:flex; flex-direction:column; gap:9px; }
      .cca-dim-card { border:1px solid #e5e7eb; border-radius:11px; background:#fff; padding:8px; }
      .cca-dim-head { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:6px; align-items:center; margin-bottom:7px; }
      .cca-dim-head input { min-width:0; border:1px solid #d1d5db; border-radius:999px; padding:7px 10px; font-size:12px; }
      .cca-dim-head [data-action="new-value"] { grid-column:1 / 2; }
      .cca-dim-head [data-action="add-value"] { grid-column:2 / 3; }
      .cca-dim-head .pick-name, .cca-dim-head .pick-value { border-radius:999px; padding:7px 10px; white-space:nowrap; max-width:100%; }
      .cca-dim-head .pick-value { grid-column:1 / -1; justify-self:start; background:#fff7ed; border-color:#fed7aa; color:#9a3412; }
      .cca-tags { display:flex; flex-wrap:wrap; gap:5px; }
      .cca-tag { border:1px solid #fed7aa; background:#fff7ed; color:#9a3412; border-radius:999px; padding:4px 7px; font-size:11px; display:inline-flex; gap:5px; align-items:center; }
      .cca-tag button { border:0; background:transparent; color:#b91c1c; cursor:pointer; font-weight:900; padding:0; }
      .cca-matrix-toolbar { display:flex; flex-wrap:wrap; gap:6px; align-items:center; margin:8px 0; }
      .cca-matrix-toolbar input,.cca-matrix-toolbar select { border:1px solid #d1d5db; border-radius:8px; padding:6px; font-size:12px; max-width:120px; }
      .cca-matrix-wrap { max-height:260px; overflow:auto; border:1px solid #e5e7eb; border-radius:11px; background:#fff; }
      .cca-sku-table { border-collapse:collapse; width:100%; min-width:720px; font-size:11px; }
      .cca-sku-table th,.cca-sku-table td { border-bottom:1px solid #e5e7eb; padding:6px; vertical-align:middle; text-align:left; }
      .cca-sku-table th { background:#f1f5f9; color:#475569; position:sticky; top:0; z-index:1; }
      .cca-sku-table input { width:100%; box-sizing:border-box; border:1px solid #d1d5db; border-radius:7px; padding:5px; font-size:11px; }
      .cca-sku-table .num { width:70px; }
      .cca-empty { color:#94a3b8; font-size:12px; padding:10px; text-align:center; }
      #${HIGHLIGHT_ID} { position:fixed; display:none; pointer-events:none; z-index:2147483646; border:2px solid #f97316; background:rgba(249,115,22,.12); border-radius:8px; }
      .cca-picking * { cursor:crosshair !important; }
      #${SELECTOR_ID} { position:fixed; z-index:2147483645; inset:0; display:none; background:rgba(15,23,42,.08); cursor:crosshair; }
      .cca-selection-box { position:fixed; border:2px solid #f97316; background:rgba(249,115,22,.14); border-radius:8px; pointer-events:none; }
      .cca-capture-tip { position:fixed; top:10px; left:50%; transform:translateX(-50%); z-index:2147483647; background:#111827; color:#fff; border-radius:999px; padding:8px 12px; font-size:12px; font-weight:700; pointer-events:none; }
    `;
    document.documentElement.appendChild(style);
  }

  function createUI() {
    if (document.getElementById(BUTTON_ID)) return;
    injectStyle();
    const button = document.createElement("button");
    button.id = BUTTON_ID;
    button.type = "button";
    button.innerHTML = "商品<br>采集";
    button.addEventListener("click", openPanel);
    document.documentElement.appendChild(button);

    const highlight = document.createElement("div");
    highlight.id = HIGHLIGHT_ID;
    document.documentElement.appendChild(highlight);

    const selector = document.createElement("div");
    selector.id = SELECTOR_ID;
    document.documentElement.appendChild(selector);

    const panel = document.createElement("aside");
    panel.id = PANEL_ID;
    panel.innerHTML = panelHtml();
    document.documentElement.appendChild(panel);
    bindPanelEvents();
    makePanelDraggable(panel);
    refreshForm();
    renderCandidates();
    renderImages();
  }

  function panelHtml() {
    const typeOptions = imageTypes.map(([v, l]) => `<option value="${v}">${l}</option>`).join("");
    return `
      <div class="cca-head" id="cca-drag-head">
        <div class="cca-title-wrap">
          <h2>商品采集助手 V1.0.3.7</h2>
          <p>SKU矩阵：规格值拆分 + 长规格修正</p>
        </div>
        <div class="cca-head-actions">
          <button type="button" class="cca-icon-btn" id="cca-collapse">收起</button>
          <button type="button" class="cca-icon-btn" id="cca-close">×</button>
        </div>
      </div>
      <div class="cca-body">
        <div class="cca-status warn" id="cca-status">修正版：优先拆子规格项，避免一组规格合成一个；支持长规格值如“猫咪/小型犬推荐（可裁剪-项围36cm）”。</div>

        <section class="cca-card">
          <h3>一、采集操作</h3>
          <div class="cca-actions">
            <button type="button" id="cca-autofill">自动预填</button>
            <button type="button" id="cca-pick-title">点选标题</button>
            <button type="button" id="cca-pick-price">点选价格</button>
            <button type="button" id="cca-pick-shop">点选店铺</button>
            <button type="button" id="cca-shot-region">框选截图</button>
            <button type="button" id="cca-stop-pick" class="cca-danger">退出选择</button>
          </div>
          <div class="cca-mini">面板可拖动、可收起；点选/截图时面板会尽量不挡页面。按 Esc 可取消选择。</div>
        </section>

        <section class="cca-card">
          <h3>二、商品信息</h3>
          <label class="cca-field"><span>商品标题</span><input id="cca-title" /></label>
          <div class="cca-row">
            <label class="cca-field"><span>平台</span><input id="cca-platform" /></label>
            <label class="cca-field"><span>店铺</span><input id="cca-shop" /></label>
          </div>
          <div class="cca-row3">
            <label class="cca-field"><span>价格</span><input id="cca-price" /></label>
            <label class="cca-field"><span>商品 ID</span><input id="cca-product-id" /></label>
            <label class="cca-field"><span>SKU ID</span><input id="cca-sku-id" /></label>
          </div>
          <label class="cca-field"><span>商品链接</span><input id="cca-url" /></label>
        </section>

        <section class="cca-card">
          <h3>三、SKU 矩阵填表 <span class="cca-muted">最多 2 个规格类型</span></h3>
          <div class="cca-actions" style="margin-bottom:8px;">
            <button type="button" id="cca-generate-matrix">按规格值生成组合</button>
            <button type="button" id="cca-add-manual-sku">手动加一行</button>
            <button type="button" id="cca-clear-matrix" class="cca-danger">清空矩阵</button>
          </div>
          <div class="cca-mini">先用“抓规格名/点选规格值”辅助填矩阵，也可以手动录；点选到带价格/库存的 SKU 行时，会尽量带出价格、库存和SKU图备注。</div>
          <div id="cca-sku-matrix" class="cca-sku-matrix"></div>
        </section>

        <section class="cca-card">
          <h3>四、图片候选池 <span class="cca-muted" id="cca-candidate-count"></span></h3>
          <div class="cca-img-tools">
            <div class="cca-img-group">
              <span class="cca-img-group-title">采集</span>
              <button type="button" id="cca-scan-images">扫描候选</button>
              <button type="button" id="cca-select-all-candidates">全选</button>
              <button type="button" id="cca-unselect-candidates">取消</button>
              <button type="button" id="cca-clear-candidates" class="cca-danger">清空</button>
            </div>
            <div class="cca-img-group">
              <span class="cca-img-group-title">批量标记</span>
              <button type="button" class="cca-primary" data-add-candidate-type="main">主图</button>
              <button type="button" data-add-candidate-type="sku">SKU图</button>
              <button type="button" data-add-candidate-type="detail">详情图</button>
              <button type="button" data-add-candidate-type="review">评价图</button>
              <button type="button" data-add-candidate-type="other">其他</button>
            </div>
          </div>
          <div id="cca-candidate-grid" class="cca-candidate-grid"><div class="cca-muted">先点“扫描候选”，再批量勾选和分类。</div></div>
        </section>

        <section class="cca-card">
          <h3>五、已选图片 / 截图</h3>
          <div class="cca-actions" style="margin-bottom:8px;">
            <button type="button" id="cca-clear-images" class="cca-danger">清空已选图片</button>
          </div>
          <div id="cca-image-list" class="cca-image-list"><div class="cca-muted">还没有选择图片。</div></div>
        </section>

        <section class="cca-card">
          <h3>六、导出</h3>
          <div class="cca-actions">
            <button type="button" id="cca-copy-json">复制 JSON</button>
            <button type="button" id="cca-export-zip" class="cca-primary">导出 ZIP 商品包</button>
          </div>
          <p class="cca-muted">ZIP 可导入电商选品工具箱 V1.7.6 的“商品收集 → 插件商品包导入”。</p>
        </section>
      </div>
    `;
  }

  function bindPanelEvents() {
    const byId = (id) => document.getElementById(id);
    byId("cca-close")?.addEventListener("click", closePanel);
    byId("cca-collapse")?.addEventListener("click", toggleCollapse);
    byId("cca-autofill")?.addEventListener("click", () => { autoFill(); refreshForm(); setStatus("已自动预填。标题/价格不准就点选覆盖。", "ok"); });
    byId("cca-generate-matrix")?.addEventListener("click", rebuildCombinations);
    byId("cca-add-manual-sku")?.addEventListener("click", addManualSkuItem);
    byId("cca-clear-matrix")?.addEventListener("click", () => { ensureSkuMatrix(); state.product.skuMatrix.items = []; state.product.skus = []; renderSkuMatrix(); renderSkuPreview(); setStatus("已清空SKU矩阵。", ""); });
    byId("cca-pick-title")?.addEventListener("click", () => startTextPick("title"));
    byId("cca-pick-price")?.addEventListener("click", () => startTextPick("price"));
    byId("cca-pick-shop")?.addEventListener("click", () => startTextPick("shopName"));
    byId("cca-shot-region")?.addEventListener("click", startRegionScreenshot);
    byId("cca-stop-pick")?.addEventListener("click", stopPicking);
    byId("cca-scan-images")?.addEventListener("click", scanImageCandidates);
    byId("cca-select-all-candidates")?.addEventListener("click", () => { state.candidates.forEach(c => c.checked = true); renderCandidates(); });
    byId("cca-unselect-candidates")?.addEventListener("click", () => { state.candidates.forEach(c => c.checked = false); renderCandidates(); });
    byId("cca-clear-candidates")?.addEventListener("click", () => { state.candidates = []; renderCandidates(); });
    document.querySelectorAll(`#${PANEL_ID} [data-add-candidate-type]`).forEach((btn) => btn.addEventListener("click", () => addSelectedCandidatesAs(btn.dataset.addCandidateType || "main")));
    byId("cca-clear-images")?.addEventListener("click", () => { state.images = []; renderImages(); });
    byId("cca-copy-json")?.addEventListener("click", copyJson);
    byId("cca-export-zip")?.addEventListener("click", exportZip);

    ["title", "platform", "shop", "price", "product-id", "sku-id", "url"].forEach((suffix) => {
      const el = byId(`cca-${suffix}`);
      if (!el) return;
      el.addEventListener("input", syncFromForm);
    });
  }

  function openPanel() {
    const panel = document.getElementById(PANEL_ID);
    panel?.classList.add("open");
    autoFill();
    refreshForm();
  }

  function closePanel() {
    stopPicking();
    document.getElementById(PANEL_ID)?.classList.remove("open");
  }

  function toggleCollapse() {
    const panel = document.getElementById(PANEL_ID);
    const btn = document.getElementById("cca-collapse");
    if (!panel) return;
    state.panelCollapsed = !state.panelCollapsed;
    panel.classList.toggle("mini", state.panelCollapsed);
    if (btn) btn.textContent = state.panelCollapsed ? "展开" : "收起";
  }

  function hidePanelForCapture() {
    const panel = document.getElementById(PANEL_ID);
    if (!panel || !panel.classList.contains("open")) return;
    panel.classList.add("hidden-capture");
    state.hiddenForCapture = true;
  }

  function restorePanelAfterCapture() {
    const panel = document.getElementById(PANEL_ID);
    if (panel && state.hiddenForCapture) panel.classList.remove("hidden-capture");
    state.hiddenForCapture = false;
  }

  function makePanelDraggable(panel) {
    const head = panel.querySelector("#cca-drag-head");
    if (!head) return;
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;
    head.addEventListener("mousedown", (event) => {
      if (event.target.closest("button")) return;
      dragging = true;
      const rect = panel.getBoundingClientRect();
      startX = event.clientX; startY = event.clientY; startLeft = rect.left; startTop = rect.top;
      panel.style.right = "auto";
      panel.style.left = `${rect.left}px`;
      panel.style.top = `${rect.top}px`;
      document.body.style.userSelect = "none";
    }, true);
    document.addEventListener("mousemove", (event) => {
      if (!dragging) return;
      const left = Math.min(Math.max(6, startLeft + event.clientX - startX), window.innerWidth - 80);
      const top = Math.min(Math.max(6, startTop + event.clientY - startY), window.innerHeight - 48);
      panel.style.left = `${left}px`;
      panel.style.top = `${top}px`;
    }, true);
    document.addEventListener("mouseup", () => { dragging = false; document.body.style.userSelect = ""; }, true);
  }

  function setStatus(text, kind = "") {
    const el = document.getElementById("cca-status");
    if (!el) return;
    el.textContent = text;
    el.className = `cca-status ${kind}`.trim();
  }

  function syncFromForm() {
    const value = (id) => document.getElementById(id)?.value || "";
    state.product.title = value("cca-title");
    state.product.platform = value("cca-platform");
    state.product.shopName = value("cca-shop");
    state.product.price = value("cca-price");
    state.product.productId = value("cca-product-id");
    state.product.skuId = value("cca-sku-id");
    state.product.url = value("cca-url");
    state.product.skuText = value("cca-sku-text");
  }

  function refreshForm() {
    const set = (id, value) => {
      const el = document.getElementById(id);
      if (el && el.value !== String(value || "")) el.value = String(value || "");
    };
    set("cca-title", state.product.title);
    set("cca-platform", state.product.platform);
    set("cca-shop", state.product.shopName);
    set("cca-price", state.product.price);
    set("cca-product-id", state.product.productId);
    set("cca-sku-id", state.product.skuId);
    set("cca-url", state.product.url);
    set("cca-sku-text", state.product.skuText);
    renderSkuPreview();
    renderSkuMatrix();
  }

  function autoFill() {
    state.product.platform = state.product.platform || detectPlatform();
    state.product.url = location.href;
    state.product.productId = state.product.productId || detectProductId();
    state.product.skuId = state.product.skuId || detectSkuId();
    state.product.title = state.product.title || findLikelyTitle();
    state.product.shopName = state.product.shopName || findLikelyShop();
    state.product.price = state.product.price || findLikelyPrice();
  }

  function detectPlatform() {
    const host = location.hostname;
    if (/1688\.com/i.test(host)) return "1688";
    if (/tmall\.com/i.test(host)) return "天猫";
    if (/taobao\.com/i.test(host)) return "淘宝";
    if (/jd\.com|360buy/i.test(host)) return "京东";
    if (/pinduoduo|yangkeduo/i.test(host)) return "拼多多";
    return host.replace(/^www\./, "");
  }

  function detectProductId() {
    const url = new URL(location.href);
    const id = url.searchParams.get("id") || url.searchParams.get("itemId") || url.searchParams.get("offerId") || "";
    if (id) return id;
    const m = location.href.match(/(?:offer|item)\/(\d+)|offer\/(\d+)\.html|offer\/(\d+)/i);
    return (m && (m[1] || m[2] || m[3])) || "";
  }

  function detectSkuId() {
    const url = new URL(location.href);
    return url.searchParams.get("skuId") || url.searchParams.get("sku_id") || "";
  }

  function cleanText(text) {
    return String(text || "").replace(/[\u200b\ufeff]/g, "").replace(/\s+/g, " ").trim();
  }

  function visibleText(el) {
    if (!el) return "";
    const rect = el.getBoundingClientRect?.();
    if (rect && (rect.width <= 0 || rect.height <= 0)) return "";
    return cleanText(el.innerText || el.textContent || el.getAttribute?.("title") || el.getAttribute?.("aria-label") || el.getAttribute?.("alt") || "");
  }

  function findLikelyTitle() {
    const candidates = [];
    [
      "meta[property='og:title']", "meta[name='title']", "h1", "[class*='title']", "[class*='Title']", "[class*='subject']", "[class*='offer-title']", "[class*='item-title']", "[class*='ItemTitle']"
    ].forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        const text = el.tagName === "META" ? cleanText(el.content) : visibleText(el);
        if (text && text.length >= 4 && text.length <= 160) candidates.push(stripTitleNoise(text));
      });
    });
    document.querySelectorAll("body *").forEach((el) => {
      if (candidates.length > 120) return;
      const rect = el.getBoundingClientRect?.();
      if (!rect || rect.top < 0 || rect.top > window.innerHeight * 0.7 || rect.width < 120 || rect.height < 16) return;
      const text = visibleText(el);
      if (text && text.length >= 8 && text.length <= 90 && /[\u4e00-\u9fa5a-zA-Z]/.test(text)) candidates.push(stripTitleNoise(text));
    });
    const title = stripTitleNoise(document.title);
    if (title) candidates.push(title);
    return unique(candidates).sort((a, b) => scoreTitle(b) - scoreTitle(a))[0] || "";
  }

  function stripTitleNoise(text) {
    return cleanText(String(text || "")
      .replace(/[-_].*?(1688|淘宝|天猫|京东|阿里巴巴).*$/i, "")
      .replace(/【.*?登录.*?】/g, ""));
  }

  function scoreTitle(text) {
    let score = 0;
    if (text.length >= 10 && text.length <= 80) score += 16;
    if (/批发|厂家|供应|跨境|现货|宠物|外贸|儿童|家用|玩具|商品/.test(text)) score += 8;
    if (/￥|¥|价格|销量|库存|客服|购物车|登录|注册|搜索|首页|收藏|分享|1688|淘宝|天猫|广告|举报/.test(text)) score -= 30;
    if ((text.match(/[\u4e00-\u9fa5]/g) || []).length < 4) score -= 12;
    return score;
  }

  function findLikelyShop() {
    const candidates = [];
    ["[class*=company]", "[class*=shop]", "[class*=seller]", "[class*=store]", "[class*=supplier]", "[class*=factory]"].forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        const text = visibleText(el);
        if (text && /店|厂|公司|旗舰|专营|商行|经营部|供应商/.test(text) && text.length <= 90) candidates.push(text);
      });
    });
    return unique(candidates).sort((a, b) => a.length - b.length)[0] || "";
  }

  function findLikelyPrice() {
    const candidates = [];
    document.querySelectorAll("body *").forEach((el) => {
      if (candidates.length > 80) return;
      const rect = el.getBoundingClientRect?.();
      if (!rect || rect.top < 0 || rect.top > window.innerHeight * 0.85 || rect.width <= 0 || rect.height <= 0) return;
      const text = visibleText(el);
      if (!text || text.length > 80) return;
      const m = text.match(/(?:￥|¥)\s*([0-9]+(?:\.[0-9]+)?)/) || text.match(/([0-9]+(?:\.[0-9]+)?)\s*元/);
      if (m) candidates.push({ value: m[1], score: /price|Price|价格|sale/i.test(el.className || "") ? 20 : 0 });
    });
    const good = candidates.filter((c) => Number(c.value) > 0 && Number(c.value) < 100000);
    return good.sort((a, b) => b.score - a.score)[0]?.value || "";
  }

  function extractPrice(text) {
    const raw = cleanText(text);
    const m = raw.match(/(?:￥|¥)\s*([0-9]+(?:\.[0-9]+)?)/) || raw.match(/([0-9]+(?:\.[0-9]+)?)\s*元/) || raw.match(/([0-9]+(?:\.[0-9]+)?)/);
    return m ? m[1] : raw;
  }

  function startTextPick(field) {
    stopPicking(false);
    const meta = fieldMap[field];
    if (!meta) return;
    setStatus(`正在点选${meta.label}：移动到目标区域，点击确认；Esc取消。`, "warn");
    hidePanelForCapture();
    document.body.classList.add("cca-picking");
    const onMove = (event) => {
      const target = validPickTarget(event.target);
      if (target) showHighlight(target);
    };
    const onClick = (event) => {
      const target = validPickTarget(event.target);
      if (!target) return;
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      let text = cleanText(target.innerText || target.textContent || target.getAttribute?.("title") || target.getAttribute?.("aria-label") || target.getAttribute?.("alt") || "");
      if (field === "price") text = extractPrice(text);
      if (field === "skuText") {
        state.product.skuText = text;
        state.product.skus = parseSkuLines(text);
      } else {
        state.product[field] = text;
      }
      restorePanelAfterCapture(); refreshForm(); stopPicking(false); setStatus(`已点选${meta.label}。`, "ok");
    };
    const onKey = (event) => { if (event.key === "Escape") { restorePanelAfterCapture(); stopPicking(); } };
    document.addEventListener("mousemove", onMove, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKey, true);
    state.pickingHandler = () => {
      document.removeEventListener("mousemove", onMove, true);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }

  function startElementPick(label, callback) {
    stopPicking(false);
    setStatus(`正在点选${label}：移动到目标区域，点击确认；Esc取消。`, "warn");
    hidePanelForCapture();
    document.body.classList.add("cca-picking");
    const onMove = (event) => {
      const target = validPickTarget(event.target);
      if (target) showHighlight(target);
    };
    const onClick = (event) => {
      const target = validPickTarget(event.target);
      if (!target) return;
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      try { callback(target); } catch (error) { setStatus(`点选失败：${error.message || error}`, "warn"); }
      restorePanelAfterCapture(); refreshForm(); stopPicking(false); setStatus(`已点选${label}。`, "ok");
    };
    const onKey = (event) => { if (event.key === "Escape") { restorePanelAfterCapture(); stopPicking(); } };
    document.addEventListener("mousemove", onMove, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKey, true);
    state.pickingHandler = () => {
      document.removeEventListener("mousemove", onMove, true);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }

  function startSpecNamePick(index) {
    startElementPick(`规格${index + 1}名称`, (target) => {
      const text = cleanText(target.innerText || target.textContent || target.getAttribute?.("title") || target.getAttribute?.("aria-label") || "");
      renameDimension(index, text || `规格${index + 1}`);
      renderSkuMatrix();
    });
  }

  function startSpecValuesPick(index) {
    startElementPick(`规格${index + 1}值`, (target) => {
      const rows = parseRowsFromBlock(target).filter((row) => row && (row.name || row.price || row.stock));
      const richRows = rows.filter((row) => row.price || row.stock || row.imageUrl);
      if (richRows.length) {
        const matrix = ensureSkuMatrix();
        const otherDimHasValues = (matrix.dimensions[1 - index]?.values || []).length > 0;
        mergeSpecValues(index, richRows.map((row) => row.name).filter(Boolean), richRows);
        if (otherDimHasValues) {
          applyValueMetaToExistingItems(index, richRows);
          renderSkuMatrix();
          renderSkuPreview();
          setStatus(`已抓到 ${richRows.length} 个带价格/库存的规格值；生成组合时会自动带入价格/库存，仍可手动修正。`, "ok");
        } else {
          appendRowsToMatrixForDimension(index, richRows);
          renderSkuMatrix();
          renderSkuPreview();
          setStatus(`已点选并加入 ${richRows.length} 条 SKU；价格/库存/图片备注可继续手动修正。`, "ok");
        }
        return;
      }
      const values = extractSpecValuesFromElement(target);
      mergeSpecValues(index, values);
      renderSkuMatrix();
      renderSkuPreview();
      setStatus(values.length ? `已加入 ${values.length} 个规格值。` : "没有识别到规格值，请点更小的按钮/规格值区域。", values.length ? "ok" : "warn");
    });
  }

  function mergeSpecValues(index, values, rows = []) {
    const matrix = ensureSkuMatrix();
    const dim = matrix.dimensions[index];
    if (!dim.valueMeta || typeof dim.valueMeta !== "object") dim.valueMeta = {};
    const cleaned = unique((values || []).map(cleanText).filter((value) => value && !isBadSpecValue(value))).slice(0, 80);
    cleaned.forEach((value) => { if (!dim.values.includes(value)) dim.values.push(value); });
    (rows || []).forEach((row) => {
      const value = cleanText(row.name || "");
      if (!value || isBadSpecValue(value)) return;
      if (!dim.values.includes(value)) dim.values.push(value);
      const prev = dim.valueMeta[value] || {};
      dim.valueMeta[value] = {
        price: row.price || prev.price || "",
        stock: row.stock || prev.stock || "",
        imageUrl: row.imageUrl || prev.imageUrl || "",
        imageNote: row.imageUrl ? "有SKU图" : (row.imageNote || prev.imageNote || ""),
        rawName: row.rawName || row.name || prev.rawName || value
      };
    });
  }

  function extractSpecValuesFromElement(root) {
    if (!root || root.nodeType !== 1) return [];
    const values = [];
    const addValue = (text) => {
      splitSpecValueText(text).forEach((value) => {
        const cleaned = sanitizeSpecValue(value);
        if (cleaned && cleaned.length <= 80 && !isBadSpecValue(cleaned)) values.push(cleaned);
      });
    };

    // 关键：先从“子规格项”提取，只有找不到子项时才读整块文本。
    // 避免点到一整排 1 / 2 / 3 时被合成 123 或一个大规格值。
    const childCandidates = collectSpecChildCandidates(root);
    if (childCandidates.length > 1) {
      childCandidates.forEach((item) => addValue(item.text));
      return unique(values).slice(0, 80);
    }

    const selector = "button,li,a,label,span,[role='button'],[class*='item'],[class*='Item'],[class*='prop'],[class*='Prop'],[class*='sku'],[class*='Sku'],[class*='spec'],[class*='Spec']";
    const allNodes = Array.from(root.querySelectorAll?.(selector) || []);
    const candidates = allNodes.map((node) => {
      const rect = node.getBoundingClientRect?.();
      if (!rect || rect.width < 6 || rect.height < 6) return null;
      const text = sanitizeSpecValue(nodeText(node));
      if (!text || text.length > 90 || isBadSpecValue(text)) return null;
      return { node, text };
    }).filter(Boolean);

    // 如果某个节点包含多个更小候选，就跳过父节点，只取叶子候选。
    const leaves = candidates.filter((item) => {
      return !candidates.some((child) => {
        if (child === item || child.node === item.node) return false;
        if (!item.node.contains?.(child.node)) return false;
        if (child.text === item.text) return false;
        return item.text.includes(child.text) || child.node.parentElement === item.node;
      });
    });

    const selected = leaves.length > 1 ? leaves : candidates;
    selected.forEach((item) => addValue(item.text));

    if (!values.length) addValue(root.innerText || root.textContent || "");
    return unique(values).slice(0, 80);
  }

  function collectSpecChildCandidates(root) {
    const list = [];
    const push = (node, text) => {
      const cleaned = sanitizeSpecValue(text);
      if (!cleaned || cleaned.length > 80 || isBadSpecValue(cleaned)) return;
      list.push({ node, text: cleaned });
    };

    // 先看直接子元素。1688 的规格值通常就是一排按钮/标签/图片块。
    Array.from(root.children || []).forEach((child) => {
      const rect = child.getBoundingClientRect?.();
      if (!rect || rect.width < 6 || rect.height < 6) return;
      const nested = Array.from(child.querySelectorAll?.("button,li,a,label,span,[role='button'],[class*='item'],[class*='Item'],[class*='prop'],[class*='Prop'],[class*='sku'],[class*='Sku'],[class*='spec'],[class*='Spec']") || [])
        .map((el) => ({ el, text: sanitizeSpecValue(nodeText(el)) }))
        .filter((x) => x.text && x.text.length <= 80 && !isBadSpecValue(x.text));
      if (nested.length > 1) {
        nested.forEach((x) => push(x.el, x.text));
        return;
      }
      push(child, nodeText(child));
    });

    // 如果直接子元素不明显，再用所有叶子元素兜底。
    if (list.length <= 1) {
      const selector = "button,li,a,label,span,[role='button']";
      const nodes = Array.from(root.querySelectorAll?.(selector) || []);
      nodes.forEach((node) => {
        const rect = node.getBoundingClientRect?.();
        if (!rect || rect.width < 6 || rect.height < 6) return;
        const hasChildOption = Array.from(node.children || []).some((child) => {
          const t = sanitizeSpecValue(nodeText(child));
          return t && !isBadSpecValue(t) && t !== sanitizeSpecValue(nodeText(node));
        });
        if (!hasChildOption) push(node, nodeText(node));
      });
    }

    return uniqueBy(list, (item) => item.text).slice(0, 80);
  }

  function nodeText(node) {
    return cleanText(node?.innerText || node?.textContent || node?.getAttribute?.("title") || node?.getAttribute?.("aria-label") || node?.getAttribute?.("alt") || "");
  }

  function sanitizeSpecValue(text) {
    return cleanText(text)
      .replace(/[¥￥]\s*[0-9]+(?:\.[0-9]+)?/g, " ")
      .replace(/[0-9]+(?:\.[0-9]+)?\s*元/g, " ")
      .replace(/库存\s*[:：]?\s*[0-9,]+\s*(?:个|件|只|套)?/g, " ")
      .replace(/[＋+－−-]\s*0\s*[＋+]?/g, " ")
      .replace(/\b0\b\s*[＋+]/g, " ")
      .replace(/^(规格|颜色|尺码|尺寸|款式)\s*/g, "")
      .replace(/\s*个\s*$/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function splitSpecValueText(text) {
    const source = String(text || "").trim();
    if (!source) return [];
    const primary = source
      .split(/[\n\r、,，;；\t]+|\s{2,}/)
      .map(sanitizeSpecValue)
      .filter(Boolean);
    if (primary.length > 1) return primary;

    const raw = sanitizeSpecValue(source);
    if (!raw) return [];

    // 单空格拆分只在“看起来是一组规格值”时启用，避免把 “S码 30*30cm” 这类单个规格拆坏。
    const spaceParts = raw.split(/\s+/).map(sanitizeSpecValue).filter(Boolean);
    const simpleSpecToken = (part) => {
      if (!part || isBadSpecValue(part) || part.length > 40) return false;
      if (/^[0-9]+$/.test(part)) return true;
      if (/^(?:XXS|XS|S|M|L|XL|XXL|XXXL)(?:码)?$/i.test(part)) return true;
      if (/^[\u4e00-\u9fa5a-zA-Z0-9]{1,10}(?:色|黄|粉|蓝|绿|灰|黑|白|紫|红|咖|米|橙|金|银|款)?$/.test(part)) return true;
      return false;
    };
    const looksLikeSeparateValues = spaceParts.length > 1 && spaceParts.length <= 80 && (
      (spaceParts.length >= 3 && spaceParts.every((part) => part.length <= 40 && !isBadSpecValue(part))) ||
      spaceParts.every(simpleSpecToken)
    );
    if (looksLikeSeparateValues) return spaceParts;

    return [raw];
  }

  function isBadSpecValue(text) {
    return /平台活动|活动前价格|划线价格|未划线价格|内容声明|全网销量|阿里巴巴|请选择|选择|采购量|立即|加入|客服|收藏|分享|登录|购物车|价格|库存|起批|评价|详情|猜你喜欢|举报|仅供参考|￥|¥/.test(cleanText(text));
  }

  function validPickTarget(target) {
    if (!target || target.nodeType !== 1) return null;
    if (target.closest?.(`#${PANEL_ID}, #${BUTTON_ID}`)) return null;
    return target;
  }

  function showHighlight(target) {
    const rect = target.getBoundingClientRect();
    if (!rect || rect.width < 2 || rect.height < 2) return;
    const box = document.getElementById(HIGHLIGHT_ID);
    if (!box) return;
    box.style.display = "block";
    box.style.left = `${Math.max(0, rect.left)}px`;
    box.style.top = `${Math.max(0, rect.top)}px`;
    box.style.width = `${Math.max(0, rect.width)}px`;
    box.style.height = `${Math.max(0, rect.height)}px`;
  }

  function hideHighlight() {
    const box = document.getElementById(HIGHLIGHT_ID);
    if (box) box.style.display = "none";
  }

  function stopPicking(updateStatus = true) {
    if (state.pickingHandler) state.pickingHandler();
    state.pickingHandler = null;
    document.body?.classList.remove("cca-picking");
    hideHighlight();
    const overlay = document.getElementById(SELECTOR_ID);
    if (overlay) overlay.style.display = "none";
    restorePanelAfterCapture();
    if (updateStatus) setStatus("已退出选择模式。", "");
  }

  function extract1688VisibleSku() {
    captureVisibleSkuToMatrix();
  }


  function ensureSkuMatrix() {
    if (!state.product.skuMatrix || !Array.isArray(state.product.skuMatrix.dimensions)) {
      state.product.skuMatrix = { dimensions: [{ name: "款式", values: [] }, { name: "规格", values: [] }], items: [] };
    }
    while (state.product.skuMatrix.dimensions.length < 2) state.product.skuMatrix.dimensions.push({ name: state.product.skuMatrix.dimensions.length ? "规格" : "款式", values: [] });
    state.product.skuMatrix.dimensions = state.product.skuMatrix.dimensions.slice(0, 2).map((d, index) => ({
      name: cleanText(d.name || (index ? "规格" : "款式")),
      values: unique((d.values || []).map(cleanText)),
      valueMeta: (d.valueMeta && typeof d.valueMeta === "object") ? d.valueMeta : {}
    }));
    dedupeDimensionNames(state.product.skuMatrix.dimensions);
    if (!Array.isArray(state.product.skuMatrix.items)) state.product.skuMatrix.items = [];
    return state.product.skuMatrix;
  }

  function renderSkuMatrix() {
    const root = document.getElementById("cca-sku-matrix");
    if (!root) return;
    const matrix = ensureSkuMatrix();
    const dims = matrix.dimensions;
    const dimHtml = dims.map((dim, dimIndex) => {
      const tags = (dim.values || []).map((value, valueIndex) => `<span class="cca-tag">${escapeHtml(value)} <button type="button" data-dim="${dimIndex}" data-val="${valueIndex}" data-action="remove-value">×</button></span>`).join("") || `<span class="cca-muted">还没有规格值</span>`;
      return `<div class="cca-dim-card">
        <div class="cca-dim-head">
          <input data-dim="${dimIndex}" data-action="dim-name" value="${escapeAttr(dim.name)}" placeholder="规格类型" />
          <button type="button" class="cca-btn pick-name" data-dim="${dimIndex}" data-action="pick-dim-name">抓规格名</button>
          <input data-dim="${dimIndex}" data-action="new-value" placeholder="输入规格值，回车添加" />
          <button type="button" class="cca-btn" data-dim="${dimIndex}" data-action="add-value">添加</button>
          <button type="button" class="cca-btn pick-value" data-dim="${dimIndex}" data-action="pick-dim-value">点选规格值</button>
        </div>
        <div class="cca-tags">${tags}</div>
      </div>`;
    }).join("");

    const filter1 = root.dataset.filter1 || "";
    const filter2 = root.dataset.filter2 || "";
    const items = matrix.items || [];
    const visibleItems = items.filter((item) => {
      const attrs = item.attrs || {};
      if (filter1 && attrs[dims[0].name] !== filter1) return false;
      if (filter2 && attrs[dims[1].name] !== filter2) return false;
      return true;
    });

    const opt = (values, current) => `<option value="">全部</option>` + (values || []).map((v) => `<option value="${escapeAttr(v)}" ${v === current ? "selected" : ""}>${escapeHtml(v)}</option>`).join("");
    const rows = visibleItems.map((item) => {
      const index = items.indexOf(item);
      const attrs = item.attrs || {};
      return `<tr data-index="${index}">
        <td><input type="checkbox" data-action="row-check" ${item.checked ? "checked" : ""}></td>
        <td>${escapeHtml(attrs[dims[0].name] || "")}</td>
        <td>${escapeHtml(attrs[dims[1].name] || "")}</td>
        <td><input class="num" data-action="item-field" data-field="price" value="${escapeAttr(item.price || "")}" placeholder="价格"></td>
        <td><input class="num" data-action="item-field" data-field="stock" value="${escapeAttr(item.stock || "")}" placeholder="库存"></td>
        <td><input data-action="item-field" data-field="imageNote" value="${escapeAttr(item.imageNote || item.imageUrl || "")}" placeholder="图片备注/URL"></td>
        <td><input data-action="item-field" data-field="rawName" value="${escapeAttr(item.rawName || buildRawName(item, dims))}" placeholder="原始规格名"></td>
        <td><button type="button" class="cca-btn cca-danger" data-action="remove-item">删</button></td>
      </tr>`;
    }).join("");

    root.innerHTML = `${dimHtml}
      <div class="cca-matrix-toolbar">
        <select data-action="filter1">${opt(dims[0].values, filter1)}</select>
        <select data-action="filter2">${opt(dims[1].values, filter2)}</select>
        <button type="button" class="cca-btn" data-action="check-visible">勾选当前显示</button>
        <button type="button" class="cca-btn" data-action="uncheck-all">清空勾选</button>
        <input data-action="batch-price" placeholder="批量价格">
        <input data-action="batch-stock" placeholder="批量库存">
        <input data-action="batch-image" placeholder="批量图备注">
        <label class="cca-muted"><input type="checkbox" data-action="only-empty" checked> 只填空白</label>
        <button type="button" class="cca-btn" data-action="batch-apply">批量设置</button>
        <button type="button" class="cca-btn" data-action="auto-raw">生成原始名</button>
      </div>
      <div class="cca-matrix-wrap">${rows ? `<table class="cca-sku-table"><thead><tr><th style="width:32px"></th><th>${escapeHtml(dims[0].name)}</th><th>${escapeHtml(dims[1].name)}</th><th>价格</th><th>库存</th><th>SKU图/图片备注</th><th>原始规格名</th><th></th></tr></thead><tbody>${rows}</tbody></table>` : `<div class="cca-empty">还没有 SKU 行。先添加规格值并生成组合，或手动加一行；点选规格值可做辅助预填。</div>`}</div>`;

    bindSkuMatrixEvents(root);
  }

  function bindSkuMatrixEvents(root) {
    root.querySelectorAll("[data-action]").forEach((el) => {
      const action = el.dataset.action;
      if (action === "dim-name") el.addEventListener("change", (e) => { renameDimension(Number(e.target.dataset.dim), cleanText(e.target.value) || (Number(e.target.dataset.dim) ? "规格" : "款式")); renderSkuMatrix(); });
      if (action === "new-value") el.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); addDimensionValue(Number(e.target.dataset.dim), e.target.value); } });
      if (action === "add-value") el.addEventListener("click", () => { const dimIndex = Number(el.dataset.dim); const input = root.querySelector(`input[data-action='new-value'][data-dim='${dimIndex}']`); addDimensionValue(dimIndex, input?.value || ""); });
      if (action === "pick-dim-name") el.addEventListener("click", () => startSpecNamePick(Number(el.dataset.dim)));
      if (action === "pick-dim-value") el.addEventListener("click", () => startSpecValuesPick(Number(el.dataset.dim)));
      if (action === "remove-value") el.addEventListener("click", () => { const matrix = ensureSkuMatrix(); const dimIndex = Number(el.dataset.dim); const valueIndex = Number(el.dataset.val); const removed = matrix.dimensions[dimIndex].values.splice(valueIndex, 1)[0]; if (removed && matrix.dimensions[dimIndex].valueMeta) delete matrix.dimensions[dimIndex].valueMeta[removed]; renderSkuMatrix(); });
      if (action === "filter1") el.addEventListener("change", (e) => { root.dataset.filter1 = e.target.value; renderSkuMatrix(); });
      if (action === "filter2") el.addEventListener("change", (e) => { root.dataset.filter2 = e.target.value; renderSkuMatrix(); });
      if (action === "row-check") el.addEventListener("change", (e) => { const index = Number(e.target.closest("tr")?.dataset.index); ensureSkuMatrix().items[index].checked = e.target.checked; });
      if (action === "item-field") el.addEventListener("input", (e) => { const index = Number(e.target.closest("tr")?.dataset.index); ensureSkuMatrix().items[index][e.target.dataset.field] = e.target.value; syncSkusFromMatrix(); });
      if (action === "remove-item") el.addEventListener("click", (e) => { const index = Number(e.target.closest("tr")?.dataset.index); ensureSkuMatrix().items.splice(index, 1); syncSkusFromMatrix(); renderSkuMatrix(); renderSkuPreview(); });
      if (action === "check-visible") el.addEventListener("click", () => { root.querySelectorAll("tr[data-index]").forEach((tr) => { const item = ensureSkuMatrix().items[Number(tr.dataset.index)]; if (item) item.checked = true; }); renderSkuMatrix(); });
      if (action === "uncheck-all") el.addEventListener("click", () => { ensureSkuMatrix().items.forEach((item) => item.checked = false); renderSkuMatrix(); });
      if (action === "batch-apply") el.addEventListener("click", () => applySkuBatch(root));
      if (action === "auto-raw") el.addEventListener("click", () => { const matrix = ensureSkuMatrix(); matrix.items.forEach((item) => { item.rawName = buildRawName(item, matrix.dimensions); }); syncSkusFromMatrix(); renderSkuMatrix(); setStatus("已按规格值生成原始规格名。", "ok"); });
    });
  }

  function addDimensionValue(dimIndex, rawValue) {
    const value = cleanText(rawValue);
    if (!value) return;
    const dim = ensureSkuMatrix().dimensions[dimIndex];
    if (!dim.values.includes(value)) dim.values.push(value);
    renderSkuMatrix();
  }

  function appendRowsToMatrixForDimension(dimIndex, rows) {
    const matrix = ensureSkuMatrix();
    const dims = matrix.dimensions;
    const otherIndex = 1 - dimIndex;
    const seen = new Set(matrix.items.map((item) => `${buildRawName(item, dims)}|${item.price || ""}|${item.stock || ""}`));
    rows.forEach((row) => {
      const value = cleanText(row.name || "");
      if (!value) return;
      const attrs = { [dims[0].name]: "", [dims[1].name]: "" };
      attrs[dims[dimIndex].name] = value;
      attrs[dims[otherIndex].name] = "";
      const raw = row.rawName || value;
      const key = `${raw}|${row.price || ""}|${row.stock || ""}`;
      if (seen.has(key)) return;
      seen.add(key);
      matrix.items.push({ attrs, price: row.price || "", stock: row.stock || "", imageUrl: row.imageUrl || "", imageNote: row.imageUrl ? "有SKU图" : (row.imageNote || ""), rawName: raw, note: "点选规格值带入" });
    });
    syncSkusFromMatrix();
  }

  function applyValueMetaToExistingItems(dimIndex, rows) {
    const matrix = ensureSkuMatrix();
    const dimName = matrix.dimensions[dimIndex].name;
    (rows || []).forEach((row) => {
      const value = cleanText(row.name || "");
      if (!value) return;
      (matrix.items || []).forEach((item) => {
        if ((item.attrs || {})[dimName] !== value) return;
        if (row.price && !item.price) item.price = row.price;
        if (row.stock && !item.stock) item.stock = row.stock;
        if (row.imageUrl && !item.imageUrl) item.imageUrl = row.imageUrl;
        if ((row.imageUrl || row.imageNote) && !item.imageNote) item.imageNote = row.imageUrl ? "有SKU图" : row.imageNote;
        if (!item.rawName) item.rawName = buildRawName(item, matrix.dimensions);
      });
    });
    syncSkusFromMatrix();
  }

  function updateItemAttrsAfterDimRename() {
    dedupeDimensionNames(ensureSkuMatrix().dimensions);
  }

  function renameDimension(index, nextName) {
    const matrix = ensureSkuMatrix();
    const oldNames = matrix.dimensions.map((d, i) => cleanText(d.name || `规格${i + 1}`) || `规格${i + 1}`);
    matrix.dimensions[index].name = cleanText(nextName || `规格${index + 1}`) || `规格${index + 1}`;
    dedupeDimensionNames(matrix.dimensions);
    const newNames = matrix.dimensions.map((d, i) => cleanText(d.name || `规格${i + 1}`) || `规格${i + 1}`);
    (matrix.items || []).forEach((item) => {
      const oldAttrs = item.attrs || {};
      const values = oldNames.map((oldName, i) => oldAttrs[oldName] || oldAttrs[newNames[i]] || oldAttrs[`dim${i + 1}`] || "");
      item.attrs = { [newNames[0]]: values[0] || "", [newNames[1]]: values[1] || "" };
    });
    syncSkusFromMatrix();
  }

  function dedupeDimensionNames(dimensions) {
    const seen = new Map();
    dimensions.forEach((dim, index) => {
      let base = cleanText(dim.name || `规格${index + 1}`) || `规格${index + 1}`;
      const count = seen.get(base) || 0;
      seen.set(base, count + 1);
      if (count > 0) base = `${base}${count + 1}`;
      dim.name = base;
    });
  }

  function rebuildCombinations() {
    const matrix = ensureSkuMatrix();
    const dims = matrix.dimensions;
    const v1 = dims[0].values || [];
    const v2 = dims[1].values || [];
    if (!v1.length && !v2.length) { setStatus("请先添加至少一个规格值。", "warn"); return; }
    const old = matrix.items || [];
    const oldMap = new Map(old.map((item) => [matrixKey(item, dims), item]));
    const rows = [];
    const a = v1.length ? v1 : [""];
    const b = v2.length ? v2 : [""];
    a.forEach((x) => b.forEach((y) => {
      const attrs = { [dims[0].name]: x, [dims[1].name]: y };
      const key = `${x}||${y}`;
      const prev = oldMap.get(key);
      const meta1 = dims[0].valueMeta?.[x] || {};
      const meta2 = dims[1].valueMeta?.[y] || {};
      rows.push({
        attrs,
        price: prev?.price || meta2.price || meta1.price || "",
        stock: prev?.stock || meta2.stock || meta1.stock || "",
        imageUrl: prev?.imageUrl || meta1.imageUrl || meta2.imageUrl || "",
        imageNote: prev?.imageNote || meta1.imageNote || meta2.imageNote || "",
        rawName: prev?.rawName || [x,y].filter(Boolean).join(" / "),
        note: prev?.note || ((meta1.price || meta2.price || meta1.stock || meta2.stock) ? "规格值点选带入" : "")
      });
    }));
    matrix.items = rows;
    syncSkusFromMatrix();
    renderSkuMatrix();
    renderSkuPreview();
    setStatus(`已生成 ${rows.length} 条 SKU 组合。`, "ok");
  }

  function matrixKey(item, dims) {
    const attrs = item.attrs || {};
    return `${attrs[dims[0].name] || ""}||${attrs[dims[1].name] || ""}`;
  }

  function addManualSkuItem() {
    const matrix = ensureSkuMatrix();
    const dims = matrix.dimensions;
    matrix.items.push({ attrs: { [dims[0].name]: "", [dims[1].name]: "" }, price: "", stock: "", imageUrl: "", imageNote: "", rawName: "", note: "手动添加" });
    syncSkusFromMatrix();
    renderSkuMatrix();
  }

  function applySkuBatch(root) {
    const matrix = ensureSkuMatrix();
    const price = root.querySelector("[data-action='batch-price']")?.value || "";
    const stock = root.querySelector("[data-action='batch-stock']")?.value || "";
    const imageNote = root.querySelector("[data-action='batch-image']")?.value || "";
    const onlyEmpty = root.querySelector("[data-action='only-empty']")?.checked;
    const targets = matrix.items.filter((item) => item.checked);
    if (!targets.length) { setStatus("请先勾选要批量设置的 SKU 行。", "warn"); return; }
    targets.forEach((item) => {
      if (price && (!onlyEmpty || !item.price)) item.price = price;
      if (stock && (!onlyEmpty || !item.stock)) item.stock = stock;
      if (imageNote && (!onlyEmpty || !item.imageNote)) item.imageNote = imageNote;
    });
    syncSkusFromMatrix();
    renderSkuMatrix();
    renderSkuPreview();
    setStatus(`已批量设置 ${targets.length} 条 SKU。`, "ok");
  }

  function buildRawName(item, dims) {
    const attrs = item.attrs || {};
    return [attrs[dims[0].name], attrs[dims[1].name]].filter(Boolean).join(" / ");
  }

  function syncSkusFromMatrix() {
    const matrix = ensureSkuMatrix();
    const dims = matrix.dimensions;
    state.product.skus = (matrix.items || []).map((item) => ({
      name: item.rawName || buildRawName(item, dims),
      price: item.price || "",
      stock: item.stock || "",
      imageUrl: item.imageUrl || "",
      imageNote: item.imageNote || "",
      attrs: item.attrs || {},
      note: item.note || "SKU矩阵"
    })).filter((item) => item.name || item.price || item.stock);
  }

  function captureVisibleSkuToMatrix() {
    syncFromForm();
    const rows = extractStrictVisibleSkuRows();
    if (!rows.length) { setStatus("没有识别到当前可见 SKU 行。请把 SKU 行滚到屏幕内，或用手动表格录入。", "warn"); return; }
    appendRowsToMatrix(rows);
    renderSkuMatrix();
    renderSkuPreview();
    setStatus(`已追加 ${rows.length} 行到 SKU 矩阵。请核对规格、价格、库存。`, "ok");
  }

  function appendRowsToMatrix(rows) {
    const matrix = ensureSkuMatrix();
    inferDimensionsFromRows(rows, matrix);
    const dims = matrix.dimensions;
    const seen = new Set(matrix.items.map((item) => `${buildRawName(item, dims)}|${item.price}|${item.stock}`));
    rows.forEach((row) => {
      const attrs = attrsFromRawName(row.name, matrix);
      const raw = row.name;
      const key = `${raw}|${row.price || ""}|${row.stock || ""}`;
      if (seen.has(key)) return;
      seen.add(key);
      matrix.items.push({ attrs, price: row.price || "", stock: row.stock || "", imageUrl: row.imageUrl || "", imageNote: row.imageUrl ? "有SKU图" : "", rawName: raw, note: "当前可见SKU行识别" });
    });
    syncSkusFromMatrix();
  }

  function inferDimensionsFromRows(rows, matrix) {
    const dims = matrix.dimensions;
    if ((dims[0].values || []).length || (dims[1].values || []).length) return;
    const names = rows.map((r) => cleanText(r.name)).filter(Boolean);
    if (!names.length) return;
    const splitRows = names.map((name) => name.split(/[-/｜|]/).map(cleanText).filter(Boolean));
    const allTwo = splitRows.length >= 2 && splitRows.every((parts) => parts.length >= 2);
    if (allTwo) {
      dims[0].name = dims[0].name || "款式";
      dims[1].name = dims[1].name || "规格";
      dims[0].values = unique(splitRows.map((parts) => parts[0]));
      dims[1].values = unique(splitRows.map((parts) => parts.slice(1).join("-")));
    } else {
      dims[0].name = "规格";
      dims[1].name = "";
      dims[0].values = unique(names);
      dims[1].values = [];
    }
  }

  function attrsFromRawName(rawName, matrix) {
    const dims = matrix.dimensions;
    const attrs = { [dims[0].name]: "", [dims[1].name]: "" };
    const text = cleanText(rawName);
    dims.forEach((dim) => {
      const matched = (dim.values || []).find((value) => value && text.includes(value));
      attrs[dim.name] = matched || "";
    });
    if (!attrs[dims[0].name] && !attrs[dims[1].name]) {
      const parts = text.split(/[-/｜|]/).map(cleanText).filter(Boolean);
      attrs[dims[0].name] = parts[0] || text;
      attrs[dims[1].name] = parts.slice(1).join("-") || "";
      if (attrs[dims[0].name] && !dims[0].values.includes(attrs[dims[0].name])) dims[0].values.push(attrs[dims[0].name]);
      if (attrs[dims[1].name] && !dims[1].values.includes(attrs[dims[1].name])) dims[1].values.push(attrs[dims[1].name]);
    }
    return attrs;
  }

  function extractStrictVisibleSkuRows() {
    const bad = /平台活动|活动前价格|划线价格|未划线价格|内容声明|阿里巴巴中国站|全网销量|采购津贴|跨店券|红包|举报|仅供参考|登录|客服|收藏|分享|购物车|立即订购|加入进货单/;
    const nodes = Array.from(document.querySelectorAll("tr, li, div"));
    const rows = [];
    nodes.forEach((el) => {
      const rect = el.getBoundingClientRect?.();
      if (!rect || rect.width < 160 || rect.height < 18 || rect.height > 120 || rect.bottom < 0 || rect.top > window.innerHeight) return;
      const text = cleanSkuText(visibleText(el));
      if (!text || text.length < 6 || text.length > 180 || bad.test(text)) return;
      if (!/[¥￥]\s*\d|\d+(?:\.\d+)?\s*元/.test(text) || !/库存\s*\d/.test(text)) return;
      const parsed = parseStrictSkuRowText(text);
      if (!parsed || !parsed.name) return;
      parsed.imageUrl = findNearbyImage(el) || "";
      rows.push(parsed);
    });
    return uniqueBy(rows, (r) => `${r.name}|${r.price}|${r.stock}`).slice(0, 80);
  }

  function parseStrictSkuRowText(text) {
    const cleaned = cleanSkuText(text);
    const price = (cleaned.match(/[¥￥]\s*([0-9]+(?:\.[0-9]+)?)/) || cleaned.match(/([0-9]+(?:\.[0-9]+)?)\s*元/))?.[1] || "";
    const stock = (cleaned.match(/库存\s*([0-9,]+)/) || [])[1] || "";
    if (!price || !stock) return null;
    let name = cleaned;
    name = name.replace(/[¥￥]\s*[0-9]+(?:\.[0-9]+)?/g, " ");
    name = name.replace(/[0-9]+(?:\.[0-9]+)?\s*元/g, " ");
    name = name.replace(/库存\s*[0-9,]+\s*(?:个|件|只|套)?/g, " ");
    name = name.replace(/[＋+－−-]\s*0\s*[＋+]?/g, " ");
    name = name.replace(/^(规格|颜色|尺码|尺寸|款式)\s*/g, "");
    name = name.replace(/\s*个\s*$/g, "");
    name = cleanSkuText(name);
    if (!name || name.length < 2 || name.length > 60) return null;
    return { name, price, stock };
  }

  function findSkuBlocks() {
    const selectors = [
      "table", "[class*='sku']", "[class*='Sku']", "[class*='spec']", "[class*='Spec']", "[class*='prop']", "[class*='Prop']", "[class*='offer']", "[class*='price']"
    ];
    const candidates = [];
    selectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        const text = visibleText(el);
        if (!text || text.length < 6 || text.length > 5000) return;
        let score = 0;
        if (/商品规格|规格|颜色|尺寸|尺码|价格|库存|可售|起批|采购量|¥|￥/.test(text)) score += 20;
        if (/sku|spec|prop|price|offer/i.test(el.className || "")) score += 12;
        const rect = el.getBoundingClientRect();
        if (rect.width > 160 && rect.height > 30) score += 4;
        if (score >= 18) candidates.push({ el, score, text });
      });
    });
    return uniqueBy(candidates.sort((a,b)=>b.score-a.score), c => c.el).slice(0, 8).map(c => c.el);
  }

  function parseRowsFromBlock(block) {
    const rows = [];
    const rowEls = block.matches("tr,li") ? [block] : Array.from(block.querySelectorAll("tr, li, [class*='row'], [class*='Row'], [class*='item'], [class*='Item']"));
    const sourceEls = rowEls.length ? rowEls : [block];
    sourceEls.forEach((el) => {
      const text = cleanSkuText(visibleText(el));
      if (!text || !isSkuLike(text)) return;
      if (text.length > 180) {
        splitLongSkuText(text).forEach((line) => pushSkuLine(rows, line, el));
      } else {
        pushSkuLine(rows, text, el);
      }
    });
    if (!rows.length) {
      splitLongSkuText(cleanSkuText(visibleText(block))).forEach((line) => pushSkuLine(rows, line, block));
    }
    return rows;
  }

  function pushSkuLine(rows, line, el) {
    const cleaned = cleanSkuText(line);
    if (!cleaned || cleaned.length < 2 || /商品规格|选择|请选择|采购量|加入进货单|立即订购|客服|收藏|分享|登录|购物车/.test(cleaned)) return;
    const price = (cleaned.match(/(?:￥|¥)\s*([0-9]+(?:\.[0-9]+)?)/) || cleaned.match(/([0-9]+(?:\.[0-9]+)?)\s*元/))?.[1] || "";
    const stock = (cleaned.match(/库存\s*[:：]?\s*([0-9,]+)/) || cleaned.match(/([0-9,]+)\s*(?:个|件|套|只)\s*(?:可售|库存)?/))?.[1] || "";
    const name = cleanSkuText(cleaned.replace(/(?:￥|¥)\s*[0-9]+(?:\.[0-9]+)?/g, "").replace(/[0-9]+(?:\.[0-9]+)?\s*元/g, "").replace(/库存\s*[:：]?\s*[0-9,]+/g, ""));
    if (!name || name.length < 2) return;
    const img = findNearbyImage(el);
    rows.push({ name, price, stock, imageUrl: img || "", note: "插件1688可见SKU采集，需核对" });
  }

  function isSkuLike(text) {
    return /商品规格|规格|颜色|尺寸|尺码|价格|库存|可售|起批|¥|￥|cm|CM|xs|xl|XXS|XS|XL|S码|M码|L码|小型|中型|大型/.test(text) && !/评价|详情|猜你喜欢|推荐|广告/.test(text);
  }

  function cleanSkuText(text) {
    return cleanText(text).replace(/\s*\/\s*/g, " / ").replace(/\s+/g, " ");
  }

  function splitLongSkuText(text) {
    const raw = String(text || "").replace(/商品规格/g, "\n").replace(/库存/g, " 库存").trim();
    const first = raw.split(/\n|\r|;|；/).map(cleanSkuText).filter(Boolean);
    if (first.length > 1) return first;
    // 只做轻度切分：遇到常见尺码/括号结束后的下一段颜色文字，切成候选。不是强拆字段。
    const marked = raw
      .replace(/(】)\s*(?=[\u4e00-\u9fa5a-zA-Z]{2,12}(?:黄|蓝|粉|灰|黑|白|绿|红|紫|色|XS|XL|xxs|xs|xl))/g, "$1\n")
      .replace(/(推荐(?:幼小犬|小型犬|中&?大型犬|中型犬|大型犬)[^\s】]*)\s+(?=[\u4e00-\u9fa5a-zA-Z]{2,12}(?:黄|蓝|粉|灰|黑|白|绿|红|紫|色|XS|XL|xxs|xs|xl))/g, "$1\n");
    return marked.split(/\n/).map(cleanSkuText).filter((x) => x.length >= 2).slice(0, 120);
  }

  function findNearbyImage(el) {
    const img = el.querySelector?.("img") || el.closest?.("li, tr, div")?.querySelector?.("img");
    if (!img) return "";
    return normalizeUrl(img.currentSrc || img.src || img.getAttribute("data-src") || img.getAttribute("data-lazy-src") || "");
  }

  function parseSkuFromTextarea() {
    syncFromForm();
    state.product.skus = parseSkuLines(state.product.skuText);
    renderSkuPreview();
    setStatus(`已整理出 ${state.product.skus.length} 行原始SKU候选。不要当自动拆分结果，导出前核对。`, "ok");
  }

  function parseSkuLines(text) {
    const lines = splitLongSkuText(String(text || ""))
      .map(cleanSkuText)
      .filter((line) => line.length >= 2)
      .filter((line) => !/收藏|客服|分享|登录|购物车|立即订购|加入进货单|请选择|选择规格/.test(line));
    const result = [];
    const seen = new Set();
    lines.forEach((line) => {
      const price = (line.match(/(?:￥|¥)\s*([0-9]+(?:\.[0-9]+)?)/) || line.match(/([0-9]+(?:\.[0-9]+)?)\s*元/))?.[1] || "";
      const stock = (line.match(/库存\s*[:：]?\s*([0-9,]+)/) || line.match(/([0-9,]+)\s*(?:个|件|套|只)\s*(?:可售|库存)?/))?.[1] || "";
      const name = cleanSkuText(line.replace(/(?:￥|¥)\s*[0-9]+(?:\.[0-9]+)?/g, "").replace(/[0-9]+(?:\.[0-9]+)?\s*元/g, "").replace(/库存\s*[:：]?\s*[0-9,]+/g, ""));
      const key = `${name}|${price}|${stock}`;
      if (!name || seen.has(key)) return;
      seen.add(key);
      result.push({ name, price, stock, note: "原始SKU文本整理，需核对" });
    });
    return result.slice(0, 120);
  }

  function renderSkuPreview() {
    const box = document.getElementById("cca-sku-preview");
    if (!box) return;
    const skus = state.product.skus || [];
    if (!skus.length) { box.style.display = "none"; box.textContent = ""; return; }
    box.style.display = "block";
    box.textContent = skus.map((sku, index) => `${index + 1}. ${sku.name}${sku.price ? ` / ¥${sku.price}` : ""}${sku.stock ? ` / 库存${sku.stock}` : ""}${sku.imageUrl ? " / 有SKU图" : ""}`).join("\n");
  }

  function scanImageCandidates() {
    const list = [];
    const push = (item) => {
      const url = normalizeUrl(item.url || "");
      if (!url || !/^https?:\/\//i.test(url)) return;
      if (isBadImageUrl(url)) return;
      const width = Math.round(item.width || 0);
      const height = Math.round(item.height || 0);
      if (width < 60 || height < 60) return;
      list.push({
        id: `cand_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
        url, width, height, type: item.type || "other", note: item.note || "", source: item.source || "scan", checked: false, score: item.score || 0
      });
    };

    document.querySelectorAll("img").forEach((img) => {
      const rect = img.getBoundingClientRect();
      const url = img.currentSrc || img.src || img.getAttribute("data-src") || img.getAttribute("data-lazy-src") || img.getAttribute("data-original") || "";
      push({ url, width: img.naturalWidth || rect.width, height: img.naturalHeight || rect.height, type: guessImageType(img, rect), note: img.alt || img.title || "", source: "img-scan", score: scoreImage(img, rect) });
    });

    document.querySelectorAll("[style]").forEach((el) => {
      const bg = getComputedStyle(el).backgroundImage || "";
      const matches = bg.matchAll(/url\(["']?([^"')]+)["']?\)/g);
      for (const m of matches) {
        const rect = el.getBoundingClientRect();
        push({ url: m[1], width: rect.width, height: rect.height, type: guessImageType(el, rect), note: "背景图", source: "bg-scan", score: scoreImage(el, rect) - 5 });
      }
    });

    const uniqueItems = uniqueBy(list, (i) => i.url).sort((a,b)=>b.score-a.score).slice(0, 80);
    state.candidates = uniqueItems;
    renderCandidates();
    setStatus(`已扫描到 ${state.candidates.length} 张图片候选。先批量勾选，再统一分类加入。`, state.candidates.length ? "ok" : "warn");
  }

  function isBadImageUrl(url) {
    return /sprite|icon|logo|avatar|default|placeholder|blank|loading|grey\.gif|\.svg/i.test(url);
  }

  function scoreImage(el, rect) {
    let score = 0;
    const w = Math.round(el.naturalWidth || rect.width || 0);
    const h = Math.round(el.naturalHeight || rect.height || 0);
    score += Math.min(40, Math.max(0, (w * h) / 15000));
    if (w >= 300 && h >= 300) score += 18;
    if (rect.top >= -100 && rect.top < window.innerHeight * 1.2) score += 12;
    const text = `${el.className || ""} ${el.alt || ""} ${el.title || ""}`;
    if (/sku|spec|颜色|规格/i.test(text)) score += 12;
    if (/detail|desc|详情/i.test(text)) score += 8;
    if (/icon|logo|avatar|店铺|客服/i.test(text)) score -= 24;
    return score;
  }

  function guessImageType(el, rect) {
    const text = `${el.className || ""} ${el.alt || ""} ${el.title || ""}`;
    if (/sku|spec|颜色|规格/i.test(text)) return "sku";
    if (/detail|desc|详情/i.test(text)) return "detail";
    if (/review|评价|买家秀/i.test(text)) return "review";
    if (rect.left < window.innerWidth * 0.45 && rect.top < window.innerHeight * 0.75 && rect.width >= 150 && rect.height >= 150) return "main";
    return "other";
  }

  function renderCandidates() {
    const grid = document.getElementById("cca-candidate-grid");
    const count = document.getElementById("cca-candidate-count");
    if (count) count.textContent = state.candidates.length ? `(${state.candidates.length})` : "";
    if (!grid) return;
    if (!state.candidates.length) {
      grid.innerHTML = `<div class="cca-muted">先点“扫描全页图片候选”。这版用候选池批量选图，不再一张张点。</div>`;
      return;
    }
    grid.innerHTML = "";
    state.candidates.forEach((item, index) => {
      const card = document.createElement("label");
      card.className = `cca-candidate ${item.checked ? "selected" : ""}`;
      card.innerHTML = `
        <input type="checkbox" ${item.checked ? "checked" : ""} />
        <img src="${escapeAttr(item.url)}" alt="候选图" loading="lazy" />
        <div class="meta">#${index + 1} · ${typeLabel(item.type)}<br>${item.width || "?"}×${item.height || "?"}</div>
      `;
      card.querySelector("input")?.addEventListener("change", (e) => { item.checked = e.target.checked; renderCandidates(); });
      grid.appendChild(card);
    });
  }

  function addSelectedCandidates() {
    const type = document.getElementById("cca-batch-type")?.value || "main";
    addSelectedCandidatesAs(type);
  }

  function addSelectedCandidatesAs(type = "main") {
    const selected = state.candidates.filter((c) => c.checked);
    selected.forEach((c) => addImage({ ...c, type, source: c.source || "candidate" }));
    state.candidates = state.candidates.filter((c) => !c.checked);
    renderCandidates();
    renderImages();
    setStatus(`已加入 ${selected.length} 张${typeLabel(type)}。`, selected.length ? "ok" : "warn");
  }

  function addImage(image) {
    if (!image.url && !image.dataUrl) return;
    const key = image.dataUrl ? image.dataUrl.slice(0, 80) : image.url;
    if (state.images.some((item) => (item.dataUrl ? item.dataUrl.slice(0, 80) : item.url) === key)) return;
    state.images.push({
      id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: image.type || "other",
      url: image.url || "",
      dataUrl: image.dataUrl || "",
      width: Math.round(image.width || 0),
      height: Math.round(image.height || 0),
      note: image.note || "",
      source: image.source || "manual"
    });
  }

  function renderImages() {
    const list = document.getElementById("cca-image-list");
    if (!list) return;
    if (!state.images.length) { list.innerHTML = `<div class="cca-muted">还没有选择图片。先在候选池批量加入，或用框选截图兜底。</div>`; return; }
    list.innerHTML = "";
    state.images.forEach((image, index) => {
      const card = document.createElement("div");
      card.className = "cca-image-card";
      const preview = image.dataUrl || image.url;
      card.innerHTML = `
        <img src="${escapeAttr(preview)}" alt="已选图片" />
        <div class="cca-img-info">
          <div class="cca-img-line"><strong>#${index + 1}</strong>
            <select data-action="type">${imageTypes.map(([value, label]) => `<option value="${value}" ${image.type === value ? "selected" : ""}>${label}</option>`).join("")}</select>
            <button type="button" class="cca-btn cca-danger" data-action="remove">删除</button>
          </div>
          <div>${image.width || "?"}×${image.height || "?"} · ${escapeHtml(image.source || "manual")}</div>
          <div class="url" title="${escapeAttr(image.url || image.note || "截图")}">${escapeHtml(image.url || image.note || "区域截图")}</div>
          <input data-action="note" value="${escapeAttr(image.note || "")}" placeholder="图片备注" style="width:100%;box-sizing:border-box;border:1px solid #d1d5db;border-radius:8px;padding:5px 6px;font-size:11px;" />
        </div>`;
      card.querySelector("[data-action='type']")?.addEventListener("change", (e) => { image.type = e.target.value; });
      card.querySelector("[data-action='remove']")?.addEventListener("click", () => { state.images.splice(index, 1); renderImages(); });
      card.querySelector("[data-action='note']")?.addEventListener("input", (e) => { image.note = e.target.value; });
      list.appendChild(card);
    });
  }

  function startRegionScreenshot() {
    stopPicking(false);
    const overlay = document.getElementById(SELECTOR_ID);
    if (!overlay) return;
    const type = "detail";
    setStatus("正在框选截图：面板已隐藏，拖拽区域；Esc取消。", "warn");
    hidePanelForCapture();
    overlay.style.display = "block";
    const tip = document.createElement("div");
    tip.className = "cca-capture-tip";
    tip.textContent = "拖拽框选截图区域 · Esc 取消";
    document.documentElement.appendChild(tip);
    let start = null;
    let box = null;
    const onDown = (event) => {
      event.preventDefault();
      start = { x: event.clientX, y: event.clientY };
      box = document.createElement("div");
      box.className = "cca-selection-box";
      document.documentElement.appendChild(box);
    };
    const onMove = (event) => {
      if (!start || !box) return;
      const left = Math.min(start.x, event.clientX);
      const top = Math.min(start.y, event.clientY);
      const width = Math.abs(event.clientX - start.x);
      const height = Math.abs(event.clientY - start.y);
      Object.assign(box.style, { left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px` });
    };
    const cleanup = () => {
      overlay.style.display = "none";
      overlay.removeEventListener("mousedown", onDown, true);
      overlay.removeEventListener("mousemove", onMove, true);
      overlay.removeEventListener("mouseup", onUp, true);
      document.removeEventListener("keydown", onKey, true);
      box?.remove(); tip.remove(); start = null; box = null; restorePanelAfterCapture();
    };
    const onUp = async (event) => {
      if (!start || !box) return;
      const rect = { x: Math.min(start.x, event.clientX), y: Math.min(start.y, event.clientY), width: Math.abs(event.clientX - start.x), height: Math.abs(event.clientY - start.y) };
      cleanup();
      if (rect.width < 20 || rect.height < 20) { setStatus("框选区域太小，已取消。", "warn"); return; }
      try {
        const shot = await captureAndCrop(rect);
        addImage({ dataUrl: shot.dataUrl, width: shot.width, height: shot.height, type, source: "region-screenshot", note: "区域截图" });
        renderImages();
        setStatus(`已添加 1 张截图。可在已选图片里改分类。`, "ok");
      } catch (error) { setStatus(`截图失败：${error.message || error}`, "warn"); }
    };
    const onKey = (event) => { if (event.key === "Escape") { cleanup(); setStatus("已取消截图。", ""); } };
    overlay.addEventListener("mousedown", onDown, true);
    overlay.addEventListener("mousemove", onMove, true);
    overlay.addEventListener("mouseup", onUp, true);
    document.addEventListener("keydown", onKey, true);
  }

  async function captureAndCrop(rect) {
    await new Promise((resolve) => setTimeout(resolve, 60));
    const response = await chrome.runtime.sendMessage({ type: "CCA_CAPTURE_VISIBLE_TAB" });
    if (!response || !response.ok) throw new Error(response?.error || "无法截取当前页面");
    const img = await loadImage(response.dataUrl);
    const scaleX = img.naturalWidth / window.innerWidth;
    const scaleY = img.naturalHeight / window.innerHeight;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(rect.width * scaleX));
    canvas.height = Math.max(1, Math.round(rect.height * scaleY));
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, Math.round(rect.x * scaleX), Math.round(rect.y * scaleY), canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
    return { dataUrl: canvas.toDataURL("image/png"), width: canvas.width, height: canvas.height };
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("图片载入失败"));
      img.src = src;
    });
  }

  function normalizeUrl(url) {
    if (!url) return "";
    let clean = String(url).trim();
    if (!clean || clean === "none") return "";
    if (clean.startsWith("//")) clean = `${location.protocol}${clean}`;
    if (clean.startsWith("/")) clean = `${location.origin}${clean}`;
    try { clean = new URL(clean, location.href).href; } catch (_e) {}
    return clean.replace(/_(?:\d+x\d+|\d+x\d+q\d+|\d+x\d+\.jpg).*$/i, "");
  }

  function buildProduct() {
    syncFromForm();
    ensureSkuMatrix();
    syncSkusFromMatrix();
    if (!state.product.skus.length && state.product.skuText) state.product.skus = parseSkuLines(state.product.skuText);
    return {
      ...state.product,
      skuMatrix: state.product.skuMatrix,
      capturedAt: new Date().toISOString(),
      extensionVersion: EXT_VERSION,
      imageCount: state.images.length,
      images: state.images.map((image, index) => ({ index: index + 1, type: image.type, url: image.url || "", note: image.note || "", source: image.source || "", width: image.width || 0, height: image.height || 0 })),
      failedImages: state.failedImages
    };
  }

  async function copyJson() {
    const product = buildProduct();
    await navigator.clipboard.writeText(JSON.stringify(product, null, 2));
    setStatus("已复制 product.json 内容。", "ok");
  }

  async function exportZip() {
    try {
      setStatus("正在导出 ZIP：下载图片和截图中……", "warn");
      const product = buildProduct();
      const files = [];
      const imageMeta = [];
      const counters = { main: 0, sku: 0, detail: 0, review: 0, other: 0 };
      state.failedImages = [];
      for (const image of state.images) {
        const type = image.type || "other";
        counters[type] = (counters[type] || 0) + 1;
        const ext = image.dataUrl ? mimeToExt(dataUrlMime(image.dataUrl)) : urlExt(image.url);
        const path = `images/${type}/${String(counters[type]).padStart(2, "0")}.${ext}`;
        try {
          let bytes; let mimeType = "";
          if (image.dataUrl) { const parsed = dataUrlToBytes(image.dataUrl); bytes = parsed.bytes; mimeType = parsed.mimeType; }
          else { const fetched = await fetchImageBytes(image.url); bytes = fetched.bytes; mimeType = fetched.mimeType; }
          files.push({ path, data: bytes });
          imageMeta.push({ path, type, originalUrl: image.url || "", note: image.note || "", source: image.source || "", width: image.width || 0, height: image.height || 0, mimeType });
        } catch (error) {
          state.failedImages.push({ url: image.url || image.note || "region-screenshot", type, error: error.message || String(error) });
        }
      }
      product.images = imageMeta;
      product.failedImages = state.failedImages;
      files.unshift({ path: "product.json", data: utf8Bytes(JSON.stringify(product, null, 2)) });
      files.push({ path: "import-note.txt", data: utf8Bytes(`商品采集助手 V${EXT_VERSION}\n定位：SKU矩阵拆分与长规格修正版。点选规格值区域时优先按子规格项拆分，避免多个规格合成一个；长规格值会保留，价格、库存和SKU图备注可继续手动修正。\n导入位置：电商选品工具箱 V1.7.6 → 商品收集 → 插件商品包导入。\n`) });
      const zip = buildStoredZip(files);
      const name = safeFileName(product.title || product.productId || "商品") + `-插件商品包-${dateStamp()}.zip`;
      saveBlob(zip, name);
      setStatus(`已导出 ZIP。图片成功 ${imageMeta.length} 张，失败 ${state.failedImages.length} 张。`, "ok");
    } catch (error) { setStatus(`导出失败：${error.message || error}`, "warn"); }
  }

  async function fetchImageBytes(url) {
    const response = await chrome.runtime.sendMessage({ type: "CCA_FETCH_IMAGE", url });
    if (!response || !response.ok) throw new Error(response?.error || "图片下载失败");
    return { bytes: base64ToBytes(response.base64), mimeType: response.mimeType || "" };
  }

  function dataUrlMime(dataUrl) { return (String(dataUrl).match(/^data:([^;]+);base64,/) || [])[1] || "image/png"; }
  function dataUrlToBytes(dataUrl) {
    const m = String(dataUrl).match(/^data:([^;]+);base64,(.*)$/);
    if (!m) throw new Error("截图数据无效");
    return { mimeType: m[1], bytes: base64ToBytes(m[2]) };
  }
  function base64ToBytes(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  function utf8Bytes(text) { return new TextEncoder().encode(text); }
  function mimeToExt(mime) { if (/png/i.test(mime)) return "png"; if (/webp/i.test(mime)) return "webp"; if (/gif/i.test(mime)) return "gif"; return "jpg"; }
  function urlExt(url) {
    const clean = String(url || "").split(/[?#]/)[0];
    const m = clean.match(/\.([a-z0-9]{2,5})$/i);
    const ext = m ? m[1].toLowerCase() : "jpg";
    if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) return ext === "jpeg" ? "jpg" : ext;
    return "jpg";
  }
  function saveBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  function dateStamp() { const d = new Date(); const pad = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`; }
  function safeFileName(name) { return String(name || "商品").replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, " ").trim().slice(0, 60) || "商品"; }
  function escapeHtml(text) { return String(text || "").replace(/[&<>"]/g, (m) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;" }[m])); }
  function escapeAttr(text) { return escapeHtml(text).replace(/'/g, "&#39;"); }
  function unique(arr) { return Array.from(new Set(arr.filter(Boolean))); }
  function uniqueBy(arr, keyFn) { const seen = new Set(); return arr.filter((item) => { const key = keyFn(item); if (!key || seen.has(key)) return false; seen.add(key); return true; }); }
  function typeLabel(type) { return imageTypes.find(([value]) => value === type)?.[1] || "图片"; }

  const crcTable = (() => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i += 1) { let c = i; for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[i] = c >>> 0; }
    return table;
  })();
  function crc32(bytes) { let crc = 0xffffffff; for (let i = 0; i < bytes.length; i += 1) crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8); return (crc ^ 0xffffffff) >>> 0; }
  function dosDateTime(date = new Date()) { const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2); const d = ((date.getFullYear() - 1980) << 9) | ((date.getMonth()+1) << 5) | date.getDate(); return { time, date: d }; }
  function u16(n) { const b = new Uint8Array(2); new DataView(b.buffer).setUint16(0, n, true); return b; }
  function u32(n) { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n >>> 0, true); return b; }
  function concatBytes(parts) { const total = parts.reduce((sum, part) => sum + part.length, 0); const out = new Uint8Array(total); let offset = 0; parts.forEach((part) => { out.set(part, offset); offset += part.length; }); return out; }
  function buildStoredZip(files) {
    const localParts = []; const centralParts = []; let offset = 0; const now = dosDateTime();
    files.forEach((file) => {
      const nameBytes = utf8Bytes(file.path); const data = file.data instanceof Uint8Array ? file.data : utf8Bytes(String(file.data || "")); const crc = crc32(data);
      const localHeader = concatBytes([u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(now.time), u16(now.date), u32(crc), u32(data.length), u32(data.length), u16(nameBytes.length), u16(0), nameBytes]);
      localParts.push(localHeader, data);
      const centralHeader = concatBytes([u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(now.time), u16(now.date), u32(crc), u32(data.length), u32(data.length), u16(nameBytes.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), nameBytes]);
      centralParts.push(centralHeader); offset += localHeader.length + data.length;
    });
    const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
    const eocd = concatBytes([u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(centralSize), u32(offset), u16(0)]);
    return new Blob([...localParts, ...centralParts, eocd], { type: "application/zip" });
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message && message.type === "CCA_OPEN_PANEL") openPanel();
  });

  createUI();
  setTimeout(autoFill, 1000);
})();
