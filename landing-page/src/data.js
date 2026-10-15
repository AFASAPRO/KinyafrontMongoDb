export const logos=['OpenAI','Retool','Stripe','Wise','Loom','Medium','Cash App','Linear']
export const steps=[
 {t:'Ask Your AI Agent Directly',d:'Speak or type your command—let SkyAgent capture your intent. Your request instantly sets the process in motion.'},
 {t:'Let SkyAgent Process It',d:'Your agent breaks the request into tasks and runs them across your connected tools.'},
 {t:'Receive Instant, Actionable Results',d:'Get clear outputs you can act on immediately, right where you work.'},
 {t:'Continuous Improvement',d:'SkyAgent learns from every run so the next one is faster and sharper.'}]
export const plans=[
 {n:'Free',m:0,y:0,d:'Perfect for individual users',cta:'Start Free',style:'bg-white text-slate-900 border',base:'Everything in Pro +',f:['Custom domain','SEO-optimizations','Auto-generated API docs','Built-in components library']},
 {n:'Startup',m:12,y:10,d:'Ideal for professionals and small teams',cta:'Upgrade to Pro',style:'bg-brand text-white',pop:true,f:['Custom domain','SEO-optimizations','Auto-generated API docs','Built-in components library','E-commerce integration','User authentication system','Multi-language support','Real-time collaboration tools']},
 {n:'Enterprise',m:24,y:20,d:'Best for large teams and enterprise-level organizations',cta:'Contact Sales',style:'bg-neutral-900 text-white',f:['Custom domain','SEO-optimizations','Auto-generated API docs','Built-in components library','Real-time collaboration tools']}]
export const reviews=[
 ['Raj Patel','Founder & CEO, StartupX','As a startup, we need to move fast and stay ahead. #CodeAI\'s automated coding assistant helps us do just that. Our development speed has doubled.'],
 ['Tom Chen','Director of IT, HealthSync','Systems integration has improved patient outcomes significantly. Technology and healthcare working hand in hand for better health.'],
 ['Jake Morrison','CTO, SecureNet','With #CyberShield\'s AI-powered security systems, our data protection levels are unmatched. Ensuring safety and trust in digital spaces.'],
 ['Alex Rivera','CTO, InnovateTech','The AI-driven analytics from #QuantumInsights have revolutionized our product development cycle. Insights are more accurate and faster than ever.'],
 ['Carlos Gomez','Head of Sustainability','By integrating #GreenTech\'s sustainable energy solutions, we\'ve seen a significant reduction in our carbon footprint.'],
 ['Nadia Ali','Project Manager, AI Solutions','#DesignPro\'s AI has streamlined our creative process, enhancing productivity and innovation. A game-changer for creative industries.'],
 ['Aisha Khan','Marketing Lead','#TrendSetter\'s market analysis AI has transformed how we approach fashion trends. Our campaigns are now data-driven.'],
 ['Emily Park','Head of Learning','#LearnSmart\'s AI-driven personalized learning plans have doubled student engagement. Transforming the educational landscape.'],
 ['Sofia Perez','Growth Lead','Implementing #AIStream\'s customer prediction model has led to a 50% increase in retention rates.']]
export const faqs=[
 ['What is an AI Agent?','An AI Agent is software that understands your instructions and completes multi-step tasks across your tools on its own.'],
 ['How does SkyAgent work?','You describe a task, SkyAgent plans the steps, connects to your apps and runs them, then reports the result.'],
 ['How secure is my data?','Data is encrypted in transit and at rest, with role-based access and audit logs.'],
 ['Can I integrate my existing tools?','Yes. SkyAgent connects to popular apps such as Figma, Linear, Stripe and more.'],
 ['Is there a free trial available?','Yes. Start free, and try Startup for 30 days with no credit card.'],
 ['How does SkyAgent save me time?','It automates repetitive work like scheduling, reporting and follow-ups so you can focus on the work that matters.']]
// Edit this list to match where you actually operate. `country` must match the world-atlas country name
// (Singapore is too small for the 110m map, so only its marker shows).
export const hubs=[
 {city:'Kigali',country:'Rwanda',label:'Rwanda',continent:'Africa',lon:30.06,lat:-1.95},
 {city:'Nairobi',country:'Kenya',label:'Kenya',continent:'Africa',lon:36.82,lat:-1.29},
 {city:'Lagos',country:'Nigeria',label:'Nigeria',continent:'Africa',lon:3.38,lat:6.52},
 {city:'Cape Town',country:'South Africa',label:'South Africa',continent:'Africa',lon:18.42,lat:-33.92},
 {city:'London',country:'United Kingdom',label:'United Kingdom',continent:'Europe',lon:-0.13,lat:51.5},
 {city:'Berlin',country:'Germany',label:'Germany',continent:'Europe',lon:13.4,lat:52.52},
 {city:'New York',country:'United States of America',label:'United States',continent:'North America',lon:-74,lat:40.71},
 {city:'Toronto',country:'Canada',label:'Canada',continent:'North America',lon:-79.38,lat:43.65},
 {city:'São Paulo',country:'Brazil',label:'Brazil',continent:'South America',lon:-46.63,lat:-23.55},
 {city:'Dubai',country:'United Arab Emirates',label:'UAE',continent:'Asia',lon:55.27,lat:25.2},
 {city:'Mumbai',country:'India',label:'India',continent:'Asia',lon:72.88,lat:19.07},
 {city:'Singapore',country:'Singapore',label:'Singapore',continent:'Asia',lon:103.82,lat:1.35},
 {city:'Tokyo',country:'Japan',label:'Japan',continent:'Asia',lon:139.69,lat:35.69},
 {city:'Sydney',country:'Australia',label:'Australia',continent:'Oceania',lon:151.21,lat:-33.87}]
export const operating=hubs.map(h=>h.country)
