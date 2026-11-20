/* Cradle to Cosmos: a nation-building strategy game from a Stone Age village to Mars. */
(() => {
"use strict";
const W = window.WORLD;
const NR = W.regions.length;
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const rnd = () => Math.random();
const pick = a => a[Math.floor(rnd() * a.length)];
const fmt = v => { const a = Math.abs(v); return a >= 1e6 ? (v / 1e6).toFixed(1) + "M" : a >= 1e4 ? (v / 1e3).toFixed(0) + "k" : a >= 1e3 ? (v / 1e3).toFixed(1) + "k" : a >= 100 ? Math.round(v) + "" : a >= 10 ? v.toFixed(0) : a >= 1 || a === 0 ? v.toFixed(1) : a >= .01 ? v.toFixed(2) : v.toFixed(3); };
const fmtP = v => v >= 1e4 ? fmt(v) : Math.round(v).toLocaleString("en-US");
const sgn = v => (v >= 0 ? "+" : "−") + fmt(Math.abs(v));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// ================= STATIC DATA =================
const ERAS = ["Stone Age", "Bronze Age", "Classical Age", "Medieval Age", "Renaissance", "Industrial Age", "Modern Age", "Information Age"];
const YEARS_PER_TURN = [25, 70, 45, 32, 12, 6, 4, 3];
const ERA_YEAR = [-4000, -3000, -800, 500, 1450, 1750, 1900, 1990, 2100];
// ---- time: every turn is one quarter of a year. The game's rates are written per "span" (the old turn length of each age,
// YEARS_PER_TURN years), and each quarter runs TD of a span: flows scale by TD, chances and drifts compound by TD ----
const TPY = 4; // turns per year
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const calEra = y => { let e = 0; while (e < 7 && y >= ERA_YEAR[e + 1]) e++; return e; };
let TD = 1 / (TPY * YEARS_PER_TURN[0]);
function setTD() { if (G && G.year != null) TD = 1 / (TPY * YEARS_PER_TURN[calEra(G.year)]); return TD; }
const pr = p => 1 - Math.pow(1 - Math.min(1, Math.max(0, p)), TD); // a chance (or drift rate) per span, as a chance each quarter
const dec = x => { const v = (x || 0) - TD; return v < 1e-6 ? 0 : v; }; // count down a timer measured in spans
const turnsOf = t => Math.max(1, Math.round(t / TD));
const durTxt = t => { const q = turnsOf(t); return q < 8 ? `${q} quarter${q > 1 ? "s" : ""}` : `${Math.round(q / TPY)} years`; };
const etaTxt = (left, rate) => rate <= 0 ? "stalled" : durTxt(Math.max(0, left) / rate * TD);
const ERA_POW = [1, 1.6, 2.6, 4, 6.5, 11, 18, 30];
const TECH_BASE = [10, 40, 115, 330, 1100, 3000, 8500, 18000];

// settlements
const TIERS = [
  { k: "village", name: "Village", icon: "🛖", gold: 1, mat: 1, sci: .6, food: 1, def: 1, trade: .3, r: .2, flat: .8, admin: .1, base: .3, emi: .06, need: 12 },
  { k: "town", name: "Town", icon: "🏘️", gold: 1.3, mat: 1.25, sci: 1.3, food: .9, def: 1.4, trade: 1, r: .08, flat: 2, admin: .6, base: 1, emi: .02, need: 25 },
  { k: "city", name: "City", icon: "🏙️", gold: 1.6, mat: 1.5, sci: 1.8, food: .75, def: 1.9, trade: 3, r: .055, flat: 10, admin: 1.2, base: 3, emi: .012, need: 30 },
];
const VILLAGE_CAP = 50, CITY_POP = 2000, VILLAGES_FOR_TOWN = 4, TOWNS_TO_CLAIM = 3, START_POP = 30, MOVERS = 10;
const townReq = k => Math.round(180 * Math.pow(k, 1.5));
const U = p => Math.pow(Math.max(0, p), .55) / 3.5; // economic weight of a population
const RANKS = [
  { name: "Tribe", t: n => `Tribe of ${n}`, admin: 0 },
  { name: "Nation", t: n => `Nation of ${n}`, admin: 2 },
  { name: "Kingdom", t: n => `Kingdom of ${n}`, admin: 4 },
  { name: "Empire", t: n => `${n} Empire`, admin: 8 },
];
const rankIdx = c => c >= 4 ? 3 : c >= 2 ? 2 : c >= 1 ? 1 : 0;

const TER = {
  grass:    { name: "Fertile lowlands", food: 1.5,  prod: 1.0, gold: 1.0, slot: 1.2,  col: "#a6d870" },
  plains:   { name: "Plains",           food: 1.25, prod: 1.2, gold: 1.0, slot: 1.1,  col: "#d3e08c" },
  forest:   { name: "Forest",           food: 0.95, prod: 1.6, gold: 0.8, slot: .9,   col: "#86c46f" },
  jungle:   { name: "Jungle",           food: 1.05, prod: 1.0, gold: 1.1, slot: .8,   col: "#64b375" },
  steppe:   { name: "Steppe",           food: 1.0,  prod: 1.0, gold: 0.9, slot: .8,   col: "#e6d892" },
  desert:   { name: "Desert",           food: 0.55, prod: 1.0, gold: 1.3, slot: .5,   col: "#f0d49a" },
  tundra:   { name: "Tundra",           food: 0.5,  prod: 1.1, gold: 0.7, slot: .45,  col: "#d6e2e8" },
  mountain: { name: "Mountains",        food: 0.7,  prod: 1.8, gold: 1.0, slot: .6,   col: "#cdb99d" },
};
const RES = {
  horses:  { name: "Horses",  icon: "🐎", kind: "strat", tech: "husbandry" },
  copper:  { name: "Copper",  icon: "🥉", kind: "strat", tech: "mining" },
  iron:    { name: "Iron",    icon: "⚒️", kind: "strat", tech: "iron" },
  coal:    { name: "Coal",    icon: "🪨", kind: "strat", tech: "steam" },
  oil:     { name: "Oil",     icon: "🛢️", kind: "strat", tech: "combustion" },
  uranium: { name: "Uranium", icon: "☢️", kind: "strat", tech: "fission" },
  fish:    { name: "Fish",    icon: "🐟", kind: "food" },
  gold:    { name: "Gold",    icon: "🪙", kind: "lux" },
  gems:    { name: "Gems",    icon: "💎", kind: "lux" },
  spices:  { name: "Spices",  icon: "🌶️", kind: "lux" },
  silk:    { name: "Silk",    icon: "🧵", kind: "lux" },
  furs:    { name: "Furs",    icon: "🦊", kind: "lux" },
  ivory:   { name: "Ivory",   icon: "🐘", kind: "lux" },
  wine:    { name: "Wine",    icon: "🍇", kind: "lux" },
  cotton:  { name: "Cotton",  icon: "🧶", kind: "lux" },
};
const STRAT_NEED = [
  { res: "horses",  from: 0, to: 4, bonus: 0.15 },
  { res: "copper",  from: 1, to: 1, pen: 0.15 },
  { res: "iron",    from: 2, to: 5, pen: 0.2 },
  { res: "coal",    from: 5, to: 7, pen: 0.1 },
  { res: "oil",     from: 6, to: 7, pen: 0.25 },
  { res: "uranium", from: 7, to: 7, bonus: 0.1 },
];

const TECHS = [
  ["agriculture", 0, "Agriculture", "Farms. Villages can grow into towns."],
  ["pottery", 0, "Pottery", "Granaries let towns and cities hold more people."],
  ["husbandry", 0, "Animal Husbandry", "Pastures; horses strengthen your warriors."],
  ["mining", 0, "Mining", "Mines dig up materials. Copper becomes usable."],
  ["mysticism", 0, "Mysticism", "Shrines calm your people."],
  ["tribal", 0, "Tribal Law", "Unlocks the Chiefdom government."],
  ["bronze", 1, "Bronze Working", "Barracks. Armies need copper."],
  ["writing", 1, "Writing", "Libraries and the Science focus."],
  ["masonry", 1, "Masonry", "Walls. Towns can grow into cities."],
  ["sailing", 1, "Sailing", "Harbors. Settle across short stretches of sea."],
  ["wheel", 1, "The Wheel", "Roads boost trade and ease unrest."],
  ["monarchy", 1, "Monarchy", "Unlocks the Monarchy government."],
  ["iron", 2, "Iron Working", "Stronger armies. Armies need iron."],
  ["currency", 2, "Currency", "Markets and the Free Trade law."],
  ["philosophy", 2, "Philosophy", "Academies and religious Tolerance."],
  ["construction", 2, "Construction", "Aqueducts let cities grow."],
  ["mathematics", 2, "Mathematics", "Siege engines: +10% army strength."],
  ["republic", 2, "The Republic", "Unlocks the Republic government."],
  ["feudalism", 3, "Feudalism", "Castles: strong defenses."],
  ["theology", 3, "Theology", "Cathedrals and the Theocracy government."],
  ["guilds", 3, "Guilds", "Workshops boost materials."],
  ["astronomy", 3, "Astronomy", "Observatories boost science."],
  ["chivalry", 3, "Chivalry", "Knights: +10% army strength."],
  ["navigation", 4, "Navigation", "Shipyards. Settle distant coasts across oceans."],
  ["printing", 4, "Printing Press", "Universities and the Press law."],
  ["gunpowder", 4, "Gunpowder", "+15% army strength."],
  ["banking", 4, "Banking", "Banks boost gold."],
  ["absolutism", 4, "Absolutism", "Unlocks Absolute Monarchy."],
  ["enlightenment", 4, "Enlightenment", "Unlocks Secular religion law."],
  ["steam", 5, "Steam Power", "Factories (need coal) and the Labor law."],
  ["railroad", 5, "Railroad", "Railways boost trade and materials."],
  ["democracy", 5, "Democracy", "Unlocks the Democracy government."],
  ["medicine", 5, "Medicine", "Hospitals: bigger, happier cities."],
  ["electricity", 5, "Electricity", "Power plants."],
  ["rifling", 5, "Rifling", "+15% army strength."],
  ["combustion", 6, "Combustion", "Tanks and trucks. Armies need oil."],
  ["flight", 6, "Flight", "Airports: big trade boost."],
  ["massmedia", 6, "Mass Media", "Broadcast towers raise stability."],
  ["ideology", 6, "Ideology", "Unlocks the Single-Party State."],
  ["fission", 6, "Nuclear Fission", "Nuclear plants (need uranium)."],
  ["computers", 7, "Computers", "Tech hubs and the Technocracy government."],
  ["internet", 7, "Internet", "Data centers boost gold and science."],
  ["robotics", 7, "Robotics", "Robot factories double materials."],
  ["globalization", 7, "Globalization", "+40% trade income."],
  ["rocketry", 7, "Rocketry", "Build a Spaceport."],
  ["mars", 7, "Mars Colony", "Win the game. Needs a Spaceport."],
].map(([id, era, name, desc], i) => ({ id, era, name, desc, idx: i }));
const TECH = Object.fromEntries(TECHS.map(t => [t.id, t]));
TECHS.forEach(t => { const k = TECHS.filter(x => x.era === t.era).indexOf(t); t.cost = Math.round(TECH_BASE[t.era] * (1 + 0.1 * k)); });
TECH.mars.cost = 60000;
const eraTechs = e => TECHS.filter(t => t.era === e && t.id !== "mars");
const eraNeed = e => eraTechs(e).length - 1;

const BLD = [
  { k: "farm", name: "Farm", icon: "🌾", tech: "agriculture", food: .35, d: "+35% food here" },
  { k: "granary", name: "Granary", icon: "🏺", tech: "pottery", cap: .25, d: "Towns and cities here hold 25% more people" },
  { k: "pasture", name: "Pasture", icon: "🐑", tech: "husbandry", food: .15, prod: .1, d: "+15% food, +10% materials" },
  { k: "mine", name: "Mine", icon: "⛏️", tech: "mining", prod: .4, d: "+40% materials (+30% more on metals)" },
  { k: "shrine", name: "Shrine", icon: "🗿", tech: "mysticism", stab: 1, d: "Calms people, pleases Elders" },
  { k: "barracks", name: "Barracks", icon: "🛡️", tech: "bronze", pow: .03, d: "+3% army strength, more recruits" },
  { k: "library", name: "Library", icon: "📜", tech: "writing", sci: .3, sciF: 1, d: "+30% science, +1 flat" },
  { k: "walls", name: "Walls", icon: "🧱", tech: "masonry", def: .4, d: "+40% defense" },
  { k: "harbor", name: "Harbor", icon: "⚓", tech: "sailing", coastal: true, food: .2, trade: 2, d: "+20% food, +2 trade" },
  { k: "road", name: "Roads", icon: "🛤️", tech: "wheel", trade: 1, gold: .1, unrest: 6, admin: .6, d: "+1 trade, +10% gold, less unrest" },
  { k: "market", name: "Market", icon: "🏪", tech: "currency", gold: .35, trade: 2, d: "+35% gold, +2 trade" },
  { k: "academy", name: "Academy", icon: "🏛️", tech: "philosophy", sci: .4, d: "+40% science" },
  { k: "aqueduct", name: "Aqueduct", icon: "🌉", tech: "construction", cap: .3, d: "Towns and cities here hold 30% more people" },
  { k: "castle", name: "Castle", icon: "🏰", tech: "feudalism", def: .8, pow: .02, d: "+80% defense" },
  { k: "cathedral", name: "Cathedral", icon: "⛪", tech: "theology", stab: 2, d: "Big calm, pleases Clergy" },
  { k: "workshop", name: "Workshop", icon: "🔨", tech: "guilds", prod: .35, d: "+35% materials" },
  { k: "observatory", name: "Observatory", icon: "🔭", tech: "astronomy", sci: .4, d: "+40% science" },
  { k: "university", name: "University", icon: "🎓", tech: "printing", sci: .6, sciF: 2, d: "+60% science, pleases Intellectuals" },
  { k: "bank", name: "Bank", icon: "🏦", tech: "banking", gold: .4, d: "+40% gold" },
  { k: "shipyard", name: "Shipyard", icon: "⛵", tech: "navigation", coastal: true, trade: 4, pow: .02, d: "+4 trade, +2% army" },
  { k: "factory", name: "Factory", icon: "🏭", tech: "steam", prod: .8, stab: -.5, needs: "coal", d: "+80% materials (needs coal)" },
  { k: "railway", name: "Railway", icon: "🚂", tech: "railroad", trade: 3, prod: .2, admin: 1, d: "+3 trade, +20% materials" },
  { k: "hospital", name: "Hospital", icon: "🏥", tech: "medicine", cap: .35, stab: .5, d: "Cities hold 35% more people, calmer" },
  { k: "powerplant", name: "Power Plant", icon: "⚡", tech: "electricity", prod: .4, gold: .1, d: "+40% materials, +10% gold" },
  { k: "broadcast", name: "Broadcast Tower", icon: "📻", tech: "massmedia", stab: 1.5, d: "Raises stability" },
  { k: "airport", name: "Airport", icon: "✈️", tech: "flight", trade: 5, d: "+5 trade" },
  { k: "nuclear", name: "Nuclear Plant", icon: "⚛️", tech: "fission", prod: .6, needs: "uranium", d: "+60% materials (needs uranium)" },
  { k: "techhub", name: "Tech Hub", icon: "💻", tech: "computers", sci: 1, d: "+100% science" },
  { k: "datacenter", name: "Data Center", icon: "🖥️", tech: "internet", gold: .4, sci: .4, d: "+40% gold and science" },
  { k: "robotics", name: "Robot Factory", icon: "🤖", tech: "robotics", prod: 1, d: "+100% materials" },
  { k: "spaceport", name: "Spaceport", icon: "🚀", tech: "rocketry", unique: true, d: "Needed to launch the Mars Colony" },
];
const BK = Object.fromEntries(BLD.map(b => [b.k, b]));
// ---- fields: set up a stage, expand it through 5 levels; level 3 opens the next stage (with its technology) ----
const FIELD_MAX = 5, FIELD_NEXT = 3;
const CHAINS = [
  { k: "food", name: "Food", icon: "🌾", eff: { food: .05, cap: .025 }, d: "food, room in towns", f: [["farming", "Farming", "agriculture"], ["irrigation", "Irrigation", "masonry"], ["crop", "Crop Rotation", "feudalism"], ["mechfarm", "Mechanized Farming", "steam"], ["biotech", "Biotech Farming", "computers"]] },
  { k: "herd", name: "Herding", icon: "🐎", eff: { food: .03, prod: .03, pow: .015 }, d: "food, materials, cavalry", f: [["husbandry", "Animal Husbandry", "husbandry"], ["horses", "Horse Breeding", "bronze"], ["ranching", "Ranching", "navigation"], ["livestock", "Industrial Livestock", "railroad"]] },
  { k: "ind", name: "Industry", icon: "⚒️", eff: { prod: .045 }, d: "materials", f: [["tools", "Toolmaking", null], ["mining", "Mining", "mining"], ["smithing", "Blacksmithing", "iron"], ["workshops", "Guild Workshops", "guilds"], ["factories", "Factories", "steam"], ["assembly", "Assembly Lines", "electricity"], ["robotics", "Robotics", "robotics"]] },
  { k: "mil", name: "Weapons", icon: "⚔️", eff: { pow: .035, recruit: .3 }, d: "army strength and size", f: [["weapons", "Weapon Making", null], ["bronzearms", "Bronze Weapons", "bronze"], ["ironarms", "Iron Forging", "iron"], ["siege", "Siege Engineering", "mathematics"], ["muskets", "Musket Manufacturing", "gunpowder"]] },
  // in the industrial age, arms making splits into three branches
  { k: "land", parent: "muskets", name: "Land Weapons & Vehicles", icon: "🪖", eff: { pow: .04, recruit: .4 }, d: "army strength and size", f: [["rifles", "Rifle Factories", "rifling"], ["artillery", "Artillery Works", "electricity"], ["tanks", "Tank Production", "combustion"], ["missiles", "Missile Systems", "computers"]] },
  { k: "navy", parent: "muskets", name: "Shipbuilding", icon: "⚓", eff: { pow: .02, trade: .04, def: .03 }, d: "fleets: army strength, sea trade, coastal defense", f: [["ironclads", "Steam Ironclads", "steam"], ["battleships", "Battleship Yards", "electricity"], ["submarines", "Submarine Works", "combustion"], ["carriers", "Aircraft Carriers", "flight"], ["nuclearsubs", "Nuclear Submarines", "fission"]] },
  { k: "air", parent: "muskets", name: "Aviation", icon: "✈️", eff: { pow: .045, def: .02 }, d: "air power: army strength, defense", f: [["aircraft", "Aircraft Factories", "flight"], ["bombers", "Strategic Bombers", "massmedia"], ["nukes", "Nuclear Arsenal", "fission"], ["jets", "Jet & Stealth Aircraft", "computers"]] },
  { k: "def", name: "Fortifications", icon: "🏰", eff: { def: .06 }, d: "defense of your settlements", f: [["palisades", "Palisades", null], ["walls", "Stone Walls", "masonry"], ["castles", "Castles", "feudalism"], ["starforts", "Star Forts", "gunpowder"], ["bunkers", "Bunkers", "combustion"], ["missiledef", "Missile Defense", "computers"]] },
  { k: "trade", name: "Trade", icon: "💰", eff: { trade: .07, gold: .015 }, d: "trade income, gold", f: [["barter", "Barter Markets", null], ["roads", "Roads", "wheel"], ["coinage", "Coinage", "currency"], ["fleets", "Merchant Fleets", "navigation"], ["railways", "Railways", "railroad"], ["airports", "Airports", "flight"], ["networks", "Global Networks", "globalization"]] },
  { k: "sci", name: "Knowledge", icon: "📚", eff: { sci: .045 }, d: "science", f: [["lore", "Oral Tradition", null], ["scribes", "Writing Schools", "writing"], ["academies", "Academies", "philosophy"], ["observatories", "Observatories", "astronomy"], ["universities", "Universities", "printing"], ["labs", "Research Labs", "electricity"], ["techhubs", "Tech Hubs", "computers"]] },
  { k: "faith", name: "Faith & Culture", icon: "🕯️", eff: { stab: 1.2 }, d: "stability, Clergy", f: [["shrines", "Shrines", "mysticism"], ["temples", "Temples", "writing"], ["cathedrals", "Cathedrals", "theology"], ["arts", "Arts & Theater", "printing"], ["media", "Public Media", "massmedia"]] },
  { k: "health", name: "Health", icon: "🏥", eff: { cap: .05, grow: .008 }, d: "growth, room in towns", f: [["herbal", "Herbal Medicine", "pottery"], ["aqueducts", "Aqueducts", "construction"], ["sanitation", "Sanitation", "enlightenment"], ["hospitals", "Hospitals", "medicine"], ["modernmed", "Modern Medicine", "computers"]] },
  { k: "energy", name: "Energy", icon: "⚡", eff: { prod: .03, gold: .02 }, d: "materials, gold", f: [["watermills", "Watermills", "construction"], ["coal", "Coal Power", "steam"], ["grid", "Electric Grid", "electricity"], ["oil", "Oil Industry", "combustion"], ["nuclear", "Nuclear Power", "fission"]] },
  { k: "admin", name: "Administration", icon: "📜", eff: { admin: 1.2 }, d: "how many settlements you can run", f: [["council", "Council of Elders", "tribal"], ["royalscribes", "Royal Scribes", "writing"], ["bureau", "Bureaucracy", "republic"], ["civil", "Civil Service", "printing"], ["egov", "Digital Government", "internet"]] },
  { k: "space", name: "Space", icon: "🚀", eff: { sci: .05 }, d: "science; Mars Mission level 3 lets you research Mars Colony", f: [["rockets", "Rocket Program", "rocketry"], ["marsmission", "Mars Mission", null]] },
];
const FIELDS = {};
CHAINS.forEach(c => c.f.forEach(([k, name, tech], i) => { const t = tech ? TECH[tech].era : (i ? 7 : 0); FIELDS[k] = { k, name, tech, chain: c, idx: i, tier: t, prev: i ? c.f[i - 1][0] : (c.parent || null), mult: .72 * Math.pow(1.35, i + (c.parent ? 4 : 0)) }; }));
const lv = (n, k) => (n.fields && n.fields[k]) || 0;
// ---- city emphasis: cities (and the capital) can each focus on one field ----
const canEmph = (n, s) => s.o === n.id && (s.t === 2 || (s.id === n.cap && s.t >= 1));
// ---- academies (talent) and military academies (officers & generals) ----
const canAcad = canEmph; // cities, and the capital once it's a town
const acadCost = (n, lvl) => { const m = Math.pow(1.5, n.era); return lvl === 1 ? { g: Math.round(40 * m), m: Math.round(30 * m) } : { g: Math.round(150 * m), m: Math.round(110 * m) }; };
const milAcadCost = n => { const m = Math.pow(1.5, n.era); return { g: Math.round(60 * m), m: Math.round(50 * m) }; };
const milAcadLimit = n => 1 + Math.floor(sizeOf(n) / 6);
const milAcadCount = n => setsOf(n).filter(s => s.mil).length;
// academies graduate scientists, military academies graduate officers; a few retire every turn
function sciGradRate(n) { let t = 0; for (const x of G.sets) if (x.o === n.id) { if (x.acad === 1) t += .6 + x.pop / 30000; else if (x.acad === 2) t += 2 + x.pop / 10000; } return t * (n.cul === "scholarly" ? 1.3 : 1); }
function offGradRate(n) { let t = 0; for (const x of G.sets) if (x.o === n.id && x.mil) t += .8 + x.pop / 30000; return t * (n.cul === "martial" ? 1.3 : 1); }
const sciSalary = n => .3 * Math.pow(1.4, n.era), offSalary = n => .35 * Math.pow(1.4, n.era);
const perScientist = n => n.cul === "scholarly" ? .015 : .01;
const scientistBoost = n => (n.scientists || 0) * perScientist(n);
const perOfficer = n => .004 * (cmd(n).off || 1);
const generalPower = n => (n.generals || []).reduce((a, g) => a + g.skill, 0);
const CMDS = {
  chiefs:  { name: "Warband Chiefs", icon: "🪓", tech: null, d: "Each band follows its own chief. No special effects." },
  supreme: { name: "Supreme Commander", icon: "🎖️", tech: "bronze", fac: { warriors: 8, nobles: -4 }, d: "One commander leads everything. The whole army is only as good as they are: a ★ commander cripples it (−30% strength), a ★★★★★ one makes it fearsome (+40%). You choose the first commander; the army chooses each successor." },
  council: { name: "War Council", icon: "🪑", tech: "monarchy", def: .15, gen: .75, fac: { nobles: 5, commoners: 3 }, d: "+15% defense and steadier politics, but a smaller bonus from your best general." },
  staff:   { name: "General Staff", icon: "🗺️", tech: "rifling", pow: .1, off: 1.5, fac: { warriors: 4 }, d: "+10% army strength; officers count 50% more." },
  militia: { name: "Citizen Militia", icon: "🛡️", tech: "republic", pow: -.1, upkeep: .75, cap: 1.25, fac: { commoners: 5, warriors: -6 }, d: "Army upkeep −25% and +25% more regiments, but −10% strength." },
};
const cmd = n => CMDS[n.cmd] || CMDS.chiefs;
const officerBonus = n => (n.officers || 0) * perOfficer(n);
const bestGeneral = n => (n.generals || []).reduce((b, g) => !b || g.skill > b.skill ? g : b, null);
const genBonus = n => generalPower(n) * .01 * (cmd(n).gen || 1);
// the supreme commander's skill decides how good the whole army is
const CMDR_EFF = [-.3, -.1, .1, .25, .4];
const supremeMult = n => n.cmd === "supreme" && n.commander ? CMDR_EFF[clamp(n.commander.skill, 1, 5) - 1] : 0;
const CMD_YEARS = 25;
const cmdLocked = n => (n.cmdUntil || -1e9) > G.year;
const yearTxt = y => y < 0 ? `${-y} BCE` : `${y} CE`;
function appointCommander(n, g) { // g: a general from the roster, or null for an unproven appointee
  if (g) { n.generals = (n.generals || []).filter(x => x !== g); n.commander = { name: g.name, skill: g.skill, left: Math.max(g.left, 12), known: true }; }
  else n.commander = { name: genName(8), skill: clamp(Math.round(1 + rnd() * 4 + travelQ(n) * rnd()), 1, 5), left: 20 + Math.floor(rnd() * 20), known: false };
  return n.commander;
}
function setCommand(n, k, g) { n.cmd = k; n.cmdUntil = G.year + CMD_YEARS; if (k === "supreme") appointCommander(n, g); else n.commander = null; }
const attackMult = n => 1 + genBonus(n) + (cmd(n).atk || 0);
const defMult = n => 1 + (cmd(n).def || 0) + genBonus(n) * .5;
let emphCache = new Map();
function emph(n, ck) { // how strongly a field is emphasized: { cities, cap }
  const key = G.sv + ":" + G.turn + ":" + (G.fv || 0);
  let c = emphCache.get(n.id);
  if (!c || c.key !== key) { c = { key, m: {} }; for (const s of G.sets) if (s.o === n.id && s.focus && canEmph(n, s)) { const e = c.m[s.focus] || (c.m[s.focus] = { cities: 0, cap: false }); if (s.id === n.cap) e.cap = true; else e.cities++; } emphCache.set(n.id, c); }
  return c.m[ck] || { cities: 0, cap: false };
}
const emphMult = (n, ck) => { const e = emph(n, ck); return 1 + .015 * e.cities + (e.cap ? .15 : 0); };
const reachAhead = (n, ck) => { const e = emph(n, ck); return e.cap ? 3 : e.cities ? 1 : 0; };
const TECH_CHAINS = {}; // which fields each technology belongs to
function techChains(t) { if (!TECH_CHAINS[t]) TECH_CHAINS[t] = [...new Set(Object.values(FIELDS).filter(f => f.tech === t).map(f => f.chain.k))]; return TECH_CHAINS[t]; }
const techAhead = (n, t) => Math.max(0, ...techChains(t.id).map(ck => reachAhead(n, ck)));
const techCost = (n, t) => { let b = 0; for (const ck of techChains(t.id)) { const e = emph(n, ck); b = Math.max(b, .01 * e.cities + (e.cap ? .15 : 0)); } return Math.round(t.cost * (1 - diffusion(n, t)) / (1 + b)); };
// bigger nations need more research to spread new ideas across all their settlements
// neighbors and allies who already know a technology make it cheaper to learn, especially larger ones
let diffKey = null, diffLinks = new Map();
function knowledgeLinks(n) {
  const key = G.turn + ":" + G.sv;
  if (diffKey !== key) { diffKey = key; diffLinks = new Map(); }
  let l = diffLinks.get(n.id); if (l) return l;
  const myPop = popOf(n); l = [];
  for (const o of G.nations) { if (!o.alive || o.id === n.id) continue; const d = dip(n.id, o.id);
    if (d.ally || d.trade || bordersTouch(n, o)) l.push({ o, w: popOf(o) > myPop ? 1 : .5 }); }
  diffLinks.set(n.id, l); return l;
}
function diffusion(n, t) { let w = 0; for (const x of knowledgeLinks(n)) if (has(x.o, t.id)) w += x.w; return Math.min(.6, .15 * w); }
// a field stage is capped to the current age, unless cities push that field ahead
function fieldOpen(n, f) { return (!f.tech || has(n, f.tech)) && (!f.prev || lv(n, f.prev) >= FIELD_NEXT) && f.tier <= n.era + reachAhead(n, f.chain.k); }
// to enter a new age, every field you can develop needs at least a base level
// base level needed in each field to leave the current age: 2 levels per age, counted across the field's stages,
// never more than the stages you've unlocked so far allow
const chainNeed = (n, c) => { let avail = 0; for (const [k] of c.f) { const f = FIELDS[k]; if (f.tier <= n.era && (!f.tech || has(n, f.tech))) avail += FIELD_MAX; } return Math.min(2 + 2 * n.era, avail); };
const chainHave = (n, c) => c.f.reduce((a, [k]) => a + Math.min(FIELD_MAX, lv(n, k)), 0);
// ---- mastery: levels 6-50 are earned through research, with diminishing returns ----
const MASTERY_MAX = 50, MASTERY_P = Math.log(1.35) / Math.log(10); // level 50 counts like 6.75 levels = level 5 of the next stage
const lvValue = L => L <= FIELD_MAX ? L : FIELD_MAX * Math.pow(L / FIELD_MAX, MASTERY_P);
const childrenOf = f => [f.chain.f[f.idx + 1], ...CHAINS.filter(c => c.parent === f.k).map(c => c.f[0])].filter(Boolean).map(x => FIELDS[x[0]]);
// you can keep deepening a stage until you set up the next stage in that field
const masteryOk = (n, f) => lv(n, f.k) >= FIELD_MAX && lv(n, f.k) < MASTERY_MAX && !childrenOf(f).some(c => lv(n, c.k) > 0);
const masteryCost = (n, f) => Math.round(TECH_BASE[f.tier] * .5 * Math.pow(1.07, lv(n, f.k) - FIELD_MAX) / (1 + .01 * emph(n, f.chain.k).cities + (emph(n, f.chain.k).cap ? .15 : 0)));
// developing a field level (1-5) can also be paid with science instead of gold and materials
const devOk = (n, f) => fieldOpen(n, f) && lv(n, f.k) < FIELD_MAX;
const devSciCost = (n, f) => { const c = fieldCost(n, f); return Math.max(1, Math.round((c.g + c.m) / (3 * Math.pow(1.3, n.era)) * 1.3)); };
// a research project is a technology, "d:<field>" to develop a level, or "m:<field>" for mastery
function resItem(n, id) {
  if (!id) return null;
  if (id.startsWith("d:")) { const f = FIELDS[id.slice(2)]; if (!f) return null; return { develop: true, f, name: `Develop ${f.name}`, cost: devSciCost(n, f), done: !devOk(n, f) }; }
  if (id.startsWith("m:")) { const f = FIELDS[id.slice(2)]; if (!f) return null; return { mastery: true, f, name: `Deepen ${f.name}`, cost: masteryCost(n, f), done: !masteryOk(n, f) }; }
  const t = TECH[id]; return t ? { mastery: false, t, name: t.name, cost: techCost(n, t), done: has(n, id) } : null;
}
function fieldsMissing(n) { return CHAINS.filter(c => fieldOpen(n, FIELDS[c.f[0][0]]) || chainHave(n, c)).filter(c => chainHave(n, c) < chainNeed(n, c)); }
function fieldCost(n, f) { const L = lv(n, f.k), t = Math.pow(1.8, f.tier) * Math.pow(1.45, L) * (cul(n).chains.includes(f.chain.k) ? .75 : 1); return { g: Math.round(10 * t * (n.laws.focus === "ind" ? .9 : 1)), m: Math.round(8 * t * (n.laws.focus === "ind" ? .9 : 1)) }; }
const fieldUp = f => .08 * Math.pow(1.5, f.tier);
function fb(n, key) { let v = 0; if (!n.fields) return 0; for (const k in n.fields) { const f = FIELDS[k]; if (f && f.chain.eff[key]) v += lvValue(n.fields[k]) * f.chain.eff[key] * f.mult * emphMult(n, f.chain.k); } return v; }
const chainLevels = (n, ck) => CHAINS.find(c => c.k === ck).f.reduce((a, [k]) => a + lv(n, k), 0);
function expandField(n, f) { const c = fieldCost(n, f); n.gold -= c.g; n.mat -= c.m; if (!n.fields) n.fields = {}; n.fields[f.k] = lv(n, f.k) + 1;
  if (!n.ai) { const L = n.fields[f.k]; log(L === 1 ? `${f.name} has been set up.` : `${f.name} expanded to level ${L}.`, f.chain.icon);
    if (L === FIELD_NEXT) {
      const nexts = [f.chain.f[f.idx + 1], ...CHAINS.filter(c => c.parent === f.k).map(c => c.f[0])].filter(Boolean);
      if (nexts.length > 1) log(`${f.name} branches out: ${nexts.map(x => FIELDS[x[0]].chain.name).join(", ")}!`, "🌿");
      for (const nx of nexts) { const F2 = FIELDS[nx[0]]; log(F2.tech && !has(n, F2.tech) ? `${F2.name} can be set up once you research ${TECH[F2.tech].name}.` : `${F2.name} is now open to set up!`, "🔓"); } } } }
// what each technology opens
TECHS.forEach(t => { const opens = Object.values(FIELDS).filter(f => f.tech === t.id).map(f => f.name);
  const extra = { tribal: "Chiefdom government.", monarchy: "Monarchy government.", republic: "Republic government.", theology: "Theocracy government.", absolutism: "Absolute Monarchy.", democracy: "Democracy government.", ideology: "Single-Party State.", computers: "Technocracy government.", enlightenment: "Secular religion law.", currency: "Free Trade law.", printing: "Press law.", steam: "Labor law.", sailing: "Settle across short seas.", navigation: "Settle distant coasts.", agriculture: "Villages can merge into towns.", masonry: "Towns can grow into cities.", mars: "Win the game. Needs Mars Mission level 3.", bronze: "Armies need copper.", iron: "Armies need iron.", combustion: "Armies need oil." }[t.id];
  t.desc = [opens.length ? `Opens ${opens.join(", ")}.` : "", extra || (opens.length ? "" : t.desc)].filter(Boolean).join(" "); });
BLD.forEach(b => { const e = TECH[b.tech].era; b.era = e; b.cg = Math.round(12 * Math.pow(1.85, e)); b.cm = Math.round(10 * Math.pow(1.85, e)); b.up = +(0.25 * Math.pow(1.6, e)).toFixed(2); });
BK.spaceport.cg *= 4; BK.spaceport.cm *= 4;

const GOVS = {
  tribe:      { name: "Tribal Council", tech: null, admin: 3, w: { commoners: 2, elders: 1.5, warriors: 1.5 }, d: "Simple and steady." },
  chiefdom:   { name: "Chiefdom", tech: "tribal", admin: 5, pow: .1, w: { warriors: 2, elders: 1.5, commoners: 1 }, d: "+10% army strength, easier to run more settlements." },
  monarchy:   { name: "Monarchy", tech: "monarchy", admin: 8, gold: .1, w: { nobles: 2.5, elders: 1.5, warriors: 1.5, commoners: 1 }, d: "+10% gold. Nobles hold power." },
  republic:   { name: "Republic", tech: "republic", admin: 8, gold: .15, sci: .1, elect: 6, ww: 1.5, w: { merchants: 2.5, commoners: 1.5, nobles: 1 }, d: "+15% gold, +10% science. Elections every 6 turns." },
  theocracy:  { name: "Theocracy", tech: "theology", admin: 9, stab: 10, sci: -.1, w: { elders: 3, commoners: 1.5, nobles: 1 }, d: "+10 stability, −10% science. Clergy rule." },
  empire:     { name: "Absolute Monarchy", tech: "absolutism", admin: 14, pow: .15, prod: .1, w: { nobles: 2, warriors: 2, commoners: 1 }, d: "+15% army, +10% materials, runs many settlements." },
  democracy:  { name: "Democracy", tech: "democracy", admin: 16, gold: .2, sci: .2, elect: 5, ww: 2, w: { commoners: 2, merchants: 1.5, intellectuals: 1.5, workers: 1.5 }, d: "+20% gold and science. Elections; hates long wars." },
  party:      { name: "Single-Party State", tech: "ideology", admin: 18, prod: .25, pow: .15, sci: -.05, w: { warriors: 2.5, workers: 1.5, commoners: .7 }, d: "+25% materials, +15% army. No elections." },
  technocracy:{ name: "Technocracy", tech: "computers", admin: 22, sci: .35, prod: .1, w: { intellectuals: 3, merchants: 1.5, workers: 1, commoners: 1 }, d: "+35% science, +10% materials." },
};
const LAWS = {
  tax: { name: "Taxes", opts: { low: ["Low", null, "−30% tax gold. People love it."], normal: ["Normal", null, "Standard taxes."], high: ["High", null, "+35% tax gold. Unpopular."], extort: ["Extortionate", null, "+70% tax gold. Very unpopular."] } },
  cons: { name: "Conscription", opts: { vol: ["Volunteers", null, "Small army cap. People like it."], levy: ["Levy", null, "Normal army cap."], mass: ["Mass Conscription", "bronze", "Huge army cap. Military loves it, people don't."] } },
  rel: { name: "Religion", opts: { faith: ["State Faith", null, "Clergy happy, thinkers unhappy."], tol: ["Tolerance", "philosophy", "Balanced. Conquered settlements settle down faster."], sec: ["Secular", "enlightenment", "+10% science. Clergy furious."] } },
  trade: { name: "Trade", opts: { prot: ["Protectionist", null, "+10% materials, less trade."], bal: ["Balanced", null, "Normal trade."], free: ["Free Trade", "currency", "+30% trade income. Merchants love it."] } },
  labor: { name: "Labor", tech: "steam", opts: { unreg: ["Unregulated", null, "+10% materials. Workers angry."], rights: ["Workers' Rights", null, "Workers happy, −5% materials."] } },
  press: { name: "Press", tech: "printing", opts: { cens: ["Censored", null, "Nobles happy, thinkers angry."], free: ["Free Press", null, "Thinkers happy, +5% science."] } },
  migr: { name: "Migration", opts: { free: ["Free settling", null, "Full settlements send people out to form new villages on their own."], restrict: ["Restricted", null, "No new villages form. Full settlements just stop growing. Commoners dislike it."] } },
  focus: { name: "National Focus", opts: { bal: ["Balanced", null, "No special focus."], grow: ["Growth", null, "Settlements grow faster."], mil: ["Military", "bronze", "+15% army, cheaper upkeep."], sci: ["Science", "writing", "+15% science."], com: ["Commerce", "currency", "+15% gold."], ind: ["Industry", "guilds", "+15% materials, cheaper buildings."] } },
};
const FACTIONS = {
  commoners: { name: () => "Commoners", icon: "🧑‍🌾", from: 0 },
  elders: { name: e => e < 1 ? "Elders" : "Clergy", icon: "🕯️", from: 0 },
  warriors: { name: e => e < 3 ? "Warriors" : "Military", icon: "⚔️", from: 0 },
  nobles: { name: e => e < 5 ? "Nobles" : "Aristocrats", icon: "👑", from: 1 },
  merchants: { name: () => "Merchants", icon: "💼", from: 2 },
  intellectuals: { name: () => "Intellectuals", icon: "📚", from: 4 },
  workers: { name: () => "Workers", icon: "🔧", from: 5 },
};
const COLORS = ["#e9524a", "#3c7dd9", "#f2b134", "#2fae6b", "#9b59d0", "#f07f2f", "#1fb5b0", "#e45aa0", "#8a5a33", "#5b6ee1", "#a5c234", "#c0392b", "#16a085", "#d35400", "#7d3c98", "#34495e", "#ff8fab", "#00a8e8", "#6c5ce7", "#00b894", "#e1a10b", "#e17055", "#0984e3", "#b33771", "#3b3b98", "#58b19f", "#cd6133", "#4b4b7a", "#ff9f43", "#218c74", "#82589f", "#8e7d5b", "#d63031", "#2d98da"];
const CRADLES = ["Lower Egypt", "Mesopotamia", "Indus", "North China Plain", "Jiangnan", "Punjab", "Anatolia", "Greece", "Southern Italy", "Central Mexico", "Peru", "Mali", "Ethiopia", "Northern Gaul", "England", "Persia", "Japan", "Muscovy", "Midwest", "Java", "Eastern Mongolia", "Castile", "Bengal", "Zimbabwe", "Korea", "Rhineland", "Gold Coast", "Southern Plains", "Pampas", "New South Wales", "Great Lakes Africa", "Yucatan"];
const SYL = ["ka", "ra", "tal", "mor", "eth", "vin", "sul", "dor", "ash", "ul", "ren", "bar", "kesh", "an", "ith", "or", "zan", "lo", "mir", "gal", "hun", "tep", "yar", "ob", "nek", "sa", "tor", "al", "qua", "ri", "ven", "ito", "ba", "du", "shen", "ko", "zi", "mar", "el", "ost", "ta", "ny", "vel", "kor", "ae", "bri", "hal", "wen"];
function genName(max = 9) { let s = pick(SYL) + pick(SYL); if (rnd() < .4) s += pick(SYL); s = s.replace(/(.)\1\1/, "$1$1"); return s[0].toUpperCase() + s.slice(1, max); }
// ---- culture: what a people values most. A major factor in research, armies and the economy ----
const CULTURES = {
  mixed:    { name: "Mixed", icon: "⚖️", sci: .05, gold: .05, prod: .05, food: .05, trade: .05, pow: .05, chains: [], fac: {}, d: "A bit of everything: +5% to science, gold, materials, food, trade and army." },
  scholarly:{ name: "Scholarly", icon: "📚", sci: .6, pow: -.15, chains: ["sci"], fac: { intellectuals: 10, warriors: -5 }, d: "+60% science, cheaper Knowledge fields. −15% army strength." },
  martial:  { name: "Martial", icon: "⚔️", sci: -.25, pow: .25, recruit: .2, chains: ["mil", "land", "navy", "air", "def"], fac: { warriors: 12, intellectuals: -6 }, d: "+25% army strength, more regiments, cheaper Weapons and Fortifications. −25% science." },
  industrious:{ name: "Industrious", icon: "⚒️", sci: -.1, prod: .3, chains: ["ind", "energy"], fac: { workers: 10, merchants: 4 }, d: "+30% materials, cheaper Industry and Energy. −10% science." },
  agrarian: { name: "Agrarian", icon: "🌾", sci: -.15, food: .3, grow: .02, chains: ["food", "herd", "health"], fac: { commoners: 6, elders: 6 }, d: "+30% food and faster growth, cheaper Food, Herding and Health. −15% science." },
  mercantile:{ name: "Mercantile", icon: "💰", sci: -.05, trade: .3, gold: .1, chains: ["trade", "navy"], fac: { merchants: 12 }, d: "+30% trade income, +10% gold, cheaper Trade and Shipbuilding. −5% science." },
};
const cul = n => CULTURES[n.cul] || CULTURES.mixed;
const PERS = { aggressive: "Warlike", builder: "Builder", trader: "Merchant", zealot: "Zealous" };

// region statics
const regionAvg = W.regions.reduce((a, r) => a + r.a, 0) / NR;
W.regions.forEach((r, i) => {
  r.i = i; r.sizeF = clamp(Math.sqrt(r.a / regionAvg), 0.6, 1.7);
  r.slots = clamp(Math.round(14 + 24 * r.sizeF * TER[r.t].slot), 16, 55);
  r.urban = clamp(Math.round(3 + 8 * r.sizeF * TER[r.t].slot), TOWNS_TO_CLAIM, 20); // max towns + cities
  r.path = new Path2D();
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const poly of r.p) for (const rg of poly) { r.path.moveTo(rg[0], rg[1]); for (let k = 0; k < rg.length; k += 2) { if (k) r.path.lineTo(rg[k], rg[k + 1]); x0 = Math.min(x0, rg[k]); x1 = Math.max(x1, rg[k]); y0 = Math.min(y0, rg[k + 1]); y1 = Math.max(y1, rg[k + 1]); } r.path.closePath(); }
  r.bb = [x0, y0, x1, y1];
});
const RID = Object.fromEntries(W.regions.map(r => [r.n, r.i]));
function gdist(a, b) { const A = W.regions[a], B = W.regions[b], toR = Math.PI / 180;
  const s = Math.sin((B.lat - A.lat) * toR / 2) ** 2 + Math.cos(A.lat * toR) * Math.cos(B.lat * toR) * Math.sin((B.lon - A.lon) * toR / 2) ** 2;
  return 2 * Math.asin(Math.sqrt(s)) / toR; }
let oceanN = null;
function oceanNeighbors(ri) {
  if (!oceanN) { oceanN = W.regions.map(a => a.c ? W.regions.filter(b => b.c && b.i !== a.i && gdist(a.i, b.i) < 45).map(b => b.i) : []); }
  return oceanN[ri];
}

// ================= GAME STATE =================
let G = null;
const P = () => G.nations[G.player];
const has = (n, t) => n.techs.includes(t);
const pk = (a, b) => a < b ? a + "-" + b : b + "-" + a;
function dip(a, b) { const k = pk(a, b); return G.dip[k] || (G.dip[k] = { rel: 0, trade: false, ally: false, war: false, ws: 0, wt: 0, met: false, truce: 0 }); }
const atWar = (a, b) => a !== b && a >= 0 && b >= 0 && dip(a, b).war;
const wscore = (a, b) => a < b ? dip(a, b).ws : -dip(a, b).ws;
function addWs(a, b, v) { const d = dip(a, b); d.ws += a < b ? v : -v; }
function log(text, icon = "•", who = null) { G.news.push({ t: text, i: icon, p: who === null || who === G.player }); }

// settlements & territories
const setsOf = n => G.sets.filter(s => s.o === n.id);
const setsIn = ri => G.sets.filter(s => s.r === ri);
const setById = id => G.sets.find(s => s.id === id);
const capSet = n => setById(n.cap);
const popOf = n => setsOf(n).reduce((a, s) => a + s.pop, 0);
function pres(n) { const p = new Set(); for (const s of G.sets) if (s.o === n.id) p.add(s.r); return p; }
const terrCount = n => G.regions.reduce((a, r) => a + (r.ctrl === n.id ? 1 : 0), 0);
const territories = n => G.regions.filter(r => r.ctrl === n.id);
const rankOf = n => rankIdx(terrCount(n));
const nm = n => RANKS[rankOf(n)].t(n.name);
const sizeOf = n => setsOf(n).reduce((a, s) => a + TIERS[s.t].admin, 0);
const townsOf = n => setsOf(n).filter(s => s.t >= 1).length;
function B(nid, ri) { const r = G.bld[ri] || (G.bld[ri] = {}); return r[nid] || (r[nid] = {}); }
function consOf(nid, ri) { const c = G.cons[ri]; return c ? c[nid] || null : null; }
function setCons(nid, ri, k) { const c = G.cons[ri] || (G.cons[ri] = {}); if (k) c[nid] = k; else delete c[nid]; }
function bldSlots(n, ri) { let s = 1; for (const x of G.sets) if (x.o === n.id && x.r === ri) s += x.t === 1 ? 1 : x.t === 2 ? 2 : 0; return s; }
const bldUsed = (n, ri) => Object.keys(B(n.id, ri)).length + (consOf(n.id, ri) ? 1 : 0);

// reachability: regions a nation can settle or strike, cached until settlements change
const reachCache = new Map();
function reachSet(n) {
  const key = G.sv + ":" + n.techs.length;
  const c = reachCache.get(n.id); if (c && c.key === key) return c.set;
  const P0 = pres(n), out = new Set(P0), sail = has(n, "sailing"), nav = has(n, "navigation");
  for (const ri of P0) { const s = W.regions[ri];
    for (const j of s.adj) out.add(j);
    if (sail) for (const j of s.sea) out.add(j);
    if (nav) for (const j of oceanNeighbors(ri)) out.add(j); }
  reachCache.set(n.id, { key, set: out }); return out;
}
const canReach = (n, ri) => reachSet(n).has(ri);
function near(n, a, b) { // can people walk/sail from region a to region b?
  if (a === b) return true; const s = W.regions[a];
  return s.adj.includes(b) || (has(n, "sailing") && s.sea.includes(b)) || (has(n, "navigation") && oceanNeighbors(a).includes(b));
}

let sampler = null;
// 1 map unit is roughly 24 km. A village of 50 people works about 5 km of land.
function samplePoint(ri, nearPt, owner = -1) {
  const S = W.regions[ri];
  if (!sampler) sampler = document.createElement("canvas").getContext("2d");
  const c = nearPt || { x: S.lx, y: S.ly };
  const h0 = .07;
  let best = null, bd = 1e9;
  for (let R = .22; R < 40 && !best; R *= 1.45) {
    for (let i = 0; i < 24; i++) {
      const a = rnd() * Math.PI * 2, d = R * (.55 + rnd() * .45), x = c.x + Math.cos(a) * d, y = c.y + Math.sin(a) * d;
      if (!sampler.isPointInPath(S.path, x, y, "evenodd")) continue;
      let ok = true, crowd = 0;
      for (const o of nearSets(x, y, 4)) {
        const cheb = Math.hypot(o.x - x, o.y - y), oh = o.h || .08;
        if (o.o !== owner && owner >= 0 && cheb < oh + h0 + .03) { ok = false; break; } // can't settle inside another people's borders
        if (cheb < Math.min(oh, .3) + h0 + .12) { ok = false; break; }
        if (cheb < 1) crowd++;
      }
      if (!ok) continue;
      if (owner >= 0 && inForeignCorridor(x, y, owner)) continue;
      const sc = d + crowd * .02 + rnd() * .1;
      if (sc < bd) { bd = sc; best = [x, y]; }
    }
  }
  if (best || (owner >= 0 && G.sets.length && nearPt)) return best;
  return [S.lx + (rnd() - .5) * .3, S.ly + (rnd() - .5) * .3];
}
// an irregular, rounded outline for a settlement's land (never larger than its radius, so neighbors never overlap)
function blobPts(x, y, r, seed, n = 22) {
  const a = (seed * 2.399) % 6.283, b = (seed * 1.731) % 6.283, c = (seed * .917) % 6.283, out = [];
  for (let i = 0; i < n; i++) { const t = i / n * Math.PI * 2;
    const f = .86 + .05 * Math.sin(3 * t + a) + .04 * Math.sin(5 * t + b) + .03 * Math.sin(2 * t + c);
    out.push([x + Math.cos(t) * r * f, y + Math.sin(t) * r * f]); }
  return out;
}
function smoothPoly(path, pts) { // closed curve through midpoints
  const m = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], N = pts.length;
  const s0 = m(pts[N - 1], pts[0]); path.moveTo(s0[0], s0[1]);
  for (let i = 0; i < N; i++) { const p = pts[i], q = m(p, pts[(i + 1) % N]); path.quadraticCurveTo(p[0], p[1], q[0], q[1]); }
  path.closePath();
}
// spatial lookup of settlements near a point
let gridKey = null, grid = null;
function nearSets(x, y, r) {
  if (gridKey !== G.sv + ":" + G.sets.length || !grid) { grid = new Map(); for (const s of G.sets) { const k = (s.x / 4 | 0) + "," + (s.y / 4 | 0); (grid.get(k) || grid.set(k, []).get(k)).push(s); } gridKey = G.sv + ":" + G.sets.length; }
  const out = [], gx0 = (x - r) / 4 | 0, gx1 = (x + r) / 4 | 0, gy0 = (y - r) / 4 | 0, gy1 = (y + r) / 4 | 0;
  for (let gx = gx0; gx <= gx1; gx++) for (let gy = gy0; gy <= gy1; gy++) { const a = grid.get(gx + "," + gy); if (a) for (const s of a) out.push(s); }
  return out;
}
function addSettlement(nid, ri, pop, from, name, tier = 0) {
  const pt = samplePoint(ri, from, G.nations.length > 1 ? nid : -1);
  if (!pt && from) return null;
  const [x, y] = pt || [W.regions[ri].lx, W.regions[ri].ly];
  const s = { id: G.sid++, o: nid, r: ri, t: tier, pop, name: name || genName(8), x, y, c: nid, u: 0, q: 0, f: G.turn, h: .05, hp: 1 };
  if (from && nid === G.player && G.fog) { // the settlers know the way they walked
    const d = Math.hypot(x - from.x, y - from.y), steps = Math.ceil(d / .8);
    for (let i = 1; i < steps; i++) addDisc(from.x + (x - from.x) * i / steps, from.y + (y - from.y) * i / steps, .9);
  }
  G.sets.push(s); G.sv++; return s;
}
// ---- borders: each settlement works a square of land sized by its population; squares stop at foreign borders ----
const HP = [1, 2, 3];
const APC = [5, 4, .7]; // km² of land each person uses (fields, pasture, woods), by tier
let landPath = null;
function getLandPath() {
  if (!landPath) { landPath = new Path2D(); for (const poly of W.land) for (const rg of poly) { landPath.moveTo(rg[0][0], rg[0][1]); for (let i = 1; i < rg.length; i++) landPath.lineTo(rg[i][0], rg[i][1]); landPath.closePath(); } }
  return landPath;
}
function hOf(s) { const n = G.nations[s.o]; const apc = APC[s.t] / (1 + .05 * (n ? n.era : 0)); return Math.max(.05, Math.sqrt(s.pop * apc) / 48 * 1.13); }
function growBorders() {
  for (const s of G.sets) { if (s.hp == null) s.hp = HP[s.t];
    if (s.hp < HP[s.t] && G.tt - (s.hit || 0) > 3) s.hp++;
    if (s.h == null) s.h = hOf(s) * .6; }
  for (const s of G.sets) {
    let target = hOf(s) * 1.9; // worked land plus the free hunting and grazing land around it
    const near = nearSets(s.x, s.y, 9);
    let gapMin = 1e9; for (const o of near) if (o.o !== s.o) gapMin = Math.min(gapMin, chebGap(s, o));
    if (gapMin < 4) target = Math.max(target, Math.min(hOf(s) * 6, s.h + gapMin)); // frontier: push the claim out toward the neighbors
    let lim = Math.min(target, s.h + Math.max(.03, s.h * .2) * TD);
    for (const o of near) { if (o.o === s.o) continue;
      lim = Math.min(lim, Math.hypot(o.x - s.x, o.y - s.y) - o.h - .01); }
    s.h = Math.max(.04, lim);
  }
  G.sv++;
}
const chebGap = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) - a.h - b.h;
function touchesSet(n, s) { return nearSets(s.x, s.y, 9).some(m => m.o === n.id && chebGap(m, s) < .25); }
let touchKey = null, touchPairs = new Set();
function bordersTouch(a, b) {
  const key = G.sv + ":" + G.turn;
  if (touchKey !== key) { touchKey = key; touchPairs = new Set();
    for (const s of G.sets) for (const o of nearSets(s.x, s.y, 9)) if (o.o !== s.o && chebGap(s, o) < .1) touchPairs.add(pk(s.o, o.o)); }
  return touchPairs.has(pk(a.id, b.id));
}
// a won battle pushes the defender's border back; the attacker's land grows into the gap
function chip(att, s) {
  s.h = Math.max(.04, s.h * .6);
  for (const m of nearSets(s.x, s.y, 9)) if (m.o === att && chebGap(m, s) < .6) m.h = Math.min(hOf(m) * 1.3, m.h + .15);
  G.sv++;
}
function giveLand() { G.sv++; }
function resetCells() {}
function rle() { return null; }
function recomputeControl(ri) {
  const cnt = {};
  for (const s of G.sets) if (s.r === ri && s.t >= 1) cnt[s.o] = (cnt[s.o] || 0) + 1;
  const r = G.regions[ri], cur = r.ctrl;
  let nc = -1;
  if (cur >= 0 && (cnt[cur] || 0) >= TOWNS_TO_CLAIM) nc = cur;
  else { let bv = 0; for (const k in cnt) if (cnt[k] >= TOWNS_TO_CLAIM && cnt[k] > bv) { bv = cnt[k]; nc = +k; } }
  if (nc === cur) return;
  const before = [cur, nc].filter(x => x >= 0).map(x => [x, rankOf(G.nations[x])]);
  r.ctrl = nc; G.sv++;
  if (nc >= 0) {
    const n = G.nations[nc];
    if (nc === G.player) log(`${W.regions[ri].n} is now your territory!`, "🚩");
    else if (dip(nc, G.player).met) log(`The ${nm(n)} now controls ${W.regions[ri].n}.`, "🏳️", -1);
  }
  if (cur === G.player && nc !== G.player) log(`You lost control of ${W.regions[ri].n}.`, "🏚️");
  for (const [id, rk] of before) { const n = G.nations[id], nr = rankOf(n);
    if (nr !== rk && n.alive) {
      if (id === G.player) log(nr > rk ? `Your people are now the ${nm(n)}! A ${RANKS[nr].name} can manage more settlements.` : `You fell to a ${RANKS[nr].name}: the ${nm(n)}.`, nr > rk ? "👑" : "🏚️");
      else if (nr > rk && nr >= 2 && dip(id, G.player).met) log(`The ${n.name} have risen to become the ${nm(n)}.`, "👑", -1);
    } }
}

