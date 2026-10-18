// ===== Himalaya VMP: ثبت‌نام / ورود کاربر / ورود مدیریت =====
(function () {
  var wrap = document.getElementById("authWrap");
  var LS_USERS = "hima_vmp_users";
  var LS_SESSION = "hima_vmp_session";

  function toast(msg) {
    var t = document.getElementById("vmpToast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._tm);
    t._tm = setTimeout(function () { t.classList.remove("show"); }, 2600);
  }
  function loadUsers() {
    try { return JSON.parse(localStorage.getItem(LS_USERS) || "[]"); }
    catch { return []; }
  }
  function saveUsers(u) { localStorage.setItem(LS_USERS, JSON.stringify(u)); }
  function getSession() {
    try { return JSON.parse(localStorage.getItem(LS_SESSION) || "null"); }
    catch { return null; }
  }
  function setSession(s) {
    if (s) localStorage.setItem(LS_SESSION, JSON.stringify(s));
    else localStorage.removeItem(LS_SESSION);
  }

  function openAuth(tab) {
    if (tab) switchTab(tab);
    var s = getSession();
    if (s) { showAccount(s); }
    else {
      showForms();
      // کادر ورود مدیریت همیشه خالی باز شود (جلوگیری از اتوفیل مرورگر)
      var am = document.getElementById("aMail"), ap = document.getElementById("aPass");
      if (am) am.value = ""; if (ap) ap.value = "";
    }
    wrap.removeAttribute("hidden");
    document.body.style.overflow = "hidden";
  }
  function closeAuth() { wrap.setAttribute("hidden", ""); document.body.style.overflow = ""; }

  function switchTab(name) {
    document.querySelectorAll("[data-auth-tab]").forEach(function (b) {
      b.classList.toggle("active", b.dataset.authTab === name);
    });
    ["register", "login", "admin"].forEach(function (n) {
      document.getElementById(n + "View").hidden = (n !== name);
    });
    document.getElementById("accountView").hidden = true;
  }
  function showForms() {
    document.getElementById("accountView").hidden = true;
    document.getElementById("accPanel").hidden = true;
    document.getElementById("accMember").hidden = true;
    var active = document.querySelector("[data-auth-tab].active");
    switchTab(active ? active.dataset.authTab : "register");
  }
  function showAccount(s) {
    ["registerView", "loginView", "adminView"].forEach(function (id) {
      document.getElementById(id).hidden = true;
    });
    var acc = document.getElementById("accountView");
    acc.hidden = false;
    var isAdmin = s.role === "admin";
    document.getElementById("accTitle").textContent = isAdmin ? "🛡 پنل مدیریت" : ("خوش آمدی " + s.name + " 👋");
    document.getElementById("accSub").textContent = isAdmin ? s.email : (s.email || s.phone || "");
    document.getElementById("accBox").innerHTML = isAdmin
      ? "با ایمیل <b dir='ltr'>" + s.email + "</b> وارد شدی.<br>پنل مدیریت داخل همین سایت VMP باز می‌شود."
      : "نام کاربری: <b dir='ltr'>" + s.name + "</b><br>حالا می‌تونی وارد شهر بشی 🚪";
    document.getElementById("accPanel").hidden = !isAdmin;
    document.getElementById("accMember").hidden = isAdmin;
    renderChip();
    if (typeof window.refreshVmpSupport === "function") window.refreshVmpSupport();
  }
  function renderChip() {
    var s = getSession(), chip = document.getElementById("userChip");
    if (!chip) return;
    if (s) { chip.hidden = false; chip.textContent = (s.role === "admin" ? "🛡 " : "👤 ") + s.name; }
    else chip.hidden = true;
  }

  // ---- رویدادها ----
  document.addEventListener("click", function (e) {
    var go = e.target.closest("[data-goto-register]");
    if (go) { openAuth("register"); return; }
    if (e.target.closest("#profileBtn") || e.target.closest("#userChip")) {
      var s = getSession();
      if (s && s.role !== "admin" && window.VmpMember) { window.VmpMember.open(); return; }
      openAuth(s ? null : "login"); return;
    }
    var tab = e.target.closest("[data-auth-tab]");
    if (tab) { showForms(); switchTab(tab.dataset.authTab); return; }
    var sw = e.target.closest("[data-switch]");
    if (sw) { e.preventDefault(); showForms(); switchTab(sw.dataset.switch); return; }
    if (e.target.closest("#authClose") || e.target.classList.contains("auth-bg")) { closeAuth(); return; }
    if (e.target.closest("#logoutBtn")) {
      setSession(null); renderChip(); showForms(); switchTab("login");
      if (typeof window.refreshVmpSupport === "function") window.refreshVmpSupport();
      toast("از حساب خارج شدی"); return;
    }
    if (e.target.closest("#accPanel")) {
      closeAuth();
      if (window.VmpAdmin) window.VmpAdmin.open();
      return;
    }
    if (e.target.closest("#accMember")) {
      closeAuth();
      if (window.VmpMember) window.VmpMember.open();
      return;
    }
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeAuth(); });

  // ---- ثبت‌نام ----
  document.getElementById("registerForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var err = document.getElementById("rErr"); err.textContent = "";
    var name = document.getElementById("rName").value.trim();
    var phone = document.getElementById("rPhone").value.trim();
    var mail = document.getElementById("rMail").value.trim().toLowerCase();
    var p1 = document.getElementById("rPass").value;
    var p2 = document.getElementById("rPass2").value;
    if (name.length < 3) return err.textContent = "نام کاربری حداقل ۳ حرف باشد";
    if (!phone) return err.textContent = "شماره موبایل لازم است";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) return err.textContent = "ایمیل معتبر نیست";
    if (p1.length < 6) return err.textContent = "رمز حداقل ۶ کاراکتر باشد";
    if (p1 !== p2) return err.textContent = "تکرار رمز با رمز یکی نیست";
    var users = loadUsers();
    if (users.some(function (u) { return u.name.toLowerCase() === name.toLowerCase() || u.mail === mail; }))
      return err.textContent = "این نام کاربری یا ایمیل قبلاً ثبت شده؛ وارد شو";
    users.push({ name: name, phone: phone, mail: mail, pass: btoa(p1), at: Date.now() });
    saveUsers(users);
    toast("حسابت ساخته شد! حالا وارد شو 🎉");
    showForms(); switchTab("login");
    document.getElementById("lId").value = name;
  });

  // ---- ورود کاربر ----
  document.getElementById("loginForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var err = document.getElementById("lErr"); err.textContent = "";
    var id = document.getElementById("lId").value.trim().toLowerCase();
    var p = document.getElementById("lPass").value;
    var u = loadUsers().find(function (x) {
      return x.name.toLowerCase() === id || x.mail === id;
    });
    if (!u || u.pass !== btoa(p)) return err.textContent = "نام کاربری یا رمز اشتباه است";
    var s = { role: "user", name: u.name, email: u.mail, phone: u.phone };
    setSession(s); showAccount(s);
    toast("خوش آمدی " + u.name + "! 👋");
  });

  // ---- ورود مدیریت (ایمیل + رمز ذخیره‌شده در دیتابیس) ----
  document.getElementById("adminForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    var err = document.getElementById("aErr"); err.textContent = "";
    var mail = document.getElementById("aMail").value.trim();
    var pass = document.getElementById("aPass").value;
    var btn = this.querySelector('[type="submit"]');
    btn.disabled = true;
    var ok = false;
    try { ok = await window.VmpDB.checkAdmin(mail, pass); }
    catch { ok = false; }
    btn.disabled = false;
    if (ok) {
      var s = { role: "admin", name: "مدیر", email: mail };
      setSession(s); showAccount(s);
      toast("ورود مدیریت موفق 🛡");
    } else {
      err.textContent = "ایمیل یا رمز مدیریت اشتباه است";
    }
  });

  renderChip();

  // هایلایت منو با اسکرول
  var links = Array.prototype.slice.call(document.querySelectorAll(".pill-nav a"));
  var secs = links.map(function (a) { return document.querySelector(a.getAttribute("href")); }).filter(Boolean);
  window.addEventListener("scroll", function () {
    var y = window.scrollY + 140, cur = secs[0];
    secs.forEach(function (s) { if (s.offsetTop <= y) cur = s; });
    links.forEach(function (a) { a.classList.toggle("active", cur && a.getAttribute("href") === "#" + cur.id); });
  }, { passive: true });
})();
