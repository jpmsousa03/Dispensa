import React, { createContext, useContext, useEffect } from "react";

export type VisualStyle = "product";

interface VisualContextType {
  visualStyle: VisualStyle;
}

const VisualContext = createContext<VisualContextType>({
  visualStyle: "product",
});

export const VisualProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    try {
      localStorage.removeItem("pantry_visual_style");
    } catch {
      // ignore
    }
  }, []);

  return (
    <VisualContext.Provider value={{ visualStyle: "product" }}>
      {children}
    </VisualContext.Provider>
  );
};

export const useVisual = () => useContext(VisualContext);