function newNation(name, color, ri, ai, pers, culture) {
  const id = G.nations.length;
  const n = { id, name, color, ai, pers: pers || "builder", cul: culture || "mixed", culCool: 0, alive: true, gov: "tribe", govCool: 0, anarchy: 0, opposition: 0,
    laws: { tax: "normal", cons: "levy", rel: "faith", trade: "bal", labor: null, press: null, migr: "free", rp: "std", focus: "bal" },
    gold: 15, mat: 10, sciPts: 0, research: "agriculture", techs: [], era: 0, army: 1, used: 0,
    fac: {}, facMods: [], stab: 55, ww: 0, cap: -1, lastElect: 0, warmonger: 0, autoResearch: true, fullSeen: 0, fields: {} };
  for (const k in FACTIONS) n.fac[k] = 55;
  G.nations.push(n);
  if (ri >= 0) { const s = addSettlement(id, ri, START_POP, null, name); n.cap = s.id; }
  return n;
}
function newGame(opts) {
  reachCache.clear(); resetCells();
  G = { v: 2, turn: 1, tt: 0, month: 0, year: -4000, player: 0, nations: [], regions: [], sets: [], sid: 1, sv: 0, bld: {}, cons: {}, dip: {}, news: [], diff: opts.diff, over: false, nextEvent: 4, lastReport: [] };
  for (let i = 0; i < NR; i++) G.regions.push({ i, ctrl: -1 });
  const start = RID[opts.start];
  newNation(opts.name, opts.color, start, false, "builder", opts.cul || "mixed");
  const used = [start], colors = COLORS.filter(c => c !== opts.color);
  const addTribe = r => { used.push(r); const n = newNation(genName(), colors.shift() || `hsl(${Math.floor(rnd() * 360)},60%,52%)`, r, true, pick(Object.keys(PERS))); { const r0 = rnd(); n.cul = r0 < .1 ? "scholarly" : r0 < .2 ? "mixed" : ({ aggressive: "martial", zealot: rnd() < .5 ? "martial" : "agrarian", builder: rnd() < .5 ? "industrious" : rnd() < .5 ? "agrarian" : "martial", trader: rnd() < .7 ? "mercantile" : "martial" })[n.pers]; }
    n.laws.rp = n.cul === "scholarly" ? "high" : rnd() < .12 ? "high" : (n.pers === "aggressive" || n.pers === "zealot" || rnd() < .4) ? "low" : "std"; n.laws.cons = n.pers === "aggressive" ? "levy" : "vol"; };
  const livable = r => TER[W.regions[r].t].food >= .9;
  // two neighboring tribes a day or two's walk away (about 100-220 km)
  { const home = G.sets[0]; if (!sampler) sampler = document.createElement("canvas").getContext("2d");
    const spots = [];
    for (let tries = 0; tries < 600 && spots.length < 2; tries++) {
      const a = rnd() * Math.PI * 2, d = 4.5 + rnd() * 4.5, x = home.x + Math.cos(a) * d, y = home.y + Math.sin(a) * d;
      const reg = W.regions.find(S => x > S.bb[0] && x < S.bb[2] && y > S.bb[1] && y < S.bb[3] && sampler.isPointInPath(S.path, x, y, "evenodd"));
      if (!reg || !livable(reg.i) && rnd() < .8) continue;
      if (spots.some(p => Math.hypot(p.x - x, p.y - y) < 4)) continue;
      spots.push({ x, y, r: reg.i });
    }
    for (const sp of spots) { addTribe(sp.r); const t = G.sets[G.sets.length - 1]; t.x = sp.x; t.y = sp.y; t.r = sp.r; }
  }
  // the rest of the world: mostly coastal peoples, a few inland river valleys
  const pool = W.regions.map(r => r.i).filter(r => !used.includes(r) && (livable(r) || CRADLES.includes(W.regions[r].n))).sort(() => rnd() - .5);
  for (const r of pool) {
    if (G.nations.length >= 30) break;
    if (!W.regions[r].c && !CRADLES.includes(W.regions[r].n) && rnd() > .2) continue;
    if (used.some(u => gdist(u, r) < 9)) continue;
    addTribe(r);
  }
  G.exp = new Array(NR).fill(0); G.fog = [];
  for (let i = 0; i < 4; i++) growBorders();
  updateContacts(); updateExplore();
  log(`The ${nm(P())} is born: a single village of ${START_POP} people in ${W.regions[start].n}.`, "🔥");
}

// ================= SETTLEMENT ACTIONS =================
const eraM = (n, b = 1.5) => Math.pow(b, n.era);
const villageCost = n => ({ g: Math.round(5 * eraM(n) + setsOf(n).length * .4), m: Math.round(4 * eraM(n)) });
const townCost = n => ({ g: Math.round(25 * eraM(n)), m: Math.round(20 * eraM(n)) });
const cityCost = n => ({ g: Math.round(120 * eraM(n, 1.6)), m: Math.round(100 * eraM(n, 1.6)) });
const afford = (n, c) => n.gold >= c.g && n.mat >= c.m;
function donorFor(n, ri) {
  let best = null;
  for (const s of G.sets) {
    if (s.o !== n.id || s.pop < MOVERS + 12 || !near(n, s.r, ri)) continue;
    const score = (s.r === ri ? 1e6 : 0) + (s.t === 0 && s.pop >= VILLAGE_CAP - 2 ? 5e5 : 0) + s.pop;
    if (!best || score > best.sc) best = { s, sc: score };
  }
  return best ? best.s : null;
}
function foundCheck(n, ri) {
  const r = G.regions[ri], s = W.regions[ri];
  if (r.ctrl >= 0 && r.ctrl !== n.id) return { ok: false, why: `Territory of the ${nm(G.nations[r.ctrl])}` };
  if (setsIn(ri).length >= s.slots) return { ok: false, why: "No room left in this territory" };
  if (!canReach(n, ri)) return { ok: false, why: has(n, "navigation") ? "Too far from your people" : has(n, "sailing") ? "Too far. Navigation lets you cross oceans" : "Too far. Your people only move to neighboring land (Sailing crosses short seas)" };
  const d = donorFor(n, ri);
  if (!d) return { ok: false, why: `Needs a nearby settlement with at least ${MOVERS + 12} people to send settlers` };
  const c = villageCost(n);
  if (!afford(n, c)) return { ok: false, why: "Not enough gold or materials", donor: d, c };
  return { ok: true, donor: d, c };
}
function foundVillage(n, ri, donor) {
  const s = addSettlement(n.id, ri, MOVERS, donor);
  if (!s) return null;
  const c = villageCost(n); n.gold -= c.g; n.mat -= c.m;
  donor.pop -= MOVERS;
  if (!n.ai) log(`Settlers from ${donor.name} founded the village of ${s.name} in ${W.regions[ri].n}.`, "🛖");
  return s;
}
function townCheck(n, s) {
  if (s.t !== 0) return { ok: false };
  const mates = mergeMates(n, s);
  const urb = urbanIn(s.r), cap = W.regions[s.r].urban;
  if (urb >= cap) return { ok: false, why: `${W.regions[s.r].n} has room for only ${cap} towns and cities, and all are taken`, mates };
  if (!has(n, "agriculture")) return { ok: false, why: "Research Agriculture first", mates };
  if (mates.length < VILLAGES_FOR_TOWN - 1) return { ok: false, why: `Needs ${VILLAGES_FOR_TOWN} of your villages close together, in this territory or the one next door (you have ${mates.length + 1})`, mates };
  const k = townsOf(n) + 1, req = townReq(k), pop = popOf(n);
  if (pop < req) return { ok: false, why: `Town #${k} needs ${fmtP(req)} people in your nation (you have ${fmtP(pop)})` };
  const c = townCost(n);
  if (!afford(n, c)) return { ok: false, why: "Not enough gold or materials", c };
  return { ok: true, c, mates };
}
const urbanIn = ri => G.sets.reduce((a, x) => a + (x.r === ri && x.t >= 1 ? 1 : 0), 0);
// the 3 closest villages (same territory or a bordering one) that would merge with s into a town
function mergeMates(n, s) {
  const adj = W.regions[s.r].adj;
  return G.sets.filter(x => x.o === n.id && x.t === 0 && x !== s && (x.r === s.r || adj.includes(x.r)))
    .sort((a, b) => (a.r !== s.r) - (b.r !== s.r) || Math.hypot(a.x - s.x, a.y - s.y) - Math.hypot(b.x - s.x, b.y - s.y))
    .slice(0, VILLAGES_FOR_TOWN - 1);
}
function cityCheck(n, s) {
  if (s.t !== 1) return { ok: false };
  if (!has(n, "masonry")) return { ok: false, why: "Research Masonry first" };
  if (s.pop < CITY_POP) return { ok: false, why: `Needs ${fmtP(CITY_POP)} people (has ${fmtP(s.pop)})` };
  const c = cityCost(n);
  if (!afford(n, c)) return { ok: false, why: "Not enough gold or materials", c };
  return { ok: true, c };
}
function upgrade(n, s) {
  const c = s.t === 0 ? townCost(n) : cityCost(n);
  n.gold -= c.g; n.mat -= c.m;
  if (s.t === 0) { // villages merge: everyone moves together into one town
    const mates = mergeMates(n, s);
    for (const m of mates) { s.pop += m.pop; if (n.cap === m.id) n.cap = s.id; G.sets.splice(G.sets.indexOf(m), 1); }
    s.u = Math.min(s.u, ...mates.map(m => m.u)); s.ov = 0; s.crowd = false;
    if (!n.ai) log(`${[s, ...mates].map(x => x.name).join(", ").replace(/, ([^,]*)$/, " and $1")} merged into the town of ${s.name}!`, "🏘️");
  } else if (!n.ai) log(`${s.name} grew into a city!`, "🏙️");
  s.t++; G.sv++;
  recomputeControl(s.r);
}

