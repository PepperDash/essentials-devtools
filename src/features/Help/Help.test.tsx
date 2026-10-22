import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Help from './Help';

const renderHelp = (initialPath: string) =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="help/*" element={<Help />} />
      </Routes>
    </MemoryRouter>
  );

const getSidebar = () => screen.getByRole('navigation');

describe('Help', () => {
  it('renders the docs home page with sidebar navigation at /help', () => {
    renderHelp('/help');
    expect(
      screen.getByRole('heading', {
        name: /PepperDash Essentials Web Config App Documentation/i,
      })
    ).toBeInTheDocument();

    const sidebar = getSidebar();
    expect(
      within(sidebar).getByRole('link', { name: 'Tutorials' })
    ).toBeInTheDocument();
    expect(
      within(sidebar).getByRole('link', { name: 'How-to Guides' })
    ).toBeInTheDocument();
  });

  it('navigates client-side when following an internal doc link', async () => {
    renderHelp('/help/tutorials/debug-console-basics');

    const howToLink = within(getSidebar()).getByRole('link', {
      name: 'How-to Guides',
    });
    fireEvent.click(howToLink);

    expect(
      await screen.findByRole('heading', {
        name: /How-to Guides - Problem-Oriented Solutions/i,
      })
    ).toBeInTheDocument();
  });

  it('opens external links in a new tab instead of routing internally', () => {
    renderHelp('/help');
    const externalLink = screen.getAllByRole('link', {
      name: 'Diataxis framework',
    })[0];
    expect(externalLink).toHaveAttribute('href', 'https://diataxis.fr/');
    expect(externalLink).toHaveAttribute('target', '_blank');
  });

  it('renders GFM tables from reference docs as styled Bootstrap tables', () => {
    renderHelp('/help/reference/log-levels');
    const tables = screen.getAllByRole('table');
    expect(tables.length).toBeGreaterThan(0);
    tables.forEach((table) =>
      expect(table).toHaveClass('table', 'table-striped')
    );
    expect(screen.getAllByText('Fatal').length).toBeGreaterThan(0);
  });

  it('shows a not-found message with a way back for an unknown slug', () => {
    renderHelp('/help/does/not/exist');
    expect(screen.getByText(/page not found/i)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /back to help/i })
    ).toBeInTheDocument();
  });

  describe('heading fragments', () => {
    const original = Element.prototype.scrollIntoView;
    afterEach(() => {
      Element.prototype.scrollIntoView = original;
    });

    it('gives headings GitHub-style ids and scrolls to the one a fragment link names', async () => {
      const scrolled: string[] = [];
      Element.prototype.scrollIntoView = vi.fn(function (this: Element) {
        scrolled.push(this.id);
      });

      renderHelp('/help/how-to/trace-signal-routes');
      fireEvent.click(
        screen.getByRole('link', {
          name: 'UI Components Reference — Routing Diagram',
        })
      );

      const heading = await screen.findByRole('heading', {
        name: 'Routing Diagram',
      });
      expect(heading).toHaveAttribute('id', 'routing-diagram');
      expect(scrolled).toContain('routing-diagram');
    });
  });

  it('folds the sidebar behind a Contents button on phones, closing it once a page is picked', () => {
    renderHelp('/help/reference/api-endpoints');

    // Closed: CSS hides the sidebar below md and leaves the article showing
    const sidebar = () => document.getElementById('help-contents');
    expect(sidebar()?.className).toContain('d-none d-md-block');

    fireEvent.click(screen.getByRole('button', { name: 'Contents' }));
    expect(sidebar()?.className).not.toContain('d-none');
    expect(
      screen.getByRole('button', { name: 'Close contents' })
    ).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(
      within(getSidebar()).getByRole('link', {
        name: 'How to Manage Stored Secrets',
      })
    );
    expect(sidebar()?.className).toContain('d-none d-md-block');
    expect(screen.getByRole('button', { name: 'Contents' })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });
});
