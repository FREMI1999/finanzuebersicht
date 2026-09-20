<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const appVersion = import.meta.env.VITE_APP_VERSION || 'dev'

const route = useRoute()

const sidebarOpen = ref(false)

const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value
}

const closeSidebar = () => {
  sidebarOpen.value = false
}

/*
 * Auf dem Handy Sidebar automatisch schließen,
 * wenn auf eine andere Seite navigiert wurde.
 */
watch(
  () => route.path,
  () => {
    sidebarOpen.value = false
  }
)
</script>

<template>
  <div class="app-layout">

    <!-- Mobile Overlay -->
    <div
      v-if="sidebarOpen"
      class="sidebar-overlay"
      @click="closeSidebar"
    />

    <!-- Mobile Button -->
    <button
      class="sidebar-toggle"
      type="button"
      aria-label="Navigation öffnen"
      @click="toggleSidebar"
    >
      <span />
      <span />
      <span />
    </button>

    <!-- Sidebar -->
    <aside
      :class="[
        'sidebar',
        {
          'sidebar-open': sidebarOpen
        }
      ]"
    >
      <!-- Logo / Titel -->
      <div class="sidebar-header">
        <div class="sidebar-logo">
          €
        </div>

        <div>
          <div class="sidebar-title">
            Finanzen
          </div>

          <div class="sidebar-subtitle">
            Finanzübersicht
          </div>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="sidebar-navigation">

        <NuxtLink
          to="/dashboard"
          class="sidebar-link"
          active-class="sidebar-link-active"
          @click="closeSidebar"
        >
          <span class="sidebar-icon">
            ▦
          </span>

          <span>
            Dashboard
          </span>
        </NuxtLink>

        <NuxtLink
          to="/eintragen"
          class="sidebar-link"
          active-class="sidebar-link-active"
          @click="closeSidebar"
        >
          <span class="sidebar-icon">
            ✎
          </span>

          <span>
            Daten eintragen
          </span>
        </NuxtLink>

      </nav>

      <!-- Footer -->
      <div class="sidebar-footer">
        <span>
          Finanzübersicht
        </span>

        <span>
          {{ appVersion }}
        </span>
      </div>
    </aside>

    <!-- Hauptinhalt -->
    <main class="app-content">
      <slot />
    </main>

  </div>
</template>