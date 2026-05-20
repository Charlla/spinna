// Car list — enginePower spread 1.0× → ~5.4× across tiers. Prices tuned so
// the first upgrade takes 3–5 rounds and each successive jump gets harder.
// Typical early round ≈ R7–12k from rings; tire wear keeps rounds short.
export const CARS = [
  // Tier 1 — starter (baseline 1.0×)
  {id:"e30",name:"BMW E30 325i",tag:"BAVARIAN CLASSIC",mass:1180,wheelbase:42,front_overhang:8,rear_overhang:10,width:22,enginePower:13000,maxFwdSpeed:340,maxRevSpeed:95,inertiaMul:1.15,color:"#f4f4f1",accentColor:"M-stripe",price:0,owned:true,powerStat:0.30,gripStat:0.55,weightStat:0.45},
  // Tier 2 — affordable street (~1.5×) — first upgrade target
  {id:"e36",name:"BMW E36 328i",tag:"M-TECH SHARK",mass:1320,wheelbase:46,front_overhang:9,rear_overhang:11,width:23,enginePower:19500,maxFwdSpeed:380,maxRevSpeed:100,inertiaMul:1.25,color:"#1a1a1a",accentColor:"M-stripe",price:25000,owned:false,powerStat:0.42,gripStat:0.5,weightStat:0.55},
  {id:"cressida",name:"Toyota Cressida 2.4i",tag:"YARD KING",mass:1390,wheelbase:48,front_overhang:10,rear_overhang:12,width:23,enginePower:23000,maxFwdSpeed:400,maxRevSpeed:100,inertiaMul:1.3,color:"#7c2128",accentColor:"stripe",price:50000,owned:false,powerStat:0.48,gripStat:0.48,weightStat:0.58},
  // Tier 3 — rotary / sport (~2.5×)
  {id:"rx7",name:"Mazda RX-7 FC",tag:"ROTARY MONSTER",mass:1280,wheelbase:43,front_overhang:9,rear_overhang:9,width:22,enginePower:33000,maxFwdSpeed:450,maxRevSpeed:105,inertiaMul:0.95,color:"#fcd00b",accentColor:"stripe",price:90000,owned:false,powerStat:0.66,gripStat:0.45,weightStat:0.4},
  {id:"e46",name:"BMW E46 M3",tag:"S54 SCREAMER",mass:1495,wheelbase:50,front_overhang:10,rear_overhang:12,width:24,enginePower:42000,maxFwdSpeed:475,maxRevSpeed:108,inertiaMul:1.1,color:"#2e5fa2",accentColor:"M-stripe",price:150000,owned:false,powerStat:0.78,gripStat:0.6,weightStat:0.65},
  // Tier 4 — top-tier monsters (~4–5×) — grind territory
  {id:"supra",name:"Toyota Supra 2JZ",tag:"TURBO INFERNO",mass:1610,wheelbase:52,front_overhang:11,rear_overhang:13,width:25,enginePower:58000,maxFwdSpeed:510,maxRevSpeed:115,inertiaMul:1.05,color:"#cc3300",accentColor:"stripe",price:260000,owned:false,powerStat:0.92,gripStat:0.55,weightStat:0.7},
  {id:"skyline",name:"Nissan Skyline GTR R34",tag:"GODZILLA",mass:1670,wheelbase:54,front_overhang:11,rear_overhang:13,width:25,enginePower:70000,maxFwdSpeed:540,maxRevSpeed:120,inertiaMul:1.0,color:"#23415c",accentColor:"M-stripe",price:420000,owned:false,powerStat:1.0,gripStat:0.7,weightStat:0.72},
]

// Tire choice is mostly about HOW LONG the rubber lasts, not how it grips.
// Compressed grip delta (0.95..1.10) means every set is drivable — the e36
// on Performance Sport is the reference feel, and the others sit close to
// it. Durability is where the big spread lives: used Chineses die ~4×
// faster than budget; sport lasts ~3× budget.
export const TIRES = [
  {id:"used",name:"USED CHINESES",desc:"Tired rubber — drives almost the same, just dies fast.",gripLong:0.95,gripLat:0.93,durability:90,wearMul:1.4,price:120,gripStat:0.4,lifeStat:0.1},
  {id:"budget",name:"BUDGET ALL-SEASON",desc:"Honest rubber. Fair life, neutral feel.",gripLong:1.0,gripLat:0.98,durability:240,wearMul:1.0,price:480,gripStat:0.55,lifeStat:0.4},
  {id:"sport",name:"PERFORMANCE SPORT",desc:"The baseline. Sticky and long-lasting.",gripLong:1.05,gripLat:1.05,durability:760,wearMul:0.85,price:1200,gripStat:0.85,lifeStat:1.0},
  {id:"slick",name:"BURNER SEMI-SLICKS",desc:"A hair stickier than sports, gone fast.",gripLong:1.10,gripLat:1.10,durability:180,wearMul:1.9,price:900,gripStat:1.0,lifeStat:0.2},
]

