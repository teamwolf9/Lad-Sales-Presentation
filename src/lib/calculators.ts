/**
 * Declarative design-calculator framework.
 *
 * Each calculator faithfully replicates one sheet of Lad's "SYSTEM DESIGN"
 * workbook: a set of input fields and computed outputs (exact formulas/units).
 * The UI renders any calculator generically from this schema, so adding more
 * sheets is just data.
 */
export type CalcGroup = 'Pivot' | 'Pump' | 'Hydraulic' | 'Electrical' | 'Cost'

export interface CalcField {
  key: string
  label: string
  unit?: string
  default?: number
  step?: number
  hint?: string
}

export interface CalcOutput {
  key: string
  label: string
  unit?: string
  /** decimals to show (default 1) */
  dp?: number
  fn: (v: Record<string, number>) => number
}

export interface CalcDef {
  id: string
  name: string
  group: CalcGroup
  blurb: string
  fields: CalcField[]
  outputs: CalcOutput[]
}

/** value getter with 0 fallback */
const G = (v: Record<string, number>) => (k: string) => (Number.isFinite(v[k]) ? v[k] : 0)
const PI = 3.14

export const CALCULATORS: CalcDef[] = [
  /* ----------------------------- PIVOT ----------------------------- */
  {
    id: 'acreage',
    name: 'Pivot Acreage',
    group: 'Pivot',
    blurb: 'Irrigated acres, GPM, and HP from pivot length, rotation, and end-gun coverage.',
    fields: [
      { key: 'length', label: 'Pivot length', unit: 'ft' },
      { key: 'degrees', label: 'Degrees of rotation', unit: '°', default: 360 },
      { key: 'endGun', label: 'End-gun coverage', unit: 'ft' },
      { key: 'endGunPct', label: 'End-gun %', unit: '%', default: 100 },
      { key: 'gpa', label: 'GPM per acre', default: 7.25, step: 0.25 },
      { key: 'psi', label: 'Pressure @ pump', unit: 'psi', default: 60 },
    ],
    outputs: [
      {
        key: 'acresIron',
        label: 'Acres under iron',
        dp: 1,
        fn: (v) => { const g = G(v); return (g('length') ** 2) * (PI / 43560) / 360 * g('degrees') },
      },
      {
        key: 'acresTotal',
        label: 'Acres incl. end gun',
        dp: 1,
        fn: (v) => {
          const g = G(v)
          const tot = g('length') + g('endGun')
          const iron = (g('length') ** 2) * (PI / 43560) / 360 * g('degrees')
          const totAc = (tot ** 2) * (PI / 43560) / 360 * g('degrees')
          return iron + (totAc - iron) * (g('endGunPct') / 100)
        },
      },
      {
        key: 'gpm',
        label: 'GPM required',
        dp: 0,
        fn: (v) => {
          const g = G(v)
          const tot = g('length') + g('endGun')
          const iron = (g('length') ** 2) * (PI / 43560) / 360 * g('degrees')
          const totAc = (tot ** 2) * (PI / 43560) / 360 * g('degrees')
          const acres = iron + (totAc - iron) * (g('endGunPct') / 100)
          return acres * g('gpa')
        },
      },
      {
        key: 'hp',
        label: 'Est. HP',
        dp: 1,
        fn: (v) => {
          const g = G(v)
          const tot = g('length') + g('endGun')
          const iron = (g('length') ** 2) * (PI / 43560) / 360 * g('degrees')
          const totAc = (tot ** 2) * (PI / 43560) / 360 * g('degrees')
          const acres = iron + (totAc - iron) * (g('endGunPct') / 100)
          const gpm = acres * g('gpa')
          return (gpm * (g('psi') * 2.31)) / (0.8 * 3960)
        },
      },
    ],
  },
  {
    id: 'corner',
    name: 'Corner Acreage',
    group: 'Pivot',
    blurb: 'Irrigated acres and flow for a corner / wetted-radius machine.',
    fields: [
      { key: 'radius', label: 'Wetted radius', unit: 'ft' },
      { key: 'degrees', label: 'Total degrees of arc', unit: '°' },
      { key: 'extraAcres', label: 'Extra triangle acres', unit: 'ac' },
      { key: 'psi', label: 'PSI required', unit: 'psi', default: 60 },
    ],
    outputs: [
      {
        key: 'acres',
        label: 'Irrigated acres',
        dp: 1,
        fn: (v) => { const g = G(v); return ((g('radius') ** 2) * (PI / 43560) / 360 * g('degrees') + g('extraAcres')) * 0.98 },
      },
      { key: 'gpm', label: 'GPM required', dp: 0, fn: (v) => { const g = G(v); return (g('radius') ** 2) * PI / 43560 * 7.25 } },
      {
        key: 'hp',
        label: 'HP required',
        dp: 1,
        fn: (v) => { const g = G(v); return g('psi') * 2.32 * ((g('radius') ** 2) * PI / 43560 * 7.25) / 0.8 / 3960 },
      },
    ],
  },
  {
    id: 'timer',
    name: '%Timer & Precip',
    group: 'Pivot',
    blurb: 'Application depth, travel speed, and revolution time for a pivot.',
    fields: [
      { key: 'radius', label: 'Wetted radius', unit: 'ft' },
      { key: 'lrdu', label: 'Distance to LRDU', unit: 'ft' },
      { key: 'gpm', label: 'GPM' },
      { key: 'cdRpm', label: 'Center-drive RPM' },
      { key: 'wdRpm', label: 'Wheel-drive RPM' },
      { key: 'tire', label: 'Tire factor', hint: '11.2×24=10.55 · 14.9×24=11.75 · 16.9×24=13.15', step: 0.05 },
      { key: 'degrees', label: 'Degrees rotation', unit: '°', default: 360 },
    ],
    outputs: [
      { key: 'inDay', label: 'Gross app', unit: 'in/day', dp: 2, fn: (v) => { const g = G(v); return g('radius') > 0 ? (g('gpm') * 735.3) / (g('radius') ** 2) : 0 } },
      { key: 'speed', label: 'LRDU travel speed', dp: 2, fn: (v) => { const g = G(v); return g('wdRpm') > 0 ? (g('cdRpm') / g('wdRpm')) * g('tire') : 0 } },
      {
        key: 'revHrs',
        label: 'Revolution @100%',
        unit: 'hrs',
        dp: 1,
        fn: (v) => { const g = G(v); const sp = g('wdRpm') > 0 ? (g('cdRpm') / g('wdRpm')) * g('tire') : 0; return sp > 0 ? (g('lrdu') * 2 * PI) / sp / 60 : 0 },
      },
      {
        key: 'app100',
        label: 'Application @100%',
        unit: 'in',
        dp: 2,
        fn: (v) => {
          const g = G(v)
          const sp = g('wdRpm') > 0 ? (g('cdRpm') / g('wdRpm')) * g('tire') : 0
          const rev = sp > 0 ? (g('lrdu') * 2 * PI) / sp / 60 : 0
          const inDay = g('radius') > 0 ? (g('gpm') * 735.3) / (g('radius') ** 2) : 0
          return (rev * inDay) / 24
        },
      },
    ],
  },
  {
    id: 'pivotfriction',
    name: 'Pivot Friction Loss',
    group: 'Hydraulic',
    blurb: 'Hazen-Williams friction loss down a pivot lateral (C≈140, 0.56 factor).',
    fields: [
      { key: 'length', label: 'Pivot length', unit: 'ft' },
      { key: 'pipeId', label: 'Pipe ID', unit: 'in', step: 0.125 },
      { key: 'gpm', label: 'GPM' },
      { key: 'c', label: 'Pipe C', default: 140, step: 5 },
    ],
    outputs: [
      { key: 'vel', label: 'Velocity', unit: 'fps', dp: 2, fn: (v) => { const g = G(v); return g('pipeId') > 0 ? (0.408 * g('gpm')) / g('pipeId') ** 2 : 0 } },
      { key: 'l100', label: 'Loss / 100 ft', unit: 'ft', dp: 2, fn: (v) => { const g = G(v); return g('pipeId') > 0 && g('c') > 0 ? (1045 * (g('gpm') / g('c')) ** 1.852) / g('pipeId') ** 4.87 : 0 } },
      {
        key: 'lossFt',
        label: 'Friction loss',
        unit: 'ft',
        dp: 1,
        fn: (v) => { const g = G(v); const l100 = g('pipeId') > 0 && g('c') > 0 ? (1045 * (g('gpm') / g('c')) ** 1.852) / g('pipeId') ** 4.87 : 0; return (l100 / 100) * g('length') * 0.56 },
      },
    ],
  },

  /* ----------------------------- PUMP ----------------------------- */
  {
    id: 'turbine',
    name: 'Turbine Pump Design',
    group: 'Pump',
    blurb: 'TDH, bowl pressure, water/brake HP, and stages for a vertical turbine.',
    fields: [
      { key: 'gpm', label: 'Design GPM' },
      { key: 'level', label: 'Pumping level', unit: 'ft' },
      { key: 'column', label: 'Column loss', unit: 'ft' },
      { key: 'head', label: 'Head loss', unit: 'ft' },
      { key: 'disc', label: 'Head @ discharge', unit: 'ft' },
      { key: 'eff', label: 'Pump efficiency', default: 0.8, step: 0.01 },
      { key: 'ftStage', label: 'Ft per stage', unit: 'ft' },
      { key: 'shaftLoss', label: 'Lineshaft HP loss', unit: 'hp' },
      { key: 'maxBowl', label: 'Max bowl pressure', unit: 'psi', default: 375 },
    ],
    outputs: [
      { key: 'tdh', label: 'Subtotal TDH', unit: 'ft', dp: 1, fn: (v) => { const g = G(v); return g('level') + g('column') + g('head') + g('disc') } },
      { key: 'psi', label: 'PSI @ bowl', unit: 'psi', dp: 1, fn: (v) => { const g = G(v); return (g('level') + g('column') + g('head') + g('disc')) / 2.31 } },
      { key: 'whp', label: 'Water HP', unit: 'hp', dp: 1, fn: (v) => { const g = G(v); const tdh = g('level') + g('column') + g('head') + g('disc'); return g('eff') > 0 ? (g('gpm') * tdh) / g('eff') / 3960 : 0 } },
      { key: 'bhp', label: 'Brake HP', unit: 'hp', dp: 1, fn: (v) => { const g = G(v); const tdh = g('level') + g('column') + g('head') + g('disc'); const whp = g('eff') > 0 ? (g('gpm') * tdh) / g('eff') / 3960 : 0; return whp + g('shaftLoss') } },
      { key: 'stages', label: 'Stages required', dp: 1, fn: (v) => { const g = G(v); const tdh = g('level') + g('column') + g('head') + g('disc'); return g('ftStage') > 0 ? tdh / g('ftStage') : 0 } },
      { key: 'safety', label: 'Safety margin', unit: 'psi', dp: 1, fn: (v) => { const g = G(v); return g('maxBowl') - (g('level') + g('column') + g('head') + g('disc')) / 2.31 } },
    ],
  },
  {
    id: 'powerflow',
    name: 'Power / Flow',
    group: 'Pump',
    blurb: 'Runtime, total gallons, and acre-feet from metered power and pump flow.',
    fields: [
      { key: 'amps', label: 'Motor amperage' },
      { key: 'volts', label: 'Voltage', unit: 'V', default: 460 },
      { key: 'pf', label: 'Power factor', default: 0.85, step: 0.01 },
      { key: 'kwh', label: 'Metered kWh' },
      { key: 'gpm', label: 'Pump flow', unit: 'GPM' },
    ],
    outputs: [
      { key: 'kw', label: 'Motor KW', dp: 1, fn: (v) => { const g = G(v); return (g('amps') * g('volts')) / 1000 } },
      {
        key: 'hours',
        label: 'Runtime',
        unit: 'hrs',
        dp: 0,
        fn: (v) => { const g = G(v); const akw = g('pf') > 0 ? (g('amps') * g('volts')) / 1000 / g('pf') : 0; const used = g('pf') > 0 ? g('kwh') / g('pf') : 0; return akw > 0 ? used / akw : 0 },
      },
      {
        key: 'gallons',
        label: 'Total gallons',
        dp: 0,
        fn: (v) => { const g = G(v); const akw = g('pf') > 0 ? (g('amps') * g('volts')) / 1000 / g('pf') : 0; const used = g('pf') > 0 ? g('kwh') / g('pf') : 0; const hrs = akw > 0 ? used / akw : 0; return hrs * g('gpm') * 60 },
      },
      {
        key: 'acreft',
        label: 'Total acre-ft',
        dp: 1,
        fn: (v) => { const g = G(v); const akw = g('pf') > 0 ? (g('amps') * g('volts')) / 1000 / g('pf') : 0; const used = g('pf') > 0 ? g('kwh') / g('pf') : 0; const hrs = akw > 0 ? used / akw : 0; return (hrs * g('gpm') * 60) / 325829 },
      },
    ],
  },

  /* ----------------------------- HYDRAULIC ----------------------------- */
  {
    id: 'pond',
    name: 'Pond Volume',
    group: 'Hydraulic',
    blurb: 'Usable storage estimate for a sloped-side pond (truncated pyramid).',
    fields: [
      { key: 'topL', label: 'Top length', unit: 'ft' },
      { key: 'topW', label: 'Top width', unit: 'ft' },
      { key: 'depth', label: 'Usable depth', unit: 'ft' },
      { key: 'slope', label: 'Side slope (run:1)', default: 3, step: 0.5 },
    ],
    outputs: [
      {
        key: 'gallons',
        label: 'Usable gallons',
        dp: 0,
        fn: (v) => {
          const g = G(v)
          const botL = Math.max(0, g('topL') - 2 * g('slope') * g('depth'))
          const botW = Math.max(0, g('topW') - 2 * g('slope') * g('depth'))
          const avg = (g('topL') * g('topW') + botL * botW) / 2
          return avg * g('depth') * 7.48
        },
      },
      {
        key: 'acreft',
        label: 'Acre-feet',
        dp: 2,
        fn: (v) => {
          const g = G(v)
          const botL = Math.max(0, g('topL') - 2 * g('slope') * g('depth'))
          const botW = Math.max(0, g('topW') - 2 * g('slope') * g('depth'))
          const avg = (g('topL') * g('topW') + botL * botW) / 2
          return (avg * g('depth') * 7.48) / 325829
        },
      },
      {
        key: 'cuyds',
        label: 'Cubic yards',
        dp: 0,
        fn: (v) => {
          const g = G(v)
          const botL = Math.max(0, g('topL') - 2 * g('slope') * g('depth'))
          const botW = Math.max(0, g('topW') - 2 * g('slope') * g('depth'))
          const avg = (g('topL') * g('topW') + botL * botW) / 2
          return (avg * g('depth')) / 27
        },
      },
    ],
  },

  /* ----------------------------- ELECTRICAL ----------------------------- */
  {
    id: 'efla',
    name: 'EFLA (Amp Draw)',
    group: 'Electrical',
    blurb: 'Effective full-load amps for sizing service to a pivot.',
    fields: [
      { key: 'endTower', label: 'End-tower amp draw' },
      { key: 'hiMotors', label: '# hi-speed motors' },
      { key: 'stdMotors', label: '# std-speed motors' },
      { key: 'b2', label: '# 2HP booster pumps' },
      { key: 'b5', label: '# 5HP booster pumps' },
      { key: 'b75', label: '# 7.5HP booster pumps' },
      { key: 'stdCorner', label: '# std-speed corners' },
      { key: 'hiCorner', label: '# hi-speed corners' },
    ],
    outputs: [
      {
        key: 'efla',
        label: 'Total EFLA',
        unit: 'A',
        dp: 1,
        fn: (v) => {
          const g = G(v)
          return (
            g('endTower') * 1.25 +
            g('hiMotors') * 1.8 * 0.6 +
            g('stdMotors') * 1.1 * 0.6 +
            g('b2') * 3.4 * 1.25 +
            g('b5') * 7.6 * 1.25 +
            g('b75') * 11 * 1.25 +
            g('stdCorner') * 2.1 * 2.5 +
            g('hiCorner') * 3 * 2.5
          )
        },
      },
    ],
  },
  {
    id: 'voltagedrop',
    name: 'Voltage Drop',
    group: 'Electrical',
    blurb: 'Voltage drop and available voltage at the pivot over a wire run.',
    fields: [
      { key: 'k', label: 'Material K', default: 36.8, hint: 'Aluminum = 36.8 · Copper = 22.3' },
      { key: 'efla', label: 'EFLA', unit: 'A' },
      { key: 'distance', label: 'Distance', unit: 'ft' },
      { key: 'cirmil', label: 'Wire cir-mils', hint: '#6=26240 · #4=41740 · #2=66360 · #1/0=105600 · #4/0=211600' },
      { key: 'volts', label: 'Supply voltage', unit: 'V', default: 480 },
    ],
    outputs: [
      { key: 'vd', label: 'Voltage drop', unit: 'V', dp: 1, fn: (v) => { const g = G(v); return g('cirmil') > 0 ? (g('k') * g('efla') * g('distance')) / g('cirmil') : 0 } },
      { key: 'vdpct', label: 'Drop %', unit: '%', dp: 2, fn: (v) => { const g = G(v); const vd = g('cirmil') > 0 ? (g('k') * g('efla') * g('distance')) / g('cirmil') : 0; return g('volts') > 0 ? (vd / g('volts')) * 100 : 0 } },
      { key: 'avail', label: 'Volts @ pivot', unit: 'V', dp: 1, fn: (v) => { const g = G(v); const vd = g('cirmil') > 0 ? (g('k') * g('efla') * g('distance')) / g('cirmil') : 0; return g('volts') - vd } },
    ],
  },

  /* ----------------------------- COST ----------------------------- */
  {
    id: 'pumpcost',
    name: 'Pump Cost / Payback',
    group: 'Cost',
    blurb: 'Annual power cost of two pumps, yearly savings, and years to repay.',
    fields: [
      { key: 'hp1', label: 'Pump 1 — HP' },
      { key: 'days1', label: 'Pump 1 — days operated' },
      { key: 'hp2', label: 'Pump 2 — HP' },
      { key: 'days2', label: 'Pump 2 — days operated' },
      { key: 'cost', label: 'Power cost', unit: '$/kWh', step: 0.01 },
      { key: 'conv', label: 'Conversion cost', unit: '$', step: 100 },
    ],
    outputs: [
      { key: 'a1', label: 'Pump 1 annual cost', unit: '$', dp: 0, fn: (v) => { const g = G(v); return g('hp1') * 0.746 * (g('days1') * 24) * g('cost') } },
      { key: 'a2', label: 'Pump 2 annual cost', unit: '$', dp: 0, fn: (v) => { const g = G(v); return g('hp2') * 0.746 * (g('days2') * 24) * g('cost') } },
      { key: 'save', label: 'Savings / year', unit: '$', dp: 0, fn: (v) => { const g = G(v); return g('hp1') * 0.746 * (g('days1') * 24) * g('cost') - g('hp2') * 0.746 * (g('days2') * 24) * g('cost') } },
      { key: 'years', label: 'Years to repay', dp: 1, fn: (v) => { const g = G(v); const s = g('hp1') * 0.746 * (g('days1') * 24) * g('cost') - g('hp2') * 0.746 * (g('days2') * 24) * g('cost'); return s !== 0 ? g('conv') / s : 0 } },
    ],
  },
  {
    id: 'permit',
    name: 'Electrical Permit',
    group: 'Cost',
    blurb: 'Estimated electrical permit fees from inspection counts.',
    fields: [
      { key: 's1', label: 'Service/Feeder 0-100A' },
      { key: 's2', label: 'Service/Feeder 101-200A' },
      { key: 's3', label: 'Service/Feeder 201-400A' },
      { key: 's4', label: 'Service/Feeder 401-600A' },
      { key: 'f1', label: 'Add. Feeder 0-100A' },
      { key: 'f2', label: 'Add. Feeder 101-200A' },
      { key: 'f3', label: 'Add. Feeder 201-400A' },
      { key: 'f4', label: 'Add. Feeder 401-600A' },
      { key: 'newPivotTwr', label: 'New pivot (per tower)' },
      { key: 'cornerRetro', label: 'Corner retro' },
      { key: 'replFirst6', label: 'Replacement pivot (first 6 twr)' },
      { key: 'replAddTwr', label: 'Replacement pivot (add. twr)' },
    ],
    outputs: [
      {
        key: 'total',
        label: 'Permit total',
        unit: '$',
        dp: 2,
        fn: (v) => {
          const g = G(v)
          const base =
            g('s1') * 69.5 + g('s2') * 86.25 + g('s3') * 162.25 + g('s4') * 189.25 +
            g('f1') * 42.5 + g('f2') * 54 + g('f3') * 64.5 + g('f4') * 75.75 +
            g('newPivotTwr') * 5 + g('cornerRetro') * 64.5 +
            (g('replFirst6') > 0 ? 64.5 : 0) + g('replAddTwr') * 5
          return base / 0.9
        },
      },
    ],
  },
]

export function calcDefaults(def: CalcDef): Record<string, number> {
  const out: Record<string, number> = {}
  for (const f of def.fields) out[f.key] = f.default ?? 0
  return out
}

export function getCalc(id: string): CalcDef | undefined {
  return CALCULATORS.find((c) => c.id === id)
}
