// IslandWatch site interactions

// Footer year
(() => {
  const el = document.getElementById('year');
  if (el) el.textContent = String(new Date().getFullYear());
})();

// Mobile nav
(() => {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (!toggle || !links) return;

  const setCollapsed = (collapsed) => {
    links.setAttribute('data-collapsed', collapsed ? 'true' : 'false');
    toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  };

  setCollapsed(true);

  toggle.addEventListener('click', () => {
    const collapsed = links.getAttribute('data-collapsed') !== 'false';
    setCollapsed(!collapsed);
  });

  // Close menu after clicking a link (mobile)
  links.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => setCollapsed(true));
  });

  // Close on escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setCollapsed(true);
  });
})();

// Anchor scrolling with sticky-nav offset
(() => {
  const nav = document.querySelector('.nav');
  if (!nav) return;

  const getOffset = () => {
    const styles = window.getComputedStyle(nav);
    const marginBottom = Number.parseFloat(styles.marginBottom) || 0;
    return Math.ceil(nav.getBoundingClientRect().height + marginBottom + 12);
  };

  const scrollToHash = (hash, behavior = 'smooth') => {
    if (!hash || hash === '#') return false;
    const id = decodeURIComponent(hash.slice(1));
    const target = document.getElementById(id);
    if (!target) return false;

    const top = window.scrollY + target.getBoundingClientRect().top - getOffset();
    window.scrollTo({ top: Math.max(0, top), behavior });
    return true;
  };

  document.querySelectorAll('.nav a[href*="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const url = new URL(a.getAttribute('href'), window.location.href);
      if (url.pathname !== window.location.pathname || !url.hash) return;

      e.preventDefault();
      scrollToHash(url.hash, 'smooth');
      history.replaceState(null, '', url.hash);
    });
  });

  // Keep offset correct for direct hash visits and manual hash changes.
  const alignToHash = (behavior) => {
    if (window.location.hash) scrollToHash(window.location.hash, behavior);
  };

  window.addEventListener('hashchange', () => alignToHash('auto'));
  window.addEventListener('load', () => alignToHash('auto'));
})();

// Scroll reveal
(() => {
  const els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || !els.length) {
    els.forEach((el) => el.classList.add('in'));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  els.forEach((el) => io.observe(el));
})();

// Use case tabs
(() => {
  const root = document.querySelector('[data-usecase]');
  if (!root) return;

  const tabs = Array.from(root.querySelectorAll('[data-tab]'));
  const panels = Array.from(root.querySelectorAll('[data-panel]'));

  const activate = (name) => {
    tabs.forEach((t) => {
      const active = t.getAttribute('data-tab') === name;
      t.classList.toggle('is-active', active);
      t.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    panels.forEach((p) => {
      const active = p.getAttribute('data-panel') === name;
      p.classList.toggle('is-active', active);
    });
  };

  tabs.forEach((t) => {
    t.addEventListener('click', () => activate(t.getAttribute('data-tab')));
  });

  // Ensure default tab state is correct
  const defaultTab = tabs.find((t) => t.classList.contains('is-active'))?.getAttribute('data-tab') || 'theft';
  activate(defaultTab);
})();

// Safe Score metric pills
(() => {
  const pills = Array.from(document.querySelectorAll('.pills .pill[data-metric]'));
  const title = document.querySelector('.metric-title');
  const text = document.querySelector('.metric-text');
  if (!pills.length || !title || !text) return;

  const copy = {
    speeding: {
      title: 'Speeding events',
      text: 'Highlights when you exceed a set speed threshold. Useful for spotting repeat habits and improving consistency over time.'
    },
    braking: {
      title: 'Harsh braking',
      text: 'Flags heavy deceleration patterns that often indicate tailgating, late reactions, or high-speed approaches. Helps riders smooth stops and reduce risk.'
    },
    accel: {
      title: 'Harsh acceleration',
      text: 'Tracks aggressive takeoffs and sudden throttle spikes. Great for coaching smoother starts and reducing unnecessary strain on the bike.'
    },
    collision: {
      title: 'Collision signals',
      text: 'Detects impact-like patterns that may indicate a drop, tip-over, or collision event. Used as a signal for review—not a definitive crash diagnosis.'
    },
    night: {
      title: 'Night riding & driving patterns',
      text: 'Shows how often and how long rides occur during night hours. Useful for families, new riders, and anyone wanting extra visibility on late trips.'
    }
  };

  const activate = (metric) => {
    pills.forEach((p) => p.classList.toggle('is-active', p.dataset.metric === metric));
    const m = copy[metric] || copy.speeding;
    title.textContent = m.title;
    text.textContent = m.text;
  };

  pills.forEach((p) => p.addEventListener('click', () => activate(p.dataset.metric)));

  // Ensure initial state
  const defaultMetric = pills.find((p) => p.classList.contains('is-active'))?.dataset.metric || 'speeding';
  activate(defaultMetric);
})();

// Accordion (works for Privacy Policy + Terms of Use + any future legal pages)
(function () {
  const accordions = document.querySelectorAll(".accordion");
  if (!accordions.length) return;

  accordions.forEach((root) => {
    const items = Array.from(root.querySelectorAll(".acc-item"));
    if (!items.length) return;

    function closeItem(item) {
      const btn = item.querySelector(".acc-trigger");
      const panel = item.querySelector(".acc-panel");
      item.dataset.open = "false";
      btn.setAttribute("aria-expanded", "false");
      panel.style.maxHeight = "0px";
    }

    function openItem(item) {
      const btn = item.querySelector(".acc-trigger");
      const panel = item.querySelector(".acc-panel");
      item.dataset.open = "true";
      btn.setAttribute("aria-expanded", "true");
      panel.style.maxHeight = panel.scrollHeight + "px";
    }

    // Initialize closed
    items.forEach((item) => {
      item.dataset.open = "false";
      const panel = item.querySelector(".acc-panel");
      panel.style.maxHeight = "0px";
    });

    // Click handler (single-open per accordion)
    items.forEach((item) => {
      const btn = item.querySelector(".acc-trigger");
      btn.addEventListener("click", () => {
        const isOpen = item.dataset.open === "true";

        // Close others inside THIS accordion only
        items.forEach((i) => i !== item && closeItem(i));

        if (isOpen) closeItem(item);
        else openItem(item);
      });
    });
  });

  // Recalculate maxHeight on resize (keeps it fluid)
  window.addEventListener("resize", () => {
    document.querySelectorAll(".accordion .acc-item").forEach((item) => {
      if (item.dataset.open === "true") {
        const panel = item.querySelector(".acc-panel");
        panel.style.maxHeight = panel.scrollHeight + "px";
      }
    });
  });
})();