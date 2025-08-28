<template lang="pug">
.microfrontend-blackboard.layout(ref="rootEl")
  .main-section
    Toolbar(
      :currentTool="currentTool"
      :isBrushActive="isBrushActive"
      :showShapesMenu="showShapesMenu"
      :isShapeActive="isShapeActive"
      :showNewTextInput="showNewTextInput"
      :showBrushMenu="showBrushMenu"
      :brushModes="brushModes"
      :popoverPosition="popoverPosition"
      :showThicknessSlider="showThicknessSlider"
      :thicknessOptions="thicknessOptions"
      :brushThickness="brushThickness"
      :shapesPos="shapesPos"
      @setTool="setTool"
      @handleBrushButtonClick="handleBrushButtonClick"
      @selectBrushMode="selectBrushMode"
      @updateBrushThickness="updateBrushThickness"
      @toggleShapesMenu="toggleShapesMenu"
      @selectShapeMode="selectShapeMode"
      @activateTextInput="activateTextInput"
      @toggleThicknessSlider="showThicknessSlider = !showThicknessSlider"
      @createSticky="createSticky"
      @onImageFileChange="onImageFileChange"
      @handlePopoverEnter="handlePopoverEnter"
      @handlePopoverLeave="handlePopoverLeave"
    )

    .canvas-column(style="position: relative" ref="canvasColumnRef")
      .canvas-scroll-wrapper(
        ref="canvasScrollWrapper"
        :class="['canvas-scroll-wrapper', { 'disable-scroll': currentTool !== 'select' }]"
        style="overflow: auto; width: 100%; height: 100vh"
        @scroll="handleScroll"
      )
        v-stage(
          ref="stageRef"
          :config="{ width: stageWidth, height: stageHeight }"
          @mousedown="wbMouseDown"
          @mouseup="wbMouseUp"
          @mousemove="wbMouseMove"
          @touchstart="onTouchStart"
          @touchmove="onTouchMove"
          @touchend="onTouchEnd"
          @click="onStageClick"
          class="whiteboard-canvas"
        )
          v-layer(ref="layerRef")
            template(v-for="shape in linesSorted" :key="shape.id")
              v-line(
                v-if="shape.type === 'drawing' || shape.type === 'straight'"
                :points="shape.points"
                :stroke="shape.stroke"
                :strokeWidth="shape.strokeWidth"
                :x="shape.x"
                :y="shape.y"
                lineCap="round"
                lineJoin="round"
                :zIndex="shape.zIndex"
                :shadowEnabled="shape.id === selectedId"
                shadowColor="#58a5ff"
                :shadowBlur="shape.id === selectedId ? 6 : 0"
                :draggable="selectionEnabled"
                @dragstart="selectShape(shape.id, $event)"
                @dragend="onLineDrag(shape, $event)"
                @click="selectShape(shape.id, $event)"
              )
              v-arrow(
                v-else-if="shape.type === 'arrow'"
                :points="shape.points"
                :stroke="shape.stroke"
                :strokeWidth="shape.strokeWidth"
                :pointerLength="10"
                :pointerWidth="10"
                lineCap="round"
                lineJoin="round"
                :zIndex="shape.zIndex"
                :draggable="selectionEnabled"
                :shadowEnabled="shape.id === selectedId"
                shadowColor="#58a5ff"
                :shadowBlur="shape.id === selectedId ? 6 : 0"
                @click="selectShape(shape.id, $event)"
              )
              v-rect(
                v-else-if="shape.type === 'rect'"
                :draggable="selectionEnabled"
                :x="shape.x"
                :y="shape.y"
                :width="shape.width"
                :height="shape.height"
                :stroke="shape.stroke"
                :strokeWidth="shape.strokeWidth"
                fill="transparent"
                :zIndex="shape.zIndex"
                :shadowEnabled="shape.id === selectedId"
                shadowColor="#58a5ff"
                :shadowBlur="shape.id === selectedId ? 6 : 0"
                @dragstart="selectShape(shape.id, $event)"
                @dragend="onDragEnd(shape, $event)"
                @click="selectShape(shape.id, $event)"
              )
              v-ellipse(
                v-else-if="shape.type === 'ellipse'"
                :draggable="selectionEnabled"
                :x="shape.x + (shape.width || 0) / 2"
                :y="shape.y + (shape.height || 0) / 2"
                :radiusX="(shape.width || 0) / 2"
                :radiusY="(shape.height || 0) / 2"
                :stroke="shape.stroke"
                :strokeWidth="shape.strokeWidth"
                fill="transparent"
                :zIndex="shape.zIndex"
                :shadowEnabled="shape.id === selectedId"
                shadowColor="#58a5ff"
                :shadowBlur="shape.id === selectedId ? 6 : 0"
                @dragstart="selectShape(shape.id, $event)"
                @dragend="onDragEnd(shape, $event)"
                @click="selectShape(shape.id, $event)"
              )
              v-group(
                v-if="shape.type === 'sticky'"
                :x="shape.x"
                :y="shape.y"
                :draggable="!editingSticky || editingSticky.id !== shape.id"
                @dragstart="selectShape(shape.id, $event)"
                @dragend="onStickyDrag(shape, $event)"
                @tap="handleStickyClick(shape, $event)"
                @click="handleStickyClick(shape, $event)"
                listening="true"
                cursor="pointer"
              )
                v-group(
                  :clipX="0"
                  :clipY="0"
                  :clipWidth="shape.width ?? 240"
                  :clipHeight="shape.height ?? 160"
                  clipCornerRadius="12"
                )
                  v-rect(
                    :width="shape.width ?? 240"
                    :height="shape.height ?? 160"
                    :fill="shape.bgColor"
                    :stroke="shape.stroke"
                    :strokeWidth="shape.strokeWidth"
                    shadowBlur="6"
                    shadowColor="#45a9ff55"
                  )
                  v-text(
                    v-if="editingSticky?.id !== shape.id"
                    :x="12"
                    :y="12"
                    :text="shape.text"
                    :width="(shape.width ?? 240) - 24"
                    :fontSize="shape.fontSize ?? 18"
                    fontFamily="Inter, Arial, sans-serif"
                    fill="#4d3f29"
                    wrap="word"
                    lineHeight="1.3"
                  )
              v-group(
                v-else-if="shape.type === 'mixed' && !(editingTextShape?.id === shape.id && showNewTextInput)"
                :x="shape.x"
                :y="shape.y"
                :draggable="selectionEnabled"
                @dragstart="selectShape(shape.id, $event)"
                @dragend="onMixedDragEnd(shape, $event)"
                @click="selectShape(shape.id, $event); editTextShape(shape);"
                @tap="selectShape(shape.id, $event); editTextShape(shape);"
              )
                template(v-for="child in shape.children" :key="child.offsetX + '-' + child.offsetY")
                  v-text(
                    v-if="child.kind === 'text'"
                    :x="child.offsetX"
                    :y="child.offsetY"
                    :text="child.content"
                    :fontSize="child.fontSize"
                    :fontFamily="'Arial'"
                    :fill="child.fill"
                    :width="child.width"
                    :height="child.height"
                    wrap="word"
                    lineHeight="1.1"
                    listening="false"
                  )
                  v-image(
                    v-else-if="child.kind === 'math'"
                    :x="child.offsetX"
                    :y="child.offsetY"
                    :image="child.image"
                    :width="child.width"
                    :height="child.height"
                    listening="false"
                  )
              v-circle(
                v-if="currentTool === 'eraser' && mousePos"
                :x="mousePos.x"
                :y="mousePos.y"
                :radius="eraserRadius"
                stroke="#518aff"
                strokeWidth="2"
                fill="#518aff22"
                listening="false"
              )
              v-image(
                v-if="shape.type === 'math'"
                :image="shape.image"
                :x="shape.x"
                :y="shape.y"
                :width="shape.width"
                :height="shape.height"
                :draggable="true"
                :shadowEnabled="shape.id === selectedId"
                shadowColor="#58a5ff"
                :shadowBlur="shape.id === selectedId ? 8 : 0"
                @dragend="onDragEnd(shape, $event)"
                @click="selectShape(shape.id, $event)"
              )
              v-image(
                v-if="shape.type === 'image'"
                :image="shape.image"
                :x="shape.x"
                :y="shape.y"
                :width="shape.width"
                :height="shape.height"
                :rotation="shape.rotation"
                :draggable="currentTool === 'select' || currentTool === 'image'"
                :listening="currentTool === 'select' || currentTool === 'image'"
                :shadowEnabled="shape.id === selectedId"
                shadowColor="#58a5ff"
                :shadowBlur="shape.id === selectedId ? 8 : 0"
                @dragend="onImageDrag(shape, $event)"
                @transformend="onImageTransformEnd"
                @click="selectShape(shape.id, $event)"
                @tap="selectShape(shape.id, $event)"
                @touchstart="selectShape(shape.id, $event)"
                :ref="el => { if (el) imageRefs[shape.id] = el }"
              )
            v-transformer(
              v-if="selectedImageNode"
              :nodes="[selectedImageNode]"
              :config="{ rotateEnabled: true, enabledAnchors: ['top-left','top-right','bottom-left','bottom-right'] }"
            )
      transition(name="fade")
        .sticky-edit-overlay(
          v-if="editingSticky"
          :style="{ position: 'absolute', left: editingStickyPos.left + 'px', top: editingStickyPos.top + 'px', width: (editingSticky.width || 240) + 'px', height: (editingSticky.height || 160) + 'px', zIndex: 2002 }"
          @mousedown.self="cancelStickyEdit"
          @mousedown="startDragSticky"
        )
          .text-delete-btn(
            @mousedown.stop="ignoreStickyEditBlur = true"
            @click.stop="editingSticky && deleteSticky(editingSticky.id)"
            :style="{ position: 'absolute', top: '4px', right: '4px', zIndex: 2003, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#ee5a4f', boxShadow: '0 2px 8px rgba(238, 90, 79, 0.5)', transition: 'background-color 0.2s ease, box-shadow 0.2s ease' }"
            @mouseenter="onDeleteBtnMouseEnter"
            @mouseleave="onDeleteBtnMouseLeave"
          )
            svg(
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            )
              path(
                d="M5 5L11 11M11 5L5 11"
                stroke="#fff"
                stroke-width="2"
                stroke-linecap="round"
              )
          textarea(
            ref="stickyTextarea"
            v-model="editingText"
            class="sticky-edit-textarea"
            style="width: 100%; height: 100%; resize: none; border: none; outline: none; background: transparent; font-size: 18px; font-family: 'Inter', Arial, sans-serif; line-height: 1.3; padding: 12px;"
            @keydown.enter.prevent="saveStickyEdit"
            @blur="saveStickyEdit"
            autofocus
          )
      .controls
        button(@click="deleteSelectedShape" :disabled="!selectedId") Delete
        button(@click="undo" :disabled="historyIndex <= 0") Undo
        button(@click="redo" :disabled="historyIndex >= history.length - 1") Redo
        button(@click="bringForward" :disabled="!selectedId") Bring ↗
        button(@click="sendBackward" :disabled="!selectedId") ↙ Send Back
        button(@click="clearCanvas") Clear
        button(@click="exportJSON") Export JSON
        button(@click="togglePreview") {{ showPreview ? "Hide" : "Show" }} JSON
        button(@click="showExportedImage = !showExportedImage") {{ showExportedImage ? "Hide Image" : "Show Image" }}
      transition(name="fade-slide")
        .text-input-wrapper(
          v-if="showNewTextInput"
          :style="{ position: 'absolute', left: newTextInputPos.left + 'px', top: newTextInputPos.top + 'px', zIndex: 2001, minWidth: '100px', cursor: textInputMode === 'drag' ? 'grabbing' : 'default' }"
          @mousedown="startDragTextInput"
        )
          input(
            ref="textInput"
            v-model="newTextValue"
            class="canvas-text-edit"
            :style="{ fontSize: newTextFontSize + 'px', border: '1.5px solid #c1c6d7', background: '#fff', outline: 'none', padding: '8px 16px', borderRadius: '8px', minWidth: '120px', boxShadow: '0 2px 8px #22324418', boxSizing: 'border-box', transition: 'box-shadow 0.2s' }"
            @keydown.enter.prevent="finishNewText"
          )
          .resize-grip(
            @mousedown.stop.prevent="startFontResize"
            @mousedown.prevent="startFontResize"
            title="Drag to resize font"
          )
            svg(width="14" height="14" viewBox="0 0 20 20")
              path(d="M5 15L15 5M13 15H15V13" stroke="#458aff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
          .text-delete-btn(
            @click.stop="deleteTextInput"
            :style="{ position: 'absolute', top: '-16px', right: '-22px', zIndex: 2003, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#ee5a4f', boxShadow: '0 2px 8px rgba(238, 90, 79, 0.5)', transition: 'background-color 0.2s ease, box-shadow 0.2s ease' }"
            @mouseenter="onDeleteBtnMouseEnter"
            @mouseleave="onDeleteBtnMouseLeave"
          )
            svg(width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg")
              path(d="M5 5L11 11M11 5L5 11" stroke="#fff" stroke-width="2" stroke-linecap="round")
      pre.json-preview(v-if="showPreview") {{ exported }}
      transition(name="fade")
        .export-preview-card(v-if="exportedImage && showExportedImage")
          .export-preview-header
            span Current Whiteboard as Image (PNG, base64)
            button.copy-btn(@click="copyBase64" title="Copy base64 image") 📋
          .export-preview-image-wrap
            img.export-preview-image(:src="exportedImage" alt="Whiteboard snapshot" draggable="false")
</template>

<script setup lang="ts">
import katex from "katex";
import { reactive } from "vue";
import VueKonva from "vue-konva";
import "katex/dist/katex.min.css";
import {
  ref,
  computed,
  onMounted,
  nextTick,
  onUnmounted,
  getCurrentInstance,
} from "vue";
import type { KonvaEventObject } from "konva/lib/Node";
import Konva from "konva";
const layerRef = ref<Konva.Layer | null>(null);
import "../assets/styles/whiteboard.css";
import { watch } from "vue";
import Toolbar from "./Toolbar.vue";
import { useWhiteboardState } from "../composables/useWhiteboardState";
import { usePointerDraw } from "../composables/usePointerDraw";


const props = withDefaults(
  defineProps<{
    initialWorkspaceContent?: Shape[] | { data: Shape[] };
    isTutorUpdate: boolean;
    currentPractice: string;
    trainingRoomId: string;
    hasNextPractice: boolean;
  }>(),
  {
    initialWorkspaceContent: () => ({ data: [] }),
  }
);

const rootEl = ref<HTMLElement|null>(null);

function emitToHost(name: string, detail?: any) {
  const evtName = `whiteboard:${name}`;
  const el = rootEl.value;
  if (el) {
    el.dispatchEvent(
      new CustomEvent(evtName, {
        detail,
        bubbles: true,
        composed: true,
        cancelable: false,
      })
    );
  }
  window.dispatchEvent(
    new CustomEvent(evtName, {
      detail,
      bubbles: false,
      composed: true,
      cancelable: false,
    })
  );
}

type HostEvt =
  | { type: 'user-active' | 'user-inactive' }
  | { type: 'tool-change', tool: string }
  | { type: 'selection-changed', id: string | null }
  | { type: 'shape-created', shape: Omit<Shape,'image'> }
  | { type: 'shape-updated', shape: Omit<Shape,'image'>, changed: string[] }
  | { type: 'shape-deleted', id: string }
  | { type: 'shape-moved', id: string, x: number, y: number }
  | { type: 'shape-transformed', id: string, width?: number, height?: number, rotation?: number, x?: number, y?: number }
  | { type: 'zindex-changed', id: string, zIndex: number }
  | { type: 'draw-start', tool: string, at: {x:number,y:number} }
  | { type: 'draw-progress', at: {x:number,y:number} }
  | { type: 'draw-end' }
  | { type: 'draw-commit', snapshot: { data: Omit<Shape,'image'>[] } }
  | { type: 'history-undo', snapshot: { data: Omit<Shape,'image'>[] } }
  | { type: 'history-redo', snapshot: { data: Omit<Shape,'image'>[] } }
  | { type: 'canvas-cleared' }
  | { type: 'imported', count: number }
  | { type: 'export-json', snapshot: { data: Omit<Shape,'image'>[] } };

function emitHost(payload: HostEvt) {
  emitToHost(payload.type, payload as any);
}

function shapeSnapshot(s: Shape) {
  const { image, ...rest } = s;
  return rest;
}
function boardSnapshot() { return { data: lines.value.map(shapeSnapshot) }; }

const emit = defineEmits<{
  (e: "tool-change", tool: string): void;
  (e: "update-whiteboard", payload: { data: Shape[] }): void;
  (e: "send-tutor-message", msg: any): void;
  (e: "user-active"): void;
  (e: "user-inactive"): void;
}>();

const {
  currentTool,
  lines,
  selectedId,
  showNewTextInput,
  showShapesMenu,
  showBrushMenu,
  showThicknessSlider,
  brushModes,
  brushThickness,
  isShapeActive,
  isBrushActive,
  selectionEnabled,
  toolThickness,
} = useWhiteboardState();

watch(currentTool, (t) => {
  emit('tool-change', t);
  emitHost({ type: 'tool-change', tool: t });
});

const shapesPos = ref({ top: 0, left: 0 });

function updateBrushThickness(size: number) {
  toolThickness.value[currentTool.value as ThicknessTool] = size;
}

function getPopoverPosition(
  triggerEl: HTMLElement,
  popoverWidth = 220,
  popoverHeight = 72
) {
  const rect = triggerEl.getBoundingClientRect();
  const isMobile = window.innerWidth <= 900;
  let top = 0, left = 0;
  if (isMobile) {
    top = rect.top - popoverHeight - 10;
    if (top < 8) top = rect.bottom + 10;
    left = rect.left + rect.width / 2 - popoverWidth / 2;
    left = Math.max(8, Math.min(window.innerWidth - popoverWidth - 8, left));
  } else {
    top = rect.top + rect.height / 2 - popoverHeight / 2;
    left = rect.right + 10;
    if (left + popoverWidth > window.innerWidth) {
      left = rect.left - popoverWidth - 10;
    }
  }
  return { top, left };
}

function selectShapeMode(mode: typeof currentTool.value) {
  currentTool.value = mode;
  showShapesMenu.value = false;
}

function toggleShapesMenu(e: MouseEvent) {
  if (!showShapesMenu.value) {
    if (!isShapeActive.value) currentTool.value = "straight"
    const btn = e.currentTarget as HTMLElement;
    shapesPos.value = getPopoverPosition(btn, 220, 72);
    showShapesMenu.value = true;
  } else {
    showShapesMenu.value = false;
  }
}

function getTouchPos(e: any) {
  const stage = stageRef.value?.getStage?.();
  if (!stage) return null;
  const touch = e.evt?.touches?.[0];
  if (!touch) return null;
  const rect = stage.content.getBoundingClientRect();
  return {
    x: touch.clientX - rect.left,
    y: touch.clientY - rect.top,
  };
}

function onTouchStart(e: any) {
  const pos = getTouchPos(e);
  if (!pos) return;
  e.target.getStage().setPointersPositions(e.evt);
  wbMouseDown(e);
}

function onTouchMove(e: any) {
  e.target.getStage().setPointersPositions(e.evt);
  wbMouseMove(e);
}

function onTouchEnd(e: any) {
  wbMouseUp(e);
}

function handleAgentCommand(msg: any) {
  switch (msg.action) {
    case "addImage": {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const newShape: Shape = {
          id: uid(),
          type: "image",
          author: "tutor",
          x: msg.x ?? 100,
          y: msg.y ?? 100,
          width: msg.width ?? img.width,
          height: msg.height ?? img.height,
          stroke: "",
          strokeWidth: 0,
          createdAt: new Date().toISOString(),
          zIndex: lines.value.length,
          image: img,
          src: msg.url,
          points: [],
        };
        lines.value.push(newShape);
        pushHistory();
        emitHost({ type: 'shape-created', shape: shapeSnapshot(newShape) });
      };
      img.src = msg.url;
      break;
    }
    case "move": {
      const shape = lines.value.find((s) => s.id === msg.id);
      if (shape) {
        shape.x = msg.x ?? shape.x;
        shape.y = msg.y ?? shape.y;
        lines.value = [...lines.value];
        pushHistory();
        emitHost({ type: 'shape-moved', id: shape.id, x: shape.x, y: shape.y });
      }
      break;
    }
    case "scale": {
      const shape = lines.value.find((s) => s.id === msg.id);
      if (shape) {
        shape.width = msg.width ?? shape.width;
        shape.height = msg.height ?? shape.height;
        lines.value = [...lines.value];
        pushHistory();
        emitHost({ type: 'shape-transformed', id: shape.id, width: shape.width, height: shape.height });
      }
      break;
    }
    case "rotate": {
      const s = lines.value.find((s) => s.id === msg.id);
      if (s) {
        s.rotation = msg.angle;
        lines.value = [...lines.value];
        pushHistory();
        emitHost({ type: 'shape-transformed', id: s.id, rotation: s.rotation });
      }
      break;
    }
    case "delete": {
      lines.value = lines.value.filter((s) => s.id !== msg.id);
      pushHistory();
      emitHost({ type: 'shape-deleted', id: msg.id });
      break;
    }
    default:
      break;
  }
}

interface Shape {
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
}

const imageRefs = reactive<Record<string, any>>({});
const mathInputMode = ref<"none" | "drag">("none");
const mathInputDragOffset = ref({ x: 0, y: 0 });
const mathInputPos = ref({ left: 0, top: 0 });
const thicknessOptions = [1, 2, 4, 8, 16] as const;
const justDraggedSticky = ref(false);
type BrushMode = (typeof brushModes)[number];
const ignoreStickyEditBlur = ref(false);
const stickyTextarea = ref<HTMLTextAreaElement | null>(null);
const currentBrushMode = ref<BrushMode>("pen");

const editingTextShape = ref<Shape | null>(null);
const showThicknessPopover = ref(false);
const newTextValue = ref("");
const newTextInputPos = ref({ left: 0, top: 0 });
const newTextPos = ref({ x: 0, y: 0 });
const textInput = ref<HTMLInputElement | null>(null);
const popoverPosition = ref({ top: 0, left: 0 });
const thicknessPopoverFor = ref<null | string>(null);
const stageWidth = ref(0);
const mousePos = ref<{ x: number; y: number } | null>(null);
const eraserRadius = 32;
const textInputMode = ref<"none" | "drag" | "resize">("none");
let resizeStartY = 0;
let resizeStartFont = 0;

const stageHeight = ref(window.innerHeight * 1.2);
const showExportedImage = ref(false);
const thicknessTools = [
  "pen",
  "marker",
  "straight",
  "arrow",
  "rect",
  "ellipse",
] as const;
type ThicknessTool = (typeof thicknessTools)[number];

const editingSticky = ref<Shape | null>(null);
const editingText = ref("");
const canvasColumnRef = ref<HTMLDivElement | null>(null);
const history = ref<Shape[][]>([]);
const historyIndex = ref(-1);
const exported = ref("");
const exportedImage = ref("");
const showPreview = ref(false);
const isDrawing = ref(false);

let currentShape: Shape | null = null;
let lastPoint: { x: number; y: number } | null = null;
let raf = false;
let hidePopoverTimeout: number | null = null;
const linesSorted = computed(() =>
  lines.value.slice().sort((a, b) => a.zIndex - b.zIndex)
);

let idleTimer: number | null = null;

function markActive() {
  emit('user-active');
  emitHost({ type: 'user-active' });
  scheduleInactive();
}
function scheduleInactive(delay = 1200) {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = window.setTimeout(() => {
    emit('user-inactive');
    emitHost({ type: 'user-inactive' });
  }, delay);
}

const selectedImageNode = computed<Konva.Node | null>(() => {
  if (!selectedId.value) return null;
  const wrapper = imageRefs[selectedId.value];
  if (!wrapper) return null;
  return wrapper.getNode ? wrapper.getNode() : wrapper;
});

const uid = () => "s-" + Math.random().toString(36).slice(2, 9);
function clone(shapes: Shape[]): Shape[] {
  return shapes.map((s) => ({
    id: s.id,
    type: s.type,
    author: s.author,
    points: s.points.slice(),
    x: s.x,
    y: s.y,
    width: s.width,
    height: s.height,
    stroke: s.stroke,
    strokeWidth: s.strokeWidth,
    rotation: s.rotation,
    createdAt: s.createdAt,
    zIndex: s.zIndex,
    text: s.text,
    bgColor: s.bgColor,
    fontSize: s.fontSize,
    fontFamily: s.fontFamily,
    fill: s.fill,
    image: s.image,
    src: s.src,
  }));
}

const pointer = usePointerDraw({
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
  onCommit: () => {
    pushHistory();
    emitHost({ type: 'draw-commit', snapshot: boardSnapshot() });
  },
});

function wbMouseDown(e: any) {
  const stage = stageRef.value?.getStage?.();
  const pos = stage?.getPointerPosition?.();
  if (pos) emitHost({ type: 'draw-start', tool: currentTool.value, at: pos });
  pointer.onMouseDown(e);
}
function wbMouseMove(e: any) {
  const stage = stageRef.value?.getStage?.();
  const pos = stage?.getPointerPosition?.();
  if (pos) emitHost({ type: 'draw-progress', at: pos });
  pointer.onMouseMove(e);
}
function wbMouseUp(e?: any) {
  pointer.onMouseUp();
  emitHost({ type: 'draw-end' });
}

function onImageFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new window.Image();
    img.onload = () => {
      const maxWidth = window.innerWidth * 0.9;
      const maxHeight = window.innerHeight * 0.6;
      let width = img.width;
      let height = img.height;
      if (width > maxWidth || height > maxHeight) {
        const widthRatio = maxWidth / width;
        const heightRatio = maxHeight / height;
        const ratio = Math.min(widthRatio, heightRatio);
        width = width * ratio;
        height = height * ratio;
      }
      const x = stageRef.value?.getStage()?.width()
        ? stageRef.value.getStage().width() / 2 - width / 2
        : 100;
      const y = stageRef.value?.getStage()?.height()
        ? stageRef.value.getStage().height() / 2 - height / 2
        : 100;
      const newShape: Shape = {
        id: uid(),
        type: "image",
        author: "user",
        x,
        y,
        width,
        height,
        stroke: "",
        strokeWidth: 0,
        createdAt: new Date().toISOString(),
        zIndex: 0,
        image: img,
        src: e.target?.result as string,
        points: [],
      };
      lines.value.unshift(newShape);
      lines.value.forEach((s, idx) => (s.zIndex = idx));
      pushHistory();
      emitHost({ type: 'shape-created', shape: shapeSnapshot(newShape) });
    };
    img.onerror = () => {
      alert("Could not load image file.");
    };
    img.src = e.target?.result as string;
  };
  reader.readAsDataURL(file);
}

