import React, { useState } from 'react';
import type { PredictiveRetentionReport } from '../types';
import {
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Zap,
  Clock,
  CheckCircle2
} from 'lucide-react';

interface RetentionCurveGraphProps {
  report: PredictiveRetentionReport;
  onApplyFix?: (fixAdvice: string) => void;
}

export const RetentionCurveGraph: React.FC<RetentionCurveGraphProps> = ({
  report,
  onApplyFix
}) => {
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);

  const {
    hookSurvivalRate,
    averageWatchTimeSeconds,
    totalDurationSeconds,
    averageWatchPercentage,
    completedWatchRate,
    rewatchSpikeRate,
    loopViabilityScore,
    verdictSummary,
    retentionCurve,
    dropOffPoints,
    spikeMoments
  } = report;

  // Chart dimensions inside SVG viewBox
  const width = 800;
  const height = 240;
  const paddingLeft = 45;
  const paddingRight = 35;
  const paddingTop = 30;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  const chartBottom = height - paddingBottom;

  const totalDuration = Math.max(10, totalDurationSeconds || 30);
  const maxPercent = Math.max(
    100,
    ...retentionCurve.map((p) => Math.max(p.percentage, p.benchmarkPercentage || 0))
  );

  const getX = (second: number) => {
    const clampedSecond = Math.max(0, Math.min(second, totalDuration));
    return paddingLeft + (clampedSecond / totalDuration) * chartWidth;
  };

  const getY = (percentage: number) => {
    const clampedPct = Math.max(0, Math.min(percentage, maxPercent));
    return paddingTop + (1 - clampedPct / maxPercent) * chartHeight;
  };

  // Build coordinates for actual curve and benchmark curve
  const points = retentionCurve.map((p) => ({
    x: getX(p.second),
    y: getY(p.percentage),
    data: p
  }));

  const benchmarkPoints = retentionCurve.map((p) => ({
    x: getX(p.second),
    y: getY(p.benchmarkPercentage ?? Math.max(20, 100 - p.second * 2.2))
  }));

  // Helper to generate smooth cubic Bezier path
  const buildSmoothPath = (pts: { x: number; y: number }[]): string => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;

    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const cur = pts[i];
      const next = pts[i + 1];
      const cx = (cur.x + next.x) / 2;
      path += ` C ${cx} ${cur.y}, ${cx} ${next.y}, ${next.x} ${next.y}`;
    }
    return path;
  };

  const linePath = buildSmoothPath(points);
  const benchmarkPath = buildSmoothPath(benchmarkPoints);

  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${chartBottom} L ${points[0].x} ${chartBottom} Z`
      : '';

  // Active hover point
  const activePoint =
    activePointIndex !== null && points[activePointIndex]
      ? points[activePointIndex]
      : points[0] || null;

  return (
    <div className="space-y-6">
      {/* KPI Tiles (TikTok Studio Analytics) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Hook Survival (0-3s) */}
        <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-md">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Hook 0s-3s</span>
            <Zap className="w-3.5 h-3.5 text-violet-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-2xl font-black font-mono tracking-tight ${
                hookSurvivalRate >= 75
                  ? 'text-emerald-400'
                  : hookSurvivalRate >= 55
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {hookSurvivalRate}%
            </span>
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">
            {hookSurvivalRate >= 75 ? '🔥 Nivel Viral (>75%)' : 'Riesgo de fuga rápida'}
          </span>
        </div>

        {/* Average Watch Time */}
        <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-md">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Tiempo Medio</span>
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono tracking-tight text-zinc-100">
              {averageWatchTimeSeconds}s
            </span>
            <span className="text-xs text-zinc-400 font-mono">/ {totalDurationSeconds}s</span>
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">
            {averageWatchPercentage}% de retención media
          </span>
        </div>

        {/* Completion Rate */}
        <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-md">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Finalización</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-2xl font-black font-mono tracking-tight ${
                completedWatchRate >= 40
                  ? 'text-emerald-400'
                  : completedWatchRate >= 25
                  ? 'text-cyan-400'
                  : 'text-zinc-300'
              }`}
            >
              {completedWatchRate}%
            </span>
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Llegan al segundo final</span>
        </div>

        {/* Rewatch Spike Rate */}
        <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-md">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Re-visualización</span>
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono tracking-tight text-amber-400">
              +{rewatchSpikeRate}%
            </span>
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Rebobinados y loops</span>
        </div>

        {/* Loop Viability */}
        <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-md col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Potencial Loop</span>
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-2xl font-black font-mono tracking-tight ${
                loopViabilityScore >= 75
                  ? 'text-cyan-400'
                  : loopViabilityScore >= 50
                  ? 'text-violet-400'
                  : 'text-zinc-400'
              }`}
            >
              {loopViabilityScore}/100
            </span>
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Bucle continuo al seg 0</span>
        </div>
      </div>

      {/* Main Interactive Graph Card */}
      <div className="p-5 md:p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl space-y-4">
        {/* Graph Header with Legend */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-zinc-100 tracking-tight">
              Curva Predictiva Segundo a Segundo
            </h3>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              TikTok Studio Engine
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500" />
              <span className="text-zinc-300 text-[11px] font-medium">Predicción de tu video</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 border-b border-dashed border-zinc-500" />
              <span className="text-zinc-400 text-[11px]">Promedio del nicho</span>
            </div>
          </div>
        </div>

        {/* SVG Canvas Area */}
        <div className="relative w-full overflow-hidden select-none bg-zinc-950/70 rounded-xl border border-zinc-800/80 p-2">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto max-h-[300px] overflow-visible"
          >
            <defs>
              {/* Gradient for area fill under curve */}
              <linearGradient id="retentionGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.38" />
                <stop offset="60%" stopColor="#8b5cf6" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#09090b" stopOpacity="0.0" />
              </linearGradient>

              {/* Gradient for stroke */}
              <linearGradient id="curveStrokeGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="60%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid Lines */}
            {[100, 75, 50, 25, 0].map((pct) => {
              const yVal = getY(pct);
              return (
                <g key={pct}>
                  <line
                    x1={paddingLeft}
                    y1={yVal}
                    x2={width - paddingRight}
                    y2={yVal}
                    stroke="#27272a"
                    strokeWidth="1"
                    strokeDasharray={pct === 100 || pct === 0 ? undefined : '3 3'}
                  />
                  <text
                    x={paddingLeft - 8}
                    y={yVal + 3}
                    fill="#71717a"
                    fontSize="9"
                    fontFamily="monospace"
                    textAnchor="end"
                  >
                    {pct}%
                  </text>
                </g>
              );
            })}

            {/* Vertical Time Markers */}
            {[0, 3, 10, 20, 30, 45, 60]
              .filter((sec) => sec <= totalDuration)
              .map((sec) => {
                const xVal = getX(sec);
                return (
                  <g key={sec}>
                    <line
                      x1={xVal}
                      y1={paddingTop}
                      x2={xVal}
                      y2={chartBottom}
                      stroke="#27272a"
                      strokeWidth="1"
                      strokeDasharray="2 4"
                    />
                    <text
                      x={xVal}
                      y={chartBottom + 16}
                      fill="#71717a"
                      fontSize="9"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {sec}s
                    </text>
                  </g>
                );
              })}

            {/* Benchmark Line (Niche Average) */}
            {benchmarkPath && (
              <path
                d={benchmarkPath}
                fill="none"
                stroke="#52525b"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                opacity="0.8"
              />
            )}

            {/* Area Fill Under Predicted Curve */}
            {areaPath && <path d={areaPath} fill="url(#retentionGradient)" />}

            {/* Predicted Curve Stroke */}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke="url(#curveStrokeGradient)"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Interactive Data Points & Pins */}
            {points.map((pt, idx) => {
              const isHovered = activePointIndex === idx;
              const isHook = pt.data.eventType === 'hook' || pt.data.second <= 3;
              const isDrop = pt.data.eventType === 'drop';
              const isSpike = pt.data.eventType === 'spike';
              const isLoop = pt.data.eventType === 'loop';

              let pointColor = '#06b6d4';
              if (isDrop) pointColor = '#f43f5e';
              else if (isSpike) pointColor = '#10b981';
              else if (isLoop) pointColor = '#a855f7';
              else if (isHook) pointColor = '#38bdf8';

              return (
                <g
                  key={idx}
                  className="cursor-pointer transition-transform duration-150"
                  onMouseEnter={() => setActivePointIndex(idx)}
                  onClick={() => setActivePointIndex(idx)}
                >
                  {/* Invisible hit target for smooth hover */}
                  <circle cx={pt.x} cy={pt.y} r={16} fill="transparent" />

                  {/* Pulsing ring for critical events */}
                  {(isDrop || isSpike || isHovered) && (
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 9 : 7}
                      fill="none"
                      stroke={pointColor}
                      strokeWidth="2"
                      opacity={isHovered ? 0.9 : 0.5}
                      className={isDrop ? 'animate-ping' : ''}
                    />
                  )}

                  {/* Core point dot */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 5.5 : 4}
                    fill={pointColor}
                    stroke="#09090b"
                    strokeWidth="2"
                  />

                  {/* Event Label Pin for key milestones */}
                  {(isDrop || isSpike || isLoop || isHook) && (
                    <g transform={`translate(${pt.x}, ${pt.y - 14})`}>
                      <rect
                        x="-20"
                        y="-12"
                        width="40"
                        height="13"
                        rx="4"
                        fill={
                          isDrop
                            ? '#881337'
                            : isSpike
                            ? '#064e3b'
                            : isLoop
                            ? '#3b0764'
                            : '#083344'
                        }
                        stroke={pointColor}
                        strokeWidth="0.8"
                        opacity="0.9"
                      />
                      <text
                        x="0"
                        y="-3"
                        fill="#ffffff"
                        fontSize="7.5"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {isDrop
                          ? '🚨 FUGA'
                          : isSpike
                          ? '⚡ REWATCH'
                          : isLoop
                          ? '🔁 BUCLE'
                          : '🎯 HOOK'}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Vertical crosshair on active hover point */}
            {activePoint && (
              <line
                x1={activePoint.x}
                y1={paddingTop}
                x2={activePoint.x}
                y2={chartBottom}
                stroke="#a1a1aa"
                strokeWidth="1"
                strokeDasharray="2 2"
                opacity="0.7"
              />
            )}
          </svg>
        </div>

        {/* Interactive Point Inspection Detail Banner */}
        {activePoint && (
          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-center shrink-0">
                <span className="text-[10px] uppercase font-bold text-zinc-500 block">
                  Segundo
                </span>
                <span className="text-sm font-mono font-bold text-cyan-400">
                  {activePoint.data.timestamp} ({activePoint.data.second}s)
                </span>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-100 font-mono">
                    Retención: {activePoint.data.percentage}%
                  </span>
                  {activePoint.data.benchmarkPercentage && (
                    <span className="text-[10px] text-zinc-400 font-mono">
                      (Nicho: {activePoint.data.benchmarkPercentage}%)
                    </span>
                  )}
                  {activePoint.data.eventLabel && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-600/20 text-violet-300 border border-violet-500/30">
                      {activePoint.data.eventLabel}
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-300 mt-0.5 leading-snug">
                  {activePoint.data.annotation || 'Comportamiento de atención dentro del promedio.'}
                </p>
              </div>
            </div>

            <span className="text-[11px] text-zinc-500 font-medium shrink-0">
              Pasa el cursor o haz clic en cualquier punto para inspeccionarlo
            </span>
          </div>
        )}

        {/* Executive Verdict by VibeDirector */}
        <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
              Veredicto Algorítmico For You (FYP)
            </span>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed font-medium">
            {verdictSummary}
          </p>
        </div>
      </div>

      {/* Drop-Off Points & Rewatch Spikes Detail Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Drop-Off Points */}
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <h4 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
                Valles de Abandono (Puntos de Fuga)
              </h4>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">
              {dropOffPoints.length} detectados
            </span>
          </div>

          {dropOffPoints.length === 0 ? (
            <p className="text-xs text-zinc-500 italic p-3 text-center">
              No se detectaron fugas severas de retención en este guion.
            </p>
          ) : (
            <div className="space-y-3">
              {dropOffPoints.map((drop, dIdx) => (
                <div
                  key={dIdx}
                  className="p-3.5 rounded-xl bg-zinc-950 border border-rose-950/40 hover:border-rose-500/40 transition-colors space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        {drop.timestamp} ({drop.second}s)
                      </span>
                      <span
                        className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full ${
                          drop.severity === 'critica'
                            ? 'bg-rose-600/30 text-rose-300'
                            : 'bg-amber-600/30 text-amber-300'
                        }`}
                      >
                        Severidad {drop.severity}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-300 leading-snug">
                    <strong className="text-zinc-200">Motivo:</strong> {drop.reason}
                  </p>

                  <div className="p-2.5 rounded-lg bg-rose-950/20 border border-rose-500/20 text-xs text-rose-200/90 flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-rose-300 block mb-0.5">
                        Solución Quirúrgica:
                      </span>
                      <p className="text-[11px] leading-relaxed">{drop.fixAdvice}</p>
                    </div>

                    {onApplyFix && (
                      <button
                        type="button"
                        onClick={() => onApplyFix(drop.fixAdvice)}
                        className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold shrink-0 transition-colors"
                      >
                        Aplicar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rewatch Spikes & Loop Tricks */}
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
                Picos de Re-visualización (Rewatch)
              </h4>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">
              {spikeMoments.length} momentos
            </span>
          </div>

          {spikeMoments.length === 0 ? (
            <p className="text-xs text-zinc-500 italic p-3 text-center">
              No hay picos de rewatch explícitos. Añade texto rápido o detalles visuales para obligar al usuario a pausar.
            </p>
          ) : (
            <div className="space-y-3">
              {spikeMoments.map((spike, sIdx) => (
                <div
                  key={sIdx}
                  className="p-3.5 rounded-xl bg-zinc-950 border border-emerald-950/40 hover:border-emerald-500/40 transition-colors space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {spike.timestamp} ({spike.second}s)
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {spike.driver}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-300 leading-snug">{spike.reason}</p>
                </div>
              ))}
            </div>
          )}

          {/* Loop trick badge */}
          <div className="p-3.5 rounded-xl bg-violet-950/20 border border-violet-500/30 space-y-1">
            <span className="text-[10px] uppercase font-bold text-violet-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Multiplicador de Bucle ({loopViabilityScore}/100)</span>
            </span>
            <p className="text-[11px] text-zinc-300 leading-relaxed">
              Un buen remate circular reconecta la última palabra con el gancho inicial, haciendo que TikTok cuente una segunda reproducción antes de que el usuario decida deslizar.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
