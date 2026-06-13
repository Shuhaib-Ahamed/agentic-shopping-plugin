import { AnimatePresence, motion } from "framer-motion";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

// One in-flight clone - captured at the moment of click. We freeze the source
// + cart rects in state so a re-layout during the 700ms flight (e.g. the
// cart badge popping in) doesn't pull the trajectory mid-air.
interface Flight {
  id: string;
  src: string;
  from: DOMRect;
  to: DOMRect;
}

interface FlyToCartContextValue {
  /**
   * Spawn an iOS-style minimize animation from the given source element to
   * the registered cart anchor. Pass the product image element (or any
   * element whose getBoundingClientRect represents the visual source). The
   * imageUrl is rendered as the in-flight clone - falls back to the source's
   * own <img src> when omitted.
   */
  flyToCart: (sourceEl: HTMLElement | null, imageUrl?: string | null) => void;
  /**
   * Imperative ref setter for the cart icon. Called by TopBar on mount with
   * its cart button. The element's rect is read at fly-time so it always
   * reflects the current layout (even if the bar has reflowed).
   */
  setCartAnchor: (el: HTMLElement | null) => void;
  /**
   * Increments every time a flight lands. Components that should react to
   * a successful drop (e.g. the cart icon wiggle) subscribe via useEffect.
   */
  shakeKey: number;
}

const Ctx = createContext<FlyToCartContextValue | null>(null);

// The flight trajectory's arc apex: how far above the linear midpoint the
// clone rises. Negative because screen Y grows downward - the clone curves
// up and over before settling into the cart. Tuned so it reads as "tossed"
// rather than "slid."
const ARC_RISE_PX = 88;

// Maximum width/height of the in-flight clone. Source images on the lavender
// card pane can be up to ~280px wide; capping at 132px keeps the clone
// visually a comfortable "lifted thumbnail" without dominating the screen.
const CLONE_MAX_SIZE = 132;
const CLONE_MIN_SIZE = 56;
// Fraction of the source's shortest side to use for the clone (within the
// min/max bounds above). 70% picks a size that reads as "the picture, just
// smaller" rather than a stamp.
const CLONE_SIZE_FRACTION = 0.7;

export function FlyToCartProvider({ children }: { children: ReactNode }) {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [shakeKey, setShakeKey] = useState(0);
  const cartAnchorRef = useRef<HTMLElement | null>(null);

  const setCartAnchor = useCallback((el: HTMLElement | null) => {
    cartAnchorRef.current = el;
  }, []);

  const flyToCart = useCallback((sourceEl: HTMLElement | null, imageUrl?: string | null) => {
    if (!sourceEl) return;
    const anchor = cartAnchorRef.current;
    if (!anchor) return;

    // Resolve the image url. Prefer the explicit argument, then the source
    // element itself (if it's an <img>), then any <img> inside it.
    let resolvedUrl = imageUrl ?? null;
    if (!resolvedUrl) {
      if (sourceEl instanceof HTMLImageElement) {
        resolvedUrl = sourceEl.currentSrc || sourceEl.src;
      } else {
        const img = sourceEl.querySelector("img");
        if (img) resolvedUrl = img.currentSrc || img.src;
      }
    }
    if (!resolvedUrl) return;

    // Respect reduced motion - skip the flight, still wiggle the cart so
    // the user gets feedback that the add succeeded.
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setShakeKey((k) => k + 1);
      return;
    }

    const from = sourceEl.getBoundingClientRect();
    const to = anchor.getBoundingClientRect();
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);

    setFlights((prev) => [...prev, { id, src: resolvedUrl!, from, to }]);
  }, []);

  const handleComplete = useCallback((id: string) => {
    setFlights((prev) => prev.filter((f) => f.id !== id));
    // The cart wiggle fires when the clone lands, not when the click happens.
    // This makes the bag react to the impact instead of the press.
    setShakeKey((k) => k + 1);
  }, []);

  const value: FlyToCartContextValue = { flyToCart, setCartAnchor, shakeKey };

  return (
    <Ctx.Provider value={value}>
      {children}
      <FlyToCartLayer flights={flights} onComplete={handleComplete} />
    </Ctx.Provider>
  );
}

interface FlyToCartLayerProps {
  flights: Flight[];
  onComplete: (id: string) => void;
}

// The overlay portal that owns every in-flight clone. Sits fixed at
// inset-0, pointer-events: none, and renders one motion.img per flight.
function FlyToCartLayer({ flights, onComplete }: FlyToCartLayerProps) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <div aria-hidden className="fixed inset-0 pointer-events-none" style={{ zIndex: 9999 }}>
      <AnimatePresence>
        {flights.map((f) => (
          <FlyingClone key={f.id} flight={f} onComplete={() => onComplete(f.id)} />
        ))}
      </AnimatePresence>
    </div>,
    document.body,
  );
}

function FlyingClone({ flight, onComplete }: { flight: Flight; onComplete: () => void }) {
  const { from, to, src } = flight;

  // Size the clone proportionally to the source so a tiny thumbnail tosses
  // a small clone and a hero image tosses a bigger one - but always within
  // the min/max bounds for readability.
  const sourceShort = Math.min(from.width, from.height);
  const size = Math.round(
    Math.min(CLONE_MAX_SIZE, Math.max(CLONE_MIN_SIZE, sourceShort * CLONE_SIZE_FRACTION)),
  );

  const startX = from.left + from.width / 2 - size / 2;
  const startY = from.top + from.height / 2 - size / 2;
  const endX = to.left + to.width / 2 - size / 2;
  const endY = to.top + to.height / 2 - size / 2;
  const dx = endX - startX;
  const dy = endY - startY;

  // Arc midpoint - half-way between source and destination horizontally, but
  // lifted above the linear midpoint vertically so the trajectory curves up
  // before settling into the cart. Direction of rotation depends on which
  // way the clone is travelling so the spin "follows" the motion.
  const arcX = startX + dx * 0.5;
  const arcY = startY + dy * 0.4 - ARC_RISE_PX;
  const spinSign = dx >= 0 ? -1 : 1;

  return (
    <motion.img
      src={src}
      alt=""
      onAnimationComplete={onComplete}
      initial={{ x: startX, y: startY, scale: 1, opacity: 1, rotate: 0 }}
      animate={{
        x: [startX, arcX, endX],
        y: [startY, arcY, endY],
        scale: [1, 0.7, 0.16],
        opacity: [1, 0.98, 0.42],
        rotate: [0, spinSign * 10, spinSign * 22],
      }}
      transition={{
        duration: 0.72,
        times: [0, 0.55, 1],
        // Slight ease-in at the start (the picture "lifts"), strong
        // deceleration at the end (it "drops" into the bag).
        ease: [0.34, 0.06, 0.36, 1],
      }}
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        width: size,
        height: size,
        objectFit: "cover",
        borderRadius: 18,
        background: "white",
        boxShadow: "0 16px 40px rgba(74,46,130,0.32), 0 2px 8px rgba(74,46,130,0.18)",
        willChange: "transform, opacity",
      }}
    />
  );
}

export function useFlyToCart(): FlyToCartContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("useFlyToCart must be used inside a <FlyToCartProvider>");
  }
  return ctx;
}

// Convenience hook for components that only need to register the cart
// anchor (TopBar). Uses an effect so the element is registered on mount and
// cleared on unmount.
export function useRegisterCartAnchor(): (el: HTMLElement | null) => void {
  const { setCartAnchor } = useFlyToCart();
  useEffect(() => {
    return () => setCartAnchor(null);
  }, [setCartAnchor]);
  return setCartAnchor;
}