function onImageTransformEnd(e: KonvaEventObject<Event>) {
  const node = e.target;
  const shape = lines.value.find((s) => s.id === selectedId.value);
  if (shape && shape.type === "image") {
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    shape.width = node.width() * scaleX;
    shape.height = node.height() * scaleY;
    node.scaleX(1);
    node.scaleY(1);
    shape.x = node.x();
    shape.y = node.y();
    lines.value = [...lines.value];
    pushHistory();
    emitHost({ type: 'shape-transformed', id: shape.id, width: shape.width!, height: shape.height!, x: shape.x, y: shape.y });
  }
}

function deleteSelectedShape() {
  if (!selectedId.value) return;
  const id = selectedId.value;
  lines.value = lines.value.filter((s) => s.id !== id);
  selectedId.value = null;
  pushHistory();
  emitHost({ type: 'shape-deleted', id });
}

function onDeleteBtnMouseEnter(event: MouseEvent) {
  const el = event.currentTarget as HTMLElement | null;
  if (el) {
    el.style.backgroundColor = "#ff796e";
    el.style.boxShadow = "0 4px 12px rgba(255, 121, 110, 0.7)";
  }
}

function onDeleteBtnMouseLeave(event: MouseEvent) {
  const el = event.currentTarget as HTMLElement | null;
  if (el) {
    el.style.backgroundColor = "#ee5a4f";
    el.style.boxShadow = "0 2px 8px rgba(238, 90, 79, 0.5)";
  }
}

