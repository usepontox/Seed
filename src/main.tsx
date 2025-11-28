import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ThemeProvider } from "@/hooks/use-theme";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider defaultTheme="light" storageKey="pdv-theme">
    <App />
  </ThemeProvider>
);