// ================= ECONOMY =================
function stratHave(n, res) { for (const ri of pres(n)) if (W.regions[ri].r === res) return true; return false; }
function tradePartners(n) { return G.nations.filter(o => o.alive && o.id !== n.id && dip(n.id, o.id).trade && !atWar(n.id, o.id)); }
function stratStatus(n) {
  const out = [];
  for (const s of STRAT_NEED) {
    if (n.era < s.from || n.era > s.to) continue;
    const t = RES[s.res].tech; if (t && !has(n, t)) continue;
    let st = "missing", from = null;
    if (stratHave(n, s.res)) st = "have";
    else if (n.laws.trade !== "prot") { const src = tradePartners(n).find(o => stratHave(o, s.res)); if (src) { st = "import"; from = src; } }
    out.push({ ...s, st, from, cost: st === "import" ? Math.round(3 * (n.era + 1) * (n.laws.trade === "free" ? .7 : 1)) : 0 });
  }
  return out;
}
function adminCap(n) {
  let a = (GOVS[n.gov].admin + n.era * 2 + RANKS[rankOf(n)].admin) * 2;
  a += fb(n, "admin");
  return Math.floor(a);
}
function unitPower(n) {
  let m = 1 + (GOVS[n.gov].pow || 0), bp = 0;
  m += fb(n, "pow");
  for (const t of ["mathematics", "chivalry"]) if (has(n, t)) m += .1;
  for (const t of ["gunpowder", "rifling"]) if (has(n, t)) m += .15;
  if (n.laws.focus === "mil") m += .15;
  m += cul(n).pow || 0;
  m += officerBonus(n) + (cmd(n).pow || 0) + supremeMult(n);
  for (const s of stratStatus(n)) { if (s.bonus && s.st !== "missing") m += s.bonus; if (s.pen && s.st === "missing") m -= s.pen; }
  m *= 0.8 + 0.4 * n.stab / 100;
  m *= milMult(n.milFund == null ? 1 : n.milFund) * qualMult(n.milQual || 0);
  if (n.ai) m *= [0.85, 1, 1.15][G.diff];
  return ERA_POW[n.era] * m;
}
const power = n => n.army * unitPower(n);
function maxArmy(n) {
  const u = setsOf(n).reduce((a, s) => a + U(s.pop), 0);
  const rate = { vol: .12, levy: .2, mass: .35 }[n.laws.cons];
  return Math.floor((u * rate + 1 + fb(n, "recruit")) * (1 + (cul(n).recruit || 0)) * (cmd(n).cap || 1));
}
const unitCost = n => ({ g: Math.round(8 * Math.pow(1.6, n.era)), m: Math.round(6 * Math.pow(1.6, n.era)) });
const unitUpkeep = n => 0.25 * Math.pow(1.5, n.era) * (n.laws.focus === "mil" ? .8 : 1) * (cmd(n).upkeep || 1);
function bonus(n, ri, key) { // fields are nation-wide; metal deposits help Industry
  let m = fb(n, key);
  if (key === "prod" && ["copper", "iron", "coal", "gold", "gems", "uranium"].includes(W.regions[ri].r)) m += chainLevels(n, "ind") * .02;
  return m;
}
function capOf(s, n) {
  if (s.t === 0) return VILLAGE_CAP;
  n = n || G.nations[s.o];
  const cb = bonus(n, s.r, "cap") + (W.regions[s.r].r === "fish" ? .1 : 0);
  if (s.t === 1) return 3000 * (1 + cb);
  return 12000 * (1 + .4 * n.era) * (1 + cb);
}
// ---- the national budget: set every year as a share of gross income (taxes, trade and luxuries) ----
const BUDGET = {
  mil:    { name: "Military", icon: "🛡️", d: "Decides your army. Split it between quantity (how many regiments you keep) and quality (arms, training and drill for each one)." },
  res:    { name: "Research", icon: "🔬", d: "Funds scholars, labs and expeditions. Also uses materials: half the same share of your materials output." },
  prod:   { name: "Production", icon: "🏭", d: "Invests in workshops, mines and factories for more materials." },
  travel: { name: "Travel", icon: "🧭", d: "Sends your people abroad to study, trade and see the world. Raises the odds of skilled generals and commanders." },
  sub:    { name: "Subsidies", icon: "🌾", d: "Supports farmers and craftsmen: more food, faster growth, and happier commoners and merchants." },
  prop:   { name: "Propaganda", icon: "📣", d: "Persuades your people they need less from the state, holding down their demand for welfare. Almost nothing is needed while people are uneducated, but the more educated they get, the more it costs to convince them." },
};
const WELFARE = {
  inc:    { name: "Basic income", icon: "💵", lv: ["None", "Poor relief", "Basic income", "Standard income", "Universal income"], era: [0, 0, 3, 5, 6], cost: [0, .04, .08, .14, .22] },
  health: { name: "Healthcare", icon: "🏥", lv: ["None", "Basic care", "Public clinics", "National healthcare", "Advanced healthcare"], era: [0, 0, 3, 5, 6], cost: [0, .04, .08, .13, .2] },
};
const RP_PCT = { low: 5, std: 15, high: 30, max: 50, bal: 15, sch: 30, acad: 50 };
function bud(n) { if (!n.budget) n.budget = { mil: 0, res: RP_PCT[n.laws.rp] || 15, prod: 0, travel: 0, sub: 0, prop: 0, inc: 0, health: 0, init: true }; if (n.budget.prop == null) n.budget.prop = 0; if (n.budget.qual == null) n.budget.qual = n.budget.init ? 25 : 0; return n.budget; }
const welfareMax = (n, k) => WELFARE[k].era.reduce((m, e, i) => e <= n.era ? i : m, 0);
const welfareLv = n => bud(n).inc + bud(n).health;
const budgetPct = n => bud(n).res / 100;
const milMult = f => f < 1 ? .5 + .5 * Math.max(0, f) : 1; // regiments the budget can't pay fight badly until they're stood down
const qualMult = q => 1 + .9 * Math.sqrt(Math.max(0, q)); // better arms, training and drill per regiment, with diminishing returns
const prodBoostOf = n => 1.2 * Math.pow(bud(n).prod / 100, .7);
const subFoodOf = n => .8 * Math.pow(bud(n).sub / 100, .7);
const subGrowOf = n => .04 * Math.sqrt(bud(n).sub / 100);
const travelQ = n => 3 * Math.sqrt(bud(n).travel / 100); // how far abroad your people get: better odds of great characters
// education: the more educated your people, the more welfare they expect from the state
function eduOf(n) { let ac = 0; for (const x of G.sets) if (x.o === n.id && x.acad) ac += x.acad; return clamp(n.era * 10 + chainLevels(n, "sci") * 1.2 + Math.min(20, ac * 3), 0, 100); }
const propSway = n => 3 * Math.sqrt((bud(n).prop || 0) / 100) * 25 / (25 + eduOf(n)); // welfare levels of demand talked away; worth less as people learn
const welfareExpect = (n, k) => Math.min(welfareMax(n, k), Math.max(0, (eduOf(n) - 8) / 22));
const welfareGap = (n, k) => Math.max(0, welfareExpect(n, k) - bud(n)[k] - propSway(n));
const welfareWork = n => .02 * welfareLv(n); // healthier, steadier people work better
const FLOWS = ["tax", "routeGold", "luxGold", "foodGold", "bUp", "armyUp", "imports", "govUp", "goldNet", "mat", "sci", "resGold", "resMat", "resSci", "acadUp", "sciPay", "offPay", "gross", "fixed", "spend", "milGold", "qtyGold", "qualGold", "prodGold", "travelGold", "subGold", "propGold", "incGold", "healthGold", "spare"];
function econM(n) { setTD(); const E = econ(n), M = { ...E, raw: E }; for (const k of FLOWS) M[k] = E[k] * TD; return M; } // what a quarter brings in and costs
function econ(n) {
  const gov = GOVS[n.gov], L = n.laws, sets = setsOf(n), P0 = pres(n);
  const stabM = 0.75 + 0.5 * n.stab / 100, anarchy = n.anarchy > 0 ? .6 : 1;
  const taxM = { low: .7, normal: 1, high: 1.35, extort: 1.7 }[L.tax];
  const C0 = cul(n);
  const prodLaw = (C0.prod || 0) + (L.trade === "prot" ? .1 : 0) + (L.labor === "unreg" ? .1 : L.labor === "rights" ? -.05 : 0) + (L.focus === "ind" ? .15 : 0) + (gov.prod || 0);
  const goldLaw = (gov.gold || 0) + (L.focus === "com" ? .15 : 0) + (C0.gold || 0);
  const sciLaw = (C0.sci || 0) + (gov.sci || 0) + (L.focus === "sci" ? .15 : 0) + (L.rel === "sec" ? .1 : 0) + (L.press === "free" ? .05 : 0);
  const rb = new Map();
  for (const ri of P0) rb.set(ri, { food: bonus(n, ri, "food"), gold: bonus(n, ri, "gold"), prod: bonus(n, ri, "prod"), sci: bonus(n, ri, "sci") });
  let food = 0, need = 0, tax = 0, mat = 0, sci = 1 + n.era, pop = 0, trade = 0, bUp = 0, tierTrade = 0;
  const per = new Map();
  for (const s of sets) {
    const R = W.regions[s.r], T = TER[R.t], tier = TIERS[s.t], u = U(s.pop), b = rb.get(s.r);
    const unrestM = 1 - s.u / 250;
    const f = s.pop * T.food * tier.food * (1 + b.food + (C0.food || 0) + subFoodOf(n) + (R.r === "fish" ? .3 : 0) + (s.id === n.cap ? .3 : 0)) * (1 + .05 * n.era);
    const g = (u * T.gold * .5 * tier.gold + tier.base) * taxM * (1 + b.gold + goldLaw) * stabM * unrestM * anarchy;
    const m = (u * T.prod * .6 * tier.mat + tier.base) * (1 + b.prod + prodLaw) * stabM * unrestM * anarchy;
    const sc = u * .2 * tier.sci * (1 + b.sci + sciLaw) * stabM * anarchy;
    food += f; need += s.pop * .8; tax += g; mat += m; sci += sc; pop += s.pop; tierTrade += tier.trade;
    per.set(s.id, { food: f, gold: g, mat: m, sci: sc });
  }
  for (const k in n.fields || {}) if (FIELDS[k]) bUp += fieldUp(FIELDS[k]) * n.fields[k];
  // academies cost a lot to run, and every scientist and officer draws a salary
  let acadUp = 0; for (const x of G.sets) if (x.o === n.id) acadUp += ((x.acad === 1 ? 2 : x.acad === 2 ? 6 : 0) + (x.mil ? 4 : 0)) * Math.pow(1.4, n.era);
  const sciPay = (n.scientists || 0) * sciSalary(n), offPay = (n.officers || 0) * offSalary(n);
  const talent = n.scientists || 0; sci *= 1 + scientistBoost(n);
  const partners = tradePartners(n);
  const peaceful = G.nations.filter(o => o.alive && o.id !== n.id && dip(n.id, o.id).met && !atWar(n.id, o.id)).length;
  const tradeLawM = (1 + (C0.trade || 0)) * { prot: .7, bal: 1, free: 1.3 }[L.trade] * (has(n, "globalization") ? 1.4 : 1) * (1 + fb(n, "trade"));
  const routeGold = (trade + tierTrade + (has(n, "agriculture") ? 1 : .3)) * (1 + .15 * partners.length + .04 * peaceful) * tradeLawM * (1 + .2 * n.era) * stabM;
  const luxCount = {};
  for (const ri of P0) { const rs = W.regions[ri].r; if (rs && RES[rs].kind === "lux") luxCount[rs] = (luxCount[rs] || 0) + 1; }
  const luxKinds = Object.keys(luxCount).length;
  const luxExtra = Object.values(luxCount).reduce((a, c) => a + c - 1, 0);
  const luxGold = (luxKinds * .6 + luxExtra * 1.5) * (1 + .3 * n.era) * (L.trade === "prot" ? .6 : 1);
  const strat = stratStatus(n);
  const imports = strat.reduce((a, s) => a + s.cost, 0);
  const surplus = food - need;
  const foodGold = surplus > 0 ? Math.min(surplus * .02, 1 + n.era * 3) : 0;
  const armyUp = n.army * unitUpkeep(n);
  const gross = Math.max(0, tax + routeGold + luxGold), Bd = bud(n);
  if (Bd.init) { delete Bd.init; Bd.mil = clamp(Math.ceil(armyUp * 1.05 / Math.max(1, gross * (1 - Bd.qual / 100)) * 20) * 5, 5, 60); }
  const pctG = k => gross * Bd[k] / 100;
  // the military budget decides the army: the quantity share pays for regiments, the quality share makes each one better
  const milGold = pctG("mil"), up1 = unitUpkeep(n), manpower = maxArmy(n);
  let qtyGold = milGold * (1 - Bd.qual / 100), qualGold = milGold - qtyGold;
  const armyTarget = Math.min(manpower, Math.floor(qtyGold / up1 + 1e-9));
  const spare = Math.max(0, qtyGold - manpower * up1); qtyGold -= spare; qualGold += spare; // more money than men: it goes into quality
  const milFund = armyUp > 0 ? qtyGold / armyUp : 1, milQual = qualGold / (Math.max(1, n.army, armyTarget) * up1);
  n.milFund = milFund; n.milQual = milQual;
  const prodGold = pctG("prod"), prodBoost = prodBoostOf(n); mat *= 1 + prodBoost + welfareWork(n);
  const travelGold = pctG("travel"), subGold = pctG("sub"), propGold = pctG("prop");
  const incGold = gross * WELFARE.inc.cost[Bd.inc], healthGold = gross * WELFARE.health.cost[Bd.health];
  sci *= 1 + welfareWork(n);
  const over = Math.max(0, sizeOf(n) - adminCap(n));
  const govUp = over * (1 + n.era);
  // research budget: part of the nation's income is spent on scholars, labs and expeditions
  const rpct = budgetPct(n), resGold = gross * rpct, resMat = mat * rpct * .5;
  const resRate = 1.5 * Math.pow(1.25, n.era), resSci = (resGold + resMat) / resRate;
  sci += resSci; mat -= resMat;
  const fixed = bUp + imports + govUp + acadUp + sciPay + offPay;
  const spend = milGold + resGold + prodGold + travelGold + subGold + propGold + incGold + healthGold;
  const goldNet = gross + foodGold - fixed - spend;
  return { gross, fixed, spend, milGold, milFund, milQual, qtyGold, qualGold, armyTarget, manpower, spare, prodGold, prodBoost, travelGold, subGold, propGold, incGold, healthGold, food, need, surplus, tax, routeGold, luxGold, foodGold, bUp, armyUp, imports, govUp, goldNet, mat, sci, pop, per, partners, peaceful, luxCount, luxKinds, strat, over, resGold, resMat, resSci, talent, acadUp, sciPay, offPay };
}

// ================= POLITICS =================
function facActive(n, k) { return FACTIONS[k].from <= n.era || (GOVS[n.gov].w[k] || 0) > 0; }
function facTargets(n, E) {
  const L = n.laws, g = n.gov, P0 = [...pres(n)], out = {};
  const add = (k, v, why) => { if (!out[k]) out[k] = { v: 50, why: [] }; if (v) { out[k].v += v; out[k].why.push([why, v]); } };
  const cnt = () => 0;
  const rn = Math.max(1, P0.length);
  const wars = G.nations.filter(o => atWar(n.id, o.id));
  const warBal = wars.reduce((a, o) => a + wscore(n.id, o.id), 0);
  const crowded = setsOf(n).filter(s => s.crowd).length;
  add("commoners", { low: 12, normal: 0, high: -12, extort: -28 }[L.tax], "Taxes");
  add("commoners", E.surplus >= 0 ? 6 : -25, E.surplus >= 0 ? "Food surplus" : "Famine");
  add("commoners", Math.min(15, E.luxKinds * 3), "Luxuries");
  add("commoners", Math.round(Math.min(15, fb(n, "stab") * 1.5 + chainLevels(n, "health"))), "Faith, culture & health");
  add("commoners", { vol: 6, levy: 0, mass: -15 }[L.cons], "Conscription");
  add("commoners", -Math.round(n.ww), "War weariness");
  add("commoners", { democracy: 10, republic: 5, party: -10 }[g] || 0, "Government");
  add("commoners", L.labor === "rights" ? 6 : 0, "Workers' rights");
  add("commoners", L.focus === "grow" ? 8 : 0, "Growth focus");
  add("commoners", -Math.min(12, crowded * 2), "Overcrowding");
  add("commoners", L.migr === "restrict" ? -6 : 0, "Migration restricted");
  add("commoners", -Math.min(25, Math.round(E.over * 3)), "Overextended");
  add("elders", { faith: 15, tol: -5, sec: -22 }[L.rel], "Religion law");
  add("elders", Math.round(Math.min(18, chainLevels(n, "faith") * 1.5)), "Holy sites");
  add("elders", { theocracy: 22, party: -15, technocracy: -10, tribe: 5 }[g] || 0, "Government");
  const ratio = n.army / Math.max(1, sizeOf(n));
  add("warriors", ratio < .5 ? -15 : ratio > 1.5 ? 10 : 0, "Army size");
  add("warriors", wars.length ? clamp(Math.round(warBal / 2), -15, 15) : 0, "War progress");
  add("warriors", { vol: -6, levy: 0, mass: 12 }[L.cons], "Conscription");
  add("warriors", L.focus === "mil" ? 15 : 0, "Military focus");
  add("warriors", { empire: 10, party: 12, chiefdom: 10, democracy: -6 }[g] || 0, "Government");
  add("nobles", { monarchy: 18, empire: 15, theocracy: 5, republic: -12, democracy: -22, party: -28, technocracy: -10 }[g] || 0, "Government");
  add("nobles", { high: 5, extort: 8, low: -6 }[L.tax] || 0, "Taxes");
  add("nobles", L.press === "free" ? -6 : L.press === "cens" ? 6 : 0, "Press");
  add("merchants", { prot: -12, bal: 0, free: 15 }[L.trade], "Trade law");
  add("merchants", { low: 10, normal: 0, high: -10, extort: -20 }[L.tax], "Taxes");
  add("merchants", wars.length ? -10 : 5, wars.length ? "At war" : "At peace");
  add("merchants", Math.min(12, E.partners.length * 3), "Trade pacts");
  add("merchants", Math.round(Math.min(12, chainLevels(n, "trade"))), "Markets & trade");
  add("merchants", { republic: 12, democracy: 10, party: -15 }[g] || 0, "Government");
  add("merchants", L.focus === "com" ? 12 : 0, "Commerce focus");
  add("intellectuals", L.press === "free" ? 15 : L.press === "cens" ? -15 : 0, "Press");
  add("intellectuals", { sec: 10, faith: -10, tol: 3 }[L.rel], "Religion law");
  add("intellectuals", Math.round(Math.min(15, chainLevels(n, "sci"))), "Schools & universities");
  add("intellectuals", L.focus === "sci" ? 15 : 0, "Science focus");
  { const B0 = bud(n), mf = n.milFund == null ? 1 : n.milFund;
    add("intellectuals", clamp(Math.round((B0.res - 15) * .5), -8, 20), "Research budget");
    add("warriors", Math.round(clamp(mf - 1, -1, 1) * 12), mf < 1 ? "Army underpaid" : "Military budget");
    add("commoners", Math.round(2 * Math.sqrt(B0.sub)), "Subsidies"); add("merchants", Math.round(1.5 * Math.sqrt(B0.sub)), "Subsidies");
    add("commoners", 3 * welfareLv(n), "Welfare"); add("nobles", -2 * B0.inc, "Basic income");
    const gap = welfareGap(n, "inc") + welfareGap(n, "health"); add("commoners", -Math.round(4 * gap), "Unmet welfare demand"); add("intellectuals", -Math.round(3 * gap), "Unmet welfare demand");
    if (B0.prop) add("intellectuals", -Math.round(1.5 * Math.sqrt(B0.prop)), "Propaganda"); }
  add("intellectuals", { democracy: 12, technocracy: 20, party: -18, theocracy: -15 }[g] || 0, "Government");
  add("workers", L.labor === "rights" ? 20 : L.labor === "unreg" ? -15 : 0, "Labor law");
  add("workers", { democracy: 10, party: 8 }[g] || 0, "Government");
  add("workers", { low: 8, high: -8, extort: -15 }[L.tax] || 0, "Taxes");
  add("workers", L.focus === "ind" ? 6 : 0, "Industry focus");
  for (const k in cul(n).fac) add(k, cul(n).fac[k], `${cul(n).name} culture`);
  for (const k in cmd(n).fac || {}) add(k, cmd(n).fac[k], cmd(n).name);
  if (n.culShift > 0) add("commoners", -10, "Cultural upheaval");
  for (const m of n.facMods) add(m.k, m.v, m.why);
  for (const k in out) out[k].v = clamp(out[k].v, 0, 100);
  return out;
}
function stabilityOf(n, fac) {
  const w = GOVS[n.gov].w; let s = 0, ws = 0;
  for (const k in FACTIONS) { if (!facActive(n, k)) continue; const wt = (w[k] || 1); s += fac[k] * wt; ws += wt; }
  return clamp(s / ws + (GOVS[n.gov].stab || 0) + (n.anarchy ? -15 : 0), 0, 100);
}

// ================= TURN PROCESSING =================
// fog of war: what the player's people know about the world
function addDisc(x, y, r) {
  const F = G.fog;
  for (const d of F) if (Math.hypot(d.x - x, d.y - y) + r <= d.r + 1e-6) return;
  for (let i = F.length - 1; i >= 0; i--) if (Math.hypot(F[i].x - x, F[i].y - y) + F[i].r <= r) F.splice(i, 1);
  F.push({ x: +x.toFixed(3), y: +y.toFixed(3), r: +r.toFixed(3) });
  const bb = G.fogBB || [x - r, y - r, x + r, y + r];
  G.fogBB = [Math.min(bb[0], x - r), Math.min(bb[1], y - r), Math.max(bb[2], x + r), Math.max(bb[3], y + r)];
  if (!sampler) sampler = document.createElement("canvas").getContext("2d");
  for (const S of W.regions) { if (G.exp[S.i]) continue; const [a, b, c, d] = S.bb; if (x + r < a || x - r > c || y + r < b || y - r > d) continue;
    if (sampler.isPointInPath(S.path, x, y, "evenodd") || Math.hypot(S.lx - x, S.ly - y) < r) { G.exp[S.i] = 1; continue; }
    for (let k = 0; k < 8; k++) { const t = k * Math.PI / 4; if (sampler.isPointInPath(S.path, x + Math.cos(t) * r * .9, y + Math.sin(t) * r * .9, "evenodd")) { G.exp[S.i] = 1; break; } } }
}
// what the player's people have seen: circles around their settlements, growing with size and technology
function updateExplore() {
  const n = P(); if (!n || !G.exp) return;
  if (!G.fog) G.fog = [];
  if (has(n, "flight")) { G.fogAll = true; G.exp.fill(1); return; }
  const sight = .8 + .4 * n.era + (has(n, "sailing") ? .3 : 0) + (has(n, "navigation") ? .8 : 0);
  for (const s of setsOf(n)) addDisc(s.x, s.y, (s.h || .1) * 1.5 + sight * (1 + s.t * .6));
  for (const o of G.nations) { if (!o.alive || o.id === n.id || !dip(n.id, o.id).met) continue;
    const c = capSet(o); if (c) addDisc(c.x, c.y, .5);
    if (dip(n.id, o.id).trade || dip(n.id, o.id).ally) for (const s of setsOf(o)) if (s.t >= 1) addDisc(s.x, s.y, s.h * 2 + .3); }
}
const seeAll = () => !G.fog || G.fogAll || G.setup || G.demo;
const visibleAt = (x, y) => seeAll() || G.fog.some(d => Math.hypot(d.x - x, d.y - y) < d.r);
const fogged = ri => G.exp && !G.setup && !G.demo && !G.exp[ri];
function updateContacts() {
  for (const a of G.nations) { if (!a.alive) continue;
    for (const b of G.nations) { if (!b.alive || b.id <= a.id) continue;
      const d = dip(a.id, b.id); if (d.met) continue;
      const late = (has(a, "navigation") && has(b, "navigation")) || (a.era >= 6 && b.era >= 6);
      const ra = reachSet(a), rb = reachSet(b);
      if (late || [...pres(a)].some(ri => rb.has(ri)) || [...pres(b)].some(ri => ra.has(ri))) {
        d.met = true;
        if (a.id === G.player || b.id === G.player) log(`First contact with the ${nm(a.id === G.player ? b : a)}.`, "🤝");
      }
    }
  }
}
function buildCost(n, b) { const disc = n.laws.focus === "ind" ? .9 : 1; return { g: Math.round(b.cg * disc), m: Math.round(b.cm * disc) }; }
function buildCheck(n, ri, b) {
  const have = B(n.id, ri);
  if (have[b.k] || consOf(n.id, ri) === b.k) return false;
  if (!has(n, b.tech)) return false;
  if (b.coastal && !W.regions[ri].c) return false;
  if (b.unique && [...pres(n)].some(r => B(n.id, r)[b.k] || consOf(n.id, r) === b.k)) return false;
  return true;
}
const canBuildHere = (n, ri) => pres(n).has(ri) && !consOf(n.id, ri) && bldUsed(n, ri) < bldSlots(n, ri);
function startBuild(n, ri, b) { const c = buildCost(n, b); n.gold -= c.g; n.mat -= c.m; setCons(n.id, ri, b.k); }
function recruit(n, k) { const c = unitCost(n); n.gold -= c.g * k; n.mat -= c.m * k; n.army += k; }

function processNation(n) {
  if (!n.alive) return;
  const E = econ(n);
  n.gold += E.goldNet * TD; n.mat += E.mat * TD;
  // the army grows or shrinks toward what the military budget pays for. New regiments need materials to equip
  if (n.army === E.armyTarget) n.armyAcc = 0;
  else if (n.army < E.armyTarget) { n.armyAcc = (n.armyAcc || 0) + Math.max(1, E.manpower * .25) * TD;
    const uc = unitCost(n), k = Math.min(E.armyTarget - n.army, Math.floor(n.armyAcc), Math.max(0, Math.floor(n.mat / uc.m)));
    if (k > 0) { n.army += k; n.mat -= k * uc.m; n.armyAcc -= k; } }
  else { n.armyAcc = (n.armyAcc || 0) + Math.max(1, (n.army - E.armyTarget) * .5) * TD; const k = Math.min(n.army - E.armyTarget, Math.floor(n.armyAcc)); if (k > 0) { n.army -= k; n.armyAcc -= k; } }
  // debt: nobody quits, the nation simply borrows. Interest piles up and the people's trust drains away
  if (n.trust == null) n.trust = 100;
  if (n.gold < 0) n.gold *= Math.pow(1.02, TD);
  n.trustDelta = trustFactors(n, E).reduce((a, x) => a + x[1], 0);
  n.trust = Math.min(100, n.trust + n.trustDelta * TD);
  if (n.trust < 30) {
    if (!n.ai && !n.trustWarned) { n.trustWarned = true; log(`Public trust is collapsing (${Math.round(Math.max(0, n.trust))}/100). If it reaches zero, the nation will tear itself apart in civil war.`, "⚠️"); }
  } else if (n.trust > 40) n.trustWarned = false;
  if (n.trust <= 0) civilWar(n);
  // growth: each settlement grows toward its limit. Full villages stop growing.
  const sr = clamp(E.surplus / Math.max(1, E.need), -1, 1);
  const sets = setsOf(n);
  for (const s of sets) {
    const cap = capOf(s, n), T = TIERS[s.t];
    if (sr >= 0) {
      const free = Math.max(0, 1 - s.pop / cap);
      const r = T.r + (n.laws.focus === "grow" ? .05 : 0) + .05 * Math.min(1, sr) + fb(n, "grow") + (cul(n).grow || 0) + subGrowOf(n) + .006 * bud(n).health;
      const g = (s.pop * r + T.flat) * free * TD;
      s.pop += g; s.g = g;
    } else { s.pop *= Math.pow(1 - .05 * Math.min(1, -sr * 3), TD); s.g = 0; }
    if (s.pop > cap) s.pop -= (s.pop - cap) * pr(.25);
    if (s.t === 0 && s.pop > VILLAGE_CAP) s.pop = VILLAGE_CAP;
    s.pop = Math.max(2, s.pop);
  }
  // emigration: full settlements send people outward to form rural villages on their own
  const born = [];
  let crowdedNow = 0;
  for (const s of sets) {
    const cap = capOf(s, n), T = TIERS[s.t];
    // villages send people out when full; towns and cities start pushing people to the countryside as they get crowded
    const start = s.t === 0 ? .94 : .6, push = s.t === 0 ? 1 : clamp((s.pop / cap - start) / (.97 - start), 0, 1);
    if (sr < 0 || (n.laws.migr || "free") === "restrict") { s.crowd = false; continue; }
    if (s.t >= 1 && s.g > 0) { const out = s.g * .3; s.pop -= out; s.ov = (s.ov || 0) + out; } // part of every town's growth heads for the countryside
    if (s.pop >= cap * start) s.ov = (s.ov || 0) + s.pop * T.emi * push * (n.laws.focus === "grow" ? 1.3 : 1) * TD;
    else if (s.t === 0) { s.crowd = false; continue; }
    if (s.ov < T.need) continue;
    const ri = bestVillageSpot(n, s.r);
    if (ri < 0) { s.ov = T.need; if (!s.crowd) crowdedNow++; s.crowd = true; continue; }
    s.crowd = false;
    const nv = addSettlement(n.id, ri, Math.min(s.ov, 25), s);
    if (!nv) { s.ov = T.need; if (!s.crowd) crowdedNow++; s.crowd = true; continue; }
    born.push([nv, s]); s.ov = 0;
  }
  if (!n.ai) {
    if (born.length === 1) log(`People from ${born[0][1].name} moved out and formed the village of ${born[0][0].name} in ${W.regions[born[0][0].r].n}.`, "🛖");
    else if (born.length > 1) log(`${born.length} new villages formed as people moved out of full settlements: ${born.slice(0, 4).map(b => b[0].name).join(", ")}${born.length > 4 ? "…" : ""}.`, "🛖");
    if (crowdedNow) log(`${crowdedNow === 1 ? "A settlement is" : crowdedNow + " settlements are"} overcrowded with no room nearby to expand. Claim more land, or research Sailing to reach across the sea.`, "😣");
    if (sr < 0 && !n.famine) log("Famine! There isn't enough food. Settle fertile land or build Farms.", "🥀");
  }
  n.famine = sr < 0;
  // construction
  for (const ri of pres(n)) { const k = consOf(n.id, ri); if (k) { B(n.id, ri)[k] = 1; setCons(n.id, ri, null); if (!n.ai) log(`${BK[k].name} completed in ${W.regions[ri].n}.`, BK[k].icon); } }
  // research
  n.sciPts += E.sci * TD;
  let guard = 0;
  while (guard++ < 5) {
    let it = resItem(n, n.research);
    if (!it || it.done || ((it.mastery || it.develop) && n.autoResearch && !n.resManual && chooseTech(n)) || (it.mastery && n.autoResearch && !n.resManual && chooseDevelop(n))) { n.research = n.autoResearch || n.ai ? chooseResearch(n) : null; it = resItem(n, n.research); }
    if (!it) break;
    if (n.sciPts < it.cost) break;
    n.sciPts -= it.cost;
    if (it.develop) {
      const f = it.f; n.fields[f.k] = lv(n, f.k) + 1; G.sv++;
      if (!n.ai) log(`Scholars developed ${f.name} to level ${lv(n, f.k)}.`, f.chain.icon);
      if (!devOk(n, f)) { n.resManual = false; n.research = n.autoResearch || n.ai ? chooseResearch(n) : null; }
      continue;
    }
    if (it.mastery) {
      const f = it.f; n.fields[f.k] = lv(n, f.k) + 1; G.sv++;
      if (!n.ai && (lv(n, f.k) % 5 === 0 || lv(n, f.k) === 6)) log(`${f.name} mastery reached level ${lv(n, f.k)}.`, f.chain.icon);
      if (!masteryOk(n, f)) { n.resManual = false; n.research = n.autoResearch || n.ai ? chooseResearch(n) : null; }
      continue;
    }
    const t = it.t; n.techs.push(t.id);
    if (!n.ai) log(`Discovered ${t.name}! ${t.desc}`, "💡");
    if (t.id === "mars") victory(n, "science");
    n.research = n.autoResearch || n.ai ? chooseResearch(n) : null;
    const ne = n.era;
    if (ne < 7 && eraTechs(ne).filter(x => has(n, x.id)).length >= eraNeed(ne) && !fieldsMissing(n).length) {
      n.era++; if (/^[md]:/.test(String(n.research || ""))) { n.research = null; n.resManual = false; }
      if (!n.ai) log(`Your people enter the ${ERAS[n.era]}!`, "🌅");
      else if (dip(n.id, G.player).met) log(`The ${nm(n)} entered the ${ERAS[n.era]}.`, "🌅", -1);
    }
  }
  if (n.era < 7 && eraTechs(n.era).filter(x => has(n, x.id)).length >= eraNeed(n.era) && !fieldsMissing(n).length) {
    n.era++; if (/^[md]:/.test(String(n.research || ""))) { n.research = null; n.resManual = false; }
    if (!n.ai) log(`Your people enter the ${ERAS[n.era]}!`, "🌅");
    else if (dip(n.id, G.player).met) log(`The ${nm(n)} entered the ${ERAS[n.era]}.`, "🌅", -1);
  }
  // politics
  n.facMods.forEach(m => m.t -= TD); n.facMods = n.facMods.filter(m => m.t > 0);
  const tg = facTargets(n, E), fk = pr(.35);
  for (const k in FACTIONS) { const t = tg[k] ? tg[k].v : 50; n.fac[k] += (t - n.fac[k]) * fk; }
  n.stab = stabilityOf(n, n.fac);
  const wars = G.nations.filter(o => atWar(n.id, o.id)).length;
  n.ww = wars ? n.ww + 1.5 * (GOVS[n.gov].ww || 1) * wars * TD : Math.max(0, n.ww - 3 * TD);
  n.ww = Math.min(n.ww, 35);
  n.anarchy = dec(n.anarchy); n.govCool = dec(n.govCool); n.opposition = dec(n.opposition); n.culCool = dec(n.culCool); n.culShift = dec(n.culShift);
  if (n.cmd === "supreme") {
    // succession is decided by the army, not by you: any general (good or bad) or an unproven officer may rise
    const successor = () => (n.generals || []).length && rnd() < .6 ? pick(n.generals) : null;
    if (!n.commander) appointCommander(n, successor());
    else if ((n.commander.left -= TD) <= 0) { const old = n.commander, g = successor(), c = appointCommander(n, g);
      if (!n.ai) log(`Supreme Commander ${old.name} has stepped down. ${g ? `The army raised General ${c.name} as successor: ${"★".repeat(c.skill)}${"☆".repeat(5 - c.skill)} (${CMDR_EFF[c.skill - 1] >= 0 ? "+" : ""}${Math.round(CMDR_EFF[c.skill - 1] * 100)}% army).` : `The army raised ${c.name}, an unproven officer, as successor: ${"★".repeat(c.skill)}${"☆".repeat(5 - c.skill)} (${CMDR_EFF[c.skill - 1] >= 0 ? "+" : ""}${Math.round(CMDR_EFF[c.skill - 1] * 100)}% army).`}`, "🎖️"); }
  }
  if (!n.generals) n.generals = [];
  n.generals.forEach(g => g.left -= TD);
  for (const g of n.generals.filter(g => g.left <= 0)) if (!n.ai) log(`General ${g.name} has retired.`, "🎖️");
  n.generals = n.generals.filter(g => g.left > 0);
  n.scientists = (n.scientists || 0) * Math.pow(.98, TD) + sciGradRate(n) * TD;
  n.officers = (n.officers || 0) * Math.pow(.97, TD) + offGradRate(n) * TD;
  { const ma = setsOf(n).filter(x => x.mil), op = (n.officers || 0) / 10;
    const tq = travelQ(n);
    for (const a of ma) if (n.generals.length < ma.length * 2 && rnd() < pr(.06 * (1 + .6 * tq))) {
      const skill = clamp(Math.round(1 + rnd() * 2 + op * .25 + rnd() + tq * rnd()), 1, 5), g = { name: genName(8), skill, left: 25 + Math.floor(rnd() * 25), from: a.name };
      n.generals.push(g); if (!n.ai) log(`General ${g.name} (${"★".repeat(skill)}) graduated from the military academy in ${a.name}.`, "🎖️");
    } }
  n.warmonger = Math.max(0, n.warmonger - TD);
  n.used = Math.max(0, (n.used || 0) - n.army * TD); // regiments rest and regroup after fighting
  // unrest & revolts
  for (const s of setsOf(n)) {
    const foreign = s.c !== n.id && s.c >= 0 ? (n.laws.rel === "tol" ? 15 : 25) : 0;
    const b = B(n.id, s.r); let roads = 0; for (const k in b) roads += BK[k].unrest || 0;
    const target = Math.max(0, (50 - n.stab) * 1.1) + foreign + s.q - roads - 3 * welfareLv(n) - (s.id === n.cap ? 15 : 0) - (G.regions[s.r].ctrl === n.id ? 5 : 0);
    s.u += (clamp(target, 0, 100) - s.u) * pr(.3);
    if (s.q > 0) s.q = Math.max(0, s.q - 3 * TD);
    if (s.c !== n.id && s.c >= 0 && s.u < 25 && rnd() < pr(.06)) { s.c = n.id; if (!n.ai) log(`${s.name} now considers itself part of your nation.`, "🫶"); }
    if (s.u > 65 && s.id !== n.cap && setsOf(n).length > 1 && rnd() < pr((s.u - 60) / 120)) revolt(n, s);
  }
  if (n.stab < 18 && !(n.anarchy > 0) && rnd() < pr(.12)) upheaval(n);
  const el = GOVS[n.gov].elect;
  if (el && G.tt - n.lastElect >= el) {
    n.lastElect = G.tt;
    const win = rnd() * 100 < n.stab + 15;
    if (!n.ai) {
      if (win) { log("You won the election! The people renewed your mandate.", "🗳️"); n.facMods.push({ k: "commoners", v: 8, why: "Election mandate", t: 4 }); }
      else { n.opposition = 3; log(`You lost the election. The opposition controls the legislature for ${durTxt(3)}: laws are locked and you can't declare war.`, "🗳️"); n.facMods.push({ k: "commoners", v: 6, why: "New government", t: 3 }); }
    }
  }
}
function chooseResearch(n) { return chooseTech(n) || chooseDevelop(n) || chooseMastery(n); }
// with every technology known, study the fields still short for the next age
function chooseDevelop(n) {
  const opts = [];
  for (const c of fieldsMissing(n)) for (const [k] of c.f) { const f = FIELDS[k]; if (devOk(n, f)) opts.push(f); }
  if (!opts.length) return null;
  return "d:" + opts.sort((a, b) => devSciCost(n, a) - devSciCost(n, b))[0].k;
}
// when there is no technology left to research, put science into mastering your fields
function chooseMastery(n) {
  const opts = Object.values(FIELDS).filter(f => masteryOk(n, f));
  if (!opts.length) return null;
  const sc = f => masteryCost(n, f) / (1 + emph(n, f.chain.k).cities * .2 + (emph(n, f.chain.k).cap ? 1 : 0));
  return "m:" + opts.sort((a, b) => sc(a) - sc(b))[0].k;
}
function chooseTech(n) {
  const av = TECHS.filter(t => !has(n, t.id) && t.era <= n.era + techAhead(n, t) && (t.id !== "mars" || lv(n, "marsmission") >= 3));
  if (!av.length) return null;
  if (!has(n, "agriculture")) return "agriculture";
  const milT = ["bronze", "iron", "mathematics", "chivalry", "gunpowder", "rifling", "combustion", "fission", "flight"];
  const pref = { aggressive: ["bronze", "iron", "mathematics", "chivalry", "gunpowder", "rifling", "masonry", "feudalism"], builder: ["pottery", "masonry", "construction", "guilds", "medicine", "steam"], trader: ["currency", "sailing", "wheel", "banking", "navigation", "globalization"], zealot: ["mysticism", "theology", "philosophy", "monarchy"] }[n.pers] || [];
  const sc = t => t.cost - (pref.includes(t.id) ? 15 * (t.era + 1) : 0) - (n.ai && milT.includes(t.id) ? 10 * (t.era + 1) : 0) - (t.id === "masonry" ? 20 : 0) - (t.id === "mars" ? 1e5 : 0);
  av.sort((a, b) => sc(a) - sc(b));
  return av[0].id;
}
function revolt(n, s) {
  const back = G.nations[s.c];
  const ri = s.r;
  if (back && back.alive && back.id !== n.id && rnd() < .7) {
    s.o = back.id; s.u = 20; s.q = 0; G.sv++;
    if (n.id === G.player || back.id === G.player) log(`${s.name} rose up and rejoined the ${nm(back)}!`, "✊");
  } else {
    const used = new Set(G.nations.map(x => x.color));
    const col = COLORS.find(c => !used.has(c)) || `hsl(${Math.floor(rnd() * 360)},65%,55%)`;
    const rb = newNation(s.name, col, -1, true, pick(Object.keys(PERS)));
    s.o = rb.id; s.c = rb.id; s.u = 0; s.q = 0; rb.cap = s.id; G.sv++;
    rb.gold = 15 * (n.era + 1); rb.techs = n.techs.slice(); rb.era = n.era; rb.army = Math.max(1, Math.round(n.army * .15)); rb.gov = n.gov === "tribe" ? "tribe" : "chiefdom"; rb.research = chooseResearch(rb);
    n.army = Math.max(0, n.army - Math.round(n.army * .1));
    const d = dip(n.id, rb.id); d.met = true; d.war = true; d.rel = -60; d.wt = G.tt;
    if (n.id === G.player) log(`${s.name} revolted and declared independence!`, "🔥");
    else if (dip(n.id, G.player).met) log(`${s.name} broke away from the ${nm(n)}.`, "🔥", -1);
  }
  for (const k in B(n.id, ri)) if (!setsOf(n).some(x => x.r === ri)) { delete G.bld[ri][n.id]; break; }
  recomputeControl(ri);
}
// what moves public trust each turn (the revolt meter). Welfare keeps people loyal through hard times
function trustFactors(n, E) {
  const f = [], B0 = bud(n);
  if (n.gold < 0) { const ratio = -n.gold / Math.max(1, E.gross); f.push(["Debt", -(1.5 + Math.min(8, ratio * 1.2))]); if (E.goldNet < 0) f.push(["Spending more than you earn", -1.5]); }
  else f.push(["Treasury in the black", 2]);
  if (B0.inc) f.push([WELFARE.inc.lv[B0.inc], .75 * B0.inc]);
  if (B0.health) f.push([WELFARE.health.lv[B0.health], .75 * B0.health]);
  if (B0.sub) f.push(["Subsidies", .15 * Math.sqrt(B0.sub)]);
  for (const k in WELFARE) { const g = welfareGap(n, k); if (g > .05) f.push([`People demand more ${WELFARE[k].name.toLowerCase()}`, -1.5 * g]); }
  return f;
}
// ---- civil war: the nation splits; the far half rises up with a clean treasury ----
function civilWar(n) {
  const sets = setsOf(n), cap = capSet(n) || sets[0];
  if (sets.length < 2 || !cap) { n.trust = 25; return; }
  const far = sets.filter(x => x.id !== cap.id).sort((a, b) => Math.hypot(b.x - cap.x, b.y - cap.y) - Math.hypot(a.x - cap.x, a.y - cap.y));
  const rebelsS = far.slice(0, Math.max(1, Math.round(sets.length * .45)));
  const used = new Set(G.nations.map(x => x.color));
  const col = COLORS.find(c => !used.has(c)) || `hsl(${Math.floor(rnd() * 360)},65%,52%)`;
  const rb = newNation(genName(), col, -1, true, pick(Object.keys(PERS)), n.cul);
  const share = rebelsS.reduce((a, x) => a + x.pop, 0) / Math.max(1, sets.reduce((a, x) => a + x.pop, 0));
  rb.techs = n.techs.slice(); rb.era = n.era; rb.fields = { ...(n.fields || {}) }; rb.laws = { ...n.laws }; rb.budget = { ...bud(n) }; rb.research = chooseResearch(rb);
  const govs = Object.keys(GOVS).filter(g => g !== n.gov && (!GOVS[g].tech || has(n, GOVS[g].tech)));
  rb.gov = govs.length ? pick(govs) : n.gov; rb.govCool = 8;
  rb.army = Math.round(n.army * share); n.army -= rb.army;
  rb.scientists = (n.scientists || 0) * share; n.scientists = (n.scientists || 0) - rb.scientists;
  rb.officers = (n.officers || 0) * share; n.officers = (n.officers || 0) - rb.officers;
  rb.generals = (n.generals || []).filter(() => rnd() < share); n.generals = (n.generals || []).filter(g => !rb.generals.includes(g));
  rb.gold = 0; rb.mat = n.mat * share; n.mat -= rb.mat; rb.trust = 70; rb.stab = 55; rb.cmd = n.cmd === "supreme" ? "chiefs" : n.cmd;
  for (const x of rebelsS) { x.o = rb.id; x.focus = null; x.u = 20; }
  rb.cap = rebelsS.slice().sort((a, b) => b.pop - a.pop)[0].id;
  n.trust = 45; n.trustWarned = false;
  const d = dip(n.id, rb.id); d.met = true; d.war = true; d.wt = G.tt; d.rel = -80; d.ws = 0;
  for (const o of G.nations) if (o.alive && o.id !== n.id && o.id !== rb.id && dip(o.id, n.id).met) { const d2 = dip(o.id, rb.id); d2.met = true; d2.rel = dip(o.id, n.id).rel; d2.trade = false; }
  for (const ri of new Set(rebelsS.map(x => x.r))) recomputeControl(ri);
  G.sv++; reachCache.clear();
  if (n.id === G.player) { G.pendingCivil = { a: n.id, b: rb.id }; log("CIVIL WAR! The people have lost all trust in the treasury, and the nation has split in two.", "🔥"); }
  else if (dip(n.id, G.player).met) log(`Civil war has split the ${nm(n)}: the ${nm(rb)} has risen in revolt.`, "🔥", -1);
  return rb;
}
function upheaval(n) {
  const unlocked = Object.keys(GOVS).filter(g => !GOVS[g].tech || has(n, GOVS[g].tech));
  let to, why;
  if (n.fac.warriors >= n.fac.commoners) { to = ["party", "empire", "monarchy", "chiefdom"].find(g => unlocked.includes(g) && g !== n.gov); why = "A military coup"; }
  if (!to) { to = ["democracy", "republic", "chiefdom", "tribe"].find(g => unlocked.includes(g) && g !== n.gov); why = "A popular revolution"; }
  if (!to) return;
  const old = GOVS[n.gov].name; n.gov = to; n.anarchy = 2; n.govCool = 8; n.army = Math.round(n.army * .75);
  for (const k in n.fac) n.fac[k] = 50;
  if (n.id === G.player || dip(n.id, G.player).met) log(`${why} overthrew the ${old} of ${n.name}. It is now a ${GOVS[to].name}.`, "💥", n.id === G.player ? null : -1);
}

