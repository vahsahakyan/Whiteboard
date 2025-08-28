import type { Ref } from "vue";
import type { Shape } from "../composables/useWhiteboardState.js";



interface Params {
  currentTool: Ref<string>;
  lines: Ref<Shape[]>;
  selectedId: Ref<string | null>;
  brushThickness: Ref<number>;
  isDrawing: Ref<boolean>;
  selectionEnabled: Ref<boolean>;
  showBrushMenu: Ref<boolean>;
  showThicknessSlider: Ref<boolean>;
  showThicknessPopover: Ref<boolean>;
  showShapesMenu: Ref<boolean>;
  mousePos: Ref<{ x: number; y: number } | null>;
  onCommit?: () => void;
}

export function usePointerDraw({
  currentTool,
  lines,
  selectedId,
  brushThickness,
  isDrawing,
  selectionEnabled,
  showBrushMenu,
  showThicknessSlider,
  showThicknessPopover,
  showShapesMenu,
  mousePos,
  onCommit,
}: Params) {
  let currentShape: Shape | null = null;
  let lastPoint: { x: number; y: number } | null = null;
  let raf = false;
  const eraserRadius = 32;
  let lastErase = 0;

  const uid = () => "s-" + Math.random().toString(36).slice(2, 9);

  function rdp(points: number[], epsilon = 1.5): number[] {
    if (points.length < 4) return points;
    function get(idx: number) {
      return [points[idx * 2], points[idx * 2 + 1]];
    }
    function d2([x1, y1]: number[], [x2, y2]: number[]) {
      return (x1 - x2) ** 2 + (y1 - y2) ** 2;
    }
    function rdpRec(start: number, end: number): number[] {
      if (end - start <= 1) return [start];
      let maxDist = 0,
        index = start;
      const [x1, y1] = get(start),
        [x2, y2] = get(end);
      for (let i = start + 1; i < end; i++) {
        const [px, py] = get(i);
        const t =
          ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) /
          (d2([x1, y1], [x2, y2]) || 1);
        const [ix, iy] = [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t];
        const dist = d2([px, py], [ix, iy]);
        if (dist > maxDist) {
          maxDist = dist;
          index = i;
        }
      }
      if (Math.sqrt(maxDist) > epsilon) {
        return [...rdpRec(start, index), ...rdpRec(index, end)];
      }
      return [start];
    }
    const keep = [...rdpRec(0, points.length / 2 - 1), points.length / 2 - 1];
    return keep.flatMap((i) => get(i));
  }

  function bezierFit(points: number[], samples = 36): number[] {
    if (points.length < 4) return points;
    const result: number[] = [];
    const n = points.length / 2;
    for (let i = 0; i < n - 1; i++) {
      const p0x = points[2 * Math.max(i - 1, 0)],
        p0y = points[2 * Math.max(i - 1, 0) + 1];
      const p1x = points[2 * i],
        p1y = points[2 * i + 1];
      const p2x = points[2 * (i + 1)],
        p2y = points[2 * (i + 1) + 1];
      const p3x = points[2 * Math.min(i + 2, n - 1)],
        p3y = points[2 * Math.min(i + 2, n - 1) + 1];
      const cp1x = p1x + (p2x - p0x) / 6,
        cp1y = p1y + (p2y - p0y) / 6;
      const cp2x = p2x - (p3x - p1x) / 6,
        cp2y = p2y - (p3y - p1y) / 6;
      for (let t = 0; t < samples; t++) {
        const tt = t / samples;
        const x =
          Math.pow(1 - tt, 3) * p1x +
          3 * Math.pow(1 - tt, 2) * tt * cp1x +
          3 * (1 - tt) * Math.pow(tt, 2) * cp2x +
          Math.pow(tt, 3) * p2x;
        const y =
          Math.pow(1 - tt, 3) * p1y +
          3 * Math.pow(1 - tt, 2) * tt * cp1y +
          3 * (1 - tt) * Math.pow(tt, 2) * cp2y +
          Math.pow(tt, 3) * p2y;
        result.push(x, y);
      }
    }
    result.push(points[points.length - 2], points[points.length - 1]);
    return result;
  }

  function isNearlyStraight(pts: number[], tol = 5) {
    if (pts.length < 4) return false;
    const [x0, y0] = pts,
      [x1, y1] = pts.slice(-2);
    const A = y0 - y1,
      B = x1 - x0,
      C = x0 * y1 - x1 * y0,
      D = Math.hypot(A, B);
    for (let i = 2; i < pts.length - 2; i += 4) {
      if (Math.abs(A * pts[i] + B * pts[i + 1] + C) / D > tol) return false;
    }
    return true;
  }

  function isNearlyCircle(pts: number[], tol = 0.09) {
    if (pts.length < 6) return false;
    const xs = pts.filter((_, i) => i % 2 === 0),
      ys = pts.filter((_, i) => i % 2 === 1);
    const minX = Math.min(...xs),
      maxX = Math.max(...xs),
      minY = Math.min(...ys),
      maxY = Math.max(...ys);
    const cx = (minX + maxX) / 2,
      cy = (minY + maxY) / 2,
      r = (maxX - minX + maxY - minY) / 4;
    let sum = 0,
      count = 0;
    for (let i = 0; i < pts.length; i += 20) {
      sum += Math.abs(Math.hypot(pts[i] - cx, pts[i + 1] - cy) - r) / r;
      count++;
    }
    return sum / count < tol;
  }

  function isNearlyRect(pts: number[], tol = 0.1) {
    if (pts.length < 8) return false;
    const xs = pts.filter((_, i) => i % 2 === 0),
      ys = pts.filter((_, i) => i % 2 === 1);
    const minX = Math.min(...xs),
      maxX = Math.max(...xs),
      minY = Math.min(...ys),
      maxY = Math.max(...ys);
    const corners = [
      [minX, minY],
      [minX, maxY],
      [maxX, minY],
      [maxX, maxY],
    ];
    let hits = 0;
    for (const [cx, cy] of corners) {
      if (
        pts.some(
          (v, i) =>
            i % 2 === 0 &&
            Math.hypot(v - cx, pts[i + 1] - cy) <
              Math.hypot(maxX - minX, maxY - minY) * tol
        )
      )
        hits++;
    }
    return hits === 4;
  }

  function isClosed(points: number[], maxDistance = 24) {
    if (points.length < 4) return false;
    const dx = points[0] - points[points.length - 2];
    const dy = points[1] - points[points.length - 1];
    return Math.hypot(dx, dy) < maxDistance;
  }

  function segmentCircleIntersect(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    cx: number,
    cy: number,
    r: number
  ): boolean {
    const dx = x2 - x1,
      dy = y2 - y1;
    const fx = x1 - cx,
      fy = y1 - cy;
    const a = dx * dx + dy * dy;
    const b = 2 * (fx * dx + fy * dy);
    const c = fx * fx + fy * fy - r * r;
    let discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return false;
    discriminant = Math.sqrt(discriminant);
    const t1 = (-b - discriminant) / (2 * a);
    const t2 = (-b + discriminant) / (2 * a);
    if ((t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1)) return true;
    if (
      Math.hypot(x1 - cx, y1 - cy) < r ||
      Math.hypot(x2 - cx, y2 - cy) < r
    )
      return true;
    return false;
  }

  function shapeIntersectsEraser(
    s: Shape,
    ex: number,
    ey: number,
    r: number
  ): boolean {
    switch (s.type) {
      case "drawing":
        return true;
      case "straight":
      case "arrow": {
        const [x1, y1, x2, y2] = s.points as any;
        const minX = Math.min(x1, x2) - r;
        const maxX = Math.max(x1, x2) + r;
        const minY = Math.min(y1, y2) - r;
        const maxY = Math.max(y1, y2) + r;
        if (ex < minX || ex > maxX || ey < minY || ey > maxY) {
          return false;
        }
        return segmentCircleIntersect(x1, y1, x2, y2, ex, ey, r);
      }
      case "rect": {
        const minX = s.x!;
        const maxX = s.x! + (s.width || 0);
        const minY = s.y!;
        const maxY = s.y! + (s.height || 0);
        const cx = Math.max(minX, Math.min(ex, maxX));
        const cy = Math.max(minY, Math.min(ey, maxY));
        return Math.hypot(cx - ex, cy - ey) < r;
      }
      case "ellipse": {
        const cx = s.x! + (s.width || 0) / 2;
        const cy = s.y! + (s.height || 0) / 2;
        const rx = (s.width || 0) / 2;
        const ry = (s.height || 0) / 2;
        const norm =
          (ex - cx) ** 2 / (rx * rx) + (ey - cy) ** 2 / (ry * ry);
        if (norm <= 1) return true;
        return Math.hypot(cx - ex, cy - ey) < Math.max(rx, ry) + r;
      }
      default:
        return false;
    }
  }

  function performErase(ex: number, ey: number, r: number) {
    let changed = false;
    const newShapes: Shape[] = [];

    for (const s of lines.value) {
      if (s.type === "drawing") {
        const pts = s.points;
        let start = 0;
        const segments: number[][] = [];

        for (let i = 0; i < pts.length - 2; i += 2) {
          const x1 = pts[i],
            y1 = pts[i + 1];
          const x2 = pts[i + 2],
            y2 = pts[i + 3];

          if (segmentCircleIntersect(x1, y1, x2, y2, ex, ey, r)) {
            if (i > start) segments.push(pts.slice(start, i + 2));
            start = i + 2;
          }
        }
        if (start < pts.length - 1) segments.push(pts.slice(start));

        const kept = segments.filter((seg) => seg.length >= 4);
        if (kept.length === 0) {
          changed = true;
          continue;
        }
        if (kept.length === 1 && kept[0].length === pts.length) {
          newShapes.push(s);
        } else {
          changed = true;
          for (const seg of kept) {
            newShapes.push({ ...s, id: uid(), points: seg });
          }
        }
      } else {
        if (shapeIntersectsEraser(s, ex, ey, r)) {
          changed = true;
          continue;
        }
        newShapes.push(s);
      }
    }

    if (changed) {
      lines.value = newShapes;
      if (onCommit) onCommit();
    }
  }

  function processDraw() {
    raf = false;
    if (!isDrawing.value || !currentShape || !lastPoint) return;
    const p = lastPoint;
    const s = currentShape;
    const idx = lines.value.findIndex((x: any) => x.id === s.id);
    if (idx < 0) return;
    if (s.type === "drawing") {
      s.points.push(p.x, p.y);
      lines.value[idx].points = [...s.points];
    } else if (s.type === "straight" || s.type === "arrow") {
      s.points[2] = p.x;
      s.points[3] = p.y;
      lines.value[idx].points = [...s.points];
    } else {
      s.points[2] = p.x;
      s.points[3] = p.y;
      s.width = Math.abs(p.x - s.points[0]);
      s.height = Math.abs(p.y - s.points[1]);
      s.x = Math.min(p.x, s.points[0]);
      s.y = Math.min(p.y, s.points[1]);
      lines.value[idx] = { ...s };
    }
  }

  function onMouseDown(e: any) {
    const pos = e.target.getStage()?.getPointerPosition();
    showBrushMenu.value = false;
    showThicknessSlider.value = false;
    showThicknessPopover.value = false;
    showShapesMenu.value = false;

    if (!pos) return;
    if (e.target !== e.target.getStage()) {
      isDrawing.value = false;
      return;
    }
    if (currentTool.value === "select") {
      selectedId.value = null;
      return;
    }

    isDrawing.value = true;
    selectedId.value = null;

    const base: any = {
      id: uid(),
      author: "user",
      stroke: "#000",
      strokeWidth: brushThickness.value,
      createdAt: new Date().toISOString(),
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      points: [] as number[],
      zIndex: lines.value.length,
    };

    switch (currentTool.value) {
      case "pen":
        currentShape = { ...base, type: "drawing", points: [pos.x, pos.y] };
        break;
      case "marker":
        currentShape = {
          ...base,
          type: "drawing",
          points: [pos.x, pos.y],
          stroke: "rgba(0,0,0,0.5)",
        };
        break;
      case "straight":
        currentShape = {
          ...base,
          type: "straight",
          points: [pos.x, pos.y, pos.x, pos.y],
        };
        break;
      case "arrow":
        currentShape = {
          ...base,
          type: "arrow",
          points: [pos.x, pos.y, pos.x, pos.y],
        };
        break;
      case "rect":
        currentShape = {
          ...base,
          type: "rect",
          x: pos.x,
          y: pos.y,
          points: [pos.x, pos.y, pos.x, pos.y],
        };
        break;
      case "ellipse":
        currentShape = {
          ...base,
          type: "ellipse",
          x: pos.x,
          y: pos.y,
          points: [pos.x, pos.y, pos.x, pos.y],
        };
        break;
      default:
        currentShape = null;
    }
    if (currentShape) {
      lines.value.push(currentShape);
      lastPoint = pos;
      raf = false;
    }
  }

  function onMouseMove(e: any) {
    if (!isDrawing.value) return;
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;

    if (currentTool.value === "eraser") {
      mousePos.value = { x: pos.x, y: pos.y };
      const now = performance.now();
      if (now - lastErase > 16) {
        performErase(pos.x, pos.y, eraserRadius);
        lastErase = now;
      }
      return;
    } else {
      mousePos.value = null;
    }

    lastPoint = pos;
    if (!raf) {
      raf = true;
      requestAnimationFrame(processDraw);
    }
  }

  function onMouseUp() {
    if (currentTool.value === "eraser") {
      mousePos.value = null;
    }
    if (!isDrawing.value) return;
    isDrawing.value = false;

    if (
      (currentTool.value === "pen" || currentTool.value === "marker") &&
      currentShape
    ) {
      const simplified = rdp(currentShape.points, 2);
      currentShape.points = bezierFit(simplified, 36);
      if (isNearlyStraight(currentShape.points, 5)) {
        const [x0, y0] = currentShape.points.slice(0, 2);
        const [x1, y1] = currentShape.points.slice(-2);
        currentShape.type = "straight";
        currentShape.points = [x0, y0, x1, y1];
      } else if (
        currentShape.points.length >= 16 &&
        isNearlyRect(currentShape.points, 0.06) &&
        isClosed(currentShape.points, 24)
      ) {
        const xs = currentShape.points.filter((_, i) => i % 2 === 0);
        const ys = currentShape.points.filter((_, i) => i % 2 === 1);
        const minX = Math.min(...xs),
          maxX = Math.max(...xs);
        const minY = Math.min(...ys),
          maxY = Math.max(...ys);
        const diameter = Math.max(maxX - minX, maxY - minY);
        currentShape.type = "rect";
        currentShape.x = minX;
        currentShape.y = minY;
        currentShape.width = maxX - minX;
        currentShape.height = maxY - minY;
      } else if (isNearlyCircle(currentShape.points, 0.09)) {
        const xs = currentShape.points.filter((_, i) => i % 2 === 0);
        const ys = currentShape.points.filter((_, i) => i % 2 === 1);
        const minX = Math.min(...xs),
          maxX = Math.max(...xs);
        const minY = Math.min(...ys),
          maxY = Math.max(...ys);
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        const diameter = Math.max(maxX - minX, maxY - minY);
        currentShape.type = "ellipse";
        currentShape.width = diameter;
        currentShape.height = diameter;
        currentShape.x = cx - diameter / 2;
        currentShape.y = cy - diameter / 2;
      }

      const j = lines.value.findIndex((x: any) => x.id === currentShape!.id);
      if (j >= 0) lines.value[j] = { ...currentShape! };
    }

    currentShape = null;
    if (onCommit) onCommit();
  }

  return {
    onMouseDown,
    onMouseMove,
    onMouseUp,
    performErase,
  };
}