function handleStickyClick(shape: Shape, e: any) {
  selectedId.value = shape.id;
  emitHost({ type: 'selection-changed', id: shape.id });
  editSticky(shape);
  if (e && e.evt) e.evt.stopPropagation();
}

let deletingSticky = false;
async function deleteSticky(id: string) {
  deletingSticky = true;
  if (!id) return;
  if (editingSticky.value && editingSticky.value.id === id) {
    editingSticky.value = null;
    editingText.value = "";
    await nextTick();
  }
  if (selectedId.value === id) selectedId.value = null;
  lines.value = lines.value.filter((shape) => shape.id !== id);
  pushHistory();
  emitHost({ type: 'shape-deleted', id });
}

function deleteTextInput() {
  if (editingTextShape.value) {
    const id = editingTextShape.value.id;
    lines.value = lines.value.filter(
      (s) => s.id !== editingTextShape.value?.id
    );
    editingTextShape.value = null;
    emitHost({ type: 'shape-deleted', id });
  }
  showNewTextInput.value = false;
  newTextValue.value = "";
  newTextFontSize.value = 26;
  pushHistory();
}

function onImageDrag(shape: Shape, e: KonvaEventObject<DragEvent>) {
  const { x, y } = e.target.position();
  shape.x = x;
  shape.y = y;
  lines.value = [...lines.value];
  pushHistory();
  emitHost({ type: 'shape-moved', id: shape.id, x, y });
}

