// ===== پس‌زمینه توپوگرافی متحرک (خطوط هم‌تراز + هاله بنفش) =====
(function () {
  var cv = document.getElementById("topo");
  if (!cv) return;
  var ctx = cv.getContext("2d");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var W = 0, H = 0, cell = 14, cols = 0, rows = 0, field = null;
  var t = Math.random() * 100;
  var LEVELS = 13, ACCENT_EVERY = 4;

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    cell = W < 700 ? 18 : 14;
    cv.width = W; cv.height = H;
    cols = Math.ceil(W / cell) + 2; rows = Math.ceil(H / cell) + 2;
    field = new Float32Array(cols * rows);
  }
  var rT = null;
  window.addEventListener("resize", function () { clearTimeout(rT); rT = setTimeout(resize, 200); });
  resize();

  // نویز مقداری + fBm
  function hash(x, y) { var n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); }
  function sm(t2) { return t2 * t2 * (3 - 2 * t2); }
  function vnoise(x, y) {
    var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    var a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    var u = sm(xf), v = sm(yf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y) {
    return vnoise(x, y) * 0.55 + vnoise(x * 2.03 + 13.7, y * 2.03 + 7.1) * 0.28 + vnoise(x * 4.1 + 7.3, y * 4.1 + 3.9) * 0.17;
  }
  function computeField() {
    for (var j = 0; j < rows; j++) {
      var gy = j * cell;
      for (var i = 0; i < cols; i++) {
        var gx = i * cell;
        var wx = fbm(gx * 0.004 - t * 0.013, gy * 0.004);
        var wy = fbm(gx * 0.004 + 5.2, gy * 0.004 + t * 0.011);
        field[j * cols + i] = fbm(gx * 0.008 + wx * 0.35 + t * 0.015, gy * 0.008 + wy * 0.35);
      }
    }
  }

  // marching squares: رسم سگمنت‌های یک سطح در path جاری
  function march(level) {
    var c = ctx;
    for (var j = 0; j < rows - 1; j++) {
      var y0 = j * cell, y1 = y0 + cell;
      for (var i = 0; i < cols - 1; i++) {
        var x0 = i * cell, x1 = x0 + cell;
        var a = field[j * cols + i], b = field[j * cols + i + 1];
        var cc = field[(j + 1) * cols + i + 1], d = field[(j + 1) * cols + i];
        var idx = 0;
        if (a > level) idx |= 8;
        if (b > level) idx |= 4;
        if (cc > level) idx |= 2;
        if (d > level) idx |= 1;
        if (idx === 0 || idx === 15) continue;
        var top = x0 + cell * ((level - a) / (b - a));
        var right = y0 + cell * ((level - b) / (cc - b));
        var bottom = x0 + cell * ((level - d) / (cc - d));
        var left = y0 + cell * ((level - a) / (d - a));
        switch (idx) {
          case 1: case 14: c.moveTo(x0, left); c.lineTo(bottom, y1); break;
          case 2: case 13: c.moveTo(bottom, y1); c.lineTo(x1, right); break;
          case 3: case 12: c.moveTo(x0, left); c.lineTo(x1, right); break;
          case 4: case 11: c.moveTo(top, y0); c.lineTo(x1, right); break;
          case 5: c.moveTo(x0, left); c.lineTo(top, y0); c.moveTo(bottom, y1); c.lineTo(x1, right); break;
          case 6: case 9: c.moveTo(top, y0); c.lineTo(bottom, y1); break;
          case 7: case 8: c.moveTo(x0, left); c.lineTo(top, y0); break;
          case 10: c.moveTo(top, y0); c.lineTo(x1, right); c.moveTo(x0, left); c.lineTo(bottom, y1); break;
        }
      }
    }
  }

  var slowFrames = 0;
  function draw() {
    computeField();
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 1;
    // خطوط معمولی
    ctx.beginPath();
    for (var l = 0; l < LEVELS; l++) {
      if (l % ACCENT_EVERY === 2) continue;
      march(0.08 + (0.84 * l) / (LEVELS - 1));
    }
    ctx.strokeStyle = "rgba(200,190,255,0.07)";
    ctx.stroke();
    // خطوط بنفش درخشان
    ctx.beginPath();
    for (var k = 0; k < LEVELS; k++) {
      if (k % ACCENT_EVERY !== 2) continue;
      march(0.08 + (0.84 * k) / (LEVELS - 1));
    }
    ctx.strokeStyle = "rgba(139,124,255,0.5)";
    ctx.lineWidth = 1.4;
    ctx.shadowColor = "rgba(124,92,255,0.8)";
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  var last = performance.now();
  function frame(now) {
    var dt = Math.min(100, now - last); last = now;
    t += dt * 0.0016; // رانش آرام میدان (حدود یک واحد نویز در ۱۰ ثانیه)
    var s = performance.now();
    draw();
    var cost = performance.now() - s;
    if (cost > 30 && cell < 22) { // افت فریم؟ درشت‌تر کن
      if (++slowFrames > 30) { cell += 2; cols = Math.ceil(W / cell) + 2; rows = Math.ceil(H / cell) + 2; field = new Float32Array(cols * rows); slowFrames = 0; }
    } else slowFrames = 0;
    if (!reduce) requestAnimationFrame(frame);
  }

  draw();
  if (!reduce) requestAnimationFrame(frame);
})();
