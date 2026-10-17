/*
 * Lấy việc giao từ eOffice (chạy trong thẻ eOffice đã đăng nhập, mở thư mục "VB đến đã xử lý").
 * Đọc lời chỉ đạo của trưởng phòng trong từng văn bản, bóc tách người phụ trách, phối hợp, hạn,
 * rồi chuyển danh sách sang web giao việc. Chỉ ĐỌC: không bấm Xử lý, Tạo việc, Lưu hay mở tệp đính kèm.
 * Lưu ý: mở văn bản chưa đọc thì eOffice tự ghi "Đã xem" dưới tên người dùng.
 */
(function () {
  var APP = 'https://phauvn.github.io/giao-viec/';
  var APP_ORIGIN = 'https://phauvn.github.io';
  var ME = /phult\.lan|Lương Thế Phú/;         // người chỉ đạo cần tìm trong lịch sử văn bản
  var NAME = '\\p{Lu}[\\p{L}]*';

  // ---------- Bóc tách lời chỉ đạo ----------
  function persons(s) {
    var out = [], re = /([^.;()]+?)\s*\(([A-Za-z0-9._@-]+)\)/g, m;
    while ((m = re.exec(s || ''))) out.push(m[1].replace(/^[\s.]+/, '').trim());
    return out.filter(Boolean);
  }
  function section(t, label) {
    var m = t.match(new RegExp(label + '\\s*(.*?)(?=(Xử lý chính:|Phối hợp:|Xem để biết:|Thao tác:|$))'));
    return m ? m[1] : '';
  }
  function pad(n) { return ('0' + n).slice(-2); }
  function findDue(free, ref) {
    var re = /(\d{1,2})\s*[\/.-]\s*(\d{1,2})(?:\s*[\/.-]\s*(\d{4}|\d{2}))?/g, m;
    while ((m = re.exec(free))) {
      var before = free.slice(Math.max(0, m.index - 40), m.index);
      if (!/(trước|trong|hạn|chậm nhất|đến|vào|hoàn thành|báo cáo|gửi|phúc đáp|hết)[^.\d]{0,30}(?:\d{1,2}\s*(?:h|giờ)\d{0,2}[^.\d]{0,15})?$/i.test(before)) continue;
      var d = +m[1], mo = +m[2], y = m[3] ? +m[3] : ref.getFullYear();
      if (y < 100) y += 2000;
      if (d < 1 || d > 31 || mo < 1 || mo > 12) continue;
      var dt = new Date(y, mo - 1, d);
      if (!m[3] && dt < new Date(ref.getTime() - 200 * 86400000)) dt = new Date(y + 1, mo - 1, d);
      return dt.getFullYear() + '-' + pad(dt.getMonth() + 1) + '-' + pad(dt.getDate());
    }
    return '';
  }
  function parseDirective(raw, ref) {
    var t = String(raw || '').replace(/\s+/g, ' ').replace(/Thu gọn|Xem chi tiết|Thông tin giao việc|Đã xem/g, ' ').replace(/\s+/g, ' ').trim();
    var iSec = t.search(/(Xử lý chính:|Phối hợp:|Xem để biết:|Thao tác:)/);
    var free = (iSec < 0 ? t : t.slice(0, iSec)).trim();
    var xlc = persons(section(t, 'Xử lý chính:'));
    var coop = persons(section(t, 'Phối hợp:'));
    var m = free.match(new RegExp('(?:chuyển|giao|nhờ)\\s+(?:cho\\s+)?(?:anh|chị|đ\\/c|đồng chí)\\s+(' + NAME + '(?:\\s+' + NAME + ')?)', 'iu'));
    var main = '';
    if (m) {
      // chỉ lấy từ viết hoa liên tiếp (tên riêng), bỏ động từ viết thường theo sau
      main = m[1].split(/\s+/).filter(function (w) { return /^\p{Lu}/u.test(w); }).join(' ');
    }
    if (!main && xlc.length) main = xlc[0];
    return { main: main, coop: coop, due: findDue(free, ref), directive: free };
  }
  window.__gvParse = parseDirective;
  if (window.__gvEofficeTestOnly) return;

  // ---------- Giao diện ----------
  if (document.getElementById('gv-panel')) { document.getElementById('gv-panel').style.display = 'block'; return; }
  var st = { stop: false, items: [], meta: null, running: false };
  var p = document.createElement('div');
  p.id = 'gv-panel';
  p.style.cssText = 'position:fixed;top:12px;right:12px;z-index:2147483647;width:340px;background:#fff;color:#14202b;border:2px solid #1553c7;border-radius:10px;box-shadow:0 8px 28px rgba(0,0,0,.3);font:14px/1.45 Arial,sans-serif;padding:14px';
  p.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:15px">Lấy việc giao từ eOffice</b><span id="gv-x" style="cursor:pointer;font-size:20px;padding:0 6px" title="Đóng">&times;</span></div>' +
    '<div style="margin:8px 0 4px;color:#44526a;font-size:12px">Chỉ đọc lời chỉ đạo của trưởng phòng, không sửa gì trong eOffice.</div>' +
    '<label style="display:block;margin-top:8px">Quét văn bản bạn đã chỉ đạo trong: <select id="gv-days" style="padding:5px"><option value="1">1 ngày</option><option value="2">2 ngày</option><option value="3">3 ngày</option><option value="5">5 ngày</option><option value="7" selected>7 ngày</option><option value="10">10 ngày</option><option value="14">14 ngày</option><option value="30">30 ngày</option></select></label>' +
    '<div style="margin-top:10px"><button id="gv-go" style="background:#1553c7;color:#fff;border:0;border-radius:6px;padding:8px 14px;cursor:pointer;font-weight:bold">Bắt đầu</button> <button id="gv-stop" style="display:none;padding:8px 12px;border-radius:6px;border:1px solid #888;background:#fff;cursor:pointer">Dừng</button></div>' +
    '<div style="margin-top:10px;height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden"><div id="gv-bar" style="height:100%;width:0;background:#1b7f55"></div></div>' +
    '<div id="gv-msg" style="margin-top:8px;font-size:13px">Sẵn sàng. Hãy giữ thẻ này đang mở trong lúc chạy.</div><div id="gv-out" style="margin-top:8px"></div>';
  document.body.appendChild(p);
  var $ = function (id) { return document.getElementById(id); };
  var msg = function (t) { $('gv-msg').textContent = t; };
  $('gv-x').onclick = function () { st.stop = true; p.style.display = 'none'; };
  $('gv-stop').onclick = function () { st.stop = true; msg('Đang dừng...'); };

  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var detailEo = function () {
    var b = [].slice.call(document.querySelectorAll('td > b')).filter(function (x) { return x.innerText.trim() === 'SỐ EOFFICE' && x.offsetParent !== null; })[0];
    return b && b.parentElement.nextElementSibling ? b.parentElement.nextElementSibling.innerText.trim() : '';
  };
  var logRows = function () {
    var rows = [];
    [].slice.call(document.querySelectorAll('table')).filter(function (t) { return /Lãnh đạo chỉ đạo/.test(t.innerText) && /Nội dung/.test(t.innerText) && t.offsetParent !== null; }).forEach(function (tb) {
      [].slice.call(tb.querySelectorAll('tbody tr')).forEach(function (tr) {
        var cs = [].slice.call(tr.children);
        if (cs.length >= 8 && /^\d+$/.test(cs[0].innerText.trim())) rows.push({ sender: cs[1].innerText.replace(/\s+/g, ' ').trim(), time: cs[6].innerText.trim(), content: cs[7].innerText.replace(/\s+/g, ' ').trim() });
      });
    });
    return rows;
  };
  function parseTime(s) { var m = String(s).match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/); return m ? new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0)) : null; }
  function isoTime(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }

  async function openDoc(row) {
    var eo = row.children[3].innerText.trim();
    row.children[4].click();
    var t0 = Date.now();
    while (Date.now() - t0 < 10000) { await sleep(300); if (detailEo() === eo && logRows().length) { await sleep(500); break; } }
    if (detailEo() !== eo) return null;
    var sp = [].slice.call(document.querySelectorAll('span')).filter(function (e) { return /view_log_detail_full\('[0-9]+','QLVB_VNPT_TNH\.'\)/.test(e.getAttribute('onclick') || '') && e.offsetParent !== null; })[0];
    if (sp) { var before = logRows().length; sp.click(); var t1 = Date.now(); while (Date.now() - t1 < 6000) { await sleep(300); if (logRows().length !== before) { await sleep(400); break; } } }
    return logRows();
  }

  async function run() {
    if (st.running) return;
    if (document.title.indexOf('VB đến đã xử lý') < 0) { msg('Hãy mở Văn bản đến → "VB đến đã xử lý" rồi bấm lại.'); return; }
    st.running = true; st.stop = false; st.items = []; $('gv-out').innerHTML = '';
    $('gv-go').disabled = true; $('gv-stop').style.display = 'inline-block';
    var days = +$('gv-days').value, now = new Date();
    var cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days + 1, 0, 0);
    var arriveMin = new Date(cutoff.getTime() - 21 * 86400000);
    try {
      var sel = document.getElementById('selectPageRec');
      if (sel && sel.value !== '100') { sel.value = '100'; sel.dispatchEvent(new Event('change', { bubbles: true })); if (window.jQuery) window.jQuery(sel).trigger('change'); msg('Đang tải danh sách văn bản...'); await sleep(4000); }
      var list = [].slice.call(document.querySelectorAll('table tbody tr')).filter(function (r) { return r.getAttribute('flyid'); });
      var todo = list.filter(function (r) { var d = parseTime(r.children[7].innerText); return !d || d >= arriveMin; });
      if (window.__gvMaxDocs) todo = todo.slice(0, window.__gvMaxDocs);
      var scanned = 0, noDue = 0, failed = 0, byDoc = {};
      for (var i = 0; i < todo.length; i++) {
        if (st.stop) break;
        var r = todo[i], so = r.children[5].innerText.replace(/\s+/g, ' ').trim(), title = r.children[4].innerText.replace(/\s+/g, ' ').trim();
        msg('Đang đọc ' + (i + 1) + '/' + todo.length + ': ' + so);
        $('gv-bar').style.width = Math.round((i + 1) / todo.length * 100) + '%';
        var rows = await openDoc(r);
        if (!rows) { failed++; continue; }
        scanned++;
        var mine = rows.filter(function (x) { return ME.test(x.sender) && x.content.replace(/Đã xem|Thu gọn/g, '').trim(); }).map(function (x) { return { t: parseTime(x.time), content: x.content }; }).filter(function (x) { return x.t && x.t >= cutoff; });
        if (!mine.length) continue;
        mine.sort(function (a, b) { return b.t - a.t; });
        var hit = null;
        for (var k = 0; k < mine.length && !hit; k++) { var pr = parseDirective(mine[k].content, mine[k].t); if (pr.due) hit = { pr: pr, t: mine[k].t }; }
        if (!hit) { noDue++; continue; }
        if (!byDoc[so]) byDoc[so] = { doc_no: so, title: title, main: hit.pr.main, coop: hit.pr.coop, due: hit.pr.due, directive: hit.pr.directive, directive_time: isoTime(hit.t), eoffice_no: r.children[3].innerText.trim() };
      }
      st.items = Object.keys(byDoc).map(function (k) { return byDoc[k]; });
      st.meta = { source: 'eOffice', days: days, scanned: scanned, failed: failed, noDue: noDue, stopped: st.stop, at: isoTime(new Date()) };
      done();
    } catch (e) { msg('Lỗi: ' + e.message); }
    st.running = false; $('gv-go').disabled = false; $('gv-stop').style.display = 'none';
  }

  function done() {
    var m = st.meta;
    msg((m.stopped ? 'Đã dừng. ' : 'Hoàn tất. ') + 'Đã đọc ' + m.scanned + ' văn bản' + (m.failed ? ' (' + m.failed + ' không mở được)' : '') + ': ' + st.items.length + ' việc có hạn cụ thể, ' + m.noDue + ' văn bản không ghi hạn (bỏ qua).');
    $('gv-bar').style.width = '100%';
    $('gv-out').innerHTML = '<button id="gv-send" style="background:#1b7f55;color:#fff;border:0;border-radius:6px;padding:8px 14px;cursor:pointer;font-weight:bold"' + (st.items.length ? '' : ' disabled') + '>Chuyển sang web giao việc</button> <button id="gv-copy" style="padding:8px 12px;border-radius:6px;border:1px solid #888;background:#fff;cursor:pointer">Sao chép</button><div id="gv-sent" style="margin-top:6px;font-size:12px;color:#44526a"></div>';
    $('gv-copy').onclick = function () {
      var txt = JSON.stringify(st.items, null, 1);
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { $('gv-sent').textContent = 'Đã sao chép danh sách, dán vào trang Nhập từ eOffice.'; }, function () { var ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); $('gv-sent').textContent = 'Đã sao chép danh sách.'; });
    };
    $('gv-send').onclick = function () {
      var w = window.open(APP + '#eoffice', 'giaoviec_app');
      if (!w) { $('gv-sent').textContent = 'Trình duyệt chặn cửa sổ mới. Cho phép cửa sổ bật lên hoặc dùng nút Sao chép.'; return; }
      $('gv-sent').textContent = 'Đang chờ web giao việc mở (đăng nhập Google nếu được hỏi)...';
      function onMsg(e) {
        if (e.origin !== APP_ORIGIN || !e.data || e.data.type !== 'giaoviec-ready') return;
        w.postMessage({ type: 'eoffice-items', items: st.items, meta: st.meta }, APP_ORIGIN);
        $('gv-sent').textContent = 'Đã chuyển ' + st.items.length + ' việc sang web giao việc.';
        window.removeEventListener('message', onMsg);
      }
      window.addEventListener('message', onMsg);
    };
  }
  $('gv-go').onclick = run;
})();
