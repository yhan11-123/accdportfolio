/* Ring thumbnail for the Component & Interaction Study card.
   A small, self-turning copy of the ring on advancedi.younheehan.com:
   same pieces (read from that site's gallery/items.js, so a new week
   shows up here on its own), same tilt and spacing, but no input and
   no corner preview, because here it only has to say "this moves".
   The still image stays underneath as the fallback: if the data never
   arrives, or JS is off, the card still has a picture.
   It starts only when the card comes near the screen, and the turn
   itself is a CSS animation, which stops for reduced motion. */
(function () {
    var host = document.querySelector('[data-ring-thumb]');
    if (!host || !('IntersectionObserver' in window)) return;

    var BASE = host.getAttribute('data-ring-thumb');
    var TAU = Math.PI * 2;

    function build() {
        var data = window.GALLERY;
        var items = data && data.items ? data.items.filter(function (i) { return i.kind === 'deliverable'; }) : [];
        if (!items.length) return;

        var scene = document.createElement('span');
        scene.className = 'ring_thumb';
        scene.setAttribute('aria-hidden', 'true');
        var ring = document.createElement('span');
        ring.className = 'ring_thumb_ring';
        scene.appendChild(ring);

        var step = TAU / items.length;
        var cards = items.map(function (it) {
            var c = document.createElement('span');
            c.className = 'ring_thumb_card';
            var img = document.createElement('img');
            img.src = BASE + it.thumb;
            img.alt = '';
            img.decoding = 'async';
            c.appendChild(img);
            ring.appendChild(c);
            return c;
        });

        /* Same proportions as the full ring, scaled to the thumbnail. */
        function layout() {
            var w = host.clientWidth;
            var R = w * 0.36;
            var CW = R * 0.46, CH = CW * 0.68;
            scene.style.perspective = (R * 3.4).toFixed(0) + 'px';
            cards.forEach(function (c, i) {
                c.style.width = CW + 'px';
                c.style.height = CH + 'px';
                c.style.transform = 'translate(' + (-CW / 2) + 'px,' + (-CH) + 'px) rotateY(' + (i * step).toFixed(4) +
                    'rad) translateZ(' + R + 'px) rotateY(90deg)';
            });
        }

        host.appendChild(scene);
        layout();
        if ('ResizeObserver' in window) new ResizeObserver(layout).observe(host);
        else window.addEventListener('resize', layout);

        /* Swap in once most pictures are ready, so it never shows a ring of blanks. */
        var imgs = scene.querySelectorAll('img');
        var need = Math.ceil(imgs.length * 0.8), done = 0, shown = false;
        function reveal() { if (!shown) { shown = true; host.classList.add('is-live'); } }
        imgs.forEach(function (img) {
            function one() { if (++done >= need) reveal(); }
            if (img.complete) one(); else { img.addEventListener('load', one); img.addEventListener('error', one); }
        });
        setTimeout(reveal, 4000);
    }

    var io = new IntersectionObserver(function (entries) {
        if (!entries.some(function (e) { return e.isIntersecting; })) return;
        io.disconnect();
        var s = document.createElement('script');
        s.src = BASE + 'gallery/items.js';
        s.async = true;
        s.onload = build;
        document.head.appendChild(s);
    }, { rootMargin: '200px' });
    io.observe(host);
})();