export const SAVE_KEY = "spinna_save_v3"
export const TUNE_KEY = "spinna_tune_v3"
export const CANVAS_W = 750
export const CANVAS_H = 750
export const ARENA = {l:80,t:80,r:1420,b:1420}

export const DEFAULT_SAVE = {money:1500,car:"e30",ownedCars:["e30"],tires:"budget",tireHealth:100,bestPayout:0,bestScore:0,totalLifetimeRands:0,track:"donut",mode:"free"}

export interface GameMode {
  id: string
  name: string
  subtitle: string
  description: string
  accent: string
}

export const GAME_MODES: GameMode[] = [
  {
    id: 'targets',
    name: 'TARGET HUNT',
    subtitle: 'Spin around the rings',
    description: 'Solo. Glowing rings spawn — spin tight circles for fat bonuses.',
    accent: '#22c55e',
  },
  {
    id: 'multiplayer',
    name: 'MULTIPLAYER',
    subtitle: 'Spin against your buddies online',
    description: 'Online rooms. First to circle a ring banks it. Needs a Spit Wars account to host.',
    accent: '#ef4444',
  },
  {
    id: 'passplay',
    name: 'PASS & PLAY',
    subtitle: 'Hotseat with up to 6 mates',
    description: '60s each. Same car for everyone. Pass the device between rounds and watch the leaderboard.',
    accent: '#a855f7',
  },
  {
    id: 'free',
    name: 'FREE SPIN',
    subtitle: 'OG donut session',
    description: 'Burn rubber, rack up combo degrees. Just send it.',
    accent: '#fcd00b',
  },
]

// Tuned for an intense + loose feel — lower yawDamping + lower lateral grip
// means the rear breaks loose more readily, while higher rearBias amplifies
// throttle-induced sideways slip. enginePower bumped again so the bigger cars
// have meaningful punch.
export const DEFAULT_TUNE = {enginePower:2.05,topSpeed:1.05,steerMaxRad:0.98,steerMinRad:0.24,gripLong:1.2,gripLat:0.68,lowSpeedStick:0.55,yawDamping:0.85,wearRate:0.05,rearBias:1.55,spinThrottle:0.6}

export interface Track {
  id: string
  name: string
  subtitle: string
  /** dot colour used in pickers / dot indicators */
  accent: string
}

export const TRACKS: Track[] = [
  { id: 'donut',        name: 'CLASSIC DONUT',  subtitle: 'The OG spin pad',         accent: '#fcd00b' },
  { id: 'intersection', name: 'INTERSECTION',   subtitle: 'Four-way Mzansi style',   accent: '#22c55e' },
  { id: 'airport',      name: 'OLD AIRSTRIP',   subtitle: 'Runway lights, no tower', accent: '#3b82f6' },
  { id: 'harbour',      name: 'HARBOUR DOCKS',  subtitle: 'Containers, gulls, salt', accent: '#06b6d4' },
  { id: 'cityblock',    name: 'CITY BLOCK',     subtitle: 'Tar between high-rises',  accent: '#a855f7' },
  { id: 'shisanyama',   name: 'SHISA NYAMA',    subtitle: 'Smoke, fires, no rules',  accent: '#ef4444' },
]

export const MILESTONES = [
  {deg:360,text:"SPIN!",sub:"MFANA",c:"#fcd00b"},
  {deg:720,text:"DOUBLE!",sub:"NICE",c:"#fcd00b"},
  {deg:1080,text:"TRIPLE!",sub:"SHISA",c:"#ff8c00"},
  {deg:1440,text:"QUAD MAHEN!",sub:"GO ON",c:"#ff2d2d"},
  {deg:1800,text:"GHOST!",sub:"IZIKHOTHANE",c:"#a855f7"},
  {deg:2520,text:"INSANE!",sub:"BURNT IT",c:"#ec4899"},
  {deg:3240,text:"SPIN KING!",sub:"LEGEND",c:"#22c55e"},
  {deg:4320,text:"SHISA NYAMA!!",sub:"BURN IT DOWN",c:"#fcd00b"},
]

export type Car = typeof CARS[number]
export type Tire = typeof TIRES[number]
export type Milestone = typeof MILESTONES[number]

