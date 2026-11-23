import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Bell, Check, ChevronDown, CircleHelp, CreditCard, Download,
  Plus, Search, Settings, ShoppingBag, Smartphone, Plane, Laptop, HeartPulse, House,
  Utensils, Tv, Wallet, X, CalendarDays, LogOut, Upload, Pencil, Trash2, Sparkles, Eye, EyeOff
} from 'lucide-react';
import { supabase } from './supabase';

const money = n => new Intl.NumberFormat('en-SG',{style:'currency',currency:'SGD'}).format(Number(n||0));
const icons = [
  ['shopping-bag',ShoppingBag],['laptop',Laptop],['credit-card',CreditCard],['phone',Smartphone],
  ['travel',Plane],['food',Utensils],['health',HeartPulse],['home',House],['subscription',Tv],['wallet',Wallet]
];
const Icon = ({name='wallet',size=20}) => { const C=icons.find(x=>x[0]===name)?.[1]||Wallet; return <C size={size}/>; };
const monthKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
const monthKeyFrom = value => String(value || '').slice(0,7);
const monthLabel = d => d.toLocaleDateString('en-SG',{month:'long',year:'numeric'});
const dateFor = (ym, day=1) => `${ym}-${String(day).padStart(2,'0')}`;
const today = new Date();
const blank = {name:'',category:'shopping-bag',method:'',notes:'',start_month:monthKey(today),due_day:1,schedule_type:'variable',total_amount:'',months:'',amounts:[]};

