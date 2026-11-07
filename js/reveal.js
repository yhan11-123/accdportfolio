/* Scroll reveal, shared by every page.
   Blocks rise into place as they reach the screen, and the items of a
   grid follow one after another, so a page arrives section by section
   instead of all at once. Skipped for people who ask for reduced
   motion; without JS nothing is ever hidden. */
(function () {
    if (!('IntersectionObserver' in window)) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    /* Blocks that move on their own, page by page. */
    var BLOCKS = [
        '.do-sec > *',                       /* Day One */
        '.kt-sec > *',                       /* Kindle TV */
        '.nose-head > *', '.nose-sec > *',   /* It's Not Your Nose */
        '.spt-section > *',                  /* Summer Palm Tree */
        '.mp-page > *',                      /* Manic Panic */
        '.rf-stage > *:not(.rf-bg)'          /* Reflow */
    ].join(', ');

    /* Grids whose items arrive one by one; the grid itself stays put. */
    var GROUPS = [
        '.project_grid',
        '.do-steps', '.do-cols3', '.do-cols2', '.do-wf', '.do-tasks', '.do-boards', '.do-themes', '.do-evidence', '.do-hmw',
        '.kt-stats', '.kt-devices', '.kt-interviews', '.kt-cols',
        '.nose-grid'
    ].join(', ');

    var targets = [];
    var seen = new Set();

    function add(el, i) {
        if (seen.has(el)) return;
        if (/^(SCRIPT|BR|STYLE)$/.test(el.tagName)) return;
        if (/\bdo-s\d+\b/.test(el.className)) return;          /* spacers */
        var r = el.getBoundingClientRect();
        if (!r.width || !r.height) return;                     /* hidden at this size */
        seen.add(el);
        targets.push({ el: el, i: i });
    }

    document.querySelectorAll(GROUPS).forEach(function (grid) {
        seen.add(grid);                                        /* its items move instead */
        Array.prototype.forEach.call(grid.children, function (child, i) { add(child, Math.min(i, 6)); });
    });
    document.querySelectorAll(BLOCKS).forEach(function (el) { add(el, 0); });

    if (!targets.length) return;
    document.documentElement.classList.add('rv-on');

    var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('rv-in');
            io.unobserve(entry.target);
        });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });

    targets.forEach(function (t) {
        t.el.classList.add('rv');
        t.el.style.setProperty('--rv-i', t.i);
        io.observe(t.el);
    });
})();
