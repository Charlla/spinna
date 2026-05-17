export const CARS = [
  // Tier 1 — starter
  {id:"e30",name:"BMW E30 325i",tag:"BAVARIAN CLASSIC",mass:1180,wheelbase:42,front_overhang:8,rear_overhang:10,width:22,enginePower:13000,maxFwdSpeed:340,maxRevSpeed:95,inertiaMul:1.15,color:"#f4f4f1",accentColor:"M-stripe",price:0,owned:true,powerStat:0.45,gripStat:0.55,weightStat:0.45},
  // Tier 2 — affordable upgrades
  {id:"e36",name:"BMW E36 328i",tag:"M-TECH SHARK",mass:1320,wheelbase:46,front_overhang:9,rear_overhang:11,width:23,enginePower:17000,maxFwdSpeed:380,maxRevSpeed:100,inertiaMul:1.25,color:"#1a1a1a",accentColor:"M-stripe",price:8500,owned:false,powerStat:0.58,gripStat:0.5,weightStat:0.55},
  {id:"cressida",name:"Toyota Cressida 2.4i",tag:"YARD KING",mass:1390,wheelbase:48,front_overhang:10,rear_overhang:12,width:23,enginePower:19500,maxFwdSpeed:395,maxRevSpeed:100,inertiaMul:1.3,color:"#7c2128",accentColor:"stripe",price:12000,owned:false,powerStat:0.62,gripStat:0.48,weightStat:0.58},
  // Tier 3 — rotary / sport
  {id:"rx7",name:"Mazda RX-7 FC",tag:"ROTARY MONSTER",mass:1280,wheelbase:43,front_overhang:9,rear_overhang:9,width:22,enginePower:24500,maxFwdSpeed:435,maxRevSpeed:100,inertiaMul:0.95,color:"#fcd00b",accentColor:"stripe",price:18500,owned:false,powerStat:0.78,gripStat:0.45,weightStat:0.4},
  {id:"e46",name:"BMW E46 M3",tag:"S54 SCREAMER",mass:1495,wheelbase:50,front_overhang:10,rear_overhang:12,width:24,enginePower:30000,maxFwdSpeed:460,maxRevSpeed:105,inertiaMul:1.1,color:"#2e5fa2",accentColor:"M-stripe",price:32000,owned:false,powerStat:0.88,gripStat:0.6,weightStat:0.65},
  // Tier 4 — top-tier monster
  {id:"supra",name:"Toyota Supra 2JZ",tag:"TURBO INFERNO",mass:1610,wheelbase:52,front_overhang:11,rear_overhang:13,width:25,enginePower:38000,maxFwdSpeed:485,maxRevSpeed:110,inertiaMul:1.05,color:"#cc3300",accentColor:"stripe",price:60000,owned:false,powerStat:1.0,gripStat:0.55,weightStat:0.7},
  {id:"skyline",name:"Nissan Skyline GTR R34",tag:"GODZILLA",mass:1670,wheelbase:54,front_overhang:11,rear_overhang:13,width:25,enginePower:42000,maxFwdSpeed:500,maxRevSpeed:110,inertiaMul:1.0,color:"#23415c",accentColor:"M-stripe",price:95000,owned:false,powerStat:1.0,gripStat:0.7,weightStat:0.72},
]

export const TIRES = [
  {id:"used",name:"USED CHINESES",desc:"Last legs. Cheap.",gripLong:0.55,gripLat:0.5,durability:280,wearMul:1.6,price:120,gripStat:0.3,lifeStat:0.2},
  {id:"budget",name:"BUDGET ALL-SEASON",desc:"Honest rubber, fair life.",gripLong:0.78,gripLat:0.74,durability:520,wearMul:1,price:480,gripStat:0.55,lifeStat:0.55},
  {id:"sport",name:"PERFORMANCE SPORT",desc:"Sticky on tar, lasts.",gripLong:0.95,gripLat:0.95,durability:780,wearMul:0.85,price:1200,gripStat:0.85,lifeStat:0.85},
  {id:"slick",name:"BURNER SEMI-SLICKS",desc:"Heavenly grip, gone fast.",gripLong:1.1,gripLat:1.1,durability:340,wearMul:1.9,price:900,gripStat:1,lifeStat:0.3},
]

export const SAVE_KEY = "spinna_save_v3"
export const TUNE_KEY = "spinna_tune_v3"
export const CANVAS_W = 750
export const CANVAS_H = 750
export const ARENA = {l:80,t:80,r:1420,b:1420}

export const DEFAULT_SAVE = {money:5000,car:"e30",ownedCars:["e30"],tires:"budget",tireHealth:100,bestPayout:0,bestScore:0,totalLifetimeRands:0}

export const DEFAULT_TUNE = {enginePower:1.55,topSpeed:1,steerMaxRad:0.96,steerMinRad:0.227,gripLong:1.2,gripLat:0.75,lowSpeedStick:0.55,yawDamping:1,wearRate:0.05,rearBias:1.4,spinThrottle:0.6}

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
}
