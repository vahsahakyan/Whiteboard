import { ref, computed, watch, nextTick } from "vue";

export type Shape = {
  id: string;
  type:
    | "drawing"
    | "straight"
    | "arrow"
    | "rect"
    | "ellipse"
    | "sticky"
    | "text"
    | "math"
    | "image"
    | "mixed";
  author: "user" | "tutor";
  points: number[];
  image?: HTMLImageElement;
  src?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  stroke: string;
  strokeWidth: number;
  rotation?: number;
  createdAt: string;
  zIndex: number;
  text?: string;
  bgColor?: string;
  fontSize?: number;
  fontFamily?: string;
  fill?: string;
  children?: any[];
  rawText?: string;
  groupId?: string;
};

export function useWhiteboardState() {
  const currentTool = ref<
    | "pen"
    | "marker"
    | "eraser"
    | "select"
    | "straight"
    | "arrow"
    | "rect"
    | "ellipse"
    | "sticky"
    | "text"
    | "math"
    | "image"
  >("pen");

  const lines = ref<Shape[]>([]);
  const selectedId = ref<string | null>(null);
  const showNewTextInput = ref(false);
  const showShapesMenu = ref(false);
  const showBrushMenu = ref(false);
  const showThicknessSlider = ref(false);
  const brushModes = ["pen", "marker"] as const;
  type BrushMode = (typeof brushModes)[number];
  const currentBrushMode = ref<BrushMode>("pen");
  const toolThickness = ref<Record<string, number>>({
    pen: 4,
    marker: 4,
    straight: 2,
    arrow: 2,
    rect: 2,
    ellipse: 2,
  });
  const brushThickness = computed({
    get() {
      return toolThickness.value[currentTool.value] ?? 2;
    },
    set(size: number) {
      toolThickness.value[currentTool.value] = size;
    },
  });

  const isShapeActive = computed(() =>
    ["straight", "arrow", "rect", "ellipse"].includes(currentTool.value)
  );
  const isBrushActive = computed(() =>
    (brushModes as readonly string[]).includes(currentTool.value)
  );
  const selectionEnabled = computed(() => currentTool.value === "select");


  return {
    currentTool,
    lines,
    selectedId,
    showNewTextInput,
    showShapesMenu,
    showBrushMenu,
    showThicknessSlider,
    brushModes,
    currentBrushMode,
    brushThickness,
    isShapeActive,
    isBrushActive,
    selectionEnabled,
    toolThickness,
  };
}
