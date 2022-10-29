// simple debouncer
function debounce(func, timeout = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => { func.apply(this, args); }, timeout);
  };
}

// For given 'width' and 'pos' return in what band out of 'bands' the
// position is.
function get_band(bands, width, pos) {
  return Math.floor(pos / (width / bands));
}

// image browser
function browser(n)
{
  return new Promise(async resolve => {
    const g = document.getElementById('gallery');
    const b = document.getElementById('browser');

    // create initial image
    const image = document.createElement('img');
    image.setAttribute('src', images[n].name);
    b.append(image);

    // initialize browser view
    g.style.display = 'none';
    document.getElementsByTagName('html').item(0).style.overflowY = 'hidden';
    b.style.display = 'block';

    // navigational actions
    function navigate(verb) {
      let new_n = n;
      switch (verb) {
        case 'prev': new_n = (n == 0 ? 0 : n-1); break;
        case 'next': new_n = (n+1 < images.length ? n+1 : n); break;
        case 'first': new_n = 0; break;
        case 'last': new_n = images.length - 1; break;
        case 'exit':
          // revert to gallery view
          b.style.display = 'none';
          b.getElementsByTagName('img').item(0).remove();
          document.getElementsByTagName('html').item(0).style.overflowY = 'scroll';
          g.style.display = 'block';
          resolve();
          return;
      }
      if(n != new_n) {
        image.setAttribute('src', images[new_n].name);
        n = new_n;
      }
    }

    // handle mouse navigation
    image.addEventListener('click', function(evt) {
      const whereTo = get_band(3, b.clientWidth, evt.clientX);
      switch (whereTo) {
        case 0: navigate('prev'); break;
        case 1: navigate('exit'); break;
        case 2: navigate('next'); break;
      }
    });

    // handle keyboard navigation
    document.addEventListener('keydown', function(evt) {
      switch (evt.code) {
        case 'ArrowLeft': navigate('prev'); break;
        case 'ArrowRight': navigate('next'); break;
        case 'ArrowUp': navigate('prev'); break;
        case 'ArrowDown': navigate('next'); break;
        case 'Home': navigate('first'); break;
        case 'End': navigate('last'); break;
        case 'Escape': navigate('exit'); break;
      }
    });
  });
}

// gallery
function gallery(images)
{
  const justifiedLayout = require("justified-layout");
  const base = document.getElementById('gallery');
  let viewportWidth = base.clientWidth;
  const boxes = [];
  let layout;

  // create elements for individual gallery images
  for(const i of images.keys()) {
    const el = document.createElement('img');
    el.setAttribute('src', images[i].name);
    el.setAttribute('data-n', i);
    el.style.position = 'absolute';
    boxes.push(el);
  }

  // compute layout using justified-layout module (must be loaded externally)
  function computeLayout() {
    layout = justifiedLayout(images, {
      containerWidth: viewportWidth,
      boxSpacing: 5,
      containerPadding: 10
    });
    for(const i of images.keys()) {
      boxes[i].setAttribute('width', layout.boxes[i].width);
      boxes[i].setAttribute('height', layout.boxes[i].height);
      boxes[i].style.top = layout.boxes[i].top + 'px';
      boxes[i].style.left =  layout.boxes[i].left + 'px';
    }
    base.style.height = layout.containerWidth + 'px';
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
    await browser(parseInt(evt.target.getAttribute('data-n')));
    resize();
  });

  // put images into DOM
  base.append(...boxes);
}

// main
document.addEventListener("DOMContentLoaded", function() {
  gallery(images);
});
