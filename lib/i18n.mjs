import {COPY} from './translations.mjs';

export const LANGUAGES = [
  {code:'en',name:'English',locale:'en-GB'},
  {code:'it',name:'Italiano',locale:'it-IT'},
  {code:'fr',name:'Français',locale:'fr-FR'},
  {code:'de',name:'Deutsch',locale:'de-DE'}
];

export const LANGUAGE_STORAGE_KEY='study-desk-language';
let currentLanguage='en';

export function normalizeLanguage(value){return LANGUAGES.some(item=>item.code===value)?value:'en';}
export function getLanguage(){return currentLanguage;}
export function getDisplayLocale(){return LANGUAGES.find(item=>item.code===currentLanguage)?.locale||'en-GB';}
export function setLanguage(value){currentLanguage=normalizeLanguage(value);return currentLanguage;}

// English is the canonical language for saved records and business logic. Only
// rendered interface copy and date formatting change with the user's choice.
export function translate(value,language=currentLanguage){
  if(typeof value!=='string'||language==='en')return value;
  const entry=COPY[value];
  if(entry?.[language])return entry[language];
  const words={
   it:{file:['file','file'],assignment:['compito','compiti'],lecture:['lezione','lezioni'],session:['sessione','sessioni'],deadline:['scadenza','scadenze'],week:['settimana','settimane']},
   fr:{file:['fichier','fichiers'],assignment:['devoir','devoirs'],lecture:['cours','cours'],session:['séance','séances'],deadline:['échéance','échéances'],week:['semaine','semaines']},
   de:{file:['Datei','Dateien'],assignment:['Aufgabe','Aufgaben'],lecture:['Vorlesung','Vorlesungen'],session:['Termin','Termine'],deadline:['Frist','Fristen'],week:['Woche','Wochen']}
  }[language];
  const count=value.match(/^(\d+) (file|assignment|lecture|session|deadline|week)s?$/);
  if(count)return `${count[1]} ${words[count[2]][Number(count[1])===1?0:1]}`;
  const every=value.match(/^Every (\d+) weeks?( · (Paused|Active))?$/);
  if(every){const interval=language==='de'?`Alle ${every[1]} ${words.week[1]}`:language==='fr'?`Toutes les ${every[1]} ${words.week[1]}`:`Ogni ${every[1]} ${words.week[1]}`;const status=every[3]==='Active'?{it:'Attivo',fr:'Actif',de:'Aktiv'}[language]:every[3]?translate(every[3],language):'';return interval+(status?` · ${status}`:'');}
  const weekly=value.match(/^Every week( · (Paused|Active))?$/);
  if(weekly)return translate('Every week',language)+(weekly[2]?` · ${weekly[2]==='Active'?{it:'Attivo',fr:'Actif',de:'Aktiv'}[language]:translate(weekly[2],language)}`:'');
  const next=value.match(/^Next available (.+) at (.+)$/);
  if(next)return {it:`Prossima disponibilità ${next[1]} alle ${next[2]}`,fr:`Prochaine disponibilité le ${next[1]} à ${next[2]}`,de:`Nächste Verfügbarkeit: ${next[1]} um ${next[2]}`}[language];
  const show=value.match(/^Show all (\d+) assignments$/);
  if(show)return {it:`Mostra tutti i ${show[1]} compiti`,fr:`Afficher les ${show[1]} devoirs`,de:`Alle ${show[1]} Aufgaben anzeigen`}[language];
  const due=value.match(/^(Overdue|Due) (.+)$/);
  if(due)return `${due[1]==='Due'?{it:'Scadenza',fr:'Échéance',de:'Fällig'}[language]:translate('Overdue',language)} ${due[2]}`;
  const withKind=value.match(/^(.+) · (Lecture|Exercise|Practical|Seminar|Class)$/);
  if(withKind)return `${translate(withKind[1],language)} · ${translate(withKind[2],language)}`;
  const kindFirst=value.match(/^(Lecture|Exercise|Practical|Seminar|Class)( · .+)?$/);
  if(kindFirst)return translate(kindFirst[1],language)+(kindFirst[2]||'');
  const absent=value.match(/^Not attending · (Lecture|Exercise|Practical|Seminar|Class)$/);
  if(absent)return `${translate('Not attending',language)} · ${translate(absent[1],language)}`;
  const joined=value.match(/^(.+) · (Active|Paused|Not attending)$/);
  if(joined)return `${joined[1]} · ${translate(joined[2],language)}`;
  const notice=value.match(/^Anyone with an @(.+) address can join\. Existing invited accounts can sign in too\.$/);
  if(notice)return {it:`Chiunque abbia un indirizzo @${notice[1]} può registrarsi. Anche gli account già invitati possono accedere.`,fr:`Toute personne avec une adresse @${notice[1]} peut s’inscrire. Les comptes déjà invités peuvent aussi se connecter.`,de:`Alle mit einer @${notice[1]}-Adresse können sich registrieren. Bereits eingeladene Konten können sich weiterhin anmelden.`}[language];
  const imported=value.match(/^(\d+) opening and deadline events · Last imported (.+)$/);
  if(imported)return {it:`${imported[1]} eventi di apertura e scadenza · Ultima importazione ${imported[2]}`,fr:`${imported[1]} dates d’ouverture et d’échéance · Dernier import ${imported[2]}`,de:`${imported[1]} Öffnungs- und Fristereignisse · Zuletzt importiert ${imported[2]}`}[language];
  const minutes=value.match(/^(\d+) min$/);
  if(minutes)return `${minutes[1]} ${translate('minutes',language)}`;
  const more=value.match(/^\+(\d+) more$/);
  if(more)return `+${more[1]} ${translate('More',language).toLowerCase()}`;
  const planned=value.match(/^(\d+(?:h(?: \d+m)?| min)) planned$/);
  if(planned)return `${planned[1]} ${ {it:'pianificati',fr:'planifiées',de:'geplant'}[language]}`;
  const statusCount=value.match(/^(\d+) (open|completed|overdue)$/);
  if(statusCount)return `${statusCount[1]} ${translate(statusCount[2],language)}`;
  const revisits=value.match(/^(\d+) lectures? to revisit$/);
  if(revisits)return {it:`${revisits[1]} lezioni da rivedere`,fr:`${revisits[1]} cours à revoir`,de:`${revisits[1]} Vorlesungen zum Wiederholen`}[language];
  const signedIn=value.match(/^Signed in as (.+)$/);
  if(signedIn)return {it:`Accesso come ${signedIn[1]}`,fr:`Connecté en tant que ${signedIn[1]}`,de:`Angemeldet als ${signedIn[1]}`}[language];
  const upcoming=value.match(/^(\d+) unfinished assignments due in the next 7 days$/);
  if(upcoming)return {it:`${upcoming[1]} compiti incompleti in scadenza nei prossimi 7 giorni`,fr:`${upcoming[1]} devoirs non terminés à rendre dans les 7 prochains jours`,de:`${upcoming[1]} unerledigte Aufgaben mit Frist in den nächsten 7 Tagen`}[language];
  const older=value.match(/^(\d+) older overdue assignments?$/);
  if(older)return `${older[1]} ${translate(`older overdue assignment${Number(older[1])===1?'':'s'}`,language)}`;
  const progress=value.match(/^(\d+) in progress$/);
  if(progress)return {it:`${progress[1]} in corso`,fr:`${progress[1]} en cours`,de:`${progress[1]} in Bearbeitung`}[language];
  const entries=value.match(/^(\d+) entr(?:y|ies)$/);
  if(entries)return {it:`${entries[1]} ${Number(entries[1])===1?'voce':'voci'}`,fr:`${entries[1]} ${Number(entries[1])===1?'entrée':'entrées'}`,de:`${entries[1]} ${Number(entries[1])===1?'Eintrag':'Einträge'}`}[language];
  const studyEvents=value.match(/^(.+?)(, today)?, (\d+) study events$/);
  if(studyEvents){const singular=Number(studyEvents[3])===1;return {it:`${studyEvents[1]}${studyEvents[2]?', oggi':''}, ${studyEvents[3]} ${singular?'evento':'eventi'} di studio`,fr:`${studyEvents[1]}${studyEvents[2]?', aujourd’hui':''}, ${studyEvents[3]} ${singular?'activité':'activités'} d’étude`,de:`${studyEvents[1]}${studyEvents[2]?', heute':''}, ${studyEvents[3]} ${singular?'Lerneintrag':'Lerneinträge'}`}[language];}
  const olderTasks=value.match(/^(Show \d+|Hide) older overdue tasks?$/);
  if(olderTasks)return {it:olderTasks[1]==='Hide'?'Nascondi le attività scadute precedenti':`Mostra ${olderTasks[1].slice(5)} attività scadute precedenti`,fr:olderTasks[1]==='Hide'?'Masquer les anciens devoirs en retard':`Afficher ${olderTasks[1].slice(5)} anciens devoirs en retard`,de:olderTasks[1]==='Hide'?'Ältere überfällige Aufgaben ausblenden':`${olderTasks[1].slice(5)} ältere überfällige Aufgaben anzeigen`}[language];
  const dayLane=value.match(/^(.+)\. (Press Enter to add a task here\.|Press Enter to place selected task\.)$/);
  if(dayLane)return `${dayLane[1]}. ${translate(dayLane[2],language)}`;
  const classTime=value.match(/^(.+) (Lecture|Exercise|Practical|Seminar|Class), (\d\d:\d\d) to (\d\d:\d\d)\. (Open attendance options\.|Not attending\. Open to restore\.)$/);
  if(classTime)return `${classTime[1]} ${translate(classTime[2],language)}, ${classTime[3]}–${classTime[4]}. ${translate(classTime[5],language)}`;
  const taskDue=value.match(/^(\d+) assignments? due (.+)\. (.+)$/);
  if(taskDue)return {it:`${taskDue[1]} ${Number(taskDue[1])===1?'compito':'compiti'} in scadenza ${taskDue[2]}. ${taskDue[3]}`,fr:`${taskDue[1]} ${Number(taskDue[1])===1?'devoir à rendre':'devoirs à rendre'} le ${taskDue[2]}. ${taskDue[3]}`,de:`${taskDue[1]} ${Number(taskDue[1])===1?'fällige Aufgabe':'fällige Aufgaben'} am ${taskDue[2]}. ${taskDue[3]}`}[language];
  const dueCount=value.match(/^(\d+) due$/);
  if(dueCount)return {it:`${dueCount[1]} in scadenza`,fr:`${dueCount[1]} à rendre`,de:`${dueCount[1]} fällig`}[language];
  const queuedTask=value.match(/^(.+)\. (Drag into the calendar or select\.|Tap to select, then tap a time in the calendar\.)$/);
  if(queuedTask)return `${queuedTask[1].replace('No deadline',translate('No deadline',language)).replace(/(\d+(?:h(?: \d+m)?| min)) planned$/,(_,time)=>translate(`${time} planned`,language))}. ${translate(queuedTask[2],language)}`;
  const event=value.match(/^(.+), (.+), (\d\d:\d\d-\d\d:\d\d), (Lecture|Exercise|Practical|Seminar|Class)(, .+)?\. Open class or drop PDFs$/);
  if(event)return `${event[1]}, ${event[2]}, ${event[3]}, ${translate(event[4],language)}${event[5]||''}. ${ {it:'Apri la lezione o trascina PDF',fr:'Ouvrir le cours ou déposer des PDF',de:'Veranstaltung öffnen oder PDFs ablegen'}[language]}`;
  const revisit=value.match(/^Mark (.+) revisited$/);
  if(revisit)return {it:`Segna ${revisit[1]} come ripassata`,fr:`Marquer ${revisit[1]} comme révisé`,de:`${revisit[1]} als wiederholt markieren`}[language];
  const genericOpen=value.match(/^Open (.+)$/);
  if(genericOpen)return `${translate('Open',language)} ${genericOpen[1]}`;
  const genericDownload=value.match(/^Download (.+)$/);
  if(genericDownload)return `${translate('Download',language)} ${genericDownload[1]}`;
  const statusFor=value.match(/^Status for (.+)$/);
  if(statusFor)return {it:`Stato di ${statusFor[1]}`,fr:`Statut de ${statusFor[1]}`,de:`Status für ${statusFor[1]}`}[language];
  const uploadFor=value.match(/^Upload file for (.+)$/);
  if(uploadFor)return {it:`Carica un file per ${uploadFor[1]}`,fr:`Importer un fichier pour ${uploadFor[1]}`,de:`Datei für ${uploadFor[1]} hochladen`}[language];
  const onMoodle=value.match(/^Find (.+) on Moodle$/);
  if(onMoodle)return `${translate('Find on Moodle',language)}: ${onMoodle[1]}`;
  const openFile=value.match(/^Open (.+\.(?:pdf|txt|docx?|png|jpe?g))$/i);
  if(openFile)return `${translate('Open file',language)}: ${openFile[1]}`;
  return value;
}
