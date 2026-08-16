import React, { useState } from "react";
import { Star } from "lucide-react";

interface StarRatingProps {
  value: number | null | undefined;
  onChange?: (val: number) => void;
  readOnly?: boolean;
  allowHalf?: boolean;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  showValueText?: boolean;
  className?: string;
}

export const StarRating: React.FC<StarRatingProps> = ({
  value = 0,
  onChange,
  readOnly = false,
  allowHalf = true,
  size = "md",
  showValueText = false,
  className = "",
}) => {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const displayRating = hoverValue !== null ? hoverValue : (value || 0);

  const sizeClasses = {
    xs: "w-3 h-3",
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-6 h-6",
    xl: "w-8 h-8",
  };

  const starSize = sizeClasses[size] || sizeClasses.md;

  const starPixelSizes: Record<string, number> = {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 24,
    xl: 32,
  };
  const pxSize = starPixelSizes[size] || 16;

  const handlePointer = (starIndex: number, isLeftHalf: boolean) => {
    if (readOnly || !onChange) return;
    const rating = allowHalf && isLeftHalf ? starIndex - 0.5 : starIndex;
    onChange(rating);
  };

  const handleHover = (starIndex: number, isLeftHalf: boolean) => {
    if (readOnly || !onChange) return;
    const rating = allowHalf && isLeftHalf ? starIndex - 0.5 : starIndex;
    setHoverValue(rating);
  };

  return (
    <div
      className={`inline-flex items-center gap-1 select-none ${className}`}
      onMouseLeave={() => !readOnly && setHoverValue(null)}
    >
      <div className="flex items-center gap-0.5 sm:gap-1">
        {[1, 2, 3, 4, 5].map((starIndex) => {
          const fillAmount = Math.max(0, Math.min(1, displayRating - (starIndex - 1)));
          const isFull = fillAmount >= 1;
          const isHalf = fillAmount > 0 && fillAmount < 1;

          return (
            <div
              key={starIndex}
              className={`relative ${readOnly ? "cursor-default" : "cursor-pointer group"}`}
            >
              {/* Background empty star */}
              <Star
                className={`${starSize} text-zinc-700 transition-colors ${
                  !readOnly ? "group-hover:text-zinc-600" : ""
                }`}
              />

              {/* Filled Star Overlay (full or half) */}
              {(isFull || isHalf) && (
                <div
                  className="absolute inset-0 overflow-hidden pointer-events-none"
                  style={{ width: isFull ? "100%" : "50%" }}
                >
                  <Star
                    style={{ width: `${pxSize}px`, height: `${pxSize}px`, minWidth: `${pxSize}px` }}
                    className="text-amber-400 fill-amber-400 shrink-0"
                  />
                </div>
              )}

              {/* Interactive Left Half Zone */}
              {!readOnly && allowHalf && (
                <button
                  type="button"
                  aria-label={`Rate ${starIndex - 0.5} stars`}
                  className="absolute inset-y-0 left-0 w-1/2 focus:outline-none cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePointer(starIndex, true);
                  }}
                  onMouseEnter={() => handleHover(starIndex, true)}
                />
              )}

              {/* Interactive Right Half Zone (or Full Star Zone) */}
              {!readOnly && (
                <button
                  type="button"
                  aria-label={`Rate ${starIndex} stars`}
                  className={`absolute inset-y-0 ${allowHalf ? "right-0 w-1/2" : "inset-0 w-full"} focus:outline-none cursor-pointer`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePointer(starIndex, false);
                  }}
                  onMouseEnter={() => handleHover(starIndex, false)}
                />
              )}
            </div>
          );
        })}
      </div>

      {showValueText && (displayRating > 0 || !readOnly) && (
        <span className="text-xs font-bold text-amber-400 ml-1">
          {displayRating > 0 ? `${displayRating.toFixed(displayRating % 1 === 0 ? 0 : 1)}★` : "Unrated"}
        </span>
      )}
    </div>
  );
};
