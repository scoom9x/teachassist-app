import { useEffect, useRef } from "react";

/** Keep the native dialog and its focus trap alive until its exit finishes. */
export function useDialogMotion(open: boolean, onDismiss: () => void) {
  const ref = useRef<HTMLDialogElement>(null);
  const dismiss = useRef(onDismiss);
  dismiss.current = onDismiss;
  const animation = useRef<Animation | null>(null);
  const closing = useRef(false);
  const frames = useRef<Keyframe[]>([]);
  const reduced = () =>
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const trigger = document.activeElement as HTMLElement | null;
    dialog.showModal();
    closing.current = false;
    const box = dialog.getBoundingClientRect();
    const source = trigger?.getBoundingClientRect();
    const x =
      source && source.width
        ? source.left + source.width / 2 - (box.left + box.width / 2)
        : 0;
    const y =
      source && source.height
        ? source.top + source.height / 2 - (box.top + box.height / 2)
        : 120;
    frames.current = [
      {
        opacity: 0,
        transform: `translate(${x}px, ${y}px) scale(.06, .015) skewX(-12deg)`,
        offset: 0,
      },
      {
        opacity: 0.7,
        transform: `translate(${x * 0.45}px, ${y * 0.55}px) scale(.22, .7) skewX(-8deg)`,
        offset: 0.4,
      },
      {
        opacity: 1,
        transform: "translate(0, 0) scale(1.025, 1.015) skewX(0deg)",
        offset: 0.82,
      },
      {
        opacity: 1,
        transform: "translate(0, 0) scale(1) skewX(0deg)",
        offset: 1,
      },
    ];
    if (!reduced() && dialog.animate)
      animation.current = dialog.animate(frames.current, {
        duration: 480,
        easing: "cubic-bezier(.22,.7,.2,1)",
      });
    return () => {
      animation.current?.cancel();
      dialog.close();
      if (trigger?.isConnected) trigger.focus();
    };
  }, [open]);
  function close() {
    const dialog = ref.current;
    if (closing.current || !dialog) return;
    closing.current = true;
    const finish = () => {
      dialog.close();
      dismiss.current();
    };
    if (reduced() || !dialog.animate) return finish();
    animation.current?.cancel();
    animation.current = dialog.animate(frames.current, {
      duration: 340,
      direction: "reverse",
      easing: "cubic-bezier(.4,0,.6,1)",
      fill: "forwards",
    });
    animation.current.onfinish = finish;
  }
  return { ref, close };
}
