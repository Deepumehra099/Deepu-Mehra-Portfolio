(() => {
  const canvas = document.querySelector('#world');
  const context = canvas?.getContext('2d', { alpha: true });
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const coarsePointer = window.matchMedia('(pointer: coarse)');
  let width = 0;
  let height = 0;
  let dpr = 1;
  let frame = 0;
  let pointerX = 0;
  let pointerY = 0;
  let scrollRatio = 0;
  let particles = [];

  function resizeWorld() {
    if (!canvas || !context) return;
    dpr = Math.min(window.devicePixelRatio || 1, coarsePointer.matches ? 1.35 : 1.7);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(100, Math.max(26, Math.floor((width * height) / 17500)));
    particles = Array.from({ length: count }, (_, index) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      z: Math.random(),
      r: Math.random() * 1.5 + 0.35,
      seed: index * 4.82,
    }));
  }

  function drawWorld(time) {
    if (!context || reducedMotion.matches || document.hidden) {
      frame = 0;
      return;
    }
    context.clearRect(0, 0, width, height);
    const shiftX = pointerX * 17;
    const shiftY = pointerY * 13 - scrollRatio * 9;
    const points = particles.map((particle) => {
      const drift = time * 0.000008 * (0.2 + particle.z);
      const x = (particle.x + shiftX * particle.z + Math.sin(drift + particle.seed) * 9 + width) % width;
      const y = (particle.y + shiftY * particle.z + Math.cos(drift * 1.2 + particle.seed) * 7 + height) % height;
      const alpha = 0.13 + particle.z * 0.42;
      return { x, y, z: particle.z, r: particle.r * (0.5 + particle.z), alpha };
    });
    const linkRadius = width < 700 ? 94 : 145;
    for (let i = 0; i < points.length; i += 1) {
      const p = points[i];
      for (let j = i + 1; j < points.length; j += 1) {
        const q = points[j];
        const dx = p.x - q.x;
        const dy = p.y - q.y;
        const distance = Math.hypot(dx, dy);
        if (distance < linkRadius && Math.abs(p.z - q.z) < 0.25) {
          context.strokeStyle = `rgba(173, 206, 152, ${0.055 * (1 - distance / linkRadius)})`;
          context.lineWidth = 0.55;
          context.beginPath();
          context.moveTo(p.x, p.y);
          context.lineTo(q.x, q.y);
          context.stroke();
        }
      }
      context.fillStyle = `rgba(234, 216, 179, ${p.alpha})`;
      context.beginPath();
      context.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      context.fill();
    }
    frame = window.requestAnimationFrame(drawWorld);
  }

  function startWorld() {
    if (!frame && !reducedMotion.matches && !document.hidden) frame = window.requestAnimationFrame(drawWorld);
  }

  function stopWorld() {
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
  }

  resizeWorld();
  startWorld();
  window.addEventListener('resize', resizeWorld, { passive: true });
  document.addEventListener('visibilitychange', () => document.hidden ? stopWorld() : startWorld());
  reducedMotion.addEventListener?.('change', () => reducedMotion.matches ? stopWorld() : startWorld());
  if (!coarsePointer.matches) {
    window.addEventListener('pointermove', (event) => {
      pointerX = (event.clientX / width - 0.5) * 2;
      pointerY = (event.clientY / height - 0.5) * 2;
      const worldObject = document.querySelector('.world-object');
      if (worldObject && window.innerWidth > 640 && !reducedMotion.matches) {
        worldObject.style.setProperty('--pointer-x', `${pointerX * 2}deg`);
        worldObject.style.setProperty('--pointer-y', `${pointerY * -2}deg`);
      }
    }, { passive: true });
  }

  const sections = [...document.querySelectorAll('main section[id]')];
  const navLinks = [...document.querySelectorAll('.nav a')];
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        navLinks.forEach((link) => link.classList.toggle('active', link.hash === `#${entry.target.id}`));
        if (entry.target.id === 'home') scrollRatio = 0;
        else scrollRatio = Math.min(1, Math.max(0, window.scrollY / Math.max(1, document.body.scrollHeight - window.innerHeight)));
      }
    });
  }, { rootMargin: '-35% 0px -48% 0px' });
  sections.forEach((section) => sectionObserver.observe(section));
  window.addEventListener('scroll', () => {
    scrollRatio = Math.min(1, Math.max(0, window.scrollY / Math.max(1, document.body.scrollHeight - window.innerHeight)));
    document.querySelector('.reading-progress span')?.style.setProperty('--progress', scrollRatio);
  }, { passive: true });
  document.querySelector('.reading-progress span')?.style.setProperty('--progress', 0);

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.section-wrap > *, .project-card, .timeline-item').forEach((element) => revealObserver.observe(element));

  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav');
  menuButton?.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    nav?.classList.toggle('open', open);
  });
  navLinks.forEach((link) => link.addEventListener('click', () => {
    menuButton?.setAttribute('aria-expanded', 'false');
    menuButton?.setAttribute('aria-label', 'Open navigation');
    nav?.classList.remove('open');
  }));

  const toolTip = document.querySelector('.node-tooltip');
  document.querySelectorAll('.skill-node').forEach((node) => {
    const show = () => {
      if (!toolTip) return;
      toolTip.textContent = node.dataset.tip || '';
      toolTip.classList.add('visible');
    };
    const hide = () => toolTip?.classList.remove('visible');
    node.addEventListener('mouseenter', show);
    node.addEventListener('focus', show);
    node.addEventListener('mouseleave', hide);
    node.addEventListener('blur', hide);
  });

  const projectDetails = {
    picknow: {
      kicker: 'IN PROGRESS · FULL-STACK COMMERCE',
      title: 'PickNow',
      description: 'A local commerce platform built around three roles: customer, seller and admin. The current build includes JWT authentication, REST APIs, cart functionality and a responsive interface.',
      details: [['ROLE', 'Full-stack developer'], ['STACK', 'React · Node.js · Express · MongoDB · JWT'], ['KNOWN FEATURES', 'Customer, seller and admin roles · Cart · REST APIs'], ['STATUS', 'In development']],
    },
    notesphere: {
      kicker: 'COMPLETE · NOTES SHARING PLATFORM',
      title: 'NoteSphere',
      description: 'A notes-sharing application with full CRUD functionality for uploading and downloading notes. Access is secured with JWT authentication and organized through a responsive dashboard.',
      details: [['ROLE', 'Full-stack developer'], ['STACK', 'React · Node.js · Express · MongoDB · JWT'], ['KNOWN FEATURES', 'Note upload and download · CRUD · JWT-secured dashboard'], ['STATUS', 'Completed']],
    },
    downturbo: {
      kicker: 'GITHUB PROJECT · VIDEO DOWNLOADER',
      title: 'DownTurbo',
      description: 'A lightweight video downloader interface built with vanilla JavaScript, HTML5 and CSS3. The project focuses on simple link processing and responsive performance.',
      details: [['ROLE', 'Developer'], ['STACK', 'HTML5 · CSS3 · JavaScript'], ['KNOWN FEATURES', 'Link processing · Responsive interface'], ['STATUS', 'Available on GitHub']],
    },
  };
  const modal = document.querySelector('.project-modal');
  const backdrop = document.querySelector('.modal-backdrop');
  const closeButton = document.querySelector('.modal-close');
  let previousFocus = null;
  function closeModal() {
    modal?.classList.remove('open');
    backdrop?.classList.remove('open');
    modal?.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    previousFocus?.focus();
  }
  function openModal(project) {
    const details = projectDetails[project];
    if (!details || !modal) return;
    previousFocus = document.activeElement;
    modal.querySelector('.modal-kicker').textContent = details.kicker;
    modal.querySelector('#modal-title').textContent = details.title;
    modal.querySelector('.modal-description').textContent = details.description;
    const detailsContainer = modal.querySelector('.modal-details');
    detailsContainer.replaceChildren(...details.details.map(([label, value]) => {
      const block = document.createElement('div');
      const labelNode = document.createElement('span');
      const valueNode = document.createElement('strong');
      labelNode.textContent = label;
      valueNode.textContent = value;
      block.append(labelNode, valueNode);
      return block;
    }));
    modal.classList.add('open');
    backdrop?.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    closeButton?.focus();
  }
  document.querySelectorAll('.project-card').forEach((card) => {
    const trigger = card.querySelector('.project-open');
    card.addEventListener('click', (event) => {
      if (event.target.closest('a, .project-open')) return;
      openModal(card.dataset.project);
    });
    trigger?.addEventListener('click', (event) => {
      if (trigger.tagName === 'A') return;
      event.preventDefault();
      openModal(card.dataset.project);
    });
    card.addEventListener('keydown', (event) => {
      if ((event.key === 'Enter' || event.key === ' ') && event.target === card) {
        event.preventDefault();
        openModal(card.dataset.project);
      }
    });
  });
  closeButton?.addEventListener('click', closeModal);
  backdrop?.addEventListener('click', closeModal);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal?.classList.contains('open')) closeModal();
    if (event.key === 'Tab' && modal?.classList.contains('open')) {
      const focusable = [...modal.querySelectorAll('button, a[href]')];
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
})();
