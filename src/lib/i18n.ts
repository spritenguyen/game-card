import { vi } from '../locales/vi';
import { en } from '../locales/en';

export type Language = 'vi' | 'en';

export const translations = {
  vi,
  en
};

let memCacheLanguage: Language | null = null;

export const setI18nLanguage = (lang: Language) => {
  memCacheLanguage = lang;
};

export const getCurrentLanguage = (): Language => {
  if (memCacheLanguage) return memCacheLanguage;
  try {
    const raw = localStorage.getItem("cineApiConfig");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.language === 'en' || parsed.language === 'vi') {
        memCacheLanguage = parsed.language;
        return parsed.language;
      }
    }
  } catch(e) {}
  return 'vi';
};

export const t = (langOrKey: Language | string, keyOrParams?: string | Record<string, string | number>, params?: Record<string, string | number>): string => {
  let lang: Language = 'vi';
  let key: string = '';
  let finalParams: Record<string, string | number> | undefined;

  // Function overloading simulation to support both t(lang, key) and t(key)
  if (langOrKey === 'vi' || langOrKey === 'en') {
    lang = langOrKey;
    key = typeof keyOrParams === 'string' ? keyOrParams : '';
    finalParams = params;
  } else {
    lang = getCurrentLanguage();
    key = langOrKey;
    finalParams = keyOrParams as Record<string, string | number>;
  }

  const keys = key.split('.');
  let result: any = translations[lang];
  
  for (const k of keys) {
    if (result === undefined || result === null) {
      return key; // Fallback to the key itself
    }
    result = result[k];
  }
  
  if (typeof result !== 'string') {
    return key;
  }
  
  if (finalParams) {
    let replaced = result;
    for (const [k, v] of Object.entries(finalParams)) {
      replaced = replaced.replace(new RegExp(`{${k}}`, 'g'), String(v));
    }
    return replaced;
  }
  
  return result;
};