export interface SaveData {
  money: number
  car: string
  ownedCars: string[]
  tires: string
  tireHealth: number
  bestPayout: number
  bestScore: number
  totalLifetimeRands: number
  track: string
  mode: string
  /** Upgrade ids the player has purchased. */
  ownedUpgrades?: string[]
  /** Upgrade ids currently bolted on the active car. */
  equippedUpgrades?: string[]
}

// ─── Upgrades ───────────────────────────────────────────────────────────────
// Replace the old "engine settings" tune panel: instead of dragging sliders,
// the player buys upgrades + bolts them on. Each upgrade applies one or more
// multipliers to the live tune. Multiple stacks; effects multiply.
export interface UpgradeDef {
  id: string
  name: string
  tag: string
  desc: string
  price: number
  /** Multipliers applied on top of DEFAULT_TUNE. Each is 1.0 = no effect. */
  effects: Partial<Record<keyof TuneData, number>>
}

export const UPGRADES: UpgradeDef[] = [
  {
    id: 'turbo',
    name: 'TURBO',
    tag: 'POWER',
    desc: '+25% engine, +5% top speed. Less low-speed bite, easier to spin.',
    price: 4500,
    effects: { enginePower: 1.25, topSpeed: 1.05, lowSpeedStick: 0.92 },
  },
  {
    id: 'cold_intake',
    name: 'COLD AIR INTAKE',
    tag: 'BREATH',
    desc: 'Modest +8% engine, cleaner pickup off-throttle.',
    price: 1500,
    effects: { enginePower: 1.08, spinThrottle: 0.95 },
  },
  {
    id: 'lwfly',
    name: 'LIGHTWEIGHT FLYWHEEL',
    tag: 'SNAP',
    desc: 'Engine snaps quicker into wheelspin. -8% low-speed stick.',
    price: 2200,
    effects: { spinThrottle: 0.85, lowSpeedStick: 0.92 },
  },
  {
    id: 'coilovers',
    name: 'COILOVERS',
    tag: 'STEER',
    desc: '+15% max steer, +5% lat grip, -3% top speed.',
    price: 3000,
    effects: { steerMaxRad: 1.15, gripLat: 1.05, topSpeed: 0.97 },
  },
  {
    id: 'lsd',
    name: 'WELDED DIFF (LSD)',
    tag: 'DRIFT',
    desc: '+20% rear bias, +8% lat grip — rear locks up, deeper drifts.',
    price: 3500,
    effects: { rearBias: 1.2, gripLat: 1.08 },
  },
  {
    id: 'spoiler',
    name: 'REAR SPOILER',
    tag: 'STICK',
    desc: '+10% lat grip, -2% top speed. Plants the rear at speed.',
    price: 2000,
    effects: { gripLat: 1.10, topSpeed: 0.98 },
  },
  {
    id: 'softer_rubber',
    name: 'SOFT-COMPOUND TYRE PREP',
    tag: 'LIFE',
    desc: '-25% wear rate — every tyre lasts longer. Costs you 4% engine.',
    price: 2800,
    effects: { wearRate: 0.75, enginePower: 0.96 },
  },
  {
    id: 'big_brakes',
    name: 'BIG BRAKE KIT',
    tag: 'STOP',
    desc: '+25% low-speed stick — settles the car when you lift.',
    price: 1800,
    effects: { lowSpeedStick: 1.25, topSpeed: 0.98 },
  },
]

/** Compose DEFAULT_TUNE with all currently-equipped upgrade effects. */
export function applyUpgrades(base: TuneData, equipped: string[]): TuneData {
  const out: TuneData = { ...base }
  for (const id of equipped) {
    const up = UPGRADES.find(u => u.id === id)
    if (!up) continue
    for (const k of Object.keys(up.effects) as Array<keyof TuneData>) {
      const mul = up.effects[k]
      if (mul == null) continue
      out[k] = out[k] * mul
    }
  }
  return out
}

export interface TuneData {
  enginePower: number
  topSpeed: number
  steerMaxRad: number
  steerMinRad: number
  gripLong: number
  gripLat: number
  lowSpeedStick: number
  yawDamping: number
  wearRate: number
  rearBias: number
  spinThrottle: number
}

export interface GameStats {
  score: number
  comboDeg: number
  mult: number
  speedKmh: number
  tireHealth: number
  tireName: string
  totalSpins: number
  maxCombo: number
  damageBumps: number
  damagePenalty: number
  lastBumpCost: number     // bumps to >0 briefly when a wall is hit (for HUD pop)
  // Target Hunt mode only
  mode: string
  targetsHit: number
  targetsTotal: number     // 0 in free-spin mode
  targetProgress: number   // 0..1 — how close the current target is to being banked
}