function startDragMathInput(e: MouseEvent) {
  mathInputMode.value = "drag";
  mathInputDragOffset.value = {
    x: e.clientX - mathInputPos.value.left,
    y: e.clientY - mathInputPos.value.top,
  };
  window.addEventListener("mousemove", dragMathInput);
  window.addEventListener("mouseup", stopDragMathInput);
}

function dragMathInput(e: MouseEvent) {
  if (mathInputMode.value !== "drag") return;
  mathInputPos.value = {
    left: e.clientX - mathInputDragOffset.value.x,
    top: e.clientY - mathInputDragOffset.value.y,
  };
}

function stopDragMathInput() {
  if (mathInputMode.value === "drag") {
    mathInputMode.value = "none";
    window.removeEventListener("mousemove", dragMathInput);
    window.removeEventListener("mouseup", stopDragMathInput);
  }
}

function startDragSticky(e: MouseEvent) {
  if (!editingSticky.value) return;
  stickyDragOffset.value = {
    x: e.clientX - editingStickyPos.value.left,
    y: e.clientY - editingStickyPos.value.top,
  };
  window.addEventListener("mousemove", dragSticky);
  window.addEventListener("mouseup", stopDragSticky);
}

function dragSticky(e: MouseEvent) {
  if (!editingSticky.value) return;
  const newLeft = e.clientX - stickyDragOffset.value.x;
  const newTop = e.clientY - stickyDragOffset.value.y;
  editingStickyPos.value = { left: newLeft, top: newTop };
  const colRect = canvasColumnRef.value!.getBoundingClientRect();
  const stageNode = stageRef.value!.getStage!().container();
  const stageRect = stageNode.getBoundingClientRect();
  const scroll = canvasScrollWrapper.value!;
  editingSticky.value.x =
    newLeft - (stageRect.left - colRect.left) + scroll.scrollLeft;
  editingSticky.value.y =
    newTop - (stageRect.top - colRect.top) + scroll.scrollTop;
  lines.value = [...lines.value];
}

