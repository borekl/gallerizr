//--- simple debouncer
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

//--- image browser
function browser(n)
{
  return new Promise(async resolve => {
    const g = document.getElementById('gallery');
    const b = document.getElementById('browser');

    // create image
    const image = document.createElement('img');
    image.setAttribute('src', images[n].name);
    b.append(image);

    // initialize browser view
    g.style.display = 'none';
    document.getElementsByTagName('html').item(0).style.overflowY = 'hidden';
    b.style.display = 'block';

    // click navigation
    let navigate = function(evt, resolve) {
      const whereTo = get_band(3, b.clientWidth, evt.clientX);
      let new_n;
      if(whereTo == 1) {
        b.removeEventListener('click', navigate);
        resolve();
        return;
      }
      else if(whereTo == 0) new_n = (n == 0 ? 0 : n-1)
      else if(whereTo == 2) new_n = (n-1 < images.length ? n+1 : n)
      if(n != new_n) {
        image.setAttribute('src', images[new_n].name);
        n = new_n;
      }
    }
    await new Promise(
      resolve => b.addEventListener('click', (evt) => navigate(evt, resolve))
    );

    // revert to gallery view
    b.style.display = 'none';
    document.getElementsByTagName('html').item(0).style.overflowY = 'scroll';
    g.style.display = 'block';
    resolve();
  });
}

//--- gallery
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
  });

  // put images into DOM
  base.append(...boxes);
}

//--- main
document.addEventListener("DOMContentLoaded", function() {
  gallery(images);
});
