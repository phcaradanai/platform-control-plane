import { githubSignInResolvers } from '@backstage/plugin-auth-backend-module-github-provider';

/**
 * Hermetic tests of the production sign-in gate. In production the GitHub
 * sign-in resolver is `usernameMatchingUserEntityName` WITHOUT
 * `dangerouslyAllowSignInWithoutUserInCatalog` (see
 * app-config.production.yaml + docs/identity-and-access.md): a GitHub
 * account can only sign in if its username matches an existing catalog
 * `User` entity. The catalog lookup itself lives in the auth backend's
 * `signInWithCatalogUser` (mocked here); these tests pin down the
 * resolver's contract - which entityRef it hands over, and that no
 * fallback bypass is ever requested without the dangerous flag.
 */
describe('GitHub sign-in gate (usernameMatchingUserEntityName)', () => {
  function resolverWithOptions(options?: {
    dangerouslyAllowSignInWithoutUserInCatalog?: boolean;
  }) {
    return githubSignInResolvers.usernameMatchingUserEntityName(options ?? {});
  }

  function profile(username: string) {
    return { result: { fullProfile: { username } } } as any;
  }

  it('signs in as the catalog user whose entity name matches the GitHub username', async () => {
    const signInWithCatalogUser = jest.fn().mockResolvedValue({
      token: 'backstage-token',
      userEntityRef: 'user:default/alice',
    });

    const identity = await resolverWithOptions()(profile('alice'), {
      signInWithCatalogUser,
    } as any);

    expect(signInWithCatalogUser).toHaveBeenCalledWith(
      { entityRef: { name: 'alice' } },
      { dangerousEntityRefFallback: undefined },
    );
    expect(identity).toEqual({
      token: 'backstage-token',
      userEntityRef: 'user:default/alice',
    });
  });

  it('fails the sign-in when no catalog user matches the GitHub username', async () => {
    // This is what the auth backend does for an unknown username: the
    // catalog lookup throws, and - because production config has no
    // dangerous fallback - the sign-in fails outright.
    const signInWithCatalogUser = jest
      .fn()
      .mockRejectedValue(new Error('User entity not found'));

    await expect(
      resolverWithOptions()(profile('not-provisioned'), {
        signInWithCatalogUser,
      } as any),
    ).rejects.toThrow('User entity not found');

    expect(signInWithCatalogUser).toHaveBeenCalledWith(
      { entityRef: { name: 'not-provisioned' } },
      { dangerousEntityRefFallback: undefined },
    );
  });

  it('rejects a profile without a username', async () => {
    const signInWithCatalogUser = jest.fn();
    await expect(
      resolverWithOptions()({ result: { fullProfile: {} } } as any, {
        signInWithCatalogUser,
      } as any),
    ).rejects.toThrow('does not contain a username');
  });

  it('only the explicit dangerous flag enables the catalog bypass', async () => {
    // Documents the difference the production config relies on: the
    // bypass is opt-in per resolver configuration, and the production
    // overlay deliberately does not pass it.
    const signInWithCatalogUser = jest.fn().mockResolvedValue({});

    await resolverWithOptions({
      dangerouslyAllowSignInWithoutUserInCatalog: true,
    })(profile('alice'), { signInWithCatalogUser } as any);

    expect(signInWithCatalogUser).toHaveBeenCalledWith(
      { entityRef: { name: 'alice' } },
      { dangerousEntityRefFallback: { entityRef: { name: 'alice' } } },
    );
  });
});
