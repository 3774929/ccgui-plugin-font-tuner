// font-tuner：自定义窗口与内容字体，并对字体渲染做配置化调整。
// Tier-1 单文件 ESM：无 import、无 JSX，组件全部用 ctx.react.createElement 构建。
export default function activate(ctx) {
  const { createElement: h, useState, useEffect, useCallback, useRef } = ctx.react;

  const STORAGE_KEY = "font-tuner-config";

  const DEFAULTS = {
    uiFont: "",          // 窗口界面字体（留空 = 跟随宿主）
    contentFont: "",     // 对话内容字体
    codeFont: "",        // 代码/等宽字体
    contentSize: 0,      // 内容字号 px（0 = 跟随宿主）
    lineHeight: 0,       // 内容行高（0 = 跟随宿主）
    letterSpacing: 0,    // 内容字距 em（0 = 跟随宿主）
    smoothing: "auto",   // auto | antialiased | none
    textRendering: "auto", // auto | optimizeLegibility | optimizeSpeed | geometricPrecision
    enabled: true,
  };

  // ---------- CSS 生成 ----------

  // 过滤掉可能破坏 CSS 结构的字符，防止注入越界样式
  function sanitizeFontStack(v) {
    return String(v || "").replace(/[;{}/*@\\`]/g, "").trim();
  }

  function num(v, min, max) {
    const n = Number(v);
    if (!Number.isFinite(n)) return 0;
    return Math.min(max, Math.max(min, n));
  }

  // 内容区域选择器：覆盖常见的会话/markdown 容器与输入框；不命中时自然无效，无副作用
  const CONTENT_SELECTOR = [
    ".prose",
    '[class*="markdown"]',
    '[class*="message"]',
    "main article",
    ".composer-editable",
  ].join(", ");

  const CODE_SELECTOR = 'pre, code, kbd, samp, [class*="code-"]';

  function buildCss(cfg) {
    if (!cfg.enabled) return "";
    const blocks = [];
    const ui = sanitizeFontStack(cfg.uiFont);
    const content = sanitizeFontStack(cfg.contentFont);
    const code = sanitizeFontStack(cfg.codeFont);

    const rootProps = [];
    if (cfg.smoothing === "antialiased") {
      rootProps.push("-webkit-font-smoothing: antialiased", "-moz-osx-font-smoothing: grayscale");
    } else if (cfg.smoothing === "none") {
      rootProps.push("-webkit-font-smoothing: none", "-moz-osx-font-smoothing: auto");
    }
    if (cfg.textRendering !== "auto") rootProps.push(`text-rendering: ${cfg.textRendering}`);
    if (rootProps.length) blocks.push(`:root { ${rootProps.join("; ")}; }`);

    if (ui) blocks.push(`body { font-family: ${ui} !important; }`);

    const contentProps = [];
    if (content) contentProps.push(`font-family: ${content} !important`);
    const size = num(cfg.contentSize, 0, 48);
    if (size > 0) contentProps.push(`font-size: ${size}px !important`);
    const lh = num(cfg.lineHeight, 0, 4);
    if (lh > 0) contentProps.push(`line-height: ${lh} !important`);
    const ls = num(cfg.letterSpacing, -0.2, 1);
    if (ls !== 0) contentProps.push(`letter-spacing: ${ls}em !important`);
    if (contentProps.length) blocks.push(`${CONTENT_SELECTOR} { ${contentProps.join("; ")}; }`);

    if (code) blocks.push(`${CODE_SELECTOR} { font-family: ${code} !important; }`);

    return blocks.join("\n");
  }

  // ---------- 样式注入（可在运行时更新） ----------

  let cssDisposer = null;
  function applyCss(cfg) {
    if (cssDisposer) {
      try { cssDisposer(); } catch { /* 已释放 */ }
      cssDisposer = null;
    }
    const css = buildCss(cfg);
    if (css) cssDisposer = ctx.theme.injectCss(css);
  }

  // ---------- 设置页 ----------

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "6px 8px",
    border: "1px solid var(--color-separator-border, rgba(127,127,127,.3))",
    borderRadius: 6,
    background: "var(--color-background-primary-default, transparent)",
    color: "var(--color-text-primary, inherit)",
    font: "inherit",
  };

  const rowStyle = { display: "flex", flexDirection: "column", gap: 4 };
  const labelStyle = { fontSize: 12, color: "var(--color-text-secondary, inherit)", fontWeight: 600 };
  const hintStyle = { fontSize: 11, color: "var(--color-text-tertiary, inherit)" };

  function Field({ label, hint, children }) {
    return h("div", { style: rowStyle },
      h("label", { style: labelStyle }, label),
      children,
      hint ? h("span", { style: hintStyle }, hint) : null);
  }

  function FontTunerSettings() {
    const [cfg, setCfg] = useState(DEFAULTS);
    const [loaded, setLoaded] = useState(false);
    const loadedRef = useRef(false);

    useEffect(() => {
      let alive = true;
      ctx.storage.get(STORAGE_KEY).then((saved) => {
        if (!alive) return;
        if (saved && typeof saved === "object") setCfg({ ...DEFAULTS, ...saved });
        setLoaded(true);
        loadedRef.current = true;
      }).catch(() => { if (alive) { setLoaded(true); loadedRef.current = true; } });
      return () => { alive = false; };
    }, []);

    // 配置变化 → 持久化 + 重新注入样式（首帧未加载完成时不写入，避免覆盖已存配置）
    useEffect(() => {
      if (!loadedRef.current) return;
      applyCss(cfg);
      ctx.storage.set(STORAGE_KEY, cfg).catch(() => { /* 存储失败不阻断 UI */ });
    }, [cfg]);

    const set = useCallback((patch) => setCfg((prev) => ({ ...prev, ...patch })), []);

    const previewCss = {
      fontFamily: sanitizeFontStack(cfg.contentFont) || undefined,
      fontSize: num(cfg.contentSize, 0, 48) > 0 ? `${num(cfg.contentSize, 0, 48)}px` : undefined,
      lineHeight: num(cfg.lineHeight, 0, 4) > 0 ? num(cfg.lineHeight, 0, 4) : undefined,
      letterSpacing: num(cfg.letterSpacing, -0.2, 1) !== 0 ? `${num(cfg.letterSpacing, -0.2, 1)}em` : undefined,
      WebkitFontSmoothing: cfg.smoothing === "auto" ? undefined : cfg.smoothing,
      textRendering: cfg.textRendering === "auto" ? undefined : cfg.textRendering,
    };

    return h("div", { style: { padding: 16, maxWidth: 640, display: "flex", flexDirection: "column", gap: 14, color: "var(--color-text-primary, inherit)" } },
      h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" } },
        h("h2", { style: { margin: 0, fontSize: 16 } }, "字体调校"),
        h("label", { style: { display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" } },
          h("input", { type: "checkbox", checked: cfg.enabled, onChange: (e) => set({ enabled: e.target.checked }) }),
          "启用")),

      h(Field, { label: "窗口字体", hint: "整个应用界面的 font-family，留空跟随宿主。示例：Inter, \"Microsoft YaHei\", sans-serif" },
        h("input", { style: inputStyle, value: cfg.uiFont, placeholder: "留空 = 跟随宿主", onChange: (e) => set({ uiFont: e.target.value }) })),

      h(Field, { label: "内容字体", hint: "对话/Markdown 区域的 font-family，留空跟随宿主。" },
        h("input", { style: inputStyle, value: cfg.contentFont, placeholder: "留空 = 跟随宿主", onChange: (e) => set({ contentFont: e.target.value }) })),

      h(Field, { label: "代码字体", hint: "pre/code 等宽区域的 font-family，留空跟随宿主。" },
        h("input", { style: inputStyle, value: cfg.codeFont, placeholder: "留空 = 跟随宿主", onChange: (e) => set({ codeFont: e.target.value }) })),

      h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 } },
        h(Field, { label: `内容字号：${num(cfg.contentSize, 0, 48) > 0 ? cfg.contentSize + "px" : "跟随宿主"}` },
          h("input", { type: "range", min: 0, max: 28, step: 1, value: num(cfg.contentSize, 0, 48), onChange: (e) => set({ contentSize: Number(e.target.value) }) })),
        h(Field, { label: `行高：${num(cfg.lineHeight, 0, 4) > 0 ? cfg.lineHeight : "跟随宿主"}` },
          h("input", { type: "range", min: 0, max: 2.6, step: 0.05, value: num(cfg.lineHeight, 0, 4), onChange: (e) => set({ lineHeight: Number(e.target.value) }) })),
        h(Field, { label: `字距：${num(cfg.letterSpacing, -0.2, 1) !== 0 ? cfg.letterSpacing + "em" : "跟随宿主"}` },
          h("input", { type: "range", min: -0.05, max: 0.3, step: 0.005, value: num(cfg.letterSpacing, -0.2, 1), onChange: (e) => set({ letterSpacing: Number(e.target.value) }) }))),

      h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
        h(Field, { label: "字体平滑", hint: "antialiased 更纤细，none 关闭平滑" },
          h("select", { style: inputStyle, value: cfg.smoothing, onChange: (e) => set({ smoothing: e.target.value }) },
            h("option", { value: "auto" }, "跟随宿主"),
            h("option", { value: "antialiased" }, "antialiased（平滑）"),
            h("option", { value: "none" }, "none（关闭）"))),
        h(Field, { label: "文本渲染", hint: "optimizeLegibility 提升连字/字距质量" },
          h("select", { style: inputStyle, value: cfg.textRendering, onChange: (e) => set({ textRendering: e.target.value }) },
            h("option", { value: "auto" }, "跟随宿主"),
            h("option", { value: "optimizeLegibility" }, "optimizeLegibility"),
            h("option", { value: "optimizeSpeed" }, "optimizeSpeed"),
            h("option", { value: "geometricPrecision" }, "geometricPrecision")))),

      h("div", { style: { border: "1px solid var(--color-separator-border, rgba(127,127,127,.3))", borderRadius: 8, padding: 12 } },
        h("div", { style: { ...labelStyle, marginBottom: 6 } }, "实时预览"),
        h("p", { style: { ...previewCss, margin: 0 } },
          "敏捷的棕色狐狸跳过懒狗。The quick brown fox jumps over the lazy dog. 0123456789")),

      h("div", null,
        h("button", {
          style: { padding: "6px 14px", borderRadius: 6, border: "1px solid var(--color-separator-border, rgba(127,127,127,.3))", background: "transparent", color: "var(--color-text-secondary, inherit)", cursor: "pointer", font: "inherit" },
          onClick: () => setCfg({ ...DEFAULTS }),
        }, "恢复默认")),

      loaded ? null : h("span", { style: hintStyle }, "正在加载已保存的配置…"));
  }

  // ---------- 启动：恢复配置并注入 ----------

  let alive = true;
  ctx.storage.get(STORAGE_KEY).then((saved) => {
    if (!alive) return;
    if (saved && typeof saved === "object") applyCss({ ...DEFAULTS, ...saved });
  }).catch(() => { /* 首次使用无存档，忽略 */ });

  ctx.ui.registerSettingsSection({ label: () => "字体调校", component: FontTunerSettings });

  return () => {
    alive = false;
    if (cssDisposer) { try { cssDisposer(); } catch { /* 已释放 */ } cssDisposer = null; }
  };
}
