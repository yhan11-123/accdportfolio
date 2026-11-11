/* Reflow — the database, drawn the way Supabase's schema visualizer shows it.
   Tables and columns come from window.REFLOW_SCHEMA (js/reflow-schema.js,
   generated from the app's real schema). Layout is a fixed 1180 x 820 board,
   scaled to fit the column; on a phone it keeps a readable scale and pans
   sideways, like the real canvas. */
(function () {
    var root = document.querySelector('[data-sb-canvas]');
    var S = window.REFLOW_SCHEMA;
    if (!root || !S) return;

    var W = 1180, H = 820, TW = 200, HEAD = 32, ROW = 22;

    /* Where each table sits. The four small tables are shown collapsed:
       only the column that links them to users, as when you fold them. */
    var PLACE = {
        tasks:           { x: 20,  y: 30 },
        schedule_blocks: { x: 262, y: 150 },
        projects:        { x: 504, y: 40 },
        areas:           { x: 746, y: 30 },
        users:           { x: 966, y: 300 },
        settings:        { x: 746, y: 300, fold: true },
        feedback:        { x: 746, y: 392, fold: true },
        timer_sessions:  { x: 746, y: 484, fold: true },
        user_goals:      { x: 746, y: 576, fold: true }
    };

    var FKS = [
        ['tasks', 'project_id', 'projects'], ['tasks', 'schedule_block_id', 'schedule_blocks'],
        ['tasks', 'area_id', 'areas'], ['tasks', 'user_id', 'users'],
        ['schedule_blocks', 'project_id', 'projects'], ['schedule_blocks', 'area_id', 'areas'],
        ['schedule_blocks', 'user_id', 'users'],
        ['projects', 'area_id', 'areas'], ['projects', 'user_id', 'users'],
        ['areas', 'user_id', 'users'],
        ['settings', 'user_id', 'users'], ['feedback', 'user_id', 'users'],
        ['timer_sessions', 'user_id', 'users'], ['user_goals', 'user_id', 'users']
    ];

    /* The columns the "one row, taken apart" panel names. */
    var HIGHLIGHT = { tasks: ['status', 'duration', 'scheduled_start_time', 'importance', 'carried_over', 'is_postponed'] };

    var ICON = {
        table: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="2.5" width="12" height="11" rx="1.5"/><path d="M2 6.5h12M6.5 6.5v7"/></svg>',
        key: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="5.5" cy="10.5" r="3"/><path d="M7.7 8.3L13 3M11 5l1.6 1.6"/></svg>',
        dot: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="3" r="1.2"/><circle cx="8" cy="8" r="1.2"/><circle cx="8" cy="13" r="1.2"/></svg>'
    };

    function rowsOf(name) {
        var t = S[name], p = PLACE[name];
        if (!p.fold) return t.cols;
        return t.cols.filter(function (c) { return c[0] === 'user_id'; });
    }

    function rowY(name, col) {
        var rows = rowsOf(name);
        for (var i = 0; i < rows.length; i++) {
            if (rows[i][0] === col) return PLACE[name].y + HEAD + i * ROW + ROW / 2;
        }
        return PLACE[name].y + HEAD / 2;
    }

    function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

    /* ---------- tables ---------- */
    var stage = document.createElement('div');
    stage.className = 'sb-stage';
    stage.style.width = W + 'px';
    stage.style.height = H + 'px';

    var html = '';
    Object.keys(PLACE).forEach(function (name) {
        var t = S[name], p = PLACE[name];
        var hl = HIGHLIGHT[name] || [];
        var rows = rowsOf(name);
        html += '<div class="sb-table" style="left:' + p.x + 'px;top:' + p.y + 'px;width:' + TW + 'px">';
        html += '<div class="sb-head">' + ICON.table + '<b>' + esc(name) + '</b>' + ICON.dot + '</div>';
        rows.forEach(function (c) {
            var pk = c[0] === t.pk;
            var cls = 'sb-row' + (hl.indexOf(c[0]) > -1 ? ' is-hl' : '');
            html += '<div class="' + cls + '">' +
                '<span class="sb-ico">' + (pk ? ICON.key : '') +
                '<i class="sb-dia' + (c[2] || pk ? ' is-nn' : '') + '"></i></span>' +
                '<span class="sb-col">' + esc(c[0]) + '</span>' +
                '<span class="sb-type">' + esc(c[1]) + '</span></div>';
        });
        if (p.fold) html += '<div class="sb-row sb-more">+ ' + (t.cols.length - 1) + ' more columns</div>';
        html += '</div>';
    });

    /* ---------- relationship lines, under the tables ---------- */
    var lane = {};
    var paths = '';
    FKS.forEach(function (fk) {
        var src = fk[0], dst = fk[2];
        var sx = PLACE[src].x + TW, sy = rowY(src, fk[1]);
        var dx = PLACE[dst].x, dy = rowY(dst, 'id');
        lane[src] = (lane[src] || 0) + 1;
        var gap = dx - sx;
        var mx = sx + Math.min(gap - 6, 8 + (lane[src] - 1) * 6);
        if (PLACE[src].fold) mx = sx + gap / 2;
        paths += '<path d="M' + sx + ' ' + sy + 'H' + mx + 'V' + dy + 'H' + dx + '"/>' +
                 '<circle cx="' + sx + '" cy="' + sy + '" r="2.2"/><circle cx="' + dx + '" cy="' + dy + '" r="2.2"/>';
    });

    stage.innerHTML =
        '<svg class="sb-lines" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">' + paths + '</svg>' +
        html +
        '<div class="sb-legend">' +
          '<span>' + ICON.key + 'Primary key</span>' +
          '<span><i class="sb-hash">#</i>Identity</span>' +
          '<span><i class="sb-dia"></i>Nullable</span>' +
          '<span><i class="sb-dia is-nn"></i>Non-nullable</span>' +
          '<span><i class="sb-swatch"></i>Read by the row below</span>' +
        '</div>';

    var frame = document.createElement('div');
    frame.className = 'sb-frame';
    frame.appendChild(stage);
    root.appendChild(frame);

    /* ---------- fit to the column ---------- */
    function fit() {
        var avail = root.clientWidth;
        var narrow = avail < 700;
        /* On a phone, keep it legible and let it pan, like the real canvas. */
        var s = narrow ? 0.62 : Math.min(1, avail / W);
        stage.style.transform = 'scale(' + s + ')';
        frame.style.width = (W * s) + 'px';
        frame.style.height = (H * s) + 'px';
        root.classList.toggle('is-pan', narrow);
    }
    fit();
    window.addEventListener('resize', fit);
})();
