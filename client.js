/**
 * usage-panel 客户端半：在 codex-ui 侧边栏底部注入"⚡ 用量"按钮，
 * 点击弹出 CommandCode 用量面板（精致卡片 UI）。
 *
 * 主题自适应：复用 codex-ui 的 body[data-ds-dark-theme] 机制 —— 面板自带
 * 主题变量，浅色/深色自动切换。
 *
 * 数据获取：/dsh-usage/report RPC（同源 HTTP POST，client-request 协议）
 */
window.__ModuleLoader__.load({
  id: "@deepseek-ai/usage-panel",
  factory: function (require) {
    var module = { exports: {} };
    var exports = module.exports;

    var POLL_MS = 5 * 60 * 1000;
    var PANEL_CLS = "dsh-usage-panel";
    var BTN_CLS = "dsh-usage-btn";

    // ================= 主题样式 =================
    var STYLE_ID = "dsh-usage-panel-style";
    function injectStyles() {
      if (document.getElementById(STYLE_ID)) return;
      var css = [
        // ---------- 主题变量 ----------
        "." + PANEL_CLS + "{",
        "  --up-bg:#ffffff;--up-fg:#1d2421;--up-fg2:#5b6662;--up-fg3:#8fa09a;",
        "  --up-border:rgba(25,65,50,.10);--up-border2:rgba(25,65,50,.18);",
        "  --up-hover:#eef6f3;--up-card:#f6faf8;--up-card2:#ffffff;",
        "  --up-shadow:0 1px 2px rgba(16,50,40,.05),0 14px 36px rgba(16,50,40,.16);",
        "  --up-grad1:#0ea97a;--up-grad2:#14b8a6;--up-grad3:#0d9488;",
        "  --up-accent:#0d9f77;--up-accent-soft:rgba(13,159,119,.10);",
        "  --up-bar-bg:#e9f1ee;--up-warn:#eab308;--up-danger:#e5484d;",
        "}",
        "body[data-ds-dark-theme] ." + PANEL_CLS + "{",
        "  --up-bg:#202724;--up-fg:#e9efec;--up-fg2:#aab6b1;--up-fg3:#72807b;",
        "  --up-border:rgba(255,255,255,.08);--up-border2:rgba(255,255,255,.16);",
        "  --up-hover:#2a332f;--up-card:#252e2a;--up-card2:#29332f;",
        "  --up-shadow:0 1px 2px rgba(0,0,0,.25),0 16px 44px rgba(0,0,0,.52);",
        "  --up-grad1:#34d399;--up-grad2:#2dd4bf;--up-grad3:#14b8a6;",
        "  --up-accent:#34d399;--up-accent-soft:rgba(52,211,153,.15);",
        "  --up-bar-bg:#2f3a35;--up-warn:#fbbf24;--up-danger:#f2555a;",
        "}",
        // ---------- 面板外壳 ----------
        "." + PANEL_CLS + "{",
        "  position:fixed;z-index:9999;right:12px;top:49px;width:332px;",
        "  max-height:calc(100vh - 62px);overflow-y:auto;overflow-x:hidden;",
        "  background:var(--up-bg);border:1px solid var(--up-border);",
        "  border-radius:18px;box-shadow:var(--up-shadow);",
        "  padding:0;font-family:var(--dcu-font,Inter,system-ui);color:var(--up-fg);",
        "  display:none;scrollbar-width:thin;scrollbar-color:var(--up-fg3) transparent;",
        "}",
        "." + PANEL_CLS + "::-webkit-scrollbar{width:6px}",
        "." + PANEL_CLS + "::-webkit-scrollbar-thumb{background:var(--up-fg3);border-radius:3px}",
        "@keyframes up-in{from{opacity:0;transform:translateY(-10px) scale(.97)}to{opacity:1;transform:none}}",
        "." + PANEL_CLS + ".up-open{display:block;animation:up-in .24s cubic-bezier(.2,.9,.3,1.15)}",
        // ---------- Header 渐变横幅 ----------
        "." + PANEL_CLS + " .up-head{position:relative;padding:16px 16px 13px;overflow:hidden}",
        "." + PANEL_CLS + " .up-head-bg{position:absolute;inset:0;background:linear-gradient(118deg,var(--up-grad1),var(--up-grad3) 62%,var(--up-grad2))}",
        "." + PANEL_CLS + " .up-head-bg::after{content:\"\";position:absolute;inset:0;background:radial-gradient(130% 100% at 100% 0,rgba(255,255,255,.28),transparent 55%)}",
        "." + PANEL_CLS + " .up-head-in{position:relative;display:flex;align-items:flex-start;gap:10px}",
        "." + PANEL_CLS + " .up-head-logo{width:34px;height:34px;border-radius:11px;background:rgba(255,255,255,.22);border:1px solid rgba(255,255,255,.4);display:grid;place-items:center;font-size:17px;box-shadow:0 2px 10px rgba(0,0,0,.16);flex:none}",
        "." + PANEL_CLS + " .up-head-title{font-size:15px;font-weight:800;letter-spacing:.2px;flex:1;min-width:0;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.15)}",
        "." + PANEL_CLS + " .up-head-sub{font-size:10.5px;color:rgba(255,255,255,.82);font-weight:500;margin-top:2px;text-shadow:0 1px 2px rgba(0,0,0,.12)}",
        "." + PANEL_CLS + " .up-icon-btn{appearance:none;border:0;background:rgba(255,255,255,.16);cursor:pointer;width:28px;height:28px;border-radius:9px;display:grid;place-items:center;color:#fff;font-size:15px;transition:background .18s,transform .25s}",
        "." + PANEL_CLS + " .up-icon-btn:hover{background:rgba(255,255,255,.3);transform:rotate(140deg)}",
        "." + PANEL_CLS + " .up-plan-chip{position:relative;display:inline-flex;align-items:center;gap:6px;margin-top:10px;padding:3px 10px;border-radius:99px;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.34);font-size:10px;font-weight:700;letter-spacing:.5px;color:#fff;text-transform:uppercase;max-width:100%;box-sizing:border-box}",
        "." + PANEL_CLS + " .up-plan-chip .up-dot{width:5px;height:5px;border-radius:50%;background:#c9f7e4;box-shadow:0 0 0 2px rgba(201,247,228,.25);animation:up-pulse 2.2s ease-in-out infinite;flex:none}",
        "@keyframes up-pulse{0%,100%{opacity:1}50%{opacity:.4}}",
        // ---------- 主体 ----------
        "." + PANEL_CLS + " .up-body{padding:13px 13px 11px}",
        // 统计三卡
        "." + PANEL_CLS + " .up-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}",
        "." + PANEL_CLS + " .up-stat{position:relative;background:var(--up-card);border:1px solid var(--up-border);border-radius:12px;padding:10px 4px 8px;text-align:center;transition:border-color .18s,transform .18s,box-shadow .18s;overflow:hidden}",
        "." + PANEL_CLS + " .up-stat::before{content:\"\";position:absolute;top:0;left:16%;right:16%;height:2px;border-radius:2px;background:linear-gradient(90deg,transparent,var(--up-accent),transparent);opacity:.75}",
        "." + PANEL_CLS + " .up-stat:hover{border-color:var(--up-border2);transform:translateY(-1px);box-shadow:0 3px 10px rgba(16,50,40,.06)}",
        "." + PANEL_CLS + " .up-stat-num{font-size:16.5px;font-weight:800;color:var(--up-fg);line-height:1.15;font-variant-numeric:tabular-nums;letter-spacing:-.3px}",
        "." + PANEL_CLS + " .up-stat-lbl{font-size:9px;color:var(--up-fg3);margin-top:4px;letter-spacing:.6px;font-weight:700;text-transform:uppercase}",
        // 分区卡片
        "." + PANEL_CLS + " .up-section{background:var(--up-card);border:1px solid var(--up-border);border-radius:14px;padding:11px 12px 10px;margin-bottom:9px;transition:border-color .18s}",
        "." + PANEL_CLS + " .up-section:hover{border-color:var(--up-border2)}",
        "." + PANEL_CLS + " .up-section-title{display:flex;align-items:center;gap:7px;font-size:9.5px;font-weight:800;color:var(--up-fg3);text-transform:uppercase;letter-spacing:1.2px;margin-bottom:7px}",
        "." + PANEL_CLS + " .up-section-title::before{content:\"\";width:3px;height:11px;border-radius:2px;background:linear-gradient(180deg,var(--up-grad1),var(--up-grad3))}",
        // 进度行
        "." + PANEL_CLS + " .up-progress{margin:8px 0}",
        "." + PANEL_CLS + " .up-progress-top{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:5px;gap:8px}",
        "." + PANEL_CLS + " .up-progress-label{font-size:12px;color:var(--up-fg);font-weight:650;display:flex;align-items:center;gap:5px}",
        "." + PANEL_CLS + " .up-progress-label .up-lbl-ic{font-size:12px;width:16px;text-align:center;color:var(--up-accent);flex:none}",
        "." + PANEL_CLS + " .up-progress-val{font-size:10.5px;color:var(--up-fg2);font-variant-numeric:tabular-nums;font-weight:500}",
        "." + PANEL_CLS + " .up-progress-val b{color:var(--up-fg);font-weight:700}",
        "." + PANEL_CLS + " .up-progress-track{height:9px;border-radius:99px;background:var(--up-bar-bg);overflow:hidden;box-shadow:inset 0 1px 2px rgba(0,0,0,.06)}",
        "." + PANEL_CLS + " .up-progress-fill{height:100%;border-radius:99px;transition:width .8s cubic-bezier(.3,.7,.3,1);position:relative;box-shadow:0 1px 3px rgba(0,0,0,.14)}",
        "." + PANEL_CLS + " .up-progress-fill::after{content:\"\";position:absolute;inset:0;border-radius:99px;background:linear-gradient(90deg,rgba(255,255,255,.32),transparent 42%)}",
        "." + PANEL_CLS + " .up-progress-bottom{display:flex;align-items:center;justify-content:space-between;margin-top:5px;gap:8px;min-height:15px}",
        "." + PANEL_CLS + " .up-progress-deadline{font-size:10px;color:var(--up-fg3);font-weight:500;display:inline-flex;align-items:center;gap:3px;letter-spacing:.2px;font-variant-numeric:tabular-nums}",
        "." + PANEL_CLS + " .up-progress-deadline .up-cal{font-size:9.5px;opacity:.9}",
        "." + PANEL_CLS + " .up-pct-chip{font-size:9.5px;font-weight:800;padding:2px 8px;border-radius:99px;letter-spacing:.3px;font-variant-numeric:tabular-nums}",
        // 页脚
        "." + PANEL_CLS + " .up-foot{padding:10px 16px 12px;border-top:1px solid var(--up-border);display:flex;align-items:center;justify-content:space-between;gap:8px;background:linear-gradient(0deg,var(--up-accent-soft),transparent 85%)}",
        "." + PANEL_CLS + " .up-foot-left{font-size:10px;color:var(--up-fg3);display:flex;align-items:center;gap:6px;font-variant-numeric:tabular-nums}",
        "." + PANEL_CLS + " .up-foot-user{font-weight:700;color:var(--up-fg2);max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
        // 加载 / 错误
        "." + PANEL_CLS + " .up-loading{padding:36px 16px;text-align:center;font-size:12px;color:var(--up-fg3)}",
        "." + PANEL_CLS + " .up-spinner{width:26px;height:26px;border:3px solid var(--up-bar-bg);border-top-color:var(--up-accent);border-radius:50%;margin:0 auto 10px;animation:up-spin .7s linear infinite}",
        "@keyframes up-spin{to{transform:rotate(360deg)}}",
        "." + PANEL_CLS + " .up-error{padding:32px 16px;text-align:center;font-size:12px;color:var(--up-danger)}",
        "." + PANEL_CLS + " .up-retry{margin-top:12px;padding:6px 18px;border-radius:99px;border:0;background:var(--up-accent);cursor:pointer;font-size:12px;font-weight:600;color:#fff}",
        "." + PANEL_CLS + " .up-retry:hover{filter:brightness(1.1)}",
        // ---------- 侧栏按钮 ----------
        "." + BTN_CLS + "{",
        "  --up-fg2:#4e5253;--up-hover:#dfe8e5;",
        "  display:flex;align-items:center;gap:8px;width:100%;min-height:36px;",
        "  padding:0 4px;border-radius:8px;background:transparent;border:0;",
        "  cursor:pointer;color:var(--up-fg2);font-size:14px;text-align:left;",
        "  font-family:var(--dcu-font,Inter,system-ui);transition:background .15s;",
        "}",
        "body[data-ds-dark-theme] ." + BTN_CLS + "{--up-fg2:#b9bab9;--up-hover:#303432}",
        "." + BTN_CLS + ":hover{background:var(--up-hover)}",
        "." + BTN_CLS + " .up-btn-icon{width:20px;height:20px;display:grid;place-items:center;font-size:14px}",
        "." + BTN_CLS + ".up-active{background:var(--up-accent-soft,#e6f4ef);color:var(--up-accent,#0d9f77);font-weight:600}",
        "body[data-ds-dark-theme] ." + BTN_CLS + ".up-active{color:#34d399;background:rgba(52,211,153,.12)}",
      ].join("\n");
      var style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = css;
      document.head.appendChild(style);
    }

    // ---------- 格式化 ----------
    function fmtMoney(v) { return "$" + (typeof v === "number" ? v.toFixed(2) : "—"); }
    function fmtCompact(v) {
      if (typeof v !== "number") return "—";
      if (v >= 1e6) return (v / 1e6).toFixed(2) + "M";
      if (v >= 1e3) return (v / 1e3).toFixed(1) + "K";
      return String(Math.round(v));
    }
    function pct(used, cap) { return cap > 0 ? Math.min(100, Math.round(used / cap * 100)) : 0; }
    function pad2(n) { return (n < 10 ? "0" : "") + n; }
    // 周期截止 → {text:"M/D HH:mm", days} 或 ""
    function fmtDeadline(t) {
      if (t === undefined || t === null || t === "") return "";
      var d = new Date(t);
      if (isNaN(d.getTime())) return "";
      var now = new Date();
      var days = Math.ceil((d - now) / 86400000);
      var text = (d.getMonth() + 1) + "/" + d.getDate() + " " + pad2(d.getHours()) + ":" + pad2(d.getMinutes());
      return { text: text, days: days };
    }
    function fmtCountdown(dl) {
      if (!dl) return "";
      var hm = dl.text.split(" ")[1];
      if (dl.days <= 0) return "今日 " + hm;
      if (dl.days === 1) return "明天 " + hm;
      return dl.days + "天后 " + hm;
    }
    function barColor(p) { return p >= 85 ? "var(--up-danger)" : p >= 60 ? "var(--up-warn)" : "linear-gradient(90deg,var(--up-grad1),var(--up-grad2))"; }

    // ---------- RPC ----------
    function callUsage() {
      return new Promise(function (resolve) {
        try {
          fetch("/dsh-usage/report", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "client-request", rpcId: "usage-" + Date.now(), method: "report", payload: {} })
          }).then(function (res) { return res.ok ? res.json() : Promise.reject(new Error("HTTP " + res.status)); })
            .then(function (msg) {
              if (msg && msg.type === "server-response" && msg.result) {
                var r = msg.result;
                if (r.ok && r.value) resolve(r.value);
                else resolve({ error: (r.error && (r.error.message || JSON.stringify(r.error))) || "RPC 返回异常" });
              } else resolve({ error: "RPC 响应格式异常" });
            })
            .catch(function (e) { resolve({ error: String(e && e.message || e) }); });
        } catch (e) { resolve({ error: String(e && e.message || e) }); }
      });
    }

    // ================= 面板 =================
    function buildPanel() {
      var wrap = document.createElement("div");
      wrap.className = PANEL_CLS;
      var state = { data: null, error: null, loading: false };

      // ---- 头部 ----
      var head = document.createElement("div");
      head.className = "up-head";
      head.appendChild(el("div", "up-head-bg"));
      var headIn = el("div", "up-head-in");
      var logo = el("div", "up-head-logo", "⚡");
      var titles = el("div");
      titles.style.cssText = "flex:1;min-width:0";
      var headTitle = el("div", "up-head-title", "CommandCode");
      var headSub = el("div", "up-head-sub", "用量 · 余额");
      titles.appendChild(headTitle); titles.appendChild(headSub);
      var refreshBtn = el("button", "up-icon-btn", "↻");
      refreshBtn.title = "刷新";
      refreshBtn.onclick = function () { load(); };
      headIn.appendChild(logo); headIn.appendChild(titles); headIn.appendChild(refreshBtn);
      head.appendChild(headIn);
      var planChip = el("div", "up-plan-chip"); planChip.style.display = "none";
      head.appendChild(planChip);
      wrap.appendChild(head);

      // ---- 主体 ----
      var body = el("div", "up-body");
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
      function progressRow(label, icon, used, cap, deadlineT) {
        var p = pct(used, cap);
        var pr = el("div", "up-progress");
        // 顶行
        var top = el("div", "up-progress-top");
        var lbl = el("span", "up-progress-label");
        if (icon) lbl.appendChild(el("span", "up-lbl-ic", icon));
        lbl.appendChild(el("span", "", label));
        top.appendChild(lbl);
        var val = el("span", "up-progress-val");
        var usedB = document.createElement("b");
        usedB.textContent = fmtMoney(used);
        val.appendChild(usedB);
        val.appendChild(document.createTextNode(" / " + fmtMoney(cap)));
        top.appendChild(val);
        pr.appendChild(top);
        // 进度条（动画）
        var track = el("div", "up-progress-track");
        var fill = el("div", "up-progress-fill");
        fill.style.width = "0%";
        fill.style.background = barColor(p);
        track.appendChild(fill);
        pr.appendChild(track);
        setTimeout(function () { fill.style.width = p + "%"; }, 40);
        // 底行：重置倒计时 + 百分比胶囊
        var bottom = el("div", "up-progress-bottom");
        if (deadlineT && deadlineT.text) {
          var dl = el("span", "up-progress-deadline");
          dl.appendChild(el("span", "up-cal", "🕒"));
          dl.appendChild(document.createTextNode("重置 " + fmtCountdown(deadlineT) + " · " + deadlineT.text));
          bottom.appendChild(dl);
        } else {
          bottom.appendChild(el("span", "", ""));
        }
        var chip = el("span", "up-pct-chip", p + "%");
        chip.style.color = p >= 85 ? "var(--up-danger)" : p >= 60 ? "var(--up-warn)" : "var(--up-accent)";
        chip.style.background = p >= 85 ? "rgba(229,72,77,.12)" : p >= 60 ? "rgba(234,179,8,.13)" : "var(--up-accent-soft)";
        bottom.appendChild(chip);
        pr.appendChild(bottom);
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

        // 头部：账号 + 套餐 chip
        if (account.userName) headSub.textContent = account.userName + (sub.planId ? " · " + sub.planId : "");
        planChip.textContent = ""; planChip.style.display = sub.planId ? "inline-flex" : "none";
        if (sub.planId) {
          planChip.appendChild(el("span", "up-dot"));
          planChip.appendChild(document.createTextNode(sub.status === "active" ? "Active · " + sub.planId : sub.planId));
        }

        // 统计三卡
        if (usage.totalCount !== undefined) {
          var stats = el("div", "up-stats");
          stats.appendChild(statRow(fmtCompact(usage.totalCount), "请求"));
          stats.appendChild(statRow(usage.successRate !== undefined ? usage.successRate + "%" : "—", "成功率"));
          stats.appendChild(statRow(fmtMoney(usage.totalCost), "总花费"));
          body.appendChild(stats);
        }

        // 窗口用量
        var secWin = el("div", "up-section");
        secWin.appendChild(el("div", "up-section-title", "窗口用量"));
        if (win.fiveHour) secWin.appendChild(progressRow("5小时滚动窗口", "⏱", win.fiveHour.used, win.fiveHour.cap, fmtDeadline(win.fiveHour.resetAt)));
        if (win.weekly) secWin.appendChild(progressRow("每周用量", "📅", win.weekly.used, win.weekly.cap, fmtDeadline(win.weekly.resetAt)));
        if (win.limited === false && !win.fiveHour && !win.weekly) secWin.appendChild(el("div", "up-progress-deadline", "无限额度 · 无窗口限制"));
        body.appendChild(secWin);

        // 信用 / 月额度
        if (credits.monthlyCredits !== undefined) {
          var secCred = el("div", "up-section");
          secCred.appendChild(el("div", "up-section-title", "月额度"));
          var usedMonthly = win.weekly ? win.weekly.used : (usage.totalCredits || 0);
          var capMonthly = usedMonthly + credits.monthlyCredits;
          secCred.appendChild(progressRow("剩余额度", "💳", credits.monthlyCredits, capMonthly, fmtDeadline(sub.currentPeriodEnd)));
          // 明细
          var det = el("div", "up-progress-bottom");
          det.style.cssText = "justify-content:flex-start;gap:14px;margin-top:6px;padding-top:7px;border-top:1px dashed var(--up-border);min-height:0";
          var detItem = function (k, v) {
            var it = el("span", "up-progress-deadline");
            it.appendChild(document.createTextNode(k + " "));
            var vv = document.createElement("b");
            vv.textContent = v;
            vv.style.cssText = "color:var(--up-fg2);font-weight:700";
            it.appendChild(vv);
            return it;
          };
          if (usage.totalMonthlyCredits !== undefined) det.appendChild(detItem("当月已用", fmtMoney(usage.totalMonthlyCredits)));
          det.appendChild(detItem("已购买", fmtMoney(credits.purchasedCredits)));
          if (credits.freeCredits !== undefined) det.appendChild(detItem("免费", fmtMoney(credits.freeCredits)));
          secCred.appendChild(det);
          body.appendChild(secCred);
        }

        // 页脚
        var foot = el("div", "up-foot");
        var footL = el("div", "up-foot-left");
        var fu = el("span", "up-foot-user", account.userName || "—");
        footL.appendChild(fu);
        footL.appendChild(document.createTextNode("·"));
        footL.appendChild(document.createTextNode(d.fetchedAt ? new Date(d.fetchedAt).toLocaleTimeString() : ""));
        foot.appendChild(footL);
        var footR = el("span", "up-foot-left");
        footR.textContent = "5分钟自动刷新";
        foot.appendChild(footR);
        body.appendChild(foot);
      }

      function load() {
        state.loading = true; state.error = null;
        render();
        callUsage().then(function (res) {
          state.loading = false;
          if (res && res.error) state.error = res.error;
          else {
            try { state.data = typeof res === "string" ? JSON.parse(res) : res; }
            catch (e) { state.error = "解析失败"; }
          }
          render();
        });
      }

      var open = false; var panelBtn = null;
      function onDocClick(ev) { if (!wrap.contains(ev.target) && !(panelBtn && panelBtn.contains(ev.target))) hide(); }
      function onKey(ev) { if (ev.key === "Escape") hide(); }
      function show() {
        open = true;
        load();
        wrap.style.display = "block";
        wrap.classList.add("up-open");
        if (panelBtn) panelBtn.classList.add("up-active");
        document.addEventListener("click", onDocClick, true);
        document.addEventListener("keydown", onKey, true);
      }
      function hide() {
        open = false;
        wrap.style.display = "none";
        wrap.classList.remove("up-open");
        if (panelBtn) panelBtn.classList.remove("up-active");
        document.removeEventListener("click", onDocClick, true);
        document.removeEventListener("keydown", onKey, true);
      }
      function toggle() { if (open) hide(); else show(); }

      var timer = setInterval(function () { if (open) load(); }, POLL_MS);

      var api = {
        wrap: wrap,
        setButton: function (b) { panelBtn = b; },
        toggle: toggle,
        hide: hide,
        dispose: function () {
          clearInterval(timer);
          document.removeEventListener("click", onDocClick, true);
          document.removeEventListener("keydown", onKey, true);
          if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
        }
      };
      wrap.__dshDispose = api.dispose;
      return api;
    }

    // ---------- 侧栏按钮 ----------
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
    var _instance = null;
    exports.apply = function apply(ctx) {
      if (typeof document === "undefined") return;

      if (_instance) {
        try { if (typeof _instance.dispose === "function") _instance.dispose(); } catch (e) {}
        _instance = null;
      }
      var oldWrap = document.querySelector("." + PANEL_CLS);
      if (oldWrap && oldWrap.__dshDispose) { try { oldWrap.__dshDispose(); } catch (e) {} }
      var oldBtns = document.querySelectorAll("." + BTN_CLS);
      for (var i = 0; i < oldBtns.length; i++) {
        if (oldBtns[i].parentNode) oldBtns[i].parentNode.removeChild(oldBtns[i]);
      }

      injectStyles();

      var panel = buildPanel();
      var btn = buildButton(panel);
      if (panel && typeof panel.setButton === 'function') panel.setButton(btn);
      document.body.appendChild(panel.wrap);
      _instance = panel;

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
