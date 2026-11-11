/* Reflow — one afternoon, drawn with the app's own Today screen.
   Each [data-tl] block has step buttons (in HTML) and an empty board. This
   script draws the same afternoon on every board using the app's real
   components (task rows, the running-task card, fixed blocks, the
   CARRIED / POSTPONED tags, the reschedule sheet) and moves it between
   states, so the broken day (section 01) and the rebuilt day (section 03)
   are visibly the same afternoon in the same product.

   The day is a list, as in the app: a sequence, not a grid. The 5 PM
   bakery shift is the hard stop; what doesn't fit lands under Tomorrow.

   It loops on its own while in view; a click picks a step and holds it
   for a few seconds. */
(function () {
    /* Item heights in px. The list is positioned by hand so rows can glide
       to new places when the order changes. */
    var H = { row: 58, run: 176, fixed: 60, head: 38, btn: 56, summary: 132 };

    var TASKS = {
        reading: { name: 'Read pharmacology ch. 7',        cat: 'Pharmacology', dur: '30M', dots: 2, color: '#5E8CB2' },
        laundry: { name: 'Laundry',                        cat: 'Chores',       dur: '30M', dots: 1, color: '#7E9E78' },
        write:   { name: 'Write up skills lab checklist',  cat: 'Skills lab',   dur: '60M', dots: 3, color: '#C07C92' },
        order:   { name: 'Order textbook for autumn term', cat: 'Autumn term',  dur: '15M', dots: 2, color: '#DE9E7E' },
        journal: { name: 'Journal',                        cat: 'Routine',      dur: '15M', dots: 2, color: '#A493BE' }
    };

    var FIXED = {
        class: { name: 'Skills lab',           when: '2:00 PM — 3:30 PM', cat: 'Skills lab', color: '#6F6A9C' },
        shift: { name: 'Bakery evening shift', when: '5:00 PM — 8:00 PM', cat: 'Money',      color: '#9B8AA3' }
    };

    /* The running card, over its estimate, as the app shows it. */
    var OVER = { timer: '+0:30', started: 'Started 1:00 PM · over 30M' };

    /* Each state is the list top to bottom: [id, variant, options].
       Variants: row, run, done (tasks); fixed; head (Tomorrow);
       btn (the Reschedule button); summary. */
    var STATES = {
        plan: [
            ['reading', 'row', { time: '1:00 PM' }],
            ['laundry', 'row', { time: '1:30 PM' }],
            ['class', 'fixed'],
            ['write', 'row', { time: '3:30 PM' }],
            ['order', 'row', { time: '4:30 PM' }],
            ['journal', 'row', { time: '4:45 PM' }],
            ['shift', 'fixed']
        ],
        overrun: [
            ['reading', 'run', OVER],
            ['laundry', 'row', { time: '1:30 PM', late: true }],
            ['class', 'fixed'],
            ['write', 'row', { time: '3:30 PM' }],
            ['order', 'row', { time: '4:30 PM' }],
            ['journal', 'row', { time: '4:45 PM' }],
            ['shift', 'fixed']
        ],
        /* Fixing it by hand: laundry can't fit before class, so it goes
           after it, the write-up slides, and two tasks fall past the shift. */
        cascade: [
            ['reading', 'done', { time: '1:00 PM', dur: '60M' }],
            ['class', 'fixed'],
            ['laundry', 'row', { time: '3:30 PM', late: true }],
            ['write', 'row', { time: '4:00 PM', late: true }],
            ['shift', 'fixed'],
            ['tomorrow', 'head', { full: true }],
            ['order', 'row', { tag: 'postponed' }],
            ['journal', 'row', { tag: 'postponed' }]
        ],

        /* The fix, told against the same afternoon. */
        same: [
            ['reading', 'run', OVER],
            ['laundry', 'row', { time: '1:30 PM', late: true }],
            ['class', 'fixed'],
            ['write', 'row', { time: '3:30 PM' }],
            ['order', 'row', { time: '4:30 PM' }],
            ['journal', 'row', { time: '4:45 PM' }],
            ['shift', 'fixed'],
            ['resched', 'btn']
        ],
        ask: [
            ['reading', 'run', OVER],
            ['laundry', 'row', { time: '1:30 PM', late: true }],
            ['class', 'fixed'],
            ['write', 'row', { time: '3:30 PM' }],
            ['order', 'row', { time: '4:30 PM' }],
            ['journal', 'row', { time: '4:45 PM' }],
            ['shift', 'fixed'],
            ['resched', 'btn', { hot: true }]
        ],
        propose: { sheet: true, list: 'ask' },
        result: [
            ['reading', 'done', { time: '1:00 PM', dur: '60M' }],
            ['class', 'fixed'],
            ['write', 'row', { time: '3:30 PM' }],
            ['order', 'row', { time: '4:30 PM' }],
            ['journal', 'row', { time: '4:45 PM' }],
            ['shift', 'fixed'],
            ['tomorrow', 'head'],
            ['laundry', 'row', { tag: 'carried' }],
            ['summary', 'summary']
        ]
    };

    function listFor(name) {
        var s = STATES[name];
        return Array.isArray(s) ? s : STATES[s.list];
    }

    function el(tag, cls, text) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text) e.textContent = text;
        return e;
    }

    function html(tag, cls, markup) {
        var e = el(tag, cls);
        e.innerHTML = markup;
        return e;
    }

    /* Change a label only if it differs, and replay its fade-in. */
    function swap(node, text) {
        if (node.textContent === text) return;
        node.textContent = text;
        node.classList.remove('is-swap');
        void node.offsetWidth;
        node.classList.add('is-swap');
    }

    function buildTask(id) {
        var t = TASKS[id];
        var item = el('div', 'ap-item ap-task');
        item.style.setProperty('--c', t.color);
        item.appendChild(el('span', 'ap-bar'));
        item.appendChild(el('span', 'ap-check'));

        var body = el('div', 'ap-body');
        body.appendChild(el('p', 'ap-title', t.name));

        /* Row meta: tag, time, category, length, importance dots. */
        var meta = el('p', 'ap-meta');
        var tag = el('span', 'ap-tag');
        var time = el('b', 'ap-time');
        var dur = el('span', 'ap-dur');
        meta.appendChild(tag);
        meta.appendChild(time);
        meta.appendChild(el('span', 'ap-cat', t.cat));
        meta.appendChild(dur);
        meta.appendChild(el('span', 'ap-dots', new Array(t.dots + 1).join('●')));
        body.appendChild(meta);

        /* Running-card extras, shown only when this task is the live one. */
        var run = el('div', 'ap-run');
        run.appendChild(el('p', 'ap-run-cat', t.cat));
        var timer = el('p', 'ap-timer');
        var started = el('p', 'ap-started');
        run.appendChild(timer);
        run.appendChild(started);
        run.appendChild(html('div', 'ap-run-actions',
            '<span class="ap-btn ap-btn--done">Done</span><span class="ap-btn ap-btn--ghost">Postpone</span>'));
        body.appendChild(run);

        item.appendChild(body);
        return { el: item, tag: tag, time: time, dur: dur, timer: timer, started: started, kind: 'task', base: t };
    }

    function buildFixed(id) {
        var f = FIXED[id];
        var item = el('div', 'ap-item ap-fixed');
        item.style.setProperty('--c', f.color);
        var inner = el('div', 'ap-fixed-card');
        inner.appendChild(el('p', 'ap-fixed-name', f.name));
        inner.appendChild(el('p', 'ap-fixed-meta', f.when + '  ·  ' + f.cat));
        item.appendChild(inner);
        return { el: item, kind: 'fixed' };
    }

    function height(entry) {
        var v = entry[1];
        return v === 'run' ? H.run : v === 'fixed' ? H.fixed : v === 'head' ? H.head
            : v === 'btn' ? H.btn : v === 'summary' ? H.summary : H.row;
    }

    function build(board) {
        var phone = el('div', 'ap-phone');
        phone.appendChild(html('div', 'ap-head', '<b>Aug · Week 3</b><span>Tue 18</span>'));

        var list = el('div', 'ap-list');
        var items = {};

        Object.keys(TASKS).forEach(function (id) { items[id] = buildTask(id); });
        Object.keys(FIXED).forEach(function (id) { items[id] = buildFixed(id); });

        items.tomorrow = { el: html('div', 'ap-item ap-day-head', '<span>Tomorrow</span><em>Already full</em>'), kind: 'head' };
        items.resched = { el: html('div', 'ap-item ap-resched', '<span>Reschedule</span>'), kind: 'btn' };

        /* The outcome, in the app's end-of-day style. */
        items.summary = { el: html('div', 'ap-item ap-summary',
            '<p class="ap-sum-row"><span class="ap-sum-n">1<small>/6</small></span><span class="ap-sum-label">Moved</span></p>' +
            '<p class="ap-sum-row"><span class="ap-sum-n">0<small>/6</small></span><span class="ap-sum-label">Pushed past the shift</span></p>' +
            '<p class="ap-sum-note">By hand, the same overrun moved 4 tasks, 2 of them past the shift.</p>'), kind: 'summary' };

        Object.keys(items).forEach(function (id) {
            items[id].el.classList.add('is-out');
            list.appendChild(items[id].el);
        });

        /* Reserve the tallest state's height so the board never jumps. */
        var tallest = 0;
        Object.keys(STATES).forEach(function (n) {
            var h = 0;
            listFor(n).forEach(function (e) { h += height(e); });
            tallest = Math.max(tallest, h);
        });
        list.style.height = tallest + 'px';
        phone.appendChild(list);

        /* The reschedule sheet, as the app slides it up over a dimmed day. */
        phone.appendChild(el('div', 'ap-dim'));
        phone.appendChild(html('div', 'ap-sheet',
            '<span class="ap-grip"></span>' +
            '<p class="ap-sheet-label">Reschedule the day</p>' +
            '<p class="ap-sheet-title">1 task can move. Here’s a plan.</p>' +
            '<div class="ap-plan"><p><span>Laundry</span><em>tomorrow</em></p></div>' +
            '<span class="ap-accept">Accept plan</span>' +
            '<p class="ap-myself">Move things myself</p>'));

        board.appendChild(phone);
        return { phone: phone, items: items };
    }

    /* One change at a time, in an order the eye can follow:
         1. what leaves fades out where it stands,
         2. what stays glides to its new place,
         3. what's new fades in,
       and anything that changed gets a brief tint so it's clear where to
       look. Nothing ripples; rows that don't change don't move. */
    var T = { exit: 0, move: 0.22, enter: 0.8, mark: 0.7 };

    function signature(entry) {
        return entry[1] + '|' + JSON.stringify(entry[2] || {});
    }

    function render(view, name, instant) {
        var s = STATES[name];
        var list = listFor(name);
        view.phone.classList.toggle('has-sheet', !Array.isArray(s) && !!s.sheet);

        var shown = {};
        var y = 0;
        list.forEach(function (entry) {
            var id = entry[0], v = entry[1], o = entry[2] || {};
            var it = view.items[id];
            var h = height(entry);
            var sig = signature(entry);
            var entering = !it.on;
            var moved = it.on && (it.top !== y || it.h !== h);
            var changed = !instant && (entering || it.sig !== sig);
            shown[id] = true;

            if (entering) {
                /* Appear in place: no slide from wherever it was hidden. */
                it.el.classList.add('no-move');
                it.el.style.top = y + 'px';
                it.el.style.height = h + 'px';
                void it.el.offsetWidth;
                it.el.classList.remove('no-move');
                it.el.style.setProperty('--d-fade', T.enter + 's');
            } else {
                it.el.style.top = y + 'px';
                it.el.style.height = h + 'px';
                it.el.style.setProperty('--d-fade', '0s');
            }
            it.el.style.setProperty('--d-move', moved ? T.move + 's' : '0s');
            it.el.classList.remove('is-out');
            it.on = true; it.top = y; it.h = h; it.sig = sig;
            y += h;

            if (it.kind === 'task') {
                it.el.classList.toggle('is-run', v === 'run');
                it.el.classList.toggle('is-done', v === 'done');
                it.el.classList.toggle('is-late', !!o.late);
                it.tag.className = 'ap-tag' + (o.tag ? ' ap-tag--' + o.tag : '');
                swap(it.tag, o.tag || '');
                swap(it.time, o.time || '');
                swap(it.dur, o.dur || it.base.dur);
                if (v === 'run') { swap(it.timer, o.timer); swap(it.started, o.started); }
            }
            if (it.kind === 'head') it.el.classList.toggle('is-full', !!o.full);
            if (it.kind === 'btn') it.el.classList.toggle('is-hot', !!o.hot);

            /* The tint that says "this one changed". */
            it.el.classList.remove('is-changed');
            if (changed) {
                void it.el.offsetWidth;
                it.el.style.setProperty('--d-mark', (entering ? T.enter : T.mark) + 's');
                it.el.classList.add('is-changed');
            }
        });

        /* Anything not in this state fades out where it stands, first. */
        Object.keys(view.items).forEach(function (id) {
            var it = view.items[id];
            if (shown[id]) return;
            it.el.style.setProperty('--d-fade', T.exit + 's');
            it.el.classList.add('is-out');
            it.el.classList.remove('is-changed');
            it.on = false;
        });
    }

    document.querySelectorAll('[data-tl]').forEach(function (root) {
        var board = root.querySelector('.tl-board');
        var steps = Array.prototype.slice.call(root.querySelectorAll('.tl-step'));
        if (!board || !steps.length) return;

        var view = build(board);
        var current = 0;
        var timer = null;
        var resume = null;
        var inView = false;
        var held = false;
        var STEP_MS = 4200;      /* time to watch the change, then read it */
        var HOLD_MS = 6000;      /* after a click, how long that choice holds */
        var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        function mark(i) {
            steps.forEach(function (b, j) {
                b.classList.toggle('is-active', j === i);
                b.setAttribute('aria-pressed', j === i ? 'true' : 'false');
            });
        }

        /* Jump without animating: used on load and when the loop starts
           over, so the day never plays backwards. */
        function snap(i) {
            view.phone.classList.add('no-anim');
            render(view, steps[i].dataset.state, true);
            void view.phone.offsetWidth;
            view.phone.classList.remove('no-anim');
        }

        var resetting = null;
        function go(i, wrap) {
            current = i;
            mark(i);
            /* A click during a reset cancels it and shows the screen again. */
            clearTimeout(resetting);
            view.phone.classList.remove('is-resetting');
            if (wrap && !still) {
                /* Back to the start: fade the screen, reset, fade back in. */
                view.phone.classList.add('is-resetting');
                resetting = setTimeout(function () {
                    snap(i);
                    view.phone.classList.remove('is-resetting');
                }, 380);
                return;
            }
            render(view, steps[i].dataset.state);
        }

        function pause() {
            clearTimeout(timer);
            timer = null;
        }

        function play() {
            pause();
            if (still || !inView || held) return;
            /* Longer captions get a little longer on screen. */
            var words = steps[current].textContent.trim().split(/\s+/).length;
            timer = setTimeout(function () {
                var next = (current + 1) % steps.length;
                go(next, next === 0);
                play();
            }, Math.max(STEP_MS, words * 300));
        }

        /* The loop is the default. A click picks that moment and holds it
           for a few seconds, then the loop carries on from there. Hovering
           doesn't pause it: people rest the pointer where they're looking,
           and that would stop the very thing they came to watch. */
        steps.forEach(function (b, i) {
            b.addEventListener('click', function () {
                go(i);
                held = true;
                pause();
                clearTimeout(resume);
                resume = setTimeout(function () { held = false; play(); }, HOLD_MS);
            });
        });

        /* Problem boards tint changes in clay, the fix in cobalt. */
        if (root.querySelector('.tl-step-n--clay')) view.phone.classList.add('is-problem');

        mark(0);
        snap(0);
        root.classList.add('is-ready');

        /* Only loops while it's on screen. */
        if (still || !('IntersectionObserver' in window)) return;
        new IntersectionObserver(function (entries) {
            inView = entries[0].isIntersecting;
            if (inView) play(); else pause();
        }, { threshold: 0.25 }).observe(board);
    });
})();
