import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, Compass, Heart, Leaf, Lightbulb, LockKeyhole, Sparkles, Star } from 'lucide-react';
import { questions } from './questions';
import './styles.css';
import Report from './Report';

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
  const [evidence, setEvidence] = useState([]);
  const [demo, setDemo] = useState(false);
  const [profile, setProfile] = useState(null);
  const [notice, setNotice] = useState('');
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const activeQuestions = stage === 'base' ? questions : followups;
  const active = activeQuestions[index];
  const showDetail = active && active.options?.some((option, i) => (Array.isArray(active.textOption) ? active.textOption.includes(i) : i === active.textOption) && (Array.isArray(answers[active.id]) ? answers[active.id].includes(option) : answers[active.id] === option));
  const progress = stage === 'base' ? ((index + 1) / 15) * 100 : (10 + index + 1) / 15 * 100;

  function updateAnswer(value) {
    setAnswers(current => ({ ...current, [active.id]: value }));
  }
  function toggleOption(option) {
    const current = answers[active.id];
    if (active.type === 'multi' || active.type === 'ranked') {
      const list = Array.isArray(current) ? current : [];
      updateAnswer(list.includes(option) ? list.filter(item => item !== option) : (list.length < 2 ? [...list, option] : list));
    } else updateAnswer(current === option ? '' : option);
  }
  const isAnswered = active && (active.type === 'text' || (Array.isArray(answers[active.id]) ? answers[active.id].length > 0 : Boolean(answers[active.id])));

  const anonymousAnswers = Object.fromEntries([...questions, ...followups].filter(q => answers[q.id] !== undefined).map(q => [q.id, answers[q.id]]));

  async function advance() {
    setError('');
    if (busy) return;
    if (!isAnswered) { setError(active.type === 'text' ? 'Add a little answer to continue.' : 'Choose at least one answer to continue.'); return; }
    if (index < activeQuestions.length - 1) { setIndex(index + 1); return; }
    if (stage === 'base') {
      setBusy(true);
      try {
        const response = await fetch('/api/followups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answers: anonymousAnswers, student: {grade:student.grade} }) });
        const data = await readApiResponse(response);
        if (!response.ok || data.error) throw new Error(data.error || 'Could not make the next questions.');
        setFollowups(data.questions); setNotice(data.notice || ''); setIndex(0); setStage('followup');
      } catch (e) { setError(e.message); }
      setBusy(false); return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answers: anonymousAnswers, student: {grade:student.grade} }) });
      const data = await readApiResponse(response);
      if (!response.ok || data.error) throw new Error(data.error || 'Could not create your report.');
      setProfile(data.profile); setNotice(data.notice || ''); setEvidence(data.evidence || []); setReport(data.report); setDemo(data.source === 'local'); setStage('report');
    } catch (e) { setError(e.message); }
    setBusy(false);
  }

  function back() {
    setError('');
    if (busy) return;
    if (index > 0) setIndex(index - 1);
    else if (stage === 'followup') { setStage('base'); setIndex(9); }
    else if (stage === 'base') { setStage('welcome'); setIndex(0); }
  }

  function restart() { setStage('welcome'); setAnswers({}); setFollowups([]); setReport(null); setIndex(0); setError(''); }

  if (stage === 'welcome') return <main className="app-shell welcome-shell"><header className="topbar"><div className="brand"><span className="brand-icon"><Compass size={18}/></span> pathfinder<span className="brand-dot">.</span></div><div className="top-note"><span className="live-dot"/> YOUR FUTURE, YOUR WAY</div></header><section className="hero"><div className="hero-copy"><div className="eyebrow"><Sparkles size={15}/> A LITTLE MORE YOU</div><h1>Your next big idea<br/>starts <em>here.</em></h1><p className="hero-lede">A thoughtful little journey to discover what makes you tick — and explore where it might take you.</p><div className="hero-perks"><div><span className="perk-icon mint"><Compass size={17}/></span><span><b>15 questions</b><small>About 5 minutes</small></span></div><div><span className="perk-icon peach"><Lightbulb size={17}/></span><span><b>Made for you</b><small>Personalised along the way</small></span></div><div><span className="perk-icon lilac"><Heart size={17}/></span><span><b>No wrong answers</b><small>Just what feels like you</small></span></div></div></div><div className="hero-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="sun-disc"><div className="sun-core"><Compass size={60} strokeWidth={1.3}/></div></div><div className="float-note note-one"><Star size={14} fill="currentColor"/> Big curiosity</div><div className="float-note note-two"><Leaf size={14}/> Room to grow</div><div className="art-spark spark-one">✦</div><div className="art-spark spark-two">✳</div></div></section><section className="welcome-bottom"><div className="start-card"><div className="start-card-copy"><span className="mini-label">LET'S GET TO KNOW YOU</span><h2>Ready when you are.</h2><p>There’s no timer and no pressure. Your answers help us find ideas worth exploring.</p></div><div className="start-fields"><label>Your name <span>optional</span><input value={student.name} onChange={e => setStudent({...student, name:e.target.value.slice(0,50)})} placeholder="What should we call you?" /></label><label>What grade are you in?<select value={student.grade} onChange={e => setStudent({...student, grade:e.target.value})}><option value="">Choose a grade</option>{Array.from({length:8},(_,i)=><option key={i+5} value={i+5}>Grade {i+5}</option>)}</select></label><button className="primary-button wide" onClick={()=>{if(!student.grade){setError('Choose your grade to get age-appropriate questions.');return;}setError('');setStage('base');setIndex(0)}}>Let’s begin <ArrowRight size={17}/></button></div></div>{error&&<p className="error-msg" role="alert">{error}</p>}<div className="privacy-note"><LockKeyhole size={13}/> Only selected options and your grade band go to AI. Names and written notes stay here; please leave personal details out of notes.</div></section><footer className="footer"><span>MADE FOR THE CURIOUS, AGES 10–18</span><span>ONE QUESTION AT A TIME · NO PRESSURE</span></footer></main>;

  if (stage === 'report') return <Report report={report} evidence={evidence} profile={profile} notice={notice} demo={demo} restart={restart}/>;

  const baseIndex = stage === 'base' ? index : 10 + index;
  return <main className="app-shell survey-shell"><header className="topbar"><button className="back-button" onClick={back} aria-label="Go back"><ArrowLeft size={19}/></button><div className="brand"><span className="brand-icon"><Compass size={18}/></span> pathfinder<span className="brand-dot">.</span></div><div className="question-count">{String(baseIndex+1).padStart(2,'0')} <span>/ 15</span></div></header><div className="progress-track"><div className="progress-fill" style={{width:`${progress}%`}}/></div><section className="question-wrap">{notice&&<p className="flow-notice" role="status">{notice}</p>}<div className="question-kicker"><span>{stage==='base'?'GETTING TO KNOW YOU':'A FEW MORE, JUST FOR YOU'}</span><span>✦</span></div><div className="question-copy"><div className="q-number">{String(baseIndex+1).padStart(2,'0')}</div><div><div className="question-purpose">{active?.purpose}</div><h1>{active?.title}</h1>{active?.type==='ranked'&&<p className="select-hint">Pick your first choice, then an optional second. Tap a choice again to remove it.</p>}</div></div><div className={`answer-list ${active?.type==='multi'?'multi':''}`}>{active?.type==='text'?<textarea rows="5" maxLength="600" placeholder="Take your time — a few words is plenty." value={answers[active.id]||''} onChange={e=>updateAnswer(e.target.value)}/>:active?.options?.map((option,i)=>{const chosen=(active.type==='multi'||active.type==='ranked')?(answers[active.id]||[]).includes(option):answers[active.id]===option;return <button className={`answer-option ${chosen?'chosen':''}`} key={option} aria-pressed={chosen} disabled={busy} onClick={()=>toggleOption(option)}><span className="option-letter">{String.fromCharCode(65+i)}</span><span className="option-text">{option}</span><span className="option-check">{chosen&&(active.type==='ranked' ? (answers[active.id]||[]).indexOf(option)+1 : <Check size={15}/>)}</span></button>})}</div>{showDetail&&<div className="conditional-field"><label>{(active.textPrompt||'Tell us a little more (optional)') + ' — private note, not used by AI'}</label><input maxLength="300" placeholder="A few words is enough" value={answers[`${active.id}_detail`]||''} onChange={e=>setAnswers({...answers,[`${active.id}_detail`]:e.target.value})}/></div>}<div className="question-footer">{error&&<p className="error-msg">{error}</p>}<div className="question-foot-note"><LockKeyhole size={13}/> No wrong answers. Skip the overthinking.</div><button className="primary-button" disabled={busy} onClick={advance}>{busy?<><span className="spinner"/> {stage==='base'?'Finding your next questions…':'Putting your report together…'}</>:<>{stage==='followup'&&index===followups.length-1?'See my report':'Continue'} <ArrowRight size={17}/></>}</button></div></section><div className="survey-bottom"><span>GO AT YOUR OWN PACE</span><div className="step-dots">{Array.from({length:15},(_,i)=><i key={i} className={i<=baseIndex?'active':''}/>)}</div></div></main>;
}

createRoot(document.getElementById('root')).render(<App/>);
