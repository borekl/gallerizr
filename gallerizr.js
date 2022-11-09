// simple trailing-edge debouncer for resize events
function debounce(func, timeout = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => { func.apply(this, args); }, timeout);
  };
}

// for given 'width' and 'pos' return in what band out of 'bands' the
// position is
function get_band(bands, width, pos) {
  return Math.floor(pos / (width / bands));
}

// image browser; this implements the single-image browsing mode; the function
// returns a promise that resolves when user exits the browser
function browser(n)
{
  return new Promise(async resolve => {
    const g = document.getElementById('gallery');
    const b = document.getElementById('browser');
    let view;

    // initialize browser view
    g.style.display = 'none';
    document.getElementsByTagName('html').item(0).style.overflowY = 'hidden';
    b.style.display = 'block';
    switch_view();

    // browser view switching; this is the core image browser function that
    // handles opening a new image/video, switching between images/videos
    // and finally shuts down the browser when requested; the argument specifis
    // the numerical index of the image/video the browser shall initialize with
    function switch_view(to)
    {
      // open view
      if(to == null && view == null) {
        let tag_to = images[n].type == 'video' ? 'video' : 'img';
        view = document.createElement(tag_to);
        handle_click(view);
        document.addEventListener('keydown', handle_keypress);
        if(tag_to == 'video') image.setAttribute('controls', null);
        view.setAttribute('src', images[n].name);
        b.append(view);
        return;
      }
      // close view
      if(to == null && view != null) {
        let tag_from = images[n].type == 'video' ? 'video' : 'img';
        b.getElementsByTagName(tag_from).item(0).remove();
        document.removeEventListener('keydown', handle_keypress);
        b.style.display = 'none';
        document.getElementsByTagName('html').item(0).style.overflowY = 'scroll';
        g.style.display = 'block';
        view = null;
        resolve();
        return
      }
      // switching between views
      let tag_from = images[n].type == 'video' ? 'video' : 'img';
      let tag_to = images[to].type == 'video' ? 'video' : 'img';
      if(tag_from != tag_to) {
        b.getElementsByTagName(tag_from).item(0).remove();
        view = document.createElement(tag_to);
        if(tag_to == 'video') view.setAttribute('controls', null);
        b.append(view);
      }
      view.setAttribute('src', images[to].name);
      n = to;
    }

    // navigational actions
    function navigate(verb) {
      let new_n = n;
      switch (verb) {
        case 'prev': new_n = (n == 0 ? 0 : n-1); break;
        case 'next': new_n = (n+1 < images.length ? n+1 : n); break;
        case 'first': new_n = 0; break;
        case 'last': new_n = images.length - 1; break;
        case 'exit':
          switch_view();
          return;
      }
      if(n != new_n) switch_view(new_n);
    }

    // handle mouse navigation
    function handle_click (el) {
      el.addEventListener('click', function(evt) {
        const whereTo = get_band(3, b.clientWidth, evt.clientX);
        switch (whereTo) {
          case 0: navigate('prev'); break;
          case 1: navigate('exit'); break;
          case 2: navigate('next'); break;
        }
      });
    }

    // handle keyboard navigation
    function handle_keypress(evt) {
      switch (evt.code) {
        case 'ArrowLeft': navigate('prev'); break;
        case 'ArrowRight': navigate('next'); break;
        case 'ArrowUp': navigate('prev'); break;
        case 'ArrowDown': navigate('next'); break;
        case 'Home': navigate('first'); break;
        case 'End': navigate('last'); break;
        case 'Escape': navigate('exit'); break;
      }
    }
  });
}

// gallery; implements the layout and image browser invocation
function gallery(images)
{
  const justifiedLayout = require("justified-layout");
  const base = document.getElementById('gallery');
  let viewportWidth = base.clientWidth;
  const boxes = [];
  let layout;
  let jlconfig = typeof config !== 'undefined' ? config.jlconfig : {};

  // create elements for individual gallery images/videos
  for(const i of images.keys()) {
    let el;
    if(images[i].type == 'image') {
      el = document.createElement('img');
    } else if(images[i].type == 'video') {
      el = document.createElement('video');
      el.setAttribute('controls', null);
    }
    el.setAttribute('src', images[i].name);
    el.setAttribute('data-n', i);
    el.style.position = 'absolute';
    boxes.push(el);
  }

  // compute layout using justified-layout module (must be loaded externally)
  function computeLayout() {
    jlconfig.containerWidth = viewportWidth;
    layout = justifiedLayout(images, jlconfig);
    for(const i of images.keys()) {
      boxes[i].setAttribute('width', layout.boxes[i].width);
      boxes[i].setAttribute('height', layout.boxes[i].height);
      boxes[i].style.top = layout.boxes[i].top + 'px';
      boxes[i].style.left =  layout.boxes[i].left + 'px';
    }
    base.style.height = layout.containerHeight + 'px';
  };
  computeLayout();

  // resize handler
  let resize = debounce(() => {
    if(base.clientWidth == viewportWidth) return;
    viewportWidth = base.clientWidth;
    computeLayout();
  });
  window.onresize = resize;

  // click handler (initiate image browsing)
  base.addEventListener('click', async evt => {
    const n = evt.target.getAttribute('data-n');
    if(n == null) return;
    await browser(parseInt(n));
    resize();
  });

  // put images into DOM
  base.append(...boxes);
}

// main
document.addEventListener("DOMContentLoaded", function() {
  gallery(images);
});
