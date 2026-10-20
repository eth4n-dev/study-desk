'use client';
import {createContext,useContext,useEffect,useState} from 'react';
import {LANGUAGES,LANGUAGE_STORAGE_KEY,normalizeLanguage,setLanguage,translate} from '../lib/i18n.mjs';
import ChoiceSelect from './choice-select';

const LanguageContext=createContext({language:'en',changeLanguage:()=>{}});
const translatedText=new WeakMap();
const translatedAttributes=new WeakMap();
const attributes=['aria-label','placeholder','title'];

function localizeText(node,language){
 if(!node?.parentElement||node.parentElement.closest('[translate="no"], [contenteditable="true"], script, style'))return;
 const previous=translatedText.get(node);
 const raw=previous&&node.nodeValue===previous.result?previous.raw:node.nodeValue;
 const match=raw.match(/^(\s*)([\s\S]*?)(\s*)$/);
 if(!match)return;
 const result=match[1]+translate(match[2],language)+match[3];
 translatedText.set(node,{raw,result});
 if(node.nodeValue!==result)node.nodeValue=result;
}

function localizeAttributes(element,language){
 if(element.closest('[translate="no"]'))return;
 const previous=translatedAttributes.get(element)||{};
 const next={...previous};
 for(const name of attributes){
  const value=element.getAttribute(name);
  if(value===null)continue;
  const raw=previous[name]&&value===previous[name].result?previous[name].raw:value;
  const result=translate(raw,language);
  next[name]={raw,result};
  if(value!==result)element.setAttribute(name,result);
 }
 translatedAttributes.set(element,next);
}

function localizeTree(root,language){
 if(root.nodeType===Node.TEXT_NODE){localizeText(root,language);return;}
 if(root.nodeType!==Node.ELEMENT_NODE&&root.nodeType!==Node.DOCUMENT_NODE)return;
 if(root.nodeType===Node.ELEMENT_NODE)localizeAttributes(root,language);
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT);
 while(walker.nextNode()){
  const node=walker.currentNode;
  if(node.nodeType===Node.TEXT_NODE)localizeText(node,language);
  else localizeAttributes(node,language);
 }
}

export function LanguageProvider({children}){
 const [language,updateLanguage]=useState('en');
 useEffect(()=>{
  let saved='en';
  try{saved=normalizeLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY));}catch{}
  setLanguage(saved);updateLanguage(saved);
 },[]);
 useEffect(()=>{
  document.documentElement.lang=language;
  setLanguage(language);
  localizeTree(document.body,language);
  const observer=new MutationObserver(changes=>{
   for(const change of changes){
    if(change.type==='characterData')localizeText(change.target,language);
    else if(change.type==='attributes')localizeAttributes(change.target,language);
    else for(const node of change.addedNodes)localizeTree(node,language);
   }
  });
  observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:attributes});
  return()=>observer.disconnect();
 },[language]);
 function changeLanguage(value){
  const next=normalizeLanguage(value);
  setLanguage(next);
  updateLanguage(next);
  try{localStorage.setItem(LANGUAGE_STORAGE_KEY,next);}catch{}
 }
 return <LanguageContext.Provider value={{language,changeLanguage,languages:LANGUAGES}}>{children}</LanguageContext.Provider>;
}

export function useLanguage(){return useContext(LanguageContext);}

export function LanguageSettings(){
 const {language,changeLanguage}=useLanguage();
 return <section className="settings-section language-section"><div className="section-heading"><h2>Language</h2></div><p>Choose the language used for menus, dates, and controls. Your subjects and assignment names stay as you entered them.</p><div className="language-choice"><span>App language</span><ChoiceSelect label="App language" value={language} onChange={changeLanguage} options={LANGUAGES.map(item=>({value:item.code,label:item.name}))} className="language-selector"/></div></section>;
}
