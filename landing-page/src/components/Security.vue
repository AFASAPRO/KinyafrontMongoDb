<script setup>import Globe from './Globe.vue'</script>
<template>
  <section class="rail px-4 py-16 text-center sm:px-6 md:py-24">
    <h2 v-reveal class="text-4xl font-medium md:text-5xl">Built for Secure Growth</h2>
    <p class="mx-auto mt-4 max-w-md text-[var(--muted)]">Where advanced security meets seamless scalability—designed to protect your data and empower your growth.</p>
    <div class="mt-14 grid overflow-hidden rounded-2xl border md:grid-cols-2">
      <article class="flex flex-col border-b p-6 text-left sm:p-8 md:border-b-0 md:border-r"><div class="flex flex-1 items-center justify-center py-6"><svg viewBox="0 0 100 120" class="h-52 drop-shadow-2xl"><path d="M50 4 94 22v36c0 30-20 48-44 58C26 106 6 88 6 58V22Z" fill="var(--bg2)" stroke="var(--line)"/><rect x="36" y="52" width="28" height="22" rx="4" fill="var(--line)"/><path d="M41 52v-6a9 9 0 0 1 18 0v6" fill="none" stroke="var(--line)" stroke-width="4"/></svg></div>
        <div><h3 class="text-xl font-semibold">Advanced Task Security</h3><p class="mt-1 text-[var(--muted)]">Safeguard your tasks with state-of-art encryption and secure access to your workflow data.</p></div></article>
      <article class="flex flex-col p-6 text-left sm:p-8"><div class="flex flex-1 items-center justify-center py-2"><Globe /></div>
        <div class="mt-6"><h3 class="text-xl font-semibold">Scalable for Teams</h3><p class="mt-1 text-[var(--muted)]">Grow with your team. Track tasks across multiple workspaces and all team members.</p></div></article>
    </div>
  </section>
</template>
