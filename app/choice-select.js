'use client';
import {Children,forwardRef,isValidElement,useEffect,useId,useImperativeHandle,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Check,ChevronDown} from 'lucide-react';

const ChoiceSelect=forwardRef(function ChoiceSelect({label,children,options,onChange,value,defaultValue='',className='',disabled=false,required=false,name,align='start',...rest},forwardedRef){
 const choices=options||Children.toArray(children).filter(child=>isValidElement(child)&&child.type==='option').map(child=>({value:child.props.value,label:child.props.children,disabled:child.props.disabled}));
 const [internalValue,setInternalValue]=useState(defaultValue),[open,setOpen]=useState(false),[active,setActive]=useState(0),[position,setPosition]=useState({});
 const root=useRef(null),trigger=useRef(null),menu=useRef(null),id=useId();
 useImperativeHandle(forwardedRef,()=>trigger.current);
 const current=value===undefined?internalValue:value;
 const selected=choices.findIndex(option=>String(option.value)===String(current));
 const selectedLabel=choices[selected]?.label||choices[0]?.label||'Choose…';
 const accessibleLabel=label||rest['aria-label'];
 function place(){
  if(!trigger.current)return;
  const rect=trigger.current.getBoundingClientRect();
  const width=Math.min(window.innerWidth-24,Math.max(rect.width,Math.min(240,window.innerWidth-24)));
  const height=Math.min(320,choices.length*42+10,window.innerHeight-24);
  const left=align==='end'?rect.right-width:rect.left;
  setPosition({width,left:Math.max(12,Math.min(left,window.innerWidth-width-12)),top:rect.bottom+height+6>window.innerHeight&&rect.top>height+18?rect.top-height-6:Math.min(rect.bottom+6,window.innerHeight-height-12),maxHeight:Math.max(80,window.innerHeight-24)});
 }
 function show(){if(disabled||!choices.length)return;place();setActive(Math.max(0,selected));setOpen(true);}
 function choose(index){
  if(!choices[index]||choices[index].disabled)return;
  const next=choices[index].value;
  if(value===undefined)setInternalValue(next);
  if(options)onChange?.(next);else onChange?.({target:{value:next}});
  setOpen(false);trigger.current?.focus({preventScroll:true});
 }
 useEffect(()=>{
  if(!open)return;
  function outside(event){if(!root.current?.contains(event.target)&&!menu.current?.contains(event.target))setOpen(false);}
  function escape(event){if(event.key==='Escape'){event.preventDefault();event.stopPropagation();setOpen(false);trigger.current?.focus({preventScroll:true});}}
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
  window.addEventListener('resize',place);window.addEventListener('scroll',place,true);
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true);};
 },[open,choices.length]);
 useEffect(()=>{
  if(!open)return;
  const option=menu.current?.children[active],container=menu.current;
  if(!option||!container)return;
  const item=option.getBoundingClientRect(),bounds=container.getBoundingClientRect();
  if(item.top<bounds.top)container.scrollTop-=bounds.top-item.top;
  else if(item.bottom>bounds.bottom)container.scrollTop+=item.bottom-bounds.bottom;
 },[active,open]);
 function keydown(event){
  if(event.key==='Tab'){setOpen(false);return;}
  if(['ArrowDown','ArrowUp'].includes(event.key)){
   event.preventDefault();
   if(!open){show();return;}
   setActive(index=>(index+(event.key==='ArrowDown'?1:-1)+choices.length)%choices.length);
  }else if(event.key==='Home'&&open){event.preventDefault();setActive(0);}
  else if(event.key==='End'&&open){event.preventDefault();setActive(choices.length-1);}
  else if(event.key==='Enter'||event.key===' '){event.preventDefault();if(open)choose(active);else show();}
 }
 return <div className={`choice-select ${className}`} ref={root}>
  <button ref={trigger} id={`${id}-trigger`} type="button" role="combobox" aria-label={accessibleLabel} aria-haspopup="listbox" aria-expanded={open} aria-controls={open?id:undefined} aria-activedescendant={open?`${id}-${active}`:undefined} aria-required={required||undefined} className="choice-trigger" disabled={disabled||!choices.length} onClick={()=>open?setOpen(false):show()} onKeyDown={keydown} onBlur={event=>{if(!menu.current?.contains(event.relatedTarget))setOpen(false);}}><span>{selectedLabel}</span><ChevronDown size={16}/></button>
  {name&&<input type="hidden" name={name} value={current}/>}
  {open&&createPortal(<div ref={menu} id={id} role="listbox" aria-label={accessibleLabel} aria-labelledby={accessibleLabel?undefined:`${id}-trigger`} className="choice-menu" style={position}>{choices.map((option,index)=><button key={option.value} id={`${id}-${index}`} type="button" role="option" tabIndex={-1} aria-selected={index===selected} disabled={option.disabled} className={`choice-option ${active===index?'highlighted':''}`} onPointerDown={event=>event.preventDefault()} onPointerMove={()=>setActive(index)} onClick={()=>choose(index)}><span>{option.label}</span>{index===selected&&<Check size={16}/>}</button>)}</div>,trigger.current?.closest('dialog')||document.body)}
 </div>;
});

export default ChoiceSelect;
