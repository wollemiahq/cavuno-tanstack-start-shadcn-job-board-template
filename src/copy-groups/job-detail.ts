import { m } from '../paraglide/messages';

export function jobDetailCopy() {
  return {
    aboutCompanyHeading: m.jobDetail_aboutCompanyHeading(),
    additionalDetailsHeading: m.jobDetail_additionalDetailsHeading(),
    breadcrumbAriaLabel: m.jobDetail_breadcrumbAriaLabel(),
    categoriesHeading: m.jobDetail_categoriesHeading(),
    customFieldNoLabel: m.jobDetail_customFieldNoLabel(),
    customFieldYesLabel: m.jobDetail_customFieldYesLabel(),
    educationLabel: m.jobDetail_educationLabel(),
    experienceLabel: m.jobDetail_experienceLabel(),
    experienceYears: (years: number) => m.jobDetail_experienceYears({ years }),
    locationNotSpecifiedLabel: m.jobDetail_locationNotSpecifiedLabel(),
    locationsLabel: m.jobDetail_locationsLabel(),
    noDescriptionText: m.jobDetail_noDescriptionText(),
    noExperienceRequiredLabel: m.jobDetail_noExperienceRequiredLabel(),
    posted: (date: string) => m.jobDetail_posted({ date }),
    sidebarAriaLabel: m.jobDetail_sidebarAriaLabel(),
    similarJobsHeading: m.jobDetail_similarJobsHeading(),
    skillsHeading: m.jobDetail_skillsHeading(),
    timezonesLabel: m.jobDetail_timezonesLabel(),
    viewCompanyProfileLabel: m.jobDetail_viewCompanyProfileLabel(),
    workPermitsLabel: m.jobDetail_workPermitsLabel(),
    worldwideLabel: m.jobDetail_worldwideLabel(),
  };
}
