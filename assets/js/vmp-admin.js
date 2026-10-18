// ===== پنل مدیریت داخل سایت VMP: تیکت / کاربر / وبلاگ / سفارش =====
(function () {
  var panel = null, tab = "tickets";
  var STATUS_FA = { open: "باز", answered: "پاسخ داده شد", closed: "بسته", pending: "در انتظار", approved: "تایید شد", rejected: "رد شد" };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function isAdmin() {
    try {
      var s = JSON.parse(localStorage.getItem("hima_vmp_session") || "null");
      return s && s.role === "admin";
    } catch { return false; }
  }
  function toast(msg) {
    var t = document.getElementById("vmpToast");
    t.textContent = msg; t.classList.add("show");
    clearTimeout(t._tm); t._tm = setTimeout(function () { t.classList.remove("show"); }, 2600);
  }

  function ticketCard(t) {
    return '<div class="va-card"><span class="badge b-' + t.status + '">' + (STATUS_FA[t.status] || t.status) + '</span>' +
      '<h4>' + esc(t.subject) + '</h4>' +
      '<p>' + esc(t.body) + '</p>' +
      '<div class="va-meta">' + esc(t.user_name) + ' · <span dir="ltr">' + esc(t.user_email) + '</span></div>' +
      (t.answer ? '<div class="va-ans">✅ پاسخ مدیر:<br>' + esc(t.answer) + '</div>' : '') +
      '<div class="va-reply" id="vr-' + t.id + '" hidden>' +
      '<textarea id="vrt-' + t.id + '" placeholder="پاسخت را اینجا بنویس..." maxlength="1000"></textarea>' +
      '<div class="va-row"><button class="va-btn ok" data-t-send="' + t.id + '">ارسال پاسخ ✅</button>' +
      '<button class="va-btn" data-t-cancel="' + t.id + '">انصراف</button></div></div>' +
      '<div class="va-row">' +
      '<button class="va-btn ok" data-t-ans="' + t.id + '">پاسخ</button>' +
      '<button class="va-btn" data-t-close="' + t.id + '">بستن</button>' +
      '<button class="va-btn danger" data-t-del="' + t.id + '">حذف</button>' +
      '</div></div>';
  }

  async function render() {
    if (!panel || panel.hidden) return;
    var res = await Promise.all([window.VmpDB.listTickets(), window.VmpDB.listNews(), window.VmpDB.listOrders(), window.VmpDB.listItems()]);
    var tickets = res[0], news = res[1], orders = res[2], items = res[3];
    var users = [];
    try { users = JSON.parse(localStorage.getItem("hima_vmp_users") || "[]"); } catch { users = []; }

    var open = tickets.filter(function (t) { return t.status === "open"; }).length;
    document.getElementById("vaStats").innerHTML =
      '<div class="va-stat"><b>' + open + '</b><span>تیکت باز</span></div>' +
      '<div class="va-stat"><b>' + users.length + '</b><span>کاربر</span></div>' +
      '<div class="va-stat"><b>' + items.length + '</b><span>آیتم فروشگاه</span></div>' +
      '<div class="va-stat"><b>' + news.length + '</b><span>پست وبلاگ</span></div>' +
      '<div class="va-stat"><b>' + orders.filter(function (o) { return o.status === "pending"; }).length + '</b><span>سفارش در انتظار</span></div>';

    document.querySelectorAll(".va-tab").forEach(function (b) {
      b.classList.toggle("active", b.dataset.va === tab);
    });
    ["tickets", "users", "items", "news", "orders"].forEach(function (n) {
      document.getElementById("va-" + n).hidden = (n !== tab);
    });

    document.getElementById("va-tickets").innerHTML = tickets.length
      ? tickets.map(ticketCard).join("") : '<div class="empty">تیکتی ثبت نشده 🎫</div>';

    document.getElementById("va-users").innerHTML = users.length ? users.map(function (u) {
      return '<div class="va-card"><h4 dir="ltr">' + esc(u.name) + '</h4>' +
        '<div class="va-meta"><span dir="ltr">' + esc(u.mail) + '</span> · ' + esc(u.phone || "") +
        (u.discord ? ' · 🎮 <span dir="ltr">' + esc(u.discord) + '</span>' : '') +
        (u.steam ? ' · 🎯 <span dir="ltr">' + esc(u.steam) + '</span>' : '') + '</div>' +
        '<div class="va-row"><button class="va-btn danger" data-u-del="' + esc(u.name) + '">حذف کاربر</button></div></div>';
    }).join("") : '<div class="empty">کاربری ثبت‌نام نکرده</div>';

    document.getElementById("va-news").innerHTML =
      '<form class="va-form" id="vaNewsForm"><input id="vaNewsTitle" placeholder="عنوان پست" maxlength="80" required>' +
      '<textarea id="vaNewsBody" placeholder="متن (۲-۳ خط)" maxlength="300" required></textarea>' +
      '<button class="va-btn ok" type="submit">انتشار در وبلاگ</button></form>' +
      (news.length ? news.map(function (n) {
        return '<div class="va-card"><h4>' + esc(n.title) + '</h4><p>' + esc(n.body) + '</p>' +
          '<div class="va-row"><button class="va-btn danger" data-n-del="' + n.id + '">حذف</button></div></div>';
      }).join("") : '<div class="empty">پستی نیست</div>');

    document.getElementById("va-orders").innerHTML = orders.length ? orders.map(function (o) {
      return '<div class="va-card"><span class="badge b-' + o.status + '">' + (STATUS_FA[o.status] || o.status) + '</span>' +
        '<h4>' + esc(o.plan) + ' — ' + esc(o.user_name) + '</h4>' +
        '<div class="va-meta"><span dir="ltr">' + esc(o.user_email) + '</span>' + (o.price ? ' · ' + Number(o.price).toLocaleString("fa-IR") + ' تومان' : '') + '</div>' +
        '<div class="va-row"><button class="va-btn ok" data-o-ok="' + o.id + '">✔ تایید</button>' +
        '<button class="va-btn" data-o-no="' + o.id + '">✖ رد</button>' +
        '<button class="va-btn danger" data-o-del="' + o.id + '">حذف</button></div></div>';
    }).join("") : '<div class="empty">سفارشی ثبت نشده</div>';

    document.getElementById("va-items").innerHTML =
      '<form class="va-form" id="vaItemForm"><input id="vaItemTitle" placeholder="نام آیتم (مثلاً اشتراک طلایی)" maxlength="60" required>' +
      '<input id="vaItemSub" placeholder="توضیح کوتاه (مثلاً ۳۰ روزه)" maxlength="80">' +
      '<input id="vaItemPrice" type="number" min="0" step="1000" placeholder="قیمت (تومان)" required>' +
      '<button class="va-btn ok" type="submit">+ افزودن آیتم</button></form>' +
      (items.length ? items.map(function (it) {
        var avail = it.in_stock !== false;
        return '<div class="va-card"><span class="badge ' + (avail ? 'b-approved' : 'b-rejected') + '">' + (avail ? 'موجود' : 'ناموجود') + '</span>' +
          '<h4>' + esc(it.title) + '</h4>' +
          '<div class="va-meta">' + esc(it.sub || "") + (it.price ? ' · ' + Number(it.price).toLocaleString("fa-IR") + ' تومان' : ' · رایگان') + '</div>' +
          '<div class="va-row"><button class="va-btn" data-i-stock="' + it.id + '" data-v="' + (!avail) + '">' + (avail ? 'ناموجود کن' : 'موجود کن') + '</button>' +
          '<button class="va-btn danger" data-i-del="' + it.id + '">حذف</button></div></div>';
      }).join("") : '<div class="empty">آیتمی نیست — از فرم بالا اضافه کن</div>');

    var nf = document.getElementById("vaNewsForm");
    if (nf) nf.onsubmit = async function (e) {
      e.preventDefault();
      await window.VmpDB.addNews({ title: document.getElementById("vaNewsTitle").value.trim(), body: document.getElementById("vaNewsBody").value.trim() });
      toast("منتشر شد ✅"); render();
      if (typeof window.renderVmpBlog === "function") window.renderVmpBlog();
    };
    var itf = document.getElementById("vaItemForm");
    if (itf) itf.onsubmit = async function (e) {
      e.preventDefault();
      var title = document.getElementById("vaItemTitle").value.trim();
      var sub = document.getElementById("vaItemSub").value.trim();
      var price = parseInt(document.getElementById("vaItemPrice").value, 10) || 0;
      if (!title) return;
      await window.VmpDB.addItem({ title: title, sub: sub, price: price, in_stock: true });
      toast("آیتم اضافه شد ✅"); render();
      if (typeof window.renderVmpShop === "function") window.renderVmpShop();
    };
  }

  function open() {
    if (!isAdmin()) { toast("فقط مدیر می‌تونه وارد پنل بشه 🛡"); return; }
    panel.removeAttribute("hidden");
    document.body.style.overflow = "hidden";
    render();
  }
  function close() { panel.setAttribute("hidden", ""); document.body.style.overflow = ""; }

  document.addEventListener("DOMContentLoaded", function () {
    panel = document.getElementById("adminPanel");
    if (!panel) return;
    panel.addEventListener("click", async function (e) {
      var q = function (s) { return e.target.closest(s); };
      var t;
      if (q("#vaClose") || e.target === panel) { close(); return; }
      var tb = q("[data-va]");
      if (tb) { tab = tb.dataset.va; render(); return; }
      if ((t = q("[data-t-del]"))) { await window.VmpDB.deleteTicket(t.dataset.tDel); toast("حذف شد"); render(); return; }
      if ((t = q("[data-t-close]"))) { await window.VmpDB.updateTicket(t.dataset.tClose, { status: "closed" }); toast("بسته شد"); render(); return; }
      if ((t = q("[data-t-ans]"))) {
        var box = document.getElementById("vr-" + t.dataset.tAns);
        if (box) { box.hidden = false; var ta = box.querySelector("textarea"); if (ta) ta.focus(); }
        return;
      }
      if ((t = q("[data-t-cancel]"))) {
        var box2 = document.getElementById("vr-" + t.dataset.tCancel);
        if (box2) box2.hidden = true;
        return;
      }
      if ((t = q("[data-t-send]"))) {
        var ta2 = document.getElementById("vrt-" + t.dataset.tSend);
        var a = ta2 ? ta2.value.trim() : "";
        if (!a) { toast("اول پاسخ را بنویس", true); return; }
        await window.VmpDB.updateTicket(t.dataset.tSend, { answer: a, status: "answered" });
        toast("پاسخ ثبت شد ✅"); render(); return;
      }
      if ((t = q("[data-n-del]"))) { await window.VmpDB.deleteNews(t.dataset.nDel); toast("حذف شد"); render(); if (typeof window.renderVmpBlog === "function") window.renderVmpBlog(); return; }
      if ((t = q("[data-i-del]"))) { await window.VmpDB.deleteItem(t.dataset.iDel); toast("آیتم حذف شد"); render(); if (typeof window.renderVmpShop === "function") window.renderVmpShop(); return; }
      if ((t = q("[data-i-stock]"))) {
        await window.VmpDB.updateItem(t.dataset.iStock, { in_stock: t.dataset.v === "true" });
        toast(t.dataset.v === "true" ? "موجود شد ✅" : "ناموجود شد"); render();
        if (typeof window.renderVmpShop === "function") window.renderVmpShop(); return;
      }
      if ((t = q("[data-o-ok]"))) { await window.VmpDB.updateOrder(t.dataset.oOk, { status: "approved" }); toast("تایید شد"); render(); return; }
      if ((t = q("[data-o-no]"))) { await window.VmpDB.updateOrder(t.dataset.oNo, { status: "rejected" }); toast("رد شد"); render(); return; }
      if ((t = q("[data-o-del]"))) { await window.VmpDB.deleteOrder(t.dataset.oDel); toast("حذف شد"); render(); return; }
      if ((t = q("[data-u-del]"))) {
        if (!confirm("کاربر حذف شود؟")) return;
        try {
          var us = JSON.parse(localStorage.getItem("hima_vmp_users") || "[]");
          localStorage.setItem("hima_vmp_users", JSON.stringify(us.filter(function (u) { return u.name !== t.dataset.uDel; })));
        } catch {}
        toast("کاربر حذف شد"); render(); return;
      }
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !panel.hidden) close(); });
  });

  window.VmpAdmin = { open: open, close: close, render: render };
})();
