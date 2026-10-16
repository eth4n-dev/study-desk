import {rm} from 'node:fs/promises';

// The local demo uses its bundled starter calendar. The cloud deployment
// imports a private backup instead, so do not serve the starter JSON publicly.
if(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY){
 await rm(new URL('../out/calendar.json',import.meta.url),{force:true});
}
