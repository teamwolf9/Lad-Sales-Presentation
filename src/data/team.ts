/**
 * Lad Irrigation team roster.
 *
 * Photos live in /public/employees. Titles, credentials, and bios below are
 * PLACEHOLDERS in Lad's voice — swap them for real values when supplied. Reps
 * pick from this roster on the Team step; selecting a person copies their title,
 * credential, and bio onto the proposal, where they remain fully editable.
 */
export interface RosterPerson {
  name: string
  title: string
  /** One-line credential / focus, e.g. "20 yrs · Pump systems". */
  credential: string
  /** Short bio (1–2 sentences). */
  bio: string
  photo: string
}

export const LAD_TEAM: RosterPerson[] = [
  {
    name: 'Steve Carter',
    title: 'General Manager',
    credential: '30+ yrs · Operations',
    bio: 'Leads the Lad team day to day and has overseen irrigation projects across the Northwest for three decades.',
    photo: 'employees/steve-carter.jpg',
  },
  {
    name: 'Jessy Pantoja',
    title: 'Pivot Design Specialist',
    credential: '12 yrs · Valley pivots',
    bio: 'Engineers center-pivot layouts matched to each field, water source, and crop for uniform coverage edge to edge.',
    photo: 'employees/jessy-pantoja.jpg',
  },
  {
    name: 'Casey Gubler',
    title: 'Service Manager',
    credential: '15 yrs · Field service',
    bio: 'Runs the service department and dispatch, keeping systems running through the season with fast on-farm support.',
    photo: 'employees/casey-gubler.jpg',
  },
  {
    name: 'Jamie Heise',
    title: 'Account Manager',
    credential: '10 yrs · Grower accounts',
    bio: 'Your single point of contact from quote to commissioning, coordinating the crews and parts behind your project.',
    photo: 'employees/jamie-heise.jpg',
  },
  {
    name: 'Paul Thompson',
    title: 'Pump Systems Engineer',
    credential: '22 yrs · Pumps & VFDs',
    bio: 'Specifies and tunes pump stations and variable-frequency drives to deliver the right flow and pressure efficiently.',
    photo: 'employees/paul-thompson.jpg',
  },
  {
    name: 'Thad Taylor',
    title: 'Installation Lead',
    credential: '18 yrs · Turn-key installs',
    bio: 'Heads up field installation, building systems to spec so they start clean and run reliably for years.',
    photo: 'employees/thad-taylor.jpg',
  },
  {
    name: 'Robert Chavez',
    title: 'Field Technician',
    credential: '9 yrs · Diagnostics',
    bio: 'Troubleshoots and repairs pivots, pumps, and controls in the field across every major brand.',
    photo: 'employees/robert-chavez.jpg',
  },
  {
    name: 'Brian Zietlow',
    title: 'Design Engineer',
    credential: '14 yrs · System design',
    bio: 'Turns field measurements and water data into complete, engineered irrigation designs ready to build.',
    photo: 'employees/brian-zietlow.jpg',
  },
  {
    name: 'Jason Durepo',
    title: 'Parts & Inventory Manager',
    credential: '11 yrs · Valley parts',
    bio: 'Keeps the largest Valley parts inventory in the region stocked so repairs and builds never wait on a part.',
    photo: 'employees/jason-durepo.jpg',
  },
  {
    name: 'Eric Murray',
    title: 'Project Manager',
    credential: '16 yrs · Project delivery',
    bio: 'Manages timelines, crews, and equipment to deliver each project on schedule and on budget.',
    photo: 'employees/eric-murray.jpg',
  },
  {
    name: 'Sean Shuler',
    title: 'Pump Install Technician',
    credential: '8 yrs · River & well pumps',
    bio: 'Installs and commissions river, well, and booster pump stations sized to the operation.',
    photo: 'employees/sean-shuler.jpg',
  },
  {
    name: 'Matt Petersen',
    title: 'Sales Specialist',
    credential: '13 yrs · Irrigation sales',
    bio: 'Helps growers scope the right system and walks every proposal through to a confident decision.',
    photo: 'employees/matt-petersen.jpg',
  },
  {
    name: 'Alex Martinez',
    title: 'Field Technician',
    credential: '7 yrs · Service & repair',
    bio: 'Handles seasonal service, repairs, and preventive maintenance to keep systems watering without interruption.',
    photo: 'employees/alex-martinez.jpg',
  },
  {
    name: 'JR Gonzalez',
    title: 'Installation Technician',
    credential: '10 yrs · Pivot builds',
    bio: 'Assembles and erects pivots in the field as part of the largest pivot-building crew in the Northwest.',
    photo: 'employees/jr-gonzalez.jpg',
  },
  {
    name: 'Daniel Handcock',
    title: 'Controls & Telemetry Specialist',
    credential: '9 yrs · Remote monitoring',
    bio: 'Sets up control panels and remote monitoring so you can manage and watch your system from anywhere.',
    photo: 'employees/daniel-handcock.jpg',
  },
  {
    name: 'Noah Mills',
    title: 'Service Technician',
    credential: '6 yrs · Maintenance',
    bio: 'Performs routine maintenance and in-season repairs that keep equipment dependable year over year.',
    photo: 'employees/noah-mills.jpg',
  },
  {
    name: 'Ian Eccles',
    title: 'Design Technician',
    credential: '8 yrs · CAD & layout',
    bio: 'Drafts precise system layouts and as-builts so every install matches the plan on paper.',
    photo: 'employees/ian-eccles.jpg',
  },
  {
    name: 'Brek Tolman',
    title: 'Account Manager',
    credential: '11 yrs · Customer success',
    bio: 'Builds long-term relationships with growers and makes sure each system keeps delivering after the sale.',
    photo: 'employees/brek-tolman.jpg',
  },
]
