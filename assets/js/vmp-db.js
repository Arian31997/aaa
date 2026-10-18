// ===== VMP database layer: Supabase (if vmp.sql was run) with localStorage fallback =====
// Tables: vmp_tickets / vmp_news / vmp_orders / vmp_items / vmp_admins  (local keys mirror them for offline demo)
(function () {
  var LS = { tickets: "hima_vmp_tickets", news: "hima_vmp_news", orders: "hima_vmp_orders", items: "hima_vmp_items", admins: "hima_vmp_admins" };
  // manager seed: email + SHA-256 hex only (plaintext password is nowhere in the repo)
  var ADMIN_SEED = { email: "admin@himalaya.admin", hash: "2f9d535fd575e3bb5986eec43bf4d06d32412845460b558ff4a210fb1242dc9b" };
  var DEFAULT_ITEMS = [
    { title: "اشتراک برنزی", sub: "۳۰ روزه", price: 99000 },
    { title: "اشتراک طلایی", sub: "۳۰ روزه + کیت ویژه", price: 249000 },
    { title: "اشتراک نقره‌ای", sub: "۳۰ روزه", price: 149000 }
  ];
  var sb = null, sbDead = false;
  try {
    if (window.supabase && window.APP_CONFIG && window.APP_CONFIG.SUPABASE_URL) {
      sb = window.supabase.createClient(window.APP_CONFIG.SUPABASE_URL, window.APP_CONFIG.SUPABASE_KEY);
    }
  } catch { sb = null; }

  function uid() {
    return "xxxxxxxx-xxxx-4xxx".replace(/x/g, function () {
      return ((Math.random() * 16) | 0).toString(16);
    });
  }
  function read(k) { ensureSeed(); try { return JSON.parse(localStorage.getItem(k) || "[]"); } catch { return []; } }
  function write(k, v) { localStorage.setItem(k, JSON.stringify(v)); }

  // seed demo content (idempotent + lazy: runs on load and before every local read)
  var _seeding = false;
  function ensureSeed() {
    if (_seeding) return; _seeding = true;
    try {
      if (!localStorage.getItem("hima_vmp_seeded")) {
        if (!rawRead(LS.news).length) {
          write(LS.news, [{ id: uid(), title: "آپدیت جدید سرور", body: "ایونت آخر هفته + قوانین جدید وایت‌لیست اضافه شد.", created_at: new Date().toISOString() }]);
        }
        localStorage.setItem("hima_vmp_seeded", "1");
      }
      if (!localStorage.getItem("hima_vmp_items_seeded")) {
        if (!rawRead(LS.items).length) {
          write(LS.items, DEFAULT_ITEMS.map(function (d) {
            return { id: uid(), title: d.title, sub: d.sub, price: d.price, in_stock: true, created_at: new Date().toISOString() };
          }));
        }
        localStorage.setItem("hima_vmp_items_seeded", "1");
      }
      if (!localStorage.getItem("hima_vmp_admin_seeded")) {
        write(LS.admins, [ADMIN_SEED]);
        localStorage.setItem("hima_vmp_admin_seeded", "1");
      }
    } finally { _seeding = false; }
  }
  function rawRead(k) { try { return JSON.parse(localStorage.getItem(k) || "[]"); } catch { return []; } }
  ensureSeed();

  async function sha256hex(text) {
    if (crypto.subtle && window.isSecureContext !== false) {
      try {
        var buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
        return Array.prototype.map.call(new Uint8Array(buf), function (b) { return b.toString(16).padStart(2, "0"); }).join("");
      } catch {}
    }
    // fallback (non-secure contexts): simple hash, matches only local demo rows
    var h1 = 0x811c9dc5;
    for (var i = 0; i < text.length; i++) { h1 ^= text.charCodeAt(i); h1 = Math.imul(h1, 0x01000193) >>> 0; }
    return "fb" + h1.toString(16);
  }

  function withTimeout(p, ms) {
    return Promise.race([p, new Promise(function (_, rej) {
      setTimeout(function () { rej(new Error("db-timeout")); }, ms || 6000);
    })]);
  }
  async function sbTry(fn) {
    if (!sb || sbDead) return { fallback: true };
    try {
      var r = await withTimeout(fn(sb), 6000);
      if (r && r.error) { sbDead = true; return { fallback: true, error: r.error }; }
      return r;
    }
    catch (e) { sbDead = true; return { fallback: true, error: e }; }
  }

  window.VmpDB = {
    mode: sb ? "supabase+local" : "local",
    // ---- tickets ----
    async addTicket(t) {
      var row = { user_name: t.user_name, user_email: t.user_email, subject: t.subject, body: t.body, status: "open", answer: null };
      var r = await sbTry(function (c) { return c.from("vmp_tickets").insert(row).select().single(); });
      if (!r.fallback && !r.error) return r.data;
      var all = read(LS.tickets);
      var local = Object.assign({ id: uid(), created_at: new Date().toISOString() }, row);
      all.unshift(local); write(LS.tickets, all);
      return local;
    },
    async listTickets() {
      var r = await sbTry(function (c) { return c.from("vmp_tickets").select("*").order("created_at", { ascending: false }); });
      if (!r.fallback && !r.error && r.data) return r.data;
      return read(LS.tickets);
    },
    async updateTicket(id, patch) {
      var r = await sbTry(function (c) { return c.from("vmp_tickets").update(patch).eq("id", id); });
      if (!r.fallback && !r.error) return true;
      var all = read(LS.tickets).map(function (t) { return t.id === id ? Object.assign({}, t, patch) : t; });
      write(LS.tickets, all);
      return true;
    },
    async deleteTicket(id) {
      var r = await sbTry(function (c) { return c.from("vmp_tickets").delete().eq("id", id); });
      if (!r.fallback && !r.error) return true;
      write(LS.tickets, read(LS.tickets).filter(function (t) { return t.id !== id; }));
      return true;
    },
    // ---- news ----
    async addNews(n) {
      var r = await sbTry(function (c) { return c.from("vmp_news").insert({ title: n.title, body: n.body }).select().single(); });
      if (!r.fallback && !r.error) return r.data;
      var all = read(LS.news);
      var local = { id: uid(), title: n.title, body: n.body, created_at: new Date().toISOString() };
      all.unshift(local); write(LS.news, all);
      return local;
    },
    async listNews() {
      var r = await sbTry(function (c) { return c.from("vmp_news").select("*").order("created_at", { ascending: false }); });
      if (!r.fallback && !r.error && r.data) return r.data;
      return read(LS.news);
    },
    async deleteNews(id) {
      var r = await sbTry(function (c) { return c.from("vmp_news").delete().eq("id", id); });
      if (!r.fallback && !r.error) return true;
      write(LS.news, read(LS.news).filter(function (n) { return n.id !== id; }));
      return true;
    },
    // ---- orders ----
    async addOrder(o) {
      var row = { user_name: o.user_name, user_email: o.user_email, plan: o.plan, price: o.price | 0, status: "pending" };
      var r = await sbTry(function (c) { return c.from("vmp_orders").insert(row).select().single(); });
      if (!r.fallback && !r.error) return r.data;
      var all = read(LS.orders);
      var local = Object.assign({ id: uid(), created_at: new Date().toISOString() }, row);
      all.unshift(local); write(LS.orders, all);
      return local;
    },
    async listOrders() {
      var r = await sbTry(function (c) { return c.from("vmp_orders").select("*").order("created_at", { ascending: false }); });
      if (!r.fallback && !r.error && r.data) return r.data;
      return read(LS.orders);
    },
    async updateOrder(id, patch) {
      var r = await sbTry(function (c) { return c.from("vmp_orders").update(patch).eq("id", id); });
      if (!r.fallback && !r.error) return true;
      var all = read(LS.orders).map(function (o) { return o.id === id ? Object.assign({}, o, patch) : o; });
      write(LS.orders, all);
      return true;
    },
    async deleteOrder(id) {
      var r = await sbTry(function (c) { return c.from("vmp_orders").delete().eq("id", id); });
      if (!r.fallback && !r.error) return true;
      write(LS.orders, read(LS.orders).filter(function (o) { return o.id !== id; }));
      return true;
    },
    // ---- shop items ----
    async listItems() {
      var r = await sbTry(function (c) { return c.from("vmp_items").select("*").order("created_at", { ascending: false }); });
      if (!r.fallback && !r.error && r.data) return r.data;
      return read(LS.items);
    },
    async addItem(it) {
      var row = { title: it.title, sub: it.sub || "", price: it.price | 0, in_stock: it.in_stock !== false };
      var r = await sbTry(function (c) { return c.from("vmp_items").insert(row).select().single(); });
      if (!r.fallback && !r.error) return r.data;
      var all = read(LS.items);
      var local = Object.assign({ id: uid(), created_at: new Date().toISOString() }, row);
      all.unshift(local); write(LS.items, all);
      return local;
    },
    async updateItem(id, patch) {
      var r = await sbTry(function (c) { return c.from("vmp_items").update(patch).eq("id", id); });
      if (!r.fallback && !r.error) return true;
      var all = read(LS.items).map(function (x) { return x.id === id ? Object.assign({}, x, patch) : x; });
      write(LS.items, all);
      return true;
    },
    async deleteItem(id) {
      var r = await sbTry(function (c) { return c.from("vmp_items").delete().eq("id", id); });
      if (!r.fallback && !r.error) return true;
      write(LS.items, read(LS.items).filter(function (x) { return x.id !== id; }));
      return true;
    },
    // ---- manager login (DB, hashed) ----
    async checkAdmin(email, plainPass) {
      var hash = await sha256hex(String(plainPass || ""));
      var r = await sbTry(function (c) { return c.rpc("vmp_admin_check", { p_email: email, p_hash: hash }); });
      if (!r.fallback && !r.error) return r.data === true;
      return read(LS.admins).some(function (a) { return a.email === email && a.hash === hash; });
    }
  };
})();
