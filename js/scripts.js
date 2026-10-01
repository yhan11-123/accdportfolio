// Project index accordion.
// Mouse: hovering a project opens its brief, clicking the row goes to the
// project page, leaving the list closes everything.
// Touch (no hover): tapping a row opens its brief, tapping it again closes it.
// Only one brief is ever open.

document.addEventListener('DOMContentLoaded', function() {
  var list = document.querySelector('.project_list');
  var projects = document.querySelectorAll('.project');
  var canHover = window.matchMedia('(hover: hover)').matches;
  var hoverTimer = null;

  // Short delay so sweeping the cursor across the list doesn't flicker
  // every row open on the way past.
  var HOVER_DELAY = 30;

  function openOnly(project) {
    projects.forEach(function(other) {
      var isTarget = other === project;
      other.classList.toggle('is-open', isTarget);
      other.querySelector('.project_row').setAttribute('aria-expanded', String(isTarget));
    });
  }

  projects.forEach(function(project) {
    var row = project.querySelector('.project_row');
    var href = project.querySelector('.project_link').getAttribute('href');

    // Listening on the whole .project (row + brief), not just the row:
    // the closing brief above and the opening brief here animate with the
    // same timing, so the cursor stays inside this project while the rows
    // shift and nothing re-triggers.
    project.addEventListener('mouseenter', function() {
      if (!canHover) return;
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(function() { openOnly(project); }, HOVER_DELAY);
    });

    // Keyboard users get the same preview when tabbing onto a row.
    row.addEventListener('focus', function() {
      if (canHover) openOnly(project);
    });

    row.addEventListener('click', function() {
      if (canHover) {
        window.location.href = href;
        return;
      }
      openOnly(project.classList.contains('is-open') ? null : project);
    });
  });

  list.addEventListener('mouseleave', function() {
    if (!canHover) return;
    clearTimeout(hoverTimer);
    openOnly(null);
  });
});
