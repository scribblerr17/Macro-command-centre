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
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [activeTooltip, setActiveTooltip] = useState<{
    x: number;
    y: number;
    point: HistoricalTrendPoint;
  } | null>(null);

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
    if (isCollapsed || !data || data.length === 0 || !svgRef.current || !containerRef.current) {
      return;
    }

    const container = containerRef.current;
    const width = container.clientWidth || 900;
    const height = 260;
    const margin = { top: 25, right: 55, bottom: 35, left: 55 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg.attr('width', width).attr('height', height).attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Parse dates and set scales
    const parsedData = data.map((d) => ({
      ...d,
      parsedDate: new Date(d.date + 'T12:00:00'),
    }));

    const dateExtent = d3.extent(parsedData, (d) => d.parsedDate) as [Date, Date];
    const xScale = d3.scaleTime().domain(dateExtent).range([0, innerWidth]);

    // Left Y Axis (SOFR %)
    const minSofr = Math.min(...data.map((d) => d.sofrRate));
    const maxSofr = Math.max(...data.map((d) => d.sofrRate));
    const sofrPadding = Math.max(0.04, (maxSofr - minSofr) * 0.25);
    const yLeft = d3
      .scaleLinear()
      .domain([minSofr - sofrPadding, maxSofr + sofrPadding])
      .range([innerHeight, 0])
      .nice();

    // Right Y Axis (SRF $B)
    const maxSrf = Math.max(1.0, ...data.map((d) => d.srfUsageBillions));
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

    // SRF Bars or Step Area (Amber)
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

    // Interactive Overlay for Touch & Mouse crosshair
    const bisectDate = d3.bisector<{ parsedDate: Date }, Date>((d) => d.parsedDate).center;

    const crosshair = g
      .append('line')
      .attr('class', 'crosshair')
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', '#cbd5e1')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3')
      .style('opacity', 0);

    const highlightDot = g
      .append('circle')
      .attr('r', 5)
      .attr('fill', '#38bdf8')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .style('opacity', 0);

    const overlay = g
      .append('rect')
      .attr('class', 'overlay')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair');

    const handlePointerMove = (event: MouseEvent | TouchEvent) => {
      const coords = d3.pointer(event, overlay.node());
      const x0 = xScale.invert(coords[0]);
      const index = bisectDate(parsedData, x0);
      const selected = parsedData[index];

      if (selected) {
        const cx = xScale(selected.parsedDate);
        const cy = yLeft(selected.sofrRate);

        crosshair.attr('x1', cx).attr('x2', cx).style('opacity', 1);
        highlightDot.attr('cx', cx).attr('cy', cy).style('opacity', 1);

        setActiveTooltip({
          x: cx + margin.left,
          y: cy + margin.top,
          point: selected,
        });
      }
    };

    const handlePointerLeave = () => {
      crosshair.style('opacity', 0);
      highlightDot.style('opacity', 0);
      setActiveTooltip(null);
    };

    overlay
      .on('mousemove', handlePointerMove)
      .on('mouseleave', handlePointerLeave)
      .on('touchstart', handlePointerMove)
      .on('touchmove', handlePointerMove)
      .on('touchend', handlePointerLeave);
  }, [data, isCollapsed]);

  return (
    <section className="mb-4 rounded-[10px] border border-[#334155] bg-[#111827] overflow-hidden">
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
                <span className="text-[0.72rem] text-[#38bdf8] animate-pulse">Syncing...</span>
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
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-6 rounded-[2px] bg-[#38bdf8]" />
                <span className="text-[#38bdf8] font-medium">SOFR Overnight Rate (%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-6 rounded-[2px] border border-[#f59e0b] border-dashed bg-[#f59e0b]/30" />
                <span className="text-[#f59e0b] font-medium">SRF Daily Facility ($B)</span>
              </div>
            </div>
            <div className="text-[0.72rem] text-[#94a3b8]">
              💡 Tap or drag crosshair across the chart for daily details
            </div>
          </div>

          {/* D3 SVG CANVAS & FLOATING TOOLTIP */}
          <div className="relative overflow-x-auto">
            <svg ref={svgRef} className="block w-full min-w-[500px]" />

            {activeTooltip && (
              <div
                className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-[6px] border border-[#38bdf8]/60 bg-[#0b1120]/95 px-3 py-2 text-[0.76rem] shadow-xl backdrop-blur-sm"
                style={{
                  left: `${activeTooltip.x}px`,
                  top: `${Math.max(10, activeTooltip.y - 12)}px`,
                }}
              >
                <div className="mb-1 border-b border-[#334155] pb-1 font-bold text-[#f8fafc]">
                  {activeTooltip.point.formattedDate} ({activeTooltip.point.date})
                </div>
                <div className="flex items-center justify-between gap-3 text-[#38bdf8]">
                  <span>SOFR Rate:</span>
                  <span className="font-mono font-bold">
                    {activeTooltip.point.sofrRate.toFixed(2)}%
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 text-[#f59e0b]">
                  <span>SRF Usage:</span>
                  <span className="font-mono font-bold">
                    ${activeTooltip.point.srfUsageBillions.toFixed(1)}B
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
