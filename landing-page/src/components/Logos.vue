<script setup>
const L = [
 {n:'OpenAI',c:'text-2xl font-medium',i:'<g fill="none" stroke="currentColor" stroke-width="1.5"><rect x="7.500" y="2.500" width="9" height="19" rx="4.500"/><rect x="7.500" y="2.500" width="9" height="19" rx="4.500" transform="rotate(60 12 12)"/><rect x="7.500" y="2.500" width="9" height="19" rx="4.500" transform="rotate(120 12 12)"/></g>'},
 {n:'Retool',c:'text-2xl font-bold',i:'<rect x="3" y="3" width="18" height="6" rx="2" fill="currentColor"/><rect x="3" y="11" width="10" height="4" rx="2" fill="currentColor"/><rect x="11" y="17" width="10" height="4" rx="2" fill="currentColor"/>'},
 {n:'CardNova',c:'text-2xl font-bold tracking-tight',i:'<g fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M2.5 9.5h19" stroke-linecap="round"/><path d="M6 15h4" stroke-linecap="round"/></g><path d="M17.2 11.2l.9 1.9 2.1.3-1.5 1.5.4 2.1-1.9-1-1.9 1 .4-2.1-1.5-1.5 2.1-.3z" fill="currentColor"/>'},
 {n:'WISE',c:'text-3xl font-black italic tracking-tighter',i:''},
 {n:'loom',c:'text-3xl font-medium',i:'<g stroke="currentColor" stroke-width="2.200" stroke-linecap="round"><path d="M12 2v20M2 12h20M5 5l14 14M19 5 5 19"/></g>'},
 {n:'Medium',c:'font-serif text-3xl font-bold tracking-tight',i:'<circle cx="7" cy="12" r="5" fill="currentColor"/><ellipse cx="16" cy="12" rx="2.600" ry="5" fill="currentColor"/><rect x="21" y="7" width="1.800" height="10" fill="currentColor"/>'},
 {n:'Cash App',c:'text-2xl font-medium',i:'<rect x="2" y="2" width="20" height="20" rx="5" fill="currentColor"/><text x="12" y="17" font-size="14" font-weight="700" text-anchor="middle" style="fill:var(--bg)">$</text>'},
 {n:'Linear',c:'text-3xl font-medium',i:'<circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M3 14 10 21M2.500 10 14 21.500M5 5 19 19" stroke="var(--bg)" stroke-width="1.500" fill="none"/>'}]
</script>
<template>
  <section class="rail px-4 text-center sm:px-6">
    <p class="py-12 text-base sm:py-[72px] sm:text-lg text-[var(--muted)]">Trusted by fast-growing startups</p>
    <div class="grid grid-cols-2 overflow-hidden rounded-2xl border md:grid-cols-4 [&>a]:border-b [&>a]:border-r [&>a:nth-child(2n)]:border-r-0 md:[&>a:nth-child(2n)]:border-r md:[&>a:nth-child(4n)]:border-r-0 [&>a:nth-last-child(-n+2)]:border-b-0 md:[&>a:nth-last-child(-n+4)]:border-b-0">
      <a v-for="(l,k) in L" :key="l.n" href="#" class="group relative grid h-[110px] place-items-center sm:h-[140px]">
        <span class="flex items-center gap-2 transition-transform duration-300 group-hover:-translate-y-3" :class="l.c"><svg v-if="l.i" viewBox="0 0 24 24" class="h-8 w-8" v-html="l.i"></svg>{{ l.n }}</span>
        <span class="absolute bottom-7 flex items-center gap-2 text-sm opacity-0 transition duration-300 group-hover:opacity-100">Learn More <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span></a></div>
  </section>
</template>
