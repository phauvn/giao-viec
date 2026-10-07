/* Lớp gọi API: thật (Apps Script) hoặc xem thử (dữ liệu mẫu trong trình duyệt). */
(function () {
  var cfg = window.APP_CONFIG || {};
  var Api = { demo: !cfg.API_URL || /[?&]demo=1/.test(location.search), token: '' };

  Api.call = function (action, params) {
    if (Api.demo) return Demo.call(action, params || {});
    return fetch(cfg.API_URL, {
      method: 'POST',
      // text/plain tránh preflight CORS mà Apps Script không hỗ trợ
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: action, params: params || {}, idToken: Api.token })
    }).then(function (r) { return r.json(); }).then(function (r) {
      if (!r.ok) { var e = new Error(r.error || 'Lỗi không xác định'); e.auth = /đăng nhập|hết hạn|Token/i.test(e.message); throw e; }
      return r.data;
    });
  };

  // ---------- Dữ liệu mẫu ----------
  var Demo = { as: 'admin' };
  var D = 86400000;
  function day(n) { var d = new Date(Date.now() + n * D); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function ts(n) { return day(n) + 'T09:30:00'; }
  var U = [
    ['phauvn@gmail.com', 'Lương Thế Phú', 'Trưởng phòng Kỹ thuật - Đầu tư', 'Admin', 'Lãnh đạo'],
    ['truongdinhtuephuc@gmail.com', 'Trương Đình Tuệ Phúc', 'Phó Trưởng phòng Kỹ thuật - Đầu tư', 'Staff', 'Lãnh đạo'],
    ['buithibichngoc1235@gmail.com', 'Bùi Thị Bích Ngọc', 'Chuyên viên Quản lý Chất lượng mạng', 'Staff', 'Chất lượng mạng'],
    ['khiemlongan@gmail.com', 'Tăng Hồng Khiêm', 'Chuyên viên Quản lý hạ tầng Vô tuyến', 'Staff', 'Vô tuyến'],
    ['tuan.tnh@gmail.com', 'Thạch Quốc Tuấn', 'Chuyên viên Quản lý hạ tầng Vô tuyến', 'Staff', 'Vô tuyến'],
    ['tantai.ptithcm@gmail.com', 'Nguyễn Tấn Tài', 'Chuyên viên Quản lý hạ tầng Hữu tuyến', 'Staff', 'Hữu tuyến'],
    ['nguyensvan@gmail.com', 'Nguyễn Sĩ Văn', 'Chuyên viên đầu tư, mua sắm', 'Staff', 'Đầu tư - Mua sắm'],
    ['locnv.lan@gmail.com', 'Nguyễn Vĩnh Lộc', 'Chuyên viên đầu tư, mua sắm', 'Staff', 'Đầu tư - Mua sắm'],
    ['huynhthingocmai44@gmail.com', 'Huỳnh Thị Ngọc Mai', 'Chuyên viên Quản lý Nhà đất - Tài sản', 'Staff', 'Nhà đất - Tài sản'],
    ['tranhoangtam@gmail.com', 'Trần Hoàng Tâm', 'Chuyên viên Quản lý hạ tầng Hữu tuyến', 'Staff', 'Hữu tuyến'],
    ['quypp.lan@gmail.com', 'Hà Hoài Nam', 'Chuyên viên Quản lý hạ tầng Hữu tuyến', 'Staff', 'Hữu tuyến'],
    ['phonglttnh@gmail.com', 'Lê Tấn Phong', 'Chuyên viên Quản lý hạ tầng Vô tuyến', 'Staff', 'Vô tuyến']
  ];
  var users = U.map(function (u) { return { email: u[0], name: u[1], title: u[2], role: u[3], group: u[4], active: 'TRUE' }; });
  var T = [
    ['Rà soát kế hoạch đầu tư hạ tầng trạm BTS quý IV', 'nguyensvan@gmail.com', 'Cao', 'Google Sheet', 6, 'Đang làm', 60],
    ['Lập hồ sơ mua sắm thiết bị truyền dẫn quang', 'locnv.lan@gmail.com', 'Cao', 'Nhập tay', -2, 'Đang làm', 35],
    ['Báo cáo chất lượng mạng di động tháng 9', 'buithibichngoc1235@gmail.com', 'Trung bình', 'Việc lặp', 1, 'Chờ duyệt', 100],
    ['Khảo sát vị trí đặt trạm mới khu công nghiệp', 'khiemlongan@gmail.com', 'Cao', 'Nhập tay', 4, 'Đang làm', 25],
    ['Kiểm tra tuyến cáp treo xuống cấp huyện phía Nam', 'tantai.ptithcm@gmail.com', 'Cao', 'Biểu mẫu', -5, 'Đang làm', 50],
    ['Cập nhật bản đồ hạ tầng cống bể', 'tranhoangtam@gmail.com', 'Thấp', 'Web công ty', 12, 'Mới', 0],
    ['Hoàn thiện hồ sơ pháp lý nhà đất cơ sở Tân Bình', 'huynhthingocmai44@gmail.com', 'Trung bình', 'Nhập tay', 8, 'Đang làm', 75],
    ['Tối ưu vùng phủ sóng 4G khu vực ven đô', 'tuan.tnh@gmail.com', 'Trung bình', 'Google Sheet', 3, 'Mới', 0],
    ['Kiểm kê tài sản thiết bị mạng truy nhập', 'quypp.lan@gmail.com', 'Trung bình', 'Việc lặp', -1, 'Chờ duyệt', 100],
    ['Đánh giá nhà thầu thi công cáp quang đợt 2', 'phonglttnh@gmail.com', 'Cao', 'Email', 5, 'Đang làm', 40],
    ['Đề xuất phương án di dời tủ cáp ngoài trời', '', 'Trung bình', 'Biểu mẫu', '', 'Chờ phân công', 0],
    ['Tổng hợp số liệu sự cố hữu tuyến tuần 39', 'tranhoangtam@gmail.com', 'Thấp', 'Việc lặp', -9, 'Hoàn thành', 100],
    ['Nghiệm thu thiết bị vô tuyến lô 3', 'khiemlongan@gmail.com', 'Trung bình', 'Nhập tay', -6, 'Hoàn thành', 100],
    ['Soạn kế hoạch bảo trì tuyến cáp trục', 'truongdinhtuephuc@gmail.com', 'Cao', 'Nhập tay', 7, 'Đang làm', 20]
  ];
  var tasks = T.map(function (t, i) {
    return {
      id: 'T' + (1000 + i), title: t[0], description: 'Phối hợp các đơn vị liên quan, báo cáo kết quả bằng văn bản và đính kèm số liệu.',
      assigner: 'phauvn@gmail.com', assignee: t[1], priority: t[2], source: t[3], due: t[4] === '' ? '' : day(t[4]),
      status: t[5], progress: t[6], created: ts(-14), updated: ts(-1), done: t[5] === 'Hoàn thành' ? ts(-3) : '', doc_no: t[3] === 'Google Sheet' || t[3] === 'Email' ? (800 + i) + '/VNPT-TNH-KTĐT' : '', coop: i % 4 === 0 ? 'Tất cả thành viên Phòng' : '', late_reason: t[4] !== '' && t[4] < 0 && t[5] !== 'Hoàn thành' ? 'Chờ số liệu từ đơn vị phối hợp.' : '', owner_raw: '',
      result: t[5] === 'Chờ duyệt' ? 'Đã hoàn thành, số liệu đính kèm trong file.' : '', link: ''
    };
  });
  var updates = [
    { task_id: 'T1000', by: 'nguyensvan@gmail.com', time: ts(-4), progress: 30, note: 'Đã thu thập danh sách trạm cần rà soát.', link: '' },
    { task_id: 'T1000', by: 'nguyensvan@gmail.com', time: ts(-1), progress: 60, note: 'Hoàn tất đối chiếu với kế hoạch năm.', link: '' }
  ];
  var seq = 2000;
  var rec = [
    { id: 'R1', title: 'Báo cáo chất lượng mạng tuần', description: '', assignee: 'buithibichngoc1235@gmail.com', priority: 'Trung bình', cycle: 'weekly', weekday: 5, monthday: 1, due_days: 3, active: 'TRUE', last_run: '' },
    { id: 'R2', title: 'Tổng hợp sự cố hữu tuyến tháng', description: '', assignee: 'tantai.ptithcm@gmail.com', priority: 'Cao', cycle: 'monthly', weekday: 1, monthday: 1, due_days: 5, active: 'TRUE', last_run: '' }
  ];
  var sync = { last: '', unmatched: [{ name: 'Trường Giang', count: 3 }] };

  function me() { return users.filter(function (u) { return u.email === (Demo.as === 'admin' ? 'phauvn@gmail.com' : 'khiemlongan@gmail.com'); })[0]; }
  function find(id) { var t = tasks.filter(function (x) { return x.id === id; })[0]; if (!t) throw new Error('Không tìm thấy công việc.'); return t; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function admin() { if (me().role !== 'Admin') throw new Error('Chỉ trưởng phòng được thực hiện thao tác này.'); }
  function nowS() { return new Date().toISOString().slice(0, 19); }

  var A = {
    bootstrap: function () {
      var u = me(), a = u.role === 'Admin';
      return clone({
        me: { email: u.email, name: u.name, title: u.title, role: u.role, isAdmin: a },
        users: users, tasks: a ? tasks : tasks.filter(function (t) { return t.assignee === u.email; }),
        statuses: ['Chờ phân công', 'Mới', 'Đang làm', 'Chờ duyệt', 'Hoàn thành'], priorities: ['Cao', 'Trung bình', 'Thấp']
      });
    },
    createTask: function (p) {
      admin(); if (!String(p.title || '').trim()) throw new Error('Thiếu tiêu đề công việc.');
      (p.assignees && p.assignees.length ? p.assignees : ['']).forEach(function (a) {
        tasks.unshift({ id: 'T' + (seq++), title: p.title, description: p.description || '', assigner: me().email, assignee: a, priority: p.priority || 'Trung bình', source: 'Nhập tay', due: p.due || '', status: a ? 'Mới' : 'Chờ phân công', progress: 0, created: nowS(), updated: nowS(), done: '', result: '', link: p.link || '' });
      });
      return true;
    },
    saveTask: function (p) {
      admin(); var t = find(p.id);
      ['title', 'description', 'assignee', 'priority', 'due', 'link', 'late_reason'].forEach(function (k) { if (p[k] !== undefined) t[k] = p[k]; });
      if (t.status === 'Chờ phân công' && t.assignee) t.status = 'Mới';
      if (t.status === 'Mới' && !t.assignee) t.status = 'Chờ phân công';
      t.updated = nowS(); return true;
    },
    progress: function (p) {
      var t = find(p.id), u = me();
      if (t.assignee !== u.email && u.role !== 'Admin') throw new Error('Bạn không có quyền với công việc này.');
      var pct = Math.max(0, Math.min(100, Number(p.progress) || 0)), note = String(p.note || '').trim();
      if (p.submit && !note && !p.link) throw new Error('Hãy ghi kết quả hoặc đính kèm link khi nộp.');
      t.progress = p.submit ? 100 : pct; t.status = p.submit ? 'Chờ duyệt' : (pct > 0 ? 'Đang làm' : 'Mới'); t.updated = nowS();
      if (p.submit) t.result = note;
      updates.push({ task_id: t.id, by: u.email, time: nowS(), progress: t.progress, note: (p.submit ? '[Nộp kết quả] ' : '') + note, link: p.link || '' });
      return true;
    },
    review: function (p) {
      admin(); var t = find(p.id);
      if (p.decision === 'approve') { t.status = 'Hoàn thành'; t.progress = 100; t.done = nowS(); } else { t.status = 'Đang làm'; t.progress = 90; }
      updates.push({ task_id: t.id, by: me().email, time: nowS(), progress: t.progress, note: (p.decision === 'approve' ? '[Đã duyệt] ' : '[Yêu cầu làm lại] ') + (p.note || ''), link: '' });
      return true;
    },
    syncStatus: function () {
      admin();
      return clone({ sources: [{ id: 'src1', name: 'Sổ theo dõi công việc', type: 'sheet', active: 'TRUE', last_sync: sync.last, last_result: sync.last ? 'Tab "Theo dõi": thêm 0, cập nhật 2, bỏ qua 640 việc cũ.' : '' }], unmatched: sync.unmatched });
    },
    runSync: function () {
      admin(); sync.last = nowS();
      return { summary: ['Sổ theo dõi công việc: thêm 0, cập nhật 2, bỏ qua 640 việc cũ.'], unmatched: sync.unmatched };
    },
    addAlias: function (p) {
      admin(); var u = users.filter(function (x) { return x.email === p.email; })[0]; if (!u) throw new Error('Không tìm thấy nhân sự.');
      u.alias = (u.alias ? u.alias + ', ' : '') + p.alias;
      sync.unmatched = sync.unmatched.filter(function (x) { return x.name !== p.alias; }); sync.last = nowS();
      return { summary: ['Đã gán "' + p.alias + '" cho ' + u.name + '.'], unmatched: sync.unmatched };
    },
    recList: function () { admin(); return clone(rec); },
    saveRecurring: function (p) {
      admin(); if (!String(p.title || '').trim()) throw new Error('Thiếu tên công việc lặp.');
      var o = { title: p.title, description: p.description || '', assignee: p.assignee || '', priority: p.priority || 'Trung bình', cycle: p.cycle, weekday: Number(p.weekday) || 1, monthday: Number(p.monthday) || 1, due_days: Number(p.due_days) || 7, active: p.active === false ? 'FALSE' : 'TRUE' };
      var ex = p.id && rec.filter(function (x) { return x.id === p.id; })[0];
      if (ex) Object.assign(ex, o); else { o.id = 'R' + (seq++); o.last_run = ''; rec.push(o); }
      return true;
    },
    deleteRecurring: function (p) { admin(); rec = rec.filter(function (x) { return x.id !== p.id; }); return true; },
    remove: function (p) { admin(); tasks.splice(tasks.indexOf(find(p.id)), 1); return true; },
    history: function (p) { find(p.id); return clone(updates.filter(function (x) { return x.task_id === p.id; }).reverse()); },
    saveUser: function (p) {
      admin(); var email = String(p.email || '').trim().toLowerCase(); if (!email) throw new Error('Thiếu email.');
      var u = users.filter(function (x) { return x.email === email; })[0];
      if (!u) { u = { email: email }; users.push(u); }
      u.name = p.name || ''; u.alias = p.alias || ''; u.telegram_id = p.telegram_id || ''; u.title = p.title || ''; u.role = p.role === 'Admin' ? 'Admin' : 'Staff'; u.group = p.group || ''; u.active = p.active === false ? 'FALSE' : 'TRUE';
      if (u.active === 'FALSE') users.splice(users.indexOf(u), 1);
      return true;
    }
  };
  Demo.call = function (action, p) {
    return new Promise(function (res, rej) {
      setTimeout(function () { try { res(A[action](p)); } catch (e) { rej(e); } }, 120);
    });
  };
  Api.Demo = Demo;
  window.Api = Api;
})();
