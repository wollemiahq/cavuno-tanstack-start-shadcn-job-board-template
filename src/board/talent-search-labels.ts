import { entityCopy } from '../copy-groups/entity';
import { m } from '../paraglide/messages';

import type { TalentViewModelLabels } from '@/board/talent-view-model';

export function getTalentSearchLabels(): TalentViewModelLabels {
  return {
    anonymousCandidate: m.publicProfile_anonymousCandidateLabel(),
    experienceHeading: m.publicProfile_experienceHeading(),
    educationHeading: m.publicProfile_educationHeading(),
    skillsHeading: m.publicProfile_skillsHeading(),
    languagesHeading: m.publicProfile_languagesHeading(),
    present: entityCopy().candidatePresent,
    viewProfile: m.talentSearch_viewProfileLabel(),
    jobSearchStatuses: {
      actively_looking: m.talentSearch_statusActivelyLooking(),
      open_to_offers: m.talentSearch_statusOpenToOffers(),
      not_looking: m.talentSearch_statusNotLooking(),
    },
    employmentTypes: {
      full_time: m.talentSearch_employmentFullTime(),
      part_time: m.talentSearch_employmentPartTime(),
      self_employed: m.talentSearch_employmentSelfEmployed(),
      freelance: m.talentSearch_employmentFreelance(),
      contract: m.talentSearch_employmentContract(),
      internship: m.talentSearch_employmentInternship(),
      apprenticeship: m.talentSearch_employmentApprenticeship(),
    },
    locationTypes: {
      on_site: m.talentSearch_locationOnSite(),
      hybrid: m.talentSearch_locationHybrid(),
      remote: m.talentSearch_locationRemote(),
    },
    foundVia: {
      company_website: m.talentSearch_foundViaCompanyWebsite(),
      linkedin: m.talentSearch_foundViaLinkedIn(),
      indeed: m.talentSearch_foundViaIndeed(),
      other_job_sites: m.talentSearch_foundViaOtherJobSites(),
      referral: m.talentSearch_foundViaReferral(),
      contacted_by_recruiter: m.talentSearch_foundViaRecruiter(),
      staffing_agency: m.talentSearch_foundViaStaffingAgency(),
      this_board: m.talentSearch_foundViaThisBoard(),
      other: m.talentSearch_foundViaOther(),
    },
    languageProficiencies: {
      elementary: m.talentSearch_proficiencyElementary(),
      limited_working: m.talentSearch_proficiencyLimitedWorking(),
      professional_working: m.talentSearch_proficiencyProfessionalWorking(),
      full_professional: m.talentSearch_proficiencyFullProfessional(),
      native_or_bilingual: m.talentSearch_proficiencyNativeOrBilingual(),
    },
  };
}
