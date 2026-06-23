// This code will toggle the class 'show-menu' on the body tag
// when an element (usually a <button>) with the class 'js-menu-trigger' is clicked
//
// In your HTML:
// <button class="js-menu-trigger">Toggle</button>

document.addEventListener('DOMContentLoaded', function() {
  var menuTrigger = document.querySelector('.js-menu-trigger');

  if (menuTrigger) {
    menuTrigger.addEventListener('click', function() {
      document.body.classList.toggle('show-menu');
    });
  }
});