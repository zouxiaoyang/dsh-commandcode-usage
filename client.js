/**
 * usage-panel 客户端半：在 codex-ui 侧边栏底部注入"⚡ 用量"按钮，
 * 点击弹出 CommandCode 用量面板（精致版 UI）。
 *
 * 主题自适应：复用 codex-ui 的 body[data-ds-dark-theme] 机制 —— 面板自带
 * 主题变量，浅色/深色自动切换。
 *
 * 数据获取：ctx.connection.rpc.call("/dsh-usage", "report", {})
 */
window.__ModuleLoader__.load({
  id: "dsh-commandcode-usage",
  factory: function (require) {
    var module = { exports: {} };
    var exports = module.exports;

    var POLL_MS = 5 * 60 * 1000;   // 数据缓存 5 分钟
    var PANEL_CLS = "dsh-usage-panel";
    var BTN_CLS = "dsh-usage-btn";

    // ---------- 注入主题样式（精致版） ----------
    var STYLE_ID = "dsh-usage-panel-style";
    function injectStyles() {
      if (document.getElementById(STYLE_ID)) return;
      var css = [
        // 主题变量
        "." + PANEL_CLS + "{",
        "  --up-bg:#ffffff;--up-fg:#1a1d1c;--up-fg2:#5c6360;--up-fg3:#9aa09d;",
        "  --up-border:rgba(20,60,50,.10);--up-hover:#f0f6f4;",
        "  --up-shadow:0 12px 40px rgba(20,60,50,.14);--up-bar-bg:#eef2f1;",
        "  --up-accent:#10b981;--up-accent-soft:rgba(16,185,129,.12);",
        "  --up-card:#f8faf9;",
        "}",
        "body[data-ds-dark-theme] ." + PANEL_CLS + "{",
        "  --up-bg:#1e2422;--up-fg:#e8ecea;--up-fg2:#a0a8a4;--up-fg3:#6b7470;",
        "  --up-border:rgba(255,255,255,.08);--up-hover:#262e2b;",
        "  --up-shadow:0 12px 40px rgba(0,0,0,.4);--up-bar-bg:#2a3230;",
        "  --up-accent:#34d399;--up-accent-soft:rgba(52,211,153,.14);",
        "  --up-card:#232a28;",
        "}",
        // 面板容器
        "." + PANEL_CLS + "{",
        "  position:fixed;z-index:9999;right:12px;top:49px;width:300px;",
        "  max-height:78vh;overflow-y:auto;overflow-x:hidden;",
        "  background:var(--up-bg);",
        "  border:1px solid var(--up-border);",
        "  border-radius:16px;",
        "  box-shadow:var(--up-shadow);",
        "  padding:0;font-family:var(--dcu-font,Inter,system-ui);",
        "  color:var(--up-fg);",
        "  display:none;",
        "  scrollbar-width:thin;scrollbar-color:var(--up-fg3) transparent;",
        "}",
        "." + PANEL_CLS + "::-webkit-scrollbar{width:6px}",
        "." + PANEL_CLS + "::-webkit-scrollbar-thumb{background:var(--up-fg3);border-radius:3px}",
        // 头部
        "." + PANEL_CLS + " .up-head{display:flex;align-items:center;gap:8px;padding:14px 16px 12px;border-bottom:1px solid var(--up-border);background:linear-gradient(180deg,var(--up-accent-soft),transparent)}",
        "." + PANEL_CLS + " .up-head-dot{width:8px;height:8px;border-radius:50%;background:var(--up-accent);box-shadow:0 0 0 3px var(--up-accent-soft);flex:none}",
        "." + PANEL_CLS + " .up-head-title{font-size:13px;font-weight:700;letter-spacing:.2px;flex:1}",
        "." + PANEL_CLS + " .up-head-sub{font-size:11px;color:var(--up-fg3);font-weight:400;margin-top:1px}",
        "." + PANEL_CLS + " .up-icon-btn{appearance:none;border:0;background:transparent;cursor:pointer;width:26px;height:26px;border-radius:7px;display:grid;place-items:center;color:var(--up-fg3);font-size:13px;transition:background .15s,color .15s}",
        "." + PANEL_CLS + " .up-icon-btn:hover{background:var(--up-hover);color:var(--up-fg)}",
        // 概览卡片
        "." + PANEL_CLS + " .up-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:12px 16px}",
        "." + PANEL_CLS + " .up-stat{background:var(--up-card);border:1px solid var(--up-border);border-radius:10px;padding:8px 6px;text-align:center}",
        "." + PANEL_CLS + " .up-stat-num{font-size:16px;font-weight:700;color:var(--up-fg);line-height:1.2}",
        "." + PANEL_CLS + " .up-stat-lbl{font-size:10px;color:var(--up-fg3);margin-top:2px;letter-spacing:.3px}",
        // 分区
        "." + PANEL_CLS + " .up-section{padding:4px 16px 8px}",
        "." + PANEL_CLS + " .up-section-title{font-size:10px;font-weight:700;color:var(--up-fg3);text-transform:uppercase;letter-spacing:1px;margin:8px 0 4px}",
        // 进度行
        "." + PANEL_CLS + " .up-progress{margin:6px 0}",
        "." + PANEL_CLS + " .up-progress-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px}",
        "." + PANEL_CLS + " .up-progress-label{font-size:12px;color:var(--up-fg2);font-weight:500}",
        "." + PANEL_CLS + " .up-progress-val{font-size:11px;color:var(--up-fg3);font-variant-numeric:tabular-nums}",
        "." + PANEL_CLS + " .up-progress-track{height:8px;border-radius:4px;background:var(--up-bar-bg);overflow:hidden;position:relative}",
        "." + PANEL_CLS + " .up-progress-fill{height:100%;border-radius:4px;transition:width .5s cubic-bezier(.4,0,.2,1);position:relative}",
        "." + PANEL_CLS + " .up-progress-fill::after{content:\"\";position:absolute;inset:0;background:linear-gradient(90deg,rgba(255,255,255,.25),transparent 60%);border-radius:4px}",
        // 页脚
        "." + PANEL_CLS + " .up-foot{padding:10px 16px 12px;border-top:1px solid var(--up-border);display:flex;align-items:center;justify-content:space-between}",
        "." + PANEL_CLS + " .up-foot-left{font-size:10px;color:var(--up-fg3)}",
        "." + PANEL_CLS + " .up-foot-badge{font-size:10px;font-weight:600;color:var(--up-accent);background:var(--up-accent-soft);padding:2px 8px;border-radius:99px}",
        // 加载/错误
        "." + PANEL_CLS + " .up-loading{padding:24px 16px;text-align:center;font-size:12px;color:var(--up-fg3)}",
        "." + PANEL_CLS + " .up-spinner{width:22px;height:22px;border:2px solid var(--up-bar-bg);border-top-color:var(--up-accent);border-radius:50%;margin:0 auto 8px;animation:up-spin .8s linear infinite}",
        "@keyframes up-spin{to{transform:rotate(360deg)}}",
        "." + PANEL_CLS + " .up-error{padding:24px 16px;text-align:center;font-size:12px;color:#e5484d}",
        "." + PANEL_CLS + " .up-retry{margin-top:10px;padding:5px 14px;border-radius:8px;border:1px solid var(--up-border);background:var(--up-card);cursor:pointer;font-size:12px;color:var(--up-fg)}",
        // 按钮
        "." + BTN_CLS + "{",
        "  --up-fg2:#4e5253;--up-hover:#dfe8e5;",
        "  display:flex;align-items:center;gap:8px;width:100%;min-height:36px;",
        "  padding:0 4px;border-radius:8px;background:transparent;border:0;",
        "  cursor:pointer;color:var(--up-fg2);",
        "  font-size:14px;text-align:left;font-family:var(--dcu-font,Inter,system-ui);",
        "}",
        "body[data-ds-dark-theme] ." + BTN_CLS + "{",
        "  --up-fg2:#b9bab9;--up-hover:#303432;",
        "}",
        "." + BTN_CLS + ":hover{background:var(--up-hover);}",
        "." + BTN_CLS + " .up-btn-icon{width:20px;height:20px;display:grid;place-items:center;font-size:14px;}",
      ].join("\n");
      var style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = css;
      document.head.appendChild(style);
    }

    // ---------- 格式化 ----------
    function fmtMoney(v) { return "$" + (typeof v === "number" ? v.toFixed(2) : "—"); }
    function fmtNum(v) { return typeof v === "number" ? v.toLocaleString() : "—"; }
    function fmtCompact(v) {
      if (typeof v !== "number") return "—";
      if (v >= 1e9) return (v / 1e9).toFixed(1) + "B";
      if (v >= 1e6) return (v / 1e6).toFixed(1) + "M";
      if (v >= 1e3) return (v / 1e3).toFixed(1) + "K";
      return String(v);
    }
    function pct(used, cap) { return cap > 0 ? Math.min(100, Math.round(used / cap * 100)) : 0; }
    function barColor(p) { return p >= 80 ? "#e5484d" : p >= 50 ? "#f5a623" : "var(--up-accent)"; }

    // ---------- RPC 调 host ----------
    function callUsage(ctx) {
      return new Promise(function (resolve) {
        try {
          var rpc = ctx && ctx.connection && ctx.connection.rpc;
          if (rpc && typeof rpc.call === "function") {
            rpc.call("/dsh-usage", "report", {}).then(function (res) {
              if (res && res.ok && res.value) resolve(res.value);
              else resolve({ error: (res && (res.error || (res.value && res.value.error))) || "RPC 返回异常" });
            }).catch(function (e) { resolve({ error: String(e && e.message || e) }); });
            return;
          }
          resolve({ error: "RPC 通道不可用" });
        } catch (e) { resolve({ error: String(e && e.message || e) }); }
      });
    }

    // ---------- 精致面板 ----------
    function buildPanel(ctx) {
      var wrap = document.createElement("div");
      wrap.className = PANEL_CLS;
      var state = { data: null, error: null, loading: false };

      // 头部（固定结构，不随 render 重建）
      var head = document.createElement("div");
      head.className = "up-head";
      var dot = document.createElement("span");
      dot.className = "up-head-dot";
      var headTitles = document.createElement("div");
      headTitles.style.cssText = "flex:1;min-width:0";
      var headTitle = document.createElement("div");
      headTitle.className = "up-head-title";
      headTitle.textContent = "CommandCode";
      var headSub = document.createElement("div");
      headSub.className = "up-head-sub";
      headSub.textContent = "用量 · 余额";
      headTitles.appendChild(headTitle); headTitles.appendChild(headSub);
      var refreshBtn = document.createElement("button");
      refreshBtn.className = "up-icon-btn";
      refreshBtn.textContent = "↻";
      refreshBtn.title = "刷新";
      refreshBtn.onclick = load;
      head.appendChild(dot); head.appendChild(headTitles); head.appendChild(refreshBtn);
      wrap.appendChild(head);

      // 主体（render 时重建）
      var body = document.createElement("div");
      wrap.appendChild(body);

      function el(tag, cls, text) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text !== undefined && text !== null) e.textContent = text;
        return e;
      }
      function statRow(num, label) {
        var s = el("div", "up-stat");
        s.appendChild(el("div", "up-stat-num", num));
        s.appendChild(el("div", "up-stat-lbl", label));
        return s;
      }
      function progressRow(label, used, cap) {
        var p = pct(used, cap);
        var pr = el("div", "up-progress");
        var top = el("div", "up-progress-top");
        top.appendChild(el("span", "up-progress-label", label));
        top.appendChild(el("span", "up-progress-val", fmtMoney(used) + " / " + fmtMoney(cap) + " · " + p + "%"));
        pr.appendChild(top);
        var track = el("div", "up-progress-track");
        var fill = el("div", "up-progress-fill");
        fill.style.width = p + "%";
        fill.style.background = barColor(p);
        track.appendChild(fill);
        pr.appendChild(track);
        return pr;
      }

      function render() {
        body.textContent = "";

        if (state.loading) {
          var ld = el("div", "up-loading");
          ld.appendChild(el("div", "up-spinner"));
          ld.appendChild(el("div", "", "加载中…"));
          body.appendChild(ld);
          return;
        }
        if (state.error) {
          var er = el("div", "up-error", "加载失败：" + state.error);
          var retry = el("button", "up-retry", "重试");
          retry.onclick = load;
          er.appendChild(retry);
          body.appendChild(er);
          return;
        }

        var d = state.data || {};
        var account = d.account && d.account.user || {};
        var usage = d.usage || {};
        var credits = d.credits && d.credits.credits || {};
        var win = d.credits && d.credits.windowLimits || {};
        var sub = d.subscription && d.subscription.data || {};

        // 概览卡片：请求 / 成功 / 花费
        if (usage.totalCount !== undefined) {
          var stats = el("div", "up-stats");
          stats.appendChild(statRow(fmtCompact(usage.totalCount), "请求"));
          stats.appendChild(statRow((usage.successRate !== undefined ? usage.successRate + "%" : "—"), "成功率"));
          stats.appendChild(statRow(fmtMoney(usage.totalCost), "花费"));
          body.appendChild(stats);
        }

        // 窗口用量分区
        var secWin = el("div", "up-section");
        secWin.appendChild(el("div", "up-section-title", "窗口用量"));
        if (win.fiveHour) secWin.appendChild(progressRow("5小时", win.fiveHour.used, win.fiveHour.cap));
        if (win.weekly) secWin.appendChild(progressRow("每周", win.weekly.used, win.weekly.cap));
        body.appendChild(secWin);

        // 信用分区
        if (credits.monthlyCredits !== undefined) {
          var secCred = el("div", "up-section");
          secCred.appendChild(el("div", "up-section-title", "月额度"));
          var usedMonthly = win.weekly ? win.weekly.used : (usage.totalCredits || 0);
          var capMonthly = usedMonthly + credits.monthlyCredits;
          secCred.appendChild(progressRow("剩余", credits.monthlyCredits, capMonthly));
          body.appendChild(secCred);
        }

        // 底部：套餐 + 更新时间
        var foot = el("div", "up-foot");
        var footL = el("div", "up-foot-left");
        footL.textContent = (account.userName || "—") + " · " + (d.fetchedAt ? new Date(d.fetchedAt).toLocaleTimeString() : "");
        foot.appendChild(footL);
        if (sub.planId) foot.appendChild(el("span", "up-foot-badge", sub.planId));
        body.appendChild(foot);
      }

      function load() {
        state.loading = true; state.error = null;
        render();
        callUsage(ctx).then(function (res) {
          state.loading = false;
          if (res && res.error) state.error = res.error;
          else {
            try { state.data = typeof res === "string" ? JSON.parse(res) : res; }
            catch (e) { state.error = "解析失败"; }
          }
          render();
        });
      }

      // 点击面板外部关闭
      function onDocClick(ev) {
        if (!wrap.contains(ev.target) && !btn.contains(ev.target)) hide();
      }
      function show() { load(); wrap.style.display = "block"; document.addEventListener("click", onDocClick); }
      function hide() { wrap.style.display = "none"; document.removeEventListener("click", onDocClick); }
      function toggle() { if (wrap.style.display === "none") show(); else hide(); }

      // 定时刷新
      var timer = setInterval(function () { if (wrap.style.display !== "none") load(); }, POLL_MS);

      return { wrap: wrap, toggle: toggle };
    }

    // ---------- 按钮 ----------
    function buildButton(panel) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = BTN_CLS;
      var icon = document.createElement("span");
      icon.className = "up-btn-icon";
      icon.textContent = "⚡";
      var label = document.createElement("span");
      label.textContent = "用量";
      btn.appendChild(icon); btn.appendChild(label);
      btn.onclick = function (e) { e.stopPropagation(); panel.toggle(); };
      return btn;
    }

    // ---------- apply ----------
    exports.apply = function apply(ctx) {
      if (typeof document === "undefined") return;
      if (document.documentElement.dataset.dshUsagePanel === "on") return;
      document.documentElement.dataset.dshUsagePanel = "on";

      injectStyles();

      var panel = buildPanel(ctx);
      var btn = buildButton(panel);
      document.body.appendChild(panel.wrap);

      function tryAttach() {
        var foot = document.querySelector(".dcu-footer-actions");
        if (foot && !foot.contains(btn)) {
          foot.appendChild(btn);
          return true;
        }
        return false;
      }
      var tries = 0;
      var timer = setInterval(function () {
        if (tryAttach() || tries > 40) clearInterval(timer);
        tries++;
      }, 250);
    };
    exports.inject = ["slots", "connection"];
    return module.exports;
  }
});
