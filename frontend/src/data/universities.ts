export const UNIVERSITY_OPTIONS = [
  "Arizona State University",
  "Auburn University",
  "Baylor University",
  "Boston College",
  "Boston University",
  "Brandeis University",
  "Brigham Young University",
  "Brown University",
  "California Institute of Technology",
  "Carnegie Mellon University",
  "Case Western Reserve University",
  "Clemson University",
  "Columbia University",
  "Cornell University",
  "Dartmouth College",
  "Drexel University",
  "Duke University",
  "Emory University",
  "Florida International University",
  "Florida State University",
  "Fordham University",
  "George Mason University",
  "George Washington University",
  "Georgetown University",
  "Georgia Institute of Technology",
  "Harvard University",
  "Howard University",
  "Indiana University Bloomington",
  "Iowa State University",
  "Johns Hopkins University",
  "Lehigh University",
  "Massachusetts Institute of Technology",
  "Michigan State University",
  "New York University",
  "North Carolina State University",
  "Northeastern University",
  "Northwestern University",
  "Ohio State University",
  "Pennsylvania State University",
  "Princeton University",
  "Purdue University",
  "Rensselaer Polytechnic Institute",
  "Rice University",
  "Rutgers University",
  "Southern Methodist University",
  "Stanford University",
  "Stony Brook University",
  "Syracuse University",
  "Temple University",
  "Texas A&M University",
  "The University of Alabama",
  "Tufts University",
  "Tulane University",
  "University of Arizona",
  "University of California, Berkeley",
  "University of California, Davis",
  "University of California, Irvine",
  "University of California, Los Angeles",
  "University of California, Riverside",
  "University of California, San Diego",
  "University of California, Santa Barbara",
  "University of California, Santa Cruz",
  "University of Chicago",
  "University of Colorado Boulder",
  "University of Connecticut",
  "University of Delaware",
  "University of Florida",
  "University of Georgia",
  "University of Houston",
  "University of Illinois Chicago",
  "University of Illinois Urbana-Champaign",
  "University of Iowa",
  "University of Maryland, College Park",
  "University of Massachusetts Amherst",
  "University of Miami",
  "University of Michigan",
  "University of Minnesota Twin Cities",
  "University of Missouri",
  "University of North Carolina at Chapel Hill",
  "University of Notre Dame",
  "University of Oklahoma",
  "University of Oregon",
  "University of Pennsylvania",
  "University of Pittsburgh",
  "University of Rochester",
  "University of Southern California",
  "University of Texas at Austin",
  "University of Utah",
  "University of Virginia",
  "University of Washington",
  "University of Wisconsin-Madison",
  "Vanderbilt University",
  "Virginia Polytechnic Institute and State University",
  "Wake Forest University",
  "Washington University in St. Louis",
  "West Virginia University",
  "Yale University",
  "ETH Zurich",
  "Imperial College London",
  "King's College London",
  "London School of Economics and Political Science",
  "National University of Singapore",
  "Nanyang Technological University",
  "Seoul National University",
  "Tsinghua University",
  "University College London",
  "University of Amsterdam",
  "University of British Columbia",
  "University of Cambridge",
  "University of Edinburgh",
  "University of Hong Kong",
  "University of Melbourne",
  "University of Oxford",
  "University of Sydney",
  "University of Toronto",
  "University of Waterloo",
] as const;

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function findUniversityMatches(query: string, limit = 8) {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) {
    return UNIVERSITY_OPTIONS.slice(0, limit);
  }

  const startsWith = UNIVERSITY_OPTIONS.filter((option) =>
    normalize(option).startsWith(normalizedQuery)
  );
  const includes = UNIVERSITY_OPTIONS.filter(
    (option) =>
      !startsWith.includes(option) &&
      normalize(option).includes(normalizedQuery)
  );

  return [...startsWith, ...includes].slice(0, limit);
}

export function isKnownUniversity(value: string) {
  const normalized = normalize(value);
  return UNIVERSITY_OPTIONS.some((option) => normalize(option) === normalized);
}
