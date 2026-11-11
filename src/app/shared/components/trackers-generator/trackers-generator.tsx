import './trackers-generator.scss';

import React from 'react';
import { translate } from 'react-jhipster';

import { useAppSelector } from 'app/config/store';
import { Breadcrumb, type BreadcrumbJourneyLink } from 'app/shared/components/breadcrumb/breadcrumb';

type Bilingual = { en: string; ar: string };

/** Tracker info returned by the VLS/DLS tracker-info endpoints. */
export interface TrackerInfo {
  pageInfo?: {
    pageTitle?: Bilingual;
    journeyRefNo?: string;
    breadcrumbs?: BreadcrumbJourneyLink[];
  };
  trackerList?: { phaseName: Bilingual }[];
}

export interface TrackersGeneratorProps {
  /** 1-based number of the current phase; earlier phases show as completed. */
  phase: number;
  tracker?: TrackerInfo;
  /** VLS journeys hide the accordion arrows. */
  systemType?: string;
  /** Open-access users have no dashboard, so no breadcrumb. */
  isOpenAccess?: boolean;
  /** Content of the current phase. */
  children?: React.ReactNode;
}

/** Journey stepper: lists the phases and renders the current step's content inside the active phase. */
export const TrackersGenerator = ({ phase, tracker, systemType, isOpenAccess, children }: TrackersGeneratorProps) => {
  const lang = (useAppSelector(state => state.locale.currentLocale) || 'en') as 'en' | 'ar';
  const pageInfo = tracker?.pageInfo;

  return (
    <div className="trackersGeneratorComponent">
      {!isOpenAccess && <Breadcrumb journeyLinks={pageInfo?.breadcrumbs} />}
      <h1 className="titlePage">{pageInfo?.pageTitle?.[lang]}</h1>
      <div className="courierService">
        {tracker && (
          <>
            {pageInfo?.journeyRefNo && (
              <div className="applicationRef">
                <div className="leftSideRef" />
                <div className="rightSideRef">
                  <span>{translate('applicationReference.aramex')}</span>
                  <span>{pageInfo.journeyRefNo}</span>
                </div>
              </div>
            )}
            <ol className={`accordionView list-unstyled ${systemType === 'VLS' ? 'noArrow' : ''}`}>
              {tracker.trackerList?.map((item, index) => {
                const step = index + 1;
                const state = step === phase ? 'processing' : step < phase ? 'passed' : '';
                return (
                  <li
                    key={item.phaseName.en}
                    id={step === phase ? 'processing' : undefined}
                    className={`line ${state}`}
                    aria-current={step === phase ? 'step' : undefined}
                  >
                    <h4>
                      {item.phaseName[lang]}
                      <span className="states">{translate(step < phase ? 'common.completed' : 'common.pending')}</span>
                      <span className="bollet" />
                    </h4>
                    {step === phase && <div>{children}</div>}
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </div>
    </div>
  );
};

export default TrackersGenerator;
