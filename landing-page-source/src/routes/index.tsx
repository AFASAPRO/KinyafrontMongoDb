import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, ChevronDown, Menu, Moon, Pause, Play, Plus, Sun, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import orbitVideo from "@/assets/kinyabot-light-orbit.webm.asset.json";
import kinyaVideo from "@/assets/kinya-companion.webm.asset.json";
import kinyaPoster from "@/assets/kinya-poster.jpg.asset.json";
import EarthGlobe from "@/components/EarthGlobe";
import PredictiveArc from "@/components/PredictiveArc";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KinyaBot AI — Work flows. You don't have to." },
      { name: "description", content: "KinyaBot AI connects your apps and moves work forward automatically, with a clear record of every step." },
      { property: "og:title", content: "KinyaBot AI — Work flows. You don't have to." },
      { property: "og:description", content: "Connect your apps, automate the handoffs, and keep every run on the record." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.kinyabotai.online/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "canonical", href: "https://www.kinyabotai.online/" },
    ],
  }),
  component: Home,
});

const nav = [
  { label: "Product", href: "#product" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Kinya", href: "#kinya" },
  { label: "Global", href: "#worldwide" },
  { label: "Plans", href: "#plans" },
  // KinyaBot app entry — opens the authenticated chat application (Vue SPA at /chat)
  { label: "Sign in", href: "/chat/login" },
];

function Mark({ small = false }: { small?: boolean }) {
  // KinyaBot app logo (blue phoenix) instead of the generic chevrons
  return <span className={`brand-mark ${small ? "brand-mark-small" : ""}`} aria-hidden="true"><img src="/logo-mark.png" alt="" className="brand-logo-img" width="192" height="192" /></span>;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <span className="section-label"><i />{children}</span>;
}

function OrbitVideo({ className = "" }: { className?: string }) {
  return <video className={className} src={orbitVideo.url} autoPlay muted loop playsInline preload="metadata" aria-hidden="true" tabIndex={-1} />;
}

function KinyaFilm() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const pausedByUser = useRef(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const syncPlayback = () => {
      if (video.getBoundingClientRect().top < window.innerHeight && video.getBoundingClientRect().bottom > 0 && !document.hidden && !pausedByUser.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        void video.play().catch(() => setPlaying(false));
      } else video.pause();
    };
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) syncPlayback();
      else video.pause();
    }, { threshold: 0.15 });
    observer.observe(video);
    document.addEventListener("visibilitychange", syncPlayback);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", syncPlayback); video.pause(); };
  }, []);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      pausedByUser.current = false;
      void video.play().catch(() => setPlaying(false));
    } else {
      pausedByUser.current = true;
      video.pause();
    }
  };

  return <div className="kinya-film">
    <video ref={videoRef} src={kinyaVideo.url} poster={kinyaPoster.url} muted loop playsInline preload="metadata" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} aria-label="Animated film introducing Kinya, a friendly green companion exploring language, coding, and ideas" />
    <img className="kinya-still" src={kinyaPoster.url} alt="Kinya, a cheerful green companion with leaf-like sprouts" />
    <div className="kinya-film-controls"><span>KINYA / IN MOTION</span><Button type="button" variant="ghost" size="icon" onClick={togglePlayback} aria-label={playing ? "Pause Kinya film" : "Play Kinya film"} title={playing ? "Pause film" : "Play film"}>{playing ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}</Button></div>
  </div>;
}

