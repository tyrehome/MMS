import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../translations';

const LanguageContext = createContext();

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }) => {
  const [appLang, setAppLang] = useState(() => localStorage.getItem('app_lang') || 'en');
  const [receiptLang, setReceiptLang] = useState(() => localStorage.getItem('receipt_lang') || 'en');

  useEffect(() => {
    localStorage.setItem('app_lang', appLang);
  }, [appLang]);

  useEffect(() => {
    localStorage.setItem('receipt_lang', receiptLang);
  }, [receiptLang]);

  const toggleAppLang = () => setAppLang(prev => prev === 'en' ? 'si' : 'en');
  const toggleReceiptLang = () => setReceiptLang(prev => prev === 'en' ? 'si' : 'en');

  const t = (key, type = 'app') => {
    const lang = type === 'receipt' ? receiptLang : appLang;
    return translations[lang]?.[key] || translations['en'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ appLang, receiptLang, toggleAppLang, toggleReceiptLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