// ================= WAR =================
function defenseOf(s) {
  const d = G.nations[s.o], R = W.regions[s.r], b = B(d.id, s.r);
  const units = d.army * .8 / Math.sqrt(Math.max(1, sizeOf(d) * 2)) + .5;
  const m = TIERS[s.t].def + fb(d, "def") + (R.t === "mountain" ? .3 : 0) + (R.t === "forest" || R.t === "jungle" ? .1 : 0) + (s.id === d.cap ? .3 : 0);
  return { units, power: (units * unitPower(d) * m + U(s.pop) * .3 * ERA_POW[d.era] * m) * defMult(d) };
}
function worldEra() { const al = G.nations.filter(n => n.alive); return Math.round(al.reduce((a, n) => a + n.era, 0) / al.length); }
function winChance(n, s, units) {
  const att = units * unitPower(n) * attackMult(n), def = defenseOf(s).power; let w = 0;
  for (let i = 0; i < 300; i++) if (att * (.75 + rnd() * .5) > def * (.8 + rnd() * .4)) w++;
  return w / 300;
}
function attack(n, s, units) {
  const dn = G.nations[s.o], D = defenseOf(s), ri = s.r;
  const att = units * unitPower(n) * attackMult(n) * (.75 + rnd() * .5), def = D.power * (.8 + rnd() * .4);
  const win = att > def;
  const aLoss = Math.min(units, Math.round(units * clamp(win ? def / att * .45 : .35 + def / att * .2, .05, .9)));
  n.army -= aLoss; n.used += units;
  const dLoss = Math.min(dn.army, Math.round(D.units * clamp(att / def * .5, .1, 1) + (win ? .5 : 0))); dn.army -= dLoss;
  const res = { win, aLoss, dLoss, name: s.name, def: dn };
  if (win && (s.hp == null ? HP[s.t] : s.hp) > 1) {
    // push their border back; the settlement holds out a little longer
    s.hp = (s.hp == null ? HP[s.t] : s.hp) - 1; s.hit = G.tt; s.pop *= .92; s.u = Math.min(100, s.u + 15);
    chip(n.id, s);
    addWs(n.id, dn.id, 3); dn.ww += 1;
    res.push = true; res.left = s.hp;
  } else if (win) {
    addWs(n.id, dn.id, s.id === dn.cap ? 15 : 5 + s.t * 3);
    chip(n.id, s);
    s.o = n.id; s.focus = null; s.pop *= .85; s.u = 35; s.q = 30; s.hp = HP[s.t]; s.rad = 1; s.hit = G.tt; G.sv++;
    dn.ww += 3;
    if (!setsOf(dn).some(x => x.r === ri)) { if (G.bld[ri]) delete G.bld[ri][dn.id]; setCons(dn.id, ri, null); }
    if (s.id === dn.cap) { const rest = setsOf(dn); if (rest.length) { dn.cap = rest.sort((a, b) => b.pop - a.pop)[0].id; dn.facMods.push({ k: "commoners", v: -15, why: "Capital lost", t: 5 }); } }
    recomputeControl(ri);
    if (!setsOf(dn).length) eliminate(dn, n);
  } else addWs(n.id, dn.id, -3);
  const involved = n.id === G.player || dn.id === G.player;
  if (res.push && involved) log(`${n.id === G.player ? "Your army" : "The " + nm(n)} pushed back the border around ${s.name}. ${res.left} more victor${res.left === 1 ? "y" : "ies"} to take it.`, n.id === G.player ? "⚔️" : "🔥");
  else if (win && !res.push && (involved || dip(dn.id, G.player).met)) log(`${n.id === G.player ? "Your army" : "The " + nm(n)} captured the ${TIERS[s.t].name.toLowerCase()} of ${s.name} in ${W.regions[ri].n}${dn.id === G.player ? " from you" : n.id === G.player ? "" : " from the " + nm(dn)}!`, n.id === G.player ? "🚩" : dn.id === G.player ? "🔥" : "⚔️", involved ? null : -1);
  else if (!win && involved) log(`${n.id === G.player ? "Your attack on" : "The " + nm(n) + " attacked"} ${s.name}, but ${n.id === G.player ? "was" : "they were"} driven back. (${aLoss} attacker${aLoss === 1 ? "" : "s"} lost)`, "🛡️");
  return res;
}
function eliminate(dn, by) {
  dn.alive = false; dn.army = 0;
  G.sv++;
  for (const o of G.nations) { const d = dip(dn.id, o.id); d.war = false; d.trade = false; d.ally = false; }
  if (dn.id === G.player) { log("Your last settlement has fallen.", "☠️"); defeat(); }
  else if (dip(dn.id, G.player).met) log(`The ${nm(dn)} has been wiped from the map by the ${nm(by)}.`, "☠️", -1);
}
function declareWar(a, b) {
  const d = dip(a.id, b.id); d.war = true; d.trade = false; d.ally = false; d.ws = 0; d.wt = G.tt;
  if (d.rel > -60) a.warmonger += 12;
  d.rel = Math.min(d.rel, -50);
  for (const o of G.nations) if (o.alive && o.id !== a.id && o.id !== b.id && dip(o.id, a.id).met) dip(o.id, a.id).rel -= dip(o.id, b.id).rel < -40 ? 2 : 10;
  if (a.id === G.player || b.id === G.player) log(a.id === G.player ? `You declared war on the ${nm(b)}!` : `The ${nm(a)} declared war on you!`, "⚔️");
  else if (dip(a.id, G.player).met || dip(b.id, G.player).met) log(`The ${nm(a)} declared war on the ${nm(b)}.`, "⚔️", -1);
  for (const o of G.nations) {
    if (!o.alive || o.id === a.id || o.id === b.id) continue;
    if (dip(o.id, b.id).ally && !dip(o.id, a.id).war && !dip(o.id, a.id).ally) {
      if (o.id === G.player) log(`Your ally the ${nm(b)} was attacked by the ${nm(a)}. They expect your help (check World).`, "📯");
      else if (rnd() < .8) { const d2 = dip(o.id, a.id); d2.war = true; d2.trade = false; d2.ws = 0; d2.wt = G.tt; d2.rel = Math.min(d2.rel, -40);
        if (a.id === G.player || dip(o.id, G.player).met) log(`The ${nm(o)} joined the war to defend their ally.`, "🛡️", a.id === G.player ? null : -1); }
    }
  }
}
function makePeace(a, b, tribute = 0, payer = null) {
  const d = dip(a.id, b.id); d.war = false; d.ws = 0; d.truce = 10; d.rel = Math.max(d.rel, -30);
  if (payer && tribute) { payer.gold -= tribute; (payer === a ? b : a).gold += tribute; }
  if (a.id === G.player || b.id === G.player) log(`Peace signed with the ${nm(a.id === G.player ? b : a)}${tribute ? ` (${fmt(tribute)} gold paid by ${payer.id === G.player ? "you" : "them"})` : ""}.`, "🕊️");
  else if (dip(a.id, G.player).met) log(`The ${nm(a)} and the ${nm(b)} made peace.`, "🕊️", -1);
}

// ================= AI =================
function bestVillageSpot(n, fromRi) {
  let best = -1, bs = -1e9;
  const cand = new Set([fromRi, ...W.regions[fromRi].adj]);
  if (has(n, "sailing")) for (const j of W.regions[fromRi].sea) cand.add(j);
  const mine = pres(n);
  for (const ri of cand) {
    const r = G.regions[ri]; if (r.ctrl >= 0 && r.ctrl !== n.id) continue;
    const here = setsIn(ri), S = W.regions[ri];
    if (here.length >= S.slots) continue;
    const myHere = here.filter(s => s.o === n.id).length, other = here.length - myHere;
    // fill a territory toward claiming it, prefer fertile land, avoid crowded contested land
    const sc = (myHere > 0 ? 6 + Math.min(myHere, 4) : 0) + TER[S.t].food * 4 - other * 2 + (S.r ? 1 : 0) + (mine.has(ri) ? 0 : 1.5 * rnd()) + rnd();
    if (sc > bs) { bs = sc; best = ri; }
  }
  return best;
}
function aiTurn(n) {
  if (!n.alive) return;
  const E = econ(n), sets = setsOf(n);
  const wars = G.nations.filter(o => atWar(n.id, o.id));
  // laws & government
  if (n.gold < 0 || E.goldNet < -1) n.laws.tax = "high"; else if (n.stab < 35) n.laws.tax = "low"; else n.laws.tax = "normal";
  if (has(n, "currency") && n.pers === "trader") n.laws.trade = "free";
  if (has(n, "steam")) n.laws.labor = n.stab < 45 ? "rights" : "unreg";
  if (has(n, "printing") && !n.laws.press) n.laws.press = "cens";
  if (n.era === 0 && sets.length < 4) n.laws.focus = "grow";
  else if (n.pers === "aggressive" && has(n, "bronze")) n.laws.focus = "mil";
  else if (n.pers === "builder" && has(n, "guilds")) n.laws.focus = "ind";
  else if (n.pers === "trader" && has(n, "currency")) n.laws.focus = "com";
  else if (n.laws.focus === "grow" && n.era > 0) n.laws.focus = "bal";
  { const B0 = bud(n), g = Math.max(1, E.gross), want = { aggressive: 1.35, zealot: 1.2, builder: 1.05, trader: 1 }[n.pers] || 1.1;
    const ratioA = ({ aggressive: 1.3, builder: .7, trader: .6, zealot: .9 }[n.pers] || .8) * (wars.length ? 1.6 : 1), wantA = Math.min(maxArmy(n), Math.ceil(sizeOf(n) * ratioA + 1));
    B0.qual = n.pers === "aggressive" ? 20 : n.cul === "martial" ? 30 : 15;
    B0.mil = clamp(Math.ceil(wantA * unitUpkeep(n) * (want > 1.1 ? 1.1 : 1) / (g * (1 - B0.qual / 100)) * 100), 2, 80); B0.res = RP_PCT[n.laws.rp] || 15;
    B0.prod = n.pers === "builder" ? 8 : 4; B0.travel = n.pers === "trader" ? 6 : 2; B0.sub = 3; B0.prop = 0;
    const wl = n.era >= 5 ? 2 : n.era >= 3 ? 1 : 0; B0.inc = Math.min(wl, welfareMax(n, "inc")); B0.health = Math.min(wl + (n.era >= 6 ? 1 : 0), welfareMax(n, "health"));
    if (n.gold < 0 && E.goldNet < 0) { B0.prod = B0.travel = B0.sub = 0; B0.inc = Math.max(0, B0.inc - 1); B0.health = Math.max(0, B0.health - 1); B0.res = Math.max(3, B0.res - 7); }
    { const gap = welfareGap(n, "inc") + welfareGap(n, "health"); if (gap > .1) B0.prop = clamp(Math.round(gap * (n.pers === "zealot" || n.pers === "aggressive" ? 8 : 4) * (1 + eduOf(n) / 25)), 0, 40); } }
  if (!(n.govCool > 0) && n.stab > 40) {
    const pref = { aggressive: ["party", "empire", "monarchy", "chiefdom"], builder: ["technocracy", "democracy", "empire", "monarchy", "chiefdom"], trader: ["democracy", "republic", "monarchy", "chiefdom"], zealot: ["theocracy", "monarchy", "chiefdom"] }[n.pers];
    const g = pref.find(g => has(n, GOVS[g].tech));
    if (g && g !== n.gov) { n.gov = g; n.anarchy = 1; n.govCool = 15; }
  }
  // grow: upgrades first, then new villages
  for (const s of sets.filter(s => s.t === 1)) if (cityCheck(n, s).ok) upgrade(n, s);
  const byRegion = {};
  for (const s of sets) if (s.t === 0) (byRegion[s.r] || (byRegion[s.r] = [])).push(s);
  for (const ri in byRegion) { const v = byRegion[ri].sort((a, b) => b.pop - a.pop)[0]; if (v && townCheck(n, v).ok) upgrade(n, v); }
  let founds = 0; const maxF = 1 + Math.floor(sets.length / 10);
  const underCap = sizeOf(n) < adminCap(n) + 1;
  const donors = sets.filter(s => s.pop >= MOVERS + 12 && (s.t > 0 || s.pop >= VILLAGE_CAP - 3)).sort((a, b) => b.pop - a.pop);
  const saving = underCap && donors.length > 0 && wars.length === 0;
  for (const d of donors) {
    if (founds >= maxF || !underCap || rnd() > pr(.35)) break;
    const ri = bestVillageSpot(n, d.r); if (ri < 0) continue;
    const c = villageCost(n); if (!afford(n, c)) break;
    if (!near(n, d.r, ri)) continue;
    foundVillage(n, ri, d); founds++;
  }
  // military
  const ratio = ({ aggressive: 1.3, builder: .7, trader: .6, zealot: .9 }[n.pers]) * (wars.length ? 1.6 : 1);
  const want = Math.min(maxArmy(n), Math.ceil(sizeOf(n) * ratio + 1));
  const uc = unitCost(n);
  void want; void uc; // regiments now come from the military budget (set above)
  // academies and command (close the least useful ones when money runs short)
  if (E.goldNet < 0 && n.gold < 50 * Math.pow(1.5, n.era)) { const x = setsOf(n).filter(x => x.acad || x.mil).sort((a, b) => a.pop - b.pop)[0];
    if (x) { if (x.acad && !(n.cul === "scholarly" && !x.mil)) x.acad = 0; else x.mil = false; } }
  if (!n.cmd || n.cmd === "chiefs") { const want = (n.cul === "martial" || n.pers === "aggressive") ? "supreme" : "council"; if (!CMDS[want].tech || has(n, CMDS[want].tech)) setCommand(n, want, bestGeneral(n)); }
  for (const x of setsOf(n)) {
    if (!canAcad(n, x)) continue;
    if (!x.mil && has(n, "bronze") && milAcadCount(n) < milAcadLimit(n) && (n.cul === "martial" || n.pers === "aggressive" || rnd() < pr(.25))) { const c = milAcadCost(n); if (n.gold > c.g * 2 && n.mat > c.m && E.goldNet > 4 * Math.pow(1.4, n.era)) { n.gold -= c.g; n.mat -= c.m; x.mil = true; } }
    if (has(n, "writing") && (x.acad || 0) < 1 && rnd() < pr(n.cul === "scholarly" ? .6 : .2)) { const c = acadCost(n, 1); if (n.gold > c.g * 2 && n.mat > c.m && E.goldNet > 2 * Math.pow(1.4, n.era)) { n.gold -= c.g; n.mat -= c.m; x.acad = 1; } }
    else if (has(n, "printing") && x.acad === 1 && rnd() < pr(n.cul === "scholarly" ? .4 : .1)) { const c = acadCost(n, 2); if (n.gold > c.g * 2 && n.mat > c.m) { n.gold -= c.g; n.mat -= c.m; x.acad = 2; } }
  }
  // develop fields
  const prefC = { aggressive: ["mil", "land", "air", "navy", "def", "ind"], builder: ["ind", "food", "energy", "health"], trader: ["trade", "sci", "food", "navy"], zealot: ["faith", "def", "food"] }[n.pers] || [];
  { let i = 0; for (const s of setsOf(n)) if (canEmph(n, s) && !s.focus) { s.focus = s.id === n.cap ? (n.pers === "aggressive" ? "mil" : "sci") : prefC[i++ % prefC.length] || "ind"; G.fv = (G.fv || 0) + 1; } }
  for (const c of fieldsMissing(n)) { const f = c.f.map(([k]) => FIELDS[k]).filter(f => fieldOpen(n, f) && lv(n, f.k) < FIELD_MAX).sort((a, b) => fieldCost(n, a).g - fieldCost(n, b).g)[0]; if (!f) continue; const cst = fieldCost(n, f); if (n.gold > cst.g + 3 && n.mat > cst.m) expandField(n, f); }
  let builds = 0;
  for (let tries = 0; tries < 3 && builds < 1 + Math.floor(n.era / 2); tries++) {
    const opts = Object.values(FIELDS).filter(f => fieldOpen(n, f) && lv(n, f.k) < FIELD_MAX);
    if (!opts.length) break;
    const score = f => { const c = fieldCost(n, f); return c.g * (prefC.includes(f.chain.k) ? .6 : 1) * (f.chain.k === "space" ? .3 : 1) * (1 + rnd() * .3); };
    const f = opts.sort((a, b) => score(a) - score(b))[0], c = fieldCost(n, f), reserve = saving ? villageCost(n).g + 5 : 5;
    if (n.gold > c.g + reserve && n.mat > c.m && E.goldNet - fieldUp(f) > -1) { expandField(n, f); builds++; } else break;
  }
  // diplomacy
  for (const o of G.nations) {
    if (!o.alive || o.id === n.id) continue;
    const d = dip(n.id, o.id); if (!d.met) continue;
    if (o.ai && o.id > n.id) {
      if (!d.war && !d.trade && d.rel > 5 && rnd() < pr(.15) && (n.ai || aiAccept(o, "trade", n))) d.trade = true;
      if (!d.war && !d.ally && d.rel > 60 && rnd() < pr(.08) && (n.ai || aiAccept(o, "ally", n))) d.ally = true;
    }
    if (d.war) {
      const myScore = wscore(n.id, o.id), dur = G.tt - d.wt;
      const losing = myScore < -12 || power(n) < power(o) * .5;
      const tired = dur > 10 && rnd() < pr(.15);
      if (o.ai && ((losing && rnd() < pr(.9)) || tired || (myScore > 25 && rnd() < pr(.3)))) makePeace(n, o, myScore < -12 ? Math.round(Math.max(0, Math.min(n.gold * .3, 30 * (n.era + 1)))) : 0, myScore < -12 ? n : null);
      else if (!o.ai && (losing || tired) && !G.pendingPeace && rnd() < pr(.5)) {
        const trib = myScore < -12 ? Math.round(Math.max(0, Math.min(n.gold * .3, 30 * (n.era + 1)))) : 0;
        G.pendingPeace = { from: n.id, tribute: trib, payer: trib ? n.id : null };
      } else if (!o.ai && myScore > 18 && dur > 4 && !G.pendingPeace && rnd() < pr(.25)) {
        G.pendingPeace = { from: n.id, tribute: Math.round(Math.min(Math.max(0, o.gold) * .4, 40 * (o.era + 1))), payer: o.id };
      }
    } else if (!d.ally && !(d.truce > 0) && wars.length === 0 && !(n.anarchy > 0)) {
      const ratioP = power(n) / Math.max(1, power(o));
      const hostile = d.rel < (n.pers === "aggressive" ? 0 : -25);
      const border = bordersTouch(n, o);
      const chance = { aggressive: .22, zealot: .12, builder: .06, trader: .05 }[n.pers] * (o.id === G.player ? [.5, 1, 1.4][G.diff] : 1);
      const grace = (o.id === G.player && G.tt < [60, 35, 20][G.diff]) || G.tt < 12;
      if (!n.noWar && !grace && hostile && border && ratioP > (n.pers === "aggressive" ? 1.1 : 1.5) && rnd() < pr(chance)) declareWar(n, o);
    }
  }
  // attack
  for (const o of G.nations.filter(o => atWar(n.id, o.id))) {
    if (G.tt - dip(n.id, o.id).wt < TD * .5) continue;
    let tries = o.id === G.player ? (n.era < 4 ? 1 : 2) : 1 + Math.floor(n.era / 3);
    while (tries-- > 0) {
      const avail = n.army - n.used; if (avail < 1) break;
      const targets = setsOf(o).filter(s => touchesSet(n, s));
      if (!targets.length) break;
      let best = null, bp = 0, bu = 0;
      for (const s of targets) { const D = defenseOf(s).power; const need = Math.ceil(D * 1.35 / unitPower(n)); if (need <= avail * .75) { const u = Math.max(1, Math.min(avail, need)); const p = winChance(n, s, u); const val = p + s.t * .08; if (val > bp) { bp = val; best = s; bu = u; } } }
      if (best && bp > (n.pers === "aggressive" ? .5 : .62)) attack(n, best, bu); else break;
    }
  }
}
function driftRelations() {
  const al = G.nations.filter(n => n.alive);
  const T = new Map(al.map(n => [n.id, terrCount(n)]));
  for (const a of al) for (const b of al) {
    if (b.id <= a.id) continue; const d = dip(a.id, b.id); if (!d.met) continue;
    let v = 0;
    if (d.trade) v += 1.5; if (d.ally) v += 2; if (d.war) v -= 2;
    if (a.gov === b.gov) v += .5;
    if (bordersTouch(a, b) && !d.ally) v -= 1.3; // shared borders breed friction
    if (a.pers === "aggressive" || b.pers === "aggressive") v -= .3;
    const big = Math.max(T.get(a.id), T.get(b.id));
    if (big > 8) v -= Math.min(1.5, (big - 8) * .1);
    v -= ((a.id === G.player ? a.warmonger : 0) + (b.id === G.player ? b.warmonger : 0)) * .05;
    v += (rnd() - .5) * 2;
    v -= d.rel * .015;
    d.rel = clamp(d.rel + v * TD, -100, 100);
    d.truce = dec(d.truce);
  }
}

