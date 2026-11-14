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
        '.rf-sec > *'                        /* Reflow */
    ].join(', ');

    /* Grids whose items arrive one by one; the grid itself stays put. */
    var GROUPS = [
        '.project_grid',
        '.do-steps', '.do-cols3', '.do-cols2', '.do-wf', '.do-tasks', '.do-boards', '.do-themes', '.do-evidence', '.do-hmw',
        '.kt-stats', '.kt-devices', '.kt-interviews', '.kt-cols',
        '.nose-grid',
        '.rf-facts', '.rf-cols3', '.rf-cols4', '.rf-feel', '.rf-swatches', '.rf-faces', '.rf-grid', '.rf-logo-row'
    ].join(', ');

    var targets = [];
    var seen = new Set();

    function add(el, inGrid) {
        if (seen.has(el)) return;
        if (/^(SCRIPT|BR|STYLE)$/.test(el.tagName)) return;
        if (/\bdo-s\d+\b/.test(el.className)) return;          /* spacers */
        var r = el.getBoundingClientRect();
        if (!r.width || !r.height) return;                     /* hidden at this size */
        seen.add(el);
        targets.push({ el: el, grid: inGrid });
    }

    document.querySelectorAll(GROUPS).forEach(function (grid) {
        seen.add(grid);                                        /* its items move instead */
        Array.prototype.forEach.call(grid.children, function (child) { add(child, true); });
    });
    document.querySelectorAll(BLOCKS).forEach(function (el) { add(el, false); });

    if (!targets.length) return;
    document.documentElement.classList.add('rv-on');

    /* Grid items stagger by the order they arrive on screen together,
       not by their place in the grid: an item that scrolls in alone
       rises at once instead of waiting out the items above it. */
    var io = new IntersectionObserver(function (entries) {
        var shown = entries.filter(function (e) { return e.isIntersecting; });
        shown.sort(function (a, b) {
            return (a.boundingClientRect.top - b.boundingClientRect.top) ||
                   (a.boundingClientRect.left - b.boundingClientRect.left);
        });
        var k = 0;
        shown.forEach(function (entry) {
            var el = entry.target;
            el.style.setProperty('--rv-i', el.hasAttribute('data-rv-grid') ? Math.min(k++, 6) : 0);
            el.classList.add('rv-in');
            io.unobserve(el);
        });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });

    targets.forEach(function (t) {
        t.el.classList.add('rv');
        if (t.grid) t.el.setAttribute('data-rv-grid', '');
        io.observe(t.el);
    });
})();
