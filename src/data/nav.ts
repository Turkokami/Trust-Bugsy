// Navigation copied from the live site's header menus (23 Nov 2026), same URLs.
export const nav = [
  {
    label: 'Residential', href: '/residential-pest-control/',
    children: [
      ['Ant Control', '/ant-control/'],
      ['Mosquito Control', '/mosquito-control/'],
      ['Cockroach Control', '/cockroach-control-extermination/'],
      ['Spider Control', '/spider-control-removal/'],
      ['Flea Control', '/flea-control-extermination/'],
      ['Bed Bug Extermination', '/bed-bug-extermination/'],
      ['Rodent Control', '/rodent-control/'],
      ['Wasp & Bee Removal', '/wasp-bee-removal/'],
      ['Termite Control', '/termite-control/'],
      ['Attic Sanitation & Insulation', '/attic-sanitation-insulation-removal/'],
      ['Mosquito Misting Systems', '/mosquito-misting-systems/'],
      ['Insulation Replacement', '/insulation-replacement/'],
      ['Wildlife Trapping & Exclusion', '/wildlife-trapping-exclusion/'],
    ],
  },
  {
    label: 'Commercial', href: '/commercial/',
    children: [
      ['HOA & Condo', '/hoa-condo-pest-control/'],
      ['Property Management', '/commercial/property-management/'],
      ['Restaurants & Food Service', '/commercial/restaurants-food-service/'],
      ['Healthcare Facilities', '/commercial/healthcare-facilities/'],
      ['Office Buildings', '/commercial/office-buildings/'],
      ['Hotels & Hospitality', '/commercial/hotels-hospitality/'],
      ['Schools & Childcare', '/commercial/schools-childcare/'],
      ['Retail & Shopping Centers', '/commercial/retail-stores-shopping-centers/'],
      ['Multi-Family & HOAs', '/commercial/multi-family-properties-hoas/'],
      ['Government Buildings', '/commercial/government-buildings/'],
    ],
  },
  {
    label: 'Service Area', href: '/service-area/',
    children: [
      ['Boca Raton', '/boca-raton-fl-pest-control/'],
      ['Pompano Beach', '/pompano-beach-fl-pest-control/'],
      ['Palm Beach County', '/palm-beach-county-pest-control/'],
      ['Broward County', '/broward-county-fl-pest-control/'],
      ['All service areas', '/service-area/'],
    ],
  },
  {
    label: 'Our Plans', href: '/packages/',
    children: [
      ['Gold', '/gold-package/'],
      ['Gold Plus', '/gold-plus/'],
      ['Platinum', '/platinum-package/'],
      ['Diamond', '/diamond-package/'],
    ],
  },
  { label: 'Pest Library', href: '/pest-library/' },
  { label: 'About', href: '/about/' },
  { label: 'Contact', href: '/contact/' },
] as const;
