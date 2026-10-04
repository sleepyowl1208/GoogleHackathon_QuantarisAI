/* @ds-bundle: {"format":4,"namespace":"Quantaris","components":[{"name":"Logo"},{"name":"AppNav"},{"name":"Button"},{"name":"StatusTag"},{"name":"EvidenceTag"},{"name":"MetricTile"},{"name":"ChakraRing"},{"name":"MissionComposer"},{"name":"StageRail"},{"name":"SiteMap"},{"name":"ProcessFlow"},{"name":"ImpactBars"},{"name":"CircularityPath"},{"name":"EvidenceDrawer"},{"name":"StateView"}]} */
(function () {
  var R = window.React, h = R.createElement, F = R.Fragment;
  function cx() { return Array.prototype.filter.call(arguments, Boolean).join(" "); }
  function rad(d) { return d * Math.PI / 180; }

  /* ---------- Logo ---------- */
  function Mark(p) {
    var s = p.size || 28, small = s < 32, sp = [];
    if (!small) for (var i = 0; i < 24; i++) { if (i === 3) continue; var a = rad(i * 15), c = Math.cos(a), n = Math.sin(a);
      sp.push(h("line", { key: i, x1: 32 + 9 * c, y1: 32 + 9 * n, x2: 32 + 14 * c, y2: 32 + 14 * n })); }
    var w = small ? 6 : 5;
    return h("svg", { viewBox: "0 0 64 64", width: s, height: s, "aria-hidden": true },
      h("path", { className: "ring", d: "M 43 51.05 A 22 22 0 1 1 51.05 43", strokeWidth: w, strokeLinecap: "round" }),
      small ? null : h("g", { className: "spokes", strokeWidth: 1.3, strokeLinecap: "round" }, sp),
      h("circle", { className: "hub", cx: 32, cy: 32, r: small ? 6 : 4 }),
      h("line", { className: "tail", x1: 42.6, y1: 42.6, x2: 51.5, y2: 51.5, strokeWidth: w, strokeLinecap: "round" }),
      h("circle", { className: "node", cx: 54, cy: 54, r: 4.5 }));
  }
  function Logo(p) {
    var size = p.size || 28, variant = p.variant || "full";
    return h("span", { className: cx("qa-logo", p.tone === "reverse" && "reverse", p.className), role: "img", "aria-label": "QuantarisAI" },
      h(Mark, { size: size }),
      variant === "mark" ? null : h("span", { className: "word", style: { fontSize: size * 0.72 } }, "Quantaris", h("b", null, "AI"),
        p.descriptor ? h("span", { className: "desc" }, p.descriptor) : null));
  }

  /* ---------- AppNav ---------- */
  function AppNav(p) {
    var items = p.items || [];
    return h("nav", { className: cx("qa-nav", p.className), "aria-label": "Primary" },
      h("div", { className: "brand" }, h(Logo, { tone: "reverse", size: 26 })),
      items.map(function (it, i) {
        if (it.section) return h("div", { key: i, className: "sect" }, it.section);
        return h("a", { key: i, href: it.href || "#", "aria-current": it.id === p.active ? "page" : undefined, onClick: p.onSelect ? function (e) { e.preventDefault(); p.onSelect(it.id); } : undefined },
          h("span", { className: "ix" }, it.index || ""), it.label);
      }));
  }

  /* ---------- Button ---------- */
  function Button(p) {
    var o = Object.assign({}, p); var v = o.variant || "secondary", sz = o.size, ic = o.icon, ch = o.children;
    delete o.variant; delete o.size; delete o.icon; delete o.children;
    o.className = cx("qa-btn", v !== "secondary" && v, sz === "sm" && "sm", p.className);
    if (!o.type) o.type = "button";
    return h("button", o, ic ? h("span", { className: "ico", "aria-hidden": true }, ic) : null, ch);
  }

  /* ---------- StatusTag ---------- */
  var TONES = { opportunity: "↗", system: "◉", positive: "✓", assumption: "≈", risk: "▲", inactive: "○" };
  function StatusTag(p) {
    var t = p.tone || "system";
    return h("span", { className: cx("qa-tag", t, p.className) }, h("span", { className: "g", "aria-hidden": true }, TONES[t]), p.children);
  }

  /* ---------- EvidenceTag ---------- */
  var KINDS = { fact: ["■", "Fact"], assumption: ["◇", "Assumption"], calculation: ["Σ", "Calculation"], inference: ["◐", "Inference"], simulation: ["∿", "Simulation"], recommendation: ["→", "Recommendation"] };
  function EvidenceTag(p) {
    var k = KINDS[p.kind] ? p.kind : "fact";
    return h("span", { className: cx("qa-ev", k, p.className) }, h("span", { className: "g", "aria-hidden": true }, KINDS[k][0]), p.children || KINDS[k][1]);
  }

  /* ---------- MetricTile ---------- */
  function MetricTile(p) {
    var tone = p.deltaTone || "neutral", arrow = { positive: "▼", risk: "▲", opportunity: "↗", neutral: "→" }[tone];
    if (p.deltaArrow) arrow = p.deltaArrow;
    return h("div", { className: cx("qa-panel qa-metric", p.className) },
      h("div", { className: "lbl" }, h("span", null, p.label), p.evidence ? h(EvidenceTag, { kind: p.evidence }) : null),
      h("div", { className: "val" }, p.value, p.unit ? h("small", null, p.unit) : null),
      p.delta ? h("div", { className: cx("delta", tone) }, h("span", { "aria-hidden": true }, arrow), p.delta) : null,
      p.note ? h("div", { className: "note" }, p.note) : null);
  }

  /* ---------- ChakraRing (24-segment progress / loader) ---------- */
  function ChakraRing(p) {
    var s = p.size || 48, val = Math.max(0, Math.min(1, p.value == null ? 0 : p.value)), on = p.spinning ? 6 : Math.round(val * 24), segs = [];
    for (var i = 0; i < 24; i++) { var a = rad(i * 15 - 90), c = Math.cos(a), n = Math.sin(a);
      segs.push(h("line", { key: i, className: cx("seg", i < on && "on"), x1: 24 + 15 * c, y1: 24 + 15 * n, x2: 24 + 21 * c, y2: 24 + 21 * n, strokeWidth: 2.4 })); }
    return h("span", { className: cx("qa-chakra", p.tone, p.spinning && "spin", p.className), role: p.spinning ? "status" : "progressbar",
        "aria-valuenow": p.spinning ? undefined : Math.round(val * 100), "aria-valuemin": p.spinning ? undefined : 0, "aria-valuemax": p.spinning ? undefined : 100, "aria-label": p.label || (p.spinning ? "Working" : "Progress") },
      h("svg", { viewBox: "0 0 48 48", width: s, height: s }, segs,
        p.showValue && !p.spinning ? h("text", { className: "hub", x: 24, y: 28, textAnchor: "middle" }, Math.round(val * 100)) : null),
      p.caption ? h("span", { className: "cap" }, p.caption) : null);
  }

  /* ---------- MissionComposer ---------- */
  function MissionComposer(p) {
    var st = R.useState(p.defaultValue || ""), v = p.value != null ? p.value : st[0];
    function set(x) { st[1](x); if (p.onChange) p.onChange(x); }
    return h("form", { className: cx("qa-composer", p.className), onSubmit: function (e) { e.preventDefault(); if (p.onSubmit) p.onSubmit(v); } },
      h("div", { className: "head" }, h("span", { className: "dot", "aria-hidden": true }), h("span", { className: "qa-eyebrow" }, p.eyebrow || "New industrial mission")),
      h("label", { className: "qa-sr", htmlFor: "qa-mission" }, "Mission"),
      h("textarea", { id: "qa-mission", rows: 2, value: v, placeholder: p.placeholder || "Design a sustainable manufacturing ecosystem for…", onChange: function (e) { set(e.target.value); } }),
      h("div", { className: "foot" },
        (p.params || []).map(function (x, i) { return h("span", { key: i, className: "param" }, x.label + " ", h("b", null, x.value)); }),
        h(Button, { variant: "primary", type: "submit", icon: "↗", disabled: !v.trim() }, p.actionLabel || "Initiate simulation")));
  }

  /* ---------- StageRail ---------- */
  var STAGES = ["Ambition", "Location", "Factory", "Economics", "Environment", "Waste", "Circularity", "Next opportunity"];
  function StageRail(p) {
    var st = p.stages || STAGES, cur = p.current == null ? 0 : p.current, pos = p.positive || [];
    return h("ol", { className: cx("qa-stages", p.className), "aria-label": "Scenario stages" }, st.map(function (s, i) {
      var state = i < cur ? "done" : i === cur ? "current" : "upcoming";
      var good = state === "done" && pos.indexOf(i) > -1;
      return h("li", { key: i, className: cx(state, good && "positive"), "aria-current": state === "current" ? "step" : undefined },
        h("span", { className: "pt", "aria-hidden": true }, state === "done" ? "✓" : i + 1),
        h("span", { className: "nm" }, s), h("span", { className: "qa-sr" }, state));
    }));
  }

  /* ---------- SiteMap (dot-placed industrial geography; never draws borders) ---------- */
  function proj(lat, lon, w, hh) { return [((lon - 67.5) / 30) * w, ((36.5 - lat) / 30.5) * hh]; }
  function SiteMap(p) {
    var W = p.width || 420, H = p.height || 440, sites = p.sites || [], byId = {}, grid = [];
    sites.forEach(function (s) { byId[s.id] = s; });
    for (var gx = 12; gx < W; gx += 20) for (var gy = 12; gy < H; gy += 20) grid.push(h("circle", { key: gx + "-" + gy, cx: gx, cy: gy, r: 0.9 }));
    function shape(s) {
      var q = proj(s.lat, s.lon, W, H), x = q[0], y = q[1], k = s.kind || "cluster", sel = s.selected;
      if (k === "candidate") return h("rect", { className: cx("s-candidate", sel && "sel"), x: x - (sel ? 7 : 5), y: y - (sel ? 7 : 5), width: sel ? 14 : 10, height: sel ? 14 : 10, rx: 2 });
      if (k === "port") return h("path", { className: "s-port", d: "M" + x + " " + (y - 6) + " L" + (x + 6) + " " + (y + 5) + " L" + (x - 6) + " " + (y + 5) + " Z" });
      if (k === "raw") return h("path", { className: "s-raw", d: "M" + x + " " + (y - 5) + " L" + (x + 5) + " " + y + " L" + x + " " + (y + 5) + " L" + (x - 5) + " " + y + " Z" });
      if (k === "risk") return h("circle", { className: "s-risk", cx: x, cy: y, r: 4 });
      return h("circle", { className: "s-cluster", cx: x, cy: y, r: 4.5 });
    }
    return h("figure", { className: cx("qa-map", p.className), style: { margin: 0 }, "aria-label": p.label || "Candidate industrial locations" },
      h("svg", { viewBox: "0 0 " + W + " " + H, role: "img" },
        h("g", { className: "grid", "aria-hidden": true }, grid),
        (p.links || []).map(function (l, i) { var a = byId[l.from], b = byId[l.to]; if (!a || !b) return null;
          var A = proj(a.lat, a.lon, W, H), B = proj(b.lat, b.lon, W, H), mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2 - Math.abs(A[0] - B[0]) * 0.18;
          return h("path", { key: i, className: cx("lnk", l.selected && "sel"), d: "M" + A[0] + " " + A[1] + " Q" + mx + " " + my + " " + B[0] + " " + B[1] }); }),
        sites.map(function (s) { var q = proj(s.lat, s.lon, W, H);
          return h("g", { key: s.id }, h("title", null, s.name + (s.note ? " — " + s.note : "")), shape(s),
            s.label === false ? null : h("text", { className: s.selected ? "sel" : "", x: q[0] + 9, y: q[1] + 4 }, s.name)); })),
      h("div", { className: "legend", "aria-hidden": true },
        h("span", null, h("svg", { width: 10, height: 10 }, h("rect", { className: "s-candidate sel", x: 1, y: 1, width: 8, height: 8, rx: 1 })), "Selected site"),
        h("span", null, h("svg", { width: 10, height: 10 }, h("rect", { className: "s-candidate", x: 1, y: 1, width: 8, height: 8, rx: 1 })), "Candidate"),
        h("span", null, h("svg", { width: 10, height: 10 }, h("circle", { className: "s-cluster", cx: 5, cy: 5, r: 4 })), "Industrial cluster"),
        h("span", null, h("svg", { width: 10, height: 10 }, h("path", { className: "s-raw", d: "M5 0 L10 5 L5 10 L0 5Z" })), "Raw material"),
        h("span", null, h("svg", { width: 10, height: 10 }, h("path", { className: "s-port", d: "M5 1 L9 9 L1 9Z" })), "Port")),
      p.illustrative === false ? null : h("figcaption", { className: "disclaimer" }, "≈ Illustrative data · not live"));
  }

  /* ---------- ProcessFlow (Factory Blueprint) ---------- */
  function FlowNode(n) { return h("div", { className: cx("node", n.tone) }, h("div", { className: "t" }, n.label), n.meta ? h("div", { className: "m" }, n.meta) : null); }
  function ProcessFlow(p) {
    var nodes = p.nodes || [], br = p.branch, out = [];
    nodes.forEach(function (n, i) { if (i) out.push(h("span", { key: "l" + i, className: "link", "aria-hidden": true })); out.push(h(F, { key: n.id || i }, FlowNode(n))); });
    var dropX = 0; if (br) { var idx = Math.max(0, nodes.findIndex(function (n) { return n.id === br.from; })); dropX = idx * 148 + 59; }
    return h("div", { className: cx("qa-flow", p.className), role: "group", "aria-label": p.label || "Process flow" },
      h("div", { className: "main" }, out),
      br ? h(F, null, h("div", { className: "drop", style: { "--qa-drop-x": dropX + "px" }, "aria-hidden": true }),
        h("div", { className: "branch", style: { paddingLeft: Math.max(0, dropX - 59) + "px" } },
          br.nodes.map(function (n, i) { return h(F, { key: i }, i ? h("span", { className: "link", "aria-hidden": true }) : null, FlowNode(n)); }))) : null);
  }

  /* ---------- ImpactBars ---------- */
  function ImpactBars(p) {
    var rows = p.rows || [];
    return h("div", null,
      h("div", { className: "qa-impact-key", "aria-hidden": true }, h("span", null, h("i", { style: { background: "var(--viz-baseline)" } }), p.baselineLabel || "Business as usual"),
        h("span", null, h("i", { style: { background: "var(--viz-positive)" } }), "Improved"), h("span", null, h("i", { style: { background: "var(--viz-risk)" } }), "Worse")),
      h("div", { className: cx("qa-impact", p.className) }, rows.map(function (r, i) {
        var max = Math.max(r.baseline, r.scenario) || 1, better = (r.better || "lower") === "lower" ? r.scenario <= r.baseline : r.scenario >= r.baseline;
        var tone = r.tone || (better ? "positive" : "risk"), pct = Math.round(((r.scenario - r.baseline) / (r.baseline || 1)) * 100);
        return h(F, { key: i },
          h("div", { className: "nm" }, r.label),
          h("div", { className: "bars", role: "img", "aria-label": r.label + ": baseline " + r.baseline + " " + (r.unit || "") + ", scenario " + r.scenario + " " + (r.unit || "") },
            h("div", { className: "bar base", style: { width: (r.baseline / max * 100) + "%" } }),
            h("div", { className: cx("bar", tone), style: { width: (r.scenario / max * 100) + "%" } })),
          h("div", { className: cx("chg", tone) }, (pct < 0 ? "▼ " : "▲ ") + Math.abs(pct) + "%", h("small", null, r.scenario.toLocaleString("en-IN") + " " + (r.unit || ""))));
      })));
  }

  /* ---------- CircularityPath (signature: waste → value) ---------- */
  function CircularityPath(p) {
    var state = p.state || "neutral", steps = p.steps || ["Recovery", "Secondary material", "New product"], val = p.value || "Economic opportunity", valSub = p.valueSub || "";
    var bw = 120, gap = 36, y0 = 20, y1 = 112, xs = [];
    for (var i = 0; i < steps.length + 1; i++) xs.push(150 + i * (bw + gap));
    var W = xs[xs.length - 1] + bw + 4, d = "M 70 64 L 70 " + (y1 + 22) + " L " + xs[0] + " " + (y1 + 22);
    for (var j = 1; j < xs.length; j++) d += " M " + (xs[j - 1] + bw) + " " + (y1 + 22) + " L " + xs[j] + " " + (y1 + 22);
    var status = { neutral: ["○", "Waste stream unassessed"], analysing: ["◉", "QuantarisAI is assessing recovery pathways…"], discovered: ["✓", p.discoveredText || "Viable circular pathway found"] }[state];
    return h("div", { className: cx("qa-panel qa-circ", state, p.className) },
      h("svg", { viewBox: "0 0 " + W + " 170", role: "img", "aria-label": "Waste to value pathway: " + status[1] },
        h("g", { className: "src" }, h("rect", { x: 10, y: y0, width: 120, height: 44, rx: 6 }), h("text", { className: "lbl", x: 22, y: y0 + 20 }, p.source || "Factory"), h("text", { className: "sub", x: 22, y: y0 + 35 }, p.sourceSub || "")),
        h("g", { className: "waste" }, h("rect", { x: 150, y: y0, width: 150, height: 44, rx: 6 }), h("text", { className: "lbl", x: 162, y: y0 + 20 }, p.waste || "Waste stream"), h("text", { className: "sub", x: 162, y: y0 + 35 }, p.wasteSub || "")),
        h("path", { className: "path", d: "M 130 42 L 150 42" }),
        h("path", { className: "path", d: d }),
        steps.map(function (s, k) { return h("g", { key: k, className: "step" },
          h("rect", { x: xs[k], y: y1, width: bw, height: 44, rx: 6 }), h("text", { className: "lbl", x: xs[k] + 12, y: y1 + 27 }, s),
          h("text", { className: "ok", x: xs[k] + bw - 18, y: y1 + 27, fontSize: 12, fontWeight: 700 }, "✓")); }),
        h("g", { className: "value" }, h("rect", { x: xs[steps.length], y: y1, width: bw, height: 44, rx: 6 }),
          h("text", { className: "lbl", x: xs[steps.length] + 12, y: y1 + 20 }, val), h("text", { className: "sub", x: xs[steps.length] + 12, y: y1 + 35 }, state === "discovered" ? valSub : "—"))),
      h("div", { className: "status", role: "status" },
        state === "analysing" ? h(ChakraRing, { size: 18, spinning: true, label: "Analysing" }) : h(StatusTag, { tone: state === "discovered" ? "positive" : "inactive" }, state === "discovered" ? "Circular" : "Unassessed"),
        h("span", null, status[1])));
  }

  /* ---------- EvidenceDrawer ---------- */
  function EvidenceDrawer(p) {
    return h("aside", { className: cx("qa-drawer", p.className), "aria-label": "Evidence" },
      h("header", null, h("div", null, h("div", { className: "qa-eyebrow" }, "Evidence"), h("h3", null, p.title || "Why this number")),
        p.onClose ? h(Button, { variant: "ghost", size: "sm", onClick: p.onClose, "aria-label": "Close evidence" }, "✕") : null),
      h("ol", null, (p.items || []).map(function (it, i) {
        var c = it.confidence == null ? null : Math.round(it.confidence * 5), bars = [];
        if (c != null) for (var b = 0; b < 5; b++) bars.push(h("i", { key: b, className: b < c ? "on" : "" }));
        return h("li", { key: i },
          h("div", null, h(EvidenceTag, { kind: it.kind }), c != null ? h("span", { className: "conf", title: "Confidence " + c + "/5", "aria-label": "Confidence " + c + " of 5" }, bars) : null),
          h("div", { className: "claim" }, it.claim), it.source ? h("div", { className: "src" }, it.source) : null);
      })));
  }

  /* ---------- StateView ---------- */
  function StateView(p) {
    var k = p.kind || "empty";
    return h("div", { className: cx("qa-state", k, p.className), role: k === "error" ? "alert" : k === "loading" ? "status" : undefined },
      k === "loading" ? h(ChakraRing, { size: 40, spinning: true, label: p.title || "Loading" }) : h("div", { className: "ico", "aria-hidden": true }, k === "error" ? "!" : "+"),
      h("h4", null, p.title), p.body ? h("p", null, p.body) : null,
      p.action ? h(Button, { variant: k === "error" ? "secondary" : "primary", size: "sm", onClick: p.onAction }, p.action) : null);
  }

  window.Quantaris = Object.assign(window.Quantaris || {}, { Logo: Logo, AppNav: AppNav, Button: Button, StatusTag: StatusTag, EvidenceTag: EvidenceTag, MetricTile: MetricTile, ChakraRing: ChakraRing, MissionComposer: MissionComposer, StageRail: StageRail, SiteMap: SiteMap, ProcessFlow: ProcessFlow, ImpactBars: ImpactBars, CircularityPath: CircularityPath, EvidenceDrawer: EvidenceDrawer, StateView: StateView });
})();
