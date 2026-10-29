"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import styles from "./landing.module.css";

export function MobileNavigation() {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);

  return (
    <div
      className={styles.mobileMenu}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setOpen(false);
          toggle.current?.focus();
        }
      }}
    >
      <button
        ref={toggle}
        type="button"
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={open}
        aria-controls="mobile-navigation"
        onClick={() => setOpen(!open)}
      >
        {open ? <X size={21} aria-hidden="true" /> : <Menu size={21} aria-hidden="true" />}
      </button>
      <nav id="mobile-navigation" aria-label="Mobile navigation" hidden={!open}>
        <a href="#features" onClick={() => setOpen(false)}>Features</a>
        <a href="#how-it-works" onClick={() => setOpen(false)}>How it works</a>
        <Link href="/login" prefetch={false} onClick={() => setOpen(false)}>Log in</Link>
      </nav>
    </div>
  );
}
