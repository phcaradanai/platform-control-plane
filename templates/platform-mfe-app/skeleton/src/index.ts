/**
 * ${{ values.title }}
 *
 * Generated foundation only. Module Federation runtime, Nx capability
 * composition, and the Super App shell integration are added in a later
 * phase - see the "placeholders" section of README.md.
 */

export interface PlatformAppInfo {
  id: string;
  mode: 'platform-mfe' | 'standalone' | 'standalone-and-mfe';
  capabilities: string[];
}

export const appInfo: PlatformAppInfo = {
  id: '${{ values.name }}',
  mode: '${{ values.mode }}',
  capabilities: ${{ values.capabilities | dump }},
};

if (require.main === module) {
  // eslint-disable-next-line no-console
  console.log(`${appInfo.id} foundation ready (mode: ${appInfo.mode})`);
}