function stopDragSticky() {
  window.removeEventListener("mousemove", dragSticky);
  window.removeEventListener("mouseup", stopDragSticky);
  pushHistory();
}

function createSticky() {
  currentTool.value = "sticky";
  const scroll = canvasScrollWrapper.value!;
  const containerRect = canvasColumnRef.value!.getBoundingClientRect();
  const center = {
    x: scroll.scrollLeft + containerRect.width / 2,
    y: scroll.scrollTop + containerRect.height / 2,
  };
  const shape: Shape = {
    id: uid(),
    type: "sticky",
    author: "user",
    points: [center.x, center.y],
    x: center.x,
    y: center.y,
    width: 240,
    height: 160,
    fontSize: 18,
    stroke: "#45a9ff",
    strokeWidth: 2,
    bgColor: "#e7f4ff",
    createdAt: new Date().toISOString(),
    zIndex: lines.value.length,
    text: "Type…",
  };
  lines.value.push(shape);
  pushHistory();
  emitHost({ type: 'shape-created', shape: shapeSnapshot(shape) });
  editSticky(shape);
}

function handleBrushButtonClick(e: MouseEvent) {
  if (!(currentTool.value === "pen" || currentTool.value === "marker")) {
    currentTool.value = "pen";
  }
  if (!showBrushMenu.value) {
    const btn = e.currentTarget as HTMLElement;
    popoverPosition.value = getPopoverPosition(btn, 220, 110);
    showBrushMenu.value = true;
  } else {
    showBrushMenu.value = false;
  }
}

function startFontResize(e: MouseEvent) {
  if (textInputMode.value === "drag") return;
  e.stopPropagation();
  textInputMode.value = "resize";
  resizeStartY = e.clientY;
  resizeStartFont = newTextFontSize.value;
  window.addEventListener("mousemove", fontResizeMove);
  window.addEventListener("mouseup", stopFontResize);
}

function fontResizeMove(e: MouseEvent) {
  if (textInputMode.value !== "resize") return;
  let delta = e.clientY - resizeStartY;
  let nextFont = resizeStartFont + delta / 4;
  nextFont = Math.max(10, Math.min(nextFont, 200));
  newTextFontSize.value = nextFont;
}

function stopFontResize() {
  if (textInputMode.value === "resize") {
    textInputMode.value = "none";
    window.removeEventListener("mousemove", fontResizeMove);
    window.removeEventListener("mouseup", stopFontResize);
  }
}

const editingStickyPos = ref({ left: 0, top: 0 });
const dragOffset = ref({ x: 0, y: 0 });

function startDragTextInput(e: MouseEvent) {
  if (
    (e.target as HTMLElement).classList.contains("resize-grip") ||
    textInputMode.value === "resize"
  )
    return;
  textInputMode.value = "drag";
  dragOffset.value = {
    x: e.clientX - newTextInputPos.value.left,
    y: e.clientY - newTextInputPos.value.top,
  };
  window.addEventListener("mousemove", dragTextInput);
  window.addEventListener("mouseup", stopDragTextInput);
}

