"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface AnnotationStroke {
  color: string;
  width: number;
  points: number[]; // [x1, y1, x2, y2, ...] where values are 0-100 percentage
}

interface SlideAnnotationCanvasProps {
  strokes: AnnotationStroke[];
  onChange: (updatedStrokes: AnnotationStroke[]) => void;
  isDrawingMode: boolean;
  themeAccent: string;
}

export default function SlideAnnotationCanvas({
  strokes,
  onChange,
  isDrawingMode,
  themeAccent,
}: SlideAnnotationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState("#f43f5e"); // Default rose-500
  const [currentWidth, setCurrentWidth] = useState(3);
  const [prevStrokes, setPrevStrokes] = useState<AnnotationStroke[]>(strokes);
  const [localStrokes, setLocalStrokes] = useState<AnnotationStroke[]>(strokes || []);

  if (strokes !== prevStrokes) {
    setPrevStrokes(strokes);
    setLocalStrokes(strokes || []);
  }

  // Redraw canvas whenever strokes change or window resizes
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;

    // Set canvas internal resolution to match displayed size
    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    localStrokes.forEach((stroke) => {
      if (stroke.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;

      const startX = (stroke.points[0] / 100) * width;
      const startY = (stroke.points[1] / 100) * height;
      ctx.moveTo(startX, startY);

      for (let i = 2; i < stroke.points.length; i += 2) {
        const x = (stroke.points[i] / 100) * width;
        const y = (stroke.points[i + 1] / 100) * height;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    });
  }, [localStrokes]);

  useEffect(() => {
    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [draw]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setIsDrawing(true);
    const newStroke: AnnotationStroke = {
      color: currentColor,
      width: currentWidth,
      points: [x, y],
    };
    setLocalStrokes((prev) => [...prev, newStroke]);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isDrawingMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setLocalStrokes((prev) => {
      if (prev.length === 0) return prev;
      const last = { ...prev[prev.length - 1] };
      last.points = [...last.points, x, y];
      return [...prev.slice(0, -1), last];
    });
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    onChange(localStrokes);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLocalStrokes([]);
    onChange([]);
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-[10] select-none"
      style={{ pointerEvents: isDrawingMode ? "auto" : "none" }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair block bg-transparent"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      {isDrawingMode && (
        <div
          className="absolute bottom-4 left-4 bg-black/90 border border-zinc-800 p-2 rounded-[4px] flex items-center gap-3 shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
          style={{ pointerEvents: "auto" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Colors */}
          <div className="flex gap-1.5 border-r border-zinc-800 pr-3">
            {["#f43f5e", "#eab308", "#10b981", "#ffffff", themeAccent].map((c) => (
              <button
                key={c}
                onClick={() => setCurrentColor(c)}
                className="w-4 h-4 rounded-full border border-black/40 cursor-pointer transition-transform duration-100 hover:scale-110"
                style={{
                  backgroundColor: c,
                  outline: currentColor === c ? "1.5px solid white" : "none",
                  outlineOffset: 1,
                }}
              />
            ))}
          </div>

          {/* Width */}
          <div className="flex items-center gap-2 border-r border-zinc-800 pr-3">
            <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-wide">Brush</span>
            <input
              type="range"
              min="1"
              max="10"
              value={currentWidth}
              onChange={(e) => setCurrentWidth(parseInt(e.target.value))}
              className="w-16 accent-indigo cursor-pointer h-1 rounded-lg bg-zinc-800"
            />
          </div>

          {/* Clear */}
          <button
            onClick={handleClear}
            className="bg-transparent border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-cream px-2 py-1 rounded-[2px] font-mono text-[9px] tracking-wide uppercase cursor-pointer transition-colors duration-150"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