// ================= EVENTS =================
const fx = {
  gold: (n, v) => { n.gold += v; }, mat: (n, v) => { n.mat += v; },
  fac: (n, k, v, t = 6, why = "Recent event") => n.facMods.push({ k, v, why, t }),
  pop: (n, f) => setsOf(n).forEach(s => { s.pop = Math.min(capOf(s, n), s.pop * f); }),
  sci: (n, v) => { n.sciPts += v; },
  army: (n, v) => { n.army = Math.max(0, n.army + v); },
};
const eraScale = n => Math.pow(1.6, n.era) * .6;
const randRegion = n => pick([...pres(n)]);
const EVENTS = [
  { id: "flood", title: "The River Floods", era: [0, 4], icon: "🌊", cond: n => [...pres(n)].some(ri => W.regions[ri].t === "grass"),
    text: () => "Heavy rains swelled the river. Fields are underwater and villages are damaged.",
    ch: [{ t: "Pay to rebuild", d: n => `−${fmt(20 * eraScale(n))} gold`, f: n => fx.gold(n, -20 * eraScale(n)) },
         { t: "Let them manage", d: () => "−8% population, Commoners upset", f: n => { fx.pop(n, .92); fx.fac(n, "commoners", -10, 5, "Ignored the flood"); } }] },
  { id: "migrants", title: "Wandering Families", era: [0, 3], icon: "🧳",
    text: () => "A band of wandering families asks to settle among your people.",
    ch: [{ t: "Welcome them", d: () => "More people in your capital, Elders wary", f: n => { const c = capSet(n); if (c) c.pop = Math.min(capOf(c, n), c.pop * 1.1 + 3); fx.fac(n, "elders", -6, 5, "Foreign newcomers"); } },
         { t: "Turn them away", d: () => "Nothing changes", f: () => {} }] },
  { id: "comet", title: "A Comet Blazes Overhead", era: [0, 4], icon: "☄️",
    text: () => "A burning star crosses the night sky. The priests say it is a sign.",
    ch: [{ t: "Hold a great festival", d: n => `−${fmt(12 * eraScale(n))} gold, Elders and Commoners pleased`, f: n => { fx.gold(n, -12 * eraScale(n)); fx.fac(n, "elders", 12); fx.fac(n, "commoners", 6); } },
         { t: "Study it", d: n => `+${fmt(8 * eraScale(n))} science, Elders offended`, f: n => { fx.sci(n, 8 * eraScale(n)); fx.fac(n, "elders", -8); } }] },
  { id: "harvest", title: "A Bountiful Harvest", era: [0, 7], icon: "🌾",
    text: () => "The granaries are overflowing after a perfect season.",
    ch: [{ t: "Sell the surplus", d: n => `+${fmt(18 * eraScale(n))} gold`, f: n => fx.gold(n, 18 * eraScale(n)) },
         { t: "Hold a feast", d: () => "Commoners very pleased", f: n => fx.fac(n, "commoners", 14, 6, "Harvest feast") }] },
  { id: "plague", title: "Sickness Spreads", era: [0, 5], icon: "🤒",
    text: () => "A deadly sickness is moving through your towns.",
    ch: [{ t: "Quarantine the towns", d: n => `−${fmt(15 * eraScale(n))} gold, Merchants upset`, f: n => { fx.gold(n, -15 * eraScale(n)); fx.fac(n, "merchants", -10); fx.pop(n, .97); } },
         { t: "Pray for deliverance", d: () => "−10% population, Clergy pleased", f: n => { fx.pop(n, .9); fx.fac(n, "elders", 10); } }] },
  { id: "goldfind", title: "Gold in the Hills", era: [0, 6], icon: "🪙",
    text: n => `Herders in ${W.regions[randRegion(n)].n} found shining gold in a stream.`,
    ch: [{ t: "Mine it for the state", d: n => `+${fmt(30 * eraScale(n))} gold, Commoners grumble`, f: n => { fx.gold(n, 30 * eraScale(n)); fx.fac(n, "commoners", -5); } },
         { t: "Let the locals keep it", d: n => `+${fmt(10 * eraScale(n))} gold, Commoners pleased`, f: n => { fx.gold(n, 10 * eraScale(n)); fx.fac(n, "commoners", 8); } }] },
  { id: "raid", title: "Raiders at the Border", era: [0, 4], icon: "🏹",
    text: () => "Raiders from the wilds are burning outlying farms.",
    ch: [{ t: "Pay them off", d: n => `−${fmt(15 * eraScale(n))} gold, Warriors scoff`, f: n => { fx.gold(n, -15 * eraScale(n)); fx.fac(n, "warriors", -8); } },
         { t: "Fight them", d: () => "Lose about 1 regiment, Warriors pleased", f: n => { fx.army(n, rnd() < .6 ? -1 : 0); fx.fac(n, "warriors", 10); } }] },
  { id: "general", title: "An Ambitious General", era: [1, 7], icon: "🎖️",
    text: () => "A victorious general is becoming very popular. Some whisper he wants power.",
    ch: [{ t: "Promote him", d: () => "Military very pleased, Nobles nervous", f: n => { fx.fac(n, "warriors", 15); fx.fac(n, "nobles", -8); } },
         { t: "Retire him quietly", d: () => "Military angry", f: n => fx.fac(n, "warriors", -14) }] },
  { id: "caravan", title: "A Rich Caravan Arrives", era: [1, 5], icon: "🐪",
    text: () => "Foreign traders with silks and spices ask permission to trade in your markets.",
    ch: [{ t: "Tax them heavily", d: n => `+${fmt(20 * eraScale(n))} gold, Merchants upset`, f: n => { fx.gold(n, 20 * eraScale(n)); fx.fac(n, "merchants", -10); } },
         { t: "Welcome them", d: n => `+${fmt(6 * eraScale(n))} gold, Merchants delighted`, f: n => { fx.gold(n, 6 * eraScale(n)); fx.fac(n, "merchants", 12); } }] },
  { id: "heresy", title: "A New Teaching", era: [1, 5], icon: "📖",
    text: () => "A wandering preacher is gathering followers with a strange new teaching.",
    ch: [{ t: "Suppress it", d: () => "Clergy pleased, Commoners upset", f: n => { fx.fac(n, "elders", 12); fx.fac(n, "commoners", -8); } },
         { t: "Let it spread", d: n => `Thinkers pleased, Clergy angry, +${fmt(6 * eraScale(n))} science`, f: n => { fx.fac(n, "elders", -12); fx.fac(n, "intellectuals", 10); fx.sci(n, 6 * eraScale(n)); } }] },
  { id: "succession", title: "Succession Crisis", era: [1, 5], icon: "👑", cond: n => ["monarchy", "empire", "chiefdom"].includes(n.gov),
    text: () => "The ruler has died. Two heirs claim the throne.",
    ch: [{ t: "Back the eldest", d: () => "Nobles pleased, Commoners indifferent", f: n => fx.fac(n, "nobles", 14) },
         { t: "Back the popular one", d: () => "Commoners pleased, Nobles angry", f: n => { fx.fac(n, "commoners", 12); fx.fac(n, "nobles", -12); } }] },
  { id: "school", title: "A School of Thinkers", era: [2, 5], icon: "🏛️",
    text: () => "Scholars ask for funding to open a school of philosophy.",
    ch: [{ t: "Fund them", d: n => `−${fmt(15 * eraScale(n))} gold, +${fmt(20 * eraScale(n))} science`, f: n => { fx.gold(n, -15 * eraScale(n)); fx.sci(n, 20 * eraScale(n)); fx.fac(n, "intellectuals", 8); } },
         { t: "Refuse", d: () => "Clergy pleased", f: n => fx.fac(n, "elders", 6) }] },
  { id: "drought", title: "Drought", era: [0, 6], icon: "☀️",
    text: () => "No rain has fallen for months. Crops are failing.",
    ch: [{ t: "Import grain", d: n => `−${fmt(20 * eraScale(n))} gold`, f: n => fx.gold(n, -20 * eraScale(n)) },
         { t: "Ration food", d: () => "−5% population, Commoners upset", f: n => { fx.pop(n, .95); fx.fac(n, "commoners", -12); } }] },
  { id: "pirates", title: "Pirates!", era: [1, 5], icon: "🏴‍☠️", cond: n => [...pres(n)].some(ri => W.regions[ri].c),
    text: () => "Pirates are raiding your coasts and seizing merchant ships.",
    ch: [{ t: "Send an expedition", d: n => `−${fmt(14 * eraScale(n))} gold, Merchants pleased`, f: n => { fx.gold(n, -14 * eraScale(n)); fx.fac(n, "merchants", 10); } },
         { t: "Pay for safe passage", d: n => `−${fmt(6 * eraScale(n))} gold, Military scoffs`, f: n => { fx.gold(n, -6 * eraScale(n)); fx.fac(n, "warriors", -6); } }] },
  { id: "artist", title: "A Great Artist", era: [2, 7], icon: "🎨",
    text: () => "A brilliant artist offers to create a monument to your nation.",
    ch: [{ t: "Commission it", d: n => `−${fmt(20 * eraScale(n))} gold, everyone is proud`, f: n => { fx.gold(n, -20 * eraScale(n)); for (const k in FACTIONS) fx.fac(n, k, 6, 8, "National monument"); } },
         { t: "Decline", d: () => "Nothing happens", f: () => {} }] },
  { id: "quake", title: "Earthquake", era: [0, 7], icon: "🌋",
    text: n => `The ground shook violently in ${W.regions[n._r = randRegion(n)].n}.`,
    ch: [{ t: "Rebuild quickly", d: n => `−${fmt(12 * eraScale(n))} gold, −${fmt(10 * eraScale(n))} materials`, f: n => { fx.gold(n, -12 * eraScale(n)); fx.mat(n, -10 * eraScale(n)); } },
         { t: "Leave the ruins", d: () => "A building in the region may be lost", f: n => { const ri = n._r >= 0 ? n._r : randRegion(n); const b = B(n.id, ri); const ks = Object.keys(b); if (ks.length) delete b[pick(ks)]; setsOf(n).filter(s => s.r === ri).forEach(s => s.pop *= .9); } }] },
  { id: "envoy", title: "A Foreign Envoy", era: [1, 7], icon: "📜", cond: n => G.nations.some(o => o.alive && o.id !== n.id && dip(n.id, o.id).met && !atWar(n.id, o.id)),
    text: n => { const o = pick(G.nations.filter(o => o.alive && o.id !== n.id && dip(n.id, o.id).met && !atWar(n.id, o.id))); n._o = o.id; return `An envoy from the ${nm(o)} arrives bearing gifts and asks for friendship.`; },
    ch: [{ t: "Host a grand reception", d: n => `−${fmt(8 * eraScale(n))} gold, much better relations`, f: n => { fx.gold(n, -8 * eraScale(n)); dip(n.id, n._o).rel += 25; } },
         { t: "Receive them politely", d: () => "Slightly better relations", f: n => { dip(n.id, n._o).rel += 8; } }] },
  { id: "skirmish", title: "Border Skirmish", era: [0, 6], icon: "⚔️", cond: n => G.nations.some(o => o.alive && o.id !== n.id && dip(n.id, o.id).met && !atWar(n.id, o.id)),
    text: n => { const o = pick(G.nations.filter(o => o.alive && o.id !== n.id && dip(n.id, o.id).met && !atWar(n.id, o.id))); n._o = o.id; return `Soldiers from the ${nm(o)} clashed with your border guards.`; },
    ch: [{ t: "Demand an apology", d: () => "Military pleased, worse relations", f: n => { fx.fac(n, "warriors", 8); dip(n.id, n._o).rel -= 20; } },
         { t: "Let it go", d: () => "Military annoyed", f: n => fx.fac(n, "warriors", -6) }] },
  { id: "peasants", title: "Peasants Grumble", era: [0, 7], icon: "😠", cond: n => n.fac.commoners < 40,
    text: () => "Angry crowds gather in the squares, complaining about their lives.",
    ch: [{ t: "Cut taxes for a while", d: n => `−${fmt(15 * eraScale(n))} gold, Commoners calm down`, f: n => { fx.gold(n, -15 * eraScale(n)); fx.fac(n, "commoners", 15); } },
         { t: "Send in the guards", d: () => "Military pleased, Commoners furious", f: n => { fx.fac(n, "warriors", 6); fx.fac(n, "commoners", -10); } }] },
  { id: "inventor", title: "A Clever Inventor", era: [3, 7], icon: "⚙️",
    text: () => "An inventor shows off a strange new machine.",
    ch: [{ t: "Grant a royal patent", d: n => `−${fmt(10 * eraScale(n))} gold, +${fmt(25 * eraScale(n))} science`, f: n => { fx.gold(n, -10 * eraScale(n)); fx.sci(n, 25 * eraScale(n)); } },
         { t: "Laugh him out", d: () => "Nothing happens", f: () => {} }] },
  { id: "explorers", title: "Explorers Return", era: [4, 5], icon: "🧭",
    text: () => "Your explorers return with maps of distant lands and treasure.",
    ch: [{ t: "Fund more voyages", d: n => `−${fmt(10 * eraScale(n))} gold, +${fmt(18 * eraScale(n))} science`, f: n => { fx.gold(n, -10 * eraScale(n)); fx.sci(n, 18 * eraScale(n)); } },
         { t: "Melt the treasure", d: n => `+${fmt(25 * eraScale(n))} gold`, f: n => fx.gold(n, 25 * eraScale(n)) }] },
  { id: "accident", title: "Factory Disaster", era: [5, 7], icon: "🏭", cond: n => lv(n, "factories") > 0,
    text: () => "A boiler explosion killed dozens of workers.",
    ch: [{ t: "Pass safety rules", d: () => "Workers pleased, Merchants annoyed, −5% materials for a while", f: n => { fx.fac(n, "workers", 15); fx.fac(n, "merchants", -8); fx.mat(n, -10 * eraScale(n)); } },
         { t: "Blame the workers", d: () => "Workers furious", f: n => fx.fac(n, "workers", -18) }] },
  { id: "strike", title: "General Strike", era: [5, 7], icon: "🪧",
    text: () => "Workers across the country have walked off the job.",
    ch: [{ t: "Negotiate", d: n => `−${fmt(20 * eraScale(n))} gold, Workers pleased`, f: n => { fx.gold(n, -20 * eraScale(n)); fx.fac(n, "workers", 15); } },
         { t: "Break the strike", d: () => "Workers and Commoners angry, Military pleased", f: n => { fx.fac(n, "workers", -15); fx.fac(n, "commoners", -6); fx.fac(n, "warriors", 6); } }] },
  { id: "crash", title: "Market Crash", era: [5, 7], icon: "📉",
    text: () => "Panic on the exchanges! Banks are failing.",
    ch: [{ t: "Bail out the banks", d: n => `−${fmt(30 * eraScale(n))} gold, Merchants relieved`, f: n => { fx.gold(n, -30 * eraScale(n)); fx.fac(n, "merchants", 10); } },
         { t: "Let them fail", d: n => `−${fmt(10 * eraScale(n))} gold, Merchants and Commoners upset`, f: n => { fx.gold(n, -10 * eraScale(n)); fx.fac(n, "merchants", -15); fx.fac(n, "commoners", -8); } }] },
  { id: "pandemic", title: "Pandemic", era: [6, 7], icon: "🦠",
    text: () => "A new virus is spreading around the world.",
    ch: [{ t: "Lock down", d: n => `−${fmt(25 * eraScale(n))} gold, lives saved`, f: n => { fx.gold(n, -25 * eraScale(n)); fx.fac(n, "merchants", -10); } },
         { t: "Keep things open", d: () => "−6% population, Merchants pleased", f: n => { fx.pop(n, .94); fx.fac(n, "merchants", 8); fx.fac(n, "commoners", -8); } }] },
  { id: "space", title: "The Space Race", era: [6, 7], icon: "🛰️",
    text: () => "Rival nations are launching satellites. Your scientists want a program of their own.",
    ch: [{ t: "Fund the program", d: n => `−${fmt(25 * eraScale(n))} gold, +${fmt(35 * eraScale(n))} science`, f: n => { fx.gold(n, -25 * eraScale(n)); fx.sci(n, 35 * eraScale(n)); fx.fac(n, "intellectuals", 10); } },
         { t: "Not now", d: () => "Intellectuals disappointed", f: n => fx.fac(n, "intellectuals", -8) }] },
  { id: "scandal", title: "Political Scandal", era: [2, 7], icon: "📰", cond: n => GOVS[n.gov].elect,
    text: () => "A minister was caught taking bribes. The papers are full of it.",
    ch: [{ t: "Fire the minister", d: () => "Commoners satisfied, Nobles annoyed", f: n => { fx.fac(n, "commoners", 6); fx.fac(n, "nobles", -6); } },
         { t: "Cover it up", d: () => "Risky: Intellectuals furious", f: n => fx.fac(n, "intellectuals", -15) }] },
  { id: "oilboom", title: "Oil Boom", era: [6, 7], icon: "🛢️", cond: n => stratHave(n, "oil"),
    text: () => "New oil fields are gushing. Everyone wants a piece.",
    ch: [{ t: "Nationalize the fields", d: n => `+${fmt(40 * eraScale(n))} gold, Merchants angry`, f: n => { fx.gold(n, 40 * eraScale(n)); fx.fac(n, "merchants", -12); } },
         { t: "Sell drilling rights", d: n => `+${fmt(20 * eraScale(n))} gold, Merchants pleased`, f: n => { fx.gold(n, 20 * eraScale(n)); fx.fac(n, "merchants", 10); } }] },
  { id: "refugees", title: "Refugees at the Border", era: [2, 7], icon: "🏕️",
    text: () => "Thousands fleeing a distant war ask for shelter.",
    ch: [{ t: "Take them in", d: () => "+5% population, some grumbling", f: n => { fx.pop(n, 1.05); fx.fac(n, "commoners", -5); fx.fac(n, "intellectuals", 6); } },
         { t: "Close the border", d: () => "Military pleased", f: n => fx.fac(n, "warriors", 5) }] },
  { id: "hackers", title: "Cyber Attack", era: [7, 7], icon: "👾",
    text: () => "Hackers have broken into government systems.",
    ch: [{ t: "Build cyber defenses", d: n => `−${fmt(20 * eraScale(n))} gold`, f: n => fx.gold(n, -20 * eraScale(n)) },
         { t: "Hack them back", d: n => `+${fmt(15 * eraScale(n))} science, risky`, f: n => { fx.sci(n, 15 * eraScale(n)); fx.fac(n, "intellectuals", -6); } }] },
  { id: "climate", title: "Extreme Weather", era: [6, 7], icon: "🌪️",
    text: () => "Storms and heatwaves are battering your regions. Scientists blame pollution.",
    ch: [{ t: "Invest in green tech", d: n => `−${fmt(25 * eraScale(n))} gold, Intellectuals pleased`, f: n => { fx.gold(n, -25 * eraScale(n)); fx.fac(n, "intellectuals", 10); } },
         { t: "Keep industry running", d: () => "Workers pleased, −3% population", f: n => { fx.pop(n, .97); fx.fac(n, "workers", 6); } }] },
  { id: "prodigy", title: "A Young Genius", era: [2, 7], icon: "🧠",
    text: () => "A brilliant young mind has amazed the scholars of your capital.",
    ch: [{ t: "Sponsor their studies", d: n => `−${fmt(8 * eraScale(n))} gold, +${fmt(20 * eraScale(n))} science`, f: n => { fx.gold(n, -8 * eraScale(n)); fx.sci(n, 20 * eraScale(n)); } },
         { t: "Put them to work", d: n => `+${fmt(15 * eraScale(n))} materials`, f: n => fx.mat(n, 15 * eraScale(n)) }] },
  { id: "pilgrims", title: "Pilgrims Flock In", era: [1, 6], icon: "🙏",
    text: () => "Pilgrims from far away are visiting your holy sites.",
    ch: [{ t: "Charge for entry", d: n => `+${fmt(15 * eraScale(n))} gold, Clergy annoyed`, f: n => { fx.gold(n, 15 * eraScale(n)); fx.fac(n, "elders", -6); } },
         { t: "Welcome them freely", d: () => "Clergy delighted", f: n => fx.fac(n, "elders", 12) }] },
  { id: "deserters", title: "Restless Soldiers", era: [1, 7], icon: "🪖", cond: n => n.fac.warriors < 40,
    text: () => "Soldiers complain about poor pay and miserable camps.",
    ch: [{ t: "Raise their pay", d: n => `−${fmt(15 * eraScale(n))} gold, Military pleased`, f: n => { fx.gold(n, -15 * eraScale(n)); fx.fac(n, "warriors", 15); } },
         { t: "Ignore them", d: () => "Lose 1 regiment to desertion", f: n => fx.army(n, -1) }] },
  { id: "treasure", title: "Ancient Ruins", era: [0, 7], icon: "🏺",
    text: () => "Workers digging a well uncovered the ruins of an older people.",
    ch: [{ t: "Study the ruins", d: n => `+${fmt(15 * eraScale(n))} science`, f: n => fx.sci(n, 15 * eraScale(n)) },
         { t: "Sell the artifacts", d: n => `+${fmt(15 * eraScale(n))} gold`, f: n => fx.gold(n, 15 * eraScale(n)) }] },
];
function rollEvent() {
  const n = P(); if (!n.alive || G.tt < G.nextEvent) return null;
  const ok = EVENTS.filter(e => n.era >= e.era[0] && n.era <= e.era[1] && (!e.cond || e.cond(n)) && e.id !== G.lastEvent);
  if (!ok.length) return null;
  G.nextEvent = G.tt + 3 + rnd() * 3;
  const e = pick(ok); G.lastEvent = e.id;
  return { id: e.id, text: e.text(n) };
}

// ================= END TURN =================
function endTurn() {
  if (G.over) return;
  G.news = [];
  if (G.tt == null) G.tt = G.turn; if (G.month == null) G.month = 0;
  setTD();
  for (const n of G.nations) if (n.ai) aiTurn(n);
  for (const n of G.nations) processNation(n);
  driftRelations();
  growBorders();
  updateContacts(); updateExplore();
  G.turn++; G.tt += TD;
  G.month = Math.floor((G.month || 0) / 3) * 3 + 3; // months 0, 3, 6, 9 start each quarter
  if (G.month >= 12) { G.month = 0; G.year++; if (G.year === 0) G.year = 1; } // there is no year 0
  setTD();
  const me = P();
  if (me.alive && terrCount(me) >= Math.ceil(NR * .4)) victory(me, "domination");
  const rival = G.nations.find(n => n.alive && n.ai && terrCount(n) >= Math.ceil(NR * .5));
  if (rival && !G.over) { G.over = true; G.outcome = { win: false, why: `The ${nm(rival)} now rules half the world. Your story ends here.` }; }
  const rivalMars = G.nations.find(n => n.alive && n.ai && has(n, "mars"));
  if (rivalMars && !G.over) { G.over = true; G.outcome = { win: false, why: `The ${nm(rivalMars)} founded a colony on Mars first. The future belongs to them.` }; }
  if (G.year >= 2100 && !G.over) { const rank = ranking(); G.over = true; G.outcome = { win: rank[0].id === G.player, why: rank[0].id === G.player ? "The year 2100 arrives and your nation stands first among all nations." : `The year 2100 arrives. The ${nm(rank[0])} leads the world; you finished #${rank.findIndex(n => n.id === G.player) + 1}.` }; }
  G.event = G.over ? null : rollEvent();
  G.lastReport = G.news.slice();
  save();
}
function score(n) { const sets = setsOf(n); return Math.round(terrCount(n) * 25 + sets.reduce((a, s) => a + U(s.pop) * 2 + s.t * 4, 0) + n.techs.length * 8 + n.army); }
function ranking() { return G.nations.filter(n => n.alive).sort((a, b) => score(b) - score(a)); }
function victory(n, why) { if (G.over || n.id !== G.player) return; G.over = true; G.outcome = { win: true, why: why === "science" ? "Your colonists have landed on Mars. From a village of thirty people to a new world among the stars: humanity's future is yours." : "Your nation now controls 40% of the world's territories. No power on Earth can rival you." }; }
function defeat() { G.over = true; G.outcome = { win: false, why: "Your nation has fallen. Its story lives on only in the history books of others." }; }

// ================= SAVE =================
const SAVE_KEY = "cradle-cosmos-save-v2";
function save() { try { delete G.cells; localStorage.setItem(SAVE_KEY, JSON.stringify(G)); } catch (e) {} }
function restoreCells() {
  delete G.cells;
  for (const n of G.nations) if (!n.fields) n.fields = {};
  if (G.sets.some(x => x.h == null)) { for (const x of G.sets) x.h = hOf(x) * .5; for (let i = 0; i < 6; i++) growBorders(); }
  if (!G.fog) { G.fog = []; updateExplore(); }
}
function loadSave() { try { const s = localStorage.getItem(SAVE_KEY); const g = s ? JSON.parse(s) : null; return g && g.v === 2 ? g : null; } catch (e) { return null; } }

// ================= MAP RENDERING =================
const cv = $("map"), ctx = cv.getContext("2d");
let view = { k: 1, x: 0, y: 0 }, dpr = 1, sel = -1, dirty = true, cw = 0, ch = 0;
let wavePat = null;
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  cw = cv.clientWidth; ch = cv.clientHeight;
  cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
  clampView(); dirty = true;
}
const MAXK = 700;
function minK() {
  const base = Math.max(cw / W.w, ch / W.h) * 0.98;
  if (!G || seeAll() || !G.nations.length) return base;
  // how far you can zoom out depends on how far your own people have spread
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const t of G.sets) if (t.o === G.player) { const m = (t.h || .1) + 1; x0 = Math.min(x0, t.x - m); x1 = Math.max(x1, t.x + m); y0 = Math.min(y0, t.y - m); y1 = Math.max(y1, t.y + m); }
  if (x0 > x1) return base;
  const E = Math.max(x1 - x0, y1 - y0, 1.5);
  return clamp(Math.min(cw, ch) / (E * 2.2), base, MAXK / 3);
}
function clampView() {
  view.k = clamp(view.k, minK(), MAXK);
  const mw = W.w * view.k, mh = W.h * view.k;
  view.x = mw <= cw ? (cw - mw) / 2 : clamp(view.x, cw - mw, 0);
  view.y = mh <= ch ? (ch - mh) / 2 : clamp(view.y, ch - mh, 0);
}
function centerOn(x, y, k) { if (k) view.k = k; view.x = cw / 2 - x * view.k; view.y = ch * .42 - y * view.k; clampView(); dirty = true; }
const centerRegion = (ri, k) => centerOn(W.regions[ri].lx, W.regions[ri].ly, k);
let bordKey = null, bordPaths = new Map();
// ---- keep each people's land in one piece: link settlements with filled corridors unless water or foreign land is in the way ----
let landMask = null;
function onLand(x, y) {
  if (!landMask) { const c = document.createElement("canvas"); c.width = Math.ceil(W.w); c.height = Math.ceil(W.h); const g = c.getContext("2d"); g.fill(getLandPath(), "evenodd");
    const d = g.getImageData(0, 0, c.width, c.height).data; landMask = { w: c.width, h: c.height, m: new Uint8Array(c.width * c.height) }; for (let i = 0; i < landMask.m.length; i++) landMask.m[i] = d[i * 4 + 3] > 60 ? 1 : 0; }
  const xi = x | 0, yi = y | 0; if (xi < 0 || yi < 0 || xi >= landMask.w || yi >= landMask.h) return false;
  return landMask.m[yi * landMask.w + xi] === 1;
}
function hull(pts) {
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
function linkOk(a, b, hw) {
  const L = Math.hypot(b.x - a.x, b.y - a.y), steps = Math.max(2, Math.ceil(L / .35)), w = hw * 2;
  for (let i = 1; i < steps; i++) {
    const x = a.x + (b.x - a.x) * i / steps, y = a.y + (b.y - a.y) * i / steps;
    if (!onLand(x, y)) return false; // separated by water
    for (const o of nearSets(x, y, 6)) if (o.o !== a.o && Math.hypot(o.x - x, o.y - y) < o.h + w * .5) return false; // another people's land in between
  }
  return true;
}
const corrCache = new Map();
function corridors(n, key = G.sv + ":" + G.turn) {
  const c = corrCache.get(n.id); if (c && c.key === key) return c.list;
  const S = G.sets.filter(s => s.o === n.id), N = S.length, list = [];
  if (N > 1) {
    // candidate links: each settlement to its 6 nearest, then Kruskal so the network is as short as possible
    const edges = [];
    for (let i = 0; i < N; i++) {
      const near = [];
      for (let j = 0; j < N; j++) if (j !== i) near.push([Math.hypot(S[i].x - S[j].x, S[i].y - S[j].y), j]);
      near.sort((a, b) => a[0] - b[0]);
      for (const [d, j] of near.slice(0, 6)) if (i < j || !near.slice(0, 6).length) edges.push([d, i, j]); else edges.push([d, j, i]);
    }
    edges.sort((a, b) => a[0] - b[0]);
    const par = S.map((_, i) => i), find = i => par[i] === i ? i : (par[i] = find(par[i]));
    const seen = new Set();
    for (const [d, i, j] of edges) {
      const k2 = i + "," + j; if (seen.has(k2)) continue; seen.add(k2);
      const a = find(i), b = find(j); if (a === b) continue;
      const A = S[i], Bs = S[j];
      if (Math.hypot(A.x - Bs.x, A.y - Bs.y) <= (A.h + Bs.h) * .85) { par[a] = b; continue; } // already overlapping
      // a broad swath of land between the two, narrowed if a neighbor is too close
      const L0 = Math.hypot(Bs.x - A.x, Bs.y - A.y), wide = clamp(L0 * .32, Math.min(A.h, Bs.h) * .6, 2.5);
      let hw = wide;
      if (!linkOk(A, Bs, hw)) { hw = Math.min(A.h, Bs.h) * .5; if (!linkOk(A, Bs, hw)) continue; }
      par[a] = b;
      const w = Math.max(Math.min(A.h, Bs.h), hw), pts = [];
      for (const T of [A, Bs]) pts.push(...blobPts(T.x, T.y, T.h * .92, T.id + 7, 16));
      const L = Math.hypot(Bs.x - A.x, Bs.y - A.y), nx = -(Bs.y - A.y) / L, ny = (Bs.x - A.x) / L;
      for (const f of [.3, .7]) { const qx = A.x + (Bs.x - A.x) * f, qy = A.y + (Bs.y - A.y) * f, hh = hw * .85; pts.push([qx + nx * hh, qy + ny * hh], [qx - nx * hh, qy - ny * hh]); }
      const mx = (A.x + Bs.x) / 2, my = (A.y + Bs.y) / 2, pinch = hw, bend = Math.sin(A.id + Bs.id) * hw * .3;
      const hl = hull(pts.concat([[mx + nx * (pinch + bend), my + ny * (pinch + bend)], [mx - nx * (pinch - bend), my - ny * (pinch - bend)]])), path = new Path2D();
      smoothPoly(path, hl);
      list.push({ path, bb: [Math.min(A.x, Bs.x) - w * 1.6, Math.min(A.y, Bs.y) - w * 1.6, Math.max(A.x, Bs.x) + w * 1.6, Math.max(A.y, Bs.y) + w * 1.6] });
    }
  }
  corrCache.set(n.id, { key, list }); return list;
}
// spatial index of every people's corridors, rebuilt once per turn
let corrIdx = null, corrIdxTurn = -1;
function inForeignCorridor(x, y, owner) {
  if (!sampler) sampler = document.createElement("canvas").getContext("2d");
  if (corrIdxTurn !== G.turn || !corrIdx) {
    corrIdxTurn = G.turn; corrIdx = new Map();
    for (const n of G.nations) { if (!n.alive) continue;
      for (const c of corridors(n, "t" + G.turn)) for (let gx = c.bb[0] / 4 | 0; gx <= (c.bb[2] / 4 | 0); gx++) for (let gy = c.bb[1] / 4 | 0; gy <= (c.bb[3] / 4 | 0); gy++) {
        const k = gx + "," + gy; (corrIdx.get(k) || corrIdx.set(k, []).get(k)).push([n.id, c]); } }
  }
  const a = corrIdx.get((x / 4 | 0) + "," + (y / 4 | 0)); if (!a) return false;
  for (const [o, c] of a) if (o !== owner && x > c.bb[0] && x < c.bb[2] && y > c.bb[1] && y < c.bb[3] && sampler.isPointInPath(c.path, x, y)) return true;
  return false;
}
function drawBorders(k, me) {
  const key = G.sv + ":" + G.turn;
  if (bordKey !== key) { bordKey = key; bordPaths = new Map();
    for (const s of G.sets) { const p = bordPaths.get(s.o) || (bordPaths.set(s.o, new Path2D()), bordPaths.get(s.o)); smoothPoly(p, blobPts(s.x, s.y, s.h || .05, s.id)); }
    for (const n of G.nations) { if (!n.alive) continue; const p = bordPaths.get(n.id); if (!p) continue; for (const c of corridors(n)) p.addPath(c.path); } }
  ctx.save(); ctx.clip(getLandPath(), "evenodd");
  const bw = Math.max(.004, 1.8 / k);
  for (const [o, p] of bordPaths) { const n = G.nations[o]; if (!n || !n.alive) continue; const war = atWar(me, o);
    // outline trick: stroke every square thick and dark, then fill the union so only the outer edge shows
    ctx.lineJoin = "round"; ctx.lineWidth = bw * (war ? 3 : 2); ctx.strokeStyle = war ? "#b3261e" : shade(n.color, -.42); ctx.stroke(p);
    ctx.fillStyle = shade(n.color, .25); ctx.fill(p); }
  ctx.restore();
}
let fogCanvas = null;
function drawFog() {
  if (seeAll()) return;
  if (!fogCanvas) fogCanvas = document.createElement("canvas");
  if (fogCanvas.width !== cv.width || fogCanvas.height !== cv.height) { fogCanvas.width = cv.width; fogCanvas.height = cv.height; }
  const f = fogCanvas.getContext("2d"), k = view.k;
  f.setTransform(1, 0, 0, 1, 0, 0); f.globalCompositeOperation = "source-over";
  f.fillStyle = "#c9d1da"; f.fillRect(0, 0, fogCanvas.width, fogCanvas.height);
  if (fogPat) { f.setTransform(dpr, 0, 0, dpr, 0, 0); const pt = f.createPattern(fogPat.src, "repeat"); f.fillStyle = pt; f.fillRect(0, 0, cw, ch); }
  f.globalCompositeOperation = "destination-out";
  f.setTransform(dpr * k, 0, 0, dpr * k, dpr * view.x, dpr * view.y);
  const x0 = -view.x / k, y0 = -view.y / k, x1 = (cw - view.x) / k, y1 = (ch - view.y) / k;
  for (const d of G.fog) {
    if (d.x + d.r < x0 || d.x - d.r > x1 || d.y + d.r < y0 || d.y - d.r > y1) continue;
    const g = f.createRadialGradient(d.x, d.y, d.r * .7, d.x, d.y, d.r);
    g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(1, "rgba(0,0,0,0)");
    f.fillStyle = g; f.beginPath(); f.arc(d.x, d.y, d.r, 0, Math.PI * 2); f.fill();
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(fogCanvas, 0, 0);
}
let fogPat = null;
function makeFog() {
  const c = document.createElement("canvas"); c.width = c.height = 40; const x = c.getContext("2d");
  x.strokeStyle = "rgba(255,255,255,.55)"; x.lineWidth = 2; x.lineCap = "round";
  for (const [a, b] of [[10, 12], [30, 30]]) { x.beginPath(); x.arc(a, b, 4, Math.PI, 0); x.arc(a + 7, b, 3, Math.PI, 0); x.stroke(); }
  fogPat = ctx.createPattern(c, "repeat"); fogPat.src = c;
}
function makeWaves() {
  const c = document.createElement("canvas"); c.width = c.height = 48; const x = c.getContext("2d");
  x.fillStyle = "#6fc3ea"; x.fillRect(0, 0, 48, 48);
  x.strokeStyle = "rgba(255,255,255,.28)"; x.lineWidth = 1.6; x.lineCap = "round";
  x.beginPath(); x.arc(12, 16, 5, Math.PI * 1.1, Math.PI * 1.9); x.stroke();
  x.beginPath(); x.arc(36, 38, 5, Math.PI * 1.1, Math.PI * 1.9); x.stroke();
  wavePat = ctx.createPattern(c, "repeat");
}
function shade(hex, f) {
  if (hex.startsWith("hsl")) return hex;
  let r, g, b;
  if (hex[0] === "#") { const n = parseInt(hex.slice(1), 16); r = n >> 16; g = (n >> 8) & 255; b = n & 255; }
  else [r, g, b] = hex.match(/\d+/g).map(Number);
  if (f > 0) { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; } else { r *= 1 + f; g *= 1 + f; b *= 1 + f; }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}
const WILD = "#fbfaf4";
function draw() {
  dirty = false;
  if (!G) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (!wavePat) makeWaves();
  ctx.fillStyle = wavePat; ctx.fillRect(0, 0, cw, ch);
  ctx.setTransform(dpr * view.k, 0, 0, dpr * view.k, dpr * view.x, dpr * view.y);
  const k = view.k, me = G.player;
  ctx.save(); ctx.translate(2.4 / Math.sqrt(k), 4.4 / Math.sqrt(k)); ctx.fillStyle = "rgba(20,60,110,.25)";
  for (const s of W.regions) ctx.fill(s.path, "evenodd"); ctx.restore();
  // who has the most people in each unclaimed region (for a soft tint)
  const presence = {};
  for (const s of G.sets) { const p = presence[s.r] || (presence[s.r] = {}); p[s.o] = (p[s.o] || 0) + U(s.pop) * (1 + s.t); }
  if (!fogPat) makeFog();
  if (fogPat.setTransform) fogPat.setTransform(new DOMMatrix().scale(1 / k));
  for (const s of W.regions) {
    const r = G.regions[s.i];

    ctx.fillStyle = WILD; ctx.fill(s.path, "evenodd");
    ctx.globalAlpha = .28; ctx.fillStyle = TER[s.t].col; ctx.fill(s.path, "evenodd");
    if (r.ctrl >= 0) { ctx.globalAlpha = .2; ctx.fillStyle = G.nations[r.ctrl].color; ctx.fill(s.path, "evenodd"); }
    ctx.globalAlpha = 1;
  }
  drawBorders(k, me);
  for (const s of W.regions) {
    const r = G.regions[s.i];
    if (false) { ctx.save(); ctx.clip(s.path, "evenodd"); ctx.strokeStyle = "rgba(120,0,0,.28)"; ctx.lineWidth = 3 / k; ctx.beginPath();
      const x0 = s.lx - 200, y0 = s.ly - 200; const st = 9 / Math.max(1, k / 2); for (let i = 0; i < 400; i += st) { ctx.moveTo(x0 + i, y0); ctx.lineTo(x0 + i - 200, y0 + 200); ctx.moveTo(x0 + i, y0 + 200); ctx.lineTo(x0 + i - 200, y0 + 400); } ctx.stroke(); ctx.restore(); }
  }
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(120,130,150,.35)"; ctx.lineWidth = 1 / k;
  for (const s of W.regions) if (!fogged(s.i)) ctx.stroke(s.path);
  for (const s of W.regions) {
    const r = G.regions[s.i]; if (r.ctrl < 0 || fogged(s.i)) continue;
    const o = G.nations[r.ctrl];
    ctx.save(); ctx.clip(s.path, "evenodd"); ctx.setLineDash([6 / k, 4 / k]); ctx.strokeStyle = shade(o.color, -.35); ctx.globalAlpha = .55; ctx.lineWidth = 2.4 / k; ctx.stroke(s.path); ctx.restore();
  }
  if (sel >= 0) { const s = W.regions[sel]; ctx.strokeStyle = "#fff"; ctx.lineWidth = 5 / k; ctx.stroke(s.path); ctx.strokeStyle = "#1d2a4d"; ctx.lineWidth = 2.2 / k; ctx.stroke(s.path); }
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const fs = 11 / k;
  if (k > 1.7) {
    ctx.font = `700 ${fs}px Nunito, system-ui, sans-serif`;
    for (const s of W.regions) {
      if ((s.ls * k < 20 && k < 6) || fogged(s.i)) continue;
      ctx.lineWidth = 3 / k; ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.fillStyle = "rgba(29,42,77,.75)";
      ctx.strokeText(s.n, s.lx, s.ly); ctx.fillText(s.n, s.lx, s.ly);
      const bits = (consOf(me, s.i) ? "🔨" : "") + (s.r && k > 3 ? RES[s.r].icon : "");
      if (bits) { ctx.font = `${fs * 1.05}px system-ui, sans-serif`; ctx.fillText(bits, s.lx, s.ly + fs * 1.25); ctx.font = `700 ${fs}px Nunito, system-ui, sans-serif`; }
    }
  }
  // settlements: drawn at true map scale, so you zoom in to see their shapes
  drawSettlements(k, me);
  if (k < 3.2 && seeAll()) {
    for (const n of G.nations) {
      if (!n.alive) continue; const sets = setsOf(n).filter(x => !fogged(x.r)); if (!sets.length) continue;
      let x = 0, y = 0, w = 0; for (const s of sets) { const u = U(s.pop) * (1 + s.t); x += s.x * u; y += s.y * u; w += u; }
      x /= w; y /= w;
      const tc = terrCount(n);
      const size = clamp(7 + tc * 2.2 + Math.sqrt(w) * .4, 8, 26) / k * Math.min(1.6, k);
      ctx.font = `600 ${size}px Fredoka, system-ui, sans-serif`;
      ctx.lineWidth = size / 4; ctx.strokeStyle = shade(n.color, -.55); ctx.fillStyle = "#fff";
      ctx.strokeText(n.name, x, y - 12 / k); ctx.fillText(n.name, x, y - 12 / k);
    }
  }
  drawFog();
}
// village = dot, town = square, city = triangle. Sizes are in map units (Greece is ~25 units across).
const SET_SIZE = [.75, .95, 1.35];
function starPath(x, y, r) { ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath(); }
function shapePath(t, x, y, z) {
  ctx.beginPath();
  if (t === 0) ctx.arc(x, y, z, 0, Math.PI * 2);
  else if (t === 1) { if (ctx.roundRect) ctx.roundRect(x - z, y - z, z * 2, z * 2, z * .32); else ctx.rect(x - z, y - z, z * 2, z * 2); }
  else { const h = z * 1.05; ctx.moveTo(x, y - h); ctx.lineTo(x + h * .95, y + h * .62); ctx.lineTo(x - h * .95, y + h * .62); ctx.closePath(); }
}
function drawSettlements(k, me) {
  const x0 = -view.x / k - 1, y0 = -view.y / k - 1, x1 = (cw - view.x) / k + 1, y1 = (ch - view.y) / k + 1;
  ctx.lineJoin = "round";
  // most important first: capitals, then cities, towns, villages; anything that would overlap is left out
  const vis = G.sets.filter(s => s.x >= x0 && s.x <= x1 && s.y >= y0 && s.y <= y1)
    .sort((a, b) => (G.nations[b.o].cap === b.id) - (G.nations[a.o].cap === a.id) || b.t - a.t || b.pop - a.pop);
  const taken = new Map(), labels = [];
  const cell = (x, y) => (x / 24 | 0) + "," + (y / 24 | 0);
  const free = (sx, sy, r) => { const gx = sx / 24 | 0, gy = sy / 24 | 0;
    for (let a = gx - 1; a <= gx + 1; a++) for (let b = gy - 1; b <= gy + 1; b++) { const l = taken.get(a + "," + b); if (l) for (const q of l) if (Math.hypot(q[0] - sx, q[1] - sy) < q[2] + r + 1.5) return false; }
    return true; };
  for (const s of vis) {
    const t = s.t, n = G.nations[s.o], px = clamp((s.h || .05) * k * .14, 1.4, 4.5 + t * 1.8), z = px / k;
    const sx = s.x * k + view.x, sy = s.y * k + view.y, rr = px * (t === 2 ? 1.15 : 1);
    if (!free(sx, sy, rr)) continue;
    const key = cell(sx, sy); (taken.get(key) || taken.set(key, []).get(key)).push([sx, sy, rr]);
    if (px < 2.4) { ctx.fillStyle = shade(n.color, -.45); ctx.beginPath(); ctx.arc(s.x, s.y, z, 0, Math.PI * 2); ctx.fill(); continue; }
    const base = shade(n.color, .62);
    shapePath(t, s.x, s.y + z * .22, z); ctx.fillStyle = "rgba(20,30,60,.3)"; ctx.fill();
    shapePath(t, s.x, s.y, z);
    const g = ctx.createLinearGradient(s.x, s.y - z, s.x, s.y + z);
    g.addColorStop(0, shade(base, .5)); g.addColorStop(1, shade(base, -.1));
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = z * .22; ctx.strokeStyle = shade(n.color, -.45); ctx.stroke();
    if (s.crowd && s.o === me) { shapePath(t, s.x, s.y, z * 1.55); ctx.lineWidth = z * .12; ctx.strokeStyle = "rgba(230,154,11,.95)"; ctx.stroke(); }
    if (n.cap === s.id) { starPath(s.x + z * .95, s.y - z * .95, z * .62); ctx.fillStyle = "#ffc93c"; ctx.fill(); ctx.lineWidth = z * .1; ctx.strokeStyle = "#7a4b00"; ctx.stroke(); }
    if ((s.h || .05) * k > (t >= 1 ? 45 : 80)) {
      const txt = `${s.name} · ${fmt(s.pop)}`, w = txt.length * 6.2, lx = sx - w / 2, ly = sy + px * 1.3 + 2;
      if (labels.some(b => lx < b[2] && lx + w > b[0] && ly < b[3] && ly + 13 > b[1])) continue;
      labels.push([lx, ly, lx + w, ly + 13]);
      const fs = 11 / k;
      ctx.font = `800 ${fs}px Nunito, system-ui, sans-serif`; ctx.lineWidth = fs * .3; ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.fillStyle = "#1d2a4d";
      const ty = s.y + z * 1.3 + fs * .7;
      ctx.strokeText(txt, s.x, ty); ctx.fillText(txt, s.x, ty);
    }
  }
}
function loop() { if (dirty) draw(); requestAnimationFrame(loop); }

const ptrs = new Map(); let pinch = null, downAt = null, moved = 0;
cv.addEventListener("pointerdown", e => { cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); downAt = { x: e.clientX, y: e.clientY, t: Date.now() }; moved = 0;
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), k: view.k, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, vx: view.x, vy: view.y }; } });
cv.addEventListener("pointermove", e => {
  if (!ptrs.has(e.pointerId)) return;
  const p = ptrs.get(e.pointerId), dx = e.clientX - p.x, dy = e.clientY - p.y;
  p.x = e.clientX; p.y = e.clientY;
  if (ptrs.size === 2 && pinch) {
    const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y);
    const nk = clamp(pinch.k * d / pinch.d, minK(), MAXK), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
    const rect = cv.getBoundingClientRect();
    const mx = (pinch.cx - rect.left - pinch.vx) / pinch.k, my = (pinch.cy - rect.top - pinch.vy) / pinch.k;
    view.k = nk; view.x = cx - rect.left - mx * nk; view.y = cy - rect.top - my * nk; moved = 99;
  } else { view.x += dx; view.y += dy; moved += Math.abs(dx) + Math.abs(dy); }
  clampView(); dirty = true;
});
const pend = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null;
  if (e.type === "pointerup" && downAt && moved < 8 && Date.now() - downAt.t < 600 && ptrs.size === 0) tapMap(e); };
