export const CARS = [
  {id:"e30",name:"BMW E30 325i",tag:"BAVARIAN CLASSIC",mass:1180,wheelbase:42,front_overhang:8,rear_overhang:10,width:22,enginePower:13000,maxFwdSpeed:340,maxRevSpeed:95,inertiaMul:1.15,color:"#f4f4f1",accentColor:"M-stripe",price:0,owned:true,powerStat:0.55,gripStat:0.55,weightStat:0.45},
  {id:"e36",name:"BMW E36 328i",tag:"M-TECH SHARK",mass:1320,wheelbase:46,front_overhang:9,rear_overhang:11,width:23,enginePower:17000,maxFwdSpeed:380,maxRevSpeed:100,inertiaMul:1.25,color:"#1a1a1a",accentColor:"M-stripe",price:8500,owned:false,powerStat:0.7,gripStat:0.5,weightStat:0.55},
  {id:"rx7",name:"Mazda RX-7 FC",tag:"ROTARY MONSTER",mass:1280,wheelbase:43,front_overhang:9,rear_overhang:9,width:22,enginePower:21000,maxFwdSpeed:420,maxRevSpeed:100,inertiaMul:0.95,color:"#fcd00b",accentColor:"stripe",price:14500,owned:false,powerStat:0.85,gripStat:0.45,weightStat:0.4},
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

export const DEFAULT_TUNE = {enginePower:1.55,topSpeed:1,steerMaxRad:0.96,steerMinRad:0.227,gripLong:1.2,gripLat:0.75,lowSpeedStick:0.55,yawDamping:1,wearRate:0.05,rearBias:1.4,spinThrottle:0.7}

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
