import { chromeNav } from '../lib/site-chrome';
import { m } from '../paraglide/messages';

export function navCopy() {
  const chrome = chromeNav();
  return {
    blog: chrome.blog ?? m.nav_blog(),
    companies: chrome.companies ?? m.nav_companies(),
    home: chrome.home ?? m.nav_home(),
    memberships: m.nav_memberships(),
    post: chrome.post ?? m.nav_post(),
    pricing: chrome.pricing ?? m.nav_pricing(),
    talent: chrome.talent ?? m.nav_talent(),
  };
}