cv.addEventListener("pointerup", pend); cv.addEventListener("pointercancel", pend);
cv.addEventListener("wheel", e => { e.preventDefault(); const rect = cv.getBoundingClientRect(); const mx = (e.clientX - rect.left - view.x) / view.k, my = (e.clientY - rect.top - view.y) / view.k;
  view.k = clamp(view.k * Math.exp(-e.deltaY * .0015), minK(), MAXK); view.x = e.clientX - rect.left - mx * view.k; view.y = e.clientY - rect.top - my * view.k; clampView(); dirty = true; }, { passive: false });
function tapMap(e) {
  const rect = cv.getBoundingClientRect(); const mx = (e.clientX - rect.left - view.x) / view.k, my = (e.clientY - rect.top - view.y) / view.k;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  let hit = -1; for (const s of W.regions) if (ctx.isPointInPath(s.path, mx, my, "evenodd")) { hit = s.i; break; }
  ctx.restore();
  if (G.setup) { if (hit >= 0) setupPick(hit); return; }
  sel = hit; dirty = true;
  if (hit >= 0) openRegion(hit); else closeSheet();
}
$("zin").onclick = () => zoomBy(1.6); $("zout").onclick = () => zoomBy(1 / 1.6);
$("zhome").onclick = () => { if (G && P().alive) { const c = capSet(P()); if (c) centerOn(c.x, c.y, Math.max(view.k, Math.min(cw, ch) / 3)); } };
function zoomBy(f) { const cx = cw / 2, cy = ch / 2, mx = (cx - view.x) / view.k, my = (cy - view.y) / view.k; view.k = clamp(view.k * f, minK(), MAXK); view.x = cx - mx * view.k; view.y = cy - my * view.k; clampView(); dirty = true; }

// ================= UI =================
const sheet = $("sheet"), panel = $("panel"), modal = $("modal");
const dateTxt = () => `Q${Math.floor((G.month || 0) / 3) + 1} ${yearTxt(G.year)}`;
function hud() {
  const n = P(), E = econM(n);
  $("hName").textContent = nm(n);
  $("hFlag").style.background = n.color;
  $("hYear").textContent = `${dateTxt()} · ${ERAS[n.era]}`;
  const sets = setsOf(n), full = sets.filter(s => s.crowd).length;
  $("cPop").innerHTML = `<span class="ci">👥</span><b>${fmtP(E.pop)}</b><i>${full ? `${full} overcrowded` : `${sets.length} settlement${sets.length > 1 ? "s" : ""}`}</i>`;
  $("cPop").classList.toggle("warnchip", full > 0);
  $("cGold").className = "chip" + (n.gold < 0 ? " bad" : "");
  $("cGold").innerHTML = `<span class="ci">🪙</span><b>${n.gold < 0 ? "−" + fmt(-n.gold) : fmt(n.gold)}</b><i class="${E.goldNet < 0 ? "neg" : ""}">${sgn(E.goldNet)}</i>`;
  $("cMat").innerHTML = `<span class="ci">🪵</span><b>${fmt(n.mat)}</b><i>${sgn(E.mat)}</i>`;
  const t = resItem(n, n.research);
  $("cSci").innerHTML = t ? `<span class="ci">🔬</span><b>${Math.min(99, Math.floor(n.sciPts / t.cost * 100))}%</b><i>${esc(t.mastery || t.develop ? t.name + " " + (lv(n, t.f.k) + 1) : t.name)}</i>` : `<span class="ci">🔬</span><b>—</b><i>Pick research</i>`;
  $("cSci").classList.toggle("alert", !t && TECHS.some(x => !has(n, x.id) && x.era <= n.era));
  $("cStab").innerHTML = `<span class="ci">${n.stab >= 65 ? "😊" : n.stab >= 40 ? "😐" : "😠"}</span><b>${Math.round(n.stab)}</b><i>${n.stab >= 65 ? "Content" : n.stab >= 40 ? "Uneasy" : n.stab >= 20 ? "Restless" : "Chaos"}</i>`;
  $("cStab").className = "chip " + (n.stab >= 65 ? "good" : n.stab >= 40 ? "" : "bad");
  $("cFood").innerHTML = `<span class="ci">🌾</span><b>${sgn(E.surplus)}</b><i>${E.surplus >= 0 ? "Fed" : "Famine"}</i>`;
  $("cFood").className = "chip " + (E.surplus >= 0 ? "" : "bad");
  $("cArmy").innerHTML = `<span class="ci">⚔️</span><b>${n.army}</b><i>Power ${fmt(power(n))}</i>`;
  const wars = G.nations.filter(o => atWar(n.id, o.id)).length;
  $("tabWorld").classList.toggle("alert", wars > 0 || !!G.pendingPeace);
}
function costTxt(c) { return `${c.g ? `<span class="cg">🪙${fmt(c.g)}</span>` : ""} ${c.m ? `<span class="cm">🪵${fmt(c.m)}</span>` : ""}`; }

// ---------- region sheet ----------
const x2 = s => [s.acad === 2 ? "🎓 University" : s.acad === 1 ? "🎓 Academy" : "", s.mil ? "🏰 Military academy" : ""].filter(Boolean).join(" · ") || "No academies yet (see Research and Army tabs)";
function setRow(s, n) {
  const o = G.nations[s.o], mine = s.o === n.id, cap = capOf(s, o), full = s.pop >= cap * (s.t ? .6 : .94);
  let acts = "";
  if (mine) {
    const biggest = setsOf(n).filter(x => x.r === s.r && x.t === 0).sort((a, b) => b.pop - a.pop)[0];
    if (s.t === 0 && biggest === s) { const c = townCheck(n, s);
      acts += `<button class="btn small" data-act="town" data-s="${s.id}" ${c.ok ? "" : "disabled"}>🏘️ Merge ${VILLAGES_FOR_TOWN} villages into a town · ${costTxt(townCost(n))}</button><span class="why">${c.ok ? `Merges ${esc(s.name)} with ${c.mates.map(m => esc(m.name)).join(", ")} (${fmtP(s.pop + c.mates.reduce((a, m) => a + m.pop, 0))} people)` : esc(c.why || "")}</span>`; }
    else if (s.t === 1) { const c = cityCheck(n, s);
      acts += `<button class="btn small" data-act="city" data-s="${s.id}" ${c.ok ? "" : "disabled"}>🏙️ Upgrade to city · ${costTxt(cityCost(n))}</button>${c.ok || !c.why ? "" : `<span class="why">${esc(c.why)}</span>`}`; }
    if (canEmph(n, s)) {
      const opts = CHAINS.filter(c => fieldOpen(n, FIELDS[c.f[0][0]]) || c.f.some(([k]) => lv(n, k)));
      acts += `<span class="why">${x2(s)}</span><label class="emph">${s.id === n.cap ? "⭐ Capital" : "🏙️ City"} emphasis <select data-s="${s.id}"><option value="">None</option>${opts.map(c => `<option value="${c.k}" ${s.focus === c.k ? "selected" : ""}>${c.icon} ${esc(c.name)}</option>`).join("")}</select></label><span class="why">${s.focus ? `${s.id === n.cap ? "+15%" : "+1.5%"} to ${esc(CHAINS.find(c => c.k === s.focus).name)} bonuses, faster research for it, and it can reach ${s.id === n.cap ? "3 ages" : "1 age"} ahead.` : `Pick a field for this ${s.id === n.cap ? "capital" : "city"} to specialize in.`}</span>`;
    }
  } else if (atWar(n.id, o.id) && !touchesSet(n, s)) {
    acts += `<span class="why">Not on the front line. Only settlements touching your borders can be attacked.</span>`;
  } else if (atWar(n.id, o.id)) {
    acts += n.army - n.used > 0 ? `<button class="btn small red" data-act="attackPick" data-s="${s.id}">⚔️ Attack ${esc(s.name)}</button>` : `<span class="why">Your regiments have all fought this turn.</span>`;
  }
  return `<div class="set ${mine ? "mine" : ""}"><div class="st-top"><span class="st-icon">${TIERS[s.t].icon}</span><span class="st-name"><b>${esc(s.name)}</b><small><span class="sw" style="background:${o.color}"></span> ${mine ? "Yours" : esc(o.name)} · ${TIERS[s.t].name}${o.cap === s.id ? " · Capital ⭐" : ""}${full ? (s.crowd ? ' · <span class="bad">Overcrowded</span>' : (s.t ? ' · <span class="warn">Crowded · people moving out</span>' : ' · <span class="warn">Full · people moving out</span>')) : ""}${mine && s.u > 50 ? ' · <span class="bad">Unrest</span>' : ""}</small></span><span class="st-pop">${fmtP(s.pop)}<small>/ ${fmtP(cap)}</small></span></div>
    <div class="bar thin"><i style="width:${Math.min(100, s.pop / cap * 100)}%;background:${full ? "var(--warn)" : o.color}"></i></div>${acts ? `<div class="acts">${acts}</div>` : ""}</div>`;
}
function openRegion(ri) {
  closePanel();
  if (fogged(ri)) {
    sheet.innerHTML = `<div class="sh-head"><div><h3>Unexplored land</h3><div class="sub">Beyond the edge of your maps</div></div><button class="x" data-act="close" aria-label="Close">✕</button></div><p class="note">Your people don't know what lies here yet. Spread your settlements, meet other peoples, or sign trade pacts to share maps. Sailing and Navigation reveal distant coasts, and Flight reveals the whole world.</p>`;
    sheet.hidden = false; sheet.dataset.ri = ri; return;
  }
  const S = W.regions[ri], r = G.regions[ri], n = P(), T = TER[S.t], res = S.r ? RES[S.r] : null;
  const here = setsIn(ri).filter(x => x.o === P().id || visibleAt(x.x, x.y)).sort((a, b) => (b.o === n.id) - (a.o === n.id) || b.t - a.t || b.pop - a.pop);
  const ctrl = r.ctrl >= 0 ? G.nations[r.ctrl] : null;
  const mine = here.filter(s => s.o === n.id), myTowns = mine.filter(s => s.t >= 1).length, myVill = mine.filter(s => s.t === 0).length;
  let h = `<div class="sh-head"><div><h3>${esc(S.n)}</h3><div class="sub">${T.name}${res ? ` · ${res.icon} ${res.name}` : ""}${S.c ? " · Coastal" : ""}</div></div><button class="x" data-act="close" aria-label="Close">✕</button></div>`;
  h += `<div class="owner">${ctrl ? `<span class="sw" style="background:${ctrl.color}"></span>${ctrl.id === n.id ? "Your territory" : "Territory of the " + esc(nm(ctrl))}${ctrl.id !== n.id && atWar(n.id, ctrl.id) ? ' <span class="pill bad">At war</span>' : ""}` : `<span class="sw" style="background:${WILD}"></span>Unclaimed land`}<span class="muted"> · ${here.length}/${S.slots} settlements · ${urbanIn(ri)}/${S.urban} towns & cities</span></div>`;
  if (!ctrl || ctrl.id !== n.id) {
    if (mine.length) h += `<div class="claim"><div class="bar-row"><small>Claim it</small><div class="bar"><i style="width:${myTowns / TOWNS_TO_CLAIM * 100}%;background:var(--accent)"></i></div><span>${myTowns}/${TOWNS_TO_CLAIM} towns</span></div><p class="small muted">${ctrl ? `The ${esc(nm(ctrl))} control this land. Capture their towns to take it.` : `Have ${TOWNS_TO_CLAIM} towns or cities here and this territory becomes yours.`} Villages here: ${myVill}.</p></div>`;
    else if (!ctrl) h += `<p class="small muted">Wild land. Villages form here on their own when nearby settlements fill up, or you can send settlers. ${VILLAGES_FOR_TOWN} villages close together can merge into a town, and ${TOWNS_TO_CLAIM} towns make it your territory.</p>`;
  }
  // found a village
  const fc = foundCheck(n, ri);
  if (fc.ok || fc.donor) h += `<div class="opts"><button class="opt" data-act="found" ${fc.ok ? "" : "disabled"}><span class="oi">🛖</span><span class="ot"><b>Send settlers here</b><small>${MOVERS} people move from ${esc(fc.donor.name)}${fc.ok ? "" : ` · ${esc(fc.why)}`}</small></span><span class="oc">${costTxt(villageCost(n))}</span></button></div>`;
  else if (!(ctrl && ctrl.id !== n.id) || mine.length) h += `<p class="small muted">Can't send settlers here: ${esc(fc.why)}.</p>`;
  if (here.length) h += `<h4>Settlements</h4><div class="sets">${here.map(s => setRow(s, n)).join("")}</div>`;
  const others = [...new Set(here.filter(s => s.o !== n.id).map(s => s.o))].concat(ctrl && ctrl.id !== n.id && !here.some(s => s.o === ctrl.id) ? [ctrl.id] : []);
  for (const id of others) { const o = G.nations[id]; if (!atWar(n.id, id)) h += `<div class="opts"><button class="opt" data-act="diplo" data-id="${id}"><span class="oi">🤝</span><span class="ot"><b>Diplomacy with ${esc(o.name)}</b><small>Trade, alliances, gifts or war</small></span></button></div>`; }
  sheet.innerHTML = h; sheet.hidden = false; sheet.dataset.ri = ri; sheet.scrollTop = 0;
}
function closeSheet() { sheet.hidden = true; sel = -1; dirty = true; }
sheet.addEventListener("change", e => {
  const sel2 = e.target.closest("select[data-s]"); if (!sel2) return;
  const s2 = setById(+sel2.dataset.s), n = P(); if (!s2 || !canEmph(n, s2)) return;
  s2.focus = sel2.value || null; G.fv = (G.fv || 0) + 1;
  toast(s2.focus ? `${s2.name} now emphasizes ${CHAINS.find(c => c.k === s2.focus).name}` : `${s2.name} has no emphasis`);
  const keep = sheet.scrollTop; hud(); openRegion(+sheet.dataset.ri); sheet.scrollTop = keep;
});
sheet.addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (!b || b.disabled) return;
  const ri = +sheet.dataset.ri, n = P(), a = b.dataset.act;
  const keep = sheet.scrollTop;
  if (a === "close") return closeSheet();
  if (a === "build") { startBuild(n, ri, BK[b.dataset.k]); toast(`${BK[b.dataset.k].name} under construction`); }
  else if (a === "found") { const fc = foundCheck(n, ri); if (fc.ok) { const s = foundVillage(n, ri, fc.donor); G.news = []; toast(s ? `Founded ${s.name}` : "No free land there: it's all inside other peoples' borders"); updateContacts(); updateExplore(); G.news = []; } }
  else if (a === "town" || a === "city") { const s = setById(+b.dataset.s); const c = a === "town" ? townCheck(n, s) : cityCheck(n, s); if (c.ok) { upgrade(n, s); toast(`${s.name} is now a ${TIERS[s.t].name.toLowerCase()}!`); const msgs = G.news.filter(x => /territory|now the/.test(x.t)); G.news = []; if (msgs.length) setTimeout(() => showModal(`<div class="mi">🚩</div><h2>${esc(W.regions[ri].n)}</h2>${msgs.map(m => `<p>${esc(m.t)}</p>`).join("")}<div class="row"><button class="btn" data-m="ok">Hooray!</button></div>`), 50); } }
  else if (a === "attackPick") return attackDialog(setById(+b.dataset.s));
  else if (a === "diplo") return openNationDetail(+b.dataset.id);
  hud(); dirty = true; openRegion(ri); sheet.scrollTop = keep;
});
function attackDialog(s) {
  const n = P(), av = n.army - n.used;
  let k = Math.min(av, Math.max(1, Math.ceil(defenseOf(s).power * 1.4 / unitPower(n))));
  const render = () => {
    const p = winChance(n, s, k);
    showModal(`<div class="mi">⚔️</div><h2>Attack ${esc(s.name)}</h2>
      <p>${TIERS[s.t].name} of ${fmtP(s.pop)} people. It takes ${s.hp == null ? HP[s.t] : s.hp} more victor${(s.hp == null ? HP[s.t] : s.hp) === 1 ? "y" : "ies"} to capture. Defense strength <b>${fmt(defenseOf(s).power)}</b>. Each of your regiments brings <b>${fmt(unitPower(n))}</b>.</p>
      <label class="slider"><span>Regiments to send: <b>${k}</b> of ${av}</span><input id="ak" type="range" min="1" max="${av}" value="${k}"></label>
      <div class="odds"><div class="bar big"><i style="width:${p * 100}%;background:${p > .66 ? "var(--good)" : p > .4 ? "var(--warn)" : "var(--bad)"}"></i></div><b>${Math.round(p * 100)}% chance to win</b></div>
      <div class="row"><button class="btn ghost" data-m="cancel">Cancel</button><button class="btn red" data-m="go">Attack!</button></div>`, a => {
        if (a === "go") { const res = attack(n, s, k); const notes = G.news.filter(x => /territory|now the|fell/.test(x.t)).map(x => x.t); G.news = []; hud(); closeSheet();
          showModal(`<div class="mi">${res.win ? "🚩" : "🛡️"}</div><h2>${res.win ? (res.push ? "Border pushed back!" : "Victory!") : "Repelled"}</h2><p>${res.win ? (res.push ? `${esc(s.name)} lost ground but still holds. ${res.left} more victor${res.left === 1 ? "y" : "ies"} to take it.` : `${esc(s.name)} is yours.`) : `The defenders of ${esc(s.name)} held.`} You lost ${res.aLoss} regiment${res.aLoss === 1 ? "" : "s"}; they lost ${res.dLoss}.</p>${notes.map(t => `<p><b>${esc(t)}</b></p>`).join("")}<div class="row"><button class="btn" data-m="ok">OK</button></div>`);
          sel = s.r; dirty = true; if (G.over) setTimeout(showEnd, 50); }
      });
    const sl = $("ak"); if (sl) sl.oninput = () => { k = +sl.value; render(); };
  };
  render();
}

// ---------- panels ----------
let curPanel = null;
function openPanel(name) {
  closeSheet(); curPanel = name;
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("on", t.dataset.p === name));
  panel.innerHTML = { nation: panelNation, develop: panelDevelop, research: panelResearch, army: panelMilitary, policy: panelPolicy, world: panelWorld }[name]();
  budgetFill(panel.querySelector(".budget"));
  panel.hidden = false; panel.scrollTop = 0;
}
function closePanel() { panel.hidden = true; curPanel = null; document.querySelectorAll(".tab").forEach(t => t.classList.remove("on")); }
function refresh() { hud(); dirty = true; if (curPanel) { const st = panel.scrollTop; openPanel(curPanel); panel.scrollTop = st; } }
const ph = (title, sub) => `<div class="p-head"><div><h2>${title}</h2>${sub ? `<div class="sub">${sub}</div>` : ""}</div><button class="x" data-act="pclose" aria-label="Close">✕</button></div>`;
const line = (label, v, cls = "") => `<div class="ln ${cls}"><span>${label}</span><b>${v}</b></div>`;

