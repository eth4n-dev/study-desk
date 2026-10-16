import {addDays,monday,weekSlots,scheduleSlots,isUnattended} from './model.mjs';

export const PLAN_START=7*60;
export const PLAN_END=24*60;
export const PLAN_STEP=15;
export const PLAN_MIN=30;
export const PLAN_DEFAULT=60;

export const planDates=week=>Array.from({length:7},(_,i)=>addDays(monday(week),i));
export const snapPlan=minutes=>Math.round(minutes/PLAN_STEP)*PLAN_STEP;
export const clampPlanStart=(start,duration)=>Math.max(PLAN_START,Math.min(PLAN_END-duration,snapPlan(start)));
export const planOverlaps=(a,b)=>a.date===b.date&&a.start<b.start+b.duration&&b.start<a.start+a.duration;
export function resizePlanBlock(block,edge,deltaMinutes){
 const delta=snapPlan(deltaMinutes),end=block.start+block.duration;
 if(edge==='start'){
  const start=Math.max(PLAN_START,Math.min(end-PLAN_MIN,block.start+delta));
  return {...block,start,duration:end-start};
 }
 const duration=Math.max(PLAN_MIN,Math.min(PLAN_END-block.start,block.duration+delta));
 return {...block,duration};
}

export function canPlacePlan(candidate,blocks,week,excludeId=null,unattendedSlots=[],scheduleState=null){
 if(!candidate||!planDates(week).includes(candidate.date)||!Number.isInteger(candidate.start)||!Number.isInteger(candidate.duration)||candidate.start<PLAN_START||candidate.duration<PLAN_MIN||candidate.start+candidate.duration>PLAN_END)return false;
 if(blocks.some(b=>b.id!==excludeId&&planOverlaps(candidate,b)))return false;
 return !(scheduleState?scheduleSlots(scheduleState,week):weekSlots(week)).filter(slot=>!isUnattended(slot,unattendedSlots)).some(slot=>planOverlaps(candidate,{date:slot.date,start:slot.start,duration:slot.end-slot.start}));
}

export function firstPlanOpening(date,blocks,week,duration=PLAN_DEFAULT,preferred=9*60,unattendedSlots=[],scheduleState=null){
 for(let start=clampPlanStart(preferred,duration);start+duration<=PLAN_END;start+=PLAN_STEP){
  if(canPlacePlan({date,start,duration},blocks,week,null,unattendedSlots,scheduleState))return start;
 }
 for(let start=PLAN_START;start<preferred;start+=PLAN_STEP){
  if(canPlacePlan({date,start,duration},blocks,week,null,unattendedSlots,scheduleState))return start;
 }
 return null;
}
