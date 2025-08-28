<template>
  <div class="app">
    <WhiteboardCanvas />
  </div>
</template>

<script setup>
import WhiteboardCanvas from './components/WhiteboardCanvas.vue'
</script>

<style>
html, body, #app {
  margin: 0;
  padding: 0;
  height: 100%;
}
.app {
  width: 100%;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #f4f4f4;
}
</style>