function budgetHTML(n) {
  const B0 = bud(n);
  let h = `<div class="budget"><div class="bsum" data-bx="sum"></div>`;
  for (const [k, b] of Object.entries(BUDGET)) { h += `<div class="bl"><label><span>${b.icon} ${b.name}</span><b data-bx="v-${k}"></b></label><input type="range" min="0" max="${k === "mil" ? 80 : 60}" step="1" value="${B0[k]}" data-bud="${k}" aria-label="${b.name} budget"><p class="bx" data-bx="${k}"></p></div>`;
  }
  h += `<h4 class="wh">Welfare</h4><p class="small muted">Makes your people happier, healthier and harder to turn against you: raises public trust every turn, calms unrest and helps workers. It costs a share of gross income. The more educated your people become, the more welfare they demand; falling short drains trust unless propaganda talks them down.</p>`;
  for (const [k, w] of Object.entries(WELFARE)) { const mx = welfareMax(n, k);
    h += `<div class="bl"><label><span>${w.icon} ${w.name}</span><b data-bx="v-${k}"></b></label><div class="seg">${w.lv.map((l, i) => `<button class="${B0[k] === i ? "on" : ""}" data-wel="${k}" data-l="${i}" ${i > mx ? "disabled" : ""}>${l}${i > mx ? " 🔒" : ""}</button>`).join("")}</div><p class="bx" data-bx="${k}"></p></div>`; }
  return h + `</div>`;
}
function budgetFill(root) {
  if (!root) return;
  const n = P(), E = econM(n), B0 = bud(n), set = (k, v) => { const el = root.querySelector(`[data-bx="${k}"]`); if (el) el.innerHTML = v; };
  const mm = milMult(E.milFund) - 1;
  for (const k in BUDGET) set("v-" + k, `${B0[k]}% · ${fmt(E[{ mil: "milGold", res: "resGold", prod: "prodGold", travel: "travelGold", sub: "subGold", prop: "propGold" }[k]])} 🪙`);
  { const ed = Math.round(eduOf(n)), sw = propSway(n), ex = k => WELFARE[k].lv[Math.min(4, Math.round(welfareExpect(n, k)))];
    set("prop", `${B0.prop ? `Talks demand down by ${sw.toFixed(2)} level${sw >= .995 && sw < 1.005 ? "" : "s"} per program. ` : ""}Education ${ed}/100: ${welfareExpect(n, "inc") < .25 && welfareExpect(n, "health") < .25 ? "your people expect nothing from the state yet." : `your people expect ${ex("inc")} and ${ex("health")}.`}${B0.prop ? ` Intellectuals −${Math.round(1.5 * Math.sqrt(B0.prop))}.` : ""}`); }
  set("mil", `Pays for <b>${E.armyTarget}</b> regiment${E.armyTarget === 1 ? "" : "s"} (you have ${n.army}; manpower allows ${E.manpower}). ${E.armyTarget > n.army ? "New regiments are raised each turn as materials allow." : E.armyTarget < n.army ? `<span class="bad">${n.army - E.armyTarget} will be stood down; until then they're underpaid (${Math.round(mm * 100)}% strength).</span>` : ""}${E.spare > .01 ? ` Manpower is maxed out, so ${fmt(E.spare)} 🪙 extra goes into quality.` : ""}`);
  set("v-qual", `${100 - B0.qual}% · ${B0.qual}%`);
  set("qual", `${fmt(E.qtyGold)} 🪙 on regiments, ${fmt(E.qualGold)} 🪙 on arms and training: <span class="good">+${Math.round((qualMult(E.milQual) - 1) * 100)}% strength per regiment</span> · total strength about ${fmt(Math.max(n.army, E.armyTarget) * unitPower(n))}.`);
  set("res", `+${fmt(E.resSci)} 🔬 science a quarter · uses ${fmt(E.resMat)} 🪵 materials.`);
  set("prod", B0.prod ? `+${Math.round(E.prodBoost * 100)}% materials.` : BUDGET.prod.d);
  set("travel", B0.travel ? `Generals and commanders: up to +${(travelQ(n)).toFixed(1)}★ better odds, and generals emerge ${Math.round(.6 * travelQ(n) * 100)}% more often.` : BUDGET.travel.d);
  set("sub", B0.sub ? `+${Math.round(subFoodOf(n) * 100)}% food · +${(subGrowOf(n) * 100).toFixed(1)}% growth · commoners +${Math.round(2 * Math.sqrt(B0.sub))}, merchants +${Math.round(1.5 * Math.sqrt(B0.sub))}.` : BUDGET.sub.d);
  for (const k in WELFARE) { const l = B0[k], g = k === "inc" ? E.incGold : E.healthGold, gp = welfareGap(n, k);
    set("v-" + k, l ? `${Math.round(WELFARE[k].cost[l] * 100)}% · ${fmt(g)} 🪙` : "Off");
    set(k, l ? `+${(.75 * l * TD * TPY).toFixed(2).replace(/\.?0+$/, "")} trust a year · commoners +${3 * l}${k === "health" ? ` · +${(.6 * l).toFixed(1)}% growth` : ` · nobles −${2 * l}`} · less unrest · +${2 * l}% materials and science.${welfareMax(n, k) < 4 ? ` Higher levels unlock in later ages.` : ""}` : `Not funded.${welfareMax(n, k) < 4 ? ` Higher levels unlock in later ages (next: ${ERAS[WELFARE[k].era[welfareMax(n, k) + 1]]}).` : ""}${gp > .05 ? ` <span class="bad">People want ${WELFARE[k].lv[Math.min(4, Math.round(welfareExpect(n, k)))]}: −${(1.5 * gp * TD * TPY).toFixed(2)} trust a year.</span>` : ""}`); }
  const tot = Object.keys(BUDGET).reduce((a, k) => a + B0[k], 0) + Math.round((WELFARE.inc.cost[B0.inc] + WELFARE.health.cost[B0.health]) * 100);
  const td = trustFactors(n, E.raw).reduce((a, x) => a + x[1], 0) * TD * TPY;
  set("sum", `${line("Gross income", `${fmt(E.gross)} 🪙`)}${line("Budget", `${tot}% · ${fmt(E.spend)} 🪙`, tot > 100 ? "bad" : "")}${line("Fixed costs (buildings, academies, pay, imports)", `${fmt(E.fixed)} 🪙`)}${line("Net per turn", sgn(E.goldNet), E.goldNet < 0 ? "bad total" : "good total")}${line("Public trust", `${Math.round(Math.max(0, n.trust == null ? 100 : n.trust))} (${td >= 0 ? "+" : ""}${td.toFixed(1)} a year)`, td < 0 ? "bad" : "")}`);
}
// the army tab splits whatever the yearly budget gives the military between quantity and quality
function armyBudgetHTML(n) {
  return `<div class="budget"><div class="bl"><label><span>⚖️ Quantity ↔ Quality</span><b data-bx="v-qual"></b></label><input type="range" min="0" max="90" step="5" value="${bud(n).qual}" data-bud="qual" aria-label="Quantity versus quality"><div class="qq"><small>More regiments</small><small>Better regiments</small></div><p class="bx" data-bx="qual"></p><p class="bx" data-bx="mil"></p></div></div>`;
}
function openBudget(yearly) {
  const n = P();
  showModal(`<div class="mi">📒</div><h2>${yearly ? `Budget for ${yearTxt(G.year)}` : "Budget"}</h2><p class="small">Decide where ${yearly ? "this year's" : "your"} money goes.${yearly ? " You can also change it any time from the Nation or Army tab." : ""}</p>${budgetHTML(n)}<label class="askrow"><input type="checkbox" id="budAsk" ${n.budNoAsk ? "" : "checked"}> Ask me every year</label><div class="row"><button class="btn" data-m="ok">${yearly ? "Approve budget" : "Done"}</button></div>`, () => { save(); hud(); if (curPanel) refresh(); });
  budgetFill(modal.querySelector(".budget"));
}
function budgetInput(e) { const t = e.target; if (!t.dataset || t.dataset.bud == null || !G) return; bud(P())[t.dataset.bud] = +t.value; budgetFill(t.closest(".budget")); hud(); }
function welfareClick(e) { const b = e.target.closest("[data-wel]"); if (!b || b.disabled || !G) return; e.stopPropagation(); bud(P())[b.dataset.wel] = +b.dataset.l; const box = b.closest(".budget"); box.querySelectorAll(`[data-wel="${b.dataset.wel}"]`).forEach(x => x.classList.toggle("on", x === b)); budgetFill(box); hud(); }
function panelNation() {
  const n = P(), E = econM(n), sets = setsOf(n), uc = unitCost(n), ma = maxArmy(n);
  const vc = sets.filter(s => s.t === 0).length, tc = sets.filter(s => s.t === 1).length, cc = sets.filter(s => s.t === 2).length;
  const terr = territories(n), rk = rankOf(n), full = sets.filter(s => s.crowd).length;
  let h = ph(esc(nm(n)), `${GOVS[n.gov].name} · ${fmtP(E.pop)} people`);
  const nextRank = rk < 3 ? [1, 2, 4][rk] : null;
  h += `<div class="card"><h4>Your people</h4>
    <div class="tiers"><div><span>🛖</span><b>${vc}</b><small>Villages</small></div><div><span>🏘️</span><b>${tc}</b><small>Towns</small></div><div><span>🏙️</span><b>${cc}</b><small>Cities</small></div><div><span>🚩</span><b>${terr.length}</b><small>Territories</small></div></div>
    ${line("Rank", `${RANKS[rk].name}${nextRank ? ` · ${RANKS[rk + 1].name} at ${nextRank} territor${nextRank > 1 ? "ies" : "y"}` : ""}`)}
    ${line(`Next town (#${tc + cc + 1}) needs`, `${fmtP(townReq(tc + cc + 1))} people ${E.pop >= townReq(tc + cc + 1) ? '<span class="good">✓</span>' : `<span class="muted">(have ${fmtP(E.pop)})</span>`}`)}
    ${full ? line("Overcrowded", `<span class="bad">${full} with no room nearby</span>`) : ""}
    ${line("Settlements you can manage", `${fmt(sizeOf(n))} / ${adminCap(n)}${E.over ? ' <span class="bad">overextended</span>' : ""}`)}
    <p class="muted small">Villages hold up to ${VILLAGE_CAP} people, towns 3,000, and cities more each age. When one fills up, people move out and form new villages nearby on their own. ${VILLAGES_FOR_TOWN} villages close together can merge into one town. Towns with ${fmtP(CITY_POP)} people can become cities. ${TOWNS_TO_CLAIM} towns claim a territory.</p></div>`;
  { const t = Math.round(Math.max(0, n.trust == null ? 100 : n.trust)), tf = trustFactors(n, E.raw).map(x => [x[0], x[1] * TD * TPY]), td = tf.reduce((a, x) => a + x[1], 0);
    h += `<div class="card"><h4>Public trust <span class="muted">revolt meter</span></h4><div class="bar-row"><small>${t}/100</small><div class="bar"><i style="width:${t}%;background:${t > 60 ? "var(--good)" : t > 30 ? "var(--warn)" : "var(--bad)"}"></i></div><span>${td < 0 ? "Falling" : t < 100 ? "Rising" : "Steady"}</span></div>
      ${tf.map(x => line(esc(x[0]), `${x[1] >= 0 ? "+" : ""}${x[1].toFixed(1)}`, x[1] < 0 ? "bad" : "good")).join("")}${line("Each year", `${td >= 0 ? "+" : ""}${td.toFixed(1)}`, td < 0 ? "bad total" : "good total")}
      <p class="small muted">${n.gold < 0 ? `You owe ${fmt(-n.gold)} gold, growing ${((Math.pow(1.02, TD * TPY) - 1) * 100).toFixed(1)}% a year in interest. Debt drains trust faster the bigger it is compared with your income. ` : ""}Welfare raises trust every quarter. At zero, civil war breaks out and the nation splits in two.</p></div>`; }
  h += `<div class="card"><h4>📒 Budget <span class="muted">share of gross income</span></h4><p class="small muted">Set every year. Spending more than you earn puts you in debt.</p>${budgetHTML(n)}<label class="askrow"><input type="checkbox" id="budAsk" ${n.budNoAsk ? "" : "checked"}> Ask me to set it every year</label></div>`;
  h += `<div class="card"><h4>Treasury <span class="muted">per quarter</span></h4>
    ${line("Taxes", sgn(E.tax))}${line("Trade (automatic)", sgn(E.routeGold))}${line("Luxury exports", sgn(E.luxGold))}${E.foodGold ? line("Surplus food sold", sgn(E.foodGold)) : ""}
    ${line(`Military budget (${bud(n).mil}%)`, sgn(-E.milGold))}${line(`Research budget (${bud(n).res}%)`, sgn(-E.resGold))}${E.prodGold ? line(`Production (${bud(n).prod}%)`, sgn(-E.prodGold)) : ""}${E.travelGold ? line(`Travel (${bud(n).travel}%)`, sgn(-E.travelGold)) : ""}${E.subGold ? line(`Subsidies (${bud(n).sub}%)`, sgn(-E.subGold)) : ""}${E.incGold ? line(WELFARE.inc.lv[bud(n).inc], sgn(-E.incGold)) : ""}${E.healthGold ? line(WELFARE.health.lv[bud(n).health], sgn(-E.healthGold)) : ""}
    ${E.acadUp ? line("Academies upkeep", sgn(-E.acadUp)) : ""}${E.sciPay ? line(`Scientists' pay (${fmtP(n.scientists)})`, sgn(-E.sciPay)) : ""}${E.offPay ? line(`Officers' pay (${fmtP(n.officers)})`, sgn(-E.offPay)) : ""}
    ${line("Building upkeep", sgn(-E.bUp))}${E.imports ? line("Resource imports", sgn(-E.imports)) : ""}${E.govUp ? line("Overextension costs", sgn(-E.govUp), "bad") : ""}
    ${line("Net gold", sgn(E.goldNet), E.goldNet < 0 ? "bad total" : "good total")}
    ${line("Materials", sgn(E.mat))}${line("Science", sgn(E.sci))}${line("Food", `${fmtP(E.food)} grown / ${fmtP(E.need)} eaten`, E.surplus < 0 ? "bad" : "")}</div>`;
  h += `<div class="card"><h4>Trade & Resources <span class="pill">Run by your merchants</span></h4>
    <p class="muted small">Your merchants trade on their own. Towns, cities, Harbors, Roads, Markets, trade pacts and the Trade law all earn more.</p>
    ${line("Trade partners (pacts)", E.partners.length ? E.partners.map(o => esc(o.name)).join(", ") : "None")}
    ${line("Friendly contacts", E.peaceful)}
    ${line("Luxuries reached", Object.keys(E.luxCount).length ? Object.entries(E.luxCount).map(([k, c]) => `${RES[k].icon}${c > 1 ? "×" + c : ""}`).join(" ") : "None")}
    ${E.strat.map(s => line(`${RES[s.res].icon} ${RES[s.res].name} for the army`, s.st === "have" ? '<span class="good">Own supply</span>' : s.st === "import" ? `<span class="warn">Imported from ${esc(s.from.name)} (−${s.cost}🪙)</span>` : `<span class="bad">Missing${s.pen ? ` (−${s.pen * 100}% army)` : ""}</span>`)).join("")}</div>`;
  h += `<div class="card"><h4>Army</h4>
    ${line("Regiments", `${n.army} / ${ma} max`)}${line("Strength per regiment", fmt(unitPower(n)))}${line("Total strength", fmt(power(n)))}${line("Ready to fight", Math.floor(n.army - (n.used || 0)))}
    ${line("Budget pays for", `${E.armyTarget} regiments`)}
    <p class="muted small">Your army's size follows your military budget: each regiment costs ${fmt(unitUpkeep(n) * TD)} gold a quarter, and new ones need ${fmt(uc.m)} 🪵 to equip. Bigger populations and the Conscription law raise your manpower limit.</p></div>`;
  h += `<div class="card"><h4>Paths to victory</h4>
    ${line("🚀 Reach Mars (research Mars Colony)", has(n, "rocketry") ? (lv(n, "marsmission") >= 3 ? "Mars Mission ready" : "Develop the Space field") : ERAS[n.era])}
    ${line("🌍 Control 40% of the world", `${terr.length} / ${Math.ceil(NR * .4)} territories`)}
    ${line("⌛ Lead the world in 2100", `#${ranking().findIndex(x => x.id === n.id) + 1} by score`)}</div>`;
  h += `<div class="card"><h4>Your settlements</h4><div class="rlist">${sets.sort((a, b) => b.t - a.t || b.pop - a.pop).slice(0, 60).map(s => `<button class="rl" data-act="goto" data-sid="${s.id}"><span>${TIERS[s.t].icon} ${s.id === n.cap ? "⭐ " : ""}${esc(s.name)}</span><small>${esc(W.regions[s.r].n)} · ${fmtP(s.pop)}${s.crowd ? ' · <span class="bad">overcrowded</span>' : ""}${s.u > 50 ? ' · <span class="bad">unrest</span>' : ""}</small></button>`).join("")}</div></div>`;
  h += `<div class="card"><h4>Game</h4><div class="row wrap"><button class="btn small ghost" data-act="help">How to play</button><button class="btn small ghost" data-act="newgame">New game</button></div></div>`;
  return h;
}
function panelDevelop() {
  const n = P(); let h = ph("Develop", "Set up fields, then expand them. Level 3 opens the next stage.");
  const miss = fieldsMissing(n);
  if (miss.length && n.era < 7) h += `<p class="note">To enter the ${ERAS[n.era + 1]}, each field needs ${2 + 2 * n.era} levels (or all its unlocked stages full). Still short: ${miss.map(c => `${c.icon} ${esc(c.name)} ${chainHave(n, c)}/${chainNeed(n, c)}`).join(", ")}.</p>`;
  h += `<p class="small muted">Tip: tap one of your cities on the map to make it emphasize a field. Your capital can do this as soon as it's a town.</p>`;
  for (const c of CHAINS) {
    const total = c.f.reduce((a, [k]) => a + lvValue(lv(n, k)) * FIELDS[k].mult, 0);
    const effTxt = Object.entries(c.eff).filter(([k]) => total).map(([k, v]) => { const x = v * total; return k === "stab" ? `+${Math.round(x)} stability` : k === "admin" ? `+${Math.round(x)} admin` : k === "recruit" ? `+${Math.round(x)} regiment${Math.round(x) === 1 ? "" : "s"}` : `+${Math.round(x * 100)}% ${({ food: "food", cap: "town room", prod: "materials", pow: "army", def: "defense", trade: "trade", gold: "gold", sci: "science", grow: "growth" })[k]}`; }).join(" · ");
    const par = c.parent ? FIELDS[c.parent] : null;
    if (par && lv(n, par.k) < FIELD_NEXT && !c.f.some(([k]) => lv(n, k))) {
      if (CHAINS.find(x => x.parent === c.parent) === c) h += `<div class="card fcard branch locked-b"><h4><span>🌿</span> Branches of ${par.name}</h4><p class="small muted">At level ${FIELD_NEXT}, ${par.name} splits into ${CHAINS.filter(x => x.parent === c.parent).map(x => x.icon + " " + x.name).join(", ")}.</p></div>`;
      continue;
    }
    const em = emph(n, c.k), emTxt = em.cap || em.cities ? `<p class="emtag">Emphasized by ${[em.cap ? "your capital" : "", em.cities ? `${em.cities} cit${em.cities === 1 ? "y" : "ies"}` : ""].filter(Boolean).join(" and ")}: ×${emphMult(n, c.k).toFixed(2)} bonuses, up to ${reachAhead(n, c.k)} age${reachAhead(n, c.k) > 1 ? "s" : ""} ahead</p>` : "";
    const need = chainNeed(n, c), have = chainHave(n, c);
    h += `<div class="card fcard ${par ? "branch" : ""}">${par ? `<div class="from">🌿 Branch of ${par.name}</div>` : ""}<h4><span>${c.icon}</span> ${c.name}${n.era < 7 && need ? ` <span class="pill ${have >= need ? "good" : ""}">${Math.min(have, need)}/${need} for next age</span>` : ""}</h4><p class="small muted">${total ? effTxt : "Boosts " + c.d + "."}</p>${emTxt}<div class="stages">`;
    let shown = 0;
    for (const [k] of c.f) {
      const f = FIELDS[k], L = lv(n, k), open = fieldOpen(n, f);
      if (!open && !L) {
        if (shown) { const why = f.prev && lv(n, f.prev) < FIELD_NEXT ? `Reach level ${FIELD_NEXT} in ${FIELDS[f.prev].name}` : ""; const tw = f.tier > n.era + reachAhead(n, c.k) ? `reach the ${ERAS[f.tier - reachAhead(n, c.k)]} (or emphasize this field in a city)` : f.tech && !has(n, f.tech) ? `research ${TECH[f.tech].name}` : "";
          h += `<div class="stage locked"><b>🔒 ${f.name}</b><small>${(t => t.charAt(0).toUpperCase() + t.slice(1))([why, tw].filter(Boolean).join(" and ") || "Locked")}</small></div>`; }
        else h += `<div class="stage locked"><b>🔒 ${f.name}</b><small>${f.tech && !has(n, f.tech) ? `Research ${TECH[f.tech].name}` : "Locked"}</small></div>`;
        break;
      }
      shown++;
      const c2 = fieldCost(n, f), maxed = L >= FIELD_MAX;
      h += `<div class="stage"><div class="st-row"><b>${f.name}</b><span class="pips">${Array.from({ length: FIELD_MAX }, (_, i) => `<i class="${i < L ? "on" : ""} ${i === FIELD_NEXT - 1 ? "key" : ""}"></i>`).join("")}</span></div>
        ${maxed ? (L > FIELD_MAX ? `<small class="good">Mastery level ${L}/${MASTERY_MAX}${masteryOk(n, f) ? "" : " · frozen (next stage set up)"}</small>` : `<small class="good">Fully expanded${masteryOk(n, f) ? ". Keep deepening it through research (Research tab)." : ""}</small>`) : `<button class="btn small" data-act="field" data-k="${k}" ${afford(n, c2) ? "" : "disabled"}>${L ? `Expand to level ${L + 1}` : "Set up"} · ${costTxt(c2)}</button>`}</div>`;
    }
    h += `</div></div>`;
  }
  return h;
}
function panelMilitary() {
  const n = P(), E = econM(n), uc = unitCost(n), ma = maxArmy(n), C = cmd(n);
  let h = ph("Army", `${n.army} regiments · strength ${fmt(power(n))}`);
  // command structure
  h += `<div class="card"><h4>${C.icon} Command: ${C.name}</h4><p class="small muted">${C.d}</p>`;
  if (n.cmd === "supreme" && n.commander) { const cm = n.commander, eff = supremeMult(n);
    h += `<div class="ln me"><span>Supreme Commander ${esc(cm.name)}</span><b>${"★".repeat(cm.skill)}${"☆".repeat(5 - cm.skill)} · <span class="${eff < 0 ? "bad" : "good"}">${eff >= 0 ? "+" : ""}${Math.round(eff * 100)}% army</span></b></div>`; }
  h += `<p class="small muted">${n.cmd === "supreme" && n.commander ? `Serves about ${durTxt(n.commander.left)} more; the army, not you, chooses the successor. ` : ""}${cmdLocked(n) ? `Locked in until ${yearTxt(n.cmdUntil)}.` : `Any structure you choose is locked in for ${CMD_YEARS} years.`}</p><div class="govs">`;
  for (const [k, c] of Object.entries(CMDS)) { const un = !c.tech || has(n, c.tech);
    h += `<button class="gov ${n.cmd === k || (!n.cmd && k === "chiefs") ? "cur" : ""}" data-act="cmd" data-k="${k}" ${(n.cmd || "chiefs") === k || !un || cmdLocked(n) ? "disabled" : ""}><b>${c.icon} ${c.name}</b><small>${c.d}</small><span class="tc">${(n.cmd || "chiefs") === k ? "Current" : !un ? `Needs ${TECH[c.tech].name}` : cmdLocked(n) ? `Locked until ${yearTxt(n.cmdUntil)}` : "Reorganize"}</span></button>`; }
  h += `</div></div>`;
  // regiments
  const parts = [["Age of " + ERAS[n.era], ERA_POW[n.era]]];
  h += `<div class="card"><h4>Regiments</h4>
    ${line("Regiments", `${n.army} / ${ma} max`)}${line("Ready to fight", Math.floor(n.army - (n.used || 0)))}
    ${line("Strength per regiment", fmt(unitPower(n)))}${line("Attack bonus (generals & command)", `+${Math.round((attackMult(n) - 1) * 100)}%`)}${line("Defense bonus", `+${Math.round((defMult(n) - 1) * 100)}%`)}
    ${line("Total strength", fmt(power(n)))}
    ${line(`Military budget (${bud(n).mil}%)`, `${fmt(E.milGold)} 🪙`)}${line("Budget pays for", `${E.armyTarget} regiments${E.armyTarget !== n.army ? ` <span class="${E.armyTarget > n.army ? "good" : "bad"}">(${E.armyTarget > n.army ? "raising" : "standing down"} ${Math.abs(E.armyTarget - n.army)})</span>` : ""}`)}
    ${line(`Quality (${bud(n).qual}% of the budget)`, `<span class="good">+${Math.round((qualMult(E.milQual) - 1) * 100)}% per regiment</span>`)}${E.milFund < 1 ? line("Underpaid", `<span class="bad">${Math.round((milMult(E.milFund) - 1) * 100)}% strength</span>`) : ""}
    <p class="muted small">New regiments need ${fmt(uc.m)} 🪵 each to equip.</p></div>`;
  h += `<div class="card"><h4>🛡️ Spending the military budget</h4><p class="small muted">Your yearly budget gives the army ${bud(n).mil}% of gross income (${fmt(E.milGold)} 🪙 a quarter). Split it between more regiments and better ones.</p>${armyBudgetHTML(n)}<div class="row wrap"><button class="btn small ghost" data-act="budget">📒 Change the military share</button></div></div>`;
  // generals
  const gens = (n.generals || []).slice().sort((a, b) => b.skill - a.skill), best = bestGeneral(n);
  h += `<div class="card"><h4>🎖️ Officers & generals</h4>
    <div class="tiers two"><div><span>🎖️</span><b>${fmtP(n.officers || 0)}</b><small>Officer power</small></div><div><span>⭐</span><b>${generalPower(n)}</b><small>General power</small></div></div>
    ${line("Officers", `+${Math.round(officerBonus(n) * 100)}% army strength`)}${line("Generals", `+${Math.round(genBonus(n) * 100)}% attack`)}
    <p class="small muted">Each officer adds +${(perOfficer(n) * 100).toFixed(1)}% strength; each general's star adds +${Math.round((cmd(n).gen || 1) * 100) / 100}% attack. Military academies graduate +${fmt(offGradRate(n) * TD * TPY)} officers a year and a few retire. Each officer is paid ${fmt(offSalary(n) * TD)} 🪙 a quarter.</p>
    ${gens.length ? `<details><summary class="small"><b>${gens.length} general${gens.length > 1 ? "s" : ""}</b></summary>${gens.map(g => `<div class="ln"><span>General ${esc(g.name)} <small class="muted">from ${esc(g.from)}</small></span><b>${"★".repeat(g.skill)}${"☆".repeat(5 - g.skill)} · ${durTxt(g.left)}</b></div>`).join("")}</details>` : `<p class="small muted">No generals yet. Military academies graduate them over time.</p>`}</div>`;
  // military academies
  const lim = milAcadLimit(n), cnt = milAcadCount(n), sites = setsOf(n).filter(x => canAcad(n, x));
  h += `<div class="card"><h4>🏰 Military academies <span class="pill">${cnt}/${lim}</span></h4><p class="small muted">Graduate officers (more in bigger cities) and, now and then, a general. You can run 1 plus 1 for every 6 units of nation size.${has(n, "bronze") ? "" : " Needs Bronze Working."}</p>`;
  if (!sites.length) h += `<p class="small muted">Only cities (and your capital once it's a town) can host academies.</p>`;
  for (const x of sites) { const c = milAcadCost(n);
    h += `<div class="ln"><span>${x.id === n.cap ? "⭐ " : ""}${esc(x.name)} <small class="muted">${fmtP(x.pop)}</small></span><b>${x.mil ? `✓ <button class="btn small ghost" data-act="milclose" data-s="${x.id}">Close</button>` : `<button class="btn small" data-act="milacad" data-s="${x.id}" ${has(n, "bronze") && cnt < lim && afford(n, c) ? "" : "disabled"}>Found · ${costTxt(c)}</button>`}</b></div>`; }
  h += `</div>`;
  return h;
}
function panelResearch() {
  const n = P(), E = econM(n);
  let h = ph("Research", `${fmt(E.sci)} science a quarter · ${ERAS[n.era]}`);
  { const links = knowledgeLinks(n), big = links.filter(x => x.w === 1).length;
    h += `<p class="small muted">Your research budget (${Math.round(budgetPct(n) * 100)}% of income, set in your budget) adds ${fmt(E.resSci)} science a quarter. Technologies your neighbors and allies already know are cheaper${links.length ? `: you learn from ${links.length} ${links.length === 1 ? "people" : "peoples"}${big ? `, ${big} larger than you` : ""}` : ""}.</p>`; }
  if (n.era < 7) { const got = eraTechs(n.era).filter(t => has(n, t.id)).length, miss = fieldsMissing(n);
    h += `<div class="card"><div class="bar-row"><small>Next age</small><div class="bar"><i style="width:${Math.min(100, got / eraNeed(n.era) * 100)}%;background:var(--accent)"></i></div><span>${got}/${eraNeed(n.era)}</span></div><p class="muted small">To enter the ${ERAS[n.era + 1]}: discover ${eraNeed(n.era)} technologies of the ${ERAS[n.era]} and bring every field to ${2 + 2 * n.era} levels.</p>${miss.length ? `<p class="small"><b class="warn">Fields still short:</b> ${miss.map(c => `${c.icon} ${esc(c.name)} ${chainHave(n, c)}/${chainNeed(n, c)}`).join(", ")} (see Develop)</p>` : `<p class="small good">✓ Every field is developed enough</p>`}</div>`; }
  { const rate = +(3 * Math.pow(1.3, n.era)).toFixed(1), fg = Math.round(40 * Math.pow(1.7, n.era)), fs = Math.round(fg / rate);
    h += `<div class="card"><h4>Fund your scientists</h4><p class="muted small">Turn spare gold into research. ${rate} gold buys 1 science.</p><div class="row wrap">${[1, 4].map(k => `<button class="btn small" data-act="fund" data-g="${fg * k}" data-s="${fs * k}" ${n.gold >= fg * k ? "" : "disabled"}>🪙${fmt(fg * k)} → 🔬${fmt(fs * k)}</button>`).join("")}</div></div>`; }
  { const sites = setsOf(n).filter(x => canAcad(n, x));
    h += `<div class="card"><h4>🎓 Scientists</h4><div class="tiers two"><div><span>🧑‍🔬</span><b>${fmtP(n.scientists || 0)}</b><small>Scientists</small></div><div><span>📈</span><b>+${Math.round(scientistBoost(n) * 100)}%</b><small>Research</small></div></div><p class="small muted">Each scientist adds +${(perScientist(n) * 100).toFixed(1)}% research${n.cul === "scholarly" ? " (Scholarly culture)" : ""}. Academies and universities graduate +${fmt(sciGradRate(n) * TD * TPY)} a year, more in bigger cities, and a few retire. Each scientist is paid ${fmt(sciSalary(n) * TD)} 🪙 a quarter, and academies cost upkeep: you can't afford everything.${has(n, "writing") ? "" : " Academies need Writing."}</p>`;
    if (!sites.length) h += `<p class="small muted">Only cities (and your capital once it's a town) can host academies.</p>`;
    for (const x of sites) { const lvl = x.acad || 0, c = acadCost(n, lvl + 1), can = lvl === 0 ? has(n, "writing") : lvl === 1 ? has(n, "printing") : false;
      h += `<div class="ln"><span>${x.id === n.cap ? "⭐ " : ""}${esc(x.name)} <small class="muted">${lvl === 2 ? "University" : lvl === 1 ? "Academy" : "No academy"}</small></span><b>${lvl < 2 ? `<button class="btn small" data-act="acad" data-s="${x.id}" ${can && afford(n, c) ? "" : "disabled"} title="${lvl === 1 && !has(n, "printing") ? "Needs Printing Press" : ""}">${lvl === 0 ? "Found" : "→ University"} · ${costTxt(c)}</button>` : ""}${lvl ? ` <button class="btn small ghost" data-act="acadclose" data-s="${x.id}">Close</button>` : ""}</b></div>`; }
    h += `</div>`; }
  h += `<label class="toggle"><input type="checkbox" id="autoR" ${n.autoResearch ? "checked" : ""}> Let advisors pick the next research automatically</label>`;
  { const dv = []; for (const c of fieldsMissing(n)) for (const [k] of c.f) { const f = FIELDS[k]; if (devOk(n, f)) dv.push(f); }
    if (dv.length) {
      h += `<details class="past" ${String(n.research || "").startsWith("d:") || !chooseTech(n) ? "open" : ""}><summary class="era-h">Develop fields with research</summary><p class="small muted">Fields still short for the next age can be developed with science instead of gold and materials.</p><div class="techs">`;
      for (const f of dv) { const cur = n.research === "d:" + f.k, dc = devSciCost(n, f), pct = cur ? Math.min(100, n.sciPts / dc * 100) : 0;
        h += `<button class="tech ${cur ? "cur" : ""}" data-act="tech" data-t="d:${f.k}"><b>${f.chain.icon} ${f.name}</b><small>Level ${lv(n, f.k)} → ${lv(n, f.k) + 1} · ${esc(f.chain.name)} ${chainHave(n, f.chain)}/${chainNeed(n, f.chain)}</small><span class="tc">${cur ? `${Math.floor(pct)}% · ${etaTxt(dc - n.sciPts, E.sci)}` : `${fmt(dc)} 🔬`}</span>${cur ? `<i class="tp" style="width:${pct}%"></i>` : ""}</button>`; }
      h += `</div></details>`;
    }
  }
  { const ms = Object.values(FIELDS).filter(f => masteryOk(n, f)).sort((a, b) => masteryCost(n, a) - masteryCost(n, b));
    if (ms.length) {
      h += `<details class="past" ${String(n.research || "").startsWith("m:") || !chooseTech(n) ? "open" : ""}><summary class="era-h">Field mastery (levels 6-50)</summary><p class="small muted">Keep deepening a field you've fully expanded. Each level adds less than the last, and level 50 equals level 5 of the next stage. Mastery stops once you set up that field's next stage.</p><div class="techs">`;
      for (const f of ms) { const cur = n.research === "m:" + f.k, mc = masteryCost(n, f), pct = cur ? Math.min(100, n.sciPts / mc * 100) : 0;
        h += `<button class="tech ${cur ? "cur" : ""}" data-act="tech" data-t="m:${f.k}"><b>${f.chain.icon} ${f.name}</b><small>Level ${lv(n, f.k)} → ${lv(n, f.k) + 1} of ${MASTERY_MAX}</small><span class="tc">${cur ? `${Math.floor(pct)}% · ${etaTxt(mc - n.sciPts, E.sci)}` : `${fmt(mc)} 🔬`}</span>${cur ? `<i class="tp" style="width:${pct}%"></i>` : ""}</button>`; }
      h += `</div></details>`;
    }
  }
  const ahead = Math.max(1, ...CHAINS.map(c => reachAhead(n, c.k)));
  const order = Array.from({ length: ahead + 1 }, (_, i) => n.era + i).filter(e => e <= 7);
  for (let e = n.era - 1; e >= 0; e--) order.push(e);
  for (const e of order) {
    if (e === n.era - 1) h += `<details class="past"><summary class="era-h">Earlier ages</summary>`;
    h += `<h4 class="era-h">${ERAS[e]}${e === n.era ? " · now" : e === n.era + 1 ? " · next" : " · ahead"}</h4><div class="techs">`;
    for (const t of TECHS.filter(t => t.era === e)) {
      const done = has(n, t.id), cur = n.research === t.id, early = e > n.era && e <= n.era + techAhead(n, t), locked = (e > n.era && !early) || (t.id === "mars" && lv(n, "marsmission") < 3);
      const tc = techCost(n, t), pct = cur ? Math.min(100, n.sciPts / tc * 100) : 0;
      h += `<button class="tech ${done ? "done" : cur ? "cur" : locked ? "locked" : ""}" data-act="tech" data-t="${t.id}" ${done || locked ? "disabled" : ""}>
        <b>${t.name}</b><small>${t.desc}</small><span class="tc">${done ? "✓ Known" : cur ? `${Math.floor(pct)}% · ${etaTxt(tc - n.sciPts, E.sci)}` : locked ? (e > n.era ? (techChains(t.id).length ? "Later age (or emphasize its field)" : "Later age") : "Needs Mars Mission 3") : `${tc}${tc < t.cost ? ` <s>${t.cost}</s>` : ""} 🔬${diffusion(n, t) ? ` · ${Math.round(diffusion(n, t) * 100)}% from neighbors` : ""}${early ? " · reaching ahead" : ""}`}</span>${cur ? `<i class="tp" style="width:${pct}%"></i>` : ""}</button>`;
    }
    h += `</div>`;
  }
  if (n.era > 0) h += `</details>`;
  return h;
}
function panelPolicy() {
  const n = P(), E = econ(n), tg = facTargets(n, E);
  let h = ph("Government & Laws", `Stability ${Math.round(n.stab)} · ${GOVS[n.gov].name} · ${cul(n).icon} ${cul(n).name} culture`);
  { const C1 = cul(n);
    h += `<div class="card"><h4>${C1.icon} ${C1.name} culture</h4><p class="small muted">${C1.d}</p><p class="small muted">Culture changes slowly. Shifting it causes ${durTxt(8)} of upheaval and can only happen every ${durTxt(30)}.</p><div class="seg">${Object.entries(CULTURES).map(([k, c]) => `<button class="${n.cul === k ? "on" : ""}" data-act="cul" data-c="${k}" ${n.cul === k || n.culCool > 0 ? "disabled" : ""}>${c.icon} ${c.name}</button>`).join("")}</div>${n.culCool > 0 ? `<p class="small muted">Next shift possible in ${durTxt(n.culCool)}.</p>` : ""}</div>`; }
  if (n.opposition) h += `<p class="note warn">The opposition controls the legislature for ${durTxt(n.opposition)} more. Laws are locked.</p>`;
  if (n.anarchy) h += `<p class="note warn">Your government is in transition (${durTxt(n.anarchy)}). Output is reduced.</p>`;
  h += `<div class="card"><h4>Factions <span class="muted">who holds sway</span></h4>`;
  for (const k in FACTIONS) {
    if (!facActive(n, k)) continue; const f = FACTIONS[k], v = n.fac[k], t = tg[k];
    const why = t ? t.why.filter(w => w[1]).map(w => `${esc(w[0])} ${w[1] > 0 ? "+" : ""}${Math.round(w[1])}`).join(" · ") : "";
    h += `<details class="fac"><summary><span class="fi">${f.icon}</span><span class="fn">${f.name(n.era)} <small>influence ×${GOVS[n.gov].w[k] || 1}</small></span><span class="bar"><i style="width:${v}%;background:${v > 60 ? "var(--good)" : v > 35 ? "var(--warn)" : "var(--bad)"}"></i></span><b>${Math.round(v)}</b></summary><p class="small muted">Heading toward ${Math.round(t ? t.v : 50)}. ${why || "No strong feelings."}</p></details>`;
  }
  h += `</div>`;
  const locked = n.opposition > 0;
  h += `<div class="card"><h4>Government</h4><p class="muted small">How you rule. Your rank (Tribe, Nation, Kingdom, Empire) comes from how many territories you control.</p><div class="govs">`;
  for (const g in GOVS) {
    const G2 = GOVS[g], un = !G2.tech || has(n, G2.tech);
    if (!un && TECH[G2.tech].era > n.era + 1) continue;
    h += `<button class="gov ${g === n.gov ? "cur" : ""}" data-act="gov" data-g="${g}" ${g === n.gov || !un || n.govCool > 0 || locked ? "disabled" : ""}><b>${G2.name}</b><small>${G2.d}</small><span class="tc">${g === n.gov ? "Current" : !un ? `Needs ${TECH[G2.tech].name}` : n.govCool > 0 ? `Wait ${n.govCool} turns` : "Switch (2 turns of turmoil)"}</span></button>`;
  }
  h += `</div></div>`;
  for (const lk in LAWS) {
    const L = LAWS[lk]; if (L.tech && !has(n, L.tech)) continue;
    if (!L.opts[n.laws[lk]]) n.laws[lk] = lk === "rp" ? ({ bal: "std", sch: "high", acad: "max" }[n.laws[lk]] || "std") : Object.keys(L.opts)[0];
    h += `<div class="card"><h4>${L.name}</h4><div class="seg">`;
    for (const ok in L.opts) { const [nmx, tech, d] = L.opts[ok]; const un = !tech || has(n, tech);
      h += `<button class="${n.laws[lk] === ok ? "on" : ""}" data-act="law" data-l="${lk}" data-o="${ok}" ${!un || locked ? "disabled" : ""} title="${esc(d)}">${nmx}${!un ? " 🔒" : ""}</button>`; }
    h += `</div><p class="small muted">${esc(L.opts[n.laws[lk]][2])}</p></div>`;
  }
  return h;
}
function panelWorld() {
  const n = P();
  let h = ph("World", "Peoples you have met");
  if (G.pendingPeace) { const o = G.nations[G.pendingPeace.from]; if (o && o.alive && atWar(n.id, o.id)) {
    const pp = G.pendingPeace; h += `<div class="card offer"><h4>🕊️ Peace offer from the ${esc(nm(o))}</h4><p>${pp.tribute ? (pp.payer === n.id ? `They demand ${fmt(pp.tribute)} gold from you.` : `They will pay you ${fmt(pp.tribute)} gold.`) : "They offer an even peace."}</p><div class="row"><button class="btn ghost small" data-act="peaceNo">Refuse</button><button class="btn small" data-act="peaceYes" ${pp.payer === n.id && n.gold < pp.tribute ? "disabled" : ""}>Accept</button></div></div>`;
  } else G.pendingPeace = null; }
  const met = G.nations.filter(o => o.alive && o.id !== n.id && dip(n.id, o.id).met).sort((a, b) => score(b) - score(a));
  if (!met.length) h += `<p class="note">You haven't met anyone yet. Spread your villages or research Sailing to find your neighbors.</p>`;
  for (const o of met) { const d = dip(n.id, o.id);
    h += `<button class="nat" data-act="nat" data-id="${o.id}"><span class="sw big" style="background:${o.color}"></span><span class="nt"><b>${esc(nm(o))}</b><small>${ERAS[o.era]} · ${fmtP(popOf(o))} people · ${terrCount(o)} territor${terrCount(o) === 1 ? "y" : "ies"} · ${PERS[o.pers]}</small></span><span class="ns">${d.war ? '<span class="pill bad">War</span>' : d.ally ? '<span class="pill good">Ally</span>' : d.trade ? '<span class="pill">Trade</span>' : ""}<small>${relWord(d.rel)}</small></span></button>`; }
  const rk = ranking();
  h += `<div class="card"><h4>World ranking</h4>${rk.slice(0, 10).map((o, i) => `<div class="ln ${o.id === n.id ? "me" : ""}"><span>${i + 1}. <span class="sw" style="background:${o.color}"></span> ${o.id === n.id || dip(n.id, o.id).met ? esc(o.name) : "Unknown people"}</span><b>${score(o)}</b></div>`).join("")}</div>`;
  return h;
}
const relWord = v => v > 60 ? "Friendly 😊" : v > 20 ? "Warm 🙂" : v > -20 ? "Neutral 😐" : v > -60 ? "Cold 😠" : "Hostile 😡";
function aiAccept(o, kind, n) {
  const d = dip(n.id, o.id), ratio = power(n) / Math.max(1, power(o));
  if (kind === "trade") return d.rel + (o.pers === "trader" ? 25 : 0) - n.warmonger > -5;
  if (kind === "ally") return d.rel - n.warmonger > 45 && ratio > .5;
  if (kind === "peace") return wscore(o.id, n.id) < -6 || G.tt - d.wt > 8 && wscore(o.id, n.id) < 8 || ratio > 1.8;
  if (kind === "tribute") return ratio > 1.6 && d.rel < 40 + ratio * 10;
  return false;
}
function openNationDetail(id) {
  const n = P(), o = G.nations[id], d = dip(n.id, id);
  closeSheet(); curPanel = "world";
  const g = Math.round(12 * Math.pow(1.6, n.era)), trib = Math.round(20 * Math.pow(1.6, o.era));
  let h = ph(`<span class="sw big" style="background:${o.color}"></span> ${esc(nm(o))}`, `${GOVS[o.gov].name} · ${ERAS[o.era]} · ${cul(o).icon} ${cul(o).name} culture`);
  h += `<button class="btn ghost small back" data-act="world">← All peoples</button>`;
  h += `<div class="card">${line("Relations", `${Math.round(d.rel)} · ${relWord(d.rel)}`)}${line("People", fmtP(popOf(o)))}${line("Territories", terrCount(o))}${line("Settlements", setsOf(o).length)}${line("Army strength", `${fmt(power(o))} (yours ${fmt(power(n))})`)}${line("Technologies", `${o.techs.length} (yours ${n.techs.length})`)}${line("Status", d.war ? `At war · score ${Math.round(wscore(n.id, o.id))}` : d.ally ? "Allied" : d.trade ? "Trade pact" : d.truce > 0 ? `Truce (${d.truce} turns)` : "Peace")}</div>`;
  h += `<div class="opts">`;
  if (d.war) {
    h += `<button class="opt" data-act="dPeace" data-id="${id}"><span class="oi">🕊️</span><span class="ot"><b>Propose peace</b><small>${aiAccept(o, "peace", n) ? "They seem willing" : "They are unlikely to accept"}</small></span></button>`;
    if (wscore(n.id, id) > 10) h += `<button class="opt" data-act="dPeaceT" data-id="${id}"><span class="oi">💰</span><span class="ot"><b>Peace for ${fmt(trib)} gold tribute</b><small>You are winning</small></span></button>`;
  } else {
    h += `<button class="opt" data-act="dGift" data-id="${id}" ${n.gold >= g ? "" : "disabled"}><span class="oi">🎁</span><span class="ot"><b>Send a gift</b><small>Improve relations</small></span><span class="oc">${costTxt({ g, m: 0 })}</span></button>`;
    if (!d.trade) h += `<button class="opt" data-act="dTrade" data-id="${id}"><span class="oi">📦</span><span class="ot"><b>Propose a trade pact</b><small>More trade income for both. ${aiAccept(o, "trade", n) ? "Likely yes" : "Likely no"}</small></span></button>`;
    else h += `<button class="opt" data-act="dTradeEnd" data-id="${id}"><span class="oi">✂️</span><span class="ot"><b>Cancel trade pact</b><small>Hurts relations</small></span></button>`;
    if (!d.ally) h += `<button class="opt" data-act="dAlly" data-id="${id}"><span class="oi">🤝</span><span class="ot"><b>Propose an alliance</b><small>Defend each other. ${aiAccept(o, "ally", n) ? "Likely yes" : "Needs friendlier relations"}</small></span></button>`;
    else h += `<button class="opt" data-act="dAllyEnd" data-id="${id}"><span class="oi">💔</span><span class="ot"><b>End the alliance</b><small>Hurts relations a lot</small></span></button>`;
    h += `<button class="opt" data-act="dTrib" data-id="${id}"><span class="oi">👊</span><span class="ot"><b>Demand ${fmt(trib)} gold tribute</b><small>${aiAccept(o, "tribute", n) ? "They fear you" : "They will likely refuse"}. Hurts relations.</small></span></button>`;
    const blocked = n.opposition > 0 ? "The opposition blocks war" : d.truce > 0 ? `Truce for ${durTxt(d.truce)} more` : !bordersTouch(n, o) ? "Your borders don't touch yet. Grow toward them first" : "";
    h += `<button class="opt war" data-act="dWar" data-id="${id}" ${blocked ? "disabled" : ""}><span class="oi">⚔️</span><span class="ot"><b>Declare war</b><small>${blocked || "Breaks treaties. Then attack their settlements from the map."}</small></span></button>`;
  }
  h += `</div>`;
  panel.innerHTML = h; panel.hidden = false; panel.scrollTop = 0;
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("on", t.dataset.p === "world"));
}
panel.addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (!b || b.disabled) return;
  const n = P(), a = b.dataset.act, id = +b.dataset.id, o = G.nations[id];
  switch (a) {
    case "pclose": closePanel(); break;
    case "budget": openBudget(false); break;
    case "goto": { const s = setById(+b.dataset.sid); closePanel(); sel = s.r; centerOn(s.x, s.y, Math.max(view.k, 7)); openRegion(s.r); break; }
    case "tech": n.research = b.dataset.t; n.resManual = /^[md]:/.test(b.dataset.t); refresh(); break;
    case "field": { const f = FIELDS[b.dataset.k]; if (f && afford(n, fieldCost(n, f))) { expandField(n, f); const msg = G.news.filter(x => /open/.test(x.t)).map(x => x.t); G.news = []; toast(msg[0] || `${f.name} level ${lv(n, f.k)}`); } refresh(); break; }
    case "acad": { const x = setById(+b.dataset.s), lvl = (x.acad || 0) + 1, c = acadCost(n, lvl); if (afford(n, c)) { n.gold -= c.g; n.mat -= c.m; x.acad = lvl; toast(lvl === 1 ? `Academy founded in ${x.name}` : `${x.name}'s academy is now a university`); } refresh(); break; }
    case "acadclose": { const x = setById(+b.dataset.s); confirmModal(`Close the ${x.acad === 2 ? "university" : "academy"} in ${x.name}?`, "You'll stop paying its upkeep, but it will stop graduating scientists. Rebuilding costs the full price.", () => { x.acad = 0; refresh(); }); break; }
    case "milclose": { const x = setById(+b.dataset.s); confirmModal(`Close the military academy in ${x.name}?`, "You'll stop paying its upkeep, but it will stop graduating officers and generals.", () => { x.mil = false; refresh(); }); break; }
    case "milacad": { const x = setById(+b.dataset.s), c = milAcadCost(n); if (afford(n, c) && milAcadCount(n) < milAcadLimit(n)) { n.gold -= c.g; n.mat -= c.m; x.mil = true; toast(`Military academy founded in ${x.name}`); } refresh(); break; }
    case "cmd": { const k = b.dataset.k;
      if (k === "supreme") {
        const gens = (n.generals || []).slice().sort((a, b2) => b2.skill - a.skill);
        showModal(`<div class="mi">🎖️</div><h2>Appoint a Supreme Commander</h2><p>The whole army will be only as good as this person: ★ −30%, ★★ −10%, ★★★ +10%, ★★★★ +25%, ★★★★★ +40% strength. You can't change your command structure for ${CMD_YEARS} years, and when this commander steps down the army picks the successor, not you.</p>
          <div class="choices">${gens.map((g, i) => `<button class="choice" data-m="g${i}"><b>General ${esc(g.name)} ${"★".repeat(g.skill)}${"☆".repeat(5 - g.skill)}</b><small>${CMDR_EFF[g.skill - 1] >= 0 ? "+" : ""}${Math.round(CMDR_EFF[g.skill - 1] * 100)}% army strength · from ${esc(g.from)}</small></button>`).join("")}
          <button class="choice" data-m="fav"><b>An unproven court favorite</b><small>Anywhere from ★ to ★★★★★. You'll only find out after the appointment.</small></button></div>
          <div class="row"><button class="btn ghost" data-m="no">Cancel</button></div>`, a => {
            if (!a || a === "no") return;
            const g = a === "fav" ? null : gens[+a.slice(1)];
            setCommand(n, "supreme", g); const cm = n.commander;
            log(`${cm.name} is now Supreme Commander (${"★".repeat(cm.skill)}).`, "🎖️");
            showModal(`<div class="mi">${cm.skill >= 4 ? "🏆" : cm.skill <= 2 ? "😬" : "🎖️"}</div><h2>${esc(cm.name)}</h2><p>${g ? "Your general takes supreme command." : "The court favorite takes command, and turns out to be..."}</p><p style="font-size:28px;text-align:center">${"★".repeat(cm.skill)}${"☆".repeat(5 - cm.skill)}</p><p style="text-align:center"><b>${CMDR_EFF[cm.skill - 1] >= 0 ? "+" : ""}${Math.round(CMDR_EFF[cm.skill - 1] * 100)}% army strength</b></p><div class="row"><button class="btn" data-m="ok">OK</button></div>`);
            refresh(); });
        break;
      }
      confirmModal(`Reorganize under ${CMDS[k].name}?`, `${CMDS[k].d} You can't change your command structure again for ${CMD_YEARS} years.`, () => { setCommand(n, k); log(`Your army is now organized under a ${CMDS[k].name}.`, CMDS[k].icon); refresh(); }); break; }
    case "fund": { const g = +b.dataset.g, sc = +b.dataset.s; n.gold -= g; n.sciPts += sc; toast(`+${fmt(sc)} science`); refresh(); break; }
    case "gov": confirmModal(`Switch to ${GOVS[b.dataset.g].name}?`, `Your people will go through ${durTxt(2)} of turmoil with reduced output, and factions will need time to adjust.`, () => { n.gov = b.dataset.g; n.anarchy = 2; n.govCool = 10; n.lastElect = G.turn; log(`Your people now live under a ${GOVS[n.gov].name}.`, "🏛️"); refresh(); }); break;
    case "cul": { const ck = b.dataset.c; confirmModal(`Shift to a ${CULTURES[ck].name} culture?`, `${CULTURES[ck].d} Your people will go through ${durTxt(8)} of upheaval, and you can't shift again for ${durTxt(30)}.`, () => { n.cul = ck; n.culCool = 30; n.culShift = 8; G.fv = (G.fv || 0) + 1; log(`Your people embrace a ${CULTURES[ck].name} culture.`, CULTURES[ck].icon); refresh(); }); break; }
    case "law": n.laws[b.dataset.l] = b.dataset.o; n.stab = stabilityOf(n, n.fac); refresh(); break;
    case "nat": openNationDetail(id); break;
    case "world": openPanel("world"); break;
    case "help": showHelp(); break;
    case "newgame": confirmModal("Start a new game?", "Your current people will be lost.", () => { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} G = null; closePanel(); showTitle(); }); break;
    case "peaceYes": { const pp = G.pendingPeace; makePeace(n, G.nations[pp.from], pp.tribute, G.nations[pp.payer] || null); G.pendingPeace = null; G.news = []; refresh(); break; }
    case "peaceNo": G.pendingPeace = null; refresh(); break;
    case "dGift": { const g = Math.round(12 * Math.pow(1.6, n.era)); n.gold -= g; dip(n.id, id).rel += 12; toast(`The ${o.name} appreciate your gift`); hud(); openNationDetail(id); break; }
    case "dTrade": if (aiAccept(o, "trade", n)) { dip(n.id, id).trade = true; toast("Trade pact signed!"); } else { toast(`The ${o.name} declined`); dip(n.id, id).rel -= 2; } hud(); openNationDetail(id); break;
    case "dTradeEnd": dip(n.id, id).trade = false; dip(n.id, id).rel -= 10; hud(); openNationDetail(id); break;
    case "dAlly": if (aiAccept(o, "ally", n)) { dip(n.id, id).ally = true; dip(n.id, id).trade = true; toast("Alliance formed!"); } else toast(`The ${o.name} declined`); hud(); openNationDetail(id); break;
    case "dAllyEnd": dip(n.id, id).ally = false; dip(n.id, id).rel -= 25; hud(); openNationDetail(id); break;
    case "dTrib": { const t = Math.round(20 * Math.pow(1.6, o.era)); if (aiAccept(o, "tribute", n) && o.gold >= t * .5) { const paid = Math.min(t, Math.max(0, o.gold)); o.gold -= paid; n.gold += paid; dip(n.id, id).rel -= 20; toast(`They paid ${fmt(paid)} gold`); } else { dip(n.id, id).rel -= 15; toast("They refused!"); } hud(); openNationDetail(id); break; }
    case "dWar": confirmModal(`Declare war on the ${nm(o)}?`, "Treaties break and other peoples will trust you less. Attack their settlements from the map.", () => { declareWar(n, o); G.news = []; refresh(); openNationDetail(id); }); break;
    case "dPeace": if (aiAccept(o, "peace", n)) { makePeace(n, o); G.news = []; toast("Peace!"); } else toast("They refused"); refresh(); openNationDetail(id); break;
    case "dPeaceT": { const t = Math.round(20 * Math.pow(1.6, o.era)); if (aiAccept(o, "peace", n) || wscore(n.id, id) > 20) { makePeace(n, o, Math.min(t, Math.max(0, o.gold)), o); G.news = []; toast("Peace with tribute!"); } else toast("They refused"); refresh(); openNationDetail(id); break; }
  }
});
[panel, modal].forEach(el => { el.addEventListener("input", budgetInput); el.addEventListener("click", welfareClick, true); el.addEventListener("change", e => { if (e.target.dataset && e.target.dataset.bud != null) { save(); if (e.target.dataset.bud === "qual" && curPanel === "army") refresh(); } if (e.target.id === "budAsk") P().budNoAsk = !e.target.checked; }); });
panel.addEventListener("change", e => { if (e.target.id === "autoR") { P().autoResearch = e.target.checked; if (e.target.checked && !P().research) P().research = chooseResearch(P()); refresh(); } });
document.querySelectorAll(".tab").forEach(t => t.onclick = () => { if (curPanel === t.dataset.p) closePanel(); else openPanel(t.dataset.p); });

