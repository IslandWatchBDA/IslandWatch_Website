/* IslandWatch — homepage interactions
   Progressive enhancement: the page works without JS.
   - Mobile nav toggle
   - Accessible tabs (Use Cases) with arrow-key navigation
   - FAQ accordion single-open behaviour (details/summary)
*/
(function () {
  "use strict";

  /* ---------- Scroll reveal: fade/slide each section in as it enters view ----------
     Progressive enhancement: the .reveal class (which hides until visible) is added
     by JS only. Without JS, or with reduced motion / no IntersectionObserver, the
     content is shown normally and never hidden. */
  (function setupReveal() {
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) return;
    var els = Array.prototype.slice.call(
      document.querySelectorAll("main > section:not(.hero), .site-footer")
    );
    if (!els.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -8% 0px" });
    els.forEach(function (el) { el.classList.add("reveal"); });
    // Reveal anything already in view synchronously (no flash), observe the rest.
    els.forEach(function (el) {
      if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add("is-visible");
      else io.observe(el);
    });
  })();

  /* ---------- Hero parallax ----------
     Drifts the hero background slower than the page scroll. The bg layer is
     sized taller than the hero (CSS top:-20%; height:140%) so the shift never
     exposes an edge. Disabled for reduced-motion; rAF-throttled; skipped once
     the hero has scrolled out of view. */
  (function setupParallax() {
    var reduceP = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceP) return;
    var hero = document.querySelector(".hero");
    var bg = document.querySelector(".hero__bg");
    if (!hero || !bg) return;
    var FACTOR = 0.35, pTicking = false;
    var paint = function () {
      pTicking = false;
      var y = window.scrollY || document.documentElement.scrollTop || 0;
      if (y > hero.offsetHeight) return; // hero fully off-screen — nothing to move
      bg.style.transform = "translate3d(0," + (y * FACTOR) + "px,0)";
    };
    var onParallax = function () {
      if (!pTicking) { pTicking = true; requestAnimationFrame(paint); }
    };
    paint();
    window.addEventListener("scroll", onParallax, { passive: true });
  })();

  /* ---------- Shrink header on scroll ----------
     Hysteresis (shrink past SHRINK_AT, grow back under GROW_AT) plus a rAF
     throttle prevents the flip-flop loop that scroll-anchoring can trigger
     when the header reflows on the way back up. */
  var header = document.querySelector(".site-header");
  if (header) {
    var SHRINK_AT = 100, GROW_AT = 24, ticking = false, isShrunk = false;
    var update = function () {
      ticking = false;
      var y = window.scrollY || document.documentElement.scrollTop || 0;
      if (!isShrunk && y > SHRINK_AT) {
        isShrunk = true;
        header.classList.add("is-scrolled");
      } else if (isShrunk && y < GROW_AT) {
        isShrunk = false;
        header.classList.remove("is-scrolled");
      }
    };
    var onScroll = function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- Mobile nav ----------
     One collapsible wrapper (.header-menu) holds the nav links and the
     action buttons, so on mobile they stack as: links first, buttons below. */
  var toggle = document.querySelector(".nav-toggle");
  var menu = document.getElementById("header-menu");

  if (toggle && menu) {
    var setOpen = function (open) {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      menu.classList.toggle("is-open", open);
    };

    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });

    // Close the menu when any link (nav item or action button) is chosen
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) setOpen(false);
    });

    // Escape closes the menu and returns focus to the toggle
    menu.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { setOpen(false); toggle.focus(); }
    });

    // If the viewport grows past the mobile breakpoint, clear any stale open state
    if (window.matchMedia) {
      var mq = window.matchMedia("(max-width:992px)");
      var onChange = function (e) { if (!e.matches) setOpen(false); };
      if (mq.addEventListener) mq.addEventListener("change", onChange);
      else if (mq.addListener) mq.addListener(onChange); // Safari < 14
    }
  }

  /* ---------- Tabs (Use Cases) ---------- */
  var tablist = document.querySelector('[role="tablist"]');
  if (tablist) {
    var tabs = Array.prototype.slice.call(tablist.querySelectorAll('[role="tab"]'));

    function selectTab(tab, setFocus) {
      tabs.forEach(function (t) {
        var selected = t === tab;
        t.setAttribute("aria-selected", String(selected));
        t.setAttribute("tabindex", selected ? "0" : "-1");
        t.classList.toggle("is-active", selected);
        var panel = document.getElementById(t.getAttribute("aria-controls"));
        if (panel) panel.hidden = !selected;
      });
      if (setFocus) tab.focus();
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () { selectTab(tab, false); });
      tab.addEventListener("keydown", function (e) {
        var idx = i;
        if (e.key === "ArrowRight" || e.key === "ArrowDown") { idx = (i + 1) % tabs.length; }
        else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { idx = (i - 1 + tabs.length) % tabs.length; }
        else if (e.key === "Home") { idx = 0; }
        else if (e.key === "End") { idx = tabs.length - 1; }
        else { return; }
        e.preventDefault();
        selectTab(tabs[idx], true);
      });
    });
  }

  /* ---------- FAQ: smooth open/close, one item at a time ----------
     Animates the <details> height while keeping native semantics
     (content is display:none / hidden from AT when fully closed).
     Falls back to an instant toggle when reduced motion is preferred
     or the Web Animations API is unavailable. */
  var faqItems = Array.prototype.slice.call(document.querySelectorAll(".faq__item"));
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canAnimate = typeof Element !== "undefined" && Element.prototype.animate && !reduceMotion;

  faqItems.forEach(function (item) {
    var summary = item.querySelector("summary");
    var answer = item.querySelector(".faq__answer");
    if (!summary) return;
    var anim = null;
    var state = "idle"; // "expanding" | "shrinking"

    function closeOthers() {
      faqItems.forEach(function (o) { if (o !== item && o.open) o.open = false; });
    }

    if (!canAnimate) {
      // Instant toggle (still single-open). Native handles the rest.
      item.addEventListener("toggle", function () { if (item.open) closeOthers(); });
      return;
    }

    summary.addEventListener("click", function (e) {
      e.preventDefault();
      item.style.overflow = "hidden";
      if (state === "shrinking" || !item.open) expand();
      else if (state === "expanding" || item.open) shrink();
    });

    function expand() {
      closeOthers();
      // Freeze the collapsed height, then reveal content so it doesn't snap open.
      item.style.height = item.offsetHeight + "px";
      item.open = true;
      window.requestAnimationFrame(function () {
        var start = item.offsetHeight;
        var end = summary.offsetHeight + (answer ? answer.offsetHeight : 0);
        if (anim) anim.cancel();
        state = "expanding";
        anim = item.animate({ height: [start + "px", end + "px"] }, { duration: 300, easing: "ease" });
        anim.onfinish = function () { finish(true); };
        anim.oncancel = function () { state = "idle"; };
      });
    }

    function shrink() {
      state = "shrinking";
      var start = item.offsetHeight;
      var end = summary.offsetHeight;
      if (anim) anim.cancel();
      anim = item.animate({ height: [start + "px", end + "px"] }, { duration: 300, easing: "ease" });
      anim.onfinish = function () { finish(false); };
      anim.oncancel = function () { state = "idle"; };
    }

    function finish(opened) {
      item.open = opened;
      anim = null;
      state = "idle";
      item.style.height = "";
      item.style.overflow = "";
    }
  });

  /* ---------- Demo video popup ----------
     The "Watch demo" poster opens a modal that plays the app walkthrough.
     Without JS the button simply does nothing (the five written steps below
     remain the accessible fallback). Closes on Esc, backdrop, or the X;
     the video is paused and rewound on close so it never plays in the background. */
  (function setupVideoModal() {
    var modal = document.getElementById("demo-modal");
    var opener = document.querySelector("[data-video-open]");
    if (!modal || !opener) return;
    var video = modal.querySelector(".video-modal__player");
    var closeBtn = modal.querySelector(".video-modal__close");
    var lastFocus = null;

    /* ----- Custom controls -----
       Native controls are off so the player looks the same on macOS Safari,
       iOS Safari, Chrome, etc. We drive a custom bottom bar instead. */
    var vp = modal.querySelector("[data-vp]");
    var seek = modal.querySelector("[data-vp-seek]");
    var curEl = modal.querySelector("[data-vp-cur]");
    var playBtns = modal.querySelectorAll("[data-vp-play]");
    var muteBtn = modal.querySelector("[data-vp-mute]");
    var fsBtn = modal.querySelector("[data-vp-fullscreen]");
    var moreBtn = modal.querySelector("[data-vp-more]");
    var menu = modal.querySelector("[data-vp-menu]");
    var pipItem = modal.querySelector("[data-vp-pip]");
    var seeking = false;

    function isOpen() { return !modal.hidden && !modal.classList.contains("is-priming"); }
    function closeMenu() {
      if (menu && !menu.hidden) { menu.hidden = true; if (moreBtn) moreBtn.setAttribute("aria-expanded", "false"); }
    }

    function fmt(t) {
      if (!isFinite(t) || t < 0) t = 0;
      var m = Math.floor(t / 60);
      var s = Math.floor(t % 60);
      return m + ":" + (s < 10 ? "0" : "") + s;
    }
    function setProgress() {
      if (!video || !vp) return;
      var d = video.duration;
      var pct = d ? (video.currentTime / d) * 100 : 0;
      if (!seeking && seek) seek.value = String(Math.round(pct * 10));
      vp.style.setProperty("--vp-progress", pct + "%");
      if (curEl) curEl.textContent = fmt(video.currentTime);
    }
    function syncPlayState() {
      if (!vp) return;
      vp.classList.toggle("is-playing", !video.paused && !video.ended);
      var label = video.paused ? "Play" : "Pause";
      for (var i = 0; i < playBtns.length; i++) playBtns[i].setAttribute("aria-label", label);
    }
    function syncMute() {
      if (!vp) return;
      var off = video.muted || video.volume === 0;
      vp.classList.toggle("is-muted", off);
      if (muteBtn) muteBtn.setAttribute("aria-label", off ? "Unmute" : "Mute");
    }
    function loading(on) { if (vp) vp.classList.toggle("is-loading", !!on); }

    function togglePlay() {
      if (!video) return;
      if (video.paused) { var p = video.play(); if (p && p.catch) p.catch(function () {}); }
      else video.pause();
    }
    function enterFs(el) {
      var fn = el.requestFullscreen || el.webkitRequestFullscreen;
      if (fn) { try { fn.call(el); return true; } catch (e) {} }
      return false;
    }
    function toggleFullscreen() {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        var exit = document.exitFullscreen || document.webkitExitFullscreen;
        if (exit) { try { exit.call(document); } catch (e) {} }
        return;
      }
      // Prefer the phone-screen container (keeps the bezel); fall back to the
      // video element. iOS Safari only supports fullscreen on <video> itself.
      var screen = modal.querySelector(".device__screen") || video;
      if (enterFs(screen)) return;
      if (enterFs(video)) return;
      if (video.webkitEnterFullscreen) { try { video.webkitEnterFullscreen(); } catch (e) {} }
    }

    if (video && vp) {
      for (var b = 0; b < playBtns.length; b++) playBtns[b].addEventListener("click", togglePlay);
      if (muteBtn) muteBtn.addEventListener("click", function () { video.muted = !video.muted; syncMute(); });
      if (fsBtn) fsBtn.addEventListener("click", toggleFullscreen);
      video.addEventListener("click", function () { closeMenu(); togglePlay(); });

      // 3-dot "more" menu: Picture-in-Picture + Download.
      var pipOk = !!document.pictureInPictureEnabled ||
        (video && typeof video.webkitSetPresentationMode === "function");
      if (pipItem && !pipOk) pipItem.hidden = true;
      if (moreBtn && menu) {
        moreBtn.addEventListener("click", function (e) {
          e.stopPropagation();
          var willOpen = menu.hidden;
          menu.hidden = !willOpen;
          moreBtn.setAttribute("aria-expanded", String(willOpen));
        });
        document.addEventListener("click", function (e) {
          if (menu.hidden) return;
          if (e.target.closest("[data-vp-menu]") || e.target.closest("[data-vp-more]")) return;
          closeMenu();
        });
      }
      if (pipItem && pipOk) {
        pipItem.addEventListener("click", function () {
          closeMenu();
          try {
            if (typeof video.webkitSetPresentationMode === "function") {
              video.webkitSetPresentationMode(
                video.webkitPresentationMode === "picture-in-picture" ? "inline" : "picture-in-picture");
            } else if (document.pictureInPictureElement) {
              document.exitPictureInPicture();
            } else {
              var pp = video.requestPictureInPicture();
              if (pp && pp.catch) pp.catch(function () {});
            }
          } catch (e) {}
        });
      }

      video.addEventListener("play", syncPlayState);
      video.addEventListener("pause", syncPlayState);
      video.addEventListener("ended", syncPlayState);
      video.addEventListener("playing", function () { loading(false); });
      video.addEventListener("canplay", function () { loading(false); });
      video.addEventListener("waiting", function () { loading(true); });
      video.addEventListener("stalled", function () { loading(true); });
      video.addEventListener("volumechange", syncMute);
      video.addEventListener("timeupdate", setProgress);
      video.addEventListener("loadedmetadata", setProgress);

      if (seek) {
        var doSeek = function () {
          if (!video.duration) return;
          video.currentTime = (Number(seek.value) / 1000) * video.duration;
          setProgress();
        };
        seek.addEventListener("input", function () { seeking = true; doSeek(); });
        seek.addEventListener("change", function () { seeking = false; doSeek(); });
      }
    }

    // Kick the real media pipeline exactly once. preload="none" + a display:none
    // modal means nothing loads until the click, so opening is a cold start. We
    // start buffering on intent instead — but only the <video> element's own
    // load() works in Safari (a separate fetch() is NOT shared with the media
    // pipeline). The element must be rendered to buffer, so priming un-hides the
    // modal into a visibility:hidden state (`is-priming`) — invisible and
    // click-through, but the video buffers for real.
    var loaded = false;
    function ensureLoaded() {
      if (loaded || !video) return;
      try { video.preload = "auto"; } catch (e) {}
      try { video.load(); } catch (e) {}
      loaded = true;
    }
    function prime() {
      if (!video || !modal.hidden) return;   // already open or priming
      modal.hidden = false;
      modal.classList.add("is-priming");
      ensureLoaded();
    }
    ["pointerenter", "focus", "touchstart"].forEach(function (evt) {
      opener.addEventListener(evt, prime, { passive: true });
    });
    // On mobile there's no hover, so also start buffering once the demo poster
    // scrolls into view — by the time the user taps it, it's ready.
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
          if (entries[i].isIntersecting) { prime(); io.disconnect(); break; }
        }
      }, { threshold: 0.5 });
      io.observe(opener);
    }
    // First open should be instant even with no prior hover/scroll: proactively
    // start buffering shortly after the page settles. Skipped on data-saver or
    // slow (2g) connections so metered users aren't burdened.
    function autoPreload() {
      var c = navigator.connection || navigator.webkitConnection || navigator.mozConnection;
      if (c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || ""))) return;
      prime();
    }
    if (document.readyState === "complete") setTimeout(autoPreload, 1500);
    else window.addEventListener("load", function () { setTimeout(autoPreload, 1500); }, { once: true });

    function open() {
      lastFocus = document.activeElement;
      modal.hidden = false;
      modal.classList.remove("is-priming");
      document.body.style.overflow = "hidden";
      if (closeBtn) closeBtn.focus();
      if (video) {
        loading(true);
        syncMute();
        ensureLoaded();   // no-op if intent already started it (keeps the buffer)
        if (video.play) {
          var p = video.play();
          if (p && p.catch) {
            p.catch(function () {
              // Sound autoplay blocked by the browser — retry muted so the video
              // still plays (matches the intended look). The user can tap the
              // volume button to turn sound on.
              video.muted = true;
              syncMute();
              var p2 = video.play();
              if (p2 && p2.catch) p2.catch(function () { loading(false); syncPlayState(); });
            });
          }
        }
        syncPlayState();
      }
    }

    function close() {
      modal.hidden = true;
      modal.classList.remove("is-priming");
      document.body.style.overflow = "";
      closeMenu();
      if (video) { video.pause(); try { video.currentTime = 0; } catch (e) {} loading(false); syncPlayState(); }
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    opener.addEventListener("click", open);
    modal.addEventListener("click", function (e) {
      if (e.target.closest("[data-video-close]")) close();
    });
    document.addEventListener("keydown", function (e) {
      if (!isOpen()) return;
      if (e.key === "Escape") { if (menu && !menu.hidden) { closeMenu(); return; } close(); return; }
      if (!video) return;
      var inSlider = e.target === seek;
      if (e.key === " " || e.key === "k") { e.preventDefault(); togglePlay(); }
      else if (e.key === "m") { video.muted = !video.muted; syncMute(); }
      else if (!inSlider && e.key === "ArrowRight") { e.preventDefault(); video.currentTime = Math.min(video.duration || 0, video.currentTime + 5); }
      else if (!inSlider && e.key === "ArrowLeft") { e.preventDefault(); video.currentTime = Math.max(0, video.currentTime - 5); }
    });
  })();
})();
