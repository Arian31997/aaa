// ===== پنل کاربری (ممبر): اشتراک / پروفایل / لینک‌ها / سفارش‌ها / تنظیمات =====
(function () {
  var panel = null, tab = "dash";
  var ST_FA = { pending: "در انتظار", approved: "فعال ✅", rejected: "رد شد" };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function users() { try { return JSON.parse(localStorage.getItem("hima_vmp_users") || "[]"); } catch { return []; } }
  function saveUsers(u) { localStorage.setItem("hima_vmp_users", JSON.stringify(u)); }
  function session() { try { return JSON.parse(localStorage.getItem("hima_vmp_session") || "null"); } catch { return null; } }
  function me() { var s = session(); if (!s || s.role === "admin") return null; return users().find(function (u) { return u.name === s.name; }) || null; }
  function toast(m) {
    var t = document.getElementById("vmpToast");
    t.textContent = m; t.classList.add("show");
    clearTimeout(t._tm); t._tm = setTimeout(function () { t.classList.remove("show"); }, 2600);
  }
  function faPrice(p) { p = Number(p) || 0; return p > 0 ? p.toLocaleString("fa-IR") + " تومان" : "رایگان"; }
  function faDate(t) { try { return new Date(t).toLocaleDateString("fa-IR"); } catch { return ""; } }

  function linkCard(kind, title, icon, hint) {
    var u = me(), v = u && u[kind];
    return '<div class="mm-card"><div class="txt"><h3>' + title + '</h3>' +
      (v ? '<p class="mm-linked">✅ متصل: <b dir="ltr">' + esc(v) + '</b></p>' : '<p>' + hint + '</p>') +
      '<div class="mm-linkrow" id="linkrow-' + kind + '"' + (v ? " hidden" : "") + '>' +
      '<input id="linkin-' + kind + '" dir="ltr" placeholder="' + (kind === "steam" ? "Steam ID" : "username") + '">' +
      '<button class="pill ghost" data-link="' + kind + '">لینک</button></div></div>' +
      '<div style="display:flex;gap:10px;align-items:center"><span class="mm-ico">' + icon + '</span>' +
      (v ? '<button class="pill red" data-unlink="' + kind + '">قطع اتصال</button>'
         : '<button class="pill ghost" data-showlink="' + kind + '">لینک</button>') + '</div></div>';
  }

  async function render() {
    var u = me();
    if (!u) { close(); return; }
    document.getElementById("mmName").textContent = u.name;
    document.getElementById("mmSub").textContent = "بدون ست";
    document.getElementById("mmAvatar").innerHTML = u.avatar ? '<img src="' + u.avatar + '" alt="">' : "👤";
    document.querySelectorAll(".mm-side [data-mm]").forEach(function (b) {
      b.classList.toggle("active", b.dataset.mm === tab);
    });
    ["dash", "profile", "orders", "settings"].forEach(function (n) {
      document.getElementById("mm-" + n).hidden = (n !== tab);
    });

    var allOrders = await window.VmpDB.listOrders();
    var mine = allOrders.filter(function (o) { return o.user_name === u.name; });
    var active = mine.filter(function (o) { return o.status === "approved"; });

    // داشبورد: اشتراک
    document.getElementById("mm-dash").innerHTML =
      '<div class="mm-cards"><div class="mm-card"><div class="txt"><h3>' +
      (active.length ? ("✅ " + active.length + " اشتراک فعال داری") : "شما اشتراک فعالی ندارید") + '</h3>' +
      '<p>' + (active.length ? active.map(function (o) { return esc(o.plan); }).join(" · ") : "برای خرید اشتراک می‌توانید به صفحه فروشگاه مراجعه کنید") + '</p></div>' +
      '<button class="pill" data-mm-goto="#shop">فروشگاه</button></div></div>';

    // پروفایل
    document.getElementById("mm-profile").innerHTML =
      '<div class="mm-cards">' +
      '<div class="mm-card"><div class="txt"><h3>پروفایل</h3><p>تنظیمات پروفایل خود را مدیریت کنید</p></div></div>' +
      '<div class="mm-card"><div class="txt"><h3>عکس پروفایل</h3><p>حداکثر 500 کیلوبایت</p></div>' +
      '<div style="display:flex;gap:10px;align-items:center"><span class="mm-ava-big">' + (u.avatar ? '<img src="' + u.avatar + '" alt="">' : "👤") + '</span>' +
      '<button class="pill" id="mmAvatarBtn">آپلود</button>' +
      (u.avatar ? '<button class="pill red" id="mmAvatarDel">حذف</button>' : "") +
      '<input type="file" id="mmFile" accept="image/*" hidden></div></div>' +
      '<div class="mm-duo">' +
      linkCard("discord", "دیسکورد", "🎮", "پروفایل شما به دیسکورد لینک نمی‌باشد") +
      linkCard("steam", "استیم", "🎯", "پروفایل شما به استیم لینک نمی‌باشد") +
      "</div>" +
      '<div class="mm-card"><div class="txt" style="flex:1"><h3>اطلاعات حساب</h3><div class="mm-info">' +
      "<div class='row'><span>نام کاربری</span><b dir='ltr'>" + esc(u.name) + "</b></div>" +
      "<div class='row'><span>ایمیل</span><b dir='ltr'>" + esc(u.mail) + "</b></div>" +
      "<div class='row'><span>موبایل</span><b>" + esc(u.phone || "—") + "</b></div>" +
      "<div class='row'><span>عضویت</span><b>" + faDate(u.at) + "</b></div>" +
      "</div></div></div></div>";

    // سفارش‌ها
    document.getElementById("mm-orders").innerHTML = mine.length ? '<div class="mm-cards">' + mine.map(function (o) {
      return '<div class="mm-card"><div class="txt"><h3>' + esc(o.plan) + '</h3><p>' + faPrice(o.price) + " · " + faDate(o.created_at) + '</p></div>' +
        '<span class="badge b-' + o.status + '">' + (ST_FA[o.status] || o.status) + "</span></div>";
    }).join("") + "</div>" : '<div class="empty">سفارشی ثبت نکردی — از فروشگاه شروع کن 🛍</div>';

    // تنظیمات
    document.getElementById("mm-settings").innerHTML =
      '<div class="mm-cards"><div class="mm-card"><div class="txt" style="flex:1"><h3>تغییر رمز عبور</h3>' +
      '<form class="va-form" id="mmPassForm" style="margin-top:10px">' +
      '<input type="password" id="mmOld" placeholder="رمز فعلی" required>' +
      '<input type="password" id="mmNew" placeholder="رمز جدید (حداقل ۶ حرف)" required minlength="6">' +
      '<input type="password" id="mmNew2" placeholder="تکرار رمز جدید" required>' +
      '<div class="err" id="mmPassErr"></div>' +
      '<button class="pill" type="submit">ذخیره رمز</button></form></div></div></div>';
    var pf = document.getElementById("mmPassForm");
    if (pf) pf.onsubmit = function (e) {
      e.preventDefault();
      var err = document.getElementById("mmPassErr"); err.textContent = "";
      var all = users(), meU = all.find(function (x) { return x.name === u.name; });
      if (!meU || meU.pass !== btoa(document.getElementById("mmOld").value)) return err.textContent = "رمز فعلی اشتباه است";
      var n1 = document.getElementById("mmNew").value, n2 = document.getElementById("mmNew2").value;
      if (n1.length < 6) return err.textContent = "رمز جدید حداقل ۶ حرف باشد";
      if (n1 !== n2) return err.textContent = "تکرار رمز یکی نیست";
      meU.pass = btoa(n1); saveUsers(all);
      toast("رمز عوض شد ✅"); render();
    };

    var fb = document.getElementById("mmAvatarBtn");
    if (fb) fb.onclick = function () { document.getElementById("mmFile").click(); };
    var fd = document.getElementById("mmAvatarDel");
    if (fd) fd.onclick = function () {
      var all = users(), meU = all.find(function (x) { return x.name === u.name; });
      if (meU) { delete meU.avatar; saveUsers(all); }
      toast("عکس حذف شد"); render();
    };
    var fi = document.getElementById("mmFile");
    if (fi) fi.onchange = function () {
      var f = fi.files[0]; if (!f) return;
      if (f.size > 500 * 1024) { toast("حداکثر 500 کیلوبایت!", true); fi.value = ""; return; }
      var rd = new FileReader();
      rd.onload = function () {
        var all = users(), meU = all.find(function (x) { return x.name === u.name; });
        if (meU) { meU.avatar = rd.result; saveUsers(all); }
        toast("عکس آپلود شد ✅"); render();
      };
      rd.readAsDataURL(f);
    };
  }

  function open() {
    var s = session();
    if (!s || s.role === "admin") return;
    panel.removeAttribute("hidden");
    document.body.style.overflow = "hidden";
    render();
  }
  function close() { if (panel) panel.setAttribute("hidden", ""); document.body.style.overflow = ""; }

  // ===== دموی پنل ممبر: vmp.html?demo=1 =====
  async function maybeDemo() {
    var q;
    try { q = new URLSearchParams(location.search); } catch (e) { return; }
    if (!q || q.get("demo") !== "1") return;
    var all = users();
    var u = all.find(function (x) { return x.name === "demo"; });
    if (!u) {
      u = { name: "demo", phone: "09120000000", mail: "demo@mail.com", pass: btoa("demo1234"), at: Date.now(), steam: "STEAM_0:1:123456", discord: "demo_player" };
      all.unshift(u); saveUsers(all);
    } else {
      u.steam = u.steam || "STEAM_0:1:123456";
      u.discord = u.discord || "demo_player";
      saveUsers(all);
    }
    localStorage.setItem("hima_vmp_session", JSON.stringify({ role: "user", name: "demo", email: u.mail, phone: u.phone }));
    var chip = document.getElementById("userChip");
    if (chip) { chip.hidden = false; chip.textContent = "👤 demo"; }
    try {
      var orders = await window.VmpDB.listOrders();
      var o = orders.find(function (x) { return x.user_name === "demo"; });
      if (!o) o = await window.VmpDB.addOrder({ user_name: "demo", user_email: u.mail, plan: "اشتراک طلایی", price: 249000 });
      if (o && o.status !== "approved") await window.VmpDB.updateOrder(o.id, { status: "approved" });
      var tickets = await window.VmpDB.listTickets();
      if (!tickets.some(function (x) { return x.user_name === "demo"; })) {
        var nt = await window.VmpDB.addTicket({ user_name: "demo", user_email: u.mail, subject: "سلام! این یک تیکت نمایشی است", body: "می‌خواستم ببینم پاسخ مدیر کجا نمایش داده می‌شود." });
        if (nt) await window.VmpDB.updateTicket(nt.id, { answer: "سلام demo! پاسخ مدیر اینجا نمایش داده می‌شود ✅", status: "answered" });
      }
    } catch (e) {}
    if (typeof window.refreshVmpSupport === "function") window.refreshVmpSupport();
    if (typeof window.renderVmpShop === "function") window.renderVmpShop();
    if (typeof window.renderVmpBlog === "function") window.renderVmpBlog();
    setTimeout(function () { open(); toast("دموی پنل ممبر 👤 (نام کاربری: demo)"); }, 700);
  }

  document.addEventListener("DOMContentLoaded", function () {
    panel = document.getElementById("memberPanel");
    if (!panel) return;
    maybeDemo();
    panel.addEventListener("click", function (e) {
      var q = function (s) { return e.target.closest(s); };
      var t, sl;
      if (q("#mmClose") || e.target === panel) { close(); return; }
      if ((t = q("[data-mm]"))) { tab = t.dataset.mm; render(); return; }
      if ((t = q("[data-mm-goto]"))) { close(); var el = document.querySelector(t.dataset.mmGoto); if (el) el.scrollIntoView({ behavior: "smooth" }); return; }
      if (q("#mmLogout")) {
        localStorage.removeItem("hima_vmp_session");
        var chip = document.getElementById("userChip"); if (chip) chip.hidden = true;
        close(); if (typeof window.refreshVmpSupport === "function") window.refreshVmpSupport();
        toast("خارج شدی 👋"); return;
      }
      if ((t = q("[data-showlink]"))) {
        var row = document.getElementById("linkrow-" + t.dataset.showlink);
        if (row) { row.hidden = false; var inp = row.querySelector("input"); if (inp) inp.focus(); }
        return;
      }
      if ((t = q("[data-link]"))) {
        var kind = t.dataset.link;
        var inp2 = document.getElementById("linkin-" + kind);
        var v = inp2 ? inp2.value.trim() : "";
        if (!v) { toast("اول آیدی را بنویس", true); return; }
        var all = users(), s = session(), meU = all.find(function (x) { return s && x.name === s.name; });
        if (meU) { meU[kind] = v; saveUsers(all); }
        toast("لینک شد ✅"); render(); return;
      }
      if ((t = q("[data-unlink]"))) {
        var k = t.dataset.unlink;
        var all2 = users(), s2 = session(), m2 = all2.find(function (x) { return s2 && x.name === s2.name; });
        if (m2) { delete m2[k]; saveUsers(all2); }
        toast("قطع شد"); render(); return;
      }
      if ((sl = q("#mmAvatarBtn"))) return; // handled by direct onclick
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && panel && !panel.hidden) close(); });
  });

  window.VmpMember = { open: open, close: close, render: render };
})();
