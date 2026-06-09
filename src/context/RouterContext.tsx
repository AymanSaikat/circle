import React, { createContext, useContext, useState, useEffect } from 'react';

interface RouterContextType {
  path: string;
  navigate: (path: string) => void;
}

const RouterContext = createContext<RouterContextType | undefined>(undefined);

export const useRouter = () => {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouter must be used within a RouterProvider');
  }
  return context;
};

export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const getCleanPath = () => {
    let p = window.location.pathname || '/';
    // @ts-ignore
    const base = import.meta.env.BASE_URL || '/';
    if (base !== '/' && p.startsWith(base)) {
      p = '/' + p.slice(base.length);
    } else if (base !== '/' && p + '/' === base) {
      p = '/';
    }
    if (p.length > 1 && p.endsWith('/')) {
      p = p.slice(0, -1);
    }
    return p;
  };

  const [path, setPath] = useState(getCleanPath);

  useEffect(() => {
    const handlePopState = () => {
      setPath(getCleanPath());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (newPath: string) => {
    let clean = newPath.trim();
    if (!clean.startsWith('/')) {
      clean = '/' + clean;
    }
    if (clean.length > 1 && clean.endsWith('/')) {
      clean = clean.slice(0, -1);
    }
    
    // @ts-ignore
    const base = import.meta.env.BASE_URL || '/';
    // The history api needs the full mapped url
    const mappedUrl = base === '/' ? clean : `${base.replace(/\/$/, '')}${clean}`;
    
    window.history.pushState(null, '', mappedUrl);
    setPath(clean);
  };

  return (
    <RouterContext.Provider value={{ path, navigate }}>
      {children}
    </RouterContext.Provider>
  );
};