function App(){
  const [session,setSession]=useState(null), [authReady,setAuthReady]=useState(false);
  const [email,setEmail]=useState(''), [password,setPassword]=useState(''), [authMode,setAuthMode]=useState('signin'), [authMsg,setAuthMsg]=useState('');
  const [showPassword,setShowPassword]=useState(false);
  const [themeMode,setThemeMode]=useState(()=>localStorage.getItem('splitly-theme')||'light');
  const [accentColor,setAccentColor]=useState(()=>localStorage.getItem('splitly-accent')||'#FFB3D0');
  const [displayName,setDisplayName]=useState(''), [avatarEmoji,setAvatarEmoji]=useState('🐼');
  const [profileNameDraft,setProfileNameDraft]=useState(''), [profileAvatarDraft,setProfileAvatarDraft]=useState('🐼'), [profileMsg,setProfileMsg]=useState('');
  const [plans,setPlans]=useState([]), [selected,setSelected]=useState(new Date(today.getFullYear(),today.getMonth(),1));
  const [modal,setModal]=useState(false), [editing,setEditing]=useState(null), [draft,setDraft]=useState(blank);
  const [filter,setFilter]=useState('active'), [sort,setSort]=useState('due'), [search,setSearch]=useState('');
  const [settings,setSettings]=useState(false), [tour,setTour]=useState(false), [tourStep,setTourStep]=useState(0), [busy,setBusy]=useState(false);
  const configured=!!supabase;
  useEffect(()=>{localStorage.setItem('splitly-theme',themeMode);},[themeMode]);
  useEffect(()=>{localStorage.setItem('splitly-accent',accentColor);},[accentColor]);

  useEffect(()=>{
    if(!supabase){setAuthReady(true);return;}
    supabase.auth.getSession().then(({data})=>{setSession(data.session);setAuthReady(true);});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s));
    return ()=>subscription.unsubscribe();
  },[]);
  useEffect(()=>{ if(session) loadPlans(); },[session]);
  useEffect(()=>{
    if(!session?.user) return;
    const metadata=session.user.user_metadata||{};
    const name=metadata.display_name||'';
    const avatar=metadata.avatar_emoji||'🐼';
    setDisplayName(name);setAvatarEmoji(avatar);
    setProfileNameDraft(name);setProfileAvatarDraft(avatar);
  },[session]);
  useEffect(()=>{
    if(!session) return;
    const key=`splitly-tour-${session.user.id}`;
    if(!localStorage.getItem(key)){setTour(true);setTourStep(0);localStorage.setItem(key,'seen');}
  },[session]);

  async function loadPlans(){
    const {data,error}=await supabase.from('installment_plans').select('*, payment_items(*)').order('created_at',{ascending:false});
    if(error){console.error(error);return;}
    setPlans((data||[]).map(p=>({...p,items:(p.payment_items||[]).sort((a,b)=>a.month.localeCompare(b.month))})));
  }
  async function authSubmit(e){
    e.preventDefault();setAuthMsg('');setBusy(true);
    if(!supabase){setAuthMsg('Add your Supabase URL and anon key to .env.local, then restart the app.');setBusy(false);return;}
    const result=authMode==='signin'
      ? await supabase.auth.signInWithPassword({email,password})
      : await supabase.auth.signUp({email,password});
    setBusy(false);
    if(result.error)setAuthMsg(result.error.message);
    else if(authMode==='signup'&&!result.data.session)setAuthMsg('Check your email to confirm your account, then sign in.');
  }
  async function signOut(){await supabase?.auth.signOut();setPlans([]);setSettings(false);}
  async function saveProfile(e){
    e.preventDefault();setProfileMsg('');setBusy(true);
    const name=profileNameDraft.trim();
    if(!name){setProfileMsg('Please enter a display name.');setBusy(false);return;}
    if(!supabase){setProfileMsg('Supabase is not configured.');setBusy(false);return;}
    try{
      const {data:{session:activeSession},error:sessionError}=await supabase.auth.getSession();
      if(sessionError)throw sessionError;
      if(!activeSession){setSession(null);setSettings(false);setAuthMode('signin');setProfileMsg('Your sign-in session has expired. Please sign in again, then save your profile.');setBusy(false);return;}
      const {data,error}=await supabase.auth.updateUser({data:{display_name:name,avatar_emoji:profileAvatarDraft}});
      if(error)throw error;
      setSession(current=>current?{...current,user:data.user||current.user}:current);
      setDisplayName(name);setAvatarEmoji(profileAvatarDraft);setProfileMsg('Profile saved successfully.');
    }catch(error){setProfileMsg(error.message||'Could not save your profile. Please try again.');}
    setBusy(false);
  }
  function openNew(){setEditing(null);setDraft({...blank,months:'',amounts:[]});setModal(true);}
  function openEdit(p){setEditing(p);setDraft({...p,start_month:monthKeyFrom(p.start_month),schedule_type:'variable',amounts:p.items.map(i=>String(i.amount)),months:p.items.length,total_amount:String(p.items.reduce((s,i)=>s+Number(i.amount),0))});setModal(true);}
  function setField(k,v){setDraft(d=>({...d,[k]:v}));}
  function changeMonths(n){
    if(n===''){setDraft(d=>({...d,months:'',amounts:[]}));return;}
    const count=Number(n);
    setDraft(d=>({...d,months:n,amounts:Number.isInteger(count)&&count>=1&&count<=60?Array.from({length:count},(_,i)=>d.amounts[i]??''):[]}));
  }
  function makeSchedule(){
    const count=Number(draft.months);
    if(!Number.isInteger(count)||count<1||count>60)throw Error('Enter how many monthly payments you need (1 to 60).');
    if(draft.schedule_type==='equal'){
      const total=Number(draft.total_amount);
      if(!(total>0))throw Error('Enter a total amount greater than zero.');
      const base=Math.floor((total/count)*100)/100;
      let left=Math.round((total-base*count)*100);
      return Array.from({length:count},(_,i)=>Number((base+(i<left?0.01:0)).toFixed(2)));
    }
    const values=draft.amounts.slice(0,count).map(Number);
    if(values.length!==count||values.some(v=>!Number.isFinite(v)||v<=0))throw Error('Please enter an amount for every month shown.');
    return values;
  }
  async function savePlan(e){
    e.preventDefault();setBusy(true);
    try{
      const amounts=makeSchedule();
      const payload={name:draft.name.trim(),category:draft.category,method:draft.method.trim()||null,notes:draft.notes.trim()||null,start_month:dateFor(draft.start_month,1),due_day:Number(draft.due_day)||1,total_amount:Number(amounts.reduce((a,b)=>a+b,0).toFixed(2))};
      if(!payload.name)throw Error('Please enter a merchant or bill name.');
      if(!supabase)throw Error('Supabase is not configured.');
      let planId=editing?.id;
      if(editing){
        const {error}=await supabase.from('installment_plans').update(payload).eq('id',planId);
        if(error)throw error;
        const {error:delError}=await supabase.from('payment_items').delete().eq('plan_id',planId);
        if(delError)throw delError;
      }else{
        const {data,error}=await supabase.from('installment_plans').insert({...payload,user_id:session.user.id}).select().single();
        if(error)throw error;planId=data.id;
      }
      const start=new Date(`${draft.start_month}-01T12:00:00`);
      const rows=amounts.map((amount,i)=>{const d=new Date(start.getFullYear(),start.getMonth()+i,1);return {plan_id:planId,user_id:session.user.id,month:dateFor(monthKey(d),1),amount,due_date:dateFor(monthKey(d),Math.min(28,Math.max(1,Number(draft.due_day)||1))),paid:false};});
      const {error}=await supabase.from('payment_items').insert(rows);if(error)throw error;
      await loadPlans();setModal(false);
    }catch(err){alert(err.message||'Could not save this plan.');}
    setBusy(false);
  }
  async function togglePaid(item){
    const {error}=await supabase.from('payment_items').update({paid:!item.paid,paid_at:!item.paid?new Date().toISOString():null}).eq('id',item.id);
    if(error){alert(error.message);return;}await loadPlans();
  }
  async function deletePlan(p){
    if(!confirm(`Delete ${p.name} and its payment schedule?`))return;
    const {error}=await supabase.from('installment_plans').delete().eq('id',p.id);
    if(error)alert(error.message);else loadPlans();
  }
  const selectedKey=monthKey(selected);
  const rows=useMemo(()=>plans.flatMap(p=>p.items.map(i=>({...i,plan:p}))).filter(i=>monthKeyFrom(i.month)===selectedKey),[plans,selectedKey]);
  const due=rows.reduce((s,i)=>s+Number(i.amount),0), paid=rows.filter(i=>i.paid).reduce((s,i)=>s+Number(i.amount),0);
  const remaining=plans.filter(p=>p.items.some(i=>!i.paid)).reduce((s,p)=>s+p.items.filter(i=>!i.paid).reduce((a,i)=>a+Number(i.amount),0),0);
  const visible=plans.filter(p=>(filter==='all'||(filter==='active'?p.items.some(i=>!i.paid):p.items.every(i=>i.paid)))&&p.name.toLowerCase().includes(search.toLowerCase()));
  const sorted=[...visible].sort((a,b)=>sort==='merchant'?a.name.localeCompare(b.name):sort==='method'?(a.method||'').localeCompare(b.method||''):Math.min(...a.items.map(i=>new Date(i.due_date).getTime()))-Math.min(...b.items.map(i=>new Date(i.due_date).getTime())));
  const upcoming=rows.filter(i=>!i.paid&&Math.ceil((new Date(i.due_date+'T23:59:59')-new Date())/86400000)>=0&&Math.ceil((new Date(i.due_date+'T23:59:59')-new Date())/86400000)<=5);
  function exportData(){
    const blob=new Blob([JSON.stringify(plans,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='splitly-backup.json';a.click();URL.revokeObjectURL(url);
  }
  async function importData(e){
    const file=e.target.files?.[0];if(!file)return;
    try{const parsed=JSON.parse(await file.text());if(!Array.isArray(parsed))throw Error('Backup must be a Splitly JSON array.');
      for(const p of parsed){const items=p.items||p.payment_items||[];const {data,error}=await supabase.from('installment_plans').insert({user_id:session.user.id,name:p.name,category:p.category||'wallet',method:p.method,notes:p.notes,start_month:p.start_month,due_day:p.due_day||1,total_amount:p.total_amount}).select().single();if(error)throw error;
        if(items.length){const {error:ie}=await supabase.from('payment_items').insert(items.map(i=>({user_id:session.user.id,plan_id:data.id,month:i.month,amount:i.amount,due_date:i.due_date,paid:!!i.paid,paid_at:i.paid_at||null})));if(ie)throw ie;}}
      await loadPlans();alert('Backup imported.');
    }catch(err){alert(`Import failed: ${err.message}`);}e.target.value='';
  }
  if(!authReady)return <div className="loading">Getting Splitly ready…</div>;
  if(!session)return <main className="auth-shell"><div className="auth-card"><div className="brand-mark"><span className="panda">🐼</span></div><p className="eyebrow">A LITTLE MORE PEACE OF MIND</p><h1>Payments, <em>made simpler.</em></h1><p className="muted auth-copy">Keep every installment and bill in one calm, lovely place.</p><form onSubmit={authSubmit}><label>Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="you@example.com"/></label><label>Password<div className="password-field"><input type={showPassword?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} required minLength="6" placeholder="At least 6 characters"/><button type="button" className="password-toggle" aria-label={showPassword?'Hide password':'Show password'} onClick={()=>setShowPassword(v=>!v)}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label><button className="primary full" disabled={busy}>{busy?'Please wait…':authMode==='signin'?'Sign in':'Create account'}</button></form>{authMsg&&<p className="message">{authMsg}</p>}<p className="switch-auth">{authMode==='signin'?'New to Splitly?':'Already have an account?'} <button className="text-button" onClick={()=>{setAuthMode(authMode==='signin'?'signup':'signin');setAuthMsg('');}}>{authMode==='signin'?'Create an account':'Sign in'}</button></p>{!configured&&<p className="setup-hint">Setup needed: configure <code>.env.local</code> with your Supabase project credentials.</p>}</div><p className="auth-footer">Made for the little things that add up.</p></main>;

  return <div className={"app-shell "+(themeMode==="dark"?"theme-dark":"theme-light")} style={{"--accent":accentColor,"--accent-soft":accentColor+"26"}}>
    <header className="topbar"><div className="brand"><span className="brand-panda">🐼</span><span>splitly<span className="brand-dot">.</span></span></div><div className="header-actions"><button className="icon-button help" aria-label="Help tour" onClick={()=>{setTour(true);setTourStep(0);}}><CircleHelp size={19}/></button><button className="icon-button" aria-label="Settings" onClick={()=>setSettings(true)}><Settings size={19}/></button><button className="avatar" onClick={()=>setSettings(true)} title="Open profile settings" aria-label="Open profile settings">{avatarEmoji}</button></div></header>
    <main className="main-content">
      <section className="welcome-row"><div><p className="eyebrow">YOUR LITTLE MONEY SPACE</p><h1>Hey{(displayName||session?.user?.email?.split('@')[0])?`, ${(displayName||session.user.email.split('@')[0]).split(/[._-]/)[0]}`:', welcome back'} <span>♡</span></h1><p className="muted">One step at a time. You’ve got this.</p></div><button className="primary add-top" onClick={openNew}><Plus size={18}/> Add a plan</button></section>
      <section className="month-control"><button className="icon-button" onClick={()=>setSelected(new Date(selected.getFullYear(),selected.getMonth()-1,1))} aria-label="Previous month"><ArrowLeft size={18}/></button><div><span className="month-caption">MONTHLY OVERVIEW</span><strong>{monthLabel(selected)}</strong></div><button className="icon-button" onClick={()=>setSelected(new Date(selected.getFullYear(),selected.getMonth()+1,1))} aria-label="Next month"><ArrowRight size={18}/></button><button className="today-button" onClick={()=>setSelected(new Date(today.getFullYear(),today.getMonth(),1))}>Today</button></section>
      <section className="summary-grid">
        <article className="summary-card blush"><span className="summary-icon"><CalendarDays size={19}/></span><p>Due this month</p><h2>{money(due)}</h2><div className="summary-foot"><span className="paid-dot"/> {money(paid)} paid <span className="separator">·</span> {money(due-paid)} unpaid</div></article>
        <article className="summary-card mint"><span className="summary-icon"><Wallet size={19}/></span><p>Remaining balance</p><h2>{money(remaining)}</h2><div className="summary-foot">Across all unpaid payments</div></article>
        <article className="summary-card cream"><span className="summary-icon"><Bell size={19}/></span><p>Due in the next 5 days</p><h2>{upcoming.length}</h2><div className="summary-foot">{upcoming.length===1?'payment needs':'payments need'} a little attention</div></article>
      </section>
      {upcoming.length>0&&<section className="alert-strip"><Bell size={17}/><span><strong>{upcoming.length} upcoming {upcoming.length===1?'payment':'payments'}</strong> due within 5 days this month.</span></section>}
      <section className="plans-heading"><div><p className="eyebrow">YOUR PAYMENT LIST</p><h2>Installments & bills</h2></div><div className="list-tools"><div className="searchbox"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search plans"/></div><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="active">Active</option><option value="completed">Completed</option><option value="all">All plans</option></select><select value={sort} onChange={e=>setSort(e.target.value)}><option value="due">Sort: due date</option><option value="merchant">Sort: merchant</option><option value="method">Sort: payment method</option></select></div></section>
      {sorted.length===0?<div className="empty-state"><div className="empty-illustration">🐼</div><h3>{plans.length?'No plans match this view':'Your list is looking lovely and empty.'}</h3><p className="muted">{plans.length?'Try another filter or search term.':'Add your first installment or bill to get started.'}</p>{!plans.length&&<button className="primary" onClick={openNew}><Plus size={17}/> Add your first plan</button>}</div>:<div className="plan-grid">{sorted.map(p=>{
        const all=p.items.length,done=p.items.filter(i=>i.paid).length,next=p.items.find(i=>!i.paid),current=p.items.find(i=>monthKeyFrom(i.month)===selectedKey);
        const days=next?Math.ceil((new Date(next.due_date+'T23:59:59')-new Date())/86400000):null;
        return <article className="plan-card" key={p.id}><div className="plan-top"><div className="merchant-icon"><Icon name={p.category}/></div><div className="plan-title"><h3>{p.name}</h3><p>{p.method||'Payment plan'}{p.notes?` · ${p.notes}`:''}</p></div><button className="more-button" onClick={()=>openEdit(p)} aria-label={`Edit ${p.name}`}><Pencil size={16}/></button></div><div className="plan-amount-row"><div><span className="mini-label">THIS MONTH</span><strong>{current?money(current.amount):'—'}</strong></div><div className="next-due">{next?<><span className="mini-label">NEXT DUE</span><strong>{new Date(next.due_date+'T12:00:00').toLocaleDateString('en-SG',{day:'numeric',month:'short'})}</strong>{days!==null&&days>=0&&days<=5&&!next.paid&&<span className="due-badge">Due soon</span>}</>:<span className="completed-label"><Check size={14}/> Completed</span>}</div></div><div className="progress-meta"><span>{done} of {all} paid</span><span>{Math.round(done/all*100)}%</span></div><div className="progress-track"><div className="progress-fill" style={{width:`${done/all*100}%`}}/></div><div className="installment-list">{p.items.slice(0,4).map(i=><button className={`installment-chip ${i.paid?'is-paid':''}`} key={i.id} onClick={()=>togglePaid(i)} title={`${i.month}: ${money(i.amount)}`}><span>{new Date(`${monthKeyFrom(i.month)}-01T12:00:00`).toLocaleDateString('en-SG',{month:'short'})}</span><strong>{money(i.amount)}</strong><span className="chip-check">{i.paid?<Check size={13}/>:<span className="empty-check"/>}</span></button>)}{p.items.length>4&&<span className="more-months">+{p.items.length-4} months</span>}</div><div className="card-bottom"><span>{money(p.items.filter(i=>!i.paid).reduce((s,i)=>s+Number(i.amount),0))} remaining</span><button className="delete-link" onClick={()=>deletePlan(p)}><Trash2 size={14}/> Delete</button></div></article>
      })}</div>}
      <footer className="footer-note">A little more organised, one payment at a time <span>♡</span></footer>
    </main>
    {modal&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(false);}}><form className="modal-card plan-form" onSubmit={savePlan}><div className="modal-head"><div><p className="eyebrow">{editing?'MAKE A CHANGE':'ADD SOMETHING NEW'}</p><h2>{editing?'Edit payment plan':'New installment or bill'}</h2></div><button type="button" className="icon-button" onClick={()=>setModal(false)}><X size={19}/></button></div><label>Merchant or bill name<input value={draft.name} onChange={e=>setField('name',e.target.value)} required placeholder="e.g. iPhone, SP Utilities"/></label><label>Choose an icon</label><div className="icon-picker">{icons.map(([id,C])=><button type="button" key={id} className={draft.category===id?'selected':''} onClick={()=>setField('category',id)} title={id}><C size={19}/></button>)}</div><div className="form-row"><label>Payment method / provider<input value={draft.method||''} onChange={e=>setField('method',e.target.value)} placeholder="e.g. Atome, DBS Visa"/></label><label>Due day<input type="number" min="1" max="28" inputMode="numeric" value={draft.due_day||1} onChange={e=>setField('due_day',e.target.value)} placeholder="e.g. 10"/><span className="field-hint">Enter the day number only. For a bill due on 10 December, enter 10. It repeats each month.</span></label></div><label>First payment month<input type="month" value={draft.start_month} onChange={e=>setField('start_month',e.target.value)} required/></label><label>How do you want to enter the payments?</label><div className="segmented"><button type="button" className={draft.schedule_type==='variable'?'active':''} onClick={()=>setField('schedule_type','variable')}>Different amount each month</button><button type="button" className={draft.schedule_type==='equal'?'active':''} onClick={()=>setField('schedule_type','equal')}>Same amount each month</button></div>{draft.schedule_type==='equal'?<><div className="form-row"><label>Total amount (S$)<input type="number" min="0.01" step="0.01" value={draft.total_amount} onChange={e=>setField('total_amount',e.target.value)} placeholder="e.g. 600" required/></label><label>Number of monthly payments<input type="number" min="1" max="60" value={draft.months} onChange={e=>changeMonths(e.target.value)} placeholder="e.g. 12" required/></label></div>{Number(draft.total_amount)>0&&Number(draft.months)>0&&<p className="calculation-note">That works out to about {money(Number(draft.total_amount)/Number(draft.months))} each month. We’ll split the total for you.</p>}</>:<><label>How many monthly payments? <span className="optional">(1–60)</span><input type="number" min="1" max="60" step="1" inputMode="numeric" value={draft.months} onChange={e=>changeMonths(e.target.value)} placeholder="Type a number, e.g. 12" required/></label><p className="schedule-help">Once you enter the number of months, a separate amount box will appear for every month below.</p>{Number(draft.months)>=1&&Number(draft.months)<=60&&Number.isInteger(Number(draft.months))&&<><div className="amount-grid">{Array.from({length:Number(draft.months)||0},(_,i)=>draft.amounts[i]??'').map((amount,i)=><label key={i}><span>Payment {i+1} · {new Date(new Date(`${draft.start_month}-01T12:00:00`).getFullYear(),new Date(`${draft.start_month}-01T12:00:00`).getMonth()+i,1).toLocaleDateString('en-SG',{month:'short',year:'numeric'})}</span><input type="number" min="0.01" step="0.01" inputMode="decimal" value={amount} onChange={e=>setField('amounts',Array.from({length:Number(draft.months)||0},(_,j)=>j===i?e.target.value:(draft.amounts[j]??'')))} placeholder="Enter amount (S$)" required/></label>)}</div><p className="calculation-note">Total of your monthly amounts: {money(draft.amounts.reduce((s,v)=>s+(Number(v)||0),0))}</p></>}</>}<label>Notes <span className="optional">(optional)</span><textarea rows="2" value={draft.notes||''} onChange={e=>setField('notes',e.target.value)} placeholder="A little detail to help you remember…"/></label><button className="primary full" disabled={busy}>{busy?'Saving…':editing?'Save changes':'Add to Splitly'}</button></form></div>}
    {settings&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setSettings(false);}}><div className="modal-card settings-card"><div className="modal-head"><div><p className="eyebrow">YOUR SPACE</p><h2>Profile & settings</h2></div><button className="icon-button" onClick={()=>setSettings(false)}><X size={19}/></button></div><form className="profile-editor" onSubmit={saveProfile}><div className="profile-preview"><span>{profileAvatarDraft}</span><div><strong>{profileNameDraft.trim()||'Your name'}</strong><small>Your Splitly profile</small></div></div><label>Display name<input value={profileNameDraft} onChange={e=>setProfileNameDraft(e.target.value)} maxLength="40" placeholder="What should we call you?"/></label><label>Choose your avatar</label><div className="avatar-picker">{['🐼','🐻','🐰','🐱','🐸','🦊','🐨','🐧','🌷','💗','⭐','🍓'].map(emoji=><button type="button" key={emoji} className={profileAvatarDraft===emoji?'selected':''} onClick={()=>setProfileAvatarDraft(emoji)} aria-label={`Choose ${emoji}`}>{emoji}</button>)}</div><button className="primary full" type="submit" disabled={busy}>{busy?"Saving…":"Save profile"}</button>{profileMsg&&<p className="profile-message">{profileMsg}</p>}</form><div className="settings-divider"/><section className="appearance-settings"><p className="eyebrow">MAKE IT YOURS</p><h3>Appearance</h3><span className="appearance-label">Colour mode</span><div className="appearance-toggle"><button type="button" className={themeMode==='light'?'active':''} onClick={()=>setThemeMode('light')}>☀️ Light</button><button type="button" className={themeMode==='dark'?'active':''} onClick={()=>setThemeMode('dark')}>🌙 Dark</button></div><span className="appearance-label">Accent colour</span><div className="accent-options">{['#FFB3D0','#B9A7F5','#A9D8F2','#A8DDBB','#FFC58F','#F08E91','#9CB7E8','#B7A1A0'].map(color=><button type="button" key={color} className={accentColor.toLowerCase()===color.toLowerCase()?'selected':''} style={{'--swatch':color}} onClick={()=>setAccentColor(color)} aria-label={'Use '+color+' accent'}/>)}</div><label className="custom-accent">Or choose any colour<input type="color" value={accentColor} onChange={e=>setAccentColor(e.target.value)}/></label></section><div className="settings-divider"/><p className="muted">Keep a copy of your payment records, just in case.</p><button className="setting-action" onClick={exportData}><Download size={18}/> Export all plans as JSON</button><label className="setting-action upload-action"><Upload size={18}/> Import a Splitly JSON backup<input type="file" accept="application/json,.json" onChange={importData}/></label><button className="setting-action" onClick={()=>{setSettings(false);setTour(true);setTourStep(0);}}><CircleHelp size={18}/> Replay the quick tour</button><button className="setting-action signout" onClick={signOut}><LogOut size={18}/> Sign out</button><p className="setup-hint">Your data is stored in your private Supabase account. Keep exported backups somewhere safe.</p></div></div>}
    {tour&&<div className="tour-backdrop"><div className="tour-card"><div className="tour-top"><span className="tour-count">A QUICK TOUR · {tourStep+1} OF 4</span><button className="icon-button" onClick={()=>setTour(false)}><X size={18}/></button></div><div className="tour-emoji">{['💗','🧾','🌱','🗓️'][tourStep]}</div><h2>{['See your monthly picture','Add your payment amounts','Mark each payment as paid','Look a little further ahead'][tourStep]}</h2><p>{['Your monthly overview shows what is due, what you have paid, and what is still left to pay.','Add the bill name and first payment month. Choose “Different amount each month”, enter how many payments you have, then fill in each month’s amount.','Tap a payment on a plan when you have paid it. Your progress updates automatically.','Use the arrows beside the month to see what is coming up next.'][tourStep]}</p><div className="tour-dots">{[0,1,2,3].map(i=><span className={i===tourStep?'active':''} key={i}/>)}</div><div className="tour-actions"><button className="text-button" onClick={()=>setTour(false)}>Skip tour</button><button className="primary" onClick={()=>{if(tourStep===3)setTour(false);else setTourStep(s=>s+1);}}>{tourStep===3?'Let’s go':'Next'} <ArrowRight size={16}/></button></div></div></div>}
  </div>;
}
export default App;
