export interface ShellBreadcrumbLabels {
  home: string;
  jobs: string;
  locations: string;
  salaries: string;
  companies: string;
  skills: string;
  titles: string;
  blog: string;
  post: string;
  about: string;
  impressum: string;
  termsOfService: string;
  privacyPolicy: string;
  cookiePolicy: string;
  talent: string;
}

export interface ShellBreadcrumbEntities {
  location?: string;
  query?: string;
  company?: string;
  job?: string;
  profile?: string;
  post?: string;
  author?: string;
  tag?: string;
}

/** Labels for the authed surfaces' trails — template catalog copy, passed in
 * by the shell so this module stays pure and testable. Every field is optional
 * at the call site via `Partial`; missing labels fall back to a readable form
 * of the path segment. */
export interface ShellBreadcrumbPrivateLabels {
  account: string;
  profile: string;
  savedJobs: string;
  jobAlerts: string;
  applications: string;
  applicants: string;
  subscription: string;
  settings: string;
  messages: string;
  signIn: string;
  signUp: string;
  postJob: string;
  companyProfile: string;
  employerDashboard: string;
}

interface RouteMatch {
  loaderData?: unknown;
}

// Only surfaces where a trail is meaningless: embeds render inside someone
// else's chrome, and the board-password gate is a lock screen.
const excludedPrefixes = ['/embed', '/password'] as const;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : null;
}

function stringField(value: unknown, field: string) {
  const source = record(value);
  const candidate = source?.[field];
  return typeof candidate === 'string' && candidate.trim() !== ''
    ? candidate
    : undefined;
}

function entityLabel(value: unknown, fields: string[]) {
  for (const field of fields) {
    const label = stringField(value, field);
    if (label) return label;
  }
  return undefined;
}

/** Extract API-resolved labels without coupling the shell to route data types. */
export function resolveShellBreadcrumbEntities(
  matches: readonly RouteMatch[],
): ShellBreadcrumbEntities {
  const entities: ShellBreadcrumbEntities = {};

  for (const match of matches) {
    const data = record(match.loaderData);
    if (!data) continue;

    entities.location ??= entityLabel(data.place, ['displayName', 'name']);
    entities.query ??=
      entityLabel(data.category, ['displayName', 'name']) ??
      entityLabel(data.skill, ['displayName', 'name']) ??
      entityLabel(data.market, ['displayName', 'name']);
    entities.company ??= entityLabel(data.company, ['name', 'displayName']);
    // Employer loaders nest the company inside a workspace envelope
    // ({ workspace: { membership: { company } } }).
    entities.company ??= entityLabel(
      record(record(data.workspace)?.membership)?.company,
      ['name', 'displayName'],
    );
    entities.job ??= entityLabel(data.job, ['title', 'name']);
    entities.profile ??= entityLabel(data.profile, ['displayName', 'name']);
    entities.post ??= entityLabel(data.post, ['title', 'name']);
    entities.author ??= entityLabel(data.author, ['name', 'displayName']);
    entities.tag ??= entityLabel(data.tag, ['name', 'displayName']);
  }

  return entities;
}

