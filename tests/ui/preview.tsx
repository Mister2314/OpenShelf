import React from 'react';
import { createRoot } from 'react-dom/client';
import { ReaderView } from '../../src/components/views/ReaderView';
import { AuthModal } from '../../src/components/common/AuthModal';
import { AdminView } from '../../src/components/views/AdminView';
import { NotificationProvider } from '../../src/context/NotificationContext';
import { ThemeProvider, useTheme } from '../../src/context/ThemeContext';
import '../../src/index.css';
const theme = new URLSearchParams(location.search).get('theme');
if(theme === 'light' || theme === 'dark') localStorage.setItem('openshelf_theme_mode',theme);
export function Preview() { const { toggleTheme } = useTheme(); return <><div style={{padding:'12px 20px',display:'flex',justifyContent:'space-between',borderBottom:'1px solid var(--color-border)'}}><span>Isolated UI test · sample data · no external writes</span><button className="os-button" onClick={toggleTheme}>Toggle theme</button></div>{new URLSearchParams(location.search).get('view')==='reader'?<ReaderView/>:new URLSearchParams(location.search).get('view')==='auth'?<AuthModal/>:<AdminView/>}</>; }
const root = createRoot(document.getElementById('root')!);
root.render(<ThemeProvider><NotificationProvider><Preview/></NotificationProvider></ThemeProvider>);

if(import.meta.hot) import.meta.hot.dispose(()=>root.unmount());