function dragTextInput(e: MouseEvent) {
  if (textInputMode.value !== "drag") return;
  newTextInputPos.value = {
    left: e.clientX - dragOffset.value.x,
    top: e.clientY - dragOffset.value.y,
  };
}

function stopDragTextInput() {
  if (textInputMode.value === "drag") {
    textInputMode.value = "none";
    window.removeEventListener("mousemove", dragTextInput);
    window.removeEventListener("mouseup", stopDragTextInput);
  }
}

function editSticky(shape: Shape) {
  editingSticky.value = shape;
  editingText.value = shape.text || "";
  const scroll = canvasScrollWrapper.value!;
  editingStickyPos.value = {
    left: shape.x - scroll.scrollLeft,
    top: shape.y - scroll.scrollTop,
  };
  nextTick(() => {
    stickyTextarea.value?.focus();
    stickyTextarea.value?.select();
  });
}

const canvasScrollWrapper = ref<HTMLDivElement | null>(null);

function handleScroll() {
  if (!canvasScrollWrapper.value) return;
  const { scrollTop, clientHeight, scrollHeight, scrollLeft } =
    canvasScrollWrapper.value;
  if (editingSticky.value) {
    editingStickyPos.value = {
      left: editingSticky.value.x - scrollLeft,
      top: editingSticky.value.y - scrollTop,
    };
  }
  if (scrollTop + clientHeight > scrollHeight - 200) {
    stageHeight.value += 500;
  }
}

function saveStickyEdit() {
  if (deletingSticky) {
    deletingSticky = false;
    return;
  }
  if (ignoreStickyEditBlur.value) {
    ignoreStickyEditBlur.value = false;
    return;
  }
  if (editingSticky.value) {
    editingSticky.value.text = editingText.value;
    lines.value = [...lines.value];
    editingSticky.value = null;
    editingText.value = "";
    pushHistory();
  }
}
function cancelStickyEdit() {
  editingSticky.value = null;
  editingText.value = "";
}

async function editTextShape(shape: Shape) {
  const column = canvasColumnRef.value;
  const stageNode =
    stageRef.value?.$el || stageRef.value?.getStage?.()?.container();
  let columnRect = { left: 0, top: 0 };
  let stageRect = { left: 0, top: 0 };
  if (column) columnRect = column.getBoundingClientRect();
  if (stageNode && stageNode.getBoundingClientRect)
    stageRect = stageNode.getBoundingClientRect();
  if (shape.type === "mixed") {
    newTextValue.value = (shape as any).rawText || "";
    newTextFontSize.value = (shape as any).fontSize || 26;
  } else {
    newTextValue.value = shape.text || "";
    newTextFontSize.value = shape.fontSize || 26;
  }
  editingTextShape.value = shape;
  newTextPos.value = { x: shape.x, y: shape.y };
  await nextTick();
  columnRect = column?.getBoundingClientRect() ?? columnRect;
  stageRect =
    stageNode && stageNode.getBoundingClientRect
      ? stageNode.getBoundingClientRect()
      : stageRect;
  newTextInputPos.value = {
    left: stageRect.left - columnRect.left + shape.x,
    top: stageRect.top - columnRect.top + shape.y,
  };
  showNewTextInput.value = true;
  await nextTick();
  textInput.value?.focus();
}

function onLineDrag(shape: any, e: any) {
  const { x, y } = e.target.position();
  shape.x = x;
  shape.y = y;
  lines.value = [...lines.value];
  pushHistory();
  emitHost({ type: 'shape-moved', id: shape.id, x, y });
}

function onStickyDrag(shape: Shape, e: KonvaEventObject<DragEvent>) {
  const { x, y } = e.target.position();
  shape.x = x;
  shape.y = y;
  lines.value = [...lines.value];
  selectedId.value = shape.id;
  pushHistory();
  emitHost({ type: 'shape-moved', id: shape.id, x, y });
  justDraggedSticky.value = true;
  setTimeout(() => {
    justDraggedSticky.value = false;
  }, 300);
}

function copyBase64() {
  if (exportedImage.value) {
    navigator.clipboard.writeText(exportedImage.value);
  }
}

function handlePopoverEnter() {
  if (hidePopoverTimeout) {
    clearTimeout(hidePopoverTimeout);
    hidePopoverTimeout = null;
  }
  showThicknessPopover.value = true;
}
function handlePopoverLeave() {
  showThicknessPopover.value = false;
  thicknessPopoverFor.value = null;
}

function snapshotShape(s: Shape) {
  if (!s) return null;
  const { image, ...rest } = s;
  return rest;
}
function snapshotAll() {
  return { data: lines.value.map(snapshotShape) };
}

function pushHistory() {
  history.value.splice(historyIndex.value + 1);
  history.value.push(clone(lines.value));
  historyIndex.value = history.value.length - 1;
  updateExported();
  markActive();
  const payload = { data: clone(lines.value) };
  emit("update-whiteboard", payload);
  emitToHost("update-whiteboard", payload);
}

type MixedPart = {
  type: "text" | "inline-math" | "display-math";
  content: string;
};

function parseMixedText(input: string): MixedPart[] {
  const pattern = /\\\((.+?)\\\)|\\\[(.+?)\\\]/g;
  const parts: MixedPart[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(input)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: "text",
        content: input.slice(lastIndex, match.index),
      });
    }
    if (match[1]) {
      parts.push({ type: "inline-math", content: match[1] });
    } else if (match[2]) {
      parts.push({ type: "display-math", content: match[2] });
    }
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < input.length) {
    parts.push({ type: "text", content: input.slice(lastIndex) });
  }
  return parts;
}

function measureTextWidth(
  text: string,
  fontSize: number,
  fontFamily = "Arial"
) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  ctx.font = `${fontSize}px ${fontFamily}`;
  return ctx.measureText(text).width;
}

function getTextMetrics(fontSize: number, fontFamily = "Arial") {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  ctx.font = `${fontSize}px ${fontFamily}`;
  const m = ctx.measureText("Mg");
  const ascent = m.actualBoundingBoxAscent ?? fontSize * 0.75;
  const descent = m.actualBoundingBoxDescent ?? fontSize * 0.25;
  const lineHeight = ascent + descent;
  return { ascent, descent, lineHeight };
}

