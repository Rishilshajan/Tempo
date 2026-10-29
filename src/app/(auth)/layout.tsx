import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { inter } from "@/lib/fonts";
import styles from "@/components/auth/auth-shell.module.css";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`tempo-light ${inter.className} ${styles.shell}`}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="Tempo home">
          <Image src="/Tempo_Logo_original.png" alt="Tempo" width={866} height={288} priority />
        </Link>
        <Link href="/" className={styles.back}>
          <ArrowLeft size={14} aria-hidden="true" /> Back to website
        </Link>
      </header>
      <main className={styles.main}>{children}</main>
      <footer className={styles.footer}>© {new Date().getFullYear()} Tempo</footer>
    </div>
  );
}
