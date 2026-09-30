"use client";

import { useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from "react";

/**
 * Scroll reveal: fades/slides children in the first time they enter the viewport.
 * Transform/opacity only; disabled entirely under prefers-reduced-motion.
 */
export function Reveal({
  children,
  as: Tag = "div",
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  /** Element to render (default div) */
  as?: ElementType;
  /** Transition delay in ms — use for manual staggers */
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Reveal imperatively; both the observer and the scroll fallback converge here.
    let revealed = false;
    const reveal = () => {
      if (revealed) return;
      revealed = true;
      void (async () => {
        await Promise.resolve();
        setVisible(true);
      })();
      cleanup();
    };

    const inView = () => {
      const r = el.getBoundingClientRect();
      return r.top < window.innerHeight && r.bottom > 0;
    };

    // Fallback path: some environments (backgrounded tabs, embedded previews)
    // never produce frames, so IntersectionObserver callbacks never run.
    // A passive scroll/resize check covers those cases.
    const onScroll = () => {
      if (inView()) reveal();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    let io: IntersectionObserver | undefined;
    if (typeof IntersectionObserver === "undefined") {
      onScroll();
    } else {
      io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) reveal();
          }
        },
        { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
      );
      io.observe(el);
    }

    function cleanup() {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      io?.disconnect();
    }
    return cleanup;
  }, []);

  const style = { "--reveal-delay": `${delay}ms` } as CSSProperties;

  return (
    <Tag ref={ref} style={style} className={`reveal ${visible ? "is-visible" : ""} ${className}`}>
      {children}
    </Tag>
  );
}
