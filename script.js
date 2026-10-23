(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const root = document.documentElement;
  const hero = document.querySelector('.hero');
  const portrait = document.querySelector('.hero-portrait');
  const track = document.querySelector('.name-track');
  const gallery = document.querySelector('.architecture-gallery');
  const galleryTrack = document.querySelector('.gallery-track');
  const curve = document.querySelector('.section-curve');
  const contact = document.querySelector('.contact');
  const contactInner = document.querySelector('.contact-inner');
  const topLink = document.querySelector('.back-top');
  const motionControl = document.querySelector('.motion-control');
  let paused = reduced.matches;
  let lastY = scrollY, scrollVelocity = 0, direction = -1;
  let offset = 0, speed = 0, lastTime = performance.now();
  let heroHeight = 0, unitWidth = 1, galleryTop = 0, contactTop = 0, viewportHeight = innerHeight;

  function measure() {
    heroHeight = hero.offsetHeight;
    unitWidth = track.firstElementChild.getBoundingClientRect().width || innerWidth;
    galleryTop = gallery.getBoundingClientRect().top + scrollY;
    contactTop = contact.getBoundingClientRect().top + scrollY;
    viewportHeight = innerHeight;
  }
  const resize = new ResizeObserver(measure);
  [hero, gallery, contact, track.firstElementChild, document.querySelector('.light-content')].forEach(el => resize.observe(el));
  addEventListener('resize', measure, {passive:true});
  document.fonts.ready.then(measure);
  measure();

  const intro = document.querySelector('.intro-screen');
  let alreadySeen = false;
  try { alreadySeen = sessionStorage.getItem('charan-studio-intro') === 'seen'; sessionStorage.setItem('charan-studio-intro','seen'); } catch {}
  const finishIntro = () => {
    intro.classList.add('finished');
    setTimeout(() => intro.remove(), reduced.matches ? 0 : 1100);
  };
  if (reduced.matches || alreadySeen) {
    intro.remove();
  } else {
    const word = intro.querySelector('.intro-word span');
    setTimeout(() => { word.textContent = 'నమస్కారం.'; }, 400);
    setTimeout(() => { word.textContent = 'Let’s build.'; }, 800);
    setTimeout(finishIntro, 1300);
  }

  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduced.matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      });
    }, {threshold:0.12,rootMargin:'0px 0px -35px 0px'});
    reveals.forEach((el,index) => {
      if (el.closest('.capability-grid')) el.style.transitionDelay = (index % 3) * 80 + 'ms';
      observer.observe(el);
    });
  } else reveals.forEach(el => el.classList.add('in-view'));

  const magnets = [...document.querySelectorAll('.magnetic')].map(el => {
    const state = {el,x:0,y:0,tx:0,ty:0,active:false,rect:null};
    el.addEventListener('pointerenter', () => {
      if (!finePointer.matches || paused) return;
      state.rect = el.getBoundingClientRect();
      state.active = true;
    });
    el.addEventListener('pointermove', event => {
      if (!state.active || !state.rect || paused) return;
      const strength = el.classList.contains('circle-button') ? .24 : .17;
      state.tx = (event.clientX - state.rect.left - state.rect.width / 2) * strength;
      state.ty = (event.clientY - state.rect.top - state.rect.height / 2) * strength;
    });
    el.addEventListener('pointerleave', () => { state.active=false; state.tx=0; state.ty=0; });
    el.addEventListener('blur', () => { state.active=false; state.tx=0; state.ty=0; });
    return state;
  });

  const toggles = [...document.querySelectorAll('.work-toggle')];
  toggles.forEach(button => button.addEventListener('click', () => {
    const opening = button.getAttribute('aria-expanded') !== 'true';
    toggles.forEach(other => {
      const expanded = other === button && opening;
      const panel = document.getElementById(other.getAttribute('aria-controls'));
      other.setAttribute('aria-expanded', String(expanded));
      panel.inert = !expanded;
      panel.classList.toggle('open', expanded);
    });
  }));

  function setPaused(next) {
    paused = next;
    root.classList.toggle('motion-paused', paused);
    motionControl.textContent = paused ? 'Resume motion' : 'Pause motion';
    motionControl.setAttribute('aria-pressed', String(paused));
    if (paused) {
      portrait.style.transform = '';
      galleryTrack.style.transform = '';
      contactInner.style.transform = '';
      curve.style.transform = '';
      magnets.forEach(m => {m.tx=0;m.ty=0;m.x=0;m.y=0;m.el.style.transform='';});
      reveals.forEach(el => el.classList.add('in-view'));
    }
  }
  motionControl.addEventListener('click', () => setPaused(!paused));
  reduced.addEventListener('change', event => setPaused(event.matches));
  setPaused(paused);

  function frame(time) {
    const dt = Math.min((time-lastTime)/1000, .05);
    lastTime = time;
    const y = scrollY;
    const delta = y - lastY;
    if (Math.abs(delta) > .5) direction = delta > 0 ? -1 : 1;
    scrollVelocity += (Math.abs(delta) / Math.max(dt,.001) - scrollVelocity) * .08;
    lastY = y;
    topLink.classList.toggle('visible', y > heroHeight * .7);
    if (!paused && !document.hidden) {
      const targetSpeed = direction * (unitWidth / 22 + Math.min(scrollVelocity * .13, 200));
      speed += (targetSpeed - speed) * (1 - Math.exp(-dt * 5));
      offset += speed * dt;
      if (offset <= -unitWidth) offset += unitWidth;
      if (offset > 0) offset -= unitWidth;
      if (y < heroHeight + viewportHeight) {
        track.style.transform = 'translate3d(' + offset.toFixed(2) + 'px,0,0)';
        portrait.style.transform = 'translate3d(0,' + (Math.min(y,heroHeight) * .16).toFixed(2) + 'px,0)';
      }
      if (y + viewportHeight > galleryTop - 150 && y < galleryTop + gallery.offsetHeight + 150) {
        const progress = y + viewportHeight / 2 - galleryTop;
        const drift = Math.max(-180,Math.min(240,progress * .14));
        galleryTrack.style.transform = 'translate3d(' + (-drift).toFixed(2) + 'px,0,0)';
      }
      const contactDistance = contactTop - y - viewportHeight;
      if (contactDistance < 150) {
        const scale = Math.max(.05,Math.min(1,(contactTop - y) / viewportHeight));
        curve.style.transform = 'scaleY(' + scale.toFixed(3) + ')';
        contactInner.style.transform = 'translate3d(0,' + Math.max(0,Math.min(80,(contactTop-y)*.1)).toFixed(2) + 'px,0)';
      }
      magnets.forEach(m => {
        if (!m.active && Math.abs(m.x)+Math.abs(m.y)<.03) return;
        const damping = 1-Math.exp(-dt*11);
        m.x += (m.tx-m.x)*damping;
        m.y += (m.ty-m.y)*damping;
        m.el.style.transform = 'translate3d('+m.x.toFixed(2)+'px,'+m.y.toFixed(2)+'px,0)';
      });
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  function updateClock() {
    const time = new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit',hour12:true}).format(new Date());
    document.getElementById('local-time').textContent = time.toUpperCase() + ' IST';
  }
  updateClock();
  setInterval(updateClock,60000);
})();
