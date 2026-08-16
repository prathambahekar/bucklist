import React, { useState, useRef, useEffect, ReactNode } from "react";
import { Check, Trash2, Archive, Star } from "lucide-react";

interface SwipeableMovieCardProps {
  id?: string;
  isWatched: boolean;
  disabled?: boolean;
  onSwipeRight?: () => void; // Watched (if in towatch) or Re-rate (if in watched)
  onSwipeLeft?: () => void;  // Remove/Delete
  children: ReactNode;
  className?: string;
  rightActionLabel?: string;
  leftActionLabel?: string;
}

const SWIPE_THRESHOLD = 70; // px required to trigger action
const MAX_SWIPE = 110;

export function SwipeableMovieCard({
  id,
  isWatched,
  disabled = false,
  onSwipeRight,
  onSwipeLeft,
  children,
  className = "",
  rightActionLabel,
  leftActionLabel = "Remove",
}: SwipeableMovieCardProps) {
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [swipingAction, setSwipingAction] = useState<"left" | "right" | null>(null);

  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isHorizontalSwipeRef = useRef<boolean | null>(null);
  const currentOffsetRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync ref with state
  currentOffsetRef.current = offsetX;

  const defaultRightLabel = isWatched ? "Rate" : "Watched";
  const activeRightLabel = rightActionLabel || defaultRightLabel;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    const touch = e.touches[0];
    startXRef.current = touch.clientX;
    startYRef.current = touch.clientY;
    isHorizontalSwipeRef.current = null;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (disabled || !isDragging) return;
    const touch = e.touches[0];
    const diffX = touch.clientX - startXRef.current;
    const diffY = touch.clientY - startYRef.current;

    // Detect if this is horizontal swipe vs vertical scroll
    if (isHorizontalSwipeRef.current === null) {
      if (Math.abs(diffX) > 8 || Math.abs(diffY) > 8) {
        if (Math.abs(diffX) > Math.abs(diffY)) {
          isHorizontalSwipeRef.current = true;
        } else {
          isHorizontalSwipeRef.current = false;
        }
      }
    }

    if (isHorizontalSwipeRef.current) {
      // Prevent vertical scrolling when user is deliberately swiping card
      if (e.cancelable) {
        // e.preventDefault();
      }

      // Constrain dragging with resistance past max
      let clamped = diffX;
      if (diffX > MAX_SWIPE) {
        clamped = MAX_SWIPE + (diffX - MAX_SWIPE) * 0.2;
      } else if (diffX < -MAX_SWIPE) {
        clamped = -MAX_SWIPE + (diffX + MAX_SWIPE) * 0.2;
      }

      setOffsetX(clamped);

      if (clamped >= SWIPE_THRESHOLD) {
        setSwipingAction("right");
      } else if (clamped <= -SWIPE_THRESHOLD) {
        setSwipingAction("left");
      } else {
        setSwipingAction(null);
      }
    }
  };

  const handleTouchEnd = () => {
    if (disabled || !isDragging) return;
    setIsDragging(false);

    const finalOffset = currentOffsetRef.current;
    if (finalOffset >= SWIPE_THRESHOLD && onSwipeRight) {
      // Trigger Right Swipe Action (Mark as Watched)
      // Visual feedback bump then trigger
      setOffsetX(80);
      setTimeout(() => {
        setOffsetX(0);
        setSwipingAction(null);
        onSwipeRight();
      }, 150);
    } else if (finalOffset <= -SWIPE_THRESHOLD && onSwipeLeft) {
      // Trigger Left Swipe Action (Delete/Remove)
      setOffsetX(-80);
      setTimeout(() => {
        setOffsetX(0);
        setSwipingAction(null);
        onSwipeLeft();
      }, 150);
    } else {
      // Reset position with smooth animation
      setOffsetX(0);
      setSwipingAction(null);
    }

    isHorizontalSwipeRef.current = null;
  };

  const handleTouchCancel = () => {
    setIsDragging(false);
    setOffsetX(0);
    setSwipingAction(null);
    isHorizontalSwipeRef.current = null;
  };

  // Determine reveal background colors based on swipe direction
  const isRightSwipe = offsetX > 0;
  const isLeftSwipe = offsetX < 0;
  const progressRatio = Math.min(1, Math.abs(offsetX) / SWIPE_THRESHOLD);

  return (
    <div
      ref={containerRef}
      id={id}
      className={`relative overflow-hidden rounded-2xl select-none ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
    >
      {/* Background action reveal under card */}
      <div className="absolute inset-0 flex items-center justify-between pointer-events-none rounded-2xl">
        {/* Left/Right Background container: Green/Amber on swipe right */}
        {isRightSwipe && (
          <div
            className={`h-full w-full flex items-center pl-4 sm:pl-6 transition-colors duration-150 ${
              swipingAction === "right"
                ? isWatched
                  ? "bg-amber-600/90 text-zinc-950 font-bold"
                  : "bg-emerald-600/90 text-white font-bold"
                : isWatched
                ? "bg-amber-950/70 text-amber-300"
                : "bg-emerald-950/70 text-emerald-300"
            }`}
            style={{ opacity: Math.max(0.2, progressRatio) }}
          >
            <div className="flex items-center gap-2">
              {isWatched ? (
                <Star
                  className={`w-5 h-5 transition-transform ${
                    swipingAction === "right" ? "scale-125 fill-current" : ""
                  }`}
                />
              ) : (
                <Check
                  className={`w-5 h-5 stroke-[2.5] transition-transform ${
                    swipingAction === "right" ? "scale-125" : ""
                  }`}
                />
              )}
              <span className="text-xs sm:text-sm tracking-tight font-bold">
                {activeRightLabel}
              </span>
            </div>
          </div>
        )}

        {/* Right Action: Red on swipe left (Remove / Delete) */}
        {isLeftSwipe && (
          <div
            className={`h-full w-full flex items-center justify-end pr-4 sm:pr-6 transition-colors duration-150 ${
              swipingAction === "left"
                ? "bg-red-600 text-white font-bold"
                : "bg-red-950/70 text-red-300"
            }`}
            style={{ opacity: Math.max(0.2, progressRatio) }}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm tracking-tight font-bold">
                {leftActionLabel}
              </span>
              <Trash2
                className={`w-5 h-5 transition-transform ${
                  swipingAction === "left" ? "scale-125" : ""
                }`}
              />
            </div>
          </div>
        )}
      </div>

      {/* Swipeable foreground card content */}
      <div
        className="w-full h-full relative z-10 transition-transform"
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isDragging ? "none" : "transform 0.22s cubic-bezier(0.2, 0.9, 0.3, 1)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
