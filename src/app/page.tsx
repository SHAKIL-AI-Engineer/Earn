import Link from "next/link";
import { ArrowDown, ArrowUpRight, Braces, Database, Code2, Layers3, Sparkles, Triangle } from "lucide-react";
import { ConnectionCheck } from "@/components/connection-check";

export default function Home() {
  return (
    <div className="site-shell">
      <header className="header">
        <Link href="/" className="brand" aria-label="Earn home"><span className="brand-mark">e</span>earn<span className="brand-dot">.</span></Link>
        <nav aria-label="Main navigation"><a href="#foundation">Foundation</a><a href="https://github.com/SHAKIL-AI-Engineer/Earn" target="_blank" rel="noreferrer" className="repo-link"><Code2 size={16} /> Repository <ArrowUpRight size={14} /></a></nav>
      </header>
      <main>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <span className="eyebrow"><span className="tiny-dot" /> A FRESH START</span>
            <h1 id="hero-title">Small beginnings.<br /><span>Big possibilities.</span></h1>
            <p>Your next idea has a home. A simple, solid foundation to turn what’s on your mind into something real.</p>
            <a className="primary-button" href="#foundation">Explore your foundation <ArrowDown size={17} /></a>
            <div className="hero-footnote"><Sparkles size={14} /> Built to grow with your ideas.</div>
          </div>
          <div className="illustration" aria-hidden="true">
            <div className="orbit orbit-one" /><div className="orbit orbit-two" />
            <span className="star star-one">+</span><span className="star star-two">+</span>
            <div className="floating-label label-top"><span className="tiny-dot" /> THE START OF SOMETHING</div>
            <div className="stack-layer layer-bottom" /><div className="stack-layer layer-middle" />
            <div className="stack-layer layer-top"><span>e<span>.</span></span></div>
            <div className="floating-label label-bottom"><Braces size={16} /> Your idea, built on possibility.</div>
          </div>
        </section>
        <section id="foundation" className="foundation" aria-labelledby="foundation-title">
          <div className="section-heading"><div><span className="eyebrow muted">THE BUILDING BLOCKS</span><h2 id="foundation-title">A good place to start.</h2></div><span className="section-caption">Simple by design. Ready for what’s next.</span></div>
          <div className="foundation-grid">
            <ConnectionCheck />
            <div className="stack-cards">
              <a className="tech-card" href="https://nextjs.org/docs" target="_blank" rel="noreferrer"><span className="tech-icon"><Layers3 size={22} /></span><div><span className="card-kicker">THE FRAMEWORK</span><h3>Next.js</h3><p>Thoughtful interfaces. Full-stack possibilities.</p></div><ArrowUpRight className="card-arrow" size={19} /></a>
              <a className="tech-card" href="https://neon.com/docs" target="_blank" rel="noreferrer"><span className="tech-icon"><Database size={22} /></span><div><span className="card-kicker">THE DATABASE</span><h3>Neon Postgres</h3><p>A server-side connection to your data.</p></div><ArrowUpRight className="card-arrow" size={19} /></a>
              <a className="tech-card" href="https://vercel.com/docs" target="_blank" rel="noreferrer"><span className="tech-icon"><Triangle size={21} /></span><div><span className="card-kicker">THE PLATFORM</span><h3>Vercel</h3><p>From your first commit to your next release.</p></div><ArrowUpRight className="card-arrow" size={19} /></a>
            </div>
          </div>
        </section>
        <section className="next-step"><div className="next-step-icon"><Braces size={25} /></div><div><span className="card-kicker">MAKE IT YOURS</span><h2>The foundation is here. The next chapter is yours.</h2><p>Start with one idea, one feature, one small step.</p></div><a href="https://github.com/SHAKIL-AI-Engineer/Earn" target="_blank" rel="noreferrer">Open the code <ArrowUpRight size={17} /></a></section>
      </main>
      <footer><span>© 2026 Earn</span><span>A little idea. A lot of potential.</span><a href="https://github.com/SHAKIL-AI-Engineer/Earn" target="_blank" rel="noreferrer"><Code2 size={15} /> Built in the open</a></footer>
    </div>
  );
}