// ---------- modals ----------
let modalCb = null;
function showModal(html, cb) { modal.querySelector(".mbox").innerHTML = html; modal.hidden = false; modalCb = cb || null; }
modal.addEventListener("click", e => { const b = e.target.closest("[data-m]"); if (!b || b.disabled) return; const a = b.dataset.m; const cb = modalCb; modal.hidden = true; modalCb = null; if (cb) cb(a); });
function confirmModal(title, text, yes) { showModal(`<h2>${esc(title)}</h2><p>${esc(text)}</p><div class="row"><button class="btn ghost" data-m="no">Cancel</button><button class="btn" data-m="yes">Confirm</button></div>`, a => { if (a === "yes") yes(); }); }
let toastT = 0;
function toast(t) { const el = $("toast"); el.textContent = t; el.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove("on"), 1900); }

// ---- simulate 10 years: a governor runs your nation and honors the focus and limits you set ----
const GOV_FOCUS = {
  bal:  { name: "Balanced", icon: "⚖️", pers: "builder", rp: "std", d: "A bit of everything." },
  grow: { name: "Grow & expand", icon: "🌱", pers: "builder", rp: "low", lawFocus: "grow", d: "Found villages, merge towns, spread out." },
  econ: { name: "Economy", icon: "💰", pers: "trader", rp: "std", d: "Trade, gold and industry." },
  sci:  { name: "Research", icon: "🔬", pers: "builder", rp: "high", lawFocus: "sci", d: "Fund scholars and academies." },
  mil:  { name: "Military", icon: "⚔️", pers: "aggressive", rp: "low", d: "A big army. With wars allowed, it may attack weaker neighbors." },
};
const SIM_TURNS = 10 * TPY;
let simState = null;
function governTurn(n, o) { // the governor plays this quarter as an AI would, then puts back whatever you told it to keep
  const F = GOV_FOCUS[o.focus] || GOV_FOCUS.bal;
  const keep = { gov: n.gov, anarchy: n.anarchy, govCool: n.govCool, laws: { ...n.laws }, budget: JSON.parse(JSON.stringify(bud(n))), cul: n.cul, cmd: n.cmd, commander: n.commander, cmdUntil: n.cmdUntil };
  const pers = n.pers;
  n.pers = F.pers; n.laws.rp = F.rp; n.noWar = !!o.peace;
  try { aiTurn(n); } finally { n.pers = pers; n.noWar = false; }
  if (o.keepGov) { n.gov = keep.gov; n.anarchy = keep.anarchy; n.govCool = keep.govCool; n.laws = keep.laws; n.cmd = keep.cmd; n.commander = keep.commander; n.cmdUntil = keep.cmdUntil; }
  else if (F.lawFocus && (F.lawFocus !== "sci" || has(n, "writing"))) n.laws.focus = F.lawFocus;
  if (o.keepBud) n.budget = keep.budget;
  if (o.keepCul) n.cul = keep.cul;
}
function openSim() {
  if (!G || G.over || G.demo || !P().alive || simState) return;
  const n = P(), o = G.simOpts || { focus: "bal", keepCul: true, keepGov: true, keepBud: false, peace: true, pauseWar: true };
  const chk = (k, t) => `<label class="askrow"><input type="checkbox" data-so="${k}" ${o[k] ? "checked" : ""}> ${t}</label>`;
  showModal(`<div class="mi">⏩</div><h2>Simulate 10 years</h2><p class="small">Your governor runs the nation for ${SIM_TURNS} quarters, following the focus you set. Events are decided for you. You can stop at any time.</p>
    <h4>Focus</h4><div class="choices">${Object.entries(GOV_FOCUS).map(([k, f]) => `<label class="choice simf"><input type="radio" name="simf" value="${k}" ${o.focus === k ? "checked" : ""}><b>${f.icon} ${f.name}</b><small>${f.d}</small></label>`).join("")}</div>
    <h4>Honor these</h4>${chk("keepCul", `Stay a ${cul(n).name} culture`)}${chk("keepGov", `Keep my government (${GOVS[n.gov].name}), laws and army command`)}${chk("keepBud", "Keep my budget exactly as I set it")}${chk("peace", "Don't start any new wars")}${chk("pauseWar", "Stop if someone declares war on me")}
    <div class="row"><button class="btn ghost" data-m="no">Cancel</button><button class="btn" data-m="go">Start</button></div>`, a => {
      if (a !== "go") return;
      const box = modal.querySelector(".mbox"), r = box.querySelector('input[name="simf"]:checked'), nw = { focus: r ? r.value : "bal" };
      box.querySelectorAll("[data-so]").forEach(c => nw[c.dataset.so] = c.checked);
      G.simOpts = nw; runSim(nw);
    });
}
function runSim(o) {
  const n0 = P(), start = { pop: popOf(n0), terr: terrCount(n0), era: n0.era, techs: n0.techs.length, gold: n0.gold, sets: setsOf(n0).length, army: n0.army, trust: n0.trust == null ? 100 : n0.trust, date: dateTxt() };
  const news = []; let turns = 0, stopped = null;
  const prevAuto = n0.autoResearch; n0.autoResearch = true;
  simState = { stop: false };
  closePanel(); closeSheet();
  showModal(`<div class="mi">⏩</div><h2>Simulating…</h2><p class="center" id="simDate">${dateTxt()}</p><div class="bar simbar"><i id="simBar" style="width:0%"></i></div><p class="small muted center">Focus: ${GOV_FOCUS[o.focus].icon} ${GOV_FOCUS[o.focus].name}</p><div class="row"><button class="btn ghost" data-m="stop">Stop</button></div>`, () => { if (simState) { simState.stop = true; stopped = stopped || "You stopped the simulation."; } });
  const finish = () => {
    if (!simState) return; simState = null;
    const n = P(); if (!prevAuto && n.id === n0.id) n.autoResearch = prevAuto || false;
    save(); hud(); dirty = true;
    const d = (a, b, f = fmt) => { const x = b - a; return `${f(b)} <small class="${x >= 0 ? "good" : "bad"}">(${x >= 0 ? "+" : "−"}${f(Math.abs(x))})</small>`; };
    const keepNews = news.filter(x => x.p === true || x.p === null || x.p === undefined).slice(-40);
    const pending = !!(G.pendingCivil || G.over);
    showModal(`<div class="mi">📜</div><h2>${start.date} → ${dateTxt()}</h2>${stopped ? `<p class="note warn">${esc(stopped)}</p>` : `<p class="small">Ten years have passed under your governor.</p>`}
      <div class="card">${line("People", d(start.pop, popOf(n), fmtP))}${line("Settlements", d(start.sets, setsOf(n).length, x => x))}${line("Territories", d(start.terr, terrCount(n), x => x))}${line("Technologies", d(start.techs, n.techs.length, x => x))}${line("Age", ERAS[n.era])}${line("Regiments", d(start.army, n.army, x => x))}${line("Gold", d(start.gold, n.gold))}${line("Public trust", d(start.trust, n.trust == null ? 100 : n.trust, x => Math.round(x)))}</div>
      ${keepNews.length ? `<details><summary class="small"><b>What happened (${keepNews.length})</b></summary><div class="news">${keepNews.map(x => `<div class="nw"><span>${x.i}</span><p>${esc(x.t)}</p></div>`).join("")}</div></details>` : ""}
      <div class="row">${pending ? "" : `<button class="btn ghost" data-m="again">⏩ 10 more years</button>`}<button class="btn" data-m="ok">Continue</button></div>`, a => {
        if (curPanel) refresh();
        if (G.over) return showEnd();
        if (G.pendingCivil) { G.lastReport = []; return afterTurnFlow(); }
        if (a === "again") runSim(o);
      });
  };
  const step = () => {
    if (!simState) return;
    if (simState.stop) return finish();
    if (turns >= SIM_TURNS || G.over || !P().alive) return finish();
    const me = P();
    try {
      governTurn(me, o);
      const before = new Set(G.nations.filter(x => x.alive && atWar(me.id, x.id)).map(x => x.id));
      endTurn(); turns++;
      for (const x of G.lastReport) if (x.p !== false) news.push(x);
      G.lastReport = [];
      if (G.event) { const e = EVENTS.find(x => x.id === G.event.id), i = Math.floor(rnd() * e.ch.length), c = e.ch[i]; G.news = []; c.f(P()); news.push({ i: e.icon, t: `${e.title}: your governor chose "${c.t}".`, p: true }); news.push(...G.news); G.news = []; G.event = null; P().stab = stabilityOf(P(), P().fac); }
      if (G.pendingPeace) { const pp = G.pendingPeace, f = G.nations[pp.from]; G.pendingPeace = null; if (f && f.alive && atWar(P().id, f.id)) { makePeace(P(), f, pp.tribute, G.nations[pp.payer] || null); news.push({ i: "🕊️", t: `Your governor accepted peace with the ${nm(f)}.`, p: true }); } }
      if (G.pendingCivil) { stopped = "Civil war broke out. You must choose a side."; return finish(); }
      const nw = G.nations.find(x => x.alive && atWar(P().id, x.id) && !before.has(x.id));
      if (nw && o.pauseWar) { stopped = `The ${nm(nw)} declared war on you.`; return finish(); }
    } catch (err) { stopped = "The simulation hit a problem and stopped."; console.error(err); return finish(); }
    const bar = document.getElementById("simBar"), dt = document.getElementById("simDate");
    if (bar) bar.style.width = (turns / SIM_TURNS * 100) + "%"; if (dt) dt.textContent = dateTxt();
    hud(); dirty = true;
    setTimeout(step, 0);
  };
  setTimeout(step, 30);
}
function afterTurnFlow() {
  hud(); dirty = true;
  if (G.over) return showEnd();
  const items = G.lastReport.filter(x => x.p !== false); G.lastReport = [];
  const askCivil = () => {
    const pc = G.pendingCivil; if (!pc) return false;
    const A = G.nations[pc.a], Bn = G.nations[pc.b];
    const sum = x => { const ss = setsOf(x); return `${ss.length} settlements · ${fmtP(ss.reduce((a, y) => a + y.pop, 0))} people · ${x.army} regiments · ${x.gold < 0 ? `debt ${fmt(-x.gold)}` : `${fmt(x.gold)} gold`} · ${GOVS[x.gov].name}`; };
    showModal(`<div class="mi">🔥</div><h2>Civil war</h2><p>Your people have lost all trust in the government's finances. The nation has split in two, and the two sides are at war. Which side will you lead?</p>
      <div class="choices"><button class="choice" data-m="a"><b>${A.color ? `<span class="sw" style="background:${A.color}"></span> ` : ""}Loyalists: ${esc(nm(A))}</b><small>Keep the capital and the government, and the debt. ${sum(A)}</small></button>
      <button class="choice" data-m="b"><b><span class="sw" style="background:${Bn.color}"></span> Rebels: ${esc(nm(Bn))}</b><small>A fresh start with a clean treasury and a new government. ${sum(Bn)}</small></button></div>`, a => {
        G.pendingCivil = null;
        if (a === "b") { A.ai = true; Bn.ai = false; Bn.autoResearch = true; G.player = Bn.id; reachCache.clear(); log(`You now lead the ${nm(Bn)}.`, "🚩"); const c = capSet(Bn); if (c) centerOn(c.x, c.y, Math.max(view.k, 6)); }
        save(); hud(); dirty = true; if (curPanel) refresh(); showEventAfterCivil(); });
    return true;
  };
  const askBudget = () => {
    const n = P(); if (!n.alive || n.budNoAsk || Math.floor((G.month || 0) / 3) !== 0) return false;
    openBudget(true);
    return true;
  };
  const askMastery = () => {
    const n = P(); if (!n.alive || chooseTech(n) || n.resManual) return;
    const dev = []; for (const c of fieldsMissing(n)) for (const [k] of c.f) { const f = FIELDS[k]; if (devOk(n, f)) dev.push(f); }
    const opts = Object.values(FIELDS).filter(f => masteryOk(n, f)).sort((a, b) => masteryCost(n, a) - masteryCost(n, b));
    if (!opts.length && !dev.length) return;
    const E = econM(n), turns = c => `about ${etaTxt(c - n.sciPts, E.sci)}`;
    showModal(`<div class="mi">🎓</div><h2>Choose what to study</h2><p>You've researched every technology your people can reach in the ${ERAS[n.era]}. Until you enter the ${ERAS[n.era + 1] || "next age"}, what should your scholars work on?</p>
      ${dev.length ? `<h4>Toward the next age</h4><div class="choices">${dev.sort((a, b) => devSciCost(n, a) - devSciCost(n, b)).map(f => { const c = devSciCost(n, f); return `<button class="choice" data-m="d:${f.k}"><b>${f.chain.icon} Develop ${esc(f.name)}</b><small>Level ${lv(n, f.k)} → ${lv(n, f.k) + 1} · ${fmt(c)} 🔬 (${turns(c)}) · ${esc(f.chain.name)} ${chainHave(n, f.chain)}/${chainNeed(n, f.chain)}</small></button>`; }).join("")}</div>` : ""}
      ${opts.length ? `<h4>Mastery</h4><div class="choices">${opts.map(f => { const c = masteryCost(n, f); return `<button class="choice" data-m="m:${f.k}"><b>${f.chain.icon} Master ${esc(f.name)}</b><small>Level ${lv(n, f.k)} → ${lv(n, f.k) + 1} of ${MASTERY_MAX} · ${fmt(c)} 🔬 (${turns(c)})</small></button>`; }).join("")}</div>` : ""}
      <p class="small muted">Developing fields with research moves you toward the next age. Mastery deepens a field you've already fully expanded. When the next age arrives, research switches back to technology.</p>`, a => {
        if (a && /^[md]:/.test(a)) { n.research = a; n.resManual = true; save(); hud(); toast(a[0] === "d" ? `Scholars are developing ${FIELDS[a.slice(2)].name}` : `Scholars are mastering ${FIELDS[a.slice(2)].name}`); if (curPanel) refresh(); }
        askBudget(); });
    return true;
  };
  const showEventAfterCivil = () => showEvent(true);
  const showEvent = (skipCivil) => {
    if (skipCivil !== true && askCivil()) return;
    if (!G.event) return askMastery() || askBudget();
    const e = EVENTS.find(x => x.id === G.event.id), n = P();
    showModal(`<div class="mi">${e.icon}</div><h2>${e.title}</h2><p>${esc(G.event.text)}</p><div class="choices">${e.ch.map((c, i) => `<button class="choice" data-m="c${i}"><b>${esc(c.t)}</b><small>${esc(c.d(n))}</small></button>`).join("")}</div>`, a => {
      const c = e.ch[+a.slice(1)]; G.news = []; c.f(n); G.event = null; n.stab = stabilityOf(n, n.fac); save(); refresh(); askMastery() || askBudget(); });
  };
  if (items.length) showModal(`<h2>${dateTxt()}</h2><div class="news">${items.map(x => `<div class="nw ${x.p === true || x.p === null ? "" : "far"}"><span>${x.i}</span><p>${esc(x.t)}</p></div>`).join("")}</div><div class="row"><button class="btn" data-m="ok">Continue</button></div>`, showEvent);
  else showEvent();
  if (G.pendingPeace) toast("A peace offer awaits in World");
}
$("zsim").onclick = () => openSim();
$("endTurn").onclick = () => {
  if (!G || G.over || G.demo) return;
  if (G.event) return afterTurnFlow();
  const btn = $("endTurn"); btn.disabled = true; btn.classList.add("busy");
  setTimeout(() => { try { endTurn(); } finally { btn.disabled = false; btn.classList.remove("busy"); } const keep = !sheet.hidden ? +sheet.dataset.ri : -1; if (curPanel) refresh(); else if (keep >= 0) openRegion(keep); afterTurnFlow(); }, 30);
};
function showEnd() {
  const o = G.outcome;
  showModal(`<div class="mi">${o.win ? "🏆" : "🏚️"}</div><h2>${o.win ? "Victory!" : "The End"}</h2><p>${esc(o.why)}</p><p class="muted">Final score ${score(P())} · ${dateTxt()}</p><div class="row"><button class="btn ghost" data-m="look">Look at the map</button><button class="btn" data-m="new">New game</button></div>`,
    a => { if (a === "new") { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} G = null; showTitle(); } });
}
function showHelp() {
  showModal(`<h2>How to play</h2><div class="help">
  <p><b>Simulate 10 years.</b> Tap ⏩ to let a governor run your nation for ten years. Pick a focus (balanced, growth, economy, research or military) and what it must honor: your culture, your government and laws, your budget, and whether it may start wars. It stops early for civil war or, if you like, when someone declares war on you.</p>
  <p><b>Quarters.</b> Every turn is one quarter of a year, from 4000 BCE onward. Change happens slowly in the early ages and speeds up as history does. At the start of each year (Q1) you set the year's budget.</p>
  <p><b>Goal.</b> Grow a single village into a world power. Win by founding a colony on Mars, controlling 40% of the world's territories, or leading in score when 2100 arrives.</p>
  <p><b>Villages.</b> You start with one village of ${START_POP} people. A village holds at most ${VILLAGE_CAP}, a town 3,000, and a city more with each age. When a settlement is full, people move outward and form new villages nearby on their own (as long as there's food and free land). You can also <b>Send settlers</b> to steer where your people go, or restrict migration in Laws.</p>
  <p><b>Towns & cities.</b> ${VILLAGES_FOR_TOWN} villages close together (in one territory or neighboring ones) can merge into one town with all their people (needs Agriculture). Each new town also needs your nation to reach a population target. Towns grow into the thousands, and at ${fmtP(CITY_POP)} people they can become cities (needs Masonry). Bigger settlements produce much more gold, materials and science.</p>
  <p><b>Room.</b> Each territory has room for a set number of settlements and of towns and cities, based on its size and land. Big fertile plains hold the most.</p>
  <p><b>Territory & rank.</b> ${TOWNS_TO_CLAIM} towns or cities in a territory make it yours. Controlling 1 territory makes you a Nation, 2–3 a Kingdom, and 4 or more an Empire.</p>
  <p><b>Develop.</b> Instead of single buildings, you grow whole fields: Food, Industry, Weapons, Trade, Knowledge and more. Set a field up, then expand it level by level. Level 3 opens its next stage once you have the matching technology, from Weapon Making all the way to a Nuclear Arsenal.</p>
  <p><b>Mastery.</b> Once a stage reaches level 5 you can keep deepening it through research, up to level 50. Each level adds less, and level 50 equals level 5 of the next stage, so you can stay in an age and become very good at it, or move on. Mastery of a stage stops when you set up its next stage.</p>
  <p><b>Culture.</b> You choose your people's culture when you found them: Mixed, Scholarly, Martial, Industrious, Agrarian or Mercantile. It's one of the biggest factors in research (Scholarly +60%, Martial −25%) and shapes your army, economy and which fields are cheaper. Most peoples are Martial.</p>
  <p><b>Paying for knowledge.</b> Research is funded from your income through the Research line of your budget, and it also uses materials. Every coin spent on scholars is a coin not spent on armies, so most peoples keep budgets low and stay militarily strong. A small nation can choose to pour its income into learning, and technologies its neighbors and allies already know are cheaper, especially if those neighbors are larger.</p>
  <p><b>Ages & emphasis.</b> Fields are capped to your current age, and you can't enter a new age until every field reaches a base level that grows each age (2 levels per age). Each city can emphasize one field: it gives a small boost to that field's bonuses (+1.5% per city) and research (+1%), and lets it reach 1 age ahead. Your capital lets its field reach 3 ages ahead.</p>
  <p><b>Your nation runs itself.</b> Food is shared, merchants trade and resources are imported automatically. You steer with settlements, buildings, laws, research and diplomacy.</p>
  <p><b>Stability.</b> Factions like Commoners, Clergy, Nobles and Merchants each want different things. Keep them happy or face unrest, revolts, coups and lost elections.</p>
  <p><b>Borders.</b> Each settlement holds land around it, and your borders grow as you add villages, towns and cities. Borders stop where they meet another people's, and you can't settle inside someone else's borders.</p>
  <p><b>Academies & the army.</b> Cities can found academies, later universities, which graduate scientists (+1% research each, more for Scholarly cultures). Military academies (limited by nation size) train officers and graduate generals. The Army tab shows your forces and lets you choose how they're commanded.</p>
  <p><b>Budget.</b> Every year you split your gross income between Military (your army's size follows it: split it between quantity, the number of regiments, and quality, better arms and training for each), Research, Production (more materials), Travel (better odds of skilled generals and commanders) and Subsidies (food, growth and happier commoners).</p>
  <p><b>Welfare.</b> Basic income and healthcare, from simple relief up to advanced programs in later ages, make your people happier, healthier and more productive, raise public trust every turn and calm unrest. They cost a share of your income.</p>
  <p><b>Education & propaganda.</b> Educated people demand more from the state. As your people learn (each age, Knowledge fields and academies), they expect higher levels of basic income and healthcare, and every level you fall short drains public trust. Propaganda holds that demand down, costs almost nothing while your people are uneducated, but buys less and less as they learn.</p>
  <p><b>Debt & trust.</b> Your treasury can go into debt; nobody quits. But debt grows with interest and drains public trust, the revolt meter. Welfare pushes it back up. If trust hits zero, civil war splits your nation in two, and you choose which side to lead.</p>
  <p><b>War.</b> You can only declare war on peoples whose borders touch yours, and only attack their settlements on the front line. Each victory pushes their border back; it takes 1 win to capture a village, 2 for a town and 3 for a city.</p>
  <p><b>Map.</b> Drag to move, pinch or scroll to zoom. Villages are dots ●, towns are squares ■, cities are triangles ▲, and ⭐ marks capitals. Zoom in to see their shapes. White land is unclaimed, and cloudy gray land is unexplored.</p></div>
  <div class="row"><button class="btn" data-m="ok">Got it</button></div>`);
}

// ---------- title & setup ----------
let setupState = null;
function showTitle() {
  closePanel(); closeSheet();
  $("title").hidden = false; $("setup").hidden = true; $("game").classList.add("dim");
  const s = loadSave();
  $("btnContinue").hidden = !s;
  if (s) $("btnContinue").querySelector("small").textContent = `${s.nations[s.player].name} · ${s.year < 0 ? -s.year + " BCE" : s.year + " CE"}`;
  if (!G) G = { demo: true, turn: 0, year: -4000, player: 0, nations: [], regions: W.regions.map((s, i) => ({ i, ctrl: -1 })), sets: [], bld: {}, cons: {}, dip: {}, news: [], sv: 0 };
  view.k = minK(); clampView(); dirty = true;
}
$("btnContinue").onclick = () => { const s = loadSave(); if (!s) return; G = s; reachCache.clear(); if (!G.exp) { G.exp = new Array(NR).fill(0); updateExplore(); } restoreCells(); startPlaying(); };
$("btnNew").onclick = () => openSetup();
$("btnHelp").onclick = () => showHelp();
function openSetup() {
  $("title").hidden = true; $("setup").hidden = false;
  setupState = { name: genName(), color: COLORS[0], start: "Lower Egypt", diff: 1, cul: "mixed" };
  renderSetup();
}
function renderSetup() {
  const st = setupState, ri = RID[st.start], s = W.regions[ri];
  $("sName").value = st.name;
  $("sColors").innerHTML = COLORS.slice(0, 12).map(c => `<button class="sw pick ${c === st.color ? "on" : ""}" style="background:${c}" data-c="${c}" aria-label="Color ${c}"></button>`).join("");
  $("sStarts").innerHTML = CRADLES.filter(c => RID[c] !== undefined).map(c => `<button class="${c === st.start ? "on" : ""}" data-s="${esc(c)}">${esc(c)}</button>`).join("");
  $("sInfo").innerHTML = `<b>${esc(s.n)}</b> · ${TER[s.t].name}${s.r ? ` · ${RES[s.r].icon} ${RES[s.r].name}` : ""}${s.c ? " · Coastal" : ""} · room for ${s.slots} settlements and ${s.urban} towns or cities`;
  $("sDiff").querySelectorAll("button").forEach(b => b.classList.toggle("on", +b.dataset.d === st.diff));
  $("sCul").innerHTML = Object.entries(CULTURES).map(([k, c]) => `<button class="${st.cul === k ? "on" : ""}" data-cu="${k}">${c.icon} ${c.name}</button>`).join("");
  $("sCulInfo").textContent = CULTURES[st.cul].d;
  G.setup = true; sel = ri; centerRegion(ri, Math.max(minK() * 2.2, 2.5));
}
$("sName").oninput = e => { setupState.name = e.target.value.slice(0, 18); };
$("sColors").onclick = e => { const b = e.target.closest("[data-c]"); if (b) { setupState.color = b.dataset.c; renderSetup(); } };
$("sStarts").onclick = e => { const b = e.target.closest("[data-s]"); if (b) { setupState.start = b.dataset.s; renderSetup(); } };
$("sCul").onclick = e => { const b = e.target.closest("[data-cu]"); if (b) { setupState.cul = b.dataset.cu; renderSetup(); } };
$("sDiff").onclick = e => { const b = e.target.closest("[data-d]"); if (b) { setupState.diff = +b.dataset.d; renderSetup(); } };
$("sRandomName").onclick = () => { setupState.name = genName(); renderSetup(); };
function setupPick(ri) { setupState.start = W.regions[ri].n; renderSetup(); }
$("sBack").onclick = () => { $("setup").hidden = true; G.setup = false; sel = -1; showTitle(); };
$("sGo").onclick = () => {
  const st = setupState; const name = (st.name || "").trim() || genName();
  $("setup").hidden = true; G = null;
  newGame({ name: name.replace(/^\w/, c => c.toUpperCase()), color: st.color, start: st.start, diff: st.diff, cul: st.cul });
  G.lastReport = []; save();
  startPlaying(true);
};
function startPlaying(fresh) {
  $("title").hidden = true; $("setup").hidden = true; $("game").classList.remove("dim");
  G.setup = false; sel = -1;
  const c = capSet(P()) || G.sets[0];
  if (c) centerOn(c.x, c.y, clamp(Math.min(cw, ch) / (fresh ? 3.4 : 6), minK(), MAXK));
  hud(); dirty = true;
  if (fresh) showModal(`<div class="mi">🛖</div><h2>${esc(nm(P()))}</h2><p>${START_POP} people gather around the fire in a small village in ${esc(W.regions[capSet(P()).r].n)}. The rest of the world is wild and unclaimed. ${-G.year} BCE.</p><div class="help small">
    <p>• A village holds ${VILLAGE_CAP} people. When it fills up, people move out and <b>form new villages</b> nearby on their own.</p>
    <p>• ${VILLAGES_FOR_TOWN} villages close together can merge into a <b>town</b>. ${TOWNS_TO_CLAIM} towns claim the territory and make you a <b>Nation</b>.</p>
    <p>• Tap <b>End Turn</b> when you're ready.</p></div><div class="row"><button class="btn ghost" data-m="help">How to play</button><button class="btn" data-m="ok">Begin</button></div>`, a => { if (a === "help") showHelp(); });
  else if (G.over) showEnd();
  else if (G.event) afterTurnFlow();
}

// ================= BOOT =================
window.addEventListener("resize", resize);
if (window.ResizeObserver) new ResizeObserver(resize).observe(cv);
document.addEventListener("keydown", e => { if (e.key === "Escape") { if (!modal.hidden) return; if (!panel.hidden) closePanel(); else closeSheet(); } });
function start(data) {
  resize();
  window.claude?.hot?.snapshot?.(() => ({ G: G && !G.demo && G.v === 2 ? G : null }));
  if (data && data.G && data.G.v === 2) { G = data.G; reachCache.clear(); restoreCells(); if (!G.exp) { G.exp = new Array(NR).fill(0); updateExplore(); } startPlaying(); } else showTitle();
  requestAnimationFrame(loop);
}
window.__c2c = { get G() { return G; }, dbg: n => ({ eraTechs: eraTechs(n.era).map(t => t.id + (has(n, t.id) ? "+" : "-")), need: eraNeed(n.era), missing: fieldsMissing(n).map(c => c.k + " " + chainHave(n, c) + "/" + chainNeed(n, c)), research: n.research, sciPts: Math.round(n.sciPts) }), load: g => { G = g; reachCache.clear(); emphCache = new Map(); }, bordersTouch, focus: (x, y, k) => centerOn(x, y, k), newGame, endTurn, aiTurn, econ, P, setsOf, terrCount, popOf, TECHS, score, ranking, dip, aiAccept, makePeace, atWar, foundCheck, foundVillage, townCheck, cityCheck, upgrade, bestVillageSpot };
const hot = window.claude?.hot;
hot?.ready ? hot.ready(start) : start(hot?.data ?? {});
})();
