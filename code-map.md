# Tempo code map

Scope: landing and authentication files under src/app and src/components, plus their styles in src/app/globals.css. No documentation changes apply to other application areas.

## Source description format

File header: area ID, purpose, and this map path. Function comment: stable function ID, purpose, Used by, and Trigger. IDs are references, not execution order; retain them when moving functions and do not reuse retired IDs. Inline callbacks are documented by their owning component unless they have a distinct named responsibility.

## TEMPO-001 — Landing page

Route: /. Shared SiteHeader also serves authentication via variant=auth. Global landing-* styles cover the landing page and shared header.

## TEMPO-002 — Authentication

Routes: /login/[[...login]] and /signup/[[...signup]]. AuthLayout supplies SiteHeader variant=auth. AuthPanel checks the session and renders Clerk SignIn/SignUp; Clerk retains verification, validation, and redirects. Global auth-* styles supply layout and component appearance. The separate password guidance and auth CSS module were removed.

## File and function references

### src/app/page.tsx

TEMPO-001: Public landing route and signed-in visitor redirect.

- **TEMPO-001-F01 — LandingPage**: Renders the landing sections and checks the server session. Used by: Next.js / route. Trigger: Visitor opens /; signed-in visitors go to /dashboard.

### src/components/landing/site-header.tsx

TEMPO-001: Shared public header, logo, and signup action; also used by TEMPO-002.

- **TEMPO-001-F02 — Wordmark**: Displays the shared Tempo home link and logo. Used by: SiteHeader and LandingFooter. Trigger: Header/footer renders; activation opens /.
- **TEMPO-001-F03 — SignupLink**: Displays the shared signup call to action. Used by: SiteHeader and HeroSection. Trigger: Activation opens /signup.
- **TEMPO-001-F04 — SiteHeader**: Selects landing navigation or the auth back link. Used by: LandingPage and AuthLayout. Trigger: Public route renders; variant selects its controls.

### src/components/landing/landing-page.tsx

TEMPO-001: Landing hero, feature and workflow showcases, and footer.

- **TEMPO-001-F05 — HeroSection**: Pairs the landing headline and actions with the Today preview. Used by: LandingPage. Trigger: Visitor opens /.
- **TEMPO-001-F06 — DomainIllustration**: Displays illustrative work domains. Used by: BenefitsSection. Trigger: Feature cards render.
- **TEMPO-001-F07 — BenefitsSection**: Displays the three feature cards. Used by: LandingPage. Trigger: Route renders; #features scrolls to this section.
- **TEMPO-001-F08 — HowItWorksSection**: Displays the four workflow steps. Used by: LandingPage. Trigger: Route renders; #how-it-works scrolls here.
- **TEMPO-001-F09 — LandingFooter**: Displays branding, navigation, and copyright. Used by: LandingPage. Trigger: Visitor reaches the landing footer.

### src/components/landing/mobile-navigation.tsx

TEMPO-001: Accessible mobile landing navigation state and menu behavior.

- **TEMPO-001-F10 — MobileNavigation**: Toggles the mobile menu and closes it on navigation, blur, or Escape. Used by: SiteHeader landing variant. Trigger: Menu button click, focus change, or Escape.

### src/components/landing/product-preview.tsx

TEMPO-001: Static sample task and Today illustrations; no live task operations.

- **TEMPO-001-F11 — PreviewTask**: Displays one illustrative task with optional status badges. Used by: ProductPreview and landing showcase cards. Trigger: Parent illustration renders.
- **TEMPO-001-F12 — ProductPreview**: Displays the complete illustrative Today dashboard. Used by: HeroSection. Trigger: Landing hero renders.

### src/app/(auth)/layout.tsx

TEMPO-002: Shared sign-in/signup shell, public header, and copyright.

- **TEMPO-002-F01 — AuthLayout**: Wraps authentication routes with shared branding and compact spacing. Used by: Next.js (auth) route group. Trigger: Visitor opens /login or /signup, including nested verification steps.

### src/app/(auth)/login/[[...login]]/page.tsx

TEMPO-002: Catch-all login entry, including Clerk sign-in steps.

- **TEMPO-002-F02 — LoginPage**: Selects the sign-in mode of AuthPanel. Used by: Next.js /login/[[...login]] route. Trigger: Visitor opens a sign-in URL.

### src/app/(auth)/signup/[[...signup]]/page.tsx

TEMPO-002: Catch-all account creation entry, including verification steps.

- **TEMPO-002-F03 — SignupPage**: Selects the sign-up mode of AuthPanel. Used by: Next.js /signup/[[...signup]] route. Trigger: Visitor opens a signup URL.

### src/components/auth/auth-panel.tsx

TEMPO-002: Server session check, Clerk form presentation, and alternate auth links.

- **TEMPO-002-F04 — AuthPanel**: Renders the chosen Clerk form or configuration-unavailable state. Used by: LoginPage and SignupPage. Trigger: Auth route renders; existing sessions redirect to /dashboard.

### src/components/auth/landing-session-redirect.tsx

TEMPO-002: Client session redirect for restored or cached landing pages.

- **TEMPO-002-F05 — LandingSessionRedirect**: Redirects authenticated landing visitors after client session loading. Used by: LandingPage when Clerk is configured. Trigger: Session changes or browser pageshow event.

### src/components/auth/workspace-account.tsx

TEMPO-002: Signed-in account controls used within the workspace.

- **TEMPO-002-F06 — WorkspaceAccount**: Displays the Clerk account menu, user details, and sign-out action. Used by: TodaySurface via dynamic import. Trigger: Workspace account area renders.

### src/components/auth/sign-out-button.tsx

TEMPO-002: Shared Clerk sign-out action with optional icon presentation.

- **TEMPO-002-F07 — TempoSignOutButton**: Ends the Clerk session and returns the visitor home. Used by: WorkspaceAccount. Trigger: User activates the sign-out button.

### src/components/auth/workspace-connection.tsx

TEMPO-002: Connection status helper; currently has no callers.

- **TEMPO-002-F08 — WorkspaceConnection**: Announces the Convex authentication connection state. Used by: No current callers; available for a workspace status area. Trigger: When mounted, updates as useConvexAuth changes.

