import React, { createContext, useContext, useEffect, useState } from 'react';

type ThemeContextType = { dark: boolean; toggle: ()=>void };
const ThemeContext = createContext<ThemeContextType>({ dark: true, toggle: ()=>{} });

export const ThemeProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [dark, setDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return true; // default dark
  });

  useEffect(()=> {
    if (dark) document.documentElement.classList.add('dark'); else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  return <ThemeContext.Provider value={{ dark, toggle: ()=>setDark(d=>!d) }}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
