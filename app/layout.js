import './globals.css';
import './light-theme.css';
export const metadata={
 title:'Study desk',
 description:'Timetable, assignments, course files and revision.',
 robots:{index:false,follow:false},
 manifest:'/manifest.webmanifest',
 appleWebApp:{capable:true,title:'Study desk',statusBarStyle:'black-translucent'},
 icons:{icon:[{url:'/icon.svg',type:'image/svg+xml'},{url:'/icon-192.png',sizes:'192x192',type:'image/png'}],apple:[{url:'/apple-touch-icon.png',sizes:'180x180',type:'image/png'}]}
};
const themeScript="try{document.documentElement.dataset.theme=localStorage.getItem('study-desk-theme')==='light'?'light':'dark'}catch{document.documentElement.dataset.theme='dark'}";
export default function RootLayout({children}){return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:themeScript}}/></head><body>{children}</body></html>;}
