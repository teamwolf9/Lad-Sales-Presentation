/**
 * Lad Irrigation team roster.
 *
 * Photos live in /public/employees. Titles are PLACEHOLDERS for now — swap the
 * `title` values when real titles are provided. Reps pick from this roster on
 * the Team step to add people to a specific proposal.
 */
export interface RosterPerson {
  name: string
  title: string
  photo: string
}

/** Placeholder title until real titles are supplied. */
const PLACEHOLDER_TITLE = 'Team Member'

export const LAD_TEAM: RosterPerson[] = [
  { name: 'Steve Carter', title: PLACEHOLDER_TITLE, photo: 'employees/steve-carter.jpg' },
  { name: 'Jessy Pantoja', title: PLACEHOLDER_TITLE, photo: 'employees/jessy-pantoja.jpg' },
  { name: 'Casey Gubler', title: PLACEHOLDER_TITLE, photo: 'employees/casey-gubler.jpg' },
  { name: 'Jamie Heise', title: PLACEHOLDER_TITLE, photo: 'employees/jamie-heise.jpg' },
  { name: 'Paul Thompson', title: PLACEHOLDER_TITLE, photo: 'employees/paul-thompson.jpg' },
  { name: 'Thad Taylor', title: PLACEHOLDER_TITLE, photo: 'employees/thad-taylor.jpg' },
  { name: 'Robert Chavez', title: PLACEHOLDER_TITLE, photo: 'employees/robert-chavez.jpg' },
  { name: 'Brian Zietlow', title: PLACEHOLDER_TITLE, photo: 'employees/brian-zietlow.jpg' },
  { name: 'Jason Durepo', title: PLACEHOLDER_TITLE, photo: 'employees/jason-durepo.jpg' },
  { name: 'Eric Murray', title: PLACEHOLDER_TITLE, photo: 'employees/eric-murray.jpg' },
  { name: 'Sean Shuler', title: PLACEHOLDER_TITLE, photo: 'employees/sean-shuler.jpg' },
  { name: 'Matt Petersen', title: PLACEHOLDER_TITLE, photo: 'employees/matt-petersen.jpg' },
  { name: 'Alex Martinez', title: PLACEHOLDER_TITLE, photo: 'employees/alex-martinez.jpg' },
  { name: 'JR Gonzalez', title: PLACEHOLDER_TITLE, photo: 'employees/jr-gonzalez.jpg' },
  { name: 'Daniel Handcock', title: PLACEHOLDER_TITLE, photo: 'employees/daniel-handcock.jpg' },
  { name: 'Noah Mills', title: PLACEHOLDER_TITLE, photo: 'employees/noah-mills.jpg' },
  { name: 'Ian Eccles', title: PLACEHOLDER_TITLE, photo: 'employees/ian-eccles.jpg' },
  { name: 'Brek Tolman', title: PLACEHOLDER_TITLE, photo: 'employees/brek-tolman.jpg' },
]
