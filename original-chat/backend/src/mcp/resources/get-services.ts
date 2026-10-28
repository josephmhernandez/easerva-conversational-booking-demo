/** The intentionally small set of categories backed by the public demo catalog. */
export function getServices(): { id: string; description: string }[] {
  return [
    {
      id: "Printing Service",
      description: "Business cards, posters, banners, signs, and document printing",
    },
    {
      id: "Pet Services",
      description: "Dog walking, grooming, pet sitting, and boarding",
    },
    {
      id: "Home Services",
      description: "Electrical, plumbing, HVAC, and handyman services",
    },
    {
      id: "Photography",
      description: "Portrait, event, product, and commercial photography",
    },
    {
      id: "Technology Services",
      description: "Web development, IT support, automation, and cloud consulting",
    },
  ];
}
