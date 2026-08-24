import { m } from '../paraglide/messages';

export function navCopy() {
  return {
    blog: m.nav_blog(),
    companies: m.nav_companies(),
    home: m.nav_home(),
    post: m.nav_post(),
    pricing: m.nav_pricing(),
    talent: m.nav_talent(),
  };
}
