// Locations from the school directory supplied by the user.
const directory = [
  [
    "Alexander Mackenzie High School",
    "Richmond Hill",
    "300 Major Mackenzie Dr. W.",
  ],
  ["Aurora High School", "Aurora", "155 Wellington St. W."],
  ["Bayview Secondary School", "Richmond Hill", "10077 Bayview Ave."],
  ["Bill Crothers Secondary School", "Unionville", "44 Main Street"],
  ["Bill Hogarth Secondary School", "Markham", "100 Donald Sim Avenue"],
  ["Bur Oak Secondary School", "Markham", "933 Bur Oak Ave."],
  ["Dr. G.W. Williams Secondary School", "Aurora", "11 Spring Farm Road"],
  ["Dr. J.M. Denison Secondary School", "Newmarket", "135 Bristol Rd."],
  ["Emily Carr Secondary School", "Woodbridge", "4901 Rutherford Rd."],
  ["Hodan Nalayeh Secondary School", "Thornhill", "1401 Clark Ave. W."],
  ["Huron Heights Secondary School", "Newmarket", "40 Huron Heights Dr."],
  ["Keswick High School", "Keswick", "100 Biscayne Blvd."],
  ["King City Secondary School", "King City", "2001 King Rd."],
  ["Langstaff Secondary School", "Richmond Hill", "106 Garden Ave."],
  ["Maple High School", "Maple", "50 Springside Rd."],
  ["Markham District High School", "Markham", "89 Church St."],
  ["Markville Secondary School", "Markham", "1000 Carlton Rd."],
  ["Middlefield Collegiate Institute", "Markham", "525 Highglen Ave."],
  ["Milliken Mills High School", "Unionville", "7522 Kennedy Rd."],
  ["Newmarket High School", "Newmarket", "505 Pickering Cres."],
  ["Pierre Elliott Trudeau High School", "Markham", "90 Bur Oak Ave."],
  [
    "Richmond Green Secondary School",
    "Richmond Hill",
    "1 William F. Bell Parkway",
  ],
  ["Richmond Hill High School", "Richmond Hill", "201 Yorkland St."],
  ["Sir William Mulock Secondary School", "Newmarket", "705 Columbus Way"],
  ["Stephen Lewis Secondary School", "Thornhill", "555 Autumn Hill Blvd."],
  [
    "Stouffville District Secondary School",
    "Stouffville",
    "801 Hoover Park Drive",
  ],
  ["Sutton District High School", "Sutton", "20798 Dalton Rd."],
  ["Thornhill Secondary School", "Thornhill", "167 Dudley Ave."],
  ["Thornlea Secondary School", "Thornhill", "8075 Bayview Ave."],
  [
    "Tommy Douglas Secondary School",
    "Woodbridge",
    "4020 Major Mackenzie Drive",
  ],
  ["Unionville High School", "Unionville", "201 Town Centre Blvd."],
  ["Westmount Collegiate Institute", "Thornhill", "1000 New Westminster Dr."],
  ["Woodbridge College", "Woodbridge", "71 Bruce St."],
];
export const schools = directory.map(([name, city, address]) => ({
  name,
  city,
  address,
}));
export type School = (typeof schools)[number];
function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\bhigh school\b|\bsecondary school\b|\bhs\b|\bss\b/g, "school")
    .replace(/\bcollegiate institute\b|\bci\b/g, "collegiate")
    .replace(/\bdhs\b|\bdss\b/g, "district school")
    .replace(/[^a-z0-9]/g, "");
}
export function findSchool(value: string): School | undefined {
  const normalized = normalize(value);
  const matches = schools.filter((s) => normalized.includes(normalize(s.name)));
  return matches.length === 1 ? matches[0] : undefined;
}
export function schoolFromDocument(document: Document): string {
  const body = document.body.cloneNode(true) as HTMLElement;
  body
    .querySelectorAll("script, style, template, nav, select")
    .forEach((e) => e.remove());
  // Prefer explicit labels wherever they occur, then inspect visible page text.
  const headings = [...body.querySelectorAll("h1,h2,h3,h4,strong,b")]
    .map((e) => findSchool(e.textContent ?? ""))
    .filter(Boolean);
  const distinct = [...new Set(headings.map((s) => s!.name))];
  if (distinct.length === 1) return distinct[0];
  if (distinct.length > 1) return "";
  return findSchool(body.textContent ?? "")?.name ?? "";
}
