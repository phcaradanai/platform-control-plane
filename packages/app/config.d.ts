export interface Config {
  auth?: {
    /**
     * Frontend-visible flag: set to `true` (alongside the real
     * `auth.providers.github.development` block - see
     * app-config.local.yaml.example) to make the sign-in page offer a
     * GitHub button in local development.
     *
     * This can't be derived from `auth.providers.github` itself:
     * `@backstage/plugin-auth-backend-module-github-provider`'s config
     * schema marks that whole node `visibility: frontend`, but its
     * per-environment keys (`development`/`production`) are matched via
     * JSON Schema `additionalProperties`, and the installed
     * `@backstage/config-loader` does not propagate frontend visibility
     * through that pattern - `backstage-cli config:print --frontend`
     * shows `auth.providers.github: {}` even with a real `clientId` set.
     * Confirmed empirically before adding this flag; see
     * packages/app/src/modules/sign-in/SignInPage.tsx and
     * docs/identity-and-access.md.
     *
     * @visibility frontend
     */
    localGithubEnabled?: boolean;
  };
}
