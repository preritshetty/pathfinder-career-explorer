import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, Compass, Heart, Leaf, Lightbulb, LockKeyhole, Sparkles, Star } from 'lucide-react';
import { questions } from './questions';
import './styles.css';

async function readApiResponse(response) {
  const body = await response.text();
  try { return body ? JSON.parse(body) : { error: 'The server returned an empty response. Please try again.' }; }
  catch { return { error: 'The server returned an unreadable response. Please try again.' }; }
}

function App() {
  const [stage, setStage] = useState('welcome');
  const [student, setStudent] = useState({ name: '', grade: '' });
  const [answers, setAnswers] = useState({});
  const [followups, setFollowups] = useState([]);
  const [report, setReport] = useState(null);
  const [demo, setDemo] = useState(false);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const activeQuestions = stage === 'base' ? questions : followups;
  const active = activeQuestions[index];
  const total = stage === 'base' ? 15 : 5;
  const progress = stage === 'base' ? ((index + 1) / 15) * 100 : (10 + index + 1) / 15 * 100;

  function updateAnswer(value) {
    setAnswers(current => ({ ...current, [active.id]: value }));
  }
  function toggleOption(option) {
    const current = answers[active.id];
    if (active.type === 'multi') {
      const list = Array.isArray(current) ? current : [];
      updateAnswer(list.includes(option) ? list.filter(item => item !== option) : [...list, option]);
    } else updateAnswer(current === option ? '' : option);
  }
  const isAnswered = active && (active.type === 'text' ? String(answers[active.id] || '').trim().length > 0 : (Array.isArray(answers[active.id]) ? answers[active.id].length : Boolean(answers[active.id])));

  async function advance() {
    setError('');
    if (!isAnswered) { setError(active.type === 'text' ? 'Add a little answer to continue.' : 'Choose at least one answer to continue.'); return; }
    if (index < activeQuestions.length - 1) { setIndex(index + 1); return; }
    if (stage === 'base') {
      setBusy(true);
      try {
        const response = await fetch('/api/followups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answers: Object.fromEntries(questions.map(q => [q.id, answers[q.id] ?? ''])), student }) });
        const data = await readApiResponse(response);
        if (!response.ok) throw new Error(data.error || 'Could not make the next questions.');
        setFollowups(data.questions); setDemo(data.demo); setIndex(0); setStage('followup');
      } catch (e) { setError(e.message); }
      setBusy(false); return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answers: { ...answers, ...Object.fromEntries(questions.map(q => [q.id, answers[q.id] ?? ''])) }, student }) });
      const data = await readApiResponse(response);
      if (!response.ok) throw new Error(data.error || 'Could not create your report.');
      setReport(data.report); setDemo(data.demo); setStage('report');
    } catch (e) { setError(e.message); }
    setBusy(false);
  }

  function back() {
    setError('');
    if (index > 0) setIndex(index - 1);
    else if (stage === 'followup') { setStage('base'); setIndex(9); }
    else if (stage === 'base') { setStage('welcome'); setIndex(0); }
  }

  function restart() { setStage('welcome'); setAnswers({}); setFollowups([]); setReport(null); setIndex(0); setError(''); }

  if (stage === 'welcome') return <main className="app-shell welcome-shell"><header className="topbar"><div className="brand"><span className="brand-icon"><Compass size={18}/></span> pathfinder<span className="brand-dot">.</span></div><div className="top-note"><span className="live-dot"/> YOUR FUTURE, YOUR WAY</div></header><section className="hero"><div className="hero-copy"><div className="eyebrow"><Sparkles size={15}/> A LITTLE MORE YOU</div><h1>Your next big idea<br/>starts <em>here.</em></h1><p className="hero-lede">A thoughtful little journey to discover what makes you tick — and explore where it might take you.</p><div className="hero-perks"><div><span className="perk-icon mint"><Compass size={17}/></span><span><b>15 questions</b><small>About 5 minutes</small></span></div><div><span className="perk-icon peach"><Lightbulb size={17}/></span><span><b>Made for you</b><small>Personalised along the way</small></span></div><div><span className="perk-icon lilac"><Heart size={17}/></span><span><b>No wrong answers</b><small>Just what feels like you</small></span></div></div></div><div className="hero-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="sun-disc"><div className="sun-core"><Compass size={60} strokeWidth={1.3}/></div></div><div className="float-note note-one"><Star size={14} fill="currentColor"/> Big curiosity</div><div className="float-note note-two"><Leaf size={14}/> Room to grow</div><div className="art-spark spark-one">✦</div><div className="art-spark spark-two">✳</div></div></section><section className="welcome-bottom"><div className="start-card"><div className="start-card-copy"><span className="mini-label">LET'S GET TO KNOW YOU</span><h2>Ready when you are.</h2><p>There’s no timer and no pressure. Your answers help us find ideas worth exploring.</p></div><div className="start-fields"><label>Your name <span>optional</span><input value={student.name} onChange={e => setStudent({...student, name:e.target.value.slice(0,50)})} placeholder="What should we call you?" /></label><label>What grade are you in?<select value={student.grade} onChange={e => setStudent({...student, grade:e.target.value})}><option value="">Choose a grade</option>{Array.from({length:8},(_,i)=><option key={i+5} value={i+5}>Grade {i+5}</option>)}</select></label><button className="primary-button wide" onClick={()=>{setStage('base');setIndex(0)}}>Let’s begin <ArrowRight size={17}/></button></div></div><div className="privacy-note"><LockKeyhole size={13}/> Answers aren’t saved; with AI enabled, they’re sent to Google to create your questions and report.</div></section><footer className="footer"><span>MADE FOR THE CURIOUS, AGES 10–18</span><span>ONE QUESTION AT A TIME · NO PRESSURE</span></footer></main>;

  if (stage === 'report') return <main className="app-shell report-shell"><header className="topbar"><div className="brand"><span className="brand-icon"><Compass size={18}/></span> pathfinder<span className="brand-dot">.</span></div><div className="top-note">YOUR EXPLORATION MAP</div></header><section className="report-head"><div className="eyebrow"><Sparkles size={15}/> YOUR PATHFINDER REPORT</div><h1>{report?.headline}</h1><p>{report?.summary}</p></section>{demo&&<div className="demo-banner">You’re seeing a sample report. Add your Google AI Studio key to generate a fully personalised one.</div>}<div className="report-grid"><section className="report-main"><div className="section-heading"><span className="section-number">01</span><div><h2>Paths to explore</h2><p>Think of these as doors to peek through, not decisions to make.</p></div></div><div className="area-list">{report?.areas?.map((area,i)=><article className="area-card" key={i}><div className={`area-index c${i}`}>0{i+1}</div><div className="area-content"><h3>{area.title}</h3><p>{area.why}</p><div className="career-chips">{area.careers?.map(c=><span key={c}>{c}</span>)}</div></div><ArrowUpRight className="area-arrow" size={18}/></article>)}</div><div className="section-heading strengths-heading"><span className="section-number">02</span><div><h2>Things you bring</h2><p>These strengths showed up in what you told us.</p></div></div><div className="strength-list">{report?.strengths?.map((s,i)=><div className="strength-item" key={s}><span>{['✳','↗','◎','✦'][i%4]}</span>{s}</div>)}</div></section><aside className="report-aside"><div className="try-card"><div className="try-top"><span className="try-icon"><Lightbulb size={18}/></span><span className="mini-label">YOUR NEXT LITTLE STEPS</span></div><h2>Curiosity looks good on you.</h2><div className="try-list">{report?.tryNext?.map((item,i)=><div key={i}><span>{i+1}</span><p>{item}</p></div>)}</div></div><div className="gentle-note"><Heart size={17}/><p>{report?.note || 'You do not need to figure everything out today. Stay curious.'}</p></div></aside></div><div className="report-end"><span>THIS IS A STARTING POINT. YOUR STORY IS STILL BEING WRITTEN.</span><button className="text-button" onClick={restart}>Start over <ArrowRight size={15}/></button></div></main>;

  const baseIndex = stage === 'base' ? index : 10 + index;
  return <main className="app-shell survey-shell"><header className="topbar"><button className="back-button" onClick={back} aria-label="Go back"><ArrowLeft size={19}/></button><div className="brand"><span className="brand-icon"><Compass size={18}/></span> pathfinder<span className="brand-dot">.</span></div><div className="question-count">{String(baseIndex+1).padStart(2,'0')} <span>/ 15</span></div></header><div className="progress-track"><div className="progress-fill" style={{width:`${progress}%`}}/></div><section className="question-wrap"><div className="question-kicker"><span>{stage==='base'?'GETTING TO KNOW YOU':'A FEW MORE, JUST FOR YOU'}</span><span>✦</span></div><div className="question-copy"><div className="q-number">{String(baseIndex+1).padStart(2,'0')}</div><div><div className="question-purpose">{active?.purpose}</div><h1>{active?.title}</h1>{active?.type==='multi'&&<p className="select-hint">Pick all that feel right to you.</p>}</div></div><div className={`answer-list ${active?.type==='multi'?'multi':''}`}>{active?.type==='text'?<textarea rows="5" maxLength="600" placeholder="Take your time — a few words is plenty." value={answers[active.id]||''} onChange={e=>updateAnswer(e.target.value)}/>:active?.options?.map((option,i)=>{const chosen=active.type==='multi'?(answers[active.id]||[]).includes(option):answers[active.id]===option;return <button className={`answer-option ${chosen?'chosen':''}`} key={option} onClick={()=>toggleOption(option)}><span className="option-letter">{String.fromCharCode(65+i)}</span><span className="option-text">{option}</span><span className="option-check">{chosen&&<Check size={15}/>}</span></button>})}</div>{active?.textOption!==undefined&&active.options&&((Array.isArray(active.textOption)&&active.textOption.includes(active.options.indexOf(answers[active.id])))||active.options.indexOf(answers[active.id])===active.textOption)&&<div className="conditional-field"><label>{active.textPrompt||'Tell us a little more (optional)'}</label><input maxLength="300" placeholder="A few words is enough" value={answers[`${active.id}_detail`]||''} onChange={e=>setAnswers({...answers,[`${active.id}_detail`]:e.target.value})}/></div>}<div className="question-footer">{error&&<p className="error-msg">{error}</p>}<div className="question-foot-note"><LockKeyhole size={13}/> No wrong answers. Skip the overthinking.</div><button className="primary-button" disabled={busy} onClick={advance}>{busy?<><span className="spinner"/> {stage==='base'?'Finding your next questions…':'Putting your report together…'}</>:<>{stage==='followup'&&index===followups.length-1?'See my report':'Continue'} <ArrowRight size={17}/></>}</button></div></section><div className="survey-bottom"><span>GO AT YOUR OWN PACE</span><div className="step-dots">{Array.from({length:15},(_,i)=><i key={i} className={i<=baseIndex?'active':''}/>)}</div></div></main>;
}

createRoot(document.getElementById('root')).render(<App/>);
