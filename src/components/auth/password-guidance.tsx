import styles from "./auth-shell.module.css";

const requirements = [
  "At least 8 characters",
  "One uppercase letter",
  "One lowercase letter",
  "One number",
  "One special character",
];

/** Guidance only; Clerk's instance policy must enforce these rules server-side. */
export function PasswordGuidance() {
  return (
    <aside className={styles.passwordGuidance} aria-labelledby="password-requirements-heading">
      <h2 id="password-requirements-heading">Choose a password with</h2>
      <ul>
        {requirements.map((requirement) => <li key={requirement}>{requirement}</li>)}
      </ul>
    </aside>
  );
}
