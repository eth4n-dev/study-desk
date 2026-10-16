'use client';
import {createContext,useContext} from 'react';
import {subject as findSubject} from '../lib/model.mjs';

const SubjectsContext=createContext([]);
export function SubjectsProvider({subjects,children}){
 return <SubjectsContext.Provider value={subjects||[]}>{children}</SubjectsContext.Provider>;
}
export function useSubjects(){return useContext(SubjectsContext);}
export function useSubjectLookup(){
 const subjects=useSubjects();
 return id=>findSubject(id,subjects);
}
