import { useState } from 'react';
const book = { id:'test-1', title:'The Garden — UI test fixture', author:'OpenShelf Test' };
export function useReading() {
 const [readingSettings, setSettings] = useState({typeface:'Georgia',fontSize:20,lineHeight:1.75,columnWidth:'normal',canvasPalette:'cream'});
 return {isAuthenticated:true,authLoading:false,currentUser:{email:'fixture@example.invalid'},selectedBook:book,readingSettings,updateReadingSettings:change=>setSettings(previous=>({...previous,...change})),setCurrentView(){},openAuthModal(){},isAuthModalOpen:true,closeAuthModal(){},login:async()=>{}};
}