function Home() {
  const travelingMark = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [flowIdea, setFlowIdea] = useState("");
  const [previewIdea, setPreviewIdea] = useState("");
  const demo = [previewIdea || "A request comes in", "KinyaBot checks the details", "The right person gets notified", "Every step is recorded"];
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    const saved = localStorage.getItem("kinyabot-theme");
    const t = saved === "light" || saved === "dark" ? saved : "dark";
    setTheme(t);
    document.documentElement.dataset["theme"] = t;
  }, []);
  const toggleTheme = () => {
    const t = theme === "dark" ? "light" : "dark";
    setTheme(t);
    document.documentElement.dataset["theme"] = t;
    localStorage.setItem("kinyabot-theme", t);
  };
  const openDemo = (idea = "") => {
    setPreviewIdea(idea.trim());
    setDemoStep(0);
    setDemoOpen(true);
  };

  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".reveal, .animate-on-view");
    const io = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in-view"); io.unobserve(e.target); window.setTimeout(() => window.dispatchEvent(new Event("resize")), 1000); } }), { threshold: 0.25 });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const mark = travelingMark.current;
    const anchors = Array.from(document.querySelectorAll<HTMLElement>(".mark-anchor"));
    if (!mark || anchors.length < 2) return;
    let frame = 0;
    let points: { x: number; y: number; size: number; key: number }[] = [];
    const measure = () => {
      const sy = window.scrollY, vh = window.innerHeight;
      points = anchors.map(a => {
        const r = a.getBoundingClientRect();
        const cy = r.top + sy + r.height / 2;
        return { x: r.left + r.width / 2, y: cy, size: Math.max(r.width, r.height), key: Math.max(0, cy - vh * 0.5) };
      });
    };
    const ease = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const update = () => {
      frame = 0;
      const s = window.scrollY;
      let i = 0;
      while (i < points.length - 2 && s > points[i + 1]!.key) i++;
      const a = points[i], b = points[i + 1];
      if (!a || !b) return;
      const t = ease(Math.min(1, Math.max(0, (s - a.key) / Math.max(1, b.key - a.key))));
      const size = a.size + (b.size - a.size) * t;
      const x = a.x + (b.x - a.x) * t - size / 2;
      const y = a.y + (b.y - a.y) * t - s - size / 2;
      mark.style.width = `${size}px`;
      mark.style.height = `${size}px`;
      mark.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${Math.sin(t * Math.PI) * 18}deg)`;
    };
    const queue = () => { if (!frame) frame = requestAnimationFrame(update); };
    const remeasure = () => { measure(); queue(); };
    measure(); update();
    const timer = window.setTimeout(remeasure, 600);
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", remeasure);
    window.addEventListener("load", remeasure);
    return () => { clearTimeout(timer); window.removeEventListener("scroll", queue); window.removeEventListener("resize", remeasure); window.removeEventListener("load", remeasure); cancelAnimationFrame(frame); };
  }, []);

  return (
    <main>
      <div className="opening-scene" aria-hidden="true"><OrbitVideo className="opening-video" /><div className="opening-identity"><Mark /><span>KinyaBot <b>AI</b></span></div></div>
      <div className="traveling-mark" ref={travelingMark} aria-hidden="true"><Mark /></div>
      <header className="site-header">
        <a href="#top" className="wordmark" aria-label="KinyaBot AI home"><Mark /><span>KinyaBot <b>AI</b></span></a>
        <nav className={`desktop-nav ${menuOpen ? "nav-open" : ""}`} aria-label="Main navigation">{nav.map(item => <a href={item.href} key={item.href} onClick={() => setMenuOpen(false)}>{item.label}</a>)}</nav>
        <div className="header-actions"><Button variant="ghost" size="icon" className="theme-toggle" aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} title={theme === "dark" ? "Light mode" : "Dark mode"} onClick={toggleTheme}>{theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}</Button><Button asChild variant="outline" size="sm" className="nav-outline"><a href="/chat/login">Sign in</a></Button><Button variant="outline" size="sm" className="nav-outline" onClick={() => openDemo()}>Watch demo</Button><Button asChild size="sm" className="nav-primary"><a href="#plans">Explore plans</a></Button></div>
        <Button variant="ghost" size="icon" className="menu-toggle" aria-label={menuOpen ? "Close menu" : "Open menu"} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</Button>
      </header>

      <section className="hero section-width" id="top">
        <PredictiveArc />
        <div className="hero-copy">
          <h1>KinyaBot AI</h1>
          <p>Make the work between your apps flow on its own.</p>
          <form className="hero-prompt" onSubmit={event => { event.preventDefault(); openDemo(flowIdea); }}>
            <label htmlFor="flow-idea" className="sr-only">Describe a workflow you want to explore</label>
            <input id="flow-idea" value={flowIdea} onChange={event => setFlowIdea(event.target.value)} placeholder="Describe a task you’d like to automate..." />
            <div className="hero-prompt-tools">
              <Button type="button" variant="outline" size="icon" className="prompt-plus" aria-label="See an example workflow" title="See an example workflow" onClick={() => openDemo()}><Plus size={18} /></Button>
              <Button type="submit" variant="ghost" className="prompt-submit">Preview flow <ChevronDown size={14} /></Button>
            </div>
          </form>
        </div>
      </section>

      <section className="integrations section-width" id="product">
        <div className="integration-copy"><SectionLabel>one connected workspace</SectionLabel><h2>All your tools.<br /><em>Finally in sync.</em></h2><p>Bring the apps you use every day into one dependable flow. No more copying the same information from place to place.</p></div>
        <div className="integration-visual"><OrbitVideo className="section-video" /><div className="app-chip chip-one"><span>✳</span> Messages</div><div className="app-chip chip-two"><span>▦</span> Sheets</div><div className="app-chip chip-three"><span>◈</span> CRM</div><div className="app-chip chip-four"><span className="mark-anchor"><Mark small /></span> KinyaBot AI</div></div>
      </section>

      <section className="process section-width" id="how-it-works">
        <div className="section-intro"><SectionLabel>the way it works</SectionLabel><h2>Most of a process is <em>just waiting.</em></h2><p>Turn the quiet gaps between your tools into useful progress. Set the conditions once; let each next step happen when it should.</p></div>
        <div className="process-grid"><div className="process-text"><span className="mono muted">01 / BUILD THE FLOW</span><h3>One canvas, every branch.</h3><p>Map out what happens next, who needs to approve it, and where the information should land.</p></div><div className="process-panel"><div className="panel-top"><span className="mono">your workflow</span><span className="mono">active ●</span></div><div className="step-row"><span>01</span><strong>New request received</strong><Check size={16} /></div><div className="step-row"><span>02</span><strong>Check requirements</strong><Check size={16} /></div><div className="step-row active"><span>03</span><strong>Route to the right team</strong><span className="progress-track"><i /></span></div><div className="step-row"><span>04</span><strong>Update your records</strong><span>↗</span></div></div></div>
        <div className="process-grid reverse"><div className="process-text"><span className="mono muted">02 / KNOW WHAT HAPPENED</span><h3>Every run is on the record.</h3><p>See what went in, what happened, and how long it took. Follow a run from first trigger to final result.</p></div><div className="bars-panel animate-on-view"><div className="panel-top"><span className="mono">runs through the week</span><span className="mono">live activity</span></div><div className="bars">{[44,57,68,87,63,78,50].map((n,i)=><div className="bar-column" key={i}><div className="bar" style={{ height: `${n}%` }} /><span>{["mon","tue","wed","thu","fri","sat","sun"][i]}</span></div>)}</div></div></div>
      </section>

      <section className="statement section-width"><div className="statement-inner reveal"><span className="mono">[ WHAT WE BELIEVE ]</span><h2>The best workflow is the one<br />you <em>don’t have to think about.</em></h2><span className="mark-anchor"><Mark /></span></div></section>

      <section className="reliability section-width" id="why-kinyabot"><div className="split-heading"><div><SectionLabel>reliability</SectionLabel><h2><em>Quiet</em> in the ways that matter.</h2></div><p>Keep the work moving without losing sight of what happened along the way.</p></div><div className="reliability-grid animate-on-view"><article className="info-card"><h3>One flow, every app</h3><p>Keep each handoff in one place so nothing falls between tools or teams.</p><span className="mono muted">connected by design</span><div className="orbit-graphic"><span>inbox</span><span>forms</span><span className="mark-anchor"><Mark /></span><span>records</span><span>team</span></div><span className="mono muted">from trigger to done</span></article><article className="info-card"><h3>Your data, your visibility</h3><p>Know the status of every step and see exactly where work is waiting.</p><span className="mono muted">workflow health</span><div className="health-lines"><div><span>Requests received</span><i><b style={{ width: "86%" }} /></i><em>86%</em></div><div><span>Routed to team</span><i><b style={{ width: "68%" }} /></i><em>68%</em></div><div><span>Records updated</span><i><b style={{ width: "94%" }} /></i><em>94%</em></div></div><span className="mono muted">illustrative preview</span></article></div></section>

      <section className="dashboard-section section-width"><div className="split-heading"><div><SectionLabel>the whole picture</SectionLabel><h2>A <em>clearer view</em> of every run.</h2></div><p>See the flow, spot what needs attention, and keep moving without digging through five different apps.</p></div><div className="dashboard-grid"><div className="dashboard-table"><div className="panel-top"><span className="mono">recent activity</span><span className="mono">all workflows ↗</span></div><div className="table-head"><span>WORKFLOW</span><span>STATUS</span><span>TIME</span></div>{[["New request routing","Completed","09:41"],["Weekly team update","Completed","09:38"],["Record sync","In progress","09:31"],["Approval reminder","Completed","08:54"]].map(([a,b,c])=><div className="table-row" key={a}><span><i />{a}</span><span>{b}</span><span>{c}</span></div>)}</div><div className="dashboard-ring animate-on-view"><span className="mono">workflow overview</span><div className="ring"><strong>On track</strong></div><p>Everything in one place, from first action to last.</p></div></div></section>

      <section className="globe-section section-width" id="worldwide"><div className="globe-copy"><SectionLabel>around the world</SectionLabel><h2>Work that flows<br /><em>across every time zone.</em></h2><p>Teams in different cities and countries can share the same dependable workflows. While one team sleeps, the next step is already moving.</p><div className="globe-stats"><div><strong>24/7</strong><span>workflows keep running</span></div><div><strong>Any region</strong><span>built for global teams</span></div><div><strong>One view</strong><span>for every location</span></div></div><span className="mono muted" style={{ display: "block", marginTop: 16 }}>drag in any direction to explore · illustrative locations</span></div><div className="globe-stage animate-on-view"><EarthGlobe /></div></section>

      <section className="kinya-section section-width" id="kinya" aria-labelledby="kinya-title">
        <div className="kinya-copy">
          <SectionLabel>introducing the companion</SectionLabel>
          <div className="kinya-signature"><span className="kinya-signature-line" /><span>KINYA / THE FRIENDLY FACE OF KINYABOT AI</span></div>
          <h2 id="kinya-title">Meet <em>Kinya.</em></h2>
          <p className="kinya-lead">The little companion with a big curiosity.</p>
          <p>Kinya gives the KinyaBot AI story a face: warm, thoughtful, and always looking for a way forward. From language and ideas to coding and complex tasks, Kinya makes the possibilities of AI feel more human.</p>
          <span className="kinya-caption mono">A COMPANION FOR THE WORK AHEAD <span aria-hidden="true">↗</span></span>
        </div>
        <KinyaFilm />
      </section>

      <section className="outcomes section-width"><div className="split-heading"><div><SectionLabel>what changes</SectionLabel><h2>Less manual work.<br /><em>More room to move.</em></h2></div><p>Make space for the work that actually needs a person, while the repeatable steps take care of themselves.</p></div><div className="outcome-grid animate-on-view"><article><span className="mono">01 / TIME</span><strong>Hours back</strong><p>Give your team fewer repetitive tasks and more time for the decisions that matter.</p><div className="sparkline">▁▂▂▃▃▄▅▅▆▇</div></article><article><span className="mono">02 / CLARITY</span><strong>One source of truth</strong><p>Every action has a place in the history, so it’s easier to see what happened.</p><div className="mini-bars">{[90,85,78,73,65,55,45,35].map((n,i)=><i key={i} style={{height:`${n}%`}} />)}</div></article><article><span className="mono">03 / MOMENTUM</span><strong>Fewer dropped balls</strong><p>Move requests to the next step without the follow-up messages.</p><div className="outcome-progress"><i /></div></article></div></section>

      <section className="pricing section-width" id="plans"><div className="pricing-background"><OrbitVideo className="section-video" /></div><div className="pricing-content"><div className="split-heading"><div><SectionLabel>plans</SectionLabel><h2>Start with a flow.<br /><em>Grow from there.</em></h2></div><p>Find the right fit for the work you want to automate.</p></div><div className="pricing-toolbar"><span className="mono">PLAN PREVIEW · ILLUSTRATIVE PRICING</span><div className="segment" aria-label="Billing preference"><Button variant="ghost" className={billing === "monthly" ? "selected" : ""} onClick={() => setBilling("monthly")}>Monthly</Button><Button variant="ghost" className={billing === "yearly" ? "selected" : ""} onClick={() => setBilling("yearly")}>Yearly <b className="save-hint">−20%</b></Button></div></div><div className="pricing-grid">{[
          { name:"Starter", description:"For one focused workflow", monthly:19, yearly:15, features:["1 active workflow","Up to 500 runs per month","Connect up to 5 everyday tools","Run activity at a glance","7-day run history","Community support"] },
          { name:"Team", description:"For work shared across teams", monthly:49, yearly:39, features:["Everything in Starter","Unlimited active workflows","Up to 5,000 runs per month","Unlimited app connections","Team handoffs and approvals","90-day run history","Priority email support"], featured:true },
          { name:"Scale", description:"For more moving parts", monthly:99, yearly:79, features:["Everything in Team","Unlimited runs","Department-wide flows with role control","Advanced conditions and branching","Custom routing rules","Unlimited run history","Dedicated onboarding and support"] },
        ].map(plan=><article className={`price-card ${plan.featured ? "featured" : ""}`} key={plan.name}><div className="price-top"><span className="mono">{plan.name}</span>{plan.featured && <span className="popular">popular fit</span>}</div><h3>{plan.name}</h3><p>{plan.description}</p><div className="price-row"><strong className="price-amount">${billing === "yearly" ? plan.yearly : plan.monthly}</strong><span className="mono">/ month</span></div><span className="price-note mono">{billing === "yearly" ? "billed yearly · save 20%" : "billed monthly · cancel anytime"}</span><ul>{plan.features.map(feature=><li key={feature} className={feature.startsWith("Everything in") ? "includes" : ""}><Check size={15} />{feature}</li>)}</ul><Button asChild variant={plan.featured ? "default" : "outline"} className={`pill ${plan.featured ? "primary-pill" : "dark-pill"}`}><a href="#contact">Get in touch <ArrowRight size={15} /></a></Button></article>)}</div><span className="mono pricing-footnote">Example plans for this preview — final KinyaBot AI pricing and limits may change.</span></div></section>

      <footer className="footer section-width" id="contact"><div className="footer-brand"><a href="#top" className="wordmark"><Mark /><span>KinyaBot <b>AI</b></span></a><p>Automation for the work that lives between your tools.</p><span className="mono">made for the in-between</span></div><div className="footer-cta"><span className="mono">WHAT'S NEXT</span><h2>Pick the task you<br />hate doing by hand.</h2><p>Tell us what you’d like to automate. We’ll take it from there.</p><form onSubmit={e => { e.preventDefault(); if (email.trim()) setSubmitted(true); }}><label htmlFor="contact-email" className="sr-only">Work email</label><input id="contact-email" type="email" required value={email} onChange={e => {setEmail(e.target.value);setSubmitted(false);}} placeholder="Work email" /><Button type="submit" className="pill dark-submit">Join the list <ArrowRight size={15} /></Button></form>{submitted && <span className="form-note" role="status">Thanks for your interest. This preview doesn’t send or save submissions yet.</span>}</div></footer>
      <div className="bottom-line section-width"><span>© KinyaBot AI</span><span>Work, without the waiting.</span></div>

      {demoOpen && <div className="modal-backdrop" onMouseDown={e => { if(e.target===e.currentTarget) setDemoOpen(false); }}><div className="demo-modal" role="dialog" aria-modal="true" aria-labelledby="demo-title"><div className="modal-top"><span className="mono">KINYA BOT / WORKFLOW PREVIEW</span><Button variant="ghost" size="icon" aria-label="Close preview" onClick={() => setDemoOpen(false)}><X /></Button></div><h2 id="demo-title">See a handoff in motion.</h2><p>A simple example of how a request moves from start to finish.</p><div className="demo-steps">{demo.map((step,i)=><div className={i<=demoStep ? "done" : ""} key={step}><span>{i<demoStep ? <Check size={15} /> : String(i+1).padStart(2,"0")}</span><strong>{step}</strong></div>)}</div><div className="demo-bottom"><span className="mono">STEP {demoStep+1} OF {demo.length}</span><Button className="pill primary-pill" onClick={() => setDemoStep(demoStep === demo.length-1 ? 0 : demoStep+1)}>{demoStep === demo.length-1 ? "Replay" : "Next step"}<ArrowRight size={16} /></Button></div></div></div>}
    </main>
  );
}
