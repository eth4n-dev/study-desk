'use client';
import {useEffect,useRef} from 'react';
import {Search,SlidersHorizontal} from 'lucide-react';
import {useSubjects} from './workspace-context';
import ChoiceSelect from './choice-select';

export default function AssignmentFilters({filter,setFilter,selectedSubject,setSelectedSubject,query,setQuery,tasks,showSubject}){
 const SUBJECTS=useSubjects();
 const disclosure=useRef(null);
 const changed=Number(filter!=='Active')+Number(showSubject&&selectedSubject!=='all')+Number(Boolean(query.trim()));
 useEffect(()=>{
  function closeOutside(event){if(disclosure.current&&!disclosure.current.contains(event.target))disclosure.current.open=false;}
  function closeEscape(event){if(event.key==='Escape'&&disclosure.current?.open){disclosure.current.open=false;disclosure.current.querySelector('summary')?.focus();}}
  document.addEventListener('pointerdown',closeOutside);
  document.addEventListener('keydown',closeEscape);
  return ()=>{document.removeEventListener('pointerdown',closeOutside);document.removeEventListener('keydown',closeEscape);};
 },[]);
 const count=status=>tasks.filter(t=>(selectedSubject==='all'||t.subject===selectedSubject)&&(status==='All'||(status==='Completed'?t.status==='Done':t.status!=='Done'))).length;
 return <details className="assignment-filters" ref={disclosure}>
  <summary aria-label={`Assignment filters${changed?`, ${changed} active`:''}`}><SlidersHorizontal size={15}/><span>Filters</span>{changed>0&&<span className="filter-count">{changed}</span>}</summary>
  <div className="assignment-filter-panel">
   <div><span className="filter-label">Show</span><div className="segmented filter-status" role="group" aria-label="Assignment status">{['Active','All','Completed'].map(status=><button key={status} className={filter===status?'selected':''} aria-label={`${status} assignments, ${count(status)}`} aria-pressed={filter===status} onClick={()=>setFilter(status)}>{status}<span>{count(status)}</span></button>)}</div></div>
   {showSubject&&<label>Subject<ChoiceSelect aria-label="Filter assignments by subject" value={selectedSubject} onChange={event=>setSelectedSubject(event.target.value)}><option value="all">All subjects</option>{SUBJECTS.map(s=><option key={s.id} value={s.id}>{s.short}</option>)}</ChoiceSelect></label>}
   <label>Search assignments<span className="search"><Search size={15}/><input aria-label="Search assignments" placeholder="Find an assignment…" value={query} onChange={event=>setQuery(event.target.value)}/></span></label>
   {changed>0&&<button className="text-button quiet clear-assignment-filters" onClick={()=>{setFilter('Active');if(showSubject)setSelectedSubject('all');setQuery('');}}>Clear filters</button>}
  </div>
 </details>;
}
