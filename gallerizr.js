// simple trailing-edge debouncer for resize events
function debounce(func, timeout = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => { func.apply(this, args); }, timeout);
  };
}

// for given 'width' and 'pos' return in what band out of 'bands' the position
// is
function get_band(bands, width, pos) {
  return Math.floor(pos / (width / bands));
}

// create a SPAN element with class and content, optionally append to a parent
// and set that parent to "display: block"
function make_span(cssClass, text, where) {
  let el = document.createElement('span');
  if(cssClass) el.className = cssClass;
  if(text) el.textContent = text;
  if(where) { where.append(el); where.style.display = 'block'; }
  return el;
}

// header handling
function header_ctl() {
  const el = document.getElementsByTagName('header')[0];

  // initialize navigation elements according to configuration; note, that the
  // nav section might be completely missing
  const nav = document.getElementsByTagName('nav')[0];
  let prev, exit, next;
  if(typeof nav !== 'undefined') {
    [prev, exit, next] = nav.children;
    if(!(typeof dirinfo !== 'defined' && 'prev' in dirinfo && dirinfo.prev)) {
      prev.remove(); prev = null;
    }
    if(!(typeof dirinfo !== 'defined' && 'next' in dirinfo && dirinfo.next)) {
      next.remove(); next = null;
    }
    if(!(typeof dirinfo !== 'defined' && 'exit' in dirinfo && dirinfo.exit)) {
      exit.remove(); exit = null;
    }
    if(nav.childElementCount) {
      nav.style.display = 'block';
      el.style.display = 'flex';
    }
  }

  return {
    el: el,
    visibility: [],
    show() { this.el.style.display = 'flex' },
    hide() { this.el.style.display = 'none' },
    visible() { return this.el.style.display == 'flex' },
    saveAndHide() {
      this.visibility.push(this.visible());
      this.hide();
    },
    restore() { if(this.visibility.pop()) this.show() },
    title(txt) {
      make_span('title', txt, this.el.firstElementChild); this.show();
    },
    date(txt) {
      make_span('date', txt, this.el.firstElementChild); this.show();
    },
    bind(handler) {
      if(typeof nav === 'undefined') return;
      if(prev) { prev.addEventListener('click', (e) => handler(e)) }
      if(next) { next.addEventListener('click', (e) => handler(e)) }
      if(exit) { exit.addEventListener('click', (e) => handler(e)) }
    }
  }
}

/*============================================================================*/

