import React from 'react';

import { fireEvent, render, screen } from '@testing-library/react';

import { setConfig } from 'app/core/config/runtime-config';
import { ERROR_PAGE_KEYS } from 'app/core/http/api-errors';
import { writeSessionValue } from 'app/core/session/session-storage';
import { AttachViewerPopup } from 'app/shared/components/attach-viewer-popup/attach-viewer-popup';
import { Breadcrumb } from 'app/shared/components/breadcrumb/breadcrumb';
import { ErrorMessage, ErrorPage } from 'app/shared/components/error-page/error-page';
import { TrackersGenerator } from 'app/shared/components/trackers-generator/trackers-generator';
import { ButtonComponent, InputComponent, LoadingComponent, MessageComponent, NewRTAFooterComponent } from 'app/shared/ui';
import { applyTestConfig, renderWithProviders } from 'app/test-utils';

const english = { locale: { currentLocale: 'en', lastChange: 0, loadedKeys: [] } };

beforeEach(() => applyTestConfig());
afterEach(() => {
  setConfig(undefined);
  sessionStorage.clear();
});

describe('ErrorPage', () => {
  it('shows the error recorded by the API layer, then clears it', async () => {
    await writeSessionValue(ERROR_PAGE_KEYS.generalError, 'true');
    await writeSessionValue(ERROR_PAGE_KEYS.systemTraceId, 'TRACE-7');
    renderWithProviders(<ErrorPage />, { preloadedState: english });

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(sessionStorage.getItem(ERROR_PAGE_KEYS.generalError)).toBeNull();
    expect(sessionStorage.getItem(ERROR_PAGE_KEYS.systemTraceId)).toBeNull();
  });

  it.each([
    ['service unavailable', ERROR_PAGE_KEYS.serviceNotAvailable],
    ['a general error without trace id', ERROR_PAGE_KEYS.generalError],
  ])('handles %s', async (_name, key) => {
    await writeSessionValue(key, 'true');
    renderWithProviders(<ErrorPage />, { preloadedState: english });
    expect(await screen.findByRole('alert')).toBeTruthy();
  });

  it('shows the given error', async () => {
    renderWithProviders(
      <ErrorPage titleKey="a.title" messageKey="a.message" supportLink="https://help.test" supportLinkTextKey="a.link" />,
      {
        preloadedState: english,
      },
    );
    expect(await screen.findByRole('alert')).toBeTruthy();
  });
});

describe('ErrorMessage', () => {
  it('renders the support link only when it has text', () => {
    const { rerender } = render(
      <ErrorMessage title="Oops" description="Try later" supportLink="https://help.test" supportLinkText="Help" />,
    );
    expect(screen.getByRole('link', { name: 'Help' }).getAttribute('href')).toBe('https://help.test');
    rerender(<ErrorMessage title="Oops" description="Try later" supportLink="https://help.test" />);
    expect(screen.queryByRole('link')).toBeNull();
  });
});

describe('Breadcrumb', () => {
  it('links home to rta.ae, the dashboard to UMS and renders extra crumbs', () => {
    renderWithProviders(<Breadcrumb link2="Wallet" link2Url="/eWallet" link3="Details" journeyLinks={[{ en: 'Renew', ar: 'تجديد' }]} />, {
      preloadedState: { ...english, session: { params: { token: 't' } } },
    });
    const links = screen.getAllByRole('link').map(link => link.getAttribute('href'));
    expect(links[0]).toBe('https://www.rta.test/?lang=en');
    expect(links[1]).toContain('https://ums.test/individual/dashboard?token=t');
    expect(links[2]).toBe('/eWallet');
    expect(screen.getByText('Details')).toBeTruthy();
    expect(screen.getByText('Renew')).toBeTruthy();
  });

  it('omits the home link when rta.ae is not configured and shows plain crumbs', () => {
    applyTestConfig({ frontendUrls: { UMS: 'https://ums.test/' } });
    renderWithProviders(<Breadcrumb link2="Plain" />, { preloadedState: english });
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByText('Plain')).toBeTruthy();
  });
});

describe('TrackersGenerator', () => {
  const tracker = {
    pageInfo: { pageTitle: { en: 'Courier', ar: 'التوصيل' }, journeyRefNo: 'REF-1', breadcrumbs: [] },
    trackerList: [
      { phaseName: { en: 'Address', ar: 'العنوان' } },
      { phaseName: { en: 'Review', ar: 'مراجعة' } },
      { phaseName: { en: 'Pay', ar: 'دفع' } },
    ],
  };

  it('marks earlier phases completed and renders the current step', () => {
    const { container } = renderWithProviders(
      <TrackersGenerator phase={2} tracker={tracker} systemType="VLS">
        <span>step content</span>
      </TrackersGenerator>,
      { preloadedState: english },
    );
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Courier');
    expect(screen.getByText('REF-1')).toBeTruthy();
    const phases = container.querySelectorAll('li.line');
    expect([...phases].map(p => p.className.trim())).toEqual(['line passed', 'line processing', 'line']);
    expect(phases[1].getAttribute('aria-current')).toBe('step');
    expect(screen.getByText('step content')).toBeTruthy();
    expect(container.querySelector('.accordionView.noArrow')).not.toBeNull();
  });

  it('hides the breadcrumb for open-access users and renders without tracker data', () => {
    const { container } = renderWithProviders(<TrackersGenerator phase={1} isOpenAccess />, { preloadedState: english });
    expect(container.querySelector('.topBratcramp')).toBeNull();
    expect(container.querySelector('.accordionView')).toBeNull();
  });
});

describe('AttachViewerPopup', () => {
  it('closes on the button and on Escape', () => {
    const onClose = vi.fn();
    const { unmount } = render(<AttachViewerPopup base64File="data:application/pdf;base64,AAAA" onClose={onClose} />);
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.click(screen.getByRole('button'));
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(onClose).toHaveBeenCalledTimes(2);
    unmount();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe('library stand-ins', () => {
  it('render the library props', () => {
    const onClick = vi.fn();
    const onChange = vi.fn();
    const fire = vi.fn();
    const { rerender } = render(
      <>
        <LoadingComponent show msg="Loading..." />
        <ButtonComponent onClick={onClick}>Save</ButtonComponent>
        <InputComponent label="IBAN" value="AE" onchange={onChange} mandatory maxLength="23" minLength="2" />
        <MessageComponent
          type="T_success"
          message="Saved"
          subtitle="All good"
          anchor={{ anchorUrl: '/x', anchorLbl: 'Open', blank: true }}
        />
        <MessageComponent message="Info" fireAction={fire} fireActionLbl="Retry" />
        <NewRTAFooterComponent currentLocale="en" />
      </>,
    );
    expect(screen.getByRole('status').textContent).toContain('Loading...');
    fireEvent.click(screen.getByText('Save'));
    expect(onClick).toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/IBAN/), { target: { value: 'AE1' } });
    expect(onChange).toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Open' }).getAttribute('rel')).toBe('noopener noreferrer');
    fireEvent.click(screen.getByText('Retry'));
    expect(fire).toHaveBeenCalled();
    expect(screen.getByRole('contentinfo')).toBeTruthy();

    rerender(<LoadingComponent show={false} />);
    expect(screen.queryByRole('status')).toBeNull();
  });
});
