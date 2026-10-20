import test from 'node:test';
import assert from 'node:assert/strict';
import {COPY} from '../lib/translations.mjs';
import {getDisplayLocale,normalizeLanguage,setLanguage,translate} from '../lib/i18n.mjs';
import {fmt} from '../lib/model.mjs';

test('every shipped interface phrase has all three translations',()=>{
 for(const [english,row] of Object.entries(COPY)){
  for(const language of ['it','fr','de'])assert.ok(row[language]?.trim(),`${english} missing ${language}`);
 }
});

test('language choice localizes interface dates without changing saved words',()=>{
 assert.equal(normalizeLanguage('unknown'),'en');
 setLanguage('de');
 assert.equal(getDisplayLocale(),'de-DE');
 assert.equal(translate('Study plan'),'Lernplan');
 assert.equal(translate('My custom sheet'),'My custom sheet');
 assert.match(fmt('2026-10-20T12:00:00Z',{month:'long'}),/Oktober/);
 setLanguage('en');
});

test('dynamic repeat labels and account invitation copy follow the selected language',()=>{
 assert.equal(translate('Every 3 weeks · Active','it'),'Ogni 3 settimane · Attivo');
 assert.equal(translate('Next available 20 Oct at 09:00','de'),'Nächste Verfügbarkeit: 20 Oct um 09:00');
 assert.match(translate('Anyone with an @ethz.ch address can join. Existing invited accounts can sign in too.','fr'),/@ethz\.ch/);
 assert.match(translate('Anyone with an @ethz.ch or @etu.unige.ch email address can join. Existing invited accounts can sign in too.','fr'),/@ethz\.ch ou @etu\.unige\.ch/);
});

test('planner labels and accessible descriptions use the chosen language',()=>{
 assert.equal(translate('0 min planned','it'),'0 min pianificati');
 assert.match(translate('Numerical Methods Lecture, 08:15 to 10:00. Open attendance options.','de'),/Vorlesung.*Teilnahmeoptionen/);
 assert.match(translate('Tuesday, 20 Oct 2026, 1 study events','fr'),/1 activité d’étude/);
 assert.match(translate('2 assignments due 20 Oct. Sheet 4, 11:00','it'),/2 compiti in scadenza/);
});
