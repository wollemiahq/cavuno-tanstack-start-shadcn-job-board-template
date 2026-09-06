/** Read the publisher-side ad container only; never touch the creative iframe. */
export function observeAnchorClearance(
  onChange: (height: number) => void,
): () => void {
  const selector =
    'ins.adsbygoogle, iframe[id^="google_ads_iframe"], iframe[id^="aswift_"]';
  let frame = 0;
  let previous = -1;
  const observed = new Set<Element>();
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(measure);
  };
  const sizes = new ResizeObserver(schedule);
  function measure() {
    frame = 0;
    const containers = new Set<Element>();
    let clearance = 0;
    const height = document.documentElement.clientHeight || window.innerHeight;
    for (const ad of document.querySelectorAll(selector)) {
      for (
        let node: Element | null = ad;
        node && node !== document.body;
        node = node.parentElement
      ) {
        const style = getComputedStyle(node);
        if (style.display === 'none' || style.visibility === 'hidden') break;
        if (style.position !== 'fixed') continue;
        containers.add(node);
        const rect = node.getBoundingClientRect();
        // Ignore in-page units, top anchors, offscreen/dismissed ads and vignettes.
        if (
          rect.width > 0 &&
          rect.height > 0 &&
          rect.top > 0 &&
          rect.top < height &&
          rect.bottom >= height - 1 &&
          (style.bottom !== 'auto' || rect.top >= height / 2)
        ) {
          clearance = Math.max(clearance, Math.ceil(height - rect.top));
        }
        break;
      }
    }
    for (const node of observed) {
      if (!containers.has(node)) {
        sizes.unobserve(node);
        observed.delete(node);
      }
    }
    for (const node of containers) {
      if (!observed.has(node)) {
        sizes.observe(node);
        observed.add(node);
      }
    }
    if (clearance !== previous) {
      previous = clearance;
      onChange(clearance);
    }
  }
  const changes = new MutationObserver(schedule);
  changes.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['style', 'class', 'hidden', 'data-anchor-status'],
  });
  window.addEventListener('resize', schedule);
  document.addEventListener('transitionend', schedule, true);
  document.addEventListener('animationend', schedule, true);
  measure();
  return () => {
    changes.disconnect();
    sizes.disconnect();
    cancelAnimationFrame(frame);
    window.removeEventListener('resize', schedule);
    document.removeEventListener('transitionend', schedule, true);
    document.removeEventListener('animationend', schedule, true);
    onChange(0);
  };
}
