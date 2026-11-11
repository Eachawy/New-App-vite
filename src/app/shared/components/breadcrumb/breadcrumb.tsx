import React from 'react';
import { translate } from 'react-jhipster';
import { Link } from 'react-router';

import { useAppSelector } from 'app/config/store';
import { getConfig } from 'app/core/config/runtime-config';
import { useSystemNavigation } from 'app/shared/lib/navigation';

export interface BreadcrumbJourneyLink {
  en: string;
  ar: string;
  url?: string;
}

export interface BreadcrumbProps {
  /** Third crumb; a router link when `link2Url` is given. */
  link2?: string;
  link2Url?: string;
  link3?: string;
  /** Crumbs supplied by a journey's tracker info, in both languages. */
  journeyLinks?: BreadcrumbJourneyLink[];
}

/** "Home > Dashboard > ..." trail. Home is rta.ae; Dashboard returns to the UMS dashboard with the session. */
export const Breadcrumb = ({ link2, link2Url, link3, journeyLinks = [] }: BreadcrumbProps) => {
  const lang = (useAppSelector(state => state.locale.currentLocale) || 'en') as 'en' | 'ar';
  const { dashboardUrl } = useSystemNavigation();
  const rtaUrl = getConfig().frontendUrls.RTA;

  return (
    <nav aria-label={translate('common.home')}>
      <ul className="list-unstyled list-inline topBratcramp">
        {rtaUrl && (
          <li>
            <a href={`${rtaUrl}?lang=${lang}`}>{translate('common.home')}</a>
          </li>
        )}
        <li>
          <a className="link-style" href={dashboardUrl()}>
            {translate('common.dashboard')}
          </a>
        </li>
        {link2 && <li>{link2Url ? <Link to={link2Url}>{link2}</Link> : link2}</li>}
        {link3 && <li>{link3}</li>}
        {journeyLinks.map(link => (
          <li key={`${link.en}-${link.url ?? ''}`}>{link[lang]}</li>
        ))}
      </ul>
    </nav>
  );
};

export default Breadcrumb;
