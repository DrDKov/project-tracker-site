/*
 * Dynamic lane layout for the timeline.
 *
 * This module measures timeline cards after render and assigns non-overlapping vertical
 * lanes. It is intentionally DOM-driven: the legacy runtime still owns timeline rendering;
 * this enhancer only normalizes the resulting layout.
 */
(() => {
  if (window.__TIMELINE_DYNAMIC_LANES_V104__) return;
  window.__TIMELINE_DYNAMIC_LANES_V104__ = 1;

  const TOP = 8;
  const X_GAP = 8;
  const Y_GAP = 14;
  const MIN_HEIGHT = 70;
  const BOTTOM = 32;

  const numberFromCss = (value) => parseFloat(String(value || '').replace('px', '')) || 0;
  const timelineRoot = () => document.querySelector('.wk-tl');

  function ensureStyle() {
    if (document.getElementById('tl-lanes-v104-css')) return;
    const style = document.createElement('style');
    style.id = 'tl-lanes-v104-css';
    style.textContent = '.wk-tlitem{box-sizing:border-box!important;height:auto!important;max-height:none!important;min-height:70px!important}.wk-tlitem .wk-tltitle,.wk-tlitem h4,.wk-tlitem .wk-tlmeta{white-space:normal!important;word-break:break-word!important;overflow-wrap:anywhere!important;max-height:none!important}';
    document.head.appendChild(style);
  }

  function measuredHeight(element) {
    const computed = getComputedStyle(element);
    let height = numberFromCss(computed.paddingTop) + numberFromCss(computed.paddingBottom) + 6;
    const title = element.querySelector('.wk-tltitle') || element.querySelector('h4');
    const meta = element.querySelector('.wk-tlmeta');
    if (title) height += title.scrollHeight;
    if (meta) height += meta.scrollHeight;
    return Math.ceil(Math.max(MIN_HEIGHT, element.scrollHeight, element.offsetHeight, height));
  }

  let rafId = 0;

  function relayout() {
    rafId = 0;
    ensureStyle();

    const root = timelineRoot();
    const body = root && root.querySelector('.wk-tlbody');
    if (!root || !body) return;

    const keepLeft = root.scrollLeft;
    const keepTop = root.scrollTop;
    const elements = [...body.querySelectorAll('.wk-tlitem')];
    if (!elements.length) return;

    const items = elements
      .map((element, index) => {
        element.style.height = 'auto';
        const left = numberFromCss(element.style.left) || element.offsetLeft;
        const width = numberFromCss(element.style.width) || element.offsetWidth;
        return {
          element,
          index,
          left,
          right: left + width,
          top: numberFromCss(element.style.top) || element.offsetTop,
          height: measuredHeight(element)
        };
      })
      .sort((a, b) => a.left - b.left || a.right - b.right || a.top - b.top || a.index - b.index);

    const lanes = [];
    for (const item of items) {
      let laneIndex = lanes.findIndex((lane) => item.left >= lane.right + X_GAP);
      if (laneIndex < 0) {
        laneIndex = lanes.length;
        lanes.push({ right: -1e9, height: MIN_HEIGHT });
      }
      lanes[laneIndex].right = Math.max(lanes[laneIndex].right, item.right);
      lanes[laneIndex].height = Math.max(lanes[laneIndex].height, item.height);
      item.laneIndex = laneIndex;
    }

    let y = TOP;
    const offsets = [];
    for (const lane of lanes) {
      offsets.push(y);
      y += Math.max(MIN_HEIGHT, lane.height) + Y_GAP;
    }

    for (const item of items) {
      const height = Math.ceil(Math.max(MIN_HEIGHT, item.height));
      item.element.style.top = `${offsets[item.laneIndex] || TOP}px`;
      item.element.style.height = `${height}px`;
      item.element.style.minHeight = `${height}px`;
      item.element.dataset.dynamicLane = String(item.laneIndex);
    }

    body.style.height = `${Math.max(360, y + BOTTOM)}px`;
    root.scrollLeft = keepLeft;
    root.scrollTop = keepTop;
  }

  function scheduleRelayout() {
    if (!rafId) rafId = requestAnimationFrame(relayout);
  }

  ensureStyle();
  new MutationObserver(scheduleRelayout).observe(document.body, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', scheduleRelayout);
  window.addEventListener('resize', scheduleRelayout);
  document.addEventListener('pointerup', scheduleRelayout, true);
  document.addEventListener('drop', scheduleRelayout, true);
  setInterval(() => {
    if (timelineRoot()) scheduleRelayout();
  }, 700);
  scheduleRelayout();
})();
