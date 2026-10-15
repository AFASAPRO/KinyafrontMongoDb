<script setup>
import Navbar from './components/Navbar.vue'
import Hero from './components/Hero.vue'
import Logos from './components/Logos.vue'
import Bento from './components/Bento.vue'
import Quote from './components/Quote.vue'
import Steps from './components/Steps.vue'
import Security from './components/Security.vue'
import Pricing from './components/Pricing.vue'
import Testimonials from './components/Testimonials.vue'
import Faq from './components/Faq.vue'
import Cta from './components/Cta.vue'
import Footer from './components/Footer.vue'
</script>
<template>
  <Navbar />
  <main class="overflow-x-clip">
    <Hero /><Logos /><Bento /><Quote /><Steps /><Security /><Pricing /><Testimonials /><Faq /><Cta /><Footer />
  </main>
</template>
