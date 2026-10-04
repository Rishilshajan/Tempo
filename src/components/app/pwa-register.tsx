// "use client";

// import { useEffect } from "react";

// import { log } from "@/lib/logger";

// /**
//  * Registers the Tempo service worker so the app is installable as a PWA.
//  * Renders nothing; mounted once from the root layout.
//  */
// export function PwaRegister() {
//   useEffect(() => {
//     if (!("serviceWorker" in navigator)) return;
//     const register = () => {
//       navigator.serviceWorker
//         .register("/sw.js", { scope: "/" })
//         .then((reg) => log.info("Service worker registered", reg.scope))
//         .catch((err) => log.error("Service worker registration failed", err));
//     };
//     // Defer until the page is interactive so it never competes with first paint.
//     if (document.readyState === "complete") register();
//     else {
//       window.addEventListener("load", register);
//       return () => window.removeEventListener("load", register);
//     }
//   }, []);

//   return null;
// }

"use client";

export function PwaRegister() {
  return null;
}