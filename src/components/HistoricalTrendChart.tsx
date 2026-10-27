import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { BadgeVariant, HistoricalTrendPoint } from '../types/macro';
import { Badge } from './Badge';

interface HistoricalTrendChartProps {
  data: HistoricalTrendPoint[];
  isLoading?: boolean;
}

export const HistoricalTrendChart: React.FC<HistoricalTrendChartProps> = ({
  data,
  isLoading = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedPoint, setSelectedPoint] = useState<HistoricalTrendPoint | null>(null);

  // Summary statistics for 30-day header
  const stats = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        latestSofr: 3.9,
        minSofr: 3.85,
        maxSofr: 3.95,
        latestSrf: 0.0,
        maxSrf: 0.0,
      };
    }
    const latest = data[data.length - 1];
    const sofrValues = data.map((d) => d.sofrRate);
    const srfValues = data.map((d) => d.srfUsageBillions);

    return {
      latestSofr: latest.sofrRate,
      minSofr: Math.min(...sofrValues),
      maxSofr: Math.max(...sofrValues),
      latestSrf: latest.srfUsageBillions,
      maxSrf: Math.max(...srfValues),
    };
  }, [data]);

  useEffect(() => {
    if (isCollapsed || !containerRef.current) return;
    const el = containerRef.current;
    const updateWidth = () => {
      if (el.clientWidth > 0) {
        setContainerWidth(Math.max(500, el.clientWidth - 32));
      }
    };
    updateWidth();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => updateWidth());
      observer.observe(el);
      return () => observer.disconnect();
    }
  }, [isCollapsed]);

  useEffect(() => {
    if (isCollapsed || !data || data.length === 0 || !svgRef.current || !containerRef.current) {
      return;
    }

    const rawWidth = containerWidth || (containerRef.current.clientWidth ? containerRef.current.clientWidth - 32 : 860);
    const width = Math.max(500, Number.isFinite(rawWidth) ? rawWidth : 860);
    const height = 260;
    const margin = { top: 25, right: 55, bottom: 35, left: 55 };
    const innerWidth = Math.max(100, width - margin.left - margin.right);
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg.attr('width', width).attr('height', height).attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Parse dates safely and filter out any malformed entries
    const parsedData = data
      .map((d) => ({
        ...d,
        parsedDate: new Date(`${d.date}T12:00:00`),
      }))
      .filter(
        (d) =>
          !Number.isNaN(d.parsedDate.getTime()) &&
          Number.isFinite(d.sofrRate) &&
          Number.isFinite(d.srfUsageBillions)
      );

    if (parsedData.length === 0) return;

    const rawExtent = d3.extent(parsedData, (d) => d.parsedDate);
    if (!rawExtent[0] || !rawExtent[1]) return;

    const minDate = rawExtent[0];
    const maxDate =
      rawExtent[1].getTime() === minDate.getTime()
        ? new Date(minDate.getTime() + 86400000)
        : rawExtent[1];

    const xScale = d3.scaleTime().domain([minDate, maxDate]).range([0, innerWidth]);

    // Left Y Axis (SOFR %)
    const minSofr = Math.min(...parsedData.map((d) => d.sofrRate));
    const maxSofr = Math.max(...parsedData.map((d) => d.sofrRate));
    const sofrPadding = Math.max(0.04, (maxSofr - minSofr) * 0.25);
    const yLeft = d3
      .scaleLinear()
      .domain([minSofr - sofrPadding, maxSofr + sofrPadding])
      .range([innerHeight, 0])
      .nice();

    // Right Y Axis (SRF $B)
    const maxSrf = Math.max(1.0, ...parsedData.map((d) => d.srfUsageBillions));
    const yRight = d3
      .scaleLinear()
      .domain([0, maxSrf * 1.35])
      .range([innerHeight, 0])
      .nice();

    // Subtle horizontal gridlines
    const yGrid = d3
      .axisLeft(yLeft)
      .ticks(5)
      .tickSize(-innerWidth)
      .tickFormat(() => '');

    g.append('g')
      .attr('class', 'grid')
      .call(yGrid)
      .selectAll('line')
      .attr('stroke', '#334155')
      .attr('stroke-opacity', 0.4)
      .attr('stroke-dasharray', '3,3');
    g.select('.grid .domain').remove();

    // Gradients
    const defs = svg.append('defs');
    const sofrGradient = defs
      .append('linearGradient')
      .attr('id', 'sofr-area-grad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    sofrGradient.append('stop').attr('offset', '0%').attr('stop-color', '#38bdf8').attr('stop-opacity', 0.25);
    sofrGradient.append('stop').attr('offset', '100%').attr('stop-color', '#38bdf8').attr('stop-opacity', 0.0);

    // SOFR Area
    const area = d3
      .area<{ parsedDate: Date; sofrRate: number }>()
      .x((d) => xScale(d.parsedDate))
      .y0(innerHeight)
      .y1((d) => yLeft(d.sofrRate))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(parsedData)
      .attr('fill', 'url(#sofr-area-grad)')
      .attr('d', area);

    // SRF Bars (Amber)
    const barWidth = Math.max(4, Math.floor(innerWidth / parsedData.length) - 3);
    g.selectAll('.srf-bar')
      .data(parsedData.filter((d) => d.srfUsageBillions > 0))
      .enter()
      .append('rect')
      .attr('class', 'srf-bar')
      .attr('x', (d) => xScale(d.parsedDate) - barWidth / 2)
      .attr('y', (d) => yRight(d.srfUsageBillions))
      .attr('width', barWidth)
      .attr('height', (d) => innerHeight - yRight(d.srfUsageBillions))
      .attr('fill', '#f59e0b')
      .attr('opacity', 0.7)
      .attr('rx', 2);

    // SRF Step Line (Amber dashed)
    const srfLine = d3
      .line<{ parsedDate: Date; srfUsageBillions: number }>()
      .x((d) => xScale(d.parsedDate))
      .y((d) => yRight(d.srfUsageBillions))
      .curve(d3.curveStepAfter);

    g.append('path')
      .datum(parsedData)
      .attr('fill', 'none')
      .attr('stroke', '#f59e0b')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '4,3')
      .attr('d', srfLine);

    // SOFR Line (Cyan solid)
    const sofrLine = d3
      .line<{ parsedDate: Date; sofrRate: number }>()
      .x((d) => xScale(d.parsedDate))
      .y((d) => yLeft(d.sofrRate))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(parsedData)
      .attr('fill', 'none')
      .attr('stroke', '#38bdf8')
      .attr('stroke-width', 2.5)
      .attr('d', sofrLine);

    // Circular points on SOFR line
    g.selectAll('.sofr-dot')
      .data(parsedData)
      .enter()
      .append('circle')
      .attr('class', 'sofr-dot')
      .attr('cx', (d) => xScale(d.parsedDate))
      .attr('cy', (d) => yLeft(d.sofrRate))
      .attr('r', 3)
      .attr('fill', '#0b1120')
      .attr('stroke', '#38bdf8')
      .attr('stroke-width', 1.8);

    // Left Axis (SOFR %)
    const leftAxis = d3
      .axisLeft(yLeft)
      .ticks(5)
      .tickFormat((d) => `${(d as number).toFixed(2)}%`);

    const leftAxisG = g.append('g').call(leftAxis);
    leftAxisG.select('.domain').attr('stroke', '#334155');
    leftAxisG.selectAll('.tick text').attr('fill', '#38bdf8').attr('font-size', '10px').attr('font-family', 'monospace');
    leftAxisG.selectAll('.tick line').attr('stroke', '#334155');

    // Left Axis Label
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -42)
      .attr('x', -innerHeight / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#38bdf8')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .text('SOFR Rate (%)');

    // Right Axis (SRF $B)
    const rightAxis = d3
      .axisRight(yRight)
      .ticks(5)
      .tickFormat((d) => `$${(d as number).toFixed(1)}B`);

    const rightAxisG = g
      .append('g')
      .attr('transform', `translate(${innerWidth},0)`)
      .call(rightAxis);
    rightAxisG.select('.domain').attr('stroke', '#334155');
    rightAxisG.selectAll('.tick text').attr('fill', '#f59e0b').attr('font-size', '10px').attr('font-family', 'monospace');
    rightAxisG.selectAll('.tick line').attr('stroke', '#334155');

    // Right Axis Label
    g.append('text')
      .attr('transform', 'rotate(90)')
      .attr('y', -innerWidth - 45)
      .attr('x', innerHeight / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#f59e0b')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .text('SRF Facility ($B)');

    // Bottom Axis (Dates)
    const bottomAxis = d3
      .axisBottom(xScale)
      .ticks(Math.max(4, Math.floor(innerWidth / 90)))
      .tickFormat((d) => {
        const dt = d as Date;
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[dt.getMonth()]} ${dt.getDate()}`;
      });

    const bottomAxisG = g
      .append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(bottomAxis);

    bottomAxisG.select('.domain').attr('stroke', '#334155');
    bottomAxisG.selectAll('.tick text').attr('fill', '#94a3b8').attr('font-size', '10px');
    bottomAxisG.selectAll('.tick line').attr('stroke', '#334155');

    // Interactive Crosshair & SVG Tooltip Group (avoids SVGPoint creation on TouchEvents)
    const bisectDate = d3.bisector<{ parsedDate: Date }, Date>((d) => d.parsedDate).center;

    const crosshair = g
      .append('line')
      .attr('class', 'crosshair')
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', '#cbd5e1')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3')
      .attr('opacity', 0);

    const highlightSofrDot = g
      .append('circle')
      .attr('r', 5)
      .attr('fill', '#38bdf8')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .attr('opacity', 0);

    const highlightSrfDot = g
      .append('circle')
      .attr('r', 4.5)
      .attr('fill', '#f59e0b')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .attr('opacity', 0);

    // SVG Tooltip Box
    const tooltipWidth = 158;
    const tooltipHeight = 62;
    const tooltipGroup = g
      .append('g')
      .attr('pointer-events', 'none')
      .attr('opacity', 0);

    tooltipGroup
      .append('rect')
      .attr('width', tooltipWidth)
      .attr('height', tooltipHeight)
      .attr('rx', 6)
      .attr('fill', '#0b1120')
      .attr('fill-opacity', 0.96)
      .attr('stroke', '#38bdf8')
      .attr('stroke-opacity', 0.65)
      .attr('stroke-width', 1);

    const tooltipDateText = tooltipGroup
      .append('text')
      .attr('x', 10)
      .attr('y', 18)
      .attr('fill', '#f8fafc')
      .attr('font-size', '11px')
      .attr('font-weight', 'bold');

    const tooltipSofrText = tooltipGroup
      .append('text')
      .attr('x', 10)
      .attr('y', 36)
      .attr('fill', '#38bdf8')
      .attr('font-size', '11px')
      .attr('font-family', 'monospace')
      .attr('font-weight', 'bold');

    const tooltipSrfText = tooltipGroup
      .append('text')
      .attr('x', 10)
      .attr('y', 52)
      .attr('fill', '#f59e0b')
      .attr('font-size', '11px')
      .attr('font-family', 'monospace')
      .attr('font-weight', 'bold');

    const overlay = g
      .append('rect')
      .attr('class', 'overlay')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .attr('cursor', 'crosshair');

    const extractClientX = (event: Event): number | null => {
      if ('touches' in event) {
        const touchEvt = event as TouchEvent;
        const t = touchEvt.touches?.[0] ?? touchEvt.changedTouches?.[0];
        return t && Number.isFinite(t.clientX) ? t.clientX : null;
      }
      if ('clientX' in event) {
        const mouseEvt = event as MouseEvent;
        return Number.isFinite(mouseEvt.clientX) ? mouseEvt.clientX : null;
      }
      return null;
    };

    const updateCrosshair = (event: Event) => {
      const overlayEl = overlay.node();
      if (!overlayEl) return;

      const clientX = extractClientX(event);
      if (clientX === null) return;

      const rect = overlayEl.getBoundingClientRect();
      if (!rect || rect.width <= 0 || !Number.isFinite(rect.left)) return;

      const ratio = (clientX - rect.left) / rect.width;
      const localX = Math.max(0, Math.min(innerWidth, ratio * innerWidth));
      if (!Number.isFinite(localX)) return;

      const hoveredDate = xScale.invert(localX);
      if (Number.isNaN(hoveredDate.getTime())) return;

      const index = bisectDate(parsedData, hoveredDate);
      const selected = parsedData[index];
      if (!selected) return;

      const cx = xScale(selected.parsedDate);
      const cySofr = yLeft(selected.sofrRate);
      const cySrf = yRight(selected.srfUsageBillions);

      if (!Number.isFinite(cx) || !Number.isFinite(cySofr) || !Number.isFinite(cySrf)) {
        return;
      }

      crosshair.attr('x1', cx).attr('x2', cx).attr('opacity', 1);
      highlightSofrDot.attr('cx', cx).attr('cy', cySofr).attr('opacity', 1);
      highlightSrfDot.attr('cx', cx).attr('cy', cySrf).attr('opacity', 1);

      const tx =
        cx + 12 + tooltipWidth > innerWidth
          ? Math.max(4, cx - tooltipWidth - 12)
          : cx + 12;
      const ty = Math.max(4, Math.min(innerHeight - tooltipHeight - 4, cySofr - tooltipHeight / 2));

      tooltipDateText.text(`${selected.formattedDate} (${selected.date})`);
      tooltipSofrText.text(`SOFR: ${selected.sofrRate.toFixed(2)}%`);
      tooltipSrfText.text(`SRF:  $${selected.srfUsageBillions.toFixed(1)}B`);
      tooltipGroup.attr('transform', `translate(${tx},${ty})`).attr('opacity', 1);

      setSelectedPoint(selected);
    };

    const clearCrosshair = () => {
      crosshair.attr('opacity', 0);
      highlightSofrDot.attr('opacity', 0);
      highlightSrfDot.attr('opacity', 0);
      tooltipGroup.attr('opacity', 0);
      setSelectedPoint(null);
    };

    overlay
      .on('mousemove', (event: Event) => updateCrosshair(event))
      .on('mouseleave', () => clearCrosshair())
      .on('touchstart', (event: Event) => updateCrosshair(event), { passive: true })
      .on('touchmove', (event: Event) => updateCrosshair(event), { passive: true });
  }, [data, isCollapsed, containerWidth]);

  return (
    <section className="mb-4 overflow-hidden rounded-[10px] border border-[#334155] bg-[#111827]">
      {/* CARD HEADER & COLLAPSE TOGGLE */}
      <div
        onClick={() => setIsCollapsed((prev) => !prev)}
        className="flex cursor-pointer flex-wrap items-center justify-between gap-3 border-b border-[#334155]/60 bg-[#1e293b]/50 p-4 transition-colors hover:bg-[#1e293b]/80"
      >
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-[0.85rem] text-[#94a3b8]">
            {isCollapsed ? '▶' : '▼'}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[0.98rem] font-bold text-[#f8fafc]">
                30-Day NY Fed Plumbing Telemetry
              </h2>
              <Badge variant={BadgeVariant.Blue}>D3 Dual-Axis</Badge>
              {isLoading && (
                <span className="animate-pulse text-[0.72rem] text-[#38bdf8]">Syncing...</span>
              )}
            </div>
            <p className="text-[0.75rem] text-[#94a3b8]">
              Daily overnight SOFR rate (%) vs. Standing Repo Facility (SRF) volume ($B)
            </p>
          </div>
        </div>

        {/* 30D SUMMARY CHIPS */}
        <div className="flex flex-wrap items-center gap-2 text-[0.76rem]">
          <div className="rounded-[4px] border border-[#38bdf8]/40 bg-[#38bdf8]/10 px-2.5 py-1 text-[#38bdf8]">
            SOFR: <span className="font-mono font-bold">{stats.latestSofr.toFixed(2)}%</span>{' '}
            <span className="text-[0.7rem] opacity-75">
              (30D: {stats.minSofr.toFixed(2)}%–{stats.maxSofr.toFixed(2)}%)
            </span>
          </div>

          <div className="rounded-[4px] border border-[#f59e0b]/40 bg-[#f59e0b]/10 px-2.5 py-1 text-[#fcd34d]">
            SRF Usage: <span className="font-mono font-bold">${stats.latestSrf.toFixed(1)}B</span>{' '}
            <span className="text-[0.7rem] opacity-75">
              (Peak: ${stats.maxSrf.toFixed(1)}B)
            </span>
          </div>
        </div>
      </div>

      {/* EXPANDED CHART BODY */}
      {!isCollapsed && (
        <div className="p-4" ref={containerRef}>
          {/* LEGEND BAR */}
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3 text-[0.78rem]">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-6 rounded-[2px] bg-[#38bdf8]" />
                <span className="font-medium text-[#38bdf8]">SOFR Overnight Rate (%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-6 rounded-[2px] border border-dashed border-[#f59e0b] bg-[#f59e0b]/30" />
                <span className="font-medium text-[#f59e0b]">SRF Daily Facility ($B)</span>
              </div>
            </div>
            <div className="font-mono text-[0.73rem] text-[#94a3b8]">
              {selectedPoint
                ? `${selectedPoint.formattedDate}: SOFR ${selectedPoint.sofrRate.toFixed(2)}% | SRF $${selectedPoint.srfUsageBillions.toFixed(1)}B`
                : 'Tap or drag across chart for daily telemetry'}
            </div>
          </div>

          {/* D3 SVG CANVAS */}
          <div className="relative overflow-x-auto touch-pan-y">
            <svg ref={svgRef} className="block w-full min-w-[500px] select-none" />
          </div>
        </div>
      )}
    </section>
  );
};
