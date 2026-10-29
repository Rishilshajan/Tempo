export const clerkAppearance = {
  variables: {
    colorPrimary: "var(--primary)",
    colorBackground: "var(--card)",
    colorText: "var(--foreground)",
    colorTextSecondary: "var(--muted-foreground)",
    colorInputBackground: "var(--background)",
    colorInputText: "var(--foreground)",
    fontFamily: "inherit",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: { width: "100%" },
    cardBox: { width: "100%", boxShadow: "none", border: "none", borderRadius: "0" },
    card: { padding: "0", boxShadow: "none", background: "transparent", border: "none" },
    headerTitle: { fontSize: "1.875rem", fontWeight: "600", letterSpacing: "-0.04em", lineHeight: "1.2" },
    headerSubtitle: { fontSize: "0.875rem", lineHeight: "1.7" },
    formButtonPrimary: { minHeight: "44px", boxShadow: "none" },
    formFieldInput: { minHeight: "44px" },
    socialButtonsBlockButton: { minHeight: "44px" },
    footerAction: { display: "none" },
    footer: { background: "transparent" },
  },
} as const;
