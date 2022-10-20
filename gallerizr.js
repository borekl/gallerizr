document.addEventListener("DOMContentLoaded", function() {

  // simple debouncer
  function debounce(func, timeout = 300){
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
  }

  // (re)layout current set of boxes, returns the height of the resulting
  // container
  function layout() {
    const l = jl(images, {
      containerWidth: viewportWidth,
      boxSpacing: 5,
      containerPadding: 10
    });

    for(const i of images.keys()) {
      boxes[i].style.position = 'absolute';
      boxes[i].setAttribute('width', l.boxes[i].width);
      boxes[i].setAttribute('height', l.boxes[i].height);
      boxes[i].style.top = l.boxes[i].top + 'px';
      boxes[i].style.left =  l.boxes[i].left + 'px';
    }
    return l.containerHeight;
  }

  // init
  const jl = require("justified-layout");
  const gallery = document.getElementById('gallery');
  let viewportWidth = gallery.clientWidth;

  // resize handler
  let resize = debounce(() => { gallery.style.height = layout() + 'px' });
  window.onresize = function() {
    if(gallery.clientWidth == viewportWidth) return;
    viewportWidth = gallery.clientWidth;
    resize();
  }

  // create image elements in memory, set the SRC attribute
  const boxes = [];
  for(const i of images.keys()) {
    const el = document.createElement('img');
    el.setAttribute('src', images[i].name);
    boxes.push(el);
  }

  // set layout; note the double layout execution is needed
  gallery.style.height = layout() + 'px';
  viewportWidth = gallery.clientWidth;

  // add images to DOM
  gallery.append(...boxes);

});
