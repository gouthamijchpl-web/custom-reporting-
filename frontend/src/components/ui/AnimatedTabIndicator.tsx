import { useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import './AnimatedTabIndicator.css';

interface IndicatorGeometry {
  height: number;
  left: number;
  top: number;
  width: number;
}

interface AnimatedTabIndicatorProps {
  activeKey: string;
  className?: string;
}

/**
 * A shared moving highlight for ARIA tablists. The component measures the
 * selected sibling tab, so unequal, wrapped, and responsive tab widths work
 * without duplicating positioning logic in each tab group.
 */
export function AnimatedTabIndicator({ activeKey, className }: AnimatedTabIndicatorProps) {
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const [geometry, setGeometry] = useState<IndicatorGeometry | null>(null);

  useLayoutEffect(() => {
    const indicator = indicatorRef.current;
    const tabList = indicator?.parentElement;
    if (!indicator || !tabList) return undefined;

    const measureSelectedTab = () => {
      const selectedTab = tabList.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
      if (!selectedTab) {
        setGeometry(null);
        return;
      }

      const nextGeometry = {
        height: selectedTab.offsetHeight,
        left: selectedTab.offsetLeft,
        top: selectedTab.offsetTop,
        width: selectedTab.offsetWidth,
      };

      setGeometry((current) => (
        current
        && current.height === nextGeometry.height
        && current.left === nextGeometry.left
        && current.top === nextGeometry.top
        && current.width === nextGeometry.width
          ? current
          : nextGeometry
      ));
    };

    measureSelectedTab();

    const resizeObserver = new ResizeObserver(measureSelectedTab);
    resizeObserver.observe(tabList);
    tabList.querySelectorAll<HTMLElement>('[role="tab"]').forEach((tab) => resizeObserver.observe(tab));

    const mutationObserver = new MutationObserver(measureSelectedTab);
    mutationObserver.observe(tabList, {
      attributeFilter: ['aria-selected'],
      attributes: true,
      childList: true,
      subtree: true,
    });

    return () => {
      mutationObserver.disconnect();
      resizeObserver.disconnect();
    };
  }, [activeKey]);

  const style = geometry ? {
    '--animated-tab-height': `${geometry.height}px`,
    '--animated-tab-left': `${geometry.left}px`,
    '--animated-tab-top': `${geometry.top}px`,
    '--animated-tab-width': `${geometry.width}px`,
  } as CSSProperties : undefined;

  return (
    <span
      ref={indicatorRef}
      aria-hidden="true"
      className={`animated-tab-indicator${className ? ` ${className}` : ''}`}
      data-ready={geometry ? 'true' : 'false'}
      style={style}
    />
  );
}
