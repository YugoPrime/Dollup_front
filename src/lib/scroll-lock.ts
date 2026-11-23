/**
 * One shared lock on page scroll for every overlay (bag, menu, quick-add and
 * filter sheets, sale popup, image zoom, age gate, advent door, feedback).
 *
 * Each overlay used to save `body.style.overflow` when it opened and put that
 * value back when it closed. That only works if overlays close in the reverse
 * order they opened. The quick-add sheet breaks it: Add to Bag opens the bag on
 * top, then the sheet closes once the add is done. The bag had saved the
 * sheet's "hidden", so closing it ("Proceed to Checkout") locked the page with
 * nothing open, and checkout could not scroll on a phone (23 Nov 2026).
 *
 * A counter makes the order irrelevant: the first lock saves the page's own
 * value, the last release puts it back. Releasing twice is a no-op, so an
 * effect cleanup that runs twice can't unlock another overlay.
 */
type OverflowStyle = { overflow: string };

export function createScrollLock(getStyle: () => OverflowStyle) {
  let held = 0;
  let saved = "";

  return function lock(): () => void {
    if (held === 0) {
      const style = getStyle();
      saved = style.overflow;
      style.overflow = "hidden";
    }
    held += 1;

    let released = false;
    return () => {
      if (released) return;
      released = true;
      held -= 1;
      if (held === 0) getStyle().overflow = saved;
    };
  };
}

/**
 * Locks page scroll until the returned function is called. Use it as the
 * effect's cleanup: `useEffect(() => (open ? lockBodyScroll() : undefined), [open])`.
 */
export const lockBodyScroll = createScrollLock(() => document.body.style);
