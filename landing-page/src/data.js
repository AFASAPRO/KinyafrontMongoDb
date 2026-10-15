export const logos=['OpenAI','Retool','CardNova','Wise','Loom','Medium','Cash App','Linear']
export const steps=[
 {t:'Ask Kinyabot Anything',d:'Type or speak your request—let Kinyabot AI capture your intent. Your request instantly sets the conversation in motion.'},
 {t:'Let Kinyabot Process It',d:'Kinyabot AI understands what you need and draws on chat, images, code and translation to prepare the answer.'},
 {t:'Receive Instant, Actionable Results',d:'Get clear answers, images or code you can use immediately, right where you are.'},
 {t:'Continuous Improvement',d:'Kinyabot AI learns from every chat so the next answer is faster and sharper.'}]
export const plans=[
 {n:'Free',m:0,y:0,d:'Perfect for getting started',cta:'Start Free',style:'bg-white text-slate-900 border',base:'Everything in Pro +',f:['Unlimited chat & answers','Image generation (10 per day)','Voice input & text-to-speech','Kinyarwanda, English & French']},
 {n:'Startup',m:12,y:10,d:'Ideal for creators and power users',cta:'Upgrade to Pro',style:'bg-brand text-white',pop:true,f:['Everything in Free','Unlimited image generation','Priority AI responses','Advanced code assistance','Document & file understanding','Early access to new skills','Multi-language translation','Email support']},
 {n:'Enterprise',m:24,y:20,d:'Best for teams and organizations',cta:'Contact Sales',style:'bg-neutral-900 text-white',f:['Everything in Startup','Team workspaces & admin tools','Custom AI skills for your business','Dedicated support & onboarding','SSO & advanced security','Custom usage limits']}]
export const reviews=[
 ['Raj Patel','Founder & CEO, StartupX','As a startup, we need to move fast and stay ahead. Kinyabot AI drafts our updates, translates them for our Kigali team and answers anything we throw at it. Our development speed has doubled.'],
 ['Tom Chen','Director of IT, HealthSync','Voice and translation inside Kinyabot AI helps our staff communicate across languages every day. Technology and healthcare working hand in hand for better health.'],
 ['Jake Morrison','CTO, SecureNet','With Kinyabot AI\'s step-by-step code help, our junior developers fix issues in minutes instead of hours. A true companion for the whole engineering team.'],
 ['Alex Rivera','CTO, InnovateTech','The image generation from Kinyabot AI has revolutionized our product design cycle. Concepts that used to take days are ready in minutes.'],
 ['Carlos Gomez','Head of Sustainability','Kinyabot AI drafts my reports and summarizes research in seconds. It feels like a colleague who is always ready to help.'],
 ['Nadia Ali','Project Manager, AI Solutions','Kinyabot AI has streamlined our creative process, enhancing productivity and innovation. A game-changer for creative industries.'],
 ['Aisha Khan','Marketing Lead','Kinyabot AI\'s market summaries have transformed how we approach campaigns. Our decisions are now data-driven and fast.'],
 ['Emily Park','Head of Learning','My students practice Kinyarwanda with Kinyabot every day. Personalized lessons have doubled engagement. Transforming the educational landscape.'],
 ['Sofia Perez','Growth Lead','Kinyabot AI\'s customer insight summaries helped us lift retention significantly. The easiest AI assistant our team has ever used.']]
export const faqs=[
 ['What is Kinyabot AI?','Kinyabot AI is a friendly companion that chats with you, answers questions, generates images, helps with code and translates across Kinyarwanda, English and French.'],
 ['How does Kinyabot work?','You send a message by text or voice, Kinyabot AI understands what you need and replies instantly — with answers, images, code or translations.'],
 ['How secure is my data?','Data is encrypted in transit and at rest, with role-based access and audit logs.'],
 ['Can I use Kinyabot in Kinyarwanda?','Yes. Kinyabot AI speaks Kinyarwanda, English and French, and can translate between them as you chat.'],
 ['Is there a free plan available?','Yes. Start free, and upgrade whenever you need more images, faster replies or team features.'],
 ['How does Kinyabot save me time?','It handles everyday busywork like drafting, translating, explaining and debugging so you can focus on the work that matters.']]
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