function renderMathSegment(
  formula: string,
  displayMode: boolean
): Promise<{ image: HTMLImageElement; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const html = katex.renderToString(formula, {
      throwOnError: false,
      displayMode,
    });
    const span = document.createElement("span");
    span.innerHTML = html;
    Object.assign(span.style, {
      position: "absolute",
      visibility: "hidden",
      fontSize: "22px",
      fontFamily: "KaTeX_Main, 'Times New Roman', Times, serif",
      display: "inline-block",
      whiteSpace: "nowrap",
    } as CSSStyleDeclaration);
    document.body.appendChild(span);
    requestAnimationFrame(() => {
      const padding = displayMode ? 32 : 8;
      const w = span.offsetWidth + padding * 2;
      const h = span.offsetHeight + padding * 2;
      const katexMathML = span.querySelector(".katex-mathml")?.outerHTML || "";
      document.body.removeChild(span);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><foreignObject width="${w}" height="${h}"><div xmlns="http://www.w3.org/1999/xhtml" style="display:flex;align-items:center;justify-content:center;font-size:22px;width:${w}px;height:${h}px;padding:${padding}px;box-sizing:border-box;">${katexMathML}</div></foreignObject></svg>`;
      const img = new Image();
      const url = URL.createObjectURL(
        new Blob([svg], { type: "image/svg+xml" })
      );
      img.onload = () => {
        resolve({ image: img, width: img.width, height: img.height });
        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        reject(new Error("Failed to render math segment"));
        URL.revokeObjectURL(url);
      };
      img.src = url;
    });
  });
}

const newTextFontSize = ref(26);
const stickyDragOffset = ref({ x: 0, y: 0 });

async function finishNewText() {
  if (!newTextValue.value.trim()) {
    showNewTextInput.value = false;
    editingTextShape.value = null;
    newTextValue.value = "";
    newTextFontSize.value = 26;
    return;
  }
  const colRect = canvasColumnRef.value!.getBoundingClientRect();
  const stageNode =
    stageRef.value?.$el || stageRef.value?.getStage?.()?.container();
  const stageRect = (stageNode as HTMLElement)!.getBoundingClientRect();
  const baseX = newTextInputPos.value.left - (stageRect.left - colRect.left);
  const baseY = newTextInputPos.value.top - (stageRect.top - colRect.top);
  const raw = newTextValue.value;
  const parts = parseMixedText(raw);
  const fontSize = newTextFontSize.value;
  const { ascent, lineHeight } = getTextMetrics(fontSize, "Arial");
  const baselineOffset = ascent;
  let cursorX = 0;
  const children: any[] = [];
  for (const part of parts) {
    if (part.type === "text") {
      if (!part.content) continue;
      const w = measureTextWidth(part.content, fontSize, "Arial");
      const h = lineHeight;
      children.push({
        kind: "text",
        content: part.content,
        width: w,
        height: h,
        offsetX: cursorX,
        offsetY: 0,
        fontSize,
        fill: "#111",
      });
      cursorX += w;
    } else if (part.type === "inline-math" || part.type === "display-math") {
      try {
        const { image, width, height } = await renderMathSegment(
          part.content,
          part.type === "display-math"
        );
        const mathOffsetY = baselineOffset - height / 2;
        children.push({
          kind: "math",
          image,
          width,
          height,
          offsetX: cursorX,
          offsetY: mathOffsetY,
        });
        cursorX += width;
      } catch {
        const fallback = part.content;
        const w = measureTextWidth(fallback, fontSize, "Arial");
        const h = lineHeight;
        children.push({
          kind: "text",
          content: fallback,
          width: w,
          height: h,
          offsetX: cursorX,
          offsetY: 0,
          fontSize,
          fill: "#111",
        });
        cursorX += w;
      }
    }
  }
  let groupHeight = lineHeight;
  for (const c of children) {
    const bottom = c.offsetY + c.height;
    groupHeight = Math.max(groupHeight, bottom);
  }
  const isEditing = !!editingTextShape.value;
  if (isEditing) {
    const existing = editingTextShape.value!;
    if (
      existing.type === "text" &&
      parts.length === 1 &&
      parts[0].type === "text"
    ) {
      const updated = {
        ...existing,
        text: raw,
        fontSize,
        x: baseX,
        y: baseY,
      };
      lines.value = lines.value.map((s) =>
        s.id === existing.id ? updated : s
      );
      emitHost({ type: 'shape-updated', shape: shapeSnapshot(updated), changed: ['text','fontSize','x','y'] });
    } else {
      const mixedShape: any = {
        id: existing.id,
        type: "mixed" as const,
        author: existing.author,
        x: baseX,
        y: baseY,
        points: [],
        width: cursorX,
        height: groupHeight,
        stroke: existing.stroke || "",
        strokeWidth: existing.strokeWidth || 0,
        createdAt: existing.createdAt,
        zIndex: existing.zIndex,
        rawText: raw,
        fontSize,
        groupId: (existing as any).groupId || existing.id,
        children,
      };
      lines.value = lines.value.map((s) =>
        s.id === existing.id ? mixedShape : s
      );
      emitHost({ type: 'shape-updated', shape: shapeSnapshot(mixedShape), changed: ['rawText','fontSize','x','y','children','type','width','height'] });
    }
  } else {
    const mixedShape: any = {
      id: uid(),
      type: "mixed" as const,
      author: "user",
      x: baseX,
      y: baseY,
      points: [],
      width: cursorX,
      height: groupHeight,
      stroke: "",
      strokeWidth: 0,
      createdAt: new Date().toISOString(),
      zIndex: lines.value.length,
      rawText: raw,
      fontSize,
      groupId: uid(),
      children,
    };
    lines.value.push(mixedShape);
    emitHost({ type: 'shape-created', shape: shapeSnapshot(mixedShape) });
  }
  pushHistory();
  showNewTextInput.value = false;
  editingTextShape.value = null;
  newTextValue.value = "";
  newTextFontSize.value = 26;
}

function setTool(t: string) {
  if (t === "brush") {
    showBrushMenu.value = !showBrushMenu.value;
    if (!currentBrushMode.value) currentBrushMode.value = brushModes[0];
  } else {
    currentTool.value = t as any;
    showBrushMenu.value = false;
  }
}

function selectBrushMode(mode: BrushMode) {
  currentTool.value = mode;
  showBrushMenu.value = false;
  showThicknessSlider.value = false;
}

const stageRef = ref();

function onDragEnd(shape: Shape, e: KonvaEventObject<DragEvent>) {
  const { x: cx, y: cy } = e.target.position();
  if (shape.type === "ellipse") {
    shape.x = cx - (shape.width || 0) / 2;
    shape.y = cy - (shape.height || 0) / 2;
  } else {
    shape.x = cx;
    shape.y = cy;
  }
  if (shape.type === "straight" || shape.type === "arrow") {
    const dx = cx - shape.points[0];
    const dy = cy - shape.points[1];
    shape.points = [
      shape.points[0] + dx,
      shape.points[1] + dy,
      shape.points[2] + dx,
      shape.points[3] + dy,
    ];
  }
  selectedId.value = shape.id;
  lines.value = [...lines.value];
  pushHistory();
  emitHost({ type: 'shape-moved', id: shape.id, x: shape.x, y: shape.y });
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
  const dx = x2 - x1, dy = y2 - y1;
  const fx = x1 - cx, fy = y1 - cy;
  const a = dx * dx + dy * dy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - r * r;
  let discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return false;
  discriminant = Math.sqrt(discriminant);
  const t1 = (-b - discriminant) / (2 * a);
  const t2 = (-b + discriminant) / (2 * a);
  if ((t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1)) return true;
  if (Math.hypot(x1 - cx, y1 - cy) < r || Math.hypot(x2 - cx, y2 - cy) < r)
    return true;
  return false;
}

function onStageClick(e: KonvaEventObject<MouseEvent>) {
  const stage = e.target.getStage();
  if (showNewTextInput.value && e.target === stage) {
    if (newTextValue.value.trim()) {
      finishNewText();
    } else {
      showNewTextInput.value = false;
      editingTextShape.value = null;
      newTextValue.value = "";
      newTextFontSize.value = 26;
    }
    return;
  }
  if (e.target === stage) {
    selectedId.value = null;
    emitHost({ type: 'selection-changed', id: null });
  }
}

function activateTextInput() {
  if (!showNewTextInput.value) {
    currentTool.value = "text";
    newTextValue.value = "";
    newTextFontSize.value = 26;
    const col = canvasColumnRef.value!;
    const rect = col.getBoundingClientRect();
    newTextInputPos.value = {
      left: rect.width / 2 - 60,
      top: rect.height / 2 - 12,
    };
    newTextPos.value = {
      x: (stageRef.value!.getStage()!.width() || rect.width) / 2,
      y: (stageRef.value!.getStage()!.height() || rect.height) / 2,
    };
    showNewTextInput.value = true;
    nextTick(() => textInput.value?.focus());
  }
}

function selectShape(id: string, e: KonvaEventObject<MouseEvent>) {
  e.evt.stopPropagation();
  selectedId.value = id;
  emitHost({ type: 'selection-changed', id });
}
function onMixedDragEnd(shape: Shape, e: KonvaEventObject<DragEvent>) {
  const { x, y } = e.target.position();
  shape.x = x;
  shape.y = y;
  lines.value = [...lines.value];
  selectedId.value = shape.id;
  pushHistory();
  emitHost({ type: 'shape-moved', id: shape.id, x, y });
}

function undo() {
  if (historyIndex.value > 0) {
    historyIndex.value--;
    lines.value = clone(history.value[historyIndex.value]);
    updateExported();
    emitHost({ type: 'history-undo', snapshot: boardSnapshot() });
  }
}
function redo() {
  if (historyIndex.value < history.value.length - 1) {
    historyIndex.value++;
    lines.value = clone(history.value[historyIndex.value]);
    updateExported();
    emitHost({ type: 'history-redo', snapshot: boardSnapshot() });
  }
}
function bringForward() {
  if (!selectedId.value) return;
  const i = lines.value.findIndex((s) => s.id === selectedId.value);
  if (i < 0 || i === lines.value.length - 1) return;
  const [it] = lines.value.splice(i, 1);
  lines.value.splice(i + 1, 0, it);
  lines.value.forEach((s, idx) => (s.zIndex = idx));
  lines.value = [...lines.value];
  updateExported();
  emitHost({ type: 'zindex-changed', id: it.id, zIndex: it.zIndex! });
}

function sendBackward() {
  if (!selectedId.value) return;
  const i = lines.value.findIndex((s) => s.id === selectedId.value);
  if (i <= 0) return;
  const [it] = lines.value.splice(i, 1);
  lines.value.splice(i - 1, 0, it);
  lines.value.forEach((s, idx) => (s.zIndex = idx));
  lines.value = [...lines.value];
  updateExported();
  emitHost({ type: 'zindex-changed', id: it.id, zIndex: it.zIndex! });
}
function clearCanvas() {
  lines.value = [];
  pushHistory();
  exported.value = "";
  showNewTextInput.value = false;
  editingTextShape.value = null;
  stageHeight.value = window.innerHeight * 1.2;
  newTextValue.value = "";
  emitHost({ type: 'canvas-cleared' });
}

function exportJSON() {
  exported.value = JSON.stringify(
    { message: "Whiteboard fetched successfully", data: lines.value },
    null,
    2
  );
  emitHost({ type: 'export-json', snapshot: boardSnapshot() });
}
function togglePreview() {
  showPreview.value = !showPreview.value;
}

async function updateExported() {
  exported.value = JSON.stringify(
    { message: "Whiteboard fetched successfully", data: lines.value },
    null,
    2
  );
  await nextTick();
  const stage = stageRef.value?.getStage?.();
  if (!stage || stage.width() === 0 || stage.height() === 0) {
    return;
  }
  try {
    exportedImage.value = stage.toDataURL({ pixelRatio: 1.5 });
  } catch (err) {
  }
}

function updateStageWidth() {
  const parent = canvasColumnRef.value;
  if (parent) {
    stageWidth.value = parent.clientWidth;
  }
}

function importFromJSON(json?: { data: Shape[] } | Shape[]) {
  if (!json) {
    lines.value = [];
    history.value = [];
    historyIndex.value = -1;
    pushHistory();
    emitHost({ type: 'imported', count: lines.value.length });
    return;
  }
  const arr = Array.isArray(json) ? json : json.data ?? [];
  lines.value = [...arr];
  history.value = [];
  historyIndex.value = -1;
  pushHistory();
  emitHost({ type: 'imported', count: lines.value.length });
}
onMounted(async () => {
  importFromJSON(props.initialWorkspaceContent);
  updateStageWidth();
  await nextTick();
  updateExported();
  window.addEventListener("resize", () => {
    updateStageWidth();
    updateExported();
  });
});

watch(
  () => props.isTutorUpdate,
  (val) => {
    if (val) importFromJSON(props.initialWorkspaceContent);
  }
);

onUnmounted(() => {
  window.removeEventListener("resize", updateStageWidth);
  if (idleTimer) clearTimeout(idleTimer);
});

pushHistory();

watch(
  () => lines.value.map((s) => s.id),
  (ids) => {
    Object.keys(imageRefs).forEach((id) => {
      if (!ids.includes(id)) delete imageRefs[id];
    });
  }
);

defineExpose({
  receiveSocketMessage(msg: any) {
    handleAgentCommand(msg);
  },
  getCurrentJSON() {
    return { data: JSON.parse(JSON.stringify(lines.value)) };
  },
  async getExportedImage() {
    await nextTick();
    const stage = stageRef.value?.getStage?.();
    return stage ? stage.toDataURL({ pixelRatio: 1.5 }) : null;
  },
  importFromJSON,
  addImageFromURL(
    url: string,
    x = 100,
    y = 100,
    width?: number,
    height?: number
  ) {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const shape: Shape = {
        id: uid(),
        type: "image",
        author: "user",
        x,
        y,
        width: width ?? img.width,
        height: height ?? img.height,
        stroke: "",
        strokeWidth: 0,
        createdAt: new Date().toISOString(),
        zIndex: lines.value.length,
        image: img,
        src: url,
        points: [],
      };
      lines.value.push(shape);
      pushHistory();
      emitHost({ type: 'shape-created', shape: shapeSnapshot(shape) });
    };
    img.onerror = () => {
      alert("Failed to load image: " + url);
    };
    img.src = url;
  },
});
</script>
