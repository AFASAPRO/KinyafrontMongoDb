export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: { extend: {
    fontFamily: { sans: ['Geist','Inter','system-ui','sans-serif'] },
    colors: { brand: '#2563eb' },
    keyframes: {
      orbit: { to: { transform: 'rotate(360deg)' } },
      scrollY: { to: { transform: 'translateY(-50%)' } },
      blink: { '50%': { opacity: 0 } }
    },
    animation: { orbit: 'orbit 30s linear infinite', scrollY: 'scrollY 40s linear infinite', blink: 'blink 1s steps(1) infinite' }
  } }
}
