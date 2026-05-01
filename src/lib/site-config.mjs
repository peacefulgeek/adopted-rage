// ─── SITE 87: ADOPTED RAGE ─────────────────────────────────────────────
// Single source of truth for site identity.
// Per master-scope §9: BUNNY values are inlined here, NOT in env.

export const SITE = {
  name: 'Adopted Rage',
  apex: 'adoptedrage.com',
  tagline: 'Adoption gave you a family. It also took something from you.',
  description:
    'Adopted Rage names what adoption took: the primal wound, identity confusion, reunion grief, late-discovery shock, transracial wounds, and the long, quiet work of healing the rage that lives in the body.',
  niche:
    'adoptee experience, primal wound, identity, reunion, transracial adoption, late-discovery adoptees, adoptee rage, somatic healing',
  category_default: 'Adoptee Healing',
  toolkit_name: "The Adoptee's Toolkit",
  bottom_section_name: 'Adoptee Library',
  archetype: 'B', // Grid
  author: 'The Oracle Lover',
  author_link_target: 'https://theoraclelover.com',
  amazon_tag: process.env.AMAZON_TAG || 'spankyspinola-20',
};

// Per master-scope §9A: BUNNY hardcoded per-site (not in env).
export const BUNNY = {
  STORAGE_ZONE: 'adopted-rage',
  API_KEY: 'd1ff90b0-ec66-4a9b-86388372f50a-90af-4d7b',
  PULL_ZONE: 'https://adopted-rage.b-cdn.net',
  HOSTNAME: 'ny.storage.bunnycdn.com',
};

// Color palette per per-site scope §SITE 87.
export const PALETTE = {
  bg_primary: '#F4F1ED', // soft warm gray
  text_primary: '#2E3239', // deep slate
  accent_teal: '#5B8A8A', // muted teal
  accent_clay: '#B07B5A', // warm clay
};
