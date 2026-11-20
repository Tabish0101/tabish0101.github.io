/** Cursor position in normalized device coordinates (-1…1, y up), shared by the scene. */
export const pointer = { x: 0, y: 0 };

let subscribers = 0;

const onMove = (event: PointerEvent) => {
  if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -((event.clientY / window.innerHeight) * 2 - 1);
};

/** One passive window listener, however many components ask. Returns the unsubscribe. */
export function trackPointer(): () => void {
  if (subscribers++ === 0) window.addEventListener('pointermove', onMove, { passive: true });
  return () => {
    if (--subscribers === 0) window.removeEventListener('pointermove', onMove);
  };
}
