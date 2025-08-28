<template lang="pug">
.left-toolbar
  .tool-group.brush-group
    .tool-group-header Brushes
    button.tool(:class="{ active: currentTool === 'select' }" @click="$emit('setTool', 'select')" title="Select")
      span.icon 🖱️
    button.tool.brush-toggle(:class="{ active: isBrushActive }" @click="$emit('handleBrushButtonClick', $event)" title="Brush")
      span.icon 🖌️
    button.tool(:class="{ active: currentTool === 'eraser' }" @click="$emit('setTool', 'eraser')" title="Eraser")
      span.icon 🧽
  .tool-group
    .tool-group-header Shapes
    button.tool.shape-toggle(:class="{ active: showShapesMenu || isShapeActive }" @click="$emit('toggleShapesMenu', $event)" title="Shapes")
      span.icon
        svg(width="21" height="21" viewBox="0 0 25 21" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round")
          polygon(points="12 4 20 12 12 20 4 12")
    button.tool(:class="{ active: showNewTextInput }" @click="$emit('activateTextInput')" title="Text") T
    button.tool(:class="{ active: currentTool === 'sticky' }" @click="$emit('createSticky')" title="Sticky Note") 🗒️
    label.tool(:class="{ active: currentTool === 'image' }" title="Upload Image" style="cursor: pointer")
      | 🖼️
      input(type="file" accept="image/png, image/jpeg, image/svg+xml" style="display: none" @change="$emit('onImageFileChange', $event)" @click="$emit('setTool', 'image')")
  transition(name="fade")
    teleport(to="body")
      .brush-popover(v-if="showShapesMenu" :style="{ top: shapesPos.top + 'px', left: shapesPos.left + 'px' }")
        .brush-menu
          button.mode-btn(:class="{ active: currentTool === 'straight' }" @click="$emit('selectShapeMode', 'straight')" title="Line") 📏
          button.mode-btn(:class="{ active: currentTool === 'arrow' }" @click="$emit('selectShapeMode', 'arrow')" title="Arrow") 🏹
          button.mode-btn(:class="{ active: currentTool === 'rect' }" @click="$emit('selectShapeMode', 'rect')" title="Rect") ▭
          button.mode-btn(:class="{ active: currentTool === 'ellipse' }" @click="$emit('selectShapeMode', 'ellipse')" title="Oval") ◯
  transition(name="fade")
    teleport(to="body")
      .brush-popover(v-if="showBrushMenu" @mouseenter="$emit('handlePopoverEnter')" @mouseleave="$emit('handlePopoverLeave')" :style="{ top: popoverPosition.top + 'px', left: popoverPosition.left + 'px' }")
        .brush-menu
          template(v-for="mode in brushModes" :key="mode")
            button.mode-btn(:class="{ active: currentTool === mode }" @click="$emit('selectBrushMode', mode)" :title="mode")
              span.icon
                template(v-if="mode === 'pen'") 🖌️
                template(v-else) 🖊️
          button.mode-btn.thickness-icon(:class="{ active: showThicknessSlider }" @click="$emit('toggleThicknessSlider')" title="Thickness")
            span.icon ≡
        .thickness-panel(v-if="showThicknessSlider")
          .thickness-header Thickness
          input(
            type="range"
            :min="thicknessOptions[0]"
            :max="thicknessOptions[thicknessOptions.length - 1]"
            :value="brushThickness"
            @input="onThicknessChange"
          )
          .thickness-display
            .thickness-value #{brushThickness}
</template>

<script setup lang="ts">
import { defineProps, defineEmits, toRefs, computed } from "vue";
import "../assets/styles/whiteboard.css";

const props = defineProps<{
  currentTool: string;
  isBrushActive: boolean;
  showShapesMenu: boolean;
  isShapeActive: boolean;
  showNewTextInput: boolean;
  showBrushMenu: boolean;
  brushModes: readonly ("pen" | "marker")[];
  popoverPosition: { top: number; left: number };
  showThicknessSlider: boolean;
  thicknessOptions: readonly number[];
  brushThickness: number;
  shapesPos: { top: number; left: number };
}>();

const emit = defineEmits<{
  (event: "setTool", tool: string): void;
  (event: "handleBrushButtonClick", mouseEvent: MouseEvent): void;
  (event: "selectBrushMode", mode: string): void;
  (event: "updateBrushThickness", size: number): void;
  (event: "toggleShapesMenu", mouseEvent: MouseEvent): void;
  (event: "selectShapeMode", mode: string): void;
  (event: "activateTextInput"): void;
  (event: "toggleThicknessSlider"): void;
  (event: "createSticky"): void;
  (event: "onImageFileChange", fileEvent: Event): void;
  (event: "handlePopoverEnter"): void;
  (event: "handlePopoverLeave"): void;
}>();


function onThicknessChange(e: Event) {
  const val = Number((e.target as HTMLInputElement).value);
  emit("updateBrushThickness", val);
}
</script>

