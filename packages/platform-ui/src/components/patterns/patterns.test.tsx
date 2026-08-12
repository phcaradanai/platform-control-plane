import { renderToStaticMarkup } from 'react-dom/server';

import {
  ApplicationShell,
  DataTable,
  DeniedState,
  FormField,
  Input,
} from '../../index.js';

describe('application patterns', () => {
  it('keeps application shell landmarks and mobile navigation labels semantic', () => {
    const markup = renderToStaticMarkup(
      <ApplicationShell
        brand={<span>Example</span>}
        mobileTitle="Example application"
        navigation={[
          { href: '/overview', label: 'Overview', current: true },
          { href: '/settings', label: 'Settings' },
        ]}
      >
        <p>Content</p>
      </ApplicationShell>,
    );

    expect(markup).toContain('href="#main-content"');
    expect(markup).toContain('<main id="main-content"');
    expect(markup).toContain('aria-label="Application navigation"');
    expect(markup).toContain('aria-label="Open navigation"');
    expect(markup).toContain('aria-haspopup="dialog"');
    expect(markup).toContain('aria-current="page"');
  });

  it('wires field help and errors to the actual control', () => {
    const markup = renderToStaticMarkup(
      <FormField
        id="workspace-name"
        label="Workspace name"
        description="Shown in navigation."
        error="Enter a workspace name."
        required
        control={<Input />}
      />,
    );

    expect(markup).toContain('for="workspace-name"');
    expect(markup).toContain('id="workspace-name"');
    expect(markup).toContain('aria-required="true"');
    expect(markup).toContain(
      'aria-describedby="workspace-name-description workspace-name-error"',
    );
    expect(markup).toContain('aria-invalid="true"');
    expect(markup).toContain('role="alert"');
  });

  it('gives overflow-safe data surfaces an accessible region and table caption', () => {
    const markup = renderToStaticMarkup(
      <DataTable<{ id: string; name: string }>
        items={[{ id: '1', name: 'Ada' }]}
        columns={[{ id: 'name', header: 'Name', cell: row => row.name }]}
        getRowId={row => row.id}
        caption="Example records"
      />,
    );

    expect(markup).toContain('role="region"');
    expect(markup).toContain('aria-label="Example records"');
    expect(markup).toContain(
      '<caption class="sr-only">Example records</caption>',
    );
    expect(markup).toContain('scope="col"');
    expect(markup).toContain('tabindex="0"');
  });

  it('provides a titled denied state with a recovery slot', () => {
    const markup = renderToStaticMarkup(
      <DeniedState
        title="Access required"
        description="Ask an administrator for access."
        action={<button type="button">Request access</button>}
      />,
    );

    expect(markup).toContain('aria-labelledby=');
    expect(markup).toContain('>Access required</h2>');
    expect(markup).toContain('>Request access</button>');
  });
});
