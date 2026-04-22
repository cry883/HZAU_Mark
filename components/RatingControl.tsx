"use client";

import { useMemo, useState } from "react";

type RatingControlProps = {
  value: number;
  readonly?: boolean;
  onChange?: (next: number) => void;
};

const STAR_SIZE = 26;

function getLabel(value: number) {
  if (value >= 4.5) return "强烈推荐";
  if (value >= 3.5) return "还不错";
  if (value >= 2.5) return "一般";
  return "有待提升";
}

function Star({ fill }: { fill: number }) {
  const clipPathId = useMemo(() => `star-clip-${Math.random().toString(36).slice(2)}`, []);
  return (
    <svg viewBox="0 0 24 24" width={STAR_SIZE} height={STAR_SIZE} aria-hidden="true">
      <defs>
        <clipPath id={clipPathId}>
          <rect x="0" y="0" width={24 * fill} height="24" />
        </clipPath>
      </defs>
      <path
        d="M12 2.2l2.94 5.95 6.56.95-4.75 4.63 1.12 6.53L12 17.2l-5.87 3.08 1.12-6.53L2.5 9.1l6.56-.95L12 2.2z"
        fill="var(--pk-star-bg)"
      />
      <path
        d="M12 2.2l2.94 5.95 6.56.95-4.75 4.63 1.12 6.53L12 17.2l-5.87 3.08 1.12-6.53L2.5 9.1l6.56-.95L12 2.2z"
        fill="var(--pk-star-active)"
        clipPath={`url(#${clipPathId})`}
      />
    </svg>
  );
}

export function RatingControl({ value, readonly = false, onChange }: RatingControlProps) {
  const [hover, setHover] = useState<number | null>(null);
  const current = hover ?? value;

  function resolveValue(index: number, offsetX: number, width: number) {
    const half = offsetX < width / 2 ? 0.5 : 1;
    return Math.min(5, index + half);
  }

  return (
    <div className="rating-control">
      <div className="star-row" role={readonly ? undefined : "radiogroup"} aria-label="评分控件">
        {Array.from({ length: 5 }).map((_, idx) => {
          const starValue = idx + 1;
          const fill = Math.max(0, Math.min(1, current - idx));
          return (
            <button
              type="button"
              className="star-button"
              key={starValue}
              aria-label={`${starValue} 星`}
              disabled={readonly}
              onMouseMove={(e) => {
                if (readonly) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const offsetX = e.clientX - rect.left;
                setHover(resolveValue(idx, offsetX, rect.width));
              }}
              onMouseLeave={() => !readonly && setHover(null)}
              onClick={(e) => {
                if (readonly || !onChange) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const offsetX = e.clientX - rect.left;
                onChange(resolveValue(idx, offsetX, rect.width));
              }}
            >
              <Star fill={fill} />
            </button>
          );
        })}
      </div>
      <div className="rating-value">
        <span className="rating-score">{current.toFixed(1)}</span>
        <span className="rating-text">{getLabel(current)}</span>
      </div>
    </div>
  );
}