// image browser; this implements the single-image browsing mode; the function
// returns a promise that resolves when user exits the browser
function browser(n)
{
  const g = document.getElementById('gallery');
  const b = document.getElementById('browser');
  const overlay = document.getElementsByClassName('overlay')[0];
  const imageCaption = document.getElementsByClassName('caption')[0];
  let view;

  // initialize browser view
  g.style.display = 'none';
  document.getElementsByTagName('html').item(0).style.overflowY = 'hidden';
  b.style.display = 'block';

  // save state of the title bar and hide it
  header.saveAndHide();

  // image captions are positioned with following function as I haven't found a
  // good way to do this in pure CSS; this works by overlaying an absolutely
  // positioned box over the image and then putting the actual caption inside
  // this box; since the image coordinates cannot be directly queried (they are
  // adjusted with the 'object-fit' property), we must calculate them ourselves
  function recalcOverlay() {
    const vw = b.clientWidth;
    const vh = b.clientHeight;
    const vpAspect = vw / vh;

    const img_w = view.naturalWidth;
    const img_h = view.naturalHeight;
    const imgAspect = img_w / img_h;

    const ratio = vpAspect / imgAspect;

    const imgX = ratio < 1 ? 0 : (vw - vw / ratio) / 2;
    const imgY = ratio > 1 ? 0 : (vh - vh * ratio) / 2;
    const imgW = ratio < 1 ? vw : vw / ratio;
    const imgH = ratio > 1 ? vh : vh * ratio;

    overlay.style.left = imgX + "px";
    overlay.style.top = imgY + "px";
    overlay.style.width = imgW + "px";
    overlay.style.height = imgH + "px";
  }

  // debounced resize handler (FIXME: the trailing-edge debouncer doesn't look
  // very good in this case)
  let handleResize = debounce(() => recalcOverlay(), 50);

  // main section as promise
  return new Promise(async resolve => {

    switch_view();

    // browser view switching; this is the core image browser function that
    // handles opening a new image/video, switching between images/videos and
    // finally shutting down the browser when requested; the argument specifies
    // the numerical index of the image/video the browser shall initialize with
    function switch_view(to)
    {
      // open view
      if(to == null && view == null) {
        imageCaption.textContent = getCaptionText(n);
        let tag_to = images[n].type == 'video' ? 'video' : 'img';
        view = document.createElement(tag_to);
        if(tag_to == 'img') {
          view.addEventListener('click', handleClick);
          overlay.addEventListener('click', handleClick);
          overlay.style.display = 'flex';
        } else {
          overlay.style.display = 'none';
        }
        document.addEventListener('keydown', handle_keypress);
        view.setAttribute('src', images[n].name);
        b.append(view);
        recalcOverlay();
        window.addEventListener('resize', handleResize);
        return;
      }
      // close view
      if(to == null && view != null) {
        imageCaption.textContent = '';
        overlay.removeEventListener('click', handleClick);
        window.removeEventListener('resize', handleResize);
        let tag_from = images[n].type == 'video' ? 'video' : 'img';
        b.getElementsByTagName(tag_from).item(0).remove();
        document.removeEventListener('keydown', handle_keypress);
        b.style.display = 'none';
        document.getElementsByTagName('html').item(0).style.overflowY = 'scroll';
        g.style.display = 'block';
        view = null;
        header.restore();
        resolve();
        return
      }
      // switching between views
      let tag_from = images[n].type == 'video' ? 'video' : 'img';
      let tag_to = images[to].type == 'video' ? 'video' : 'img';
      imageCaption.textContent = getCaptionText(to);
      if(tag_from != tag_to) {
        b.getElementsByTagName(tag_from).item(0).remove();
        view = document.createElement(tag_to);
        if(tag_to == 'img') {
          view.addEventListener('click', handleClick);
          overlay.style.display = 'flex';
        }
        if(tag_to == 'video') {
          view.setAttribute('controls', null);
          overlay.style.display = 'none';
        }
        b.append(view);
      }
      view.setAttribute('src', images[to].name);
      recalcOverlay();
      n = to;
    }

    // return caption text for current image or empty string if there is no
    // caption
    function getCaptionText(imageNo) {
      if(
        dirinfo
        && 'captions' in dirinfo
        && images[imageNo].name in dirinfo.captions
      ) {
        return dirinfo.captions[images[imageNo].name];
      } else {
        return '';
      }
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
    function handleClick(evt) {
      const whereTo = get_band(3, b.clientWidth, evt.clientX);
      switch (whereTo) {
        case 0: navigate('prev'); break;
        case 1: navigate('exit'); break;
        case 2: navigate('next'); break;
      }
    }

    // handle keyboard navigation
    function handle_keypress(evt) {
      switch (evt.code) {
        case 'ArrowLeft': { evt.preventDefault(); navigate('prev') }; break;
        case 'ArrowRight': { evt.preventDefault(); navigate('next') }; break;
        case 'ArrowUp': { evt.preventDefault(); navigate('prev') }; break;
        case 'ArrowDown': { evt.preventDefault(); navigate('next') }; break;
        case 'Home': { evt.preventDefault(); navigate('first') }; break;
        case 'End': { evt.preventDefault(); navigate('last') }; break;
        case 'Escape': { evt.preventDefault(); navigate('exit') }; break;
      }
    }
  });
}

/*============================================================================*/

// gallery; implements the layout and image browser invocation
function gallery(images)
{
  const justifiedLayout = require("justified-layout");
  const base = document.getElementById('gallery');
  let viewportWidth = base.clientWidth;
  const boxes = [];
  let layout;
  let jlconfig = typeof config !== 'undefined' ? config.jlconfig : {};
  let browseMode = false;

  // navigation actions
  function navigate(action) {
    switch (action) {
      case 'next': {
        if(dirinfo && dirinfo.next) {
          window.location.assign('../' + dirinfo.next);
        }
      }; break;
      case 'prev': {
        if(dirinfo && dirinfo.prev) {
          window.location.assign('../' + dirinfo.prev);
        }
      }; break;
      case 'exit': {
        if(dirinfo && dirinfo.exit) {
          window.location.assign('../');
        }
      }; break;
      case 'start': {
        goBrowse(0);
      }; break;
    }
  }

  // invoke individual full-viewport image browser
  async function goBrowse(n) {
    browseMode = true;
    await browser(n);
    resize();
    browseMode = false;
  }

  // handle clicks
  header.bind(e => {
    e.preventDefault();
    switch (e.currentTarget.getAttribute('id')) {
      case 'nav-prev': navigate('prev'); break;
      case 'nav-next': navigate('next'); break;
      case 'nav-exit': navigate('exit'); break;
    }
  });

  // handle keyboard control, when in browsing mode, we just do nothing
  document.addEventListener('keydown', evt => {
    if(browseMode) return;
    switch (evt.code) {
      case 'ArrowRight': { evt.preventDefault(); navigate('next') }; break;
      case 'ArrowLeft': { evt.preventDefault(); navigate('prev') }; break;
      case 'Escape': { evt.preventDefault(); navigate('exit') }; break;
      case 'Digit1': { evt.preventDefault(); navigate('start') }; break;
      case 'Numpad1': { evt.preventDefault(); navigate('start') }; break;
    }
  });

  // title and date
  if(typeof dirinfo !== 'defined' && dirinfo && 'title' in dirinfo) {
    header.title(dirinfo.title)
  }
  if(typeof dirinfo !== 'defined' && dirinfo && 'date' in dirinfo) {
    header.date(dirinfo.date)
  }

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
    let skip_title = header.el.clientHeight;
    for(const i of images.keys()) {
      boxes[i].setAttribute('width', layout.boxes[i].width);
      boxes[i].setAttribute('height', layout.boxes[i].height);
      boxes[i].style.top = layout.boxes[i].top + skip_title + 'px';
      boxes[i].style.left =  layout.boxes[i].left + 'px';
    }
    base.style.height = layout.containerHeight + 'px';
  };
  computeLayout();

  // resize handler
  let resize = debounce(() => {
    if(browseMode || base.clientWidth == viewportWidth) return;
    viewportWidth = base.clientWidth;
    computeLayout();
  });
  window.onresize = resize;

  // click handler (initiate image browsing)
  base.addEventListener('click', async evt => {
    if(evt.target.tagName == 'VIDEO') return;
    const n = evt.target.getAttribute('data-n');
    if(n == null) return;
    goBrowse(parseInt(n));
  });

  // put images into DOM
  base.append(...boxes);
}

/*============================================================================*/

// main
let header;
document.addEventListener("DOMContentLoaded", function() {
  header = header_ctl();
  gallery(images);
});
