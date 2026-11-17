import React from 'react';
import {traits} from './profile.js';
import {Compass, Sparkles, ArrowRight, Printer} from 'lucide-react';

export default function Report({report,evidence,profile,restart}) {
 function areaCard(area,i){return <article className="explore-card" key={area.trait}>
  <span className={`area-index c${i}`}>0{i+1}</span><h2>{area.title}</h2>
  {area.wildcard&&<span className="wildcard-label">Wildcard · a different experiment</span>}
  {area.exploratory&&!area.wildcard&&<span className="wildcard-label">An area to try, not a strong match</span>}
  <p>{area.why}</p>
  {!report.explorationOnly&&<div className="career-chips">{area.careers.map(c=><span key={c}>{c}</span>)}</div>}
  <details><summary>See the answers behind this suggestion</summary>{area.evidenceIds.length?area.evidenceIds.map(id=>{
   const item=evidence.find(e=>e.id===id);return item&&<div className="evidence-item" key={id}><b>{id.toUpperCase()}: {item.question}</b><p>{item.answer.map((a,i)=>`${i+1}. ${a}`).join(' · ')}</p></div>;
  }):<p>This is an experiment beyond the interests you selected.</p>}</details>
  <details><summary>Try this area and see what it feels like</summary><div className="project-box"><b>A small project</b><p>{area.activity}</p><b>{report.explorationOnly?'What the activity might feel like':'A day might include'}</b><p>{area.dayInLife}</p><b>Ask yourself</b><p>{area.reflection}</p>{area.degrees.length>0&&<p><b>Possible study routes:</b> {area.degrees.join(', ')}. Check official requirements with a counsellor; they vary by institution and country.</p>}</div></details>
 </article>;}
 return <main className="app-shell report-shell">
  <header className="topbar"><div className="brand"><span className="brand-icon"><Compass size={18}/></span>pathfinder.</div><button className="text-button print-button" onClick={()=>window.print()}><Printer size={16}/> Print / save PDF</button></header>
  <section className="report-head"><div className="eyebrow"><Sparkles size={15}/> YOUR EXPLORATION MAP</div><h1 tabIndex={-1}>{report.headline}</h1><p>Grades {report.gradeBand} · {report.explorationOnly?'Explore through activities':'Explore interests and possible paths'}</p><p>{report.summary}</p></section>
  {(profile.broad||profile.sparse)&&<p className="flow-notice">{profile.sparse?'There is not enough strong signal to narrow your interests yet.':'Your interests are spread across several areas, with no clear single lead.'} Treat these areas as experiments, not a ranking of your future.</p>}
  <section className="try-card weekly-step"><span className="mini-label">ONE THING TO TRY THIS WEEK</span><h2>A small start is enough.</h2><p>{report.tryNext[0]}</p></section>
  <div className="section-heading"><div><h2>Directions worth exploring</h2><p>Nothing here rules out another path.</p></div></div>
  <div className="enhanced-areas">{report.areas.slice(0,report.explorationOnly?2:4).map(areaCard)}</div>
  {report.explorationOnly&&<details className="report-more"><summary>Two more experiments, including a wildcard</summary><div className="enhanced-areas">{report.areas.slice(2).map((a,i)=>areaCard(a,i+2))}</div></details>}
  <details className="report-more"><summary>Your interest profile and how to read it</summary><section className="profile-panel"><p>Each bar uses the same 0–100 scale: the share of available interest points for that trait. This is not a probability or ability score.</p><div className="profile-bars">{Object.entries(traits).map(([key,label])=><div key={key}><span>{label}</span><div className="trait-track" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={profile.visual[key]} aria-valuetext={`${profile.visual[key]} out of 100 available interest points`}><div style={{width:`${profile.visual[key]}%`}}/></div></div>)}</div><small>{profile.note}</small></section></details>
  <details className="report-more"><summary>Strengths to explore and your next four weeks</summary><div className="strength-list">{report.strengths.map(s=><div className="strength-item" key={s}>{s}</div>)}</div><div className="plan-grid">{report.plan.map((week,i)=><article key={i}><span className="mini-label">WEEK {i+1}</span><h3>{week.title}</h3><p>{week.action}</p></article>)}</div></details>
  <details className="report-more"><summary>For a parent, teacher or counsellor</summary><p>{report.discussionPrompt}</p><h3>What is still worth discovering?</h3><p>{report.uncertainty}</p><h3>Other small steps</h3><ul>{report.tryNext.slice(1).map(s=><li key={s}>{s}</li>)}</ul></details>
  <p className="report-note">{report.note}</p><div className="report-end"><span>YOUR INTERESTS CAN GROW AND CHANGE.</span><button className="text-button" onClick={restart}>Start over <ArrowRight size={15}/></button></div>
 </main>;
}
