// ===== VMP user side: ticket submit + my tickets + blog + shop orders =====
(function () {
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function session() {
    try { return JSON.parse(localStorage.getItem("hima_vmp_session") || "null"); }
    catch { return null; }
  }
  function toast(m) {
    var t = document.getElementById("vmpToast");
    t.textContent = m; t.classList.add("show");
    clearTimeout(t._tm); t._tm = setTimeout(function () { t.classList.remove("show"); }, 2600);
  }
  var ST_FA = { open: "باز", answered: "پاسخ داده شد", closed: "بسته", pending: "در انتظار", approved: "تایید شد", rejected: "رد شد" };

  async function renderMyTickets() {
    var box = document.getElementById("myTickets");
    if (!box) return;
    var s = session();
    if (!s) { box.innerHTML = ""; return; }
    var all = await window.VmpDB.listTickets();
    var mine = all.filter(function (t) {
      return (t.user_email && s.email && t.user_email.toLowerCase() === String(s.email).toLowerCase()) ||
        (t.user_name && t.user_name === s.name);
    });
    box.innerHTML = mine.length ? mine.map(function (t) {
      return '<div class="va-card"><span class="badge b-' + t.status + '">' + (ST_FA[t.status] || t.status) + '</span>' +
        '<h4>' + esc(t.subject) + '</h4><p>' + esc(t.body) + '</p>' +
        (t.answer ? '<div class="va-ans">✅ پاسخ مدیر:<br>' + esc(t.answer) + '</div>' : '<div class="va-meta">منتظر پاسخ مدیر...</div>') + '</div>';
    }).join("") : '<div class="empty">هنوز تیکتی ثبت نکردی</div>';
  }

  async function renderBlog() {
    var box = document.getElementById("blogList");
    if (!box) return;
    var news = await window.VmpDB.listNews();
    box.innerHTML = news.length ? news.map(function (n) {
      return '<div class="shop-card"><b>' + esc(n.title) + '</b><span>' + esc(n.body) + '</span></div>';
    }).join("") : '<p>به‌زودی...</p>';
  }
  window.renderVmpBlog = renderBlog;

  function refreshSupport() {
    var s = session();
    var form = document.getElementById("ticketForm");
    var hint = document.getElementById("supportHint");
    if (!form) return;
    form.hidden = !s;
    if (hint) hint.textContent = s ? ("سلام " + s.name + "! تیکتت رو بفرست 🎫") : "برای ثبت تیکت اول وارد حساب کاربری شو 👤";
    renderMyTickets();
  }
  window.refreshVmpSupport = refreshSupport;

  function faPrice(p) {
    p = Number(p) || 0;
    return p > 0 ? p.toLocaleString("fa-IR") + " تومان" : "رایگان";
  }

  async function renderShop() {
    var box = document.getElementById("shopList");
    if (!box) return;
    var items = await window.VmpDB.listItems();
    if (!items.length) return; // fallback: static HTML stays
    box.innerHTML = items.map(function (it) {
      var avail = it.in_stock !== false;
      return '<div class="shop-card' + (avail ? "" : " out") + '">' +
        (avail ? "" : '<span class="badge b-rejected">ناموجود</span>') +
        '<b>' + esc(it.title) + '</b><span>' + esc(it.sub || "") + '</span>' +
        '<span class="price">' + faPrice(it.price) + '</span>' +
        '<button class="btn primary small" data-buy="' + it.id + '"' + (avail ? "" : " disabled") + '>' +
        (avail ? "خرید" : "ناموجود") + '</button></div>';
    }).join("");
  }
  window.renderVmpShop = renderShop;

  document.addEventListener("DOMContentLoaded", function () {
    refreshSupport(); renderBlog(); renderShop();
    var vaMode = document.getElementById("vaMode");
    if (vaMode) vaMode.textContent = "منبع: " + (window.VmpDB ? window.VmpDB.mode : "?");

    var f = document.getElementById("ticketForm");
    if (f) f.addEventListener("submit", async function (e) {
      e.preventDefault();
      var s = session();
      if (!s) { toast("اول وارد حساب شو 👤"); return; }
      var sub = document.getElementById("tkSubject").value.trim();
      var body = document.getElementById("tkBody").value.trim();
      if (!sub || !body) return;
      await window.VmpDB.addTicket({ user_name: s.name, user_email: s.email || "", subject: sub, body: body });
      f.reset(); toast("تیکت ارسال شد ✅");
      renderMyTickets();
    });

    // shop order buttons (delegation — list re-renders from DB)
    document.addEventListener("click", async function (e) {
      var b = e.target.closest("[data-buy]");
      if (!b || b.disabled) return;
      var s = session();
      if (!s) { toast("برای خرید اول وارد حساب شو 👤"); return; }
      var card = b.closest(".shop-card");
      var items = await window.VmpDB.listItems();
      var it = items.find(function (x) { return String(x.id) === b.dataset.buy; });
      if (!it) return;
      if (it.in_stock === false) { toast("این آیتم ناموجود است", true); renderShop(); return; }
      await window.VmpDB.addOrder({ user_name: s.name, user_email: s.email || "", plan: it.title, price: it.price });
      toast("سفارش «" + it.title + "» ثبت شد 🛒");
    });

    // keep support fresh after login/logout (auth modal events bubble up)
    setInterval(refreshSupport, 3000);
  });
})();