function readableSegment(segment: string) {
  return decodeURIComponent(segment)
    .replaceAll('-', ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function finish(items: { name: string; href?: string }[]) {
  return {
    items: items.map((item, index) =>
      index === items.length - 1 ? { name: item.name } : item,
    ),
  };
}

/** Build the one visible public trail rendered by the root shell. */
export function resolveShellBreadcrumb({
  pathname,
  labels,
  privateLabels = {},
  entities = {},
}: {
  pathname: string;
  labels: ShellBreadcrumbLabels;
  privateLabels?: Partial<ShellBreadcrumbPrivateLabels>;
  entities?: ShellBreadcrumbEntities;
}): { items: { name: string; href?: string }[] } | null {
  if (
    excludedPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  ) {
    return null;
  }

  const priv = (key: keyof ShellBreadcrumbPrivateLabels, segment: string) =>
    privateLabels[key] ?? readableSegment(segment);

  const segments = pathname.split('/').filter(Boolean);
  const items: { name: string; href?: string }[] = [
    { name: labels.home, href: '/' },
  ];

  if (segments.length === 0) return finish(items);

  const [section, ...rest] = segments;
  if (section === 'jobs') {
    items.push({ name: labels.jobs, href: '/jobs' });
    if (rest[0] === 'locations') {
      items.push({ name: labels.locations, href: '/jobs/locations' });
      if (rest[1]) {
        items.push({
          name: entities.location ?? readableSegment(rest[1]),
          href: `/jobs/locations/${rest[1]}`,
        });
      }
      if (rest[2] === 'skills' && rest[3]) {
        items.push({ name: entities.query ?? readableSegment(rest[3]) });
      } else if (rest[2]) {
        items.push({ name: entities.query ?? readableSegment(rest[2]) });
      }
    } else if (rest[0] === 'skills' && rest[1]) {
      items.push({ name: entities.query ?? readableSegment(rest[1]) });
    } else if (rest[0]) {
      items.push({ name: entities.query ?? readableSegment(rest[0]) });
    }
    return finish(items);
  }

  if (section === 'companies') {
    items.push({ name: labels.companies, href: '/companies' });
    if (rest[0] === 'markets' && rest[1]) {
      items.push({ name: entities.query ?? readableSegment(rest[1]) });
      return finish(items);
    }
    if (rest[0]) {
      items.push({
        name: entities.company ?? readableSegment(rest[0]),
        href: `/companies/${rest[0]}`,
      });
    }
    if (rest[1] === 'jobs') {
      items.push({
        name: labels.jobs,
        href: `/companies/${rest[0]}/jobs`,
      });
      if (rest[2]) {
        items.push({ name: entities.job ?? readableSegment(rest[2]) });
      }
    } else if (rest[1] === 'salaries') {
      items.push({
        name: labels.salaries,
        href: `/companies/${rest[0]}/salaries`,
      });
      if (rest[2]) items.push({ name: readableSegment(rest[2]) });
    }
    return finish(items);
  }

  if (section === 'talent') {
    items.push({ name: labels.talent });
    return finish(items);
  }

  if (section === 'p') {
    items.push({ name: labels.talent, href: '/talent' });
    if (rest[0]) {
      items.push({ name: entities.profile ?? readableSegment(rest[0]) });
    }
    return finish(items);
  }

  if (section === 'blog') {
    items.push({ name: labels.blog, href: '/blog' });
    if (rest[0] === 'tag' && rest[1]) {
      items.push({ name: entities.tag ?? readableSegment(rest[1]) });
    } else if (rest[0] === 'author' && rest[1]) {
      items.push({ name: entities.author ?? readableSegment(rest[1]) });
    } else if (rest[0]) {
      items.push({ name: entities.post ?? readableSegment(rest[0]) });
    }
    return finish(items);
  }

  if (section === 'salaries') {
    items.push({ name: labels.salaries, href: '/salaries' });
    let href = '/salaries';
    for (const segment of rest) {
      href += `/${segment}`;
      const name =
        segment === 'skills'
          ? labels.skills
          : segment === 'titles'
            ? labels.titles
            : segment === 'locations'
              ? labels.locations
              : segment === 'companies'
                ? labels.companies
                : readableSegment(segment);
      items.push({ name, href });
    }
    return finish(items);
  }

  if (section === 'auth') {
    const name =
      rest[0] === 'sign-in'
        ? priv('signIn', 'sign-in')
        : rest[0]?.endsWith('sign-up')
          ? priv('signUp', 'sign-up')
          : readableSegment(rest[0] ?? section);
    items.push({ name });
    return finish(items);
  }

  if (section === 'me') {
    // The `/me` segment itself is plumbing, not a place — skip it.
    const leaf = {
      profile: priv('profile', 'profile'),
      saved: priv('savedJobs', 'saved'),
      alerts: priv('jobAlerts', 'alerts'),
      applications: priv('applications', 'applications'),
    }[rest[0] ?? ''];
    items.push({ name: leaf ?? readableSegment(rest[0] ?? section) });
    return finish(items);
  }

  if (section === 'account') {
    items.push({ name: priv('account', 'account'), href: '/account' });
    if (rest[0] === 'access') {
      items.push({ name: priv('subscription', 'access') });
    } else if (rest[0]) {
      items.push({ name: readableSegment(rest[0]) });
    }
    return finish(items);
  }

  if (section === 'settings') {
    items.push({ name: priv('settings', 'settings') });
    return finish(items);
  }

  if (section === 'messages') {
    items.push({ name: priv('messages', 'messages') });
    return finish(items);
  }

  if (section === 'alerts') {
    items.push({ name: priv('jobAlerts', 'alerts') });
    return finish(items);
  }

  if (section === 'employers') {
    if (rest[0] === 'dashboard' || rest[0] === undefined) {
      items.push({ name: priv('employerDashboard', 'dashboard') });
      return finish(items);
    }
    if (rest[0] === 'onboarding') {
      items.push({
        name: entities.company ?? readableSegment(rest[1] ?? rest[0]),
      });
      return finish(items);
    }
    if (rest[0] === 'companies' && rest[1]) {
      items.push({
        name: entities.company ?? readableSegment(rest[1]),
        href: `/employers/companies/${rest[1]}`,
      });
      if (rest[2] === 'profile') {
        items.push({ name: priv('companyProfile', 'profile') });
      } else if (rest[2] === 'jobs' && rest[3] === 'new') {
        items.push({ name: priv('postJob', 'new') });
      } else if (rest[2] === 'jobs' && rest[4] === 'applicants') {
        items.push({ name: entities.job ?? priv('applicants', 'applicants') });
      }
      return finish(items);
    }
    items.push({ name: readableSegment(rest[0]) });
    return finish(items);
  }

  const knownPage = {
    post: labels.post,
    about: labels.about,
    impressum: labels.impressum,
    'terms-of-service': labels.termsOfService,
    'privacy-policy': labels.privacyPolicy,
    'cookie-policy': labels.cookiePolicy,
  }[section];
  items.push({ name: knownPage ?? readableSegment(section) });
  return finish(items);
}
