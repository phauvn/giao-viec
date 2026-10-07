(function () {
  var cfg = window.APP_CONFIG || {};
  var S = { me: null, users: [], tasks: [], statuses: [], priorities: [], view: 'dash', f: { q: '', user: '', status: '' }, ready: false, lim: 80, rp: 'year', rg: '', ru: '' };
  var $ = function (id) { return document.getElementById(id); };
  var theme = 'dark'; try { theme = localStorage.getItem('gv_theme') || 'dark'; } catch (e) { /* ignore */ }
  document.documentElement.dataset.theme = theme;
  function toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('gv_theme', theme); } catch (e) { /* ignore */ }
    render();
  }
  var sKey = { 'Chờ phân công': 'pending', 'Mới': 'new', 'Đang làm': 'doing', 'Chờ duyệt': 'review', 'Hoàn thành': 'done' };

  // ---------- Tiện ích ----------
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ymd(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function today() { return ymd(new Date()); }
  function diffDays(s) { var a = new Date(String(s).slice(0, 10) + 'T00:00:00'), b = new Date(today() + 'T00:00:00'); return Math.round((a - b) / 86400000); }
  function fmtDate(s) { s = String(s || '').slice(0, 10); return s ? s.split('-').reverse().join('/') : 'Chưa đặt hạn'; }
  function fmtTime(s) { s = String(s || ''); return s ? s.slice(8, 10) + '/' + s.slice(5, 7) + ' ' + s.slice(11, 16) : ''; }
  function initials(n) { var p = String(n || '?').trim().split(/\s+/); return (p.length > 1 ? p[p.length - 2][0] + p[p.length - 1][0] : p[0].slice(0, 2)).toUpperCase(); }
  function user(email) { return S.users.filter(function (u) { return String(u.email).toLowerCase() === String(email).toLowerCase(); })[0]; }
  function uname(email) { if (!email) return 'Chưa giao'; var u = user(email); return u && u.name ? u.name : email; }
  function shortName(n) { var p = String(n).split(/\s+/); return p.length > 2 ? p.slice(-2).join(' ') : n; }
  function isOpen(t) { return t.status !== 'Hoàn thành'; }
  function isLate(t) { return isOpen(t) && t.due && diffDays(t.due) < 0; }
  var IC = {
    dash: '<path d="M3 13h6V3H3zM15 21h6V11h-6zM3 21h6v-4H3zM15 7h6V3h-6z"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    kan: '<rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="12" rx="1"/><rect x="17" y="3" width="4" height="8" rx="1"/>',
    mine: '<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.4 3.2-5.5 6.5-5.5s5.9 2.1 6.5 5.5M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c2 .6 3.2 2.2 3.5 4.7"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
    out: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    repeat: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>'
  };
  function ic(n) { return '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">' + IC[n] + '</svg>'; }

  function toast(msg, bad) {
    var el = $('toast'); el.textContent = msg; el.className = 'toast' + (bad ? ' bad' : ''); el.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(function () { el.hidden = true; }, 3600);
  }

  // ---------- Đăng nhập ----------
  function jwtExp(tok) { try { return JSON.parse(atob(tok.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).exp * 1000; } catch (e) { return 0; } }
  function saveTok(t) { Api.token = t; try { localStorage.setItem('gv_tok', t); } catch (e) { /* ignore */ } }
  function logout() {
    Api.token = ''; try { localStorage.removeItem('gv_tok'); } catch (e) { /* ignore */ }
    S.ready = false; closeDrawer(); loginView();
  }

  function loginView(msg) {
    var demo = Api.demo;
    $('app').innerHTML =
      '<div class="login"><section class="l"><div>' +
      '<svg class="cable" viewBox="-10 0 440 60" aria-hidden="true"><path d="M4 30h412" stroke="#3b4d6b" stroke-width="2"/><path d="M4 30h262" stroke="#6fa0ff" stroke-width="2"/>' +
      [4, 108, 212, 316, 416].map(function (x, i) { return '<circle cx="' + x + '" cy="30" r="7" fill="' + (i < 3 ? '#6fa0ff' : '#0e1b2e') + '" stroke="' + (i < 3 ? '#6fa0ff' : '#3b4d6b') + '" stroke-width="2"/>'; }).join('') + '</svg></div>' +
      '<div><h1>Giao việc Kỹ thuật - Đầu tư</h1><p>Giao việc, theo dõi tiến độ và duyệt kết quả của cả phòng trên một màn hình.</p></div></section>' +
      '<section class="r"><h2>Đăng nhập</h2>' +
      (demo ? '<p class="note">Đây là bản xem thử với dữ liệu mẫu. Chưa kết nối Google Sheet.</p>' +
        '<button class="btn primary" id="dA">Xem với vai trò trưởng phòng</button><button class="btn" id="dS">Xem với vai trò nhân viên</button>'
        : '<p class="note">Dùng tài khoản Gmail đã được trưởng phòng cấp quyền.</p><div id="gbtn"></div>') +
      (msg ? '<p class="err" role="alert">' + esc(msg) + '</p>' : '') + '</section></div>';
    if (demo) {
      $('dA').onclick = function () { Api.Demo.as = 'admin'; start(); };
      $('dS').onclick = function () { Api.Demo.as = 'staff'; start(); };
    } else initGoogle();
  }

  function initGoogle() {
    function go() {
      google.accounts.id.initialize({
        client_id: cfg.GOOGLE_CLIENT_ID, auto_select: true,
        callback: function (r) { saveTok(r.credential); start(); }
      });
      google.accounts.id.renderButton($('gbtn'), { theme: 'outline', size: 'large', text: 'signin_with', locale: 'vi', width: 280 });
    }
    if (window.google && google.accounts) return go();
    var s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.onload = go;
    s.onerror = function () { $('gbtn').innerHTML = '<p class="err">Không tải được Google Sign-In. Kiểm tra kết nối mạng.</p>'; };
    document.head.appendChild(s);
  }

  // ---------- Dữ liệu ----------
  function start() {
    $('app').innerHTML = '<div class="empty" style="margin:40px 16px">Đang tải dữ liệu…</div>';
    return Api.call('bootstrap').then(function (d) {
      S.me = d.me; S.users = d.users; S.tasks = d.tasks; S.statuses = d.statuses; S.priorities = d.priorities;
      if (!S.ready) S.view = S.me.isAdmin ? 'dash' : 'mine';
      S.ready = true; render();
    }).catch(function (e) { e.auth ? loginView(e.message) : loginView(e.message); });
  }
  function refresh() {
    return Api.call('bootstrap').then(function (d) { S.me = d.me; S.users = d.users; S.tasks = d.tasks; render(); });
  }
  function act(action, p, ok, btn) {
    if (btn) btn.disabled = true;
    return Api.call(action, p).then(function () { toast(ok); closeDrawer(); return refresh(); })
      .catch(function (e) { if (btn) btn.disabled = false; if (e.auth) { toast(e.message, true); logout(); } else toast(e.message, true); });
  }

  // ---------- Khung ứng dụng ----------
  var TITLES = { dash: 'Tổng quan', all: 'Tất cả công việc', kan: 'Bảng Kanban', mine: 'Việc của tôi', users: 'Nhân sự' };
  function tabs() {
    return S.me.isAdmin
      ? [['dash', 'Tổng quan', 'dash'], ['all', 'Tất cả việc', 'list'], ['kan', 'Kanban', 'kan'], ['report', 'Thống kê', 'chart'], ['mine', 'Việc của tôi', 'mine'], ['users', 'Nhân sự', 'users'], ['rec', 'Việc lặp', 'repeat']]
      : [['mine', 'Việc của tôi', 'mine']];
  }
  function render() {
    killCharts();
    var t = tabs();
    var nav = t.map(function (x) { return '<button data-v="' + x[0] + '"' + (S.view === x[0] ? ' aria-current="page"' : '') + '>' + ic(x[2]) + '<span>' + x[1] + '</span></button>'; }).join('');
    $('app').innerHTML =
      '<div class="shell"><aside class="side"><div class="brand"><b>Kỹ thuật - Đầu tư</b><span>Giao việc và tiến độ</span></div>' +
      '<nav class="nav" aria-label="Chính">' + nav + '</nav>' +
      '<div class="me"><span class="avatar">' + esc(initials(S.me.name)) + '</span><div class="who"><b>' + esc(S.me.name) + '</b><span>' + (S.me.isAdmin ? 'Trưởng phòng' : 'Nhân viên') + '</span></div>' +
      '<button id="thm" aria-label="Đổi giao diện sáng hoặc tối" title="Sáng / tối">' + ic(theme === 'dark' ? 'sun' : 'moon') + '</button>' +
      '<button id="out" aria-label="Đăng xuất" title="Đăng xuất">' + ic('out') + '</button></div></aside>' +
      '<main class="main" id="main"></main></div>' +
      (t.length > 1 ? '<nav class="tabbar" aria-label="Chính">' + t.filter(function (x) { return x[0] !== 'users' && x[0] !== 'rec' && x[0] !== 'kan'; }).map(function (x) { return '<button data-v="' + x[0] + '"' + (S.view === x[0] ? ' aria-current="page"' : '') + '>' + ic(x[2]) + '<span>' + x[1] + '</span></button>'; }).join('') + '</nav>' : '');
    document.querySelectorAll('[data-v]').forEach(function (b) { b.onclick = function () { S.view = b.dataset.v; render(); window.scrollTo(0, 0); }; });
    $('out').onclick = logout; $('thm').onclick = toggleTheme;
    var v = { dash: vDash, all: vAll, kan: vKan, report: vReport, mine: vMine, users: vUsers, rec: vRec }[S.view];
    v($('main'));
  }
  function head(title, sub, withNew) {
    return '<header class="head"><div><h1>' + title + '</h1>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>' +
      (withNew ? '<button class="btn primary" id="new">' + ic('plus') + 'Giao việc</button>' : '') + '</header>' +
      '<div class="mtop"><span>' + esc(S.me.name) + '</span><span class="mt-btns">' + (S.me.isAdmin ? '<button class="btn" id="usr2">Nhân sự</button>' : '') +
      '<button class="btn" id="thm2" aria-label="Đổi giao diện">' + ic(theme === 'dark' ? 'sun' : 'moon') + '</button><button class="btn" id="out2">Đăng xuất</button></span></div>';
  }
  function afterHead() {
    if ($('new')) $('new').onclick = openNew;
    if ($('out2')) $('out2').onclick = logout;
    if ($('thm2')) $('thm2').onclick = toggleTheme;
    if ($('usr2')) $('usr2').onclick = function () { S.view = 'users'; render(); };
  }

  // ---------- Thành phần ----------
  function run(t) {
    var p = Number(t.progress) || 0, cls = t.status === 'Hoàn thành' ? ' done' : (isLate(t) ? ' late' : '');
    var nodes = [0, 25, 50, 75, 100].map(function (n) { return '<b' + (p >= n && (n > 0 || p > 0) ? ' class="on"' : '') + '></b>'; }).join('');
    return '<div class="run' + cls + '" style="--p:' + p + '" role="img" aria-label="Tiến độ ' + p + '%"><i></i>' + nodes + '</div><div class="pct">' + p + '%</div>';
  }
  function chip(t) { return '<span class="chip s-' + sKey[t.status] + '">' + esc(t.status) + '</span>'; }
  function dueCell(t) {
    if (!t.due) return '<div class="due">Chưa đặt hạn</div>';
    var d = diffDays(t.due), cls = '', note = '';
    if (isOpen(t)) {
      if (d < 0) { cls = ' late'; note = 'Trễ ' + (-d) + ' ngày'; } else if (d === 0) { cls = ' soon'; note = 'Hôm nay'; }
      else if (d <= 3) { cls = ' soon'; note = 'Còn ' + d + ' ngày'; } else note = 'Còn ' + d + ' ngày';
    }
    return '<div class="due' + cls + '">' + fmtDate(t.due) + (note ? '<small>' + note + '</small>' : '') + '</div>';
  }
  function row(t, showWho) {
    var cls = isLate(t) ? ' late' : (t.status === 'Chờ duyệt' ? ' review' : '');
    return '<button class="tr' + cls + '" data-id="' + esc(t.id) + '"><div><div class="t">' + esc(t.title) + (t.priority === 'Cao' ? '<span class="pri">Ưu tiên cao</span>' : '') + '</div>' +
      '<div class="sub">' + esc(t.source) + (t.doc_no ? ' · ' + esc(t.doc_no) : '') + '</div></div>' +
      (showWho ? '<div class="who2"><span class="avatar" style="width:28px;height:28px;font-size:11px">' + esc(initials(uname(t.assignee))) + '</span><span>' + esc(uname(t.assignee)) + '</span></div>' : '') +
      dueCell(t) + '<div>' + chip(t) + '</div><div class="run-cell">' + run(t) + '</div></button>';
  }
  function list(items, showWho, emptyTitle, emptyText) {
    if (!items.length) return '<div class="empty"><b>' + emptyTitle + '</b>' + emptyText + '</div>';
    return '<div class="rows' + (showWho ? '' : ' mine') + '"><div class="th"><span>Công việc</span>' + (showWho ? '<span>Người nhận</span>' : '') + '<span>Hạn</span><span>Trạng thái</span><span>Tiến độ</span></div>' +
      items.map(function (t) { return row(t, showWho); }).join('') + '</div>';
  }
  function bind(root) { root.querySelectorAll('[data-id]').forEach(function (el) { el.onclick = function () { openTask(el.dataset.id); }; }); }
  function byDue(a, b) { return (a.due || '9999') < (b.due || '9999') ? -1 : 1; }

  // ---------- Tổng quan ----------
  function vDash(m) {
    var T = S.tasks, open = T.filter(isOpen), late = T.filter(isLate);
    var since = ymd(new Date(Date.now() - 7 * 86400000));
    var done7 = T.filter(function (t) { return t.status === 'Hoàn thành' && String(t.done).slice(0, 10) >= since; });
    var cnt = function (s) { return T.filter(function (t) { return t.status === s; }).length; };
    var h = head('Tổng quan', 'Hôm nay ' + fmtDate(today()) + ', ' + open.length + ' việc đang mở', true) +
      '<section class="kpis" aria-label="Chỉ số chính">' +
      '<div class="kpi"><b>' + open.length + '</b><span>Đang mở</span></div>' +
      '<div class="kpi late"><b>' + late.length + '</b><span>Trễ hạn</span></div>' +
      '<div class="kpi wait"><b>' + cnt('Chờ duyệt') + '</b><span>Chờ bạn duyệt</span></div>' +
      '<div class="kpi wait"><b>' + cnt('Chờ phân công') + '</b><span>Chờ phân công</span></div>' +
      '<div class="kpi ok"><b>' + cnt('Hoàn thành') + '</b><span>Đã hoàn thành</span></div></section>';
    h += visuals(T);

    var staff = S.users.filter(function (u) { return u.role !== 'Admin' || T.some(function (t) { return t.assignee === u.email; }); });
    var lanes = staff.map(function (u) {
      var mine = T.filter(function (t) { return String(t.assignee).toLowerCase() === String(u.email).toLowerCase(); });
      var o = mine.filter(isOpen), l = mine.filter(isLate).length, d = mine.filter(function (t) { return !isOpen(t); }).length;
      var rv = o.filter(function (t) { return t.status === 'Chờ duyệt'; }).length, doing = o.length - rv - l;
      var tot = Math.max(1, mine.length);
      return { u: u, o: o.length, l: l, d: d, w: [Math.max(0, doing) / tot * 100, (rv + 0) / tot * 100, d / tot * 100] };
    }).sort(function (a, b) { return b.l - a.l || b.o - a.o; });
    h += '<h2 class="h2">Khối lượng theo nhân sự <small>Bấm vào tên để xem việc của người đó</small></h2><div class="lanes">' +
      lanes.map(function (x) {
        return '<button class="lane" data-user="' + esc(x.u.email) + '"><div class="who2"><span class="avatar">' + esc(initials(x.u.name)) + '</span><div style="min-width:0"><div class="nm">' + esc(x.u.name) + '</div><div class="ti">' + esc(x.u.title) + '</div></div></div>' +
          '<div class="stack-cell"><div class="stack" role="img" aria-label="Đang làm, chờ duyệt, hoàn thành"><i class="a" style="width:' + x.w[0] + '%"></i><i class="b" style="width:' + x.w[1] + '%"></i><i class="c" style="width:' + x.w[2] + '%"></i></div></div>' +
          '<div class="n">' + x.o + '<small>đang mở</small></div><div class="n' + (x.l ? ' late' : '') + '">' + x.l + '<small>trễ hạn</small></div><div class="n hide-s">' + x.d + '<small>đã xong</small></div></button>';
      }).join('') + '</div>' +
      '<div class="legend"><span><i style="background:var(--cobalt)"></i>Đang làm</span><span><i style="background:var(--amber-fill)"></i>Chờ duyệt</span><span><i style="background:var(--green)"></i>Hoàn thành</span></div>';

    var need = T.filter(function (t) { return t.status === 'Chờ duyệt' || t.status === 'Chờ phân công'; });
    var soon = open.filter(function (t) { return t.due && t.status !== 'Chờ phân công'; }).sort(byDue).slice(0, 7);
    h += '<div class="two"><div><h2 class="h2">Cần bạn xử lý <small>' + need.length + ' việc</small></h2>' +
      list(need, true, 'Không có việc nào chờ bạn', 'Việc nộp kết quả hoặc chưa có người nhận sẽ hiện ở đây.') + '</div>' +
      '<div><h2 class="h2">Sắp đến hạn <small>theo thứ tự hạn</small></h2>' + list(soon, true, 'Chưa có việc nào có hạn', 'Đặt hạn khi giao việc để theo dõi tại đây.') + '</div></div>';
    m.innerHTML = h + '<div id="syncBox"></div>'; afterHead(); bind(m); drawVisuals(T); loadSync();
    m.querySelectorAll('[data-user]').forEach(function (b) { b.onclick = function () { S.f.user = String(b.dataset.user).toLowerCase(); S.f.status = ''; S.view = 'all'; render(); }; });
  }

  // ---------- Danh sách & Kanban ----------
  function filtered() {
    var f = S.f;
    return S.tasks.filter(function (t) {
      if (f.user && String(t.assignee).toLowerCase() !== f.user) return false;
      if (f.status && t.status !== f.status) return false;
      if (f.q && (t.title + ' ' + t.description).toLowerCase().indexOf(f.q.toLowerCase()) < 0) return false;
      return true;
    });
  }
  function filterBar() {
    return '<div class="bar" role="search"><label class="sr" for="fq">Tìm công việc</label><input id="fq" type="search" placeholder="Tìm theo tên hoặc mô tả" value="' + esc(S.f.q) + '">' +
      '<label class="sr" for="fu">Lọc theo nhân viên</label><select id="fu"><option value="">Tất cả nhân viên</option>' + S.users.map(function (u) {
        return '<option value="' + esc(String(u.email).toLowerCase()) + '"' + (S.f.user === String(u.email).toLowerCase() ? ' selected' : '') + '>' + esc(u.name) + '</option>';
      }).join('') + '</select><label class="sr" for="fs">Lọc theo trạng thái</label><select id="fs"><option value="">Mọi trạng thái</option>' +
      S.statuses.map(function (s) { return '<option' + (S.f.status === s ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join('') + '</select></div>';
  }
  function bindFilter() {
    $('fq').oninput = function () { S.f.q = this.value; clearTimeout(bindFilter.t); bindFilter.t = setTimeout(function () { render(); var q = $('fq'); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }, 280); };
    $('fu').onchange = function () { S.f.user = this.value; S.lim = 80; render(); };
    $('fs').onchange = function () { S.f.status = this.value; S.lim = 80; render(); };
  }
  function vAll(m) {
    var items = filtered().sort(function (a, b) { return (isLate(b) - isLate(a)) || byDue(a, b); });
    m.innerHTML = head('Tất cả công việc', items.length + ' việc' + (S.f.user ? ' của ' + esc(uname(S.f.user)) : ''), true) + filterBar() +
      list(items.slice(0, S.lim), true, 'Không có việc phù hợp', 'Thử bỏ bớt bộ lọc hoặc giao việc mới.') +
      (items.length > S.lim ? '<div class="more"><button class="btn" id="more">Xem thêm ' + Math.min(80, items.length - S.lim) + ' việc (còn ' + (items.length - S.lim) + ')</button></div>' : '');
    afterHead(); bindFilter(); bind(m);
    if ($('more')) $('more').onclick = function () { S.lim += 80; render(); };
  }
  function vKan(m) {
    var items = filtered();
    m.innerHTML = head('Bảng Kanban', 'Mỗi cột là một trạng thái công việc', true) + filterBar() + '<div class="kan">' + S.statuses.map(function (s) {
      var c = items.filter(function (t) { return t.status === s; }).sort(byDue);
      return '<section class="col" aria-label="' + esc(s) + '"><h3>' + esc(s) + ' · ' + c.length + '</h3>' + c.map(function (t) {
        return '<button class="k' + (isLate(t) ? ' late' : '') + '" data-id="' + esc(t.id) + '"><div class="t">' + esc(t.title) + '</div><div class="sub">' + esc(shortName(uname(t.assignee))) + ' · ' + (t.due ? fmtDate(t.due).slice(0, 5) : 'chưa hạn') + '</div>' + run(t) + '</button>';
      }).join('') + '</section>';
    }).join('') + '</div>';
    afterHead(); bindFilter(); bind(m);
  }

  function vMine(m) {
    var mine = S.tasks.filter(function (t) { return String(t.assignee).toLowerCase() === S.me.email.toLowerCase(); });
    var open = mine.filter(isOpen).sort(function (a, b) { return (isLate(b) - isLate(a)) || byDue(a, b); }), done = mine.filter(function (t) { return !isOpen(t); });
    m.innerHTML = head('Việc của tôi', open.length ? open.length + ' việc đang làm' + (open.filter(isLate).length ? ', ' + open.filter(isLate).length + ' trễ hạn' : '') : 'Bạn không còn việc nào đang mở', false) +
      list(open, false, 'Chưa có việc nào được giao', 'Khi trưởng phòng giao việc, bạn sẽ thấy ở đây.') +
      (done.length ? '<h2 class="h2">Đã hoàn thành <small>' + done.length + ' việc</small></h2>' + list(done.slice(0, 15), false, '', '') : '');
    afterHead(); bind(m);
  }

  function vUsers(m) {
    m.innerHTML = head('Nhân sự', S.users.length + ' người được cấp quyền', false).replace('</header>', '<button class="btn" id="goRec">Việc lặp</button><button class="btn primary" id="addU">' + ic('plus') + 'Thêm nhân sự</button></header>') +
      '<div class="people">' + S.users.map(function (u, i) {
        return '<button class="person" data-u="' + i + '"><span class="avatar">' + esc(initials(u.name)) + '</span><div><b>' + esc(u.name) + (u.role === 'Admin' ? '<span class="tag" style="display:inline">Trưởng phòng</span>' : '') + '</b><span>' + esc(u.title || u.group) + '</span><span>' + esc(u.email) + '</span></div></button>';
      }).join('') + '</div>';
    afterHead(); $('addU').onclick = function () { openUser({}); }; $('goRec').onclick = function () { S.view = 'rec'; render(); };
    m.querySelectorAll('[data-u]').forEach(function (b) { b.onclick = function () { openUser(S.users[b.dataset.u]); }; });
  }

  // ---------- Ngăn kéo ----------
  var lastFocus = null;
  function openDrawer(html) {
    lastFocus = document.activeElement;
    $('sheet').innerHTML = '<button class="x" data-close aria-label="Đóng">' + ic('x') + '</button>' + html;
    $('drawer').hidden = false; document.body.style.overflow = 'hidden';
    $('drawer').querySelectorAll('[data-close]').forEach(function (b) { b.onclick = closeDrawer; });
    var f = $('sheet').querySelector('input,textarea,select,button.primary'); if (f && window.innerWidth > 860) f.focus();
  }
  function closeDrawer() { $('drawer').hidden = true; document.body.style.overflow = ''; if (lastFocus && lastFocus.focus) try { lastFocus.focus(); } catch (e) { /* ignore */ } }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('drawer').hidden) closeDrawer(); });
  function val(id) { return $(id).value; }
  function userOpts(sel, blank) {
    return (blank ? '<option value="">' + blank + '</option>' : '') + S.users.map(function (u) {
      return '<option value="' + esc(u.email) + '"' + (String(u.email).toLowerCase() === String(sel).toLowerCase() ? ' selected' : '') + '>' + esc(u.name) + '</option>';
    }).join('');
  }
  function priOpts(sel) { return S.priorities.map(function (p) { return '<option' + (p === sel ? ' selected' : '') + '>' + p + '</option>'; }).join(''); }

  function openNew() {
    openDrawer('<h2 id="sheetTitle">Giao việc mới</h2>' +
      '<label class="f" for="nT">Tên công việc</label><input id="nT" maxlength="200">' +
      '<label class="f" for="nD">Nội dung cần làm</label><textarea id="nD"></textarea>' +
      '<label class="f" for="nU">Người nhận (giữ Ctrl hoặc Cmd để chọn nhiều người)</label><select id="nU" multiple size="7">' + userOpts('') + '</select>' +
      '<p class="sub" style="font-size:13px;color:var(--ink-2);margin-top:4px">Không chọn ai: việc vào mục Chờ phân công.</p>' +
      '<div class="grid3" style="grid-template-columns:1fr 1fr"><div><label class="f" for="nDue">Hạn hoàn thành</label><input id="nDue" type="date" min="' + today() + '"></div>' +
      '<div><label class="f" for="nP">Mức ưu tiên</label><select id="nP">' + priOpts('Trung bình') + '</select></div></div>' +
      '<label class="f" for="nL">Link tài liệu (nếu có)</label><input id="nL" type="url" placeholder="https://">' +
      '<div class="actions"><button class="btn primary" id="nGo">Giao việc</button><button class="btn" data-close>Hủy</button></div>');
    $('sheet').querySelectorAll('[data-close]').forEach(function (b) { b.onclick = closeDrawer; });
    $('nGo').onclick = function () {
      var sel = Array.prototype.map.call($('nU').selectedOptions, function (o) { return o.value; });
      act('createTask', { title: val('nT'), description: val('nD'), assignees: sel, due: val('nDue'), priority: val('nP'), link: val('nL') },
        sel.length > 1 ? 'Đã giao việc cho ' + sel.length + ' người' : 'Đã giao việc', $('nGo'));
    };
  }

  function openTask(id) {
    var t = S.tasks.filter(function (x) { return x.id === id; })[0]; if (!t) return;
    var admin = S.me.isAdmin, mine = String(t.assignee).toLowerCase() === S.me.email.toLowerCase(), locked = t.status === 'Hoàn thành' && !admin;
    var h = '<h2 id="sheetTitle">' + esc(t.title) + '</h2><div class="meta">' + chip(t) + '<span>Hạn ' + fmtDate(t.due) + (isLate(t) ? ' (trễ ' + (-diffDays(t.due)) + ' ngày)' : '') + '</span><span>Ưu tiên ' + esc(t.priority.toLowerCase()) + '</span>' + (t.doc_no ? '<span>Số văn bản ' + esc(t.doc_no) + '</span>' : '') + '<span>Nguồn: ' + esc(t.source) + '</span></div>' +
      '<div style="margin-top:14px">' + run(t) + '</div>';
    if (admin) {
      h += '<div class="sect"><b>Thông tin công việc</b><label class="f" for="eT">Tên công việc</label><input id="eT" value="' + esc(t.title) + '">' +
        '<label class="f" for="eD">Nội dung</label><textarea id="eD">' + esc(t.description) + '</textarea>' +
        '<div class="grid3"><div><label class="f" for="eU">Người nhận</label><select id="eU">' + userOpts(t.assignee, 'Chưa giao') + '</select></div>' +
        '<div><label class="f" for="eDue">Hạn</label><input id="eDue" type="date" value="' + esc(String(t.due).slice(0, 10)) + '"></div>' +
        '<div><label class="f" for="eP">Ưu tiên</label><select id="eP">' + priOpts(t.priority) + '</select></div></div>' +
        '<label class="f" for="eL">Lý do trễ hạn (nếu có)</label><input id="eL" value="' + esc(t.late_reason) + '">' +
        (t.coop ? '<p class="note2">Phối hợp: ' + esc(t.coop) + '</p>' : '') + (t.owner_raw ? '<p class="note2 warn">Tên trong sổ chưa khớp nhân sự: ' + esc(t.owner_raw) + '</p>' : '') +
        '<div class="actions"><button class="btn" id="eGo">Lưu thay đổi</button></div></div>';
    } else {
      h += '<div class="sect"><b>Nội dung</b><p style="margin-top:6px">' + esc(t.description || 'Không có mô tả.') + '</p><div class="meta">Giao bởi ' + esc(uname(t.assigner)) + '</div>' + (t.coop ? '<p class="note2">Phối hợp: ' + esc(t.coop) + '</p>' : '') +
        (t.late_reason ? '<p class="note2 warn">Lý do trễ hạn: ' + esc(t.late_reason) + '</p>' : '') + '</div>';
    }
    if (t.link) h += '<p style="margin-top:12px"><a href="' + esc(/^https?:/i.test(t.link) ? t.link : '#') + '" target="_blank" rel="noopener noreferrer">Mở tài liệu đính kèm</a></p>';
    if (t.result) h += '<div class="sect"><b>Kết quả đã nộp</b><div class="quote">' + esc(t.result) + '</div></div>';
    if (admin && t.status === 'Chờ duyệt') {
      h += '<div class="sect"><b>Duyệt kết quả</b><label class="f" for="rN">Ghi chú (bắt buộc khi yêu cầu làm lại)</label><input id="rN">' +
        '<div class="actions"><button class="btn good" id="rOk">Duyệt hoàn thành</button><button class="btn danger" id="rNo">Yêu cầu làm lại</button></div></div>';
    }
    if ((mine || admin) && !locked && t.status !== 'Chờ phân công') {
      var p = Number(t.progress) || 0;
      h += '<div class="sect"><b>Cập nhật tiến độ</b><label class="f" for="pR">Hoàn thành <span class="big-pct" id="pv">' + p + '%</span></label>' +
        '<input id="pR" type="range" min="0" max="100" step="5" value="' + p + '">' +
        '<label class="f" for="pN">Ghi chú hoặc kết quả</label><textarea id="pN"></textarea>' +
        '<label class="f" for="pL">Link kết quả (nếu có)</label><input id="pL" type="url" placeholder="https://">' +
        '<div class="actions"><button class="btn primary" id="pGo">Lưu tiến độ</button><button class="btn good" id="pSub">Nộp kết quả</button></div></div>';
    }
    h += '<div class="sect"><b>Lịch sử cập nhật</b><div id="hist" class="sub" style="color:var(--ink-2);font-size:14px;margin-top:8px">Đang tải…</div></div>';
    if (admin) h += '<div class="actions" style="margin-top:28px"><button class="btn danger" id="xDel">Xóa công việc</button></div>';
    openDrawer(h);

    if ($('pR')) $('pR').oninput = function () { $('pv').textContent = this.value + '%'; };
    if ($('pGo')) $('pGo').onclick = function () { act('progress', { id: id, progress: val('pR'), note: val('pN'), link: val('pL') }, 'Đã lưu tiến độ', this); };
    if ($('pSub')) $('pSub').onclick = function () { act('progress', { id: id, progress: val('pR'), note: val('pN'), link: val('pL'), submit: true }, 'Đã nộp kết quả, chờ duyệt', this); };
    if ($('eGo')) $('eGo').onclick = function () { act('saveTask', { id: id, title: val('eT'), description: val('eD'), assignee: val('eU'), due: val('eDue'), priority: val('eP'), late_reason: val('eL') }, 'Đã lưu thay đổi', this); };
    if ($('rOk')) $('rOk').onclick = function () { act('review', { id: id, decision: 'approve', note: val('rN') }, 'Đã duyệt hoàn thành', this); };
    if ($('rNo')) $('rNo').onclick = function () {
      if (!val('rN').trim()) { toast('Hãy ghi lý do yêu cầu làm lại.', true); $('rN').focus(); return; }
      act('review', { id: id, decision: 'reject', note: val('rN') }, 'Đã trả lại để làm lại', this);
    };
    if ($('xDel')) $('xDel').onclick = function () {
      if (this.dataset.sure) return act('remove', { id: id }, 'Đã xóa công việc', this);
      this.dataset.sure = 1; this.textContent = 'Bấm lần nữa để xóa vĩnh viễn'; this.classList.add('solid');
    };
    Api.call('history', { id: id }).then(function (rows) {
      if (!$('hist')) return;
      $('hist').innerHTML = rows.length ? '<ul class="log">' + rows.map(function (r) {
        return '<li><small>' + esc(uname(r.by)) + ' · ' + fmtTime(r.time) + ' · ' + (Number(r.progress) || 0) + '%</small>' + esc(r.note || 'Cập nhật tiến độ') +
          (r.link && /^https?:/i.test(r.link) ? ' <a href="' + esc(r.link) + '" target="_blank" rel="noopener noreferrer">link</a>' : '') + '</li>';
      }).join('') + '</ul>' : 'Chưa có cập nhật nào.';
    }).catch(function () { if ($('hist')) $('hist').textContent = 'Không tải được lịch sử.'; });
  }

  function openUser(u) {
    var isNew = !u.email;
    openDrawer('<h2 id="sheetTitle">' + (isNew ? 'Thêm nhân sự' : esc(u.name)) + '</h2>' +
      '<label class="f" for="uE">Email Google</label><input id="uE" type="email" value="' + esc(u.email) + '"' + (isNew ? '' : ' readonly') + '>' +
      '<label class="f" for="uN">Họ và tên</label><input id="uN" value="' + esc(u.name) + '">' +
      '<label class="f" for="uT">Chức vụ</label><input id="uT" value="' + esc(u.title) + '">' +
      '<label class="f" for="uG">Nhóm</label><input id="uG" value="' + esc(u.group) + '">' +
      '<label class="f" for="uA">Tên gọi trong sổ theo dõi (cách nhau bằng dấu phẩy)</label><input id="uA" value="' + esc(u.alias) + '" placeholder="Ví dụ: Anh Phúc, Tuệ Phúc">' +
      '<label class="f" for="uTg">Telegram chat id (tự điền khi nhân viên nhắn email cho bot)</label><input id="uTg" value="' + esc(u.telegram_id) + '">' +
      '<label class="f" for="uR">Quyền</label><select id="uR"><option value="Staff"' + (u.role !== 'Admin' ? ' selected' : '') + '>Nhân viên: chỉ thấy việc của mình</option><option value="Admin"' + (u.role === 'Admin' ? ' selected' : '') + '>Trưởng phòng: xem và quản lý tất cả</option></select>' +
      '<div class="actions"><button class="btn primary" id="uGo">Lưu</button>' + (isNew ? '' : '<button class="btn danger" id="uOff">Thu hồi quyền truy cập</button>') + '</div>');
    var send = function (active, btn, msg) { act('saveUser', { email: val('uE'), name: val('uN'), title: val('uT'), group: val('uG'), alias: val('uA'), telegram_id: val('uTg'), role: val('uR'), active: active }, msg, btn); };
    $('uGo').onclick = function () { send(true, this, 'Đã lưu nhân sự'); };
    if ($('uOff')) $('uOff').onclick = function () {
      if (this.dataset.sure) return send(false, this, 'Đã thu hồi quyền');
      this.dataset.sure = 1; this.textContent = 'Bấm lần nữa để xác nhận'; this.classList.add('solid');
    };
  }

  // ---------- Biểu đồ dùng chung (Chart.js) ----------
  var BK = [['done', 'Hoàn thành', '--green'], ['review', 'Chờ duyệt', '--amber-fill'], ['late', 'Trễ hạn', '--red'], ['doing', 'Đang thực hiện', '--cobalt'], ['todo', 'Chưa thực hiện', '--ink-2']];
  function bucket(t) {
    if (t.status === 'Hoàn thành') return 'done';
    if (t.status === 'Chờ duyệt') return 'review';
    if (isLate(t)) return 'late';
    if (t.status === 'Đang làm') return 'doing';
    return 'todo';
  }
  function cssv(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
  var charts = [];
  function killCharts() { charts.forEach(function (c) { try { c.destroy(); } catch (e) { /* ignore */ } }); charts = []; }
  function mkChart(id, cfg) {
    var el = $(id); if (!el) return;
    if (!window.Chart) { el.parentNode.innerHTML = '<p class="muted2">Không tải được thư viện biểu đồ. Kiểm tra kết nối mạng rồi tải lại trang.</p>'; return; }
    Chart.defaults.font.family = '"Be Vietnam Pro", system-ui, sans-serif';
    Chart.defaults.font.size = 12;
    Chart.defaults.color = cssv('--ink-2');
    Chart.defaults.borderColor = cssv('--line');
    cfg.options = cfg.options || {};
    cfg.options.responsive = true; cfg.options.maintainAspectRatio = false;
    cfg.options.animation = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? false : { duration: 400 };
    charts.push(new Chart(el, cfg));
  }
  function chartBox(id, title, sub, h, label) {
    return '<figure class="vis ch"><figcaption><b>' + title + '</b>' + (sub ? '<span>' + sub + '</span>' : '') + '</figcaption><div class="cbox" style="height:' + h + 'px"><canvas id="' + id + '" role="img" aria-label="' + esc(label || title) + '"></canvas></div></figure>';
  }
  function pctOf(a, b) { return b ? Math.round(a / b * 100) : null; }
  function mondayOf(d) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
  function countBuckets(list) { var c = { done: 0, review: 0, late: 0, doing: 0, todo: 0 }; list.forEach(function (t) { c[bucket(t)]++; }); return c; }

  function doughnutCfg(list) {
    var c = countBuckets(list);
    return { type: 'doughnut', data: { labels: BK.map(function (b) { return b[1]; }), datasets: [{ data: BK.map(function (b) { return c[b[0]]; }), backgroundColor: BK.map(function (b) { return cssv(b[2]); }), borderColor: cssv('--paper'), borderWidth: 2 }] },
      options: { cutout: '62%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12 } }, tooltip: { callbacks: { label: function (x) { var tot = list.length || 1; return ' ' + x.label + ': ' + x.parsed + ' việc (' + Math.round(x.parsed / tot * 100) + '%)'; } } } } } };
  }
  function monthsCfg(list, maxMonths) {
    var map = {};
    list.forEach(function (t) { if (!t.due) return; var k = String(t.due).slice(0, 7); (map[k] = map[k] || { done: 0, rest: 0 })[t.status === 'Hoàn thành' ? 'done' : 'rest']++; });
    var keys = Object.keys(map).sort(); if (maxMonths) keys = keys.slice(-maxMonths);
    var label = function (k) { return k.slice(5) + '/' + k.slice(0, 4); };
    return { type: 'bar', data: { labels: keys.map(label), datasets: [
      { type: 'line', label: 'Tỷ lệ hoàn thành (%)', data: keys.map(function (k) { return pctOf(map[k].done, map[k].done + map[k].rest); }), yAxisID: 'y1', borderColor: cssv('--amber-fill'), backgroundColor: cssv('--amber-fill'), tension: .3, pointRadius: 3, borderWidth: 2, order: 0 },
      { type: 'bar', label: 'Hoàn thành', data: keys.map(function (k) { return map[k].done; }), backgroundColor: cssv('--green'), stack: 's', order: 1, borderRadius: 3 },
      { type: 'bar', label: 'Chưa hoàn thành', data: keys.map(function (k) { return map[k].rest; }), backgroundColor: cssv('--cobalt'), stack: 's', order: 1, borderRadius: 3 }
    ] }, options: { interaction: { mode: 'index', intersect: false }, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } } },
      scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, beginAtZero: true, title: { display: true, text: 'Số việc đến hạn' }, ticks: { precision: 0 } },
        y1: { position: 'right', min: 0, max: 100, grid: { drawOnChartArea: false }, title: { display: true, text: '%' } } } } };
  }
  function stackedCfg(rows, nameOf, horizontal) {
    return { type: 'bar', data: { labels: rows.map(nameOf), datasets: BK.map(function (b) { return { label: b[1], data: rows.map(function (r) { return r.c[b[0]]; }), backgroundColor: cssv(b[2]), borderRadius: 2 }; }) },
      options: { indexAxis: horizontal ? 'y' : 'x', interaction: { mode: 'index', intersect: false }, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } } },
        scales: { x: { stacked: true, beginAtZero: true, grid: { display: !!horizontal }, ticks: { precision: 0 } }, y: { stacked: true, grid: { display: !horizontal }, ticks: { precision: 0 } } } } };
  }
  function ageCfg(list) {
    var bins = [['1-7 ngày', 1, 7], ['8-30 ngày', 8, 30], ['31-90 ngày', 31, 90], ['91-180 ngày', 91, 180], ['Trên 180 ngày', 181, 99999]], n = bins.map(function () { return 0; });
    list.filter(function (t) { return bucket(t) === 'late'; }).forEach(function (t) { var d = -diffDays(t.due); bins.forEach(function (b, i) { if (d >= b[1] && d <= b[2]) n[i]++; }); });
    return { type: 'bar', data: { labels: bins.map(function (b) { return b[0]; }), datasets: [{ label: 'Việc trễ hạn', data: n, backgroundColor: cssv('--red'), borderRadius: 3 }] },
      options: { plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { precision: 0 } } } } };
  }

  // ---------- Biểu đồ tổng quan ----------
  function gauge(v, label, sub, tone) {
    var val = v == null ? 0 : Math.max(0, Math.min(100, v));
    return '<figure class="vis g-' + tone + '"><svg viewBox="0 0 120 74" role="img" aria-label="' + esc(label) + ': ' + (v == null ? 'chưa có dữ liệu' : v + '%') + '">' +
      '<path d="M12 64A48 48 0 0 1 108 64" pathLength="100" class="gt"/><path d="M12 64A48 48 0 0 1 108 64" pathLength="100" class="gv" stroke-dasharray="' + val + ' 1000"' + (val > 0 ? '' : ' style="opacity:0"') + '/>' +
      '<text x="60" y="58" text-anchor="middle" class="gn">' + (v == null ? '—' : v + '%') + '</text></svg><figcaption><b>' + esc(label) + '</b><span>' + esc(sub) + '</span></figcaption></figure>';
  }
  function visuals(T) {
    var year = String(new Date().getFullYear()), month = today().slice(0, 7);
    var inYear = T.filter(function (t) { return t.due && String(t.due).slice(0, 4) === year; });
    var inMonth = T.filter(function (t) { return t.due && String(t.due).slice(0, 7) === month; });
    var open = T.filter(isOpen), withDue = open.filter(function (t) { return t.due; }), late = withDue.filter(isLate).length;
    var dy = inYear.filter(function (t) { return t.status === 'Hoàn thành'; }).length, dm = inMonth.filter(function (t) { return t.status === 'Hoàn thành'; }).length;
    return '<section class="vis-grid" aria-label="Biểu đồ">' +
      gauge(pctOf(dy, inYear.length), 'Hoàn thành năm ' + year, dy + ' / ' + inYear.length + ' việc đến hạn trong năm', 'ok') +
      gauge(pctOf(dm, inMonth.length), 'Hoàn thành tháng này', dm + ' / ' + inMonth.length + ' việc đến hạn trong tháng', 'brand') +
      gauge(pctOf(late, withDue.length), 'Việc đang trễ hạn', late + ' / ' + withDue.length + ' việc đang mở có hạn', 'bad') +
      chartBox('cMonths', 'Việc đến hạn theo tháng', '6 tháng gần nhất; đường vàng là tỷ lệ hoàn thành', 280, 'Số việc đến hạn theo tháng, hoàn thành và chưa hoàn thành') +
      chartBox('cStatus', 'Cơ cấu trạng thái', 'Toàn bộ công việc trong hệ thống', 280, 'Cơ cấu trạng thái công việc') + '</section>';
  }
  function drawVisuals(T) {
    mkChart('cMonths', monthsCfg(T, 6));
    mkChart('cStatus', doughnutCfg(T));
  }

  // ---------- Đồng bộ sổ theo dõi ----------
  function loadSync() {
    Api.call('syncStatus').then(function (d) {
      var box = $('syncBox'); if (!box) return;
      var src = d.sources[0];
      box.innerHTML = '<h2 class="h2">Nguồn việc <small>Google Sheet</small></h2><div class="sync"><div><b>' + esc(src ? src.name : 'Chưa khai báo nguồn') + '</b>' +
        '<p>' + (src && src.last_sync ? 'Đồng bộ lần cuối ' + fmtTime(src.last_sync) + '. ' + esc(src.last_result) : 'Chưa đồng bộ lần nào.') + '</p></div>' +
        '<button class="btn" id="syncNow">Đồng bộ ngay</button></div>' +
        (d.unmatched.length ? '<div class="unm"><b>Tên chưa khớp nhân sự</b><p>Gán tên trong sổ cho đúng người để việc được giao tự động.</p>' + d.unmatched.map(function (u, i) {
          return '<div class="unr"><span>' + esc(u.name) + ' <small>' + u.count + ' việc đang mở</small></span><select data-ui="' + i + '" aria-label="Gán ' + esc(u.name) + ' cho"><option value="">Chọn người…</option>' + userOpts('') + '</select><button class="btn" data-ub="' + i + '">Gán</button></div>';
        }).join('') + '</div>' : '');
      $('syncNow').onclick = function () { runSync(this); };
      box.querySelectorAll('[data-ub]').forEach(function (b) {
        b.onclick = function () {
          var i = b.dataset.ub, em = box.querySelector('[data-ui="' + i + '"]').value;
          if (!em) { toast('Chọn người cần gán trước.', true); return; }
          b.disabled = true;
          Api.call('addAlias', { email: em, alias: d.unmatched[i].name }).then(function () { toast('Đã gán và đồng bộ lại'); return refresh(); })
            .catch(function (e) { b.disabled = false; toast(e.message, true); });
        };
      });
    }).catch(function () { var box = $('syncBox'); if (box) box.innerHTML = ''; });
  }
  function runSync(btn) {
    btn.disabled = true; btn.textContent = 'Đang đồng bộ…';
    Api.call('runSync').then(function (r) { toast(r.summary[0] || 'Đã đồng bộ'); return refresh(); })
      .catch(function (e) { btn.disabled = false; btn.textContent = 'Đồng bộ ngay'; toast(e.message, true); });
  }

  // ---------- Thống kê và báo cáo ----------
  var RANGES = [['month', 'Tháng này'], ['quarter', 'Quý này'], ['6m', '6 tháng gần nhất'], ['year', 'Năm nay'], ['all', 'Tất cả']];
  function ymdEnd(y, m) { return ymd(new Date(y, m + 1, 0)); }
  function rangeBounds(k) {
    var d = new Date(), y = d.getFullYear(), m = d.getMonth();
    if (k === 'month') return [ymd(new Date(y, m, 1)), ymdEnd(y, m)];
    if (k === 'quarter') { var q = Math.floor(m / 3) * 3; return [ymd(new Date(y, q, 1)), ymdEnd(y, q + 2)]; }
    if (k === '6m') return [ymd(new Date(y, m - 5, 1)), ymdEnd(y, m)];
    if (k === 'year') return [y + '-01-01', y + '-12-31'];
    return ['0000-00-00', '9999-12-31'];
  }
  function reportUniverse() {
    var b = rangeBounds(S.rp), rows = S.tasks.filter(function (t) { return t.due && String(t.due).slice(0, 10) >= b[0] && String(t.due).slice(0, 10) <= b[1]; });
    if (S.rg) rows = rows.filter(function (t) { var u = user(t.assignee); return (u ? u.group : 'Chưa giao') === S.rg; });
    if (S.ru) rows = rows.filter(function (t) { return String(t.assignee).toLowerCase() === S.ru; });
    return { rows: rows, from: b[0], to: b[1], noDue: S.tasks.filter(function (t) { return !t.due; }).length };
  }
  function groupOf(t) { var u = user(t.assignee); return t.assignee ? (u && u.group ? u.group : 'Khác') : 'Chưa giao'; }
  function aggregate(rows, keyFn) {
    var m = {};
    rows.forEach(function (t) { var k = keyFn(t); m[k] = m[k] || { k: k, n: 0, c: { done: 0, review: 0, late: 0, doing: 0, todo: 0 } }; m[k].n++; m[k].c[bucket(t)]++; });
    return Object.keys(m).map(function (k) { return m[k]; });
  }
  function vReport(m) {
    var U = reportUniverse(), rows = U.rows, c = countBuckets(rows), tot = rows.length;
    var label = RANGES.filter(function (r) { return r[0] === S.rp; })[0][1];
    var groups = {}; S.users.forEach(function (u) { if (u.group) groups[u.group] = 1; });
    var byPerson = aggregate(rows.filter(function (t) { return t.assignee; }), function (t) { return String(t.assignee).toLowerCase(); }).sort(function (a, b) { return b.c.late - a.c.late || b.n - a.n; });
    var byGroup = aggregate(rows, groupOf).sort(function (a, b) { return b.n - a.n; });
    var lates = rows.filter(function (t) { return bucket(t) === 'late'; }).sort(function (a, b) { return String(a.due) < String(b.due) ? -1 : 1; });
    var kpi = function (cls, n, l) { return '<div class="kpi ' + cls + '"><b>' + n + '</b><span>' + l + '</span></div>'; };
    m.innerHTML = head('Thống kê và báo cáo', (S.rp === 'all' ? 'Tất cả công việc có hạn' : label + ': việc đến hạn từ ' + fmtDate(U.from) + ' đến ' + fmtDate(U.to)) + (U.noDue ? ' · ' + U.noDue + ' việc chưa đặt hạn không tính' : ''), false).replace('</header>',
      '<div class="rp-tools"><button class="btn" id="csv">Xuất Excel (CSV)</button><button class="btn" id="prn">In hoặc lưu PDF</button></div></header>') +
      '<div class="bar rp-filters" role="group" aria-label="Bộ lọc báo cáo"><div><label class="f" for="rpR">Kỳ (theo hạn hoàn thành)</label><select id="rpR">' + RANGES.map(function (r) { return '<option value="' + r[0] + '"' + (S.rp === r[0] ? ' selected' : '') + '>' + r[1] + '</option>'; }).join('') + '</select></div>' +
      '<div><label class="f" for="rpG">Nhóm chuyên môn</label><select id="rpG"><option value="">Tất cả nhóm</option>' + Object.keys(groups).concat(['Chưa giao']).map(function (g) { return '<option' + (S.rg === g ? ' selected' : '') + '>' + esc(g) + '</option>'; }).join('') + '</select></div>' +
      '<div><label class="f" for="rpU">Nhân sự</label><select id="rpU"><option value="">Tất cả nhân sự</option>' + S.users.map(function (u) { return '<option value="' + esc(String(u.email).toLowerCase()) + '"' + (S.ru === String(u.email).toLowerCase() ? ' selected' : '') + '>' + esc(u.name) + '</option>'; }).join('') + '</select></div></div>' +
      '<section class="kpis" aria-label="Tổng hợp">' + kpi('', tot, 'Tổng số việc') + kpi('ok', c.done + ' <small>' + (pctOf(c.done, tot) == null ? '' : pctOf(c.done, tot) + '%') + '</small>', 'Hoàn thành') +
      kpi('', c.doing, 'Đang thực hiện') + kpi('wait', c.review, 'Chờ duyệt') + kpi('late', c.late, 'Trễ hạn') + kpi('', c.todo, 'Chưa thực hiện') + '</section>' +
      (tot ? '<section class="vis-grid" aria-label="Biểu đồ thống kê">' +
        chartBox('rStatus', 'Cơ cấu trạng thái', tot + ' việc trong kỳ', 280) + chartBox('rMonths', 'Việc đến hạn theo tháng', 'Cột: hoàn thành và chưa hoàn thành. Đường: tỷ lệ hoàn thành', 280, 'Số việc đến hạn theo tháng') +
        chartBox('rAge', 'Tuổi trễ hạn', c.late + ' việc đang trễ, tính theo số ngày quá hạn', 280, 'Phân bố việc trễ hạn theo số ngày') +
        '<figure class="vis ch wide"><figcaption><b>Khối lượng và tiến độ theo nhân sự</b><span>Mỗi thanh là toàn bộ việc của một người trong kỳ</span></figcaption><div class="cbox" style="height:' + (70 + byPerson.length * 30) + 'px"><canvas id="rPerson" role="img" aria-label="Công việc theo nhân sự"></canvas></div></figure>' +
        chartBox('rGroup', 'Theo nhóm chuyên môn', 'Gồm cả việc chưa giao', 280, 'Công việc theo nhóm chuyên môn') + '</section>' : '<div class="empty"><b>Không có việc nào trong kỳ này</b>Đổi kỳ báo cáo hoặc bỏ bộ lọc nhóm, nhân sự.</div>') +
      '<h2 class="h2">Bảng theo nhân sự <small>' + byPerson.length + ' người</small></h2><div class="rows rep"><div class="th"><span>Nhân sự</span><span>Tổng</span><span>Hoàn thành</span><span>Tỷ lệ</span><span>Đang làm</span><span>Chờ duyệt</span><span>Trễ hạn</span></div>' +
      (byPerson.length ? byPerson.map(function (r) {
        return '<div class="tr nb"><div class="who2"><span class="avatar" style="width:28px;height:28px;font-size:11px">' + esc(initials(uname(r.k))) + '</span><span>' + esc(uname(r.k)) + '</span></div><div data-l="Tổng">' + r.n + '</div><div data-l="Hoàn thành">' + r.c.done + '</div><div data-l="Tỷ lệ">' + (pctOf(r.c.done, r.n) == null ? '—' : pctOf(r.c.done, r.n) + '%') + '</div><div data-l="Đang làm">' + r.c.doing + '</div><div data-l="Chờ duyệt">' + r.c.review + '</div><div data-l="Trễ hạn" class="' + (r.c.late ? 'neg' : '') + '">' + r.c.late + '</div></div>';
      }).join('') : '<div class="empty" style="border:0">Chưa có dữ liệu.</div>') + '</div>' +
      '<h2 class="h2">Việc trễ hạn và lý do <small>' + lates.length + ' việc, cũ nhất ở trên</small></h2>' +
      (lates.length ? '<div class="rows">' + lates.slice(0, 30).map(function (t) {
        return '<button class="tr late lt" data-id="' + esc(t.id) + '"><div><div class="t">' + esc(t.title) + '</div><div class="sub">' + esc(uname(t.assignee)) + ' · hạn ' + fmtDate(t.due) + ' · trễ ' + (-diffDays(t.due)) + ' ngày' + (t.doc_no ? ' · ' + esc(t.doc_no) : '') + '</div>' +
          '<div class="sub">' + (t.late_reason ? 'Lý do: ' + esc(t.late_reason) : 'Chưa ghi lý do trễ hạn') + '</div></div></button>';
      }).join('') + '</div>' + (lates.length > 30 ? '<p class="muted2">Hiển thị 30 việc đầu. Xuất CSV để xem đủ.</p>' : '') : '<div class="empty"><b>Không có việc trễ hạn</b>Mọi việc đang mở trong kỳ đều còn trong hạn.</div>');
    afterHead(); bind(m);
    $('rpR').onchange = function () { S.rp = this.value; render(); };
    $('rpG').onchange = function () { S.rg = this.value; render(); };
    $('rpU').onchange = function () { S.ru = this.value; render(); };
    $('prn').onclick = function () { window.print(); };
    $('csv').onclick = function () { exportCsv(U, byPerson, lates); };
    if (tot) {
      mkChart('rStatus', doughnutCfg(rows));
      mkChart('rMonths', monthsCfg(rows, 0));
      mkChart('rAge', ageCfg(rows));
      mkChart('rPerson', stackedCfg(byPerson, function (r) { return shortName(uname(r.k)); }, true));
      mkChart('rGroup', stackedCfg(byGroup, function (r) { return r.k; }, false));
    }
  }
  function exportCsv(U, byPerson, lates) {
    var q = function (v) { v = String(v == null ? '' : v); return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var lines = [['Nhân sự', 'Tổng việc', 'Hoàn thành', 'Tỷ lệ hoàn thành (%)', 'Đang thực hiện', 'Chờ duyệt', 'Trễ hạn', 'Chưa thực hiện'].map(q).join(',')];
    byPerson.forEach(function (r) { lines.push([uname(r.k), r.n, r.c.done, pctOf(r.c.done, r.n) == null ? '' : pctOf(r.c.done, r.n), r.c.doing, r.c.review, r.c.late, r.c.todo].map(q).join(',')); });
    lines.push('', ['Việc trễ hạn', 'Người nhận', 'Hạn', 'Số ngày trễ', 'Số văn bản', 'Lý do trễ hạn'].map(q).join(','));
    lates.forEach(function (t) { lines.push([t.title, uname(t.assignee), fmtDate(t.due), -diffDays(t.due), t.doc_no, t.late_reason].map(q).join(',')); });
    var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'bao-cao-' + today() + '.csv';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    toast('Đã tải báo cáo CSV, mở được bằng Excel');
  }

  // ---------- Việc lặp định kỳ ----------
  var WD = ['', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ nhật'];
  function cycleText(r) {
    return r.cycle === 'daily' ? 'Mọi ngày làm việc' : (r.cycle === 'weekly' ? WD[Number(r.weekday)] + ' hằng tuần' : 'Ngày ' + Number(r.monthday) + ' hằng tháng');
  }
  function vRec(m) {
    m.innerHTML = head('Việc lặp định kỳ', 'Hệ thống tự tạo và giao việc lúc 7h sáng theo lịch', false).replace('</header>', '<button class="btn primary" id="addR">' + ic('plus') + 'Thêm việc lặp</button></header>') +
      '<div id="recBox"><div class="empty">Đang tải…</div></div>';
    afterHead(); $('addR').onclick = function () { openRec({ cycle: 'weekly', weekday: 1, monthday: 1, due_days: 7, priority: 'Trung bình', active: 'TRUE' }); };
    Api.call('recList').then(function (rows) {
      var box = $('recBox'); if (!box) return;
      box.innerHTML = rows.length ? '<div class="rows rep3 rec"><div class="th"><span>Công việc</span><span>Người nhận</span><span>Lịch</span><span>Hạn sau</span></div>' + rows.map(function (r, i) {
        return '<button class="tr" data-r="' + i + '"><div><div class="t">' + esc(r.title) + '</div><div class="sub">' + (String(r.active).toUpperCase() === 'FALSE' ? 'Đang tắt' : (r.last_run ? 'Tạo lần cuối ' + fmtTime(r.last_run) : 'Chưa chạy lần nào')) + '</div></div>' +
          '<div>' + esc(uname(r.assignee)) + '</div><div>' + esc(cycleText(r)) + '</div><div>' + (Number(r.due_days) || 7) + ' ngày</div></button>';
      }).join('') + '</div>' : '<div class="empty"><b>Chưa có việc lặp</b>Thêm các việc làm đều đặn như báo cáo tuần, kiểm kê tháng.</div>';
      box.querySelectorAll('[data-r]').forEach(function (b) { b.onclick = function () { openRec(rows[b.dataset.r]); }; });
    }).catch(function (e) { var box = $('recBox'); if (box) box.innerHTML = '<div class="empty"><b>Không tải được</b>' + esc(e.message) + '</div>'; });
  }
  function openRec(r) {
    var isNew = !r.id;
    openDrawer('<h2 id="sheetTitle">' + (isNew ? 'Thêm việc lặp' : esc(r.title)) + '</h2>' +
      '<label class="f" for="rT">Tên công việc</label><input id="rT" value="' + esc(r.title) + '">' +
      '<label class="f" for="rD">Nội dung</label><textarea id="rD">' + esc(r.description) + '</textarea>' +
      '<div class="grid3" style="grid-template-columns:1fr 1fr"><div><label class="f" for="rU">Người nhận</label><select id="rU">' + userOpts(r.assignee || '', 'Chưa giao') + '</select></div>' +
      '<div><label class="f" for="rP">Ưu tiên</label><select id="rP">' + priOpts(r.priority) + '</select></div></div>' +
      '<div class="grid3" style="grid-template-columns:1fr 1fr 1fr"><div><label class="f" for="rC">Lặp</label><select id="rC"><option value="daily"' + (r.cycle === 'daily' ? ' selected' : '') + '>Mọi ngày làm việc</option><option value="weekly"' + (r.cycle === 'weekly' ? ' selected' : '') + '>Hằng tuần</option><option value="monthly"' + (r.cycle === 'monthly' ? ' selected' : '') + '>Hằng tháng</option></select></div>' +
      '<div id="rW"><label class="f" for="rWd">Thứ</label><select id="rWd">' + [1, 2, 3, 4, 5, 6, 7].map(function (n) { return '<option value="' + n + '"' + (Number(r.weekday) === n ? ' selected' : '') + '>' + WD[n] + '</option>'; }).join('') + '</select></div>' +
      '<div id="rM"><label class="f" for="rMd">Ngày trong tháng</label><input id="rMd" type="number" min="1" max="31" value="' + (Number(r.monthday) || 1) + '"></div></div>' +
      '<div class="grid3" style="grid-template-columns:1fr 1fr"><div><label class="f" for="rDue">Hạn sau (ngày)</label><input id="rDue" type="number" min="1" max="90" value="' + (Number(r.due_days) || 7) + '"></div>' +
      '<div><label class="f" for="rA">Trạng thái</label><select id="rA"><option value="TRUE"' + (String(r.active).toUpperCase() !== 'FALSE' ? ' selected' : '') + '>Đang bật</option><option value="FALSE"' + (String(r.active).toUpperCase() === 'FALSE' ? ' selected' : '') + '>Tạm tắt</option></select></div></div>' +
      '<div class="actions"><button class="btn primary" id="rGo">Lưu</button>' + (isNew ? '' : '<button class="btn danger" id="rDel">Xóa việc lặp</button>') + '</div>');
    var sync = function () { $('rW').hidden = $('rC').value !== 'weekly'; $('rM').hidden = $('rC').value !== 'monthly'; };
    $('rC').onchange = sync; sync();
    $('rGo').onclick = function () {
      act('saveRecurring', { id: r.id, title: val('rT'), description: val('rD'), assignee: val('rU'), priority: val('rP'), cycle: val('rC'), weekday: val('rWd'), monthday: val('rMd'), due_days: val('rDue'), active: val('rA') !== 'FALSE' }, 'Đã lưu việc lặp', this);
    };
    if ($('rDel')) $('rDel').onclick = function () {
      if (this.dataset.sure) return act('deleteRecurring', { id: r.id }, 'Đã xóa việc lặp', this);
      this.dataset.sure = 1; this.textContent = 'Bấm lần nữa để xóa'; this.classList.add('solid');
    };
  }

  // ---------- Khởi động ----------
  (function boot() {
    if (Api.demo) return loginView();
    var tok = ''; try { tok = localStorage.getItem('gv_tok') || ''; } catch (e) { /* ignore */ }
    if (tok && jwtExp(tok) > Date.now() + 30000) { Api.token = tok; start(); } else loginView();
  })();
})();
