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
const yrsT = y => y / YEARS_PER_TURN[calEra(G.year)]; /* a span of years in the units timers count in */
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
const VILLAGE_CAP = 150, CITY_POP = 2000, VILLAGES_FOR_TOWN = 4, TOWNS_TO_CLAIM = 3, START_POP = 30, MOVERS = 10;
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
  ["tribal", 0, "Tribal Law", "Disputes are settled by custom, not the strongest arm. Unlocks the Chiefdom government."],
  ["fire", 0, "Taming fire", "Fire for warmth, cooking and keeping beasts away; the tribe gathers around it."],
  ["stonetools", 0, "Sharper stone tools", "Keener flaked edges: each toolmaker's tools go further."],
  ["rope", 0, "Cordage and rope", "Twisted fibers bind and lift: builders work faster."],
  ["snares", 0, "Snares and traps", "Game traps & snares can be built."],
  ["dogs", 0, "Taming dogs", "Dogs help the hunt and guard the camp: hunters bring in more."],
  ["spear", 0, "Hafted spears", "Stone points bound to shafts: hunters and warriors strike harder."],
  ["stories", 0, "Stories and songs", "The tribe's memory lives on: painted rocks can be made."],
  ["herbs", 0, "Herb lore", "Which plants heal and which kill: healers work better."],
  ["sewing", 0, "Bone needles", "Sewn clothes keep out the cold: warmer families."],
  ["fishing", 0, "Hooks and nets", "Fishers bring in more, and fish weirs can be built."],
  ["smoking", 0, "Smoking meat", "Smoked meat lasts the winter: smokehouses can be built."],
  ["burial", 0, "Honoring the dead", "Burial grounds can be made."],
  ["boats", 0, "Dugout canoes", "Hollowed logs carry people over water: canoes can be built."],
  ["counting", 0, "Counting and marking", "Notches on bone track herds and moons. What we know no longer lives only in memory."],
  ["weaving", 0, "Weaving", "Fibers become cloth: looms can be built."],
  ["bow", 0, "Bow and arrow", "Hunters reach further and warriors strike from afar."],
  ["stockade", 0, "Stockades", "Walls of sharpened logs: palisades can be built."],
  ["trade", 0, "Gift exchange", "Gifts open doors with strangers: a trading post can be built once you meet another people."],
  ["calendar", 0, "Watching the seasons", "The moons and stars tell when to sow and gather: farmers and foragers do better."],
  ["ochre", 0, "Ochre and dyes", "Red and yellow earth for body paint and decoration: a small source of pride."],
  ["drums", 0, "Drums and dance", "Gatherings come alive: families gather more happily."],
  ["glue", 0, "Birch tar glue", "Boiled bark glue holds blades to hafts: each toolmaker's tools go further."],
  ["sledges", 0, "Sledges and drag-poles", "Heavy loads drag easily: builders work faster."],
  ["wattle", 0, "Wattle and daub", "Woven walls plastered with mud: buildings need less upkeep."],
  ["burning", 0, "Controlled burning", "Fire clears old growth for new shoots and game: foragers and hunters do better."],
  ["midwifery", 0, "Midwifery", "Wise women see mothers and babies through birth: a little more fertile."],
  ["signs", 0, "Trail signs", "Blazes and cairns mark the way: scouts see further."],
  ["stars", 0, "Star lore", "Night after night the elders watch the sky: their talks go faster."],
  ["salt", 0, "Salt", "Salt keeps meat and fish: a little more food."],
  ["grinding", 0, "Grinding stones", "Seeds and nuts ground into flour: foragers do better."],
  ["waterskins", 0, "Water skins", "Stitched hides carry more water: each water carrier supplies more families."],
  ["flutes", 0, "Bone flutes", "Music around the fire: a small joy for the families."],
  ["brewing", 0, "Brewing", "Fermented honey and grain: feasts are merrier."],
  ["nation", 0, "Who are we?", "The elders speak of the peoples beyond the hills, and of what binds this tribe together: a people, perhaps one day a nation."],
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
/* the Stone Age: many small matters for the elders to settle, each cheap; settling 85% of them brings the next age */
const STONE_C0 = .2, STONE_C1 = .4; /* lore each talk takes, from the first to the last */
const STONE_REQ = { stonetools: [], fire: [], rope: [], snares: [], dogs: [], spear: ["stonetools"], stories: ["fire"], herbs: [], sewing: ["stonetools"], fishing: ["rope"], smoking: ["fire"], burial: ["stories"],
  boats: ["stonetools", "fishing"], counting: ["stories"], weaving: ["rope"], bow: ["spear", "rope"], stockade: ["rope"], trade: ["stories"], calendar: ["counting"], pottery: ["fire"], mining: ["stonetools"],
  agriculture: ["herbs"], ochre: ["fire"], drums: ["stories"], glue: ["fire", "stonetools"], sledges: ["rope"], wattle: ["weaving"], burning: ["fire"], midwifery: ["herbs"], signs: ["stories"],
  stars: ["counting"], salt: ["smoking"], grinding: ["stonetools"], waterskins: ["sewing"], flutes: ["stories"], brewing: ["pottery"], husbandry: ["dogs"], mysticism: ["stories"], tribal: ["counting"], nation: ["tribal", "mysticism"] };
const STONE_ORDER = ["fire", "stonetools", "rope", "snares", "ochre", "dogs", "herbs", "burning", "stories", "grinding", "spear", "glue", "sewing", "drums", "smoking", "flutes", "fishing", "burial", "signs", "sledges", "midwifery", "pottery", "salt", "waterskins", "counting", "weaving", "mysticism", "boats", "brewing", "wattle", "agriculture", "husbandry", "stars", "bow", "stockade", "trade", "mining", "calendar", "tribal", "nation"];
STONE_ORDER.forEach((id, i) => { TECH[id].cost = Math.round((STONE_C0 + STONE_C1 * i / (STONE_ORDER.length - 1)) * 1000) / 1000; });
const STONE_DESC = { agriculture: "Some seeds, pushed into the earth, come back as food: farmers & herders, farm plots and storage pits.", husbandry: "Young animals raised by the fire follow us: herds to keep, and animal pens.",
  pottery: "River clay hardens in the fire: pots that keep grain dry, cisterns and kilns.", mining: "Some stones can be dug from the hills, and water from deep below: wells.",
  mysticism: "The elders agree on the spirits of sky, river and ancestors, and the rites to honor them: healers, shrines and sweat lodges.", tribal: "Disputes are settled by custom, not by the strongest arm. The tribe has laws now." };
const stoneDesc = t => STONE_DESC[t.id] || t.desc;
const stoneNeed = () => Math.ceil(eraTechs(0).length * .85);
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
const sciSalary = n => .3 * Math.pow(1.4, n.era) * (G && G.nations ? wageOf(n) : 1), offSalary = n => .35 * Math.pow(1.4, n.era) * (G && G.nations ? wageOf(n) : 1); // public employees are paid the going wage
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
  else n.commander = { name: nameFor(n, "person"), skill: clamp(Math.round(1 + rnd() * 4 + travelQ(n) * rnd()), 1, 5), left: 20 + Math.floor(rnd() * 20), known: false };
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
// ---- the army's words change with the ages: war bands and warlords first, regiments and divisions much later ----
const UNIT_WORDS = [["war band", "war bands"], ["war band", "war bands"], ["cohort", "cohorts"], ["company", "companies"], ["regiment", "regiments"], ["regiment", "regiments"], ["division", "divisions"], ["division", "divisions"]];
function AW(t) {
  if (typeof t !== "string" || !G || !G.nations || !G.nations.length) return t;
  const n = G.nations[G.player]; if (!n) return t;
  const e = n.era, [s1, s2] = UNIT_WORDS[e];
  t = t.replace(/\b([Rr])egiment(s?)\b/g, (m, r, pl) => { const w = pl ? s2 : s1; return r === "R" ? w[0].toUpperCase() + w.slice(1) : w; });
  if (e <= 3) { const big = e <= 1 ? "Warlord" : "High General"; t = t.replace(/Supreme Commander/g, big).replace(/supreme commander/g, big.toLowerCase()); }
  return t;
}
// who fights: tribes send hunters and warriors; conscription comes much later
const CONS_NAMES = [
  { e: 0, name: "Who fights", vol: ["Hunters only", "Only the best hunters go to war: small war bands, but families like it."], levy: ["Warrior band", "Every family sends a warrior when the tribe calls."], mass: ["Every hand a spear", "Everyone who can hold a spear fights: huge war bands. Warriors love it, families don't."] },
  { e: 1, name: "Who fights", vol: ["Warrior caste", "A caste of born warriors does the fighting: a small army, but people like it."], levy: ["Clan levy", "Clans send their young men when called."], mass: ["Every able man", "All men of fighting age must serve: a huge army. Warriors love it, people don't."] },
  { e: 2, name: "Military service", vol: ["Professional soldiers", "Paid soldiers serve for years: a small army, but people like it."], levy: ["Citizen levy", "Citizens serve when called."], mass: ["Universal service", "Every citizen must serve: a huge army. Soldiers love it, people don't."] },
  { e: 3, name: "Military service", vol: ["Knights & retainers", "Lords and their sworn men fight: a small army, but peasants are left in peace."], levy: ["Feudal levy", "Lords raise their peasants when the crown calls."], mass: ["Peasant hosts", "Every village sends its men: huge hosts. Warriors love it, peasants don't."] },
  { e: 4, name: "Conscription", vol: ["Professional army", "A standing army of volunteers: small, but popular."], levy: ["Militia levy", "Towns raise militias when needed."], mass: ["Mass conscription", "Every young man is drafted: a huge army. The military loves it, people don't."] },
  { e: 6, name: "Conscription", vol: ["All-volunteer force", "Only volunteers serve: a small army, but popular."], levy: ["Selective draft", "Some are drafted by lottery."], mass: ["Total mobilization", "The whole nation is put on a war footing: a huge army. The military loves it, people don't."] },
];
function lawView(n, lk) {
  const L = LAWS[lk]; if (lk !== "cons") return L;
  const c = CONS_NAMES.slice().reverse().find(x => n.era >= x.e);
  return { ...L, name: c.name, opts: { vol: [c.vol[0], L.opts.vol[1], c.vol[1]], levy: [c.levy[0], L.opts.levy[1], c.levy[1]], mass: [c.mass[0], L.opts.mass[1], c.mass[1]] } };
}
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
// ---- languages: every people names its land, towns and leaders in the style of the place it comes from ----
const LANGS = {
  greek:    { s: ["ka","to","ly","me","ne","sa","pe","ri","the","kle","xa","phi","de","mo","ar","eu","ko","ste"], p: ["os","ai","ene","ia","polis","ion","eia","on","ike"], h: ["os","es","as","on","ia","ike","eus","ides","ippos","andros","kles"] },
  latin:    { s: ["ma","ru","ca","ve","tu","li","ser","va","ro","fla","cor","quin","ti","an","au","ful","clau"], p: ["um","ia","ae","ona","entum","ium","ina"], h: ["us","ius","a","ia","inus","illa","o","ianus"] },
  celtic:   { s: ["bri","ga","dun","lo","ver","ca","mor","ta","dru","bel","ar","ne","cu","sca","eb","tre"], p: ["dunum","ia","acum","ona","briga","ach","in"], h: ["ix","os","a","an","oc","rix","ach","wen"] },
  iberian:  { s: ["bil","ta","ur","sa","ar","il","ka","bel","tor","ne","lu","os","ce"], p: ["ia","briga","is","ena","urgi","ica","obe"], h: ["ar","on","is","ia","ko","bel","eki"] },
  germanic: { s: ["ger","wal","sig","hro","ber","hild","ad","gun","al","ot","thur","fri","lud","ar","ed"], p: ["heim","burg","ingen","feld","ia","mar","wald"], h: ["ric","mund","hild","bert","wulf","a","win","hard"] },
  norse:    { s: ["sig","ulf","bjor","hal","rag","ey","tor","as","grim","ing","sva","dag","yng","har","ket"], p: ["heim","vik","fjord","by","land","stad","holm"], h: ["ar","ulf","rid","mund","a","grim","ny","vald","bjorn"] },
  finnic:   { s: ["vai","kar","ilm","jo","ta","ku","sai","ve","lem","ah","po","ka","ul"], p: ["la","nen","maa","ri","va","joki","mo"], h: ["o","i","nen","tar","kki","ja","ko"] },
  slavic:   { s: ["vla","bor","mir","sla","rad","dob","sve","zor","lu","vel","dra","mi","ya","stan","ze"], p: ["ov","grad","ets","ia","sk","ava","ino"], h: ["mir","slav","an","a","ko","ka","dan","ena"] },
  egyptian: { s: ["ankh","hor","ra","nef","set","mer","ptah","ka","ta","neb","djed","amen","sobek","wen","khe"], p: ["et","is","ut","ope","ne","an","ys"], h: ["mose","hotep","re","et","nakht","ankh","ti","ka"] },
  semitic:  { s: ["ba","al","ash","tar","mel","qar","ha","dan","ish","zur","sha","yar","mal","ad","ab"], p: ["at","on","ib","ath","ur","an","ar"], h: ["bal","el","ath","im","ar","ub","ram"] },
  berber:   { s: ["ta","maz","ghi","iz","am","ou","ar","tin","ma","sin","ag","ul","mas"], p: ["ast","ine","at","ou","ert","an"], h: ["en","a","ine","as","ou","ssa"] },
  sumer:    { s: ["ur","nin","shu","ki","ma","en","lil","gal","ish","sar","na","dub","zi","kish","ea"], p: ["uk","ash","ur","du","ak","ri","ug"], h: ["ki","ur","gal","dug","ma","shum","lu"] },
  anatol:   { s: ["hat","tu","shi","mur","ar","na","ku","tel","pi","zid","ha","las","sup"], p: ["sa","assa","wa","ana","uwa","ia","ili"], h: ["ili","as","is","ta","shu","wa","ziti"] },
  persian:  { s: ["ar","da","xer","mi","ra","pa","vah","bar","zar","kur","ast","fra","sha","gau"], p: ["an","istan","abad","ana","esh","pur","kand"], h: ["es","ush","ar","an","a","ad","uk"] },
  indic:    { s: ["ra","ma","shi","ka","dev","pra","su","vi","in","bha","sa","cha","nan","har","kum"], p: ["pur","desh","nagar","ka","ala","avati","pada"], h: ["an","a","ya","esh","ita","ra","endra"] },
  dravid:   { s: ["chol","pan","ta","ka","ve","ma","ra","la","kan","ya","ner","mu","kil"], p: ["ai","am","oor","uru","alam","adu"], h: ["an","i","ar","ai","appan","ammal"] },
  tibetan:  { s: ["tsan","dor","lha","tash","nor","gya","pel","sang","dha","rin","so"], p: ["ling","tse","po","gang","khar"], h: ["je","po","ma","chen","dup","gyal"] },
  seasia:   { s: ["kha","sri","pra","nam","chan","bo","tha","kam","lan","van","pa","ra","sak"], p: ["pura","nam","thai","ang","bang","lo"], h: ["vong","dara","sak","chai","nuch","phon"] },
  chinese:  { s: ["shang","zhou","han","wei","qin","lu","song","ming","chu","yan","jin","zhao","liang","hua","ning","yu","li","feng","an","xi"], han: true },
  korean:   { s: ["han","sil","ba","gu","ryeo","jo","sun","min","ho","seo","ga","ya","baek","kyung"], han: true },
  japanese: { s: ["ka","ta","mi","ya","na","to","ki","sa","ha","ru","yo","ko","shi","mo","ise","tsu"], p: ["shima","yama","no","ta","gawa","zu","oka"], h: ["o","ko","mi","ro","ji","ka","nori","maru"] },
  steppe:   { s: ["tem","ar","kha","bat","tur","ul","ak","bul","ker","yes","toq","mon","ogh","ilt","sar"], p: ["an","ur","kan","tai","ul","dag"], h: ["ur","ai","bek","khan","tai","ghun","jin"] },
  austro:   { s: ["ma","ka","la","pu","ta","ni","ha","ko","lu","ri","sa","wa","ba","ang","mo"], p: ["nu","ka","pura","wa","lani","ang","hiva"], h: ["ni","ka","ma","lea","ku","sih","tu"] },
  abor:     { s: ["wa","ru","bin","gu","mar","kul","yar","dja","ba","li","ra","nu"], p: ["ga","ri","nup","bara","ingi","alla"], h: ["ri","a","indi","uk","ara","jin"] },
  bantu:    { s: ["ba","ka","lu","nda","mbu","nya","zi","to","shi","nge","wa","mu","ku","nzi","so"], p: ["nga","la","mbe","ndu","ka","mba","ni"], h: ["la","ndi","be","zi","ko","mba","nge"] },
  wafrica:  { s: ["ma","so","kan","dia","ke","ba","mu","oko","ye","ga","sa","fa","ndi","ka","ton"], p: ["ri","ba","dugu","koro","ne","fe","wa"], h: ["ta","ke","ba","du","fa","mi","ra"] },
  ethiop:   { s: ["ak","sum","teg","yo","mar","ha","za","be","ge","las","ta","wol","kal"], p: ["um","ra","ya","ena","ash","at"], h: ["u","e","ana","ay","om","ta"] },
  nahuatl:  { s: ["tla","xoch","ma","itz","coa","teo","tez","cua","ol","yol","ah","quetz","ix","tze"], p: ["tlan","co","pan","can","titlan","huac"], h: ["tl","oc","in","itl","atl","ac","ztli"] },
  maya:     { s: ["kin","ix","ba","chan","kuk","ah","tun","yax","pak","bal","may","k'an"], p: ["al","tun","pan","ul","il","kab"], h: ["al","ich","ah","um","kin"] },
  andean:   { s: ["inti","qu","wai","pa","cha","ma","yu","tu","huay","kus","illa","ka","ru","yupan"], p: ["co","pampa","marca","bamba","huasi","qocha"], h: ["pa","q","ri","illa","sisa","huaman","ki"] },
  amazon:   { s: ["ta","gua","pi","ra","jur","ito","ma","ca","ya","ub","ara","ti","aru"], p: ["gua","tiba","pora","ara","uba","ita"], h: ["ra","ca","ti","ju","ana","pi"] },
  northam:  { s: ["wa","sha","ko","ta","che","mi","na","po","ka","dah","ho","ki","we","nas","ono"], p: ["kee","ota","ewa","haw","ago","tuck","ka"], h: ["ka","we","to","sha","ni","hi","wa"] },
  inuit:    { s: ["ana","ki","tu","nu","ka","ik","aq","si","pa","uk","nig","kaq"], p: ["vik","miut","juaq","liaq"], h: ["uk","aq","i","nik","tuq"] },
};
// familiar languages you can choose for your own city and people names
Object.assign(LANGS, {
  english:   { s: ["ash","brad","ches","dun","ham","ley","mar","nor","ox","read","shef","wick","wor","bright","stan","wel","whit","black"], p: ["ton","ford","bury","ham","field","wick","ley","worth","chester","by","mouth","bridge"], given: ["John","William","Thomas","Edward","Henry","Richard","Mary","Elizabeth","Anne","Margaret","Catherine","George","Arthur","Alice","Eleanor","James","Robert"], fam: ["Smith","Fletcher","Ashford","Hale","Turner","Cooper","Wright","Baker","Hayward","Thornton","Clarke","Whitmore"] },
  french:    { s: ["beau","mont","char","bel","roche","val","mar","fon","cham","bour","ver","lan","sain"], p: ["ville","court","mont","bourg","lieu","ac","ais","ieres","ay","eux"], given: ["Louis","Jean","Pierre","Henri","Philippe","Marie","Jeanne","Isabelle","Charles","Antoine","Catherine","Claude","Marguerite"], fam: ["Dubois","Martin","Lefevre","Moreau","Girard","Laurent","Bonnet","Rousseau","Fontaine","Chevalier"] },
  spanish:   { s: ["san","val","mon","al","cas","vil","tor","mar","cor","sal","bel","gua","ter"], p: ["ejo","illa","era","ada","ona","eda","ares","ena","ales","ido"], given: ["Juan","Diego","Carlos","Pedro","Fernando","Isabel","Maria","Juana","Alonso","Teresa","Rodrigo","Lucia","Miguel"], fam: ["Garcia","Fernandez","Lopez","Martinez","Navarro","Ortega","Vargas","Castillo","Mendoza","Herrera"] },
  italian:   { s: ["mon","val","cas","san","ro","fio","bor","pon","ve","mar","pie","ter","lu"], p: ["ano","ino","etto","ona","ello","ia","ola","aro","enza"], given: ["Giovanni","Marco","Lorenzo","Francesco","Luca","Giulia","Caterina","Lucia","Pietro","Matteo","Beatrice","Alessandro"], fam: ["Rossi","Bianchi","Romano","Colombo","Ricci","Marino","Greco","Conti","De Luca","Esposito"] },
  german:    { s: ["ober","neu","alt","wald","berg","hei","rosen","stein","lin","eich","schwarz","hoch","lauen"], p: ["dorf","burg","berg","heim","hausen","stadt","feld","bach","au"], given: ["Friedrich","Heinrich","Wilhelm","Karl","Otto","Johann","Anna","Margarete","Elisabeth","Klara","Ludwig","Hans","Greta"], fam: ["Muller","Schmidt","Schneider","Fischer","Weber","Wagner","Becker","Hoffmann","Richter","Krause"] },
  russian:   { s: ["nov","vla","kras","bel","yar","sol","tver","kost","ros","ust","zel","pere","mir"], p: ["grad","sk","ovo","ino","ets","evo","ka"], given: ["Ivan","Dmitri","Alexei","Mikhail","Nikolai","Sergei","Anna","Olga","Natalia","Yelena","Pyotr","Tatiana","Boris"], fam: ["Ivanov","Petrov","Volkov","Sokolov","Morozov","Lebedev","Kozlov","Novikov","Orlov","Pavlov"] },
  arabic:    { s: ["bab","dar","ras","qasr","bir","wadi","jab","mad","ain","tel","khan","sul","naj"], p: ["ah","iya","an","ur","at","ib","ein"], given: ["Ahmad","Yusuf","Omar","Ali","Khalid","Hassan","Fatima","Aisha","Layla","Zaynab","Ibrahim","Salim","Nour"], fam: ["al-Rashid","ibn Hamid","al-Masri","al-Hakim","ibn Saad","al-Farsi","al-Amin","ibn Tariq"] },
  hindi:     { s: ["ra","jai","ud","kan","nag","har","pra","mir","sur","bal","chand","del","ajm"], p: ["pur","abad","garh","nagar","ganj","pat","er"], given: ["Arjun","Vikram","Rahul","Rohan","Ashok","Priya","Ananya","Lakshmi","Meera","Sanjay","Kavya","Dev"], fam: ["Sharma","Verma","Gupta","Singh","Patel","Rao","Mehta","Iyer","Chandra","Kapoor"] },
  turkish:   { s: ["ak","kara","yen","es","bur","er","kay","ant","tok","sar","bol","iz","sam"], p: ["kent","hisar","ova","dere","li","koy","sun"], given: ["Mehmet","Ahmet","Mustafa","Osman","Selim","Ayse","Fatma","Elif","Zeynep","Murat","Kemal","Emine"], fam: ["Yilmaz","Kaya","Demir","Sahin","Celik","Aydin","Ozturk","Arslan","Dogan","Kilic"] },
  portuguese:{ s: ["san","vila","cas","por","bra","alm","mon","fig","cor","bel","esp","val"], p: ["eira","ao","inho","osa","al","ela","ares"], given: ["Joao","Pedro","Afonso","Manuel","Duarte","Ines","Beatriz","Leonor","Teresa","Vasco","Rui","Catarina"], fam: ["Silva","Santos","Pereira","Costa","Almeida","Carvalho","Sousa","Ribeiro","Gomes","Lopes"] },
  dutch:     { s: ["ams","rot","del","haar","zand","lei","gron","ut","mid","zwol","ber","dor","hil"], p: ["dam","erdam","ft","lem","voort","dijk","horst","burg"], given: ["Jan","Pieter","Willem","Hendrik","Cornelis","Maria","Anna","Geertruida","Johanna","Dirk","Floris","Sanne"], fam: ["de Vries","Jansen","van Dijk","Bakker","Visser","Smit","de Boer","Mulder","van den Berg","Dekker"] },
  swahili:   { s: ["ki","mo","nai","dar","ma","lin","tan","zan","mba","nyu","ru","pem"], p: ["ni","bo","sa","nga","we","ji","ra"], given: ["Juma","Baraka","Amani","Jabari","Faraji","Zawadi","Neema","Rehema","Imani","Kito","Saidi","Asha"], fam: ["Mwangi","Odhiambo","Kamau","Mutua","Ndege","Otieno","Wanjiru","Chege","Kariuki","Njoroge"] },
});
Object.assign(LANGS.chinese, { given: ["Wei","Jian","Ming","Hua","Li","Fang","Lan","Mei","Jun","Qiang","Xiu","Yong"], fam: ["Li","Wang","Zhang","Liu","Chen","Yang","Zhao","Huang","Zhou","Wu"], famFirst: true });
Object.assign(LANGS.japanese, { given: ["Hiroshi","Takeshi","Kenji","Haruto","Yuki","Aiko","Sakura","Hana","Ren","Sora","Akira","Emi"], fam: ["Sato","Suzuki","Takahashi","Tanaka","Watanabe","Ito","Yamamoto","Nakamura","Kobayashi","Kato"], famFirst: true });
Object.assign(LANGS.korean, { given: ["Min-jun","Seo-yeon","Ji-ho","Ha-eun","Do-yoon","Ji-woo","Seung","Hye-jin","Joon","Yuna"], fam: ["Kim","Lee","Park","Choi","Jung","Kang","Cho","Yoon","Jang","Lim"], famFirst: true });
const LANG_OF = {};
for (const [lg, list] of Object.entries({
  greek: ["Greece", "Thrace"], latin: ["Northern Italy", "Southern Italy"], celtic: ["Aquitaine", "Northern Gaul", "Provence", "England", "Scotland", "Ireland", "Alps"], iberian: ["Portugal", "Castile", "Aragon"],
  germanic: ["Rhineland", "North Germany", "Low Countries"], norse: ["Denmark", "Norway", "Sweden", "Iceland"], finnic: ["Finland", "Karelia", "Baltics", "Northern Russia", "Urals"],
  slavic: ["Poland", "Bohemia", "Belarus", "Ukraine", "Muscovy", "Western Balkans", "Hungary", "Wallachia"], egyptian: ["Lower Egypt", "Nubia"],
  semitic: ["Levant", "Hejaz", "Najd", "Al-Hasa", "Yemen", "Oman", "Carthage"], berber: ["Morocco", "Algeria", "Western Sahara", "Central Sahara", "Tripolitania", "Cyrenaica", "Tibesti"],
  sumer: ["Mesopotamia"], anatol: ["Anatolia", "Armenia", "Caucasus"], persian: ["Persia", "Khorasan", "Afghanistan", "Baluchistan", "Transoxiana", "Turkmenia", "Pamir"],
  indic: ["Indus", "Punjab", "Bengal", "Deccan", "Himalaya"], dravid: ["South India", "Sri Lanka"], tibetan: ["Tibet"], seasia: ["Burma", "Siam", "Mekong", "Tonkin"],
  chinese: ["North China Plain", "Loess Plateau", "Sichuan", "Jiangnan", "Lingnan", "Yunnan", "Taiwan"], korean: ["Korea", "Manchuria"], japanese: ["Japan", "Hokkaido"],
  steppe: ["Northern Kazakhstan", "Southern Kazakhstan", "Dzungaria", "Western Mongolia", "Eastern Mongolia", "Tarim", "Volga", "Baikal", "Western Siberia", "Central Siberia", "Taymyr", "Yakutia", "Kolyma", "Kamchatka", "Amur"],
  austro: ["Malaya", "Philippines", "Sumatra", "Java", "Borneo", "Moluccas", "Madagascar", "Hawaii", "North Island", "South Island"],
  abor: ["New Guinea", "Western Australia", "Northern Territory", "Queensland", "New South Wales", "Victoria", "South Australia", "Tasmania"],
  bantu: ["Cameroon", "Western Congo", "Eastern Congo", "Katanga", "Great Lakes Africa", "Kenya", "Tanganyika", "Mozambique", "Angola", "Zimbabwe", "Highveld", "Natal", "Cape", "Namibia", "Kalahari"],
  wafrica: ["Senegambia", "Mali", "Guinea Coast", "Gold Coast", "Niger Delta", "Hausaland", "Lake Chad", "Darfur"], ethiop: ["Ethiopia", "Somalia"],
  nahuatl: ["Northern Mexico", "Central Mexico", "Caribbean"], maya: ["Yucatan", "Central America"], andean: ["Peru", "Bolivia", "Ecuador", "Atacama", "Central Chile", "Patagonia", "Pampas"],
  amazon: ["Colombia", "Venezuela", "Guianas", "Western Amazon", "Eastern Amazon", "Brazilian Northeast", "Brazilian Highlands", "Minas Gerais", "Southern Brazil", "Gran Chaco"],
  inuit: ["Alaska", "Yukon", "Northwest Territories", "Nunavut", "Arctic Isles", "Greenland", "Labrador"] })) for (const r of list) LANG_OF[r] = lg;
const langOfRegion = ri => (ri != null && ri >= 0 && W.regions[ri] && LANG_OF[W.regions[ri].n]) || "northam";
function langOf(n) { if (!n) return "northam"; if (!n.lang) { const c = capSet(n) || setsOf(n)[0]; n.lang = c ? langOfRegion(c.r) : "northam"; } return n.lang; }
const capW = w => w ? w[0].toUpperCase() + w.slice(1) : w;
const tidy = w => w.replace(/(.)\1\1+/g, "$1$1").replace(/([aeiou])\1([aeiou])/g, "$1$2");
function placeName(lg) { const L = LANGS[lg] || LANGS.northam;
  if (L.han) return capW(pick(L.s) + (rnd() < .45 ? pick(L.s) : ""));
  let w = ""; for (let t = 0; t < 6; t++) { w = tidy(pick(L.s) + (rnd() < .45 && t < 3 ? pick(L.s) : "") + pick(L.p)); if (w.length <= 12) break; } return capW(w); }
function personName(lg) { const L = LANGS[lg] || LANGS.northam;
  if (L.given) return L.famFirst ? `${pick(L.fam)} ${pick(L.given)}` : `${pick(L.given)} ${pick(L.fam)}`;
  if (L.han) return capW(pick(L.s)) + " " + capW(pick(L.s) + (rnd() < .5 ? pick(L.s) : ""));
  let w = pick(L.s) + (rnd() < .35 ? pick(L.s) : "") + pick(L.h); w = tidy(w); return capW(w.length > 12 ? w.slice(0, 12) : w); }
// your own naming: a people's name, a naming style, and lists of city and personal names you choose
const LANG_LABEL = { english: "English", french: "French", spanish: "Spanish", portuguese: "Portuguese", italian: "Italian", german: "German", dutch: "Dutch", russian: "Russian", arabic: "Arabic", turkish: "Turkish", hindi: "Hindi", swahili: "Swahili", greek: "Greek", latin: "Latin", celtic: "Celtic", iberian: "Iberian", germanic: "Germanic", norse: "Norse", finnic: "Finnic", slavic: "Slavic", egyptian: "Egyptian", semitic: "Semitic", berber: "Berber", sumer: "Sumerian", anatol: "Anatolian", persian: "Persian", indic: "Indic", dravid: "Dravidian", tibetan: "Tibetan", seasia: "Southeast Asian", chinese: "Chinese", korean: "Korean", japanese: "Japanese", steppe: "Steppe (Turkic/Mongolic)", austro: "Austronesian", abor: "Aboriginal", bantu: "Bantu", wafrica: "West African", ethiop: "Ethiopian", nahuatl: "Nahuatl", maya: "Maya", andean: "Andean", amazon: "Amazonian", northam: "North American", inuit: "Inuit" };
function demonym(n) { if (n.people) return n.people; const b = n.name.trim(); return b.endsWith("ia") ? b + "ns" : b.endsWith("a") ? b + "ns" : /[eiou]$/.test(b) ? b + "ans" : b.endsWith("os") ? b.slice(0, -2) + "ians" : b + "ians"; }
function nameFor(n, kind) {
  const list = n && (kind === "person" ? n.personNames : n.cityNames);
  if (list && list.length) {
    if (kind === "person") return pick(list);
    const used = new Set(G.sets.filter(x => x.o === n.id).map(x => x.name)), free = list.filter(x => !used.has(x));
    if (free.length) return free[0]; // your own city names are used first, in order
  }
  return kind === "person" ? personName(n && n.plang || langOf(n)) : placeName(langOf(n));
}
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
/* national religion: only faiths that exist by the current date can be chosen */
const RELIGIONS = {
  animism:    { name: "Spirits of the land", icon: "🌿", y: -1e9, fam: "folk", pie: 10, tags: "spirits ancest harmony", d: "The old ways: spirits in the rivers, the beasts and the ancestors." },
  mystic:     { name: "Mysticism", icon: "🔮", y: -1e9, fam: "folk", pie: 18, tags: "spirits visions meditate", d: "Seers, visions and secret knowledge passed from master to student." },
  poly:       { name: "The old gods", icon: "🏺", y: -3500, fam: "poly", pie: 12, tags: "poly clergy kingship", d: "A family of gods with temples and priests, and rulers close to the divine." },
  hindu:      { name: "Hinduism", icon: "🕉️", y: -1500, fam: "dharma", pie: 12, tags: "poly rebirth clergy pilgrim diet meditate", d: "Dharma, many paths to the divine, and a society ordered by duty." },
  judaism:    { name: "Judaism", icon: "✡️", y: -1200, fam: "jew", pie: 12, tags: "mono scripture chosen diet fasting learning", d: "One God, a covenant, and a tradition of law and learning." },
  zoro:       { name: "Zoroastrianism", icon: "🔥", y: -1000, fam: "zoro", pie: 10, tags: "mono scripture clergy charity", d: "Good thoughts, good words, good deeds, and a cosmic struggle of light against darkness." },
  jain:       { name: "Jainism", icon: "🤲", y: -550, fam: "dharma", pie: 14, tags: "rebirth nonviol diet fasting monastic", d: "Non-violence toward every living thing." },
  buddhism:   { name: "Buddhism", icon: "☸️", y: -500, fam: "dharma", pie: 10, tags: "rebirth meditate monastic nonviol mission", d: "The middle way and an end to suffering." },
  confucian:  { name: "Confucianism", icon: "📜", y: -500, fam: "east", pie: 4, tags: "filial ancest learning kingship", d: "Order, duty to family and state, and rule by educated officials." },
  taoism:     { name: "Taoism", icon: "☯️", y: -400, fam: "east", pie: 8, tags: "harmony meditate monastic", d: "Living in harmony with the Way of nature." },
  shinto:     { name: "Shinto", icon: "⛩️", y: -300, fam: "east", pie: 10, tags: "spirits ancest kingship chosen", d: "The kami of places, ancestors and the ruling house." },
  christian:  { name: "Christianity", icon: "✝️", y: 33, to: 1054, fam: "christ", pie: 12, tags: "mono scripture clergy mission charity", d: "Salvation through Christ, charity and one church." },
  islam:      { name: "Islam", icon: "☪️", y: 610, to: 661, fam: "islam", pie: 14, tags: "mono scripture pilgrim fasting diet charity equality", d: "Submission to one God, as revealed to the Prophet." },
  catholic:   { name: "Catholic Christianity", icon: "⛪", y: 1054, fam: "christ", pie: 12, tags: "mono scripture clergy mission charity monastic pilgrim", d: "The church of Rome, led by the Pope." },
  orthodox:   { name: "Orthodox Christianity", icon: "☦️", y: 1054, fam: "christ", pie: 12, tags: "mono scripture clergy monastic fasting kingship", d: "The Eastern churches, close to the throne." },
  sunni:      { name: "Sunni Islam", icon: "☪️", y: 661, fam: "islam", pie: 14, tags: "mono scripture pilgrim fasting diet charity equality", d: "The way of the Prophet and the community's chosen caliphs." },
  shia:       { name: "Shia Islam", icon: "🕌", y: 661, fam: "islam", pie: 16, tags: "mono scripture clergy pilgrim fasting diet charity", d: "Followers of Ali and the Imams of the Prophet's family." },
  sikh:       { name: "Sikhism", icon: "🙏", y: 1469, fam: "dharma", pie: 12, tags: "mono scripture equality charity warrior", d: "One God, equality, and the saint-soldier." },
  protestant: { name: "Protestant Christianity", icon: "📖", y: 1517, fam: "christ", pie: 10, tags: "mono scripture mission work equality", d: "Scripture in the people's own tongue and hard work as a calling." },
  secular:    { name: "Secular", icon: "⚖️", y: 1700, fam: "none", pie: -15, tags: "freedom reason", d: "No state religion: people are free to believe as they choose." },
  atheist:    { name: "State atheism", icon: "🚫", y: 1917, fam: "none", pie: -35, tags: "reason", d: "Religion is pushed out of public life." } };
/* characteristics a faith gives your culture; many faiths share them. Some nudge how your people's character drifts */
const RTAGS = {
  spirits:  { name: "Spirits in nature", icon: "🌿" }, ancest: { name: "Ancestor veneration", icon: "🕯️" }, harmony: { name: "Harmony with nature", icon: "☯️" },
  visions:  { name: "Visions & seers", icon: "🔮", t: { pie: 5 }, lean: "devout" }, meditate: { name: "Meditation", icon: "🧘" },
  poly:     { name: "Many gods", icon: "🏛️" }, mono: { name: "One God", icon: "☝️" }, clergy: { name: "Priesthood", icon: "⛪", t: { pie: 5 }, lean: "devout" },
  kingship: { name: "Sacred rulers", icon: "👑", t: { con: 3 }, lean: "content" }, rebirth: { name: "Rebirth", icon: "🔄" },
  pilgrim:  { name: "Pilgrimage", icon: "🚶", t: { open: 4 }, lean: "open" }, diet: { name: "Dietary laws", icon: "🍽️" },
  scripture:{ name: "Holy scripture", icon: "📜" }, chosen: { name: "A people apart", icon: "🧬", t: { open: -6 }, lean: "insular" },
  fasting:  { name: "Fasting", icon: "🌙", t: { res: 4 }, lean: "hardy" }, learning: { name: "Learning & law", icon: "📚" },
  charity:  { name: "Charity", icon: "🤲", t: { con: 4 }, lean: "content" }, nonviol: { name: "Non-violence", icon: "🕊️", t: { mar: -12 }, lean: "peaceable" },
  monastic: { name: "Monasteries", icon: "🏯", t: { pie: 5 }, lean: "devout" }, mission: { name: "Missionaries", icon: "🧭", t: { open: 8 }, lean: "open" },
  filial:   { name: "Duty to family", icon: "👪" }, equality: { name: "Equality of believers", icon: "🤝" },
  warrior:  { name: "Warrior tradition", icon: "⚔️", t: { mar: 8 }, lean: "warlike" }, work: { name: "Work as a calling", icon: "⚒️", t: { ind: 10 }, lean: "industrious" },
  freedom:  { name: "Freedom of belief", icon: "🗽", t: { open: 8 }, lean: "open" }, reason: { name: "Reason over faith", icon: "💡", t: { pie: -5 }, lean: "worldly" } };
const tagsOf = k => ((RELIGIONS[k] || RELIGIONS.animism).tags || "").split(" ").filter(Boolean);
const relNudge = (n, trait) => tagsOf(n.relig || "animism").reduce((a, t) => a + ((RTAGS[t] && RTAGS[t].t && RTAGS[t].t[trait]) || 0), 0);
const tagChips = (k, mine) => tagsOf(k).map(t => `<span class="rtag ${mine && mine.includes(t) ? "on" : ""}">${RTAGS[t].icon} ${RTAGS[t].name}</span>`).join("");
/* customs: how your people live. No bonuses: they shape character over generations and how close other peoples feel */
const CUSTOMS = {
  burial:  { tech: "burial", name: "The dead", icon: "⚱️", opts: {
    earth: { name: "Buried in the earth", d: "The dead rest in graves near the living, with the things they will need." },
    fire:  { name: "Cremation", d: "The dead are given to the fire, and their ashes to the wind or the river." },
    sky:   { name: "Sky burial", d: "The dead are laid out on high places for the birds, returned to the world.", lean: "hardy" },
    tomb:  { name: "Tombs and preserving", tech: "masonry", d: "The great are preserved and sealed in tombs for the life to come.", lean: "devout" } } },
  kin:     { name: "Kinship", icon: "👪", opts: {
    clan:  { name: "Clans & kin", d: "Everyone belongs to a clan, and the clan comes first.", lean: "content insular" },
    house: { name: "Households", tech: "agriculture", d: "Each family keeps its own hearth and its own land." },
    self:  { name: "Individuals", tech: "enlightenment", d: "People make their own way, apart from their kin if they choose.", lean: "open restless" } } },
  marry:   { name: "Marriage", icon: "💍", opts: {
    within: { name: "Within the clan", d: "Marriages keep families and their ways close together.", lean: "insular" },
    out:    { name: "With neighbors", d: "Marriages tie the tribe to the peoples around it.", lean: "open" },
    arranged: { name: "Arranged alliances", tech: "monarchy", d: "Families arrange marriages for land, wealth and alliance." },
    free:   { name: "Free choice", tech: "enlightenment", d: "People marry whom they love.", lean: "content" } } },
  lead:    { name: "Who is listened to", icon: "🧓", opts: {
    elders: { name: "The eldest", d: "Age brings wisdom, and the old are obeyed.", lean: "devout content" },
    strong: { name: "The strongest", d: "Those who win fights and hunts have the loudest voice.", lean: "warlike" },
    able:   { name: "The most able", tech: "philosophy", d: "People are heard for their skill and learning, not their age or strength.", lean: "industrious" } } },
  justice: { name: "Justice", icon: "⚖️", opts: {
    feud:   { name: "Blood feud", d: "A wrong is avenged by the victim's kin.", lean: "warlike restless" },
    price:  { name: "Payment for wrongs", tech: "tribal", d: "A wrong is settled with a price paid to the victim's family.", lean: "content" },
    written: { name: "Written law", tech: "writing", d: "Laws are carved where all can see them, the same for everyone." },
    rights: { name: "Courts and rights", tech: "enlightenment", d: "Judges weigh the evidence, and the accused has rights.", lean: "open" } } },
  guests:  { name: "Strangers", icon: "🏕️", opts: {
    wary:   { name: "Wary of strangers", d: "Outsiders may be raiders or rivals for the hunt. They're watched until they prove themselves.", lean: "insular" },
    guest:  { name: "Sacred hospitality", d: "A guest at your fire is protected, whoever they are.", lean: "open" },
    all:    { name: "One humanity", tech: "philosophy", d: "All peoples share the same nature; a stranger is owed what any person is owed.", lean: "open content" } } },
  work:    { name: "Men's and women's work", icon: "🧺", opts: {
    split:  { name: "Separate roles", d: "Men hunt and fight; women gather, raise the children and keep the camp." },
    shared: { name: "Side by side", tech: "agriculture", d: "Everyone works the fields and herds together.", lean: "industrious" },
    equal:  { name: "Equal standing", tech: "ideology", d: "Men and women stand equal in work, property and voice.", lean: "open industrious" } } },
  arts:    { name: "Arts and stories", icon: "🎨", opts: {
    oral:   { name: "Songs and stories", d: "The past lives on in songs, stories and dances passed down by mouth." },
    monument: { name: "Great monuments", tech: "masonry", d: "Carved stone and great buildings speak for the people.", lean: "devout" },
    drama:  { name: "Theater and poetry", tech: "philosophy", d: "Plays and poems that question gods, rulers and the human heart.", lean: "open" },
    patron: { name: "Patronage", tech: "guilds", d: "The rich and powerful pay artists to glorify them." },
    free:   { name: "Free expression", tech: "massmedia", d: "Anyone may make and say what they like.", lean: "open restless" } } },
  feasts:  { name: "Festivals", icon: "🎉", opts: {
    season: { name: "Seasonal feasts", d: "The people gather to feast at the turn of the seasons.", lean: "content" },
    holy:   { name: "Holy days", tech: "mysticism", d: "Days set apart for the gods and the ancestors.", lean: "devout" },
    games:  { name: "Public games", tech: "construction", d: "Races, contests and spectacles for the crowds.", lean: "content warlike" } } },
  care:    { name: "The sick and the old", icon: "🩹", opts: {
    behind: { name: "Left behind", d: "When the tribe must move, those who can't keep up stay behind. Only the strong survive.", lean: "hardy" },
    kin:    { name: "Kept by their kin", d: "Families carry their own sick and old, as far as they can.", lean: "content" },
    healers: { name: "Healers and herbs", tech: "mysticism", d: "Healers who know the plants and the spirits tend the sick.", lean: "devout" },
    duty:   { name: "Duty to the weak", tech: "philosophy", d: "Caring for those who cannot care for themselves is what makes a people good.", lean: "content" },
    houses: { name: "Houses of healing", tech: "theology", d: "Temples and orders run places where the sick are nursed.", lean: "devout content" },
    public: { name: "Care for all", tech: "medicine", d: "Doctors and hospitals for everyone, rich or poor.", lean: "content open" } } },
  food:    { name: "Sharing food", icon: "🍖", opts: {
    hunters: { name: "Hunters eat first", d: "Those who bring the meat take the best of it. The rest get what's left.", lean: "warlike" },
    shared: { name: "Shared by all", d: "Every kill and every basket is shared out among all the families.", lean: "content" },
    giving: { name: "Feasts of giving", tech: "pottery", d: "The rich win honor by giving food away at great feasts.", lean: "open content" },
    trade:  { name: "Bought and sold", tech: "currency", d: "Food is a good like any other, bought and sold in the market.", lean: "industrious" } } },
  know:    { name: "Knowledge", icon: "📚", opts: {
    secret: { name: "Secrets of the elders", d: "What the elders know is guarded, and shared only with the chosen.", lean: "devout insular" },
    craft:  { name: "Master and apprentice", tech: "bronze", d: "Skills are passed from master to apprentice in the workshop.", lean: "industrious" },
    scribes: { name: "Scribes and schools", tech: "writing", d: "Scribes record what is known, and schools teach the few who can read." },
    debate: { name: "Debate and reason", tech: "philosophy", d: "Ideas are argued in the open, and the best argument wins.", lean: "open worldly" },
    inquiry: { name: "Inquiry and experiment", tech: "enlightenment", d: "Nothing is true until it is tested.", lean: "open worldly" } } },
  youth:   { name: "Coming of age", icon: "🏹", opts: {
    trial:  { name: "Trials of courage", d: "The young prove themselves through pain and danger.", lean: "hardy warlike" },
    rite:   { name: "Initiation rites", d: "The young are taught the sacred secrets of the people.", lean: "devout" },
    virtue: { name: "Training in virtue", tech: "philosophy", d: "The young are raised to be wise, brave and just, not only strong.", lean: "content" },
    school: { name: "Schooling", tech: "printing", d: "The young learn letters and numbers.", lean: "industrious" } } } };
const LEAN = { hardy: { res: 5 }, warlike: { mar: 6 }, peaceable: { mar: -6 }, devout: { pie: 5 }, worldly: { pie: -5 }, open: { open: 6 }, insular: { open: -6 }, content: { con: 4 }, restless: { con: -4 }, industrious: { ind: 6 } };
const cusOpen = (n, o) => !o.tech || has(n, o.tech);
const cusEra = o => o.tech ? TECH[o.tech].era : -1; /* -1: the primal, survival-born ways */
const cusAge = o => o.tech ? ERAS[TECH[o.tech].era] : "Primal";
function oldFashioned(n, k) { const O = CUSTOMS[k].opts, cur = O[(n.cus || {})[k]]; if (!cur) return false; const e = cusEra(cur);
  return n.era - Math.max(0, e) >= 2 && Object.values(O).some(o => cusOpen(n, o) && cusEra(o) > e); }
function ensureCustoms(n) { const c = n.cus || (n.cus = {});
  for (const k in CUSTOMS) { const O = CUSTOMS[k].opts; if (c[k] && O[c[k]] && cusOpen(n, O[c[k]])) continue;
    const open = Object.keys(O).filter(o => cusOpen(n, O[o])); c[k] = n.ai ? pick(open) : open[0]; }
  return c; }
const cusNudge = (n, trait) => { let v = 0; const c = n.cus || {}; for (const k in c) { const o = CUSTOMS[k] && CUSTOMS[k].opts[c[k]]; if (o && o.lean) for (const w of o.lean.split(" ")) v += (LEAN[w] && LEAN[w][trait]) || 0; } return v; };
function cusFit(a, b) { if (!a || !b) return 0; let v = 0; for (const k in CUSTOMS) if (a[k] && b[k]) v += a[k] === b[k] ? 1.5 : -1; return clamp(Math.round(v), -10, 12); }
const relOf = n => RELIGIONS[(n && n.relig) || "animism"] || RELIGIONS.animism;
const relOpen = k => { const R = RELIGIONS[k]; return R && G.year >= R.y && !(R.to && G.year >= R.to); };
const relYear = y => y < -1e8 ? "since time began" : y < 0 ? `about ${-y} BCE` : `${y} CE`;
function relFit(a, b) { a = a || "animism"; b = b || "animism"; if (a === b) return 10; const A = RELIGIONS[a], B = RELIGIONS[b]; if (!A || !B || A.fam === "none" || B.fam === "none") return 0;
  const ta = tagsOf(a), tb = tagsOf(b), sh = ta.filter(t => tb.includes(t)).length, un = new Set([...ta, ...tb]).size; return Math.round(-10 + 18 * sh / Math.max(1, un)); } /* the more they share, the closer they feel */
/* the faith a people of each land tends to take up, by date (other nations follow these) */
const REL_PATH = { euro: [[-3500, "poly"], [380, "christian"], [1054, "catholic"]], uralic: [[1200, "catholic"]], near: [[-3500, "poly"], [650, "islam"], [661, "sunni"]], south: [[-1500, "hindu"]], east: [[-3500, "poly"], [-300, "confucian"]], steppe: [[1300, "sunni"]], ocean: [], africa: [], amer: [[-1000, "poly"]] };
const REL_LANG = { slavic: [[-3500, "poly"], [988, "christian"], [1054, "orthodox"]], greek: [[-3500, "poly"], [380, "christian"], [1054, "orthodox"]], germanic: [[-3500, "poly"], [600, "christian"], [1054, "catholic"], [1530, "protestant"]], norse: [[-3500, "poly"], [1000, "catholic"], [1530, "protestant"]], english: [[-3500, "poly"], [600, "christian"], [1054, "catholic"], [1534, "protestant"]], dutch: [[1054, "catholic"], [1580, "protestant"]], persian: [[-1000, "zoro"], [650, "islam"], [661, "sunni"], [1501, "shia"]], semitic: [[-3500, "poly"], [-1000, "judaism"], [630, "islam"], [661, "sunni"]], tibetan: [[700, "buddhism"]], seasia: [[300, "buddhism"]], japanese: [[-300, "shinto"]], korean: [[-100, "confucian"]], ethiop: [[330, "christian"], [1054, "orthodox"]], wafrica: [[1100, "sunni"]], egyptian: [[-3500, "poly"], [350, "christian"], [700, "sunni"]], berber: [[700, "sunni"]], indic: [[-1500, "hindu"]], dravid: [[-1500, "hindu"]], amazon: [], inuit: [], abor: [], bantu: [] };
function regionalFaith(n) { const lg = langOf(n), path = REL_LANG[lg] || REL_PATH[LANG_FAM[lg]] || []; let r = "animism"; for (const [y, k] of path) if (G.year >= y) r = k; return r; }
const cul = n => CULTURES[n.cul] || CULTURES.mixed;
const culCache = new Map();
/* peoples: who lives in your nation, how close their ways are to yours, and how far they've blended in */
const LANG_FAM = {};
for (const [f, l] of Object.entries({ euro: "greek latin celtic iberian germanic norse slavic english french spanish portuguese italian german dutch russian", uralic: "finnic", near: "egyptian semitic berber sumer anatol persian arabic turkish", south: "indic dravid tibetan hindi", east: "chinese korean japanese seasia", steppe: "steppe", ocean: "austro abor", africa: "bantu wafrica ethiop swahili", amer: "nahuatl maya andean amazon northam inuit" })) for (const k of l.split(" ")) LANG_FAM[k] = f;
const ASSIM = { /* the national law on newcomers: whether they must take up your tongue and customs */
  free:  { name: "No rules", icon: "🕊️", m: 1, d: "Newcomers live as they like. Their children pick up your tongue and ways at their own pace." },
  enc:   { name: "Shared tongue encouraged", icon: "🤝", m: 1.5, d: "Your tongue and customs are taught and rewarded, not required. They blend in faster." },
  force: { name: "Our tongue, our customs", icon: "⛓️", m: 2.2, d: "Speaking your tongue and keeping your customs is required. Fastest, but both peoples resent it." },
  apart: { name: "Separate ways", icon: "🧱", m: .3, d: "They keep their own tongue and customs by law. Less friction, but they stay strangers for many generations." } };
function compatOf(n, g) { const fit = lg => lg === langOf(n) ? 80 : LANG_FAM[lg] && LANG_FAM[lg] === LANG_FAM[langOf(n)] ? 60 : 35; let c = Math.max(fit(g.lang), g.lang2 ? fit(g.lang2) - 5 : 0);
  if (g.cul && g.cul === n.cul) c += 10; c += relFit(n.relig, g.relig) + cusFit(n.cus, g.cus); c += ((n.trait && n.trait.open != null ? n.trait.open : 50) - 50) / 5; return clamp(Math.round(c), 5, 95); }
function ethOf(n) { if (!n.eth) { n.eth = []; n.ethV = 1; } return n.eth; }
/* each settlement knows what share of its families belong to which people; the national shares are their sum */
const setEth = x => x.eth || (x.eth = {});
function putIn(x, k, fam) { /* fam families of people k, already counted in x.pop */ const e = setEth(x), P1 = Math.max(1, x.pop), old = Math.max(0, x.pop - fam);
  for (const j in e) e[j] = e[j] * old / P1; e[k] = (e[k] || 0) + fam / P1; }
function takeSome(x, k, f) { const e = x.eth; if (!e || !e[k]) return 0; f = Math.min(f, e[k] * x.pop); const np = Math.max(2, x.pop - f);
  for (const j in e) e[j] = j === k ? Math.max(0, (e[j] * x.pop - f) / np) : e[j] * x.pop / np; if (e[k] < 1e-4) delete e[k]; x.pop = np; return f; }
function recalcShares(n) { const E = ethOf(n), tot = Math.max(1, popOf(n)), c = {}, me = String(n.id);
  for (const x of setsOf(n)) if (x.eth) for (const k in x.eth) { if (k === me || !E.some(g => g.k === k)) { if (k === me || !G.nations[k]) { delete x.eth[k]; continue; }
      const o = G.nations[k]; E.push({ k, name: demonym(o), lang: langOf(o), cul: o.cul, relig: o.relig || "animism", cus: { ...(o.cus || {}) }, share: 0, assim: 0, since: G.year }); } c[k] = (c[k] || 0) + x.pop * x.eth[k]; }
  for (const g of E) g.share = (c[g.k] || 0) / tot; }
function groupMeta(n, d, assim, fam, text) { const E = ethOf(n), k = String(d.k); let g = E.find(x => x.k === k);
  if (g) { const w = fam / Math.max(1, popOf(n)); g.assim = (g.assim * g.share + assim * w) / Math.max(1e-6, g.share + w); return g; }
  g = { ...d, k, share: 0, assim, since: G.year }; E.push(g);
  if (!n.ai && fam / Math.max(1, popOf(n)) >= .002) (G.pendingUnlocks || (G.pendingUnlocks = [])).push({ icon: "🧑‍🤝‍🧑", title: "A new people among us", text: text || `${Math.max(1, Math.round(fam))} famil${Math.round(fam) === 1 ? "y" : "ies"} of the ${g.name} now live among the ${demonym(n)}. Their ways ${compatOf(n, g) >= 60 ? "are close to yours" : "are strange to your people"}. Their children may grow up as ${demonym(n)}. The People tab shows how they're received.` });
  return g; }
function addPeople(n, o, fam, assim = 0, x) { if (!o || o.id === n.id) return; return addGroup(n, { k: String(o.id), name: demonym(o), lang: langOf(o), cul: o.cul, relig: o.relig || "animism", cus: { ...(o.cus || {}) } }, fam, assim, null, x); }
function addGroup(n, d, fam, assim = 0, text, x) { if (!(fam > 0) || String(d.k) === String(n.id)) return null;
  const g = groupMeta(n, d, assim, fam, text);
  if (x) putIn(x, g.k, fam); /* already counted where they live */
  else { const ss = setsOf(n); if (!ss.length) return g; const w = ss.map(y => y.pop * (.3 + Math.pow(receptionAt(n, y, g) / 50, 2))), tw = w.reduce((a, b) => a + b, 0) || 1;
    ss.forEach((y, i) => { const f = fam * w[i] / tw; if (f > 0) { y.pop += f; putIn(y, g.k, f); } }); n.inflow = (n.inflow || 0) + fam; } /* newcomers go where they're welcome */
  recalcShares(n); return g; }
function convertSet(n, dn, s) { /* a conquered settlement: its people become a people among yours */ const e = s.eth || {}, ne = {}; let minor = 0;
  for (const k in e) { minor += e[k]; if (k === String(n.id)) continue; const og = ethOf(dn).find(g => g.k === k); if (!og) continue;
    ne[k] = e[k]; groupMeta(n, { k, base: og.base, name: og.name, lang: og.lang, lang2: og.lang2, cul: og.cul, relig: og.relig, cus: og.cus, via: og.via }, 0, e[k] * s.pop); }
  const main = Math.max(0, 1 - minor); if (main > 0) { ne[String(dn.id)] = main; groupMeta(n, { k: String(dn.id), name: demonym(dn), lang: langOf(dn), cul: dn.cul, relig: dn.relig || "animism", cus: { ...(dn.cus || {}) } }, 0, main * s.pop); }
  s.eth = ne; }
/* where another people makes up most of a place, they run it: they set its ways and its welcome */
function dominantAt(x) { if (!x.eth) return null; let bk = null, bv = .5; for (const k in x.eth) if (x.eth[k] > bv) { bv = x.eth[k]; bk = k; } return bk; }
function fitPair(a, b) { const f = (p, q) => p === q ? 80 : LANG_FAM[p] && LANG_FAM[p] === LANG_FAM[q] ? 60 : 35;
  return clamp(Math.max(f(a.lang, b.lang), a.lang2 ? f(a.lang2, b.lang) - 5 : 0, b.lang2 ? f(a.lang, b.lang2) - 5 : 0) + (a.cul && a.cul === b.cul ? 10 : 0) + relFit(a.relig, b.relig) + cusFit(a.cus, b.cus), 5, 95); }
const mainOf = n => ({ k: String(n.id), name: demonym(n), lang: langOf(n), cul: n.cul, relig: n.relig || "animism", cus: n.cus });
const foreignAt = (n, x) => { let f = 0; if (x.eth) for (const k in x.eth) { const g = ethOf(n).find(q => q.k === k); f += x.eth[k] * (1 - (g ? g.assim : 0) / 100); } return f; };
/* for and against newcomers: some fear being outnumbered, employers love the cheap labor */
function immOpinion(n) { if (n._io && n._io.t === G.turn && n._io.sv === G.sv) return n._io.v; const v = immOpinion0(n); n._io = { t: G.turn, sv: G.sv, v }; return v; }
function immOpinion0(n) { const P0 = Math.max(1, popOf(n)); let fear = 0; for (const x of setsOf(n)) if (!dominantAt(x)) fear += x.pop * Math.max(0, foreignAt(n, x) - .15) / P0;
  const labor = (n.eth || []).reduce((a, g) => a + g.share * (1 - g.assim / 100), 0), inflow = (n.inflow || 0) / P0;
  return { fear, labor, inflow, wageCut: Math.min(.2, .35 * labor) }; }
/* how each place receives a people: the locals and their leader decide, not you */
function receptionAt(n, x, g) { if (!x.tmp) x.tmp = Math.round((rnd() - .5) * 24) || 1;
  const loc = (x.eth && x.eth[g.k]) || 0; if (loc > .5) return 85; /* where they're most of the town, they set the tone */
  const D = dominantAt(x); if (D) { const dg = D === String(n.id) ? mainOf(n) : ethOf(n).find(q => q.k === D);
    if (dg) return clamp(Math.round(50 + .6 * (fitPair(dg, g) - 50) + x.tmp + 5 * x.t + 20 * loc), 0, 100); }
  const shk = x.pop > 0 ? Math.min(1, Math.min(x.shk || 0, Math.max(0, x.pop - builtAt(x, "hut"))) / x.pop) : 0;
  const L = x.lead, lt = L ? (L.tol != null ? L.tol : (L.tol = Math.round((rnd() - .5) * 20))) : 0;
  return clamp(Math.round(50 + .5 * (trv(n, "open") - 50) + .6 * (compatOf(n, g) - 50) + x.tmp + lt + 5 * x.t - 60 * shk - (n.hungry ? 10 : 0) + 20 * loc - 50 * Math.max(0, foreignAt(n, x) - loc - .2)), 0, 100); } /* many newcomers already: the locals fear for their own ways */
const RCV = v => v >= 65 ? ["Welcoming", "good"] : v >= 45 ? ["Tolerant", ""] : v >= 30 ? ["Cold, some leave", "warn"] : ["Hostile, many leave", "bad"];
const adjOf = n => { const d = demonym(n); return d.endsWith("ians") || d.endsWith("ans") ? d.slice(0, -1) : d.endsWith("s") ? d.slice(0, -1) : d; };
const yrsAmong = g => Math.max(0, G.year - (g.since != null ? g.since : G.year));
/* a people that leaves after generations carries its host's ways with it, and becomes a people of two roots */
function diasporaOf(n, g) { const base = g.base || g.name, same = demonym(n) === base, long = yrsAmong(g) >= 50 && g.assim >= 15 && !same;
  return long ? { k: `${g.k}~${n.id}`, base, name: `${adjOf(n)} ${base}`, lang: g.lang, lang2: langOf(n), cul: n.cul, relig: g.relig, cus: g.cus, via: [...(g.via || []), demonym(n)], long }
    : { k: g.k, base: g.base, name: g.name, lang: g.lang, lang2: g.lang2, cul: g.cul, relig: g.relig, cus: g.cus, via: g.via, long: false }; }
function pickHome(n, g) { const c0 = capSet(n), home = g.k.split("~")[0];
  const opts = G.nations.filter(o => o.alive && o.id !== n.id && setsOf(o).length && (dip(n.id, o.id).met || String(o.id) === home)).map(o => { const c = capSet(o) || setsOf(o)[0];
    return { o, sc: trv(o, "open") + (String(o.id) === home ? 15 : 0) + 25 * rnd() - (c0 && c ? Math.hypot(c.x - c0.x, c.y - c0.y) * .6 : 0) - (dip(n.id, o.id).war ? 30 : 0) }; }).sort((a, b) => b.sc - a.sc);
  return opts.length ? opts[0].o : null; }
function arrive(n, to, d, fam, text) { if (!to) return null;
  if (String(d.k) === String(to.id)) { const ts = setsOf(to), tp = popOf(to); for (const x of ts) x.pop += fam * x.pop / Math.max(1, tp); if (to.id === G.player) log(`${Math.max(1, Math.round(fam))} families of our own people come home from the ${nm(n)}.`, "🏠"); return null; }
  const { long, ...dd } = d; return addGroup(to, dd, fam, 0, text); }
function expelGroup(n, i) { const E = ethOf(n), g = E[i]; if (!g) return; let fam = 0;
  for (const x of setsOf(n)) fam += takeSome(x, g.k, 1e9);
  E.splice(i, 1); recalcShares(n);
  const d = diasporaOf(n, g), to = pickHome(n, g), adj = Math.max(0, (1 - compatOf(n, g) / 100) * (1 - g.assim / 100));
  n.facMods.push({ k: "commoners", v: Math.round(4 + 25 * adj), why: `Expelled the ${g.name}`, t: yrsT(15) }); n.facMods.push({ k: "merchants", v: -6, why: `Lost the ${g.name}'s trades`, t: yrsT(15) });
  if (/^\d+$/.test(g.k) && G.nations[g.k] && G.nations[g.k].alive) { const dd = dip(n.id, +g.k); dd.rel = Math.max(-100, dd.rel - 15); }
  const where = to ? `the ${nm(to)}` : "the wilds";
  if (to) { arrive(n, to, d, fam, `${Math.max(1, Math.round(fam))} famil${Math.round(fam) === 1 ? "y" : "ies"} of the ${d.name} arrive, driven out by the ${nm(n)}. ${d.long ? `After ${Math.round(yrsAmong(g))} years there, they carry ${demonym(n)} ways as well as their own: a people of two roots.` : ""} The People tab shows how they're received.`);
    if (n.id !== G.player && to.id !== G.player && P() && dip(G.player, n.id).met) log(`The ${nm(n)} drove out the ${g.name}. They have gone to ${where}${d.long ? ` and are now known as the ${d.name}` : ""}.`, "🚶"); }
  if (n.id === G.player) hist(n, "🚶", `The ${g.name} were driven out${to ? ` to the ${nm(to)}` : ""}.`);
  if (n.id === G.player) (G.pendingUnlocks || (G.pendingUnlocks = [])).push({ icon: "🚶", title: `The ${g.name} are driven out`, text: `${Math.max(1, Math.round(fam))} families leave for ${where}.${d.long ? ` After ${Math.round(yrsAmong(g))} years among you, they take your ways with them: there they will be known as the ${d.name}.` : ""}` });
  G.sv++; }
function stepPeoples(n) { const E = n.eth; if (!E || !E.length) return; const pol = ASSIM[n.laws.assim || "free"] || ASSIM.free, yrs = 1 / TPY, ss = setsOf(n);
  for (const g of E) g.k = String(g.k);
  if (!n.ethV) { n.ethV = 1; if (!ss.some(x => x.eth && Object.keys(x.eth).length)) for (const g of E) for (const x of ss) setEth(x)[g.k] = g.share; } /* older saves: spread evenly */
  recalcShares(n);
  if (n.ai) for (let i = E.length - 1; i >= 0; i--) { const g = E[i]; if (g.share > .02 && yrsAmong(g) >= 40 && compatOf(n, g) < 55 && rnd() < .003 * (1.5 - trv(n, "open") / 100) * (1 - g.assim / 100)) { expelGroup(n, i); return; } }
  /* the city's welcome decides whether they stay: unwelcome families move to friendlier places, or leave your lands */
  for (const g of E) { let out = 0, worst = null;
    const rc = ss.map(x => receptionAt(n, x, g)), best = rc.reduce((bi, v, i) => v > (bi < 0 ? -1 : rc[bi]) ? i : bi, -1);
    ss.forEach((x, i) => { (x.rcv || (x.rcv = {}))[g.k] = rc[i]; const here = (x.eth && x.eth[g.k]) || 0; if (!here) return;
      const rate = rc[i] < 30 ? .08 : rc[i] < 45 ? .025 : 0; if (!rate) return;
      const f = takeSome(x, g.k, here * x.pop * (1 - Math.pow(1 - rate, yrs))); if (f <= 0) return; if (!worst || rc[i] < worst[1]) worst = [x, rc[i]];
      if (best >= 0 && best !== i && rc[best] >= 65) { const y = ss[best]; y.pop += f; putIn(y, g.k, f); } else out += f; });
    if (out > 0) { g.out = (g.out || 0) + out;
      if (g.out >= 1) { const fam = g.out; g.out = 0; const d = diasporaOf(n, g), to = pickHome(n, g);
        if (to) arrive(n, to, d, fam, `${Math.round(fam)} famil${Math.round(fam) === 1 ? "y" : "ies"} of the ${d.name} arrive from the ${nm(n)}, where they weren't welcome.${d.long ? ` After generations there, they carry ${demonym(n)} ways as well as their own.` : ""}`);
        if (!n.ai) log(`${Math.round(fam)} famil${Math.round(fam) === 1 ? "y" : "ies"} of the ${g.name} left your lands${to ? ` for the ${nm(to)}` : ""}${worst ? `: they aren't welcome in ${worst[0].name}` : ""}.`, "🚶"); } } }
  /* in places run by another people, your own families may feel unwelcome and move to your other towns */
  for (const x of ss) { const D = dominantAt(x); if (!D) { x.rcvMain = null; continue; } const dg = E.find(q => q.k === D); if (!dg) continue;
    const r = x.rcvMain = clamp(Math.round(50 + .6 * (fitPair(dg, mainOf(n)) - 50) + x.tmp), 0, 100), rate = r < 30 ? .08 : r < 45 ? .025 : 0; if (!rate) continue;
    const mine = 1 - Object.values(x.eth).reduce((a, v) => a + v, 0), f = Math.min(mine * x.pop, mine * x.pop * (1 - Math.pow(1 - rate, yrs))); if (f <= .01) continue;
    const to = ss.filter(y => y !== x && !dominantAt(y)).sort((a, b) => b.pop - a.pop)[0], np = Math.max(2, x.pop - f);
    for (const k in x.eth) x.eth[k] = Math.min(1, x.eth[k] * x.pop / np); x.pop = np; if (to) { to.pop += f; const e = to.eth; if (e) for (const k in e) e[k] *= (to.pop - f) / to.pop; } }
  n.inflow = (n.inflow || 0) * Math.pow(.5, yrs / 10);
  recalcShares(n);
  for (let i = E.length - 1; i >= 0; i--) { const g = E[i], gen = clamp((.15 + .5 * compatOf(n, g) / 100) * pol.m, .02, .9);
    g.assim += (100 - g.assim) * (1 - Math.pow(1 - gen, yrs / 25)); /* each new generation lets go of a share of the old ways */
    if (g.assim >= 95 || g.share < .0005) { E.splice(i, 1); for (const x of ss) if (x.eth) delete x.eth[g.k];
      if (!n.ai && g.share >= .001) { const t = `The ${g.name} who settled among you are now simply ${demonym(n)}. Their grandchildren know no other people.`;
        if (g.share >= .01) (G.pendingUnlocks || (G.pendingUnlocks = [])).push({ icon: "🫂", title: "One people", text: t }); else log(t, "🫂"); } } } }
function homeShares(n) { let p = 0, s = 0, z = 0; for (const x of setsOf(n)) { const need = Math.max(0, x.pop - builtAt(x, "hut")), k = Math.min(x.shk || 0, need); p += x.pop; s += k; z += Math.max(0, need - k); }
  return { shk: s / Math.max(1, p), none: z / Math.max(1, p), nShk: s, nNone: z }; }
/* traits: a spectrum for each, drifting over generations with how your people live and feel */
const TRAITS = {
  res:  { name: "Resilience", lo: "Soft", hi: "Hardy", icon: "🪨", d: "Hardship survived makes a hardy people. Hardy families die less in the cold and grumble less about rough living. It fades slowly in easy times." },
  ind:  { name: "Work ethic", lo: "Idle", hi: "Industrious", icon: "⚒️", d: "Grows when many hands build and make things. Industrious people gather more materials." },
  mar:  { name: "Martial spirit", lo: "Peaceable", hi: "Warlike", icon: "⚔️", d: "Grows with many warriors and with war. Warlike people cheer the warriors; peaceable ones resent them." },
  pie:  { name: "Piety", lo: "Worldly", hi: "Devout", icon: "🕯️", d: "Grows with elders, shrines and temples. Devout people follow the elders." },
  open: { name: "Openness", lo: "Insular", hi: "Open", icon: "🧭", d: "Grows with contact, trade and newcomers living among you. Open people accept newcomers more easily." },
  con:  { name: "Temper", lo: "Restless", hi: "Content", icon: "🙂", d: "Follows the people's mood over the years. Content people keep trusting their leaders; restless ones lose trust faster." } };
function traitTargets(n, E, H) { const tr = tribal(n), sh = k => tr ? timeShare(n, k) : 0, wars = G.nations.filter(o => o.alive && atWar(n.id, o.id)).length;
  const ks = Object.keys(FACTIONS).filter(k => facActive(n, k)), mood = ks.length ? ks.reduce((a, k) => a + n.fac[k], 0) / ks.length : 50;
  const minor = (n.eth || []).reduce((a, g) => a + g.share, 0), tp = setsOf(n).filter(x => builtAt(x, "temple")).length, cu = n.cul;
  return {
    res: 25 + 75 * clamp(H * 2.5, 0, 1),
    ind: (tr ? 20 + 220 * Math.max(0, sh("build") - .05) : 40 + 3 * Math.min(10, chainLevels(n, "ind"))) + (cu === "industrious" ? 15 : 0),
    mar: (tr ? 15 + 160 * Math.max(0, sh("warrior") - .05) : 35) + 15 * Math.min(3, wars) + (cu === "martial" ? 15 : 0),
    pie: (tr ? 20 + 220 * Math.max(0, sh("elder") - .03) + 15 * structCov(n, "shrine") : 40 + ({ faith: 20, sec: -20 }[n.laws.rel] || 0) + Math.min(20, 5 * tp)) + relOf(n).pie - 10,
    open: 15 + 6 * Math.min(8, metCount(n)) + 40 * minor + (tr ? 100 * sh("scout") : 3 * Math.min(6, ((E && E.partners) || []).length)) + (cu === "mercantile" ? 10 : 0),
    con: mood };
}
function stepTraits(n, E, H) { const tg = traitTargets(n, E, H), yrs = 1 / TPY;
  if (!n.trait) { n.trait = {}; for (const k in TRAITS) n.trait[k] = clamp(tg[k], 0, 100); n.trait.res = Math.max(n.trait.res, 55); }
  const T = n.trait;
  for (const k in TRAITS) tg[k] += relNudge(n, k) + cusNudge(n, k);
  if (projDone(n, "mound")) tg.pie += 8; if (tribal(n)) tg.open += 6 * structCov(n, "post");
  for (const k in TRAITS) { const t = clamp(tg[k], 0, 100), r = k === "res" ? (t > T[k] ? .2 : .03) : .06; T[k] += (t - T[k]) * (1 - Math.pow(1 - r, yrs)); }
  n.traitT = tg; }
const trv = (n, k) => n.trait && n.trait[k] != null ? n.trait[k] : 50;
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
function log(text, icon = "•", who = null) { G.news.push({ t: AW(text), i: icon, p: who === null || who === G.player }); }

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
// how far settlers will walk (or row) from their old home to found a new village
const settleRange = (n, directed) => (2 + .5 * (n ? n.era : 0) + (n && has(n, "wheel") ? .5 : 0)) * (directed ? 2 : 1) * (projDone(n, "trails") ? 1.3 : 1);
function overLand(ax, ay, bx, by) { const lp = getLandPath(), steps = Math.max(2, Math.ceil(Math.hypot(bx - ax, by - ay) / .35)); for (let i = 1; i < steps; i++) if (!sampler.isPointInPath(lp, ax + (bx - ax) * i / steps, ay + (by - ay) * i / steps, "evenodd")) return false; return true; }
function samplePoint(ri, nearPt, owner = -1, maxD = 40, needLand = false) {
  const S = W.regions[ri];
  if (!sampler) sampler = document.createElement("canvas").getContext("2d");
  const c = nearPt || { x: S.lx, y: S.ly };
  const h0 = .07;
  let best = null, bd = 1e9;
  for (let R = .22; R < maxD * 1.5 && !best; R *= 1.45) {
    for (let i = 0; i < 24; i++) {
      const a = rnd() * Math.PI * 2, d = R * (.55 + rnd() * .45), x = c.x + Math.cos(a) * d, y = c.y + Math.sin(a) * d;
      if (d > maxD) continue; // settlers don't wander far
      if (!sampler.isPointInPath(S.path, x, y, "evenodd")) continue;
      if (needLand && nearPt && !overLand(c.x, c.y, x, y)) continue; // without boats, they can't cross water
      let ok = true, crowd = 0;
      for (const o of nearSets(x, y, 4)) {
        const cheb = Math.hypot(o.x - x, o.y - y), oh = o.h ? radTo(o, x, y) : .08;
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
function addSettlement(nid, ri, pop, from, name, tier = 0, directed = false, at = null) {
  const nn = G.nations[nid];
  const pt = at ? [at.x, at.y] : from ? samplePoint(ri, from, G.nations.length > 1 ? nid : -1, settleRange(nn, directed), !(nn && (has(nn, "sailing") || setsOf(nn).some(x => builtAt(x, "canoe") > 0)))) : samplePoint(ri, from, G.nations.length > 1 ? nid : -1);
  if (!pt && from) return null;
  const [x, y] = pt || [W.regions[ri].lx, W.regions[ri].ly];
  const s = { id: G.sid++, o: nid, r: ri, t: tier, pop, b: { hut: Math.ceil(pop * (!from && (G.turn || 0) < 2 ? 1.2 : 1)) }, pq: [], qp: 0, name: name || nameFor(G.nations[nid], "place"), x, y, c: nid, u: 0, q: 0, f: G.turn, h: .05, hp: 1 };
  if (from && nid === G.player && G.fog) { // the settlers know the way they walked
    const d = Math.hypot(x - from.x, y - from.y), steps = Math.ceil(d / .8);
    for (let i = 1; i < steps; i++) addDisc(from.x + (x - from.x) * i / steps, from.y + (y - from.y) * i / steps, .9);
  }
  if (from && from.eth && from.o === nid) s.eth = { ...from.eth }; /* settlers carry their mix of peoples with them */
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
/* small villages raise more children; big ones eat more, defend better and raise great minds */
const bigF = s => s.t > 0 ? 1 : clamp((s.pop - 50) / 100, 0, 1);
const birthF = s => s.t > 0 ? 1 : 1.25 - .45 * clamp((s.pop - 25) / 125, 0, 1);
function hOf(s) { const n = G.nations[s.o]; const apc = APC[s.t] / (1 + .05 * (n ? n.era : 0)); return Math.max(.05, Math.sqrt(s.pop * apc) / 48 * 1.13); }
function growBorders() {
  for (const s of G.sets) { if (s.hp == null) s.hp = HP[s.t];
    if (s.hp < HP[s.t] && G.tt - (s.hit || 0) > 3) s.hp++;
    if (s.h == null) s.h = hOf(s) * .6; }
  for (const s of G.sets) {
    let target = hOf(s) * 1.9 * (1 + (s.expDir == null ? .25 * (s.exp || 0) : 0)); // worked land plus the free hunting and grazing land around it, and any land you've chosen to claim
    const near = nearSets(s.x, s.y, 9);
    let gapMin = 1e9; for (const o of near) if (o.o !== s.o) gapMin = Math.min(gapMin, chebGap(s, o));
    if (gapMin < 4) target = Math.max(target, Math.min(hOf(s) * 6, s.h + gapMin)); // frontier: push the claim out toward the neighbors
    let lim = Math.min(target, s.h + Math.max(.03, s.h * .2) * TD), wall = 1e9;
    for (const o of near) { if (o.o === s.o) continue;
      wall = Math.min(wall, (Math.hypot(o.x - s.x, o.y - s.y) - radTo(o, s.x, s.y) - .01) / lobe(s, Math.atan2(o.y - s.y, o.x - s.x))); }
    s.wall = wall < target ? Math.max(.04, wall) : null; // hemmed in by a neighbor: the land can't grow past here
    s.h = Math.max(.04, Math.min(lim, wall));
  }
  G.sv++;
}
// a settlement's claim can bulge one way: expanding in a direction pushes a lobe of land out that side
const hgAt = (s, ang) => { if (!s.hg) return 0; let v = 0; for (let k = 0; k < 8; k++) if (s.hg[k]) { const c = Math.cos(ang - k * Math.PI / 4); if (c > 0) v += s.hg[k] * c * c * c * c; } return v; };
const lobe = (s, ang) => { if (!s.exp || s.expDir == null) return 1; const c = Math.cos(ang - s.expDir); return 1 + .5 * s.exp * Math.pow(Math.max(0, c), 1.5); };
/* the village itself: the patch of huts and hearths, separate from the land it claims. Each new hut spreads it a little, but only toward open ground */
const footR0 = s => (.011 + .019 * Math.sqrt(clamp(s.pop / 150, 0, 1))) * (1 + .35 * s.t); /* a camp of 30 families is small; it fills out as it grows */
const footAt = (s, ang) => footR0(s) * (1 + hgAt(s, ang));
function hutGrow(x) { const hg = x.hg || (x.hg = [0, 0, 0, 0, 0, 0, 0, 0]), near = nearSets(x.x, x.y, 4).filter(o => o !== x), open = [];
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; if (hg[k] >= 1.2) continue;
    if (!near.some(o => { const d = Math.hypot(o.x - x.x, o.y - x.y), ao = Math.atan2(o.y - x.y, o.x - x.x), da = Math.abs(((ao - a) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI); return da < .65 && d < .9 + footAt(x, ao) + footAt(o, ao + Math.PI); })) open.push(k); } /* a neighbor close by on that side: no room to spread */
  for (const k of open) hg[k] = Math.min(1.2, hg[k] + .02 / Math.max(1, open.length / 3)); }
const radTo = (s, x, y) => (s.h || .05) * lobe(s, Math.atan2(y - s.y, x - s.x));
const chebGap = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) - radTo(a, b.x, b.y) - radTo(b, a.x, a.y);
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
  const n = { id, name, color, ai, lang: ri >= 0 ? langOfRegion(ri) : null, pers: pers || "builder", cul: culture || "mixed", culCool: 0, alive: true, gov: "tribe", govCool: 0, anarchy: 0, opposition: 0,
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
  G = { v: 2, turn: 1, tt: 0, month: 0, year: -3600, player: 0, nations: [], regions: [], sets: [], sid: 1, sv: 0, bld: {}, cons: {}, dip: {}, news: [], diff: opts.diff, over: false, nextEvent: 4, lastReport: [] };
  for (let i = 0; i < NR; i++) G.regions.push({ i, ctrl: -1 });
  const start = RID[opts.start];
  newNation(opts.name, opts.color, start, false, "builder", opts.cul || "mixed");
  const used = [start], colors = COLORS.filter(c => c !== opts.color);
  const addTribe = r => { used.push(r); const n = newNation(placeName(langOfRegion(r)), colors.shift() || `hsl(${Math.floor(rnd() * 360)},60%,52%)`, r, true, pick(Object.keys(PERS))); { const r0 = rnd(); n.cul = r0 < .1 ? "scholarly" : r0 < .2 ? "mixed" : ({ aggressive: "martial", zealot: rnd() < .5 ? "martial" : "agrarian", builder: rnd() < .5 ? "industrious" : rnd() < .5 ? "agrarian" : "martial", trader: rnd() < .7 ? "mercantile" : "martial" })[n.pers]; }
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
const scoutSight = n => (.8 + .4 * n.era + (has(n, "sailing") ? .3 : 0) + (has(n, "navigation") ? .8 : 0)) * (tribal(n) ? .9 + 2 * timeShare(n, "scout") : 1) * (tribal(n) && setsOf(n).some(x => builtAt(x, "watch")) ? 1.15 : 1) * (tribal(n) && has(n, "signs") ? 1.1 : 1);
const villageReach = n => clamp(scoutSight(n) * 1.1, .7, 2.2); /* how far families will walk to found a new village */
let placeMode = null; /* choosing where a new village goes */
function placeCheck(n, donor, x, y) { const R = villageReach(n); if (Math.hypot(x - donor.x, y - donor.y) > R) return { why: "Too far: families won't walk beyond your scouts' reach." };
  if (!sampler) sampler = document.createElement("canvas").getContext("2d");
  if (!sampler.isPointInPath(getLandPath(), x, y, "evenodd")) return { why: "That's water." };
  const ri = W.regions.findIndex(S => sampler.isPointInPath(S.path, x, y, "evenodd")); if (ri < 0) return { why: "Choose a spot on land." };
  if (!has(n, "boats") && !has(n, "sailing") && !overLand(donor.x, donor.y, x, y)) return { why: "Without boats, they can't cross the water." };
  for (const o of nearSets(x, y, 4)) { const d = Math.hypot(o.x - x, o.y - y), oh = o.h ? radTo(o, x, y) : .08;
    if (o.o !== n.id && d < oh + .1) return { why: "That land belongs to another people." }; if (d < Math.min(oh, .3) + .19) return { why: `Too close to ${o.name}.` }; }
  return { ok: true, ri }; }
function foundAt(n, donor, x, y) { const c = placeCheck(n, donor, x, y); if (!c.ok) return c; const cost = villageCost(n); if (n.gold < cost.g || n.mat < cost.m) return { why: "You can't afford to found a village right now." };
  const s = addSettlement(n.id, c.ri, MOVERS, donor, null, 0, false, { x, y }); if (!s) return { why: "They couldn't settle there." };
  n.gold -= cost.g; n.mat -= cost.m; donor.pop -= MOVERS; donor.moveAsk = false; n.founded = (n.founded || 0) + 1;
  log(`Settlers from ${donor.name} founded the village of ${s.name}.`, "🛖"); if (n.founded <= 3) hist(n, "🛖", `Families from ${donor.name} founded the village of ${s.name}.`); return { ok: true, s }; }
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
  const s = addSettlement(n.id, ri, MOVERS, donor, null, 0, true);
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
  hist(n, s.t === 0 ? "🏘️" : "🏙️", `${s.name} grew into a ${s.t === 0 ? "town" : "city"}.`);
  const c = s.t === 0 ? townCost(n) : cityCost(n);
  n.gold -= c.g; n.mat -= c.m;
  if (s.t === 0) { // villages merge: everyone moves together into one town
    const mates = mergeMates(n, s);
    { const all = [s, ...mates], tp = all.reduce((a, m) => a + m.pop, 0) || 1, ne = {}; for (const m of all) if (m.eth) for (const k in m.eth) ne[k] = (ne[k] || 0) + m.eth[k] * m.pop / tp; if (Object.keys(ne).length) s.eth = ne; }
    for (const m of mates) { s.pop += m.pop; if (n.cap === m.id) n.cap = s.id; G.sets.splice(G.sets.indexOf(m), 1); }
    s.u = Math.min(s.u, ...mates.map(m => m.u)); s.ov = 0; s.crowd = false;
    sb(s); for (const m of mates) if (m.b) for (const k in m.b) s.b[k] = (s.b[k] || 0) + m.b[k];
    if (!n.ai) log(`${[s, ...mates].map(x => x.name).join(", ").replace(/, ([^,]*)$/, " and $1")} merged into the town of ${s.name}!`, "🏘️");
  } else if (!n.ai) log(`${s.name} grew into a city!`, "🏙️");
  s.t++; G.sv++;
  recomputeControl(s.r);
}

// ================= ECONOMY =================
function stratHave(n, res) { for (const ri of pres(n)) if (W.regions[ri].r === res) return true; return false; }
// ---- trade: markets open once you establish the Trade field (Barter Markets). Then you can sign agreements,
// put tariffs on a people's goods, or embargo them, and your sectors can import and export ----
const tradeOpen = n => lv(n, "barter") >= 1;
// economic ideas arrive with technology: tribes just barter with neighbors; markets, money, tariffs, guilds and world-famous brands come later
const ECO = { markets: "bronze", tariffs: "currency", embargo: "currency", wages: "currency", cityPolicy: "currency", levels: "guilds", nationalize: "absolutism", brands: "navigation" };
const ECO_NAME = { markets: "Bronze Working", tariffs: "Currency", embargo: "Currency", wages: "Currency", cityPolicy: "Currency", levels: "Guilds", nationalize: "Absolutism", brands: "Navigation" };
const eco = (n, f) => has(n, ECO[f]);
// popups the moment a new part of the economy opens up for you
const UNLOCKS = [
  { id: "research", ok: n => resOpen(n), icon: "🔬", title: "Knowledge", text: "The elders' talks have changed your people. What they learn can now be kept, shared and built upon. The Research tab opens a path of discoveries to pursue, and in Develop your people can build up fields of work: farming, crafts, trade and more." },
  { id: "state", ok: n => !!n.stateUp, icon: "📒", title: "Division of labor", text: "Your people have grown too many for hunters and warriors to feed. Families take up trades: farmers, potters, builders, soldiers. Now there's real wealth to manage: instead of deciding who hunts and who fights, each year you set a budget, the army is paid from it instead of hunting for its keep, and you can choose how you're governed and set laws on taxes and trade." },
  { id: "markets", ok: n => eco(n, "markets"), icon: "🏭", title: "Industries", text: "Your people now work in industries: Housing, Agriculture, Construction and Mining. In the Trade tab, each one shows what your people need, what you make, and what you buy or sell abroad. You can invest public money in them or subsidize them." },
  { id: "money", ok: n => eco(n, "wages"), icon: "💰", title: "Money", text: "Coins change everything. Workers now earn wages, and better-paid people spend more, which you collect in taxes. You pay everyone the state employs. You can put tariffs on foreign goods and embargo other peoples, and each town's leader now sets local trade policy following the direction you choose in the Trade tab." },
  { id: "levels", ok: n => eco(n, "levels"), icon: "🛠️", title: "Guilds", text: "Craftsmen organize into guilds, so industries now build skill. Steady production and good wages raise each industry's level, and higher levels make more, more cheaply." },
  { id: "nationalize", ok: n => eco(n, "nationalize"), icon: "👑", title: "State industry", text: "The crown can now run industries itself. Nationalizing a sector gives steady output whatever the cost, but the state pays its workers and eats any losses. Merchants hate it." },
  { id: "brands", ok: n => eco(n, "brands"), icon: "🌍", title: "World trade", text: "Your ships can reach the whole known world. Your cities' industries can now become famous abroad: the more a city exports, the further its name spreads, and the world's 5 best-known city brands in each sector are powerhouses. Premium brands sell dearer and lift wages; cheap ones sell in bulk but carry a lasting label." },
  { id: "sailing", ok: n => has(n, "sailing") && tradeOpen(n), icon: "⛵", title: "Trade by sea", text: "Your traders can now cross short seas, reaching peoples who also sail." },
  { id: "wheel", ok: n => has(n, "wheel") && tradeOpen(n), icon: "🛞", title: "Carts and roads", text: "Wheeled carts carry your trade further overland." },
];
const ERA_ARMS = ["", "Bronze spears, shields and the first chariots", "Iron swords and drilled legions", "Armored knights and stone castles", "Gunpowder: muskets and cannon", "Rifles, artillery and railways to the front", "Tanks, aircraft and radio", "Precision missiles, drones and satellites"];
function checkGovMil(n, fresh, pend) {
  const seen = n.ecoSeen, add = (id, ok) => { if (seen[id] || !ok) return false; seen[id] = 1; return !fresh; };
  const canGov = !tribal(n), cities = setsOf(n).some(x => canAcad(n, x));
  const govs = Object.entries(GOVS).filter(([g, G2]) => G2.tech && add("gov:" + g, canGov && has(n, G2.tech)));
  if (govs.length) pend.push({ icon: "🏛️", title: govs.length > 1 ? "New forms of government" : `New government: ${govs[0][1].name}`, text: govs.map(([, G2]) => `${G2.name}: ${G2.d}`).join(" ") + " You can switch in the Laws tab." });
  const laws = [];
  for (const lk of Object.keys(LAWS)) { const vis = !tribal(n) || ["cons", "migr", "rel"].includes(lk), L = lawView(n, lk); if (L.tech && add("law:" + lk, vis && has(n, L.tech))) laws.push(`${L.name} law: ${Object.values(L.opts).map(o => o[0]).join(" or ")}.`);
    for (const [ok, o] of Object.entries(L.opts)) if (o[1] && (!L.tech || has(n, L.tech)) && add("lawopt:" + lk + ":" + ok, vis && has(n, o[1]))) laws.push(`${L.name}: ${o[0]}. ${o[2]}`); }
  if (laws.length) pend.push({ icon: "📜", title: laws.length > 1 ? "New laws" : "New law", text: laws.join(" ") + " See the Laws tab." });
  const cmds = Object.entries(CMDS).filter(([k, c]) => c.tech && add("cmd:" + k, has(n, c.tech)));
  if (cmds.length) pend.push({ icon: "🎖️", title: cmds.length > 1 ? "New ways to command the army" : `New army command: ${cmds[0][1].name}`, text: cmds.map(([, c]) => `${c.name}: ${c.d}`).join(" ") + " Reorganize in the Army tab (each choice is locked in for 25 years)." });
  if (add("milacad", has(n, "bronze") && cities)) pend.push({ icon: "🏰", title: "Military academies", text: "Your cities can now found military academies. They train officers, who make every regiment stronger, and now and then a general who leads attacks. You're limited by the size of your nation. See the Army tab." });
  if (add("acad", has(n, "writing") && cities)) pend.push({ icon: "🎓", title: "Academies", text: "With writing, your cities can found academies that train scientists. Each scientist speeds up research, but they draw a salary. See the Research tab." });
  const strat = STRAT_NEED.filter(x => x.from <= n.era && x.to >= n.era && (!RES[x.res].tech || has(n, RES[x.res].tech)) && add("strat:" + x.res, !tribal(n) && tradeOpen(n))); // only once you can trade for it
  if (strat.length) pend.push({ icon: RES[strat[0].res].icon, title: "Armies need new resources", text: strat.map(x => `${RES[x.res].icon} ${RES[x.res].name}: ${x.pen ? `without it your army fights at −${Math.round(x.pen * 100)}%` : `having it gives +${Math.round(x.bonus * 100)}% strength`}.`).join(" ") + " Hold land with it, or import it from a trade partner." });
  if (n.era > 0 && add("arms:" + n.era, true)) pend.push({ icon: "⚔️", title: `${ERAS[n.era]} armies`, text: `${ERA_ARMS[n.era]}. Your regiments are much stronger than before, but so are theirs, and upkeep rises.` });
}
function checkFaiths(n) {
  ensureCustoms(n);
  if (n.ai) { if (rnd() < 1 / (TPY * 40)) { const k = pick(Object.keys(CUSTOMS)), O = CUSTOMS[k].opts, open = Object.keys(O).filter(o => cusOpen(n, O[o])); n.cus[k] = rnd() < .5 ? open[open.length - 1] : pick(open); } }
  else { const seen = n.cusSeen || (n.cusSeen = {}), fresh = !n.cusSeen._init; seen._init = 1;
    const by = {};
    for (const k in CUSTOMS) for (const o in CUSTOMS[k].opts) { const O = CUSTOMS[k].opts[o], id = k + "." + o; if (seen[id] || !cusOpen(n, O)) continue; seen[id] = 1;
      if (!fresh && O.tech) (by[O.tech] || (by[O.tech] = [])).push([k, O]); }
    for (const t in by) { const L = by[t];
      (G.pendingUnlocks || (G.pendingUnlocks = [])).push(L.length === 1 ? { icon: CUSTOMS[L[0][0]].icon, title: `A new custom: ${L[0][1].name}`, text: `${L[0][1].d} Your people could take it up (Laws › Customs › ${CUSTOMS[L[0][0]].name}).` }
        : { icon: "🎎", title: `${TECH[t].name} opens new ways of living`, text: `${L.map(([k, O]) => `${CUSTOMS[k].name}: ${O.name}`).join(". ")}. Your people could take them up (Laws › Customs).` }); } }
  if (!n.relig) n.relig = n.laws && n.laws.rel === "sec" && relOpen("secular") ? "secular" : "animism";
  if (n.laws) { const none = relOf(n).fam === "none"; if (none) n.laws.rel = "sec"; else if (n.laws.rel === "sec") n.laws.rel = "faith"; } /* faith and state follow the national religion */
  if (n.ai) { const f = regionalFaith(n); if (f !== n.relig && relOpen(f) && rnd() < 1 / (TPY * 15)) { n.relig = f; if (G.player != null && dip(G.player, n.id).met) log(`The ${nm(n)} have taken up ${RELIGIONS[f].name}.`, RELIGIONS[f].icon); } return; }
  const seen = G.relSeen || (G.relSeen = {});
  for (const k in RELIGIONS) { if (seen[k] || !relOpen(k)) continue; seen[k] = 1; const R = RELIGIONS[k]; if (R.y < -1e8 || G.turn < 2) continue; whist(R.icon, `A new faith arose: ${R.name}.`, "first", []);
    (G.pendingUnlocks || (G.pendingUnlocks = [])).push({ icon: R.icon, title: `A new faith: ${R.name}`, text: `${R.d} You can make it your national religion in the Laws tab.` }); }
  if (RELIGIONS[n.relig] && RELIGIONS[n.relig].to && G.year >= RELIGIONS[n.relig].to && !n.relSplitSeen) { n.relSplitSeen = 1;
    (G.pendingUnlocks || (G.pendingUnlocks = [])).push({ icon: RELIGIONS[n.relig].icon, title: `${RELIGIONS[n.relig].name} has split`, text: `The faithful have divided into rival branches. For now your people keep the old ways; you can choose a branch in the Laws tab.` }); }
}
function checkUnlocks(n) {
  checkFaiths(n);
  if (n.ai || n.id !== G.player) return;
  const fresh = !n.ecoSeen; if (fresh) n.ecoSeen = {};
  const pend = G.pendingUnlocks || (G.pendingUnlocks = []);
  const gmFresh = fresh || !n.ecoSeen._gm; n.ecoSeen._gm = 1; // older saves: note what's already known without popping it all up
  checkGovMil(n, gmFresh, pend);
  for (const u of UNLOCKS) if (!n.ecoSeen[u.id] && u.ok(n)) { n.ecoSeen[u.id] = 1; if (!fresh) pend.push({ icon: u.icon, title: u.title, text: u.text }); }
  const newSec = Object.keys(SECTORS).filter(k => secUnlocked(n, k) && !n.ecoSeen["sec:" + k] && SECTORS[k].era > 1);
  for (const k of Object.keys(SECTORS)) if (secUnlocked(n, k)) n.ecoSeen["sec:" + k] = 1;
  if (newSec.length && !fresh) pend.push({ icon: SECTORS[newSec[0]].icon, title: `New industr${newSec.length > 1 ? "ies" : "y"}`, text: `${newSec.map(k => `${SECTORS[k].icon} ${SECTORS[k].name}: ${SECTORS[k].d.toLowerCase()}`).join(" ")} You'll find ${newSec.length > 1 ? "them" : "it"} in the Trade tab.` });
}
function showUnlocks(next) {
  const u = G && G.pendingUnlocks && G.pendingUnlocks.shift();
  if (!u) return next && next();
  showModal(`<div class="mi">${u.icon}</div><h2>${esc(u.title)}</h2><p>${esc(u.text)}</p><div class="row"><button class="btn" data-m="ok">Got it</button></div>`, () => { save(); showUnlocks(next); });
}
// how far trade reaches: neighbors at first, then across short seas, then the whole known world
function tradeReach(n, o) {
  if (has(n, "navigation") && has(o, "navigation")) return true;
  if (bordersTouch(n, o)) return true;
  const a = capSet(n), b = capSet(o); if (!a || !b) return false;
  const d = Math.hypot(a.x - b.x, a.y - b.y), sea = has(n, "sailing") && has(o, "sailing");
  return d < (sea ? 80 : 40) + (has(n, "wheel") ? 10 : 0);
}
const reachTxt = n => has(n, "navigation") ? "the whole known world" : has(n, "sailing") ? "your region and across short seas" : "your near neighbors";
function tradePartners(n) { return G.nations.filter(o => o.alive && o.id !== n.id && dip(n.id, o.id).trade && !dip(n.id, o.id).emb && tradeReach(n, o) && dip(n.id, o.id).rel >= Math.max(tradeTrust(n), tradeTrust(o)) - 20 && !atWar(n.id, o.id)); }
// early peoples are wary of strangers: they trade only with those they trust, and they open up as they meet more of the world
let metKey = null, metMap = new Map();
function metCount(o) { if (metKey !== G.turn) { metKey = G.turn; metMap = new Map(); } let c = metMap.get(o.id); if (c == null) { c = 0; for (const x of G.nations) if (x.alive && x.id !== o.id && dip(o.id, x.id).met) c++; metMap.set(o.id, c); } return c; }
const tradeTrust = o => o.id === G.player && !o.ai ? -100 : Math.max(-20, 20 - 5 * Math.min(6, metCount(o)) - (o.era >= 2 ? 10 : 0) - (o.era >= 4 ? 10 : 0) - (o.pers === "trader" ? 10 : 0) - (turnCache("po" + o.id, () => setsOf(o).some(x => builtAt(x, "post"))) ? 8 : 0)); // relations a people needs before trading with you
const relOK = (n, o) => { const d = dip(n.id, o.id); return d.trade || d.rel >= Math.max(tradeTrust(n), tradeTrust(o)); };
const canTradeWith = (n, o) => relOK(n, o) && o.alive && o.id !== n.id && dip(n.id, o.id).met && !dip(n.id, o.id).emb && !atWar(n.id, o.id) && tradeOpen(o) && tradeReach(n, o);
// broad sectors of the economy. Mostly private; you steer them with public investment, subsidies, tariffs or by nationalizing them
const SECTORS = {
  house:  { name: "Housing", icon: "🏠", era: 1, w: .12, chain: "health", amp: .15, eff: "room in settlements", d: "Homes for your people." },
  agri:   { name: "Agriculture", icon: "🌾", era: 1, w: .15, chain: "food", amp: .15, eff: "food", d: "Farms, herds and orchards." },
  constr: { name: "Construction", icon: "🏗️", era: 1, w: .1, chain: "ind", amp: .1, eff: "taxes", d: "Everything but homes: shops, markets, workshops and halls." },
  mining: { name: "Mining", icon: "⛏️", era: 1, w: .08, chain: "ind", amp: .15, eff: "materials", d: "Quarries and mines." },
  infra:  { name: "Infrastructure", icon: "🛣️", era: 2, w: .08, chain: "trade", amp: .15, eff: "trade income", d: "Roads, bridges and ports." },
  ships:  { name: "Shipbuilding", icon: "⛵", era: 2, w: .05, chain: "trade", amp: .1, eff: "trade income", d: "Merchant ships. With free migration they also bring immigrants. (Warships are part of your military.)" },
  mach:   { name: "Machinery", icon: "⚙️", era: 5, w: .1, chain: "ind", amp: .15, eff: "materials", d: "Tools, steel and machines." },
  oil:    { name: "Oil fields", icon: "🛢️", era: 5, w: .08, chain: "energy", amp: .1, eff: "materials", d: "Oil wells and refineries. Engine-driven armies need it too." },
  elec:   { name: "Electronics", icon: "💻", era: 6, w: .08, chain: "sci", amp: .15, eff: "science", d: "Electronics, computers and networks." },
};
const ERA_NAME_OF = e => ERAS[e];
const secOf = (n, k) => { if (!n.sec) n.sec = {}; const st = n.sec[k] || (n.sec[k] = { inv: 0, sub: 0, tar: 0, nat: false }); if (st.base == null) st.base = 1; if (st.fame == null) { st.fame = 0; st.rep = .5; } return st; };
// brands: a city's industry becomes known abroad by exporting. Fame spreads it further; reputation says whether it's prized or cheap
const repWord = r => r >= .65 ? "Premium" : r <= .35 ? "Cheap goods" : "Ordinary";
// ---- city industries: each town or city runs the few industries its land suits (like Hollywood's films or Maranello's cars).
// Those can become world-famous brands. Every city plus the countryside together make up the national industry ----
function regionSuit(R, k) { const T = TER[R.t];
  return k === "agri" ? T.food / 1.15 : k === "constr" ? .6 + .4 * T.prod / 1.2 : k === "mining" ? .45 + (METALS.includes(R.r) ? 1.5 : 0) + (R.t === "mountain" ? .4 : 0) : k === "infra" ? FLAT[R.t] || 1 : k === "ships" ? (R.c ? 1.45 : .15) : k === "mach" ? .6 + (R.r === "coal" || R.r === "iron" ? 1.2 : 0) : k === "oil" ? (R.r === "oil" ? 3.15 : .15) : 1; }
const citySuit = (x, k) => regionSuit(W.regions[x.r], k) * (k === "elec" && x.acad ? 1 + .5 * x.acad : 1) * (k === "house" || k === "constr" || k === "elec" ? 1 + .1 * x.t : 1);
let ciKey = null, ciCache = new Map();
function cityInds(n) { // { bySet: Map(id -> [{k, share, suit}]), byK: {k: [{s, share, suit}]} }
  const key = G.turn + ":" + G.sv; if (ciKey !== key) { ciKey = key; ciCache = new Map(); }
  let r = ciCache.get(n.id); if (r) return r;
  r = { bySet: new Map(), byK: {} };
  const all = setsOf(n), ks = Object.keys(SECTORS).filter(k => secUnlocked(n, k)), tot = {};
  for (const k of ks) { tot[k] = 0; r.byK[k] = []; for (const x of all) tot[k] += U(x.pop) * citySuit(x, k); }
  for (const x of all) { if (x.t < 1) continue;
    const ranked = ks.map(k => [k, citySuit(x, k)]).sort((a, b) => b[1] - a[1]);
    const mine = ranked.filter(([, su], i) => i < 3 && (su >= .95 || i === 0)); // a city runs the 1-3 industries it suits best
    const list = mine.map(([k, su]) => ({ k, s: x.id, suit: su, share: tot[k] > 0 ? U(x.pop) * su / tot[k] : 0 }));
    r.bySet.set(x.id, list); for (const it of list) r.byK[it.k].push(it);
  }
  for (const k of ks) r.byK[k].sort((a, b) => b.share - a.share);
  ciCache.set(n.id, r); return r;
}
// ---- city leaders: every town and city has one. They set local trade policy for the city's industries, following your
// national direction, but only as well as their trade skill allows: a poor leader misreads the situation ----
const TRADE_DIRS = { open: { name: "Open for business", icon: "🌐", d: "Cities push exports and build their names abroad." }, bal: { name: "Balanced", icon: "⚖️", d: "Cities export what's good, fix what's weak, and shield what's shrinking." }, protect: { name: "Protect home industry", icon: "🛡️", d: "Cities favor local producers over imports." } };
const CPOL = { none: { name: "Hands off", icon: "—" }, export: { name: "Export drive", icon: "📣", d: "spreads the city's name abroad" }, quality: { name: "Quality push", icon: "💎", d: "raises the quality of what it makes" }, protect: { name: "Buy local", icon: "🛒", d: "favors local producers over imports (raises prices a little)" } };
function ensureLeader(x, n) {
  if (x.t < 1) return null;
  if (!x.lead || x.lead.left <= 0) { const tq = n ? travelQ(n) : 0, ed = n ? eduOf(n) / 100 : 0;
    const dk = dominantAt(x), dg = dk && n && ethOf(n).find(q => q.k === dk);
    x.lead = { name: dg ? personName(dg.lang) : nameFor(n || G.nations[x.o], "person"), ppl: dg ? dg.name : null, trade: clamp(Math.round(1 + rnd() * 3 + rnd() * (tq * .4 + ed)), 1, 5), loyal: 1 + Math.floor(rnd() * 5), left: 2 + rnd() * 3, pol: {} }; } // loyalty is hidden from you
  if (x.lead.loyal == null) x.lead.loyal = 1 + Math.floor(rnd() * 5);
  return x.lead;
}
// a disloyal leader may sneak cheap goods past your tariff to win over the city's poor
function loopholeShare(n, k) { let ut = 0, lp = 0; for (const x of setsOf(n)) { const u = U(x.pop); ut += u; if (x.lead && x.lead.loop === k) lp += u; } return ut > 0 ? clamp(lp / ut * 1.5, 0, 1) : 0; }
const leadEff = L => L ? .4 + .15 * L.trade : 0; // how well a leader's policies actually work
function cityPolicyPick(n, x, it, E) { // what the national direction calls for, which a leader gets right more often the more skilled they are
  const dir = n.tradeDir || "bal", sx = E.sectors[it.k], st = secOf(n, it.k), b = cityBrand(x, it.k);
  if (!sx || st.nat) return "none";
  let want = "none";
  if (dir === "open") want = sx.X > 0 ? (b.q < .45 ? "quality" : "export") : "quality";
  else if (dir === "protect") want = sx.comp > sx.suE || sx.base < 1 || st.tar ? "protect" : "quality";
  else want = sx.X > 0 && b.q >= .6 ? "export" : sx.X > 0 && b.q < .4 ? "quality" : sx.base < .8 || st.tar ? "protect" : "none";
  const L = ensureLeader(x, n); if (!L) return want;
  return rnd() < .3 + .14 * L.trade ? want : pick(Object.keys(CPOL));
}
const cityBrand = (x, k) => x && x.ind && x.ind[k] ? x.ind[k] : { fame: 0, rep: .5, q: 0 };
// the world's best-known city brands in each sector (from last quarter). The top 5 are global powerhouses
let rankKey = null, rankMap = {};
function cityRank(x, k) {
  if (rankKey !== G.turn) { rankKey = G.turn; rankMap = {}; }
  let r = rankMap[k];
  if (!r) r = rankMap[k] = G.sets.filter(y => y.t >= 1 && y.ind && y.ind[k] && y.ind[k].fame >= 15 && G.nations[y.o] && G.nations[y.o].alive).sort((a, b) => b.ind[k].fame - a.ind[k].fame).map(y => y.id);
  const i = r.indexOf(x.id); return i < 0 ? 99 : i + 1;
}
const isPH = (x, k) => cityRank(x, k) <= 5;
let wxKey = null, wxMap = {};
function worldTopCityExport(k) { if (wxKey !== G.turn) { wxKey = G.turn; wxMap = {}; } if (wxMap[k] == null) { let m = 1e-9; for (const y of G.sets) if (y.indX && y.indX[k] > m) m = y.indX[k]; wxMap[k] = m; } return wxMap[k]; }
// a nation's export image in a sector: its cities' brands, weighted by how much each makes
function nationBrand(n, k) {
  let sh = 0, rep = 0, fame = 0, prem = 0, top = 0;
  for (const c of cityInds(n).byK[k] || []) { const b = cityBrand(setById(c.s), k); sh += c.share; rep += c.share * b.rep; fame += c.share * b.fame; top = Math.max(top, b.fame); if (isPH(setById(c.s), k) && b.rep >= .65) prem += c.share; }
  return { rep: rep + (1 - Math.min(1, sh)) * .5, fame, top, prem };
}
const phList = n => { const out = []; for (const [id, list] of cityInds(n).bySet) { const x = setById(id); for (const it of list) { const r = cityRank(x, it.k); if (r <= 5) out.push({ x, k: it.k, r, b: cityBrand(x, it.k) }); } } return out; };
const phBonus = n => !eco(n, "brands") ? 0 : Math.min(.5, phList(n).reduce((a, p) => a + (.12 - .02 * (p.r - 1)) * clamp((p.b.rep - .3) / .4, 0, 1), 0)); // famous premium city brands lift wages; famous cheap ones don't
const cheapFlood = (o, k) => (cityInds(o).byK[k] || []).some(c => { const x = setById(c.s); return isPH(x, k) && cityBrand(x, k).rep <= .35; });
// workers' wages: not paid by you, but set by how productive your economy is compared with the rest of the world, plus world-famous city industries
function wageOf(n) { if (!eco(n, "wages")) return 1; let sum = 0, c = 0; for (const o of G.nations) if (o.alive && o.prodPU > 0) { sum += o.prodPU; c++; } return clamp((c && n.prodPU > 0 ? n.prodPU / (sum / c) : 1) * (1 + phBonus(n)) * (1 - immOpinion(n).wageCut), .3, 2.5); } /* newcomers work for less */
const spendMult = n => !eco(n, "wages") ? 1 : clamp(.75 + .25 * wageOf(n), .6, 1.4); // well-paid workers spend more, and their spending is taxed
// a world-famous industry comes to dominate its city: rich taxes, but it crowds out everything else there
let hubKey = null, hubCache = new Map();
function hubsOf(n) {
  const key = G.turn + ":" + G.sv; if (hubKey !== key) { hubKey = key; hubCache = new Map(); }
  let h = hubCache.get(n.id); if (h) return h;
  h = { bySet: new Map() };
  for (const p of phList(n)) { const d = clamp(.15 + .45 * p.b.fame / 100, 0, .6) * (1.1 - .05 * (p.r - 1));
    const e = h.bySet.get(p.x.id) || { tax: 1, other: 1, unrest: 0, ks: [] }; e.tax *= 1 + .5 * d; e.other *= 1 - .35 * d; e.unrest += 10 * d; e.ks.push(p.k); h.bySet.set(p.x.id, e); }
  hubCache.set(n.id, h); return h;
}
const wageWord = w => w < .8 ? "Low" : w < 1.2 ? "Fair" : w < 1.6 ? "High" : "Very high";
const secLvl = (o, k) => o.sec && o.sec[k] && o.sec[k].lvl != null ? o.sec[k].lvl : 1; // industry level 1-10: earned by steady production and good wages
const secBase = (o, k) => o.sec && o.sec[k] && o.sec[k].base != null ? o.sec[k].base : 1; // industrial strength: grows when you supply yourself, hollows out when imports dominate
const secUnlocked = (n, k) => SECTORS[k].era <= n.era;
const secF = (n, k) => secUnlocked(n, k) && n.secF && n.secF[k] != null ? Math.min(1.3, n.secF[k]) : 1; // how well supplied a sector is (1 = demand met)
const secMult = (n, k) => 1 + SECTORS[k].amp * (secF(n, k) - 1);
const FLAT = { grass: 1.1, plains: 1.15, steppe: 1.05, desert: .85, forest: .8, jungle: .7, tundra: .65, mountain: .6 };
const METALS = ["copper", "iron", "coal", "gold", "gems", "uranium"];
let suitKey = null, suitCache = new Map();
function suitOf(n) { // how well your land suits each sector (1 = average; low means producing it costs more than the world price)
  const key = G.sv + ":" + G.turn + ":" + n.era;
  if (suitKey !== key) { suitKey = key; suitCache = new Map(); }
  let r = suitCache.get(n.id); if (r) return r;
  let ut = 0, food = 0, prod = 0, flat = 0, coast = 0, metal = 0, mount = 0, ci = 0, oil = 0;
  for (const x of G.sets) { if (x.o !== n.id) continue; const R = W.regions[x.r], T = TER[R.t], u = U(x.pop);
    ut += u; food += u * T.food; prod += u * T.prod; flat += u * (FLAT[R.t] || 1); coast += R.c ? u : 0; metal += METALS.includes(R.r) ? u : 0; mount += R.t === "mountain" ? u : 0; ci += R.r === "coal" || R.r === "iron" ? u : 0; oil += R.r === "oil" ? u : 0; }
  const a = v => ut > 0 ? v / ut : 0, c = v => clamp(v, .15, 1.8);
  r = { house: 1, agri: c(a(food) / 1.15), constr: c(.6 + .4 * a(prod) / 1.2), mining: c(.45 + 1.5 * a(metal) + .4 * a(mount)), infra: c(a(flat) || 1), ships: c(.15 + 1.3 * a(coast)),
    mach: c(.6 + 1.2 * a(ci) + .03 * chainLevels(n, "ind")), oil: c(.15 + 3 * a(oil)), elec: c(.6 + .02 * chainLevels(n, "sci") + eduOf(n) / 250) };
  suitCache.set(n.id, r); return r;
}
const suitWord = su => su < .55 ? "Poor" : su < .85 ? "Weak" : su < 1.15 ? "Fair" : su < 1.45 ? "Good" : "Excellent";
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
  m += thinkB(n, "war");
  if (tribal(n)) m += .2 * (toolCov(n) - 1) + (has(n, "spear") ? .05 : 0) + (has(n, "bow") ? .05 : 0); /* sharp spearheads */
  m += officerBonus(n) + (cmd(n).pow || 0) + supremeMult(n);
  for (const s of stratStatus(n)) { if (s.bonus && s.st !== "missing") m += s.bonus; if (s.pen && s.st === "missing") m -= s.pen; }
  m *= 0.8 + 0.4 * n.stab / 100;
  m *= milMult(n.milFund == null ? 1 : n.milFund) * qualMult(n.milQual || 0);
  if (has(n, "combustion") && secUnlocked(n, "oil")) m *= .85 + .15 * Math.min(1, secF(n, "oil"));
  if (n.ai) m *= [0.85, 1, 1.15][G.diff];
  return ERA_POW[n.era] * m;
}
// ---- mercenaries: a one-time fee buys fighters on a fixed contract; they leave when it runs out ----
const mercUnits = n => (n.mercs || []).reduce((a, m) => a + m.k, 0);
const forces = n => n.army + mercUnits(n);
function loseUnits(n, k) { for (const m of n.mercs || []) { const t = Math.min(m.k, k); m.k -= t; k -= t; if (!k) break; } n.mercs = (n.mercs || []).filter(m => m.k > 0); // hired blades fight in the front rank
  const own = Math.min(n.army, k);
  if (own > 0 && tribal(n)) { // a tribe's war bands are its own sons and daughters
    const sets = setsOf(n), pop = sets.reduce((a, x) => a + x.pop, 0), dead = Math.min(pop * .5, own * pop * timeShare(n, "warrior") / Math.max(1, n.army) * .7);
    for (const x of sets) x.pop = Math.max(2, x.pop - dead * x.pop / Math.max(1, pop));
    if (n.id === G.player && dead >= 1) log(`${Math.round(dead)} of your warriors died in battle. The tribe mourns them, and there are fewer hands for everything else.`, "⚰️"); }
  n.army = Math.max(0, n.army - k); }
// ---- the tribal stage: no budget and hardly any government. Warriors hunt and fight; the tribe fields everyone who can.
// It ends with the division of labor, once there are too many mouths for hunters and warriors to feed ----
const STATE_POP = 2000;
const tribal = n => !n.stateUp;
// a tribe has no budget: it has people. You decide who does what: warriors, food-gatherers, builders, elders and scouts
const TIME = {
  warrior: { name: "Warriors", icon: "⚔️", def: 20, d: "Fight and guard. More warriors mean bigger war bands, but they gather no food, and every one killed in battle is one of your people lost." },
  food:    { name: "Hunters", icon: "🏹", def: 25, grp: "food", d: "Big hauls of meat, but only as much as your land's game allows, and little in a cold winter." },
  forage:  { name: "Foragers", icon: "🫐", def: 25, grp: "food", d: "Gather roots, nuts, seeds and berries: steadier than the hunt, richest in summer and autumn, poor in a cold winter." },
  fish:    { name: "Fishers", icon: "🎣", def: 0, grp: "food", when: n => fishable(n) > 0, d: "Fish the coasts, lakes and rivers. Steady all year and they don't empty the land of game. Canoes help." },
  farm:    { name: "Farmers & herders", icon: "🌾", def: 0, tech: "agriculture", grp: "food", d: "Less food each than hunters, but steady all year and not limited by game. Each farming family needs a farm plot." },
  water:   { name: "Water carriers", icon: "💧", def: 0, grp: "gather", d: "Fetch water from streams and springs. Each carrier family keeps 6 families supplied. Cisterns and wells mean fewer need to carry." },
  firewood: { name: "Firewood gatherers", icon: "🪵", def: 0, grp: "gather", when: n => coldNation(n) >= .15, d: "Fires need wood. Without enough, fire pits stay cold in winter. Crowded land is stripped of trees, so wood has to come from further away." },
  wood:    { name: "Wood & stone gatherers", icon: "🪨", def: 5, grp: "gather", d: "Cut wood, quarry stone and gather hides and reeds: the materials your builders use." },
  build:   { name: "Builders", icon: "🔨", def: 5, d: "Build new things, and keep what you have standing: huts, amenities and your claimed borders all need upkeep, using up materials." },
  tools:   { name: "Toolmakers", icon: "🪓", def: 5, d: "Knap flint, shape bone and haft spears. Good tools make everyone better at their work: hunters, foragers, fishers, farmers, gatherers, builders and warriors." },
  healer:  { name: "Healers", icon: "🌿", def: 0, tech: "mysticism", d: "Herbs, bone-setting and the spirits' help. Healers keep sickness from spreading, see more mothers and babies through, and save some from the winter cold." },
  elder:   { name: "Elders & shamans", icon: "🔥", def: 10, d: "Keep the tribe's lore: research and the elders' favor." },
  scout:   { name: "Scouts", icon: "🧭", def: 5, d: "Walk out past your borders each season and map the land within walking distance, so you find neighbors and good land sooner." },
};
const crewFor = n => { const p = popOf(n); return { build: clamp(Math.round((4 + p / 25) / 5) * 5, 5, 20), wood: clamp(Math.round((4 + p / 40) / 5) * 5, 5, 15) }; }; /* building work grows with the tribe */
/* toolmakers and healers: each tribe needs a few, more as it grows */
const pct5 = v => Math.max(5, Math.round(v * 20) * 5);
const toolNeed = n => .04 + Math.min(.06, popOf(n) / 2500);
const toolCov = n => turnCache("tc" + n.id, () => Math.min(1.2, timeShare(n, "tools") * (1 + .2 * structCov(n, "knap")) * (has(n, "stonetools") ? 1.15 : 1) * (has(n, "glue") ? 1.1 : 1) / toolNeed(n)));
const toolF = (n, k = .2) => tribal(n) ? 1 - k + k * toolCov(n) / 1 : 1; /* 1 - k with no tools, up to 1 + .2k with plenty */
const healNeed = n => .03 + Math.min(.04, popOf(n) / 3000);
const healCov = n => !tribal(n) || !roleOpen(n, "healer") ? 0 : turnCache("hc" + n.id, () => Math.min(1, timeShare(n, "healer") * (1 + .2 * structCov(n, "lodge")) * (has(n, "herbs") ? 1.25 : 1) * (1 + 2 * thinkB(n, "health")) / healNeed(n)));
const fishable = n => turnCache("fi" + n.id, () => fishable0(n));
const fishable0 = n => { let f = 0, P0 = 0; for (const x of setsOf(n)) { const R = W.regions[x.r]; f += (R.c || RIVERS.has(R.n) ? 1 : 0) * x.pop; P0 += x.pop; } return P0 ? f / P0 : 0; };
const firewoodNeed = n => { const c = coldNation(n); return c < .15 ? 0 : .07 * c * (1 + .8 * Math.max(0, 1 - roomOf(n))); }; /* share of families needed to keep the fires lit */
const fireCov = n => { const need = firewoodNeed(n); return need > 0 ? Math.min(1, timeShare(n, "firewood") / need) : 1; };
const roleName = (n, k) => TIME[k].name;
const roleIcon = (n, k) => TIME[k].icon;
const roleOpen = (n, k) => (!TIME[k].tech || has(n, TIME[k].tech)) && !(n.retired && n.retired[k]) && (!TIME[k].when || TIME[k].when(n) || (n.time && n.time[k] > 0)); /* roles your people have outgrown leave the allocation */
function timeOf(n) {
  if (n.time && n.time.hunt != null) { const o = n.time; n.time = { warrior: o.train || 20, food: o.hunt || 45, build: o.craft || 20, elder: o.lore || 10, scout: o.scout || 5 }; } // older saves
  if (!n.time) { n.time = {}; for (const k in TIME) n.time[k] = TIME[k].def; }
  if (n.time.farm == null) n.time.farm = 0;
  if (n.time.wood == null) { const w = Math.round((n.time.build || 0) * .6 / 5) * 5, f = n.retired && n.retired.food ? 0 : Math.round((n.time.food || 0) * .4 / 5) * 5; n.time.wood = w; n.time.build = (n.time.build || 0) - w; n.time.forage = f; n.time.food = (n.time.food || 0) - f; n.time.fish = 0; n.time.firewood = 0; } /* older saves: builders split into gatherers and builders, hunters into hunters and foragers */
  if (n.time.tools == null) { const k = ["food", "forage", "farm", "warrior"].find(q => (n.time[q] || 0) >= 10); n.time.tools = k ? 5 : 0; if (k) n.time[k] -= 5; } /* older saves: a few toolmakers */
  for (const k in TIME) if (n.time[k] == null) n.time[k] = 0;
  if (n.time.water == null) { n.time.water = 0; if (G && G.sets && setsOf(n).length) { const w = carriersNeeded(n); n.time.water = w; n.time.food = Math.max(10, (n.time.food || 0) - w); } }
  let sum = 0; for (const k in TIME) sum += n.time[k] || 0;
  if (n.retired) for (const k in n.retired) if (n.retired[k] && n.time[k]) { sum -= n.time[k]; n.time[k] = 0; }
  if (sum > 100) { /* shares never add up to more than everyone: scale down in steps of 5, handing the leftover to the biggest roles */
    const ks = Object.keys(TIME); for (const k of ks) n.time[k] = Math.round((n.time[k] || 0) * 100 / sum / 5) * 5;
    const big = () => ks.reduce((b, k) => n.time[k] > n.time[b] ? k : b, ks[0]);
    for (let g = 0, t = ks.reduce((a, k) => a + n.time[k], 0); t !== 100 && g < 40; g++) { const k = big(); const d = t > 100 ? -5 : 5; n.time[k] += d; t += d; } }
  return n.time; }
// room: land claimed per family. Crowding lowers fertility and slows builders; plenty of land lifts spirits
function roomAt(x) { // only land that's hemmed in by neighbors gets crowded; growing borders just haven't reached their reach yet
  const want = hOf(x) * 1.2, l = x.exp && x.expDir != null ? 1 + .18 * x.exp : 1, reach = x.wall != null ? x.wall : hOf(x) * 1.9 * (1 + (x.expDir == null ? .25 * (x.exp || 0) : 0));
  return clamp(Math.pow(reach * l / Math.max(.01, want), 2), .2, 3); }
function roomOf(n) { return turnCache("ro" + n.id, () => roomOf0(n)); }
function roomOf0(n) { let a = 0, p = 0; for (const x of setsOf(n)) { a += roomAt(x) * x.pop; p += x.pop; } return p > 0 ? a / p : 1; }
const crowdF = r => r < 1 ? .45 + .55 * r : 1 + .08 * Math.min(1.5, r - 1); // below 1 = crowded
const timeShare = (n, k) => n.retired && n.retired[k] ? 0 : (timeOf(n)[k] || 0) / 100; // each role is a straight share of all your people
const timeIdle = n => { const t = timeOf(n); let sum = 0; for (const k in TIME) sum += t[k] || 0; return Math.max(0, 100 - sum); };
// ---- elder discussions: before there is research, the elders talk things through, one subject after another.
// The last talks turn to knowledge itself and to who the people are; then research truly begins ----
function resOpen(n) { if (!n.resOpen && n.era >= 1) n.resOpen = true; return !!n.resOpen; }
const stoneOpen = (n, t) => t && t.era === 0 && !has(n, t.id) && (STONE_REQ[t.id] || []).every(r => has(n, r));
const talkCost = t => t.cost;
function pickTalk(n) { const av = eraTechs(0).filter(t => stoneOpen(n, t)); if (!av.length) return null;
  const want = { agriculture: .6, husbandry: .7, mysticism: .8, tribal: .85, pottery: .85 }; /* advisors push for the big steps */
  return av.sort((a, b) => a.cost * (want[a.id] || 1) - b.cost * (want[b.id] || 1))[0].id; }
const curTalk = n => { if (!n.talk || !stoneOpen(n, TECH[n.talk])) n.talk = pickTalk(n); return n.talk ? TECH[n.talk] : null; };
function migrateStone(n) { if (n.stoneV) return; n.stoneV = 1;
  if (G.turn > 2 && (n.elderStep != null || n.resOpen || n.era > 0)) { /* older saves keep what they could already do */
    const keep = n.resOpen || n.era > 0 ? eraTechs(0).map(t => t.id) : ["fire", "snares", "stories", "burial", "smoking", "stockade", "trade", "boats", "fishing", "rope", "stonetools"].concat(has(n, "agriculture") ? ["weaving"] : []).concat((n.elderStep || 0) > 7 ? ["counting"] : []);
    for (const id of keep) if (!has(n, id)) n.techs.push(id); } }
function elderTalks(n) {
  migrateStone(n); let guard = 0;
  while (!n.resOpen && guard++ < 6) {
    if (eraTechs(0).filter(t => has(n, t.id)).length >= stoneNeed()) { /* enough of the old questions settled: a new age */
      n.resOpen = true; if (n.era < 1) n.era = 1; n.research = n.autoResearch || n.ai ? chooseResearch(n) : null;
      hist(n, "🌅", `Your people entered the ${ERAS[1]}.`); firstAge(n);
      if (!n.ai) { log(`Your people enter the ${ERAS[1]}! Knowledge can be kept, shared and built upon: your people begin to study the world.`, "🌅"); (G.pendingUnlocks || (G.pendingUnlocks = [])).push({ icon: "🌅", title: `The ${ERAS[1]}`, text: "The elders have settled most of the old questions. Your people enter a new age: knowledge can now be kept, shared and built upon, and true research begins (Research tab)." }); }
      else if (G.player != null && dip(n.id, G.player).met) log(`The ${nm(n)} entered the ${ERAS[1]}.`, "🌅", -1);
      break; }
    const t = curTalk(n); if (!t || n.sciPts < t.cost) break;
    n.sciPts -= t.cost; n.techs.push(t.id); n.talk = null;
    if (!n.ai) { log(`The elders have spoken: ${t.name}. ${stoneDesc(t)}`, "🔥"); if (["agriculture", "husbandry", "pottery", "mining", "mysticism", "tribal", "nation", "fire", "bow", "boats"].includes(t.id)) hist(n, "🔥", `The elders settled: ${t.name}.`); } }
}
// ---- Stone Age projects: things your builders work on together, one at a time ----
// ---- tribal production: builders put in hours each season. Your people need things in proportion to their numbers
// (every family needs a hut), and you assign which needs the builders work on. Each population unit is a family ----
const BUILDER_HOURS = 25; // days of building a builder family puts in each season
/* how many builder-days each thing takes: small things take a day or two, great works take years */
const WORK_DAYS = { rack: 2, traps: 1, hearth: 1, hides: 2, refuse: 2, circle: 8, bath: 5, art: 4, burial: 6, loom: 4, smoke: 6, pens: 6, weir: 8, field: 5, pit: 5, canoe: 8, knap: 6, hut: 10, lodge: 10, cistern: 12, watch: 12, kiln: 15, shrine: 25, water: 30, post: 30, shop: 20, ditch: 40, palisade: 120,
  hall: 150, granary: 120, market: 120, rampart: 300, temple: 600, aqueduct: 800, trails: 200, longhouse: 600, mound: 1500, stones: 2000 };
const STRUCTS = {
  hut:      { tab: "housing", name: "Huts", one: "hut", icon: "🛖", hours: 2400, d: "Every family needs a home. Families without one have fewer children and grow restless." },
  pit:      { tab: "food", tech: "agriculture", name: "Storage pits", one: "storage pit", icon: "🏺", hours: 3600, d: "One for every 8 families. Food kept for lean times: famine kills far fewer." },
  rack:     { tab: "food", opt: true, name: "Drying racks", one: "drying rack", icon: "🍖", hours: 2000, d: "One for every 6 food-gathering families. Meat and fish keep longer: more food." },
  shop:     { tab: "crafts", tech: "pottery", name: "Workshops", one: "workshop", icon: "🪓", hours: 5000, d: "One for every 4 builder families. Toolmakers work faster: more materials." },
  shrine:   { tab: "spirit", tech: "mysticism", name: "Shrines", one: "shrine", icon: "🔥", hours: 12000, d: "One in every settlement. The elders are pleased, and the tribe's lore grows." },
  palisade: { tab: "defense", opt: true, tech: "stockade", name: "Palisades", one: "palisade", icon: "🪵", hours: 26000, d: "One around every settlement. Much harder to raid or conquer." },
  hall:     { tab: "housing", tier: 1, name: "Meeting hall", one: "meeting hall", icon: "🏛️", hours: 9000, d: "Towns only. Where the town gathers to settle matters: much less unrest here." },
  granary:  { tab: "food", tier: 1, tech: "pottery", name: "Granary", one: "granary", icon: "🌾", hours: 8000, d: "Towns only. A great store for the whole town: famine barely touches it." },
  market:   { tab: "crafts", tier: 1, name: "Market square", one: "market square", icon: "🧺", hours: 8000, d: "Towns only. Traders from far and near gather here: +15% gold from this town." },
  rampart:  { tab: "defense", tier: 1, name: "Earthen rampart", one: "earthen rampart", icon: "⛰️", hours: 18000, d: "Towns only. A great bank and ditch: this town is far harder to take." },
  temple:   { tab: "spirit", tier: 2, name: "Temple", one: "temple", icon: "🛕", hours: 30000, d: "Cities only. A house for the gods: stability across your lands and elders' favor." },
  field:    { tab: "food", tech: "agriculture", name: "Farm plots", one: "farm plot", icon: "🌱", hours: 1200, d: "One for each farming family. Farmers without a plot scratch out small gardens, which feed far less." },
  hearth:   { tab: "amen", name: "Fire pits", one: "fire pit", icon: "🍲", hours: 900, d: "One for every 5 families. Warmth and cooked food: fewer die in winter, and families live better." },
  hides:    { tab: "amen", name: "Tanning frames", one: "tanning frame", icon: "🧥", hours: 1500, d: "Hides become clothes and blankets: winter is easier to survive. Up to one for every 8 families in the coldest lands, fewer where winters are mild, none where it's never cold." },
  refuse:   { tab: "amen", name: "Refuse pits", one: "refuse pit", icon: "🕳️", hours: 800, d: "One for every 10 families. Waste kept away from the huts: less sickness." },
  cistern:  { tab: "water", tech: "pottery", name: "Cisterns", one: "cistern", icon: "🏺", hours: 2500, wcap: 12, d: "Clay-lined pits that catch and hold the rain. Each supplies 12 families." },
  water:    { tab: "water", tech: "mining", name: "Wells", one: "well", icon: "🪣", hours: 4000, wcap: 25, d: "Dug down to the water below. Each supplies 25 families, even in dry land." },
  aqueduct: { tab: "water", tier: 1, tech: "construction", name: "Aqueduct", one: "aqueduct", icon: "🌉", hours: 20000, wcap: 200, d: "Towns only. Water carried from far hills: supplies 200 families." },
  circle:   { tab: "amen", name: "Gathering ground", one: "gathering ground", icon: "🪘", hours: 3000, d: "One in every settlement. A cleared place for stories, dances and feasts: families are happier." },
  lodge:    { tab: "amen", tech: "mysticism", name: "Sweat lodges", one: "sweat lodge", icon: "♨️", hours: 2500, d: "One for every 15 families. Healing heat and cleansing rites: less sickness." },
  traps:    { tab: "food", opt: true, tile: "Game traps", tech: "snares", name: "Game traps & snares", one: "set of traps", icon: "🪤", hours: 700, d: "One for every 5 hunter families. Traps work while the hunters sleep: hunters bring in up to 25% more." },
  weir:     { tab: "food", opt: true, water: true, tech: "fishing", name: "Fish weirs", one: "fish weir", icon: "🐟", hours: 1600, d: "One for every 5 fisher families, by the water. Stone and stake fences that trap fish: fishers bring in up to 30% more." },
  smoke:    { tab: "food", opt: true, tech: "smoking", name: "Smokehouses", one: "smokehouse", icon: "🌫️", hours: 2200, d: "One for every 10 families. Smoked meat and fish last through the winter: lean winters are much less lean." },
  pens:     { tab: "food", opt: true, tech: "husbandry", name: "Animal pens", one: "animal pen", icon: "🐐", hours: 1800, d: "One for every 6 farming families. Herds kept safe from wolves and thieves: farmers and herders bring in up to 20% more." },
  knap:     { tab: "crafts", opt: true, tile: "Flint knapping", name: "Flint knapping ground", one: "flint knapping ground", icon: "🪨", hours: 3000, d: "One in every settlement. Sharp tools for everyone: +10% materials, and this settlement's builders work 10% faster." },
  kiln:     { tab: "crafts", opt: true, tech: "pottery", name: "Kiln", one: "kiln", icon: "🏺", hours: 5000, d: "One in every settlement. Fired pots and bricks: +10% materials." },
  loom:     { tab: "amen", opt: true, tech: "weaving", name: "Looms", one: "loom", icon: "🧶", hours: 1800, d: "One for every 10 families. Woven cloth: warmer families, and a little pride in what they wear." },
  bath:     { tab: "amen", opt: true, name: "Bathing place", one: "bathing place", icon: "🛁", hours: 1500, d: "One in every settlement. A cleared spot on the water for washing: healthier families." },
  art:      { tab: "spirit", opt: true, tech: "stories", name: "Painted rocks", one: "painted rock", icon: "🎨", hours: 1200, d: "One in every settlement. Hunts, spirits and ancestors painted on stone: families gather here, and the stories live on." },
  burial:   { tab: "spirit", opt: true, name: "Burial ground", one: "burial ground", icon: "🪦", hours: 2000, d: "One in every settlement. A resting place for the dead: the elders and the families are comforted." },
  ditch:    { tab: "defense", opt: true, tile: "Ditches", name: "Ditch and stakes", one: "ditch and stakes", icon: "🔱", hours: 9000, d: "One around every settlement. Cheaper than a palisade: a little harder to raid." },
  watch:    { tab: "defense", opt: true, name: "Lookout post", one: "lookout post", icon: "🗼", hours: 2500, d: "One in every settlement. Raiders are seen coming, and your scouts see further from here." },
  post:     { tab: "travel", opt: true, when: n => metCount(n) > 0, tech: "trade", name: "Trading post", one: "trading post", icon: "🛖", hours: 6000, d: "Your main settlement only. A place where strangers can come to swap goods: other peoples trust you sooner and trade more willingly." },
  canoe:    { tab: "food", opt: true, tech: "boats", name: "Dugout canoes", one: "canoe", icon: "🛶", hours: 2400, coastal: true, d: "One for every 5 food-gathering families on the coast. More fish, and boats to cross narrow water." },
};
const GREAT = [
  { id: "trails", tab: "travel", name: "Marked trails", icon: "🥾", hours: 20000, mat: 4, d: "Cairns and blazes mark the paths. Settlers and scouts travel 30% further." },
  { id: "longhouse", tab: "housing", tech: "husbandry", name: "Longhouses", icon: "🏠", hours: 50000, mat: 12, d: "Big shared houses. Villages hold 25% more families." },
  { id: "mound", tab: "spirit", tech: "mysticism", name: "Ancestral mound", icon: "⛰️", hours: 90000, mat: 6, d: "A great earthen mound over the honored dead. The elders and the families are proud of it, and your people grow more devout." },
  { id: "stones", tab: "spirit", tech: "tribal", name: "Stone circle", icon: "🗿", hours: 150000, mat: 20, d: "A ring of standing stones where the elders meet. Elder talks go 20% faster, and the elders are pleased." },
];
for (const k in WORK_DAYS) { if (STRUCTS[k]) STRUCTS[k].hours = WORK_DAYS[k]; const g = GREAT.find(q => q.id === k); if (g) g.hours = WORK_DAYS[k]; }
const PROD_TABS = { housing: { name: "Housing", icon: "🛖" }, water: { name: "Water", icon: "💧" }, food: { name: "Food", icon: "🍖" }, amen: { name: "Amenities", icon: "🪘" }, crafts: { name: "Crafts", icon: "🪓" }, spirit: { name: "Spirit", icon: "🔥" }, defense: { name: "Defense", icon: "🪵" }, travel: { name: "Travel", icon: "🥾" } };
const itemOf = id => STRUCTS[id] ? Object.assign({ id, repeat: true }, STRUCTS[id]) : GREAT.find(g => g.id === id);
const itemOpen = (n, it) => it && (!it.tech || has(n, it.tech)) && (!it.coastal || coastal(n)) && (!it.when || it.when(n));
const onWater = x => { const R = W.regions[x.r]; return !!(R && (R.c || RIVERS.has(R.n))); };
function prodState(n) { const P0 = n.prod || (n.prod = { built: {}, prog: {}, assign: {}, done: {}, great: null, gprog: 0 }); if (!P0.queue) { P0.queue = []; P0.qprog = 0; }
  if (P0.built.hut == null) { P0.built.hut = Math.ceil(popOf(n)); for (const k in STRUCTS) P0.assign[k] = k === "hut"; } // a tribe starts with a roof over every family
  return P0; }
const projDone = (n, k) => !!(n && n.prod && n.prod.done && n.prod.done[k]);
const coastal = n => setsOf(n).some(x => W.regions[x.r].c);
// every village, town and city has its own needs and its own builders
function sb(x) { if (!x.b) x.b = { hut: Math.ceil(x.pop * (G && G.turn < 2 ? 1.2 : 1)) }; /* a new tribe has a few spare huts */ if (!x.pq) { x.pq = []; x.qp = 0; }
  if (!x.amenV) { x.amenV = 1; const f = Math.max(1, x.pop) * (G && G.turn < 2 ? 1.2 : 1); if (x.b.hearth == null) x.b.hearth = Math.ceil(f / 5); if (x.b.hides == null) x.b.hides = Math.ceil(f / 8); if (x.b.circle == null) x.b.circle = 1; if (x.b.refuse == null) x.b.refuse = Math.ceil(f / 10); }
  return x.b; }
const onCoast = x => !!W.regions[x.r].c;
function needAt(n, x, k) {
  const fam = x.pop, sh = r => tribal(n) ? timeShare(n, r) : 0, it = STRUCTS[k];
  if (it.tier && x.t < it.tier) return 0;
  switch (k) {
    case "hut": return Math.ceil(fam);
    case "pit": return Math.ceil(fam / 8);
    case "rack": return Math.ceil(fam * sh("food") / 6);
    case "field": return Math.ceil(fam * sh("farm"));
    case "shop": return Math.ceil(fam * sh("build") / 4);
    case "shrine": case "palisade": return 1;
    case "canoe": return onCoast(x) ? Math.ceil(fam * sh("food") / 5) : 0;
    case "traps": return Math.ceil(fam * sh("food") / 5);
    case "weir": return onWater(x) ? Math.ceil(fam * sh("fish") / 5) : 0;
    case "smoke": return Math.ceil(fam / 10);
    case "pens": return Math.ceil(fam * sh("farm") / 6);
    case "loom": return Math.ceil(fam / 10);
    case "post": return x.id === n.cap ? 1 : 0;
    case "knap": case "kiln": case "bath": case "art": case "burial": case "ditch": case "watch": return 1;
    case "hearth": return Math.ceil(fam / 5);
    case "hides": { const c = coldOf(x); return c < .15 ? 0 : Math.ceil(fam * c / 8); }
    case "refuse": return Math.ceil(fam / 10);
    case "cistern": case "water": case "aqueduct": { const def = Math.max(0, fam - waterSupply(n, x)); return builtAt(x, k) + Math.ceil(def / it.wcap); }
    case "circle": return 1;
    case "lodge": return Math.ceil(fam / 15);
    default: return 1; // town and city buildings: one each
  }
}
const builtAt = (x, k) => (x.b && x.b[k]) || 0;
/* amenities: warmth, health and gathering. How well each settlement lives beyond a roof and food */
const AMEN = { warmth: { name: "Warmth", icon: "🔥", k: ["hearth", "hides"], d: "Fire pits and clothes. Without them, more die in winter, even in huts. The colder your land, the more clothes it takes." },
  health: { name: "Health", icon: "🩺", k: ["refuse", "lodge"], d: "Refuse pits and sweat lodges. Without them, sickness spreads in bigger settlements." },
  joy: { name: "Gathering", icon: "🪘", k: ["circle", "hearth"], d: "A place to gather, and fires to gather around. Without them, families are unhappy." } };
/* water: rivers, springs and rain give each place some water for free; beyond that, families need water brought to them */
const WATER_NAT = { jungle: 60, forest: 45, grass: 40, plains: 35, tundra: 30, mountain: 30, steppe: 18, desert: 6 };
const RIVERS = new Set(["Lower Egypt", "Nubia", "Mesopotamia", "Indus", "Punjab", "Bengal", "North China Plain", "Jiangnan", "Sichuan", "Mekong", "Tonkin", "Volga", "Rhineland", "Low Countries", "Western Amazon", "Eastern Amazon", "Wallachia", "Ukraine"]);
const dry = x => ["desert", "steppe"].includes(W.regions[x.r].t);
function waterNat(x, worst) { const R = W.regions[x.r], summer = worst || Math.floor((G.month || 0) / 3) === 2; return (WATER_NAT[R.t] || 30) * (RIVERS.has(R.n) ? 4 : 1) * (summer && !RIVERS.has(R.n) ? (dry(x) ? .6 : .85) : 1) * (1 + .3 * (x.exp || 0)); }
function waterInfra(x, worst) { let s = waterNat(x, worst); for (const k of ["cistern", "water", "aqueduct"]) s += builtAt(x, k) * STRUCTS[k].wcap; return s; }
/* your carriers go where water is short: their total haul is shared out by each place's shortfall */
function carrierHaul(n) { const k = G.turn + ":" + G.sv + ":" + (timeOf(n).water || 0); if (n._wh && n._wh.k === k) return n._wh.m;
  const m = new Map(), ss = setsOf(n); let tot = 0, def = 0; for (const x of ss) { tot += x.pop; def += Math.max(0, x.pop - waterInfra(x)); }
  const haul = tot * timeShare(n, "water") * (has(n, "waterskins") ? 7 : 6); for (const x of ss) { const d = Math.max(0, x.pop - waterInfra(x)); m.set(x.id, def > 0 ? haul * d / def : 0); }
  n._wh = { k, m }; return m; }
function waterSupply(n, x) { sb(x); return waterInfra(x) + (tribal(n) ? carrierHaul(n).get(x.id) || 0 : 0); } /* nature and what you've built, plus what your carriers bring */
function carriersNeeded(n) { let d = 0, P0 = 0; for (const x of setsOf(n)) { sb(x); d += Math.max(0, x.pop * 1.08 - waterInfra(x, true)); P0 += x.pop; } /* enough for the driest season and a little growth */ return P0 ? clamp(Math.ceil(d / 6 / P0 * 20) * 5, 0, 60) : 0; } /* share, with room for a dry summer */
const waterAt = (n, x) => x.pop > 0 ? Math.min(1, waterSupply(n, x) / x.pop) : 1;
function waterOf(n) { if (!tribal(n)) return 1; let w = 0, P0 = 0; for (const x of setsOf(n)) { w += waterAt(n, x) * x.pop; P0 += x.pop; } return P0 ? w / P0 : 1; }
/* how cold a place gets: by latitude, with mountains and tundra colder and jungles never cold */
function coldOf(x) { const R = W.regions[x.r]; if (!R) return .5; if (R.t === "tundra") return 1; if (R.t === "jungle") return 0;
  return clamp((Math.abs(R.lat) - 25) / 30 + (R.t === "mountain" ? .2 : 0) + (R.t === "desert" ? -.1 : 0), 0, 1); }
function coldNation(n) { return turnCache("cn" + n.id, () => coldNation0(n)); }
function coldNation0(n) { let c = 0, P0 = 0; for (const x of setsOf(n)) { c += coldOf(x) * x.pop; P0 += x.pop; } return P0 ? c / P0 : .5; }
function covAt(n, x, k) { const it = itemOf(k); if (!it || !itemOpen(n, it)) return null; const d = needAt(n, x, k); return d > 0 ? Math.min(1, builtAt(x, k) / d) : null; }
function amenAt(n, x) { sb(x); const r = {}; let t = 0, c = 0; const warm = coldOf(x) >= .15;
  for (const a in AMEN) { if (a === "warmth" && !warm) { r[a] = 1; continue; } /* a hot land needs no warmth */
    const v = AMEN[a].k.map(k => covAt(n, x, k)).filter(v => v != null); r[a] = v.length ? v.reduce((p, q) => p + q, 0) / v.length : 1; if (a === "warmth") r[a] = Math.min(1, r[a] + .2 * (covAt(n, x, "loom") || 0) + (has(n, "sewing") ? .1 : 0)) * (.3 + .7 * fireCov(n)); /* no wood, no fire; woven cloth helps */
      if (a === "health") r[a] = Math.min(1, r[a] + .15 * (covAt(n, x, "bath") || 0)); if (a === "joy") r[a] = Math.min(1, r[a] + .15 * (covAt(n, x, "art") || 0) + (has(n, "drums") ? .05 : 0)); t += r[a]; c++; }
  r.all = c ? t / c : 1; return r; }
function amenOf(n) { if (!tribal(n)) return { warmth: 1, health: 1, joy: 1, all: 1 }; const r = { warmth: 0, health: 0, joy: 0, all: 0 }; let P0 = 0;
  for (const x of setsOf(n)) { const a = amenAt(n, x); for (const k in r) r[k] += a[k] * x.pop; P0 += x.pop; } for (const k in r) r[k] = P0 ? r[k] / P0 : 1; return r; }
function structDemand(n, k) { let d = 0; for (const x of setsOf(n)) d += needAt(n, x, k); return d; }
let tcKey = null, tcMap = new Map(); /* per-turn cache for values that loop over every settlement */
function turnCache(id, f) { const key = G.turn + ":" + G.sv + ":" + (G.bv || 0); if (tcKey !== key) { tcKey = key; tcMap = new Map(); } let v = tcMap.get(id); if (v === undefined) { v = f(); tcMap.set(id, v); } return v; }
function structCov(n, k) { if (n && tribal(n)) return turnCache("sc" + n.id + k, () => structCov0(n, k)); return 1; }
function structCov0(n, k) { if (!n || !tribal(n)) return 1; let d = 0, h = 0; for (const x of setsOf(n)) { const nd = needAt(n, x, k); d += nd; h += Math.min(nd, builtAt(x, k)); } return d > 0 ? h / d : 1; }
const builderHoursAt = (n, x) => x.pop * (tribal(n) ? timeShare(n, "build") : 0) * BUILDER_HOURS * (builtAt(x, "knap") ? 1.1 : 1) * toolF(n, .25) * (has(n, "rope") ? 1.05 : 1) * (has(n, "sledges") ? 1.05 : 1) * (1 + thinkB(n, "build"));
const builderHours = n => setsOf(n).reduce((a, x) => a + builderHoursAt(n, x), 0);
const itemOpenAt = (n, x, it) => itemOpen(n, it) && (!it.tier || x.t >= it.tier) && (!it.coastal || onCoast(x)) && (!it.water || onWater(x));
/* upkeep: everything built, and every stretch of claimed border, needs builders' time and materials to keep standing */
const MAT_H = 6e-4; /* materials used per builder-day of building or upkeep */
function upkeepAt(n, x) { let h = 0; const sz = clamp(x.pop / 150, .2, 1); /* a small camp's families patch their own huts; upkeep grows as places grow */ for (const k in x.b || {}) if (STRUCTS[k]) h += x.b[k] * STRUCTS[k].hours * .04; h += (x.exp || 0) * 15 * (1 + x.t);
  if (x.id === n.cap && n.prod && n.prod.done) for (const g of GREAT) if (n.prod.done[g.id]) h += g.hours * .02; return h * sz * (has(n, "wattle") ? .8 : 1); }
function workProjects(n) { // each settlement's builders work through its own queue, one thing at a time
  if (!tribal(n)) return; const P0 = prodState(n);
  for (const x of setsOf(n)) { sb(x); let hrs = builderHoursAt(n, x), guard = 0;
    /* upkeep comes first: builders' time, and materials from your stores */
    { const up = upkeepAt(n, x), hU = Math.min(hrs, up), mN = hU * MAT_H * .3, /* repairs use a third of the materials new building does */ mU = Math.min(Math.max(0, n.mat), mN); n.mat -= mU; hrs -= hU;
      const cov = up > 0 ? (hU / up) * (mN > 0 ? mU / mN : 1) : 1; x.upCov = cov; x.upShare = builderHoursAt(n, x) > 0 ? Math.min(1, up / builderHoursAt(n, x)) : (up > 0 ? 1 : 0);
      x.cond = clamp((x.cond == null ? 100 : x.cond) + (cov >= .999 ? 3 : -(1 - cov) * 10), 0, 100);
      if (x.cond < 35) decay(n, x); }
    x.waitMat = false;
    /* builders finish everything that fits this season, in order; a big job that doesn't fit soaks up whatever time is left over */
    const fin = it => { if (it.repeat) { x.b[it.id] = (x.b[it.id] || 0) + 1; G.bv = (G.bv || 0) + 1; if (it.id === "hut") hutGrow(x); if (it.tier && !n.ai) log(`${x.name} has a new ${it.one}. ${it.d}`, it.icon); }
      else { P0.done[it.id] = 1; G.sv++; if (!n.ai) log(`The builders of ${x.name} finished the ${it.name.toLowerCase()}. ${it.d}`, it.icon); } };
    for (let i = 0; i < x.pq.length && hrs > 1e-9 && guard++ < 200;) {
      const it = itemOf(x.pq[i]); if (!it || (!it.repeat && P0.done[it.id])) { x.pq.splice(i, 1); continue; }
      const prog = x.qpId === it.id && x.pq.indexOf(it.id) === i ? x.qp : 0, need = it.hours - prog;
      if (n.mat < need * MAT_H) { x.waitMat = true; break; } /* no materials, no building */
      if (need <= hrs + 1e-9) { hrs -= need; n.mat -= need * MAT_H; x.pq.splice(i, 1); if (prog) { x.qp = 0; x.qpId = null; } fin(it); continue; }
      i++; }
    if (hrs > 1e-9 && x.pq.length && !x.waitMat) { const id = x.qpId && x.pq.includes(x.qpId) ? x.qpId : x.pq[0], it = itemOf(id), use = Math.min(hrs, Math.max(0, n.mat) / MAT_H);
      if (x.qpId !== id) { x.qpId = id; x.qp = 0; } x.qp = Math.min(it.hours - 1e-6, x.qp + use); n.mat -= use * MAT_H; } } }
/* neglected places fall apart: buildings collapse and must be rebuilt, and claimed borders slip away */
function decay(n, x) { const sev = (35 - x.cond) / 35, kinds = Object.keys(x.b).filter(k => STRUCTS[k] && x.b[k] > 0), tot = kinds.reduce((a, k) => a + x.b[k], 0);
  let k0 = tot * sev * .04; const lost = {};
  while (tot > 0 && (k0 >= 1 || rnd() < k0)) { k0 -= 1; let r = rnd() * kinds.reduce((a, k) => a + x.b[k], 0), k = kinds[0]; for (const q of kinds) { r -= x.b[q]; if (r <= 0) { k = q; break; } }
    if (x.b[k] > 0) { x.b[k]--; G.bv = (G.bv || 0) + 1; lost[k] = (lost[k] || 0) + 1; } if (Object.values(lost).reduce((a, v) => a + v, 0) > 6) break; }
  let shrank = false; if ((x.exp || 0) > 0 && rnd() < .12 * sev + .03) { x.exp--; shrank = true; G.sv++; }
  if (n.ai || (!Object.keys(lost).length && !shrank)) return;
  const at = n.alertT || (n.alertT = {}), key = "decay" + x.id, txt = `${Object.entries(lost).map(([k, v]) => `${v} ${v === 1 ? STRUCTS[k].one : STRUCTS[k].name.toLowerCase()}`).join(", ")}${Object.keys(lost).length ? " collapsed" : ""}${shrank ? `${Object.keys(lost).length ? ", and" : ""} the borders shrank back` : ""}`;
  if (at[key] > G.turn - TPY) { log(`In ${x.name}, ${txt}.`, "🏚️"); return; } at[key] = G.turn;
  (G.pendingUnlocks || (G.pendingUnlocks = [])).push({ icon: "🏚️", title: `${x.name} is falling apart`, text: `With too little upkeep, ${txt}. Give your builders the time and the materials to keep things standing (more builders, or more wood & stone gatherers), then rebuild what was lost.` }); }
const QCAP = 60; /* things waiting in a settlement's queue */
const seasonsTxt = q => q <= 1 ? "this season" : q < 1 ? "less than a season" : q <= 8 ? `about ${Math.ceil(q)} season${Math.ceil(q) === 1 ? "" : "s"}` : `about ${Math.round(q / 4)} years`;
// ---- expanding borders: a settlement can claim a little more land, but it must be guarded ----
const EXP_MAX = 2;
const garrisonNeed = n => setsOf(n).reduce((a, x) => a + (x.exp || 0) * (1 + x.t), 0);
const garrisonMult = n => { const need = garrisonNeed(n); return need > 0 ? clamp(.55 + .45 * forces(n) / need, .55, 1) : 1; };
const popWord = n => n && tribal(n) ? "families" : "people";
const MERC_DEALS = [{ id: "short", years: 2, mult: 1, name: "2-year contract" }, { id: "long", years: 5, mult: 2.2, name: "5-year contract" }];
const mercWord = n => n.era <= 1 ? "warriors for hire" : n.era <= 3 ? "sellswords" : n.era <= 5 ? "mercenaries" : "military contractors";
// you ask a friendly people for military assistance and they send their own troops, for a fee paid to them
const MERC_REL = 30;
const mercSpare = o => Math.max(0, Math.floor(o.army * .35));
function mercSuppliers(n) { return G.nations.filter(o => { if (!o.alive || o.id === n.id) return false; const d = dip(n.id, o.id);
  return d.met && !d.war && d.rel >= MERC_REL && mercSpare(o) > 0 && (tradeReach(n, o) || bordersTouch(n, o)) && !G.nations.some(e => atWar(n.id, e.id) && (dip(o.id, e.id).ally)); }); } // they won't fight their own allies
const mercFee = (o, k, deal) => Math.round(unitCost(o).g * 1.6 * k * deal.mult);
function hireMercs(n, o, k, deal) { const f = mercFee(o, k, deal); n.gold -= f; o.gold += f; o.army -= k; dip(n.id, o.id).rel += 4;
  (n.mercs || (n.mercs = [])).push({ k, left: deal.years * TPY, from: o.id, name: o.name }); }
const mercPow = m => { const o = G.nations[m.from]; return o && o.alive ? unitPower(o) : 0; }; // they fight with their own people's weapons and training
const power = n => n.army * unitPower(n) + .9 * (n.mercs || []).reduce((a, m) => a + m.k * mercPow(m), 0);
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
  if (s.t === 0) return VILLAGE_CAP * (projDone(n || G.nations[s.o], "longhouse") ? 1.25 : 1);
  n = n || G.nations[s.o];
  const cb = bonus(n, s.r, "cap") + (W.regions[s.r].r === "fish" ? .1 : 0);
  const hm = secMult(n, "house");
  if (s.t === 1) return 3000 * (1 + cb) * hm;
  return 12000 * (1 + .4 * n.era) * (1 + cb) * hm;
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
const FLOWS = ["govWages", "pubWages", "secImp", "secExp", "secTar", "secSub", "secState", "secInv", "secNet", "natTar", "tax", "routeGold", "luxGold", "foodGold", "bUp", "armyUp", "imports", "govUp", "goldNet", "mat", "sci", "resGold", "resMat", "resSci", "acadUp", "sciPay", "offPay", "gross", "fixed", "spend", "milGold", "qtyGold", "qualGold", "prodGold", "travelGold", "subGold", "propGold", "incGold", "healthGold", "spare"];
function econM(n) { setTD(); const E = econ(n), M = { ...E, raw: E }; for (const k of FLOWS) M[k] = E[k] * TD; return M; } // what a quarter brings in and costs
function econ(n) {
  const gov = GOVS[n.gov], L = n.laws, sets = setsOf(n), P0 = pres(n);
  const stabM = 0.75 + 0.5 * n.stab / 100, anarchy = n.anarchy > 0 ? .6 : 1;
  const taxM = { low: .7, normal: 1, high: 1.35, extort: 1.7 }[L.tax];
  const C0 = cul(n);
  const prodLaw = (C0.prod || 0) + (L.trade === "prot" ? .1 : 0) + (L.labor === "unreg" ? .1 : L.labor === "rights" ? -.05 : 0) + (L.focus === "ind" ? .15 : 0) + (gov.prod || 0);
  const goldLaw = (gov.gold || 0) + (L.focus === "com" ? .15 : 0) + (C0.gold || 0);
  const sciLaw = (C0.sci || 0) + (gov.sci || 0) + (L.focus === "sci" ? .15 : 0) + (L.rel === "sec" ? .1 : 0) + (L.press === "free" ? .05 : 0);
  const HB = hubsOf(n).bySet, spendM = spendMult(n), wage0 = wageOf(n);
  const rb = new Map();
  for (const ri of P0) rb.set(ri, { food: bonus(n, ri, "food"), gold: bonus(n, ri, "gold"), prod: bonus(n, ri, "prod"), sci: bonus(n, ri, "sci") });
  let food = 0, need = 0, tax = 0, mat = 0, sci = 1 + n.era, pop = 0, trade = 0, bUp = 0, tierTrade = 0, utot = 0;
  const per = new Map();
  for (const s of sets) {
    const R = W.regions[s.r], T = TER[R.t], tier = TIERS[s.t], u = U(s.pop), b = rb.get(s.r);
    const unrestM = 1 - s.u / 250;
    let f = s.pop * T.food * tier.food * (1 + b.food + (C0.food || 0) + subFoodOf(n) + (R.r === "fish" ? .3 : 0) + (s.id === n.cap ? .3 : 0)) * (1 + .05 * n.era);
    let g = (u * T.gold * .5 * tier.gold + tier.base) * taxM * (1 + b.gold + goldLaw) * stabM * unrestM * anarchy;
    let m = (u * T.prod * .6 * tier.mat + tier.base) * (1 + b.prod + prodLaw) * stabM * unrestM * anarchy;
    let sc = u * .2 * tier.sci * (1 + b.sci + sciLaw) * stabM * anarchy;
    if (builtAt(s, "market")) g *= 1.15;
    g *= spendM; // consumer spending: better wages mean more taxed spending
    if (s.lead && s.lead.pol) { const np = Object.values(s.lead.pol).filter(v => v !== "none").length; g *= 1 - .04 * np; } // local programs come out of the city's own taxes
    const hb = HB.get(s.id); if (hb) { g *= hb.tax; f *= hb.other; m *= hb.other; sc *= hb.other; } // a dominant industry enriches its city but crowds out everything else there
    food += f; need += s.pop * .8 * (1 + .2 * bigF(s)); tax += g; mat += m; sci += sc; pop += s.pop; tierTrade += tier.trade; utot += u;
    per.set(s.id, { food: f, gold: g, mat: m, sci: sc });
  }
  // how well each sector is supplied shapes the economy
  food *= (1 + thinkB(n, "food")) * (tribal(n) ? 1 : 1); mat *= 1 + thinkB(n, "crafts"); sci *= 1 + thinkB(n, "lore") * .6; tax *= 1 + thinkB(n, "trade");
  food *= secMult(n, "agri"); tax *= secMult(n, "constr") * (1 + .05 * (secF(n, "mach") - 1)); mat *= secMult(n, "mining") * secMult(n, "mach") * secMult(n, "oil"); sci *= secMult(n, "elec");
  for (const k in n.fields || {}) if (FIELDS[k]) bUp += fieldUp(FIELDS[k]) * n.fields[k];
  // academies cost a lot to run, and every scientist and officer draws a salary
  let acadUp = 0; for (const x of G.sets) if (x.o === n.id) acadUp += ((x.acad === 1 ? 2 : x.acad === 2 ? 6 : 0) + (x.mil ? 4 : 0)) * Math.pow(1.4, n.era);
  const sciPay = (n.scientists || 0) * sciSalary(n), offPay = (n.officers || 0) * offSalary(n);
  const talent = n.scientists || 0; sci *= 1 + scientistBoost(n);
  const partners = tradePartners(n);
  const peaceful = G.nations.filter(o => o.alive && o.id !== n.id && dip(n.id, o.id).met && !atWar(n.id, o.id)).length;
  const tradeLawM = (1 + (C0.trade || 0)) * { prot: .7, bal: 1, free: 1.3 }[L.trade] * (has(n, "globalization") ? 1.4 : 1) * (1 + fb(n, "trade"));
  let tariffedBy = 0; for (const o of G.nations) if (o.alive && o.id !== n.id && o.tariffOn && o.tariffOn[n.id] && !atWar(n.id, o.id)) tariffedBy++;
  const routeGold = (trade + tierTrade + (has(n, "agriculture") ? 1 : .3)) * (1 + .15 * partners.length + .04 * peaceful) * tradeLawM * (1 + .2 * n.era) * stabM
    * secMult(n, "infra") * secMult(n, "ships") * Math.max(.6, 1 - .04 * tariffedBy);
  const luxCount = {};
  for (const ri of P0) { const rs = W.regions[ri].r; if (rs && RES[rs].kind === "lux") luxCount[rs] = (luxCount[rs] || 0) + 1; }
  const luxKinds = Object.keys(luxCount).length;
  const luxExtra = Object.values(luxCount).reduce((a, c) => a + c - 1, 0);
  const luxGold = (luxKinds * .6 + luxExtra * 1.5) * (1 + .3 * n.era) * (L.trade === "prot" ? .6 : 1);
  const strat = stratStatus(n);
  const imports = strat.reduce((a, s) => a + s.cost, 0);
  if (tribal(n)) {
    const room = roomOf(n), hunt = timeShare(n, "food"), farm = roleOpen(n, "farm") ? timeShare(n, "farm") : 0, season = [1 - .35 * coldNation(n), 1, 1.05, 1.3][Math.floor((G.month || 0) / 3)];
    const game = Math.min(1, room / Math.max(.2, hunt * 2.2)); // too many hunters for the land and the game runs out
    { const q = Math.floor((G.month || 0) / 3), cN = coldNation(n), fo = timeShare(n, "forage"), fi = timeShare(n, "fish");
      const cal = has(n, "calendar") ? 1.05 : 1, plants = [1 - .6 * cN + (q === 0 ? .4 * structCov(n, "smoke") * cN : 0), 1, 1.15, 1.25][q], pRoom = Math.min(1, room / Math.max(.2, fo * 2.5)); /* foragers strip the land too, but less than hunters */
      const winterEase = q === 0 ? .25 * structCov(n, "smoke") * cN : 0; /* smoked stores soften the winter */
      const hT = 1.1 * hunt * game * (season + winterEase) * (1 + .25 * structCov(n, "traps")) * (1 + (has(n, "spear") ? .05 : 0) + (has(n, "bow") ? .1 : 0) + (has(n, "dogs") ? .05 : 0) + (has(n, "burning") ? .03 : 0)), gT = 1.0 * fo * plants * pRoom * cal * (1 + (has(n, "burning") ? .05 : 0) + (has(n, "grinding") ? .05 : 0)), sT = .95 * fi * Math.min(1, fishable(n) * 1.2) * (1 + .3 * structCov(n, "canoe")) * (1 + .3 * structCov(n, "weir")) * (has(n, "fishing") ? 1.15 : 1) * (q === 0 ? 1 - .25 * cN + winterEase : 1);
      const fT = .75 * farm * (structCov(n, "field") + .3 * (1 - structCov(n, "field"))) * (has(n, "husbandry") ? 1.15 : 1) * (1 + .2 * structCov(n, "pens")) * cal; /* farmers without plots scratch out small gardens; herds add meat and milk */
      const tf = toolF(n); n._noHuntR = (.6 + (fT + sT) * tf) / (.6 + (hT + gT + fT + sT) * tf); food *= (.6 + (hT + gT + fT + sT) * tf) * (has(n, "salt") ? 1.03 : 1); } /* better tools, better hauls */
    mat *= (.9 + .2 * trv(n, "ind") / 100) * (.02 + 9.8 * timeShare(n, "wood")) * toolF(n, .25) * clamp(.75 + .25 * room, .75, 1.25); /* with more land, builders don't wait for the trees to grow back */ sci *= (.85 + 1.5 * timeShare(n, "elder")) * (projDone(n, "stones") ? 1.2 : 1) * (has(n, "stars") ? 1.05 : 1); } // who does what in the tribe
  if (tribal(n)) { food *= (1 + .1 * structCov(n, "rack")) * (coastal(n) ? 1 + .1 * structCov(n, "canoe") : 1); mat *= (1 + .2 * structCov(n, "shop")) * (1 + .1 * structCov(n, "knap")) * (1 + .1 * (has(n, "pottery") ? structCov(n, "kiln") : 0)); sci *= 1 + .1 * structCov(n, "shrine"); }
  const surplus = food - need;
  const foodGold = surplus > 0 ? Math.min(surplus * .02, 1 + n.era * 3) : 0;
  const armyUp = tribal(n) ? 0 : n.army * unitUpkeep(n);
  const gross = Math.max(0, tax + routeGold + luxGold), Bd = bud(n);
  if (Bd.init) { delete Bd.init; Bd.mil = clamp(Math.ceil(armyUp * 1.05 / Math.max(1, gross * (1 - Bd.qual / 100)) * 20) * 5, 5, 60); }
  const pctG = k => gross * Bd[k] / 100;
  // the military budget decides the army: the quantity share pays for regiments, the quality share makes each one better
  const TB = tribal(n), up1 = unitUpkeep(n), manpower = maxArmy(n);
  const milGold = TB ? 0 : pctG("mil");
  let qtyGold = milGold * (1 - Bd.qual / 100), qualGold = milGold - qtyGold;
  const armyTarget = TB ? Math.round(manpower * timeShare(n, "warrior") / .2) : Math.min(manpower, Math.floor(qtyGold / up1 + 1e-9)); // a tribe fields everyone who can fight
  const spare = TB ? 0 : Math.max(0, qtyGold - manpower * up1); qtyGold -= spare; qualGold += spare; // more money than men: it goes into quality
  const milFund = TB || armyUp <= 0 ? 1 : qtyGold / armyUp, milQual = TB ? .3 : qualGold / (Math.max(1, n.army, armyTarget) * up1);
  n.milFund = milFund; n.milQual = milQual;
  const prodGold = TB ? 0 : pctG("prod"), prodBoost = TB ? 0 : prodBoostOf(n); mat *= 1 + prodBoost + (TB ? 0 : welfareWork(n));
  const travelGold = TB ? 0 : pctG("travel"), subGold = TB ? 0 : pctG("sub"), propGold = TB ? 0 : pctG("prop");
  const incGold = TB ? 0 : gross * WELFARE.inc.cost[Bd.inc], healthGold = TB ? 0 : gross * WELFARE.health.cost[Bd.health];
  sci *= 1 + welfareWork(n);
  const over = Math.max(0, sizeOf(n) - adminCap(n));
  const govUp = over * (1 + n.era);
  // research budget: part of the nation's income is spent on scholars, labs and expeditions
  const rpct = TB ? .15 : budgetPct(n), resGold = gross * rpct, resMat = mat * rpct * .5; // a tribe's elders pass on what they know
  const resRate = 1.5 * Math.pow(1.25, n.era), resSci = (resGold + resMat) / resRate;
  sci += resSci; mat -= resMat;
  // the sector market: what your people need, what they make at home, and what is bought and sold abroad
  const open = tradeOpen(n), SU = suitOf(n), pc = partners.length;
  const canImport = open && G.nations.some(o => canTradeWith(n, o));
  const impP = pc >= 3 ? .95 : pc ? 1 : 1.25, expP = pc ? .9 : .7, expCap = .15 + .15 * pc;
  const sectors = {}; let secImp = 0, secExp = 0, secTar = 0, secSub = 0, secState = 0, secInv = 0;
  n.secF = n.secF || {};
  // tariffs protect, but they also raise what your own industries pay for tools and inputs
  const canTar = open && eco(n, "tariffs");
  let tarLv = 0; for (const k in SECTORS) if (secUnlocked(n, k) && canTar) tarLv += secOf(n, k).tar;
  const natTars = canTar && n.tariffOn ? Object.keys(n.tariffOn).filter(id => G.nations[id] && G.nations[id].alive).length : 0;
  const drag = Math.min(.15, .015 * tarLv + .005 * natTars);
  mat *= 1 - drag / 2;
  const rivals = open ? G.nations.filter(o => canTradeWith(n, o)) : [];
  let pubWages = 0;
  const wage = wage0, wageCost = clamp(1 - .08 * (wage - 1), .85, 1.06); // well-paid workers cost more, cheap labor competes on price
  for (const k in SECTORS) { if (!secUnlocked(n, k)) continue;
    const S0 = SECTORS[k], st = secOf(n, k), su = SU[k], base = st.base, lvl = st.lvl || 1, D = S0.w * utot * (1 + .3 * n.era), C = D * (1 + .05 * chainLevels(n, S0.chain)) * base * (1 + .04 * (lvl - 1));
    const suE = su * (.8 + .2 * base) * (1 - drag) * (1 + .02 * (lvl - 1)) * wageCost; // a strong, skilled industry produces cheaper
    // the best foreign producer you trade with sets the price your own producers must beat (your tariffs on them make their goods dearer)
    let comp = 0, compBy = null;
    for (const o of rivals) { if (!secUnlocked(o, k)) continue; let c = suitOf(o)[k] * (.8 + .2 * secBase(o, k)) * (1 + .02 * (secLvl(o, k) - 1)) * clamp(1 - .08 * (wageOf(o) - 1), .85, 1.06); if (canTar && n.tariffOn && n.tariffOn[o.id]) c /= 1.3; if (!dip(n.id, o.id).trade) c *= .85; if (c > comp) { comp = c; compBy = o; } }
    const ce = open && comp > 0 ? clamp(comp, .7, 1.6) : 1;
    const leak = st.tar ? loopholeShare(n, k) : 0, tr = canTar ? [0, .2, .5][st.tar] * (1 - leak) : 0, sr = [0, .25, .5][st.sub]; // cities dodging the tariff leak cheap goods past it
    let priv = 0, state = 0, stateNet = 0, sub = 0;
    let stWage = 0;
    if (st.nat && !eco(n, "nationalize")) st.nat = false;
    if (st.nat) { state = C * Math.min(1.1, .5 + .5 * suE); stWage = state * .35 / suE * wage; stateNet = state * (1 / ce - .65 / suE); } // the state runs it: steady output, but it pays the workers and eats the losses
    else { let local = 0; for (const c of cityInds(n).byK[k] || []) { const x = setById(c.s); if (x && x.lead && x.lead.pol && x.lead.pol[k] === "protect") local += c.share * .25 * leadEff(x.lead); }
      priv = C * clamp((suE * (1 + tr + sr + local) / ce - .4) / .6, 0, 1.15); sub = priv * sr / ce; } // private producers make what pays against foreign competition (and local buy-local programs)
    const ig = gross * st.inv / 100, invOut = ig * suE * 1.3 * (1 + .03 * (lvl - 1)), Sx = priv + state + invOut;
    stWage += invOut * .15 * wage; pubWages += stWage; // public projects employ people too
    const q = clamp(.15 + .07 * (lvl - 1) + .25 * (wage - 1) + .1 * (base - 1), 0, 1), NB = nationBrand(n, k), fame = NB.top, rep = NB.rep;
    let M = 0, X = 0;
    if (Sx < D) { if (canImport) M = D - Sx; } else if (open) X = Math.min(Sx - D, D * expCap * (1 + NB.fame / 40)); // famous city brands reach further
    const f = D > 0 ? (Sx + M) / D : 1, unitP = 1 / ce;
    sectors[k] = { leak, lvl, stable: st.stable == null ? .5 : st.stable, wage: wage * (.85 + .15 * base), su, suE, base, comp, compBy: compBy ? compBy.id : -1, D, priv, state, invOut, S: Sx, M, X, f, impCost: M * impP * unitP, expInc: X * expP * (suE >= comp ? 1 : .8) * (.75 + .5 * rep) * (1 + .15 * NB.prem), q, fame, rep, stWage, tarRev: M * impP * unitP * tr, sub, stateNet, ig, drag };
    n.secF[k] = f;
    secImp += sectors[k].impCost; secExp += sectors[k].expInc; secTar += sectors[k].tarRev; secSub += sub; secState += stateNet; secInv += ig;
  }
  const natTar = 0;
  n.prodPU = utot > 0 ? (tax / spendM + routeGold + luxGold + mat * .5) / utot : 0;
  n.secOut = {}; n.secX = {}; for (const k in sectors) { n.secOut[k] = sectors[k].S; n.secX[k] = sectors[k].X; }
  const govWages = eco(n, "wages") ? gross * .04 * wage0 : 0; // civil servants: clerks, judges, tax collectors
  const secNet = secExp + secTar + secState - secImp - secSub - pubWages;
  const fixed = bUp + imports + govUp + acadUp + sciPay + offPay + govWages;
  const spend = milGold + resGold + prodGold + travelGold + subGold + propGold + incGold + healthGold + secInv;
  const goldNet = gross + foodGold - fixed - spend + secNet;
  return { tribal: TB, govWages, pubWages, spendM, wage, drag, sectors, secImp, secExp, secTar, secSub, secState, secInv, secNet, natTar, tariffedBy, gross, fixed, spend, milGold, milFund, milQual, qtyGold, qualGold, armyTarget, manpower, spare, prodGold, prodBoost, travelGold, subGold, propGold, incGold, healthGold, food, need, surplus, tax, routeGold, luxGold, foodGold, bUp, armyUp, imports, govUp, goldNet, mat, sci, pop, per, partners, peaceful, luxCount, luxKinds, strat, over, resGold, resMat, resSci, talent, acadUp, sciPay, offPay };
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
    if (projDone(n, "stones")) add("elders", 6, "Stone circle");
    { const tp = setsOf(n).filter(x => builtAt(x, "temple")).length; if (tp) { add("elders", Math.min(12, 6 * tp), "Temples"); add("commoners", Math.min(8, 3 * tp), "Temples"); } }
    if (tribal(n)) { const room = roomOf(n), steps = setsOf(n).reduce((a, x) => a + (x.exp || 0), 0);
      add("commoners", room < 1 ? -Math.round(12 * (1 - room)) : Math.min(8, 2 * steps + Math.round(3 * Math.min(1, room - 1))), room < 1 ? "Crowded land" : "Room to roam");
      add("elders", Math.round(6 * structCov(n, "shrine")), "Shrines"); { let c = 0, P1 = 0; for (const x of setsOf(n)) { c += (x.cond == null ? 100 : x.cond) * x.pop; P1 += x.pop; } c = P1 ? c / P1 : 100; if (c < 70) add("commoners", -Math.round(12 * (1 - c / 100)), "Things falling apart"); }
      { const bu = structCov(n, "burial"), ar = structCov(n, "art"), lo = has(n, "agriculture") ? structCov(n, "loom") : 0;
        if (bu > .05) { add("elders", Math.round(4 * bu), "Burial grounds"); add("commoners", Math.round(2 * bu), "The dead are honored"); }
        if (ar > .05) add("commoners", Math.round(2 * ar), "Painted rocks"); if (lo > .05) add("commoners", Math.round(2 * lo), "Woven cloth");
        if (projDone(n, "mound")) { add("elders", 8, "Ancestral mound"); add("commoners", 3, "Ancestral mound"); }
        { const sm = (has(n, "ochre") ? 1 : 0) + (has(n, "flutes") ? 1 : 0) + (has(n, "brewing") ? 2 : 0); if (sm) add("commoners", sm, "Little joys: paint, music, brew"); } }
      { const wc = waterOf(n); if (wc < .98) add("commoners", -Math.round(28 * (1 - wc) + 2), "Not enough water"); }
      { const am = amenOf(n); if (am.all < .95) add("commoners", -Math.round(16 * (1 - am.all)), "Lacking comforts"); else add("commoners", 2, "Comfortable lives"); }
      { const hm = homeShares(n), soft = 1 - .5 * trv(n, "res") / 100; if (hm.shk > .005) add("commoners", -Math.round(26 * hm.shk * soft), "Families living in shacks"); if (hm.none > .005) add("commoners", -Math.round(35 * hm.none * soft), "Families with no roof"); } }
    if (n.trait) { const m = Math.round((n.trait.mar - 50) / 5), q = Math.round((n.trait.pie - 50) / 5);
      if (m) add("warriors", m, m > 0 ? "Warlike people" : "Peaceable people"); if (q) add("elders", q, q > 0 ? "Devout people" : "Worldly people"); }
    { let fr = 0, mi = 0; for (const g of n.eth || []) { fr += g.share * (1 - g.assim / 100) * (1 - compatOf(n, g) / 100); mi += g.share * (1 - g.assim / 100); }
      const pol = n.laws.assim || "free";
      if (fr > .003) add("commoners", -Math.round(40 * fr * (pol === "apart" ? .4 : 1)), "Strangers among us");
      if (pol === "force" && mi > .003) add("commoners", -Math.round(60 * mi), "Forced assimilation");
      const op = immOpinion(n), fe = Math.round(Math.min(25, 60 * op.fear + 150 * op.inflow));
      if (fe) add("commoners", -fe, "Fear of being outnumbered");
      if (op.labor > .01) { add("merchants", Math.round(Math.min(15, 60 * op.labor)), "Cheap labor from newcomers"); add("workers", -Math.round(Math.min(15, 50 * op.labor)), "Newcomers undercut wages"); } }
    if (tribal(n)) { add("elders", Math.round(40 * (timeShare(n, "elder") - .1)), "Elders & shamans"); add("warriors", Math.round(60 * (timeShare(n, "warrior") - .2)), "Share of warriors"); }
    { const w = wageOf(n); add("commoners", Math.round(clamp((w - 1) * 10, -8, 8)), "Wages"); }
    { let nat = 0, tar = 0, sub = 0; for (const k in n.sec || {}) { if (!secUnlocked(n, k)) continue; const st = n.sec[k]; if (st.nat) nat++; if (st.tar && tradeOpen(n)) tar += st.tar; if (st.sub && !st.nat) sub += st.sub; }
      let emb = 0; for (const o of G.nations) if (o.alive && o.id !== n.id && dip(n.id, o.id).emb) emb++;
      add("merchants", -Math.min(20, 6 * nat + 2 * tar + 3 * emb), "Nationalized sectors, tariffs & embargoes");
      // ordinary people love cheap goods: taxing them away hurts, while cheap imports please them
      let cheapTax = 0, cheapIn = 0;
      if (tradeOpen(n) && eco(n, "tariffs") && E.sectors) for (const k in E.sectors) { const x = E.sectors[k], st = secOf(n, k), o = x.compBy >= 0 ? G.nations[x.compBy] : null;
        const cheapSrc = o && (nationBrand(o, k).rep <= .45 || x.comp > x.suE * 1.1);
        if (cheapSrc && st.tar) cheapTax += st.tar * 2.5 * (x.comp > x.suE ? 1.5 : 1); else if (cheapSrc && x.M > x.D * .2) cheapIn++; }
      if (n.tariffOn) for (const id in n.tariffOn) { const o = G.nations[id]; if (o && o.alive && Object.keys(SECTORS).some(k => cheapFlood(o, k))) cheapTax += 3; }
      let buyLocal = 0; for (const x of setsOf(n)) if (x.lead && x.lead.pol) buyLocal += Object.values(x.lead.pol).filter(v => v === "protect").length;
      let loops = 0; for (const x of setsOf(n)) if (x.lead && x.lead.loop) loops++;
      add("commoners", -Math.round(Math.min(18, cheapTax + buyLocal * .5) * (loops ? .7 : 1)), "Tariffs on cheap goods"); if (loops) add("commoners", Math.min(6, 2 * loops), "Cheap goods slipping past tariffs"); add("commoners", Math.min(5, cheapIn), "Cheap imports"); add("commoners", Math.min(10, 3 * nat + sub) - Math.min(10, 2 * tar), "Sector policy"); }
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
  for (const d of F) if (Math.hypot(d.x - x, d.y - y) + r <= d.r + .003) return; // stored circles are rounded, so allow a little slack
  for (let i = F.length - 1; i >= 0; i--) if (Math.hypot(F[i].x - x, F[i].y - y) + F[i].r <= r + .003) F.splice(i, 1);
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
  if (G.fog.length > 1500 && (G.fogPruned || 0) + 40 < G.turn) { // drop circles that others already cover (older saves piled up duplicates)
    G.fogPruned = G.turn; const keep = [];
    for (const d of G.fog.slice().sort((a, b) => b.r - a.r)) if (!keep.some(k => Math.hypot(k.x - d.x, k.y - d.y) + d.r <= k.r + .003)) keep.push(d);
    G.fog = keep; }
  if (has(n, "flight")) { G.fogAll = true; G.exp.fill(1); return; }
  const sight = (.8 + .4 * n.era + (has(n, "sailing") ? .3 : 0) + (has(n, "navigation") ? .8 : 0)) * (tribal(n) ? .9 + 2 * timeShare(n, "scout") : 1) * (tribal(n) && setsOf(n).some(x => builtAt(x, "watch")) ? 1.15 : 1) * (tribal(n) && has(n, "signs") ? 1.1 : 1);
  for (const s of setsOf(n)) addDisc(s.x, s.y, (s.h || .1) * 1.5 + sight * (1 + s.t * .6));
  // scouts walk out past the borders and map what they find, a few trips each season
  { const sets = setsOf(n), scouts = tribal(n) ? popOf(n) * timeShare(n, "scout") : popOf(n) * .002 * (bud(n).travel || 0);
    n.scoutAcc = Math.min(8, (n.scoutAcc || 0) + Math.min(6, scouts * .5));
    const walk = settleRange(n) * 1.5;
    if (!sampler) sampler = document.createElement("canvas").getContext("2d");
    const lp = getLandPath();
    while (sets.length && n.scoutAcc >= 1) { n.scoutAcc--;
      const from = pick(sets), a = rnd() * Math.PI * 2, d = (from.h || .1) + rnd() * walk, x = from.x + Math.cos(a) * d, y = from.y + Math.sin(a) * d;
      if (sampler.isPointInPath(lp, x, y, "evenodd") || has(n, "sailing") || setsOf(n).some(x => builtAt(x, "canoe") > 0)) addDisc(x, y, .7); } }
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
        if (a.id === G.player || b.id === G.player) { const o = a.id === G.player ? b : a; hist(G.nations[G.player], "🤝", `First contact with the ${nm(o)}.`); }
        d.met = true; d.rel = (a.era + b.era < 2 ? -12 : a.era + b.era < 4 ? -4 : 0) + Math.round((rnd() - .5) * 10); // strangers start out wary
        if (a.id === G.player || b.id === G.player) log(`First contact with the ${nm(a.id === G.player ? b : a)}. They're wary of strangers at first.`, "🤝");
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

// fertility: how many children families raise. Food, homes, room and the people's mood all count
function fertility(n, E) {
  const f = [];
  if (!tribal(n)) return { mult: 1, f };
  const sr = clamp(E.surplus / Math.max(1, E.need), -1, 3);
  f.push(["Food", sr < 0 ? .5 : clamp(.85 + .15 * sr, .85, 1.3)]);
  f.push(["Homes", .4 + .6 * Math.min(1, structCov(n, "hut") + .5 * homeShares(n).shk)]);
  if (tribal(n) && roleOpen(n, "healer")) f.push(["Healers", 1 + .08 * healCov(n)]);
  if (tribal(n) && has(n, "midwifery")) f.push(["Midwives", 1.04]);
  if (tribal(n)) { f.push(["Water", .4 + .6 * waterOf(n)]); f.push(["Comforts", .8 + .25 * amenOf(n).all]); }
  const room = roomOf(n); f.push([room < 1 ? "Crowded land" : "Room to roam", crowdF(room)]);
  const mood = n.fac && n.fac.commoners != null ? clamp(.85 + n.fac.commoners / 330, .85, 1.12) : 1; f.push(["Mood", mood]);
  return { mult: f.reduce((a, x) => a * x[1], 1), f };
}
// losses get a popup when they matter to a people of your size; small ones go in the report
/* your nation's history: battles, great people and the moments worth remembering */
function firstAge(n) { const e = n.era; if (G.nations.some(o => o !== n && o.era >= e)) return; whist("🌅", `The ${nm(n)} were the first people to enter the ${ERAS[e]}.`, "first", [n.id]); }
function hist(n, icon, text) { if (!n || n.ai || n.id !== G.player) return; (G.hist || (G.hist = [])).push({ y: G.year, q: Math.floor((G.month || 0) / 3), i: icon, t: text }); if (G.hist.length > 400) G.hist.splice(0, G.hist.length - 400); }
/* the world's chronicle: notable events among all peoples. You only read about peoples you've met */
function whist(icon, text, cat, ids) { (G.whist || (G.whist = [])).push({ y: G.year, i: icon, t: text, c: cat, w: ids }); if (G.whist.length > 600) G.whist.splice(0, G.whist.length - 600); }
const known = id => id === G.player || (G.nations[id] && dip(G.player, id).met);
function alertLoss(n, lost, icon, title, text) {
  if (lost / Math.max(1, popOf(n)) >= .05) hist(n, icon, `${title}: ${text.split(". ")[0]}.`);
  const at = n.alertT || (n.alertT = {}); /* one popup of each kind a year at most; the rest go to the log */
  if (lost / Math.max(1, popOf(n)) >= .01 && !(at[title] > G.turn - TPY)) { at[title] = G.turn; (G.pendingUnlocks || (G.pendingUnlocks = [])).push({ icon, title, text }); }
  else log(text, icon);
}
/* as technology advances and needs are met for good, some work stops being necessary and leaves the allocation */
function retireRoles(n, E) { const R = n.retired || (n.retired = {}), t = timeOf(n), pop = (icon, title, text) => { if (!n.ai) (G.pendingUnlocks || (G.pendingUnlocks = [])).push({ icon, title, text }); };
  if (!R.food && has(n, "agriculture") && has(n, "husbandry")) {
    n.huntOkT = E.food * (n._noHuntR || 1) >= E.need * 1.02 && t.farm > 0 ? (n.huntOkT || 0) + 1 : 0;
    if (n.huntOkT >= 2 * TPY) { R.food = true; R.forage = true; t.farm = (t.farm || 0) + (t.food || 0) + (t.forage || 0); t.food = 0; t.forage = 0;
      pop("🌾", "The last hunt", "For two years your fields and herds have fed everyone on their own. Hunting and foraging are no longer needed to survive, so your hunters and foragers have become farmers and herders. They no longer appear in Who does what."); } }
  if (has(n, "pottery") || has(n, "mining")) { const ok = setsOf(n).every(x => waterInfra(x) >= x.pop);
    if (!R.water) { n.waterOkT = ok ? (n.waterOkT || 0) + 1 : 0;
      if (n.waterOkT >= 2 * TPY) { R.water = true; t.build = (t.build || 0) + (t.water || 0); t.water = 0;
        pop("🪣", "Water at hand", "For two years your cisterns, wells and springs have given everyone water. No one needs to carry it anymore, so the water carriers have become builders. They no longer appear in Who does what."); } }
    else if (setsOf(n).some(x => waterInfra(x) < x.pop * .9)) { R.water = false; n.waterOkT = 0; const w = carriersNeeded(n); t.water = w; t.build = Math.max(0, (t.build || 0) - w);
      pop("💧", "Water carriers needed again", "Your people have outgrown their cisterns and wells. Some families are carrying water again (Who does what); build more to free them."); } } }
function processNation(n) {
  if (!n.alive) return;
  if (!n.ai && n.id === G.player && !n.namedNation && rankOf(n) >= 1) { n.namedNation = true; G.pendingNaming = true; }
  workProjects(n);
  if (!n.stateUp && (popOf(n) >= STATE_POP || n.era >= 2)) { n.stateUp = true; hist(n, "🏛️", "The tribe grew into a nation, with work, trades and government."); bud(n).init = true; } // too many mouths: people take up trades, and the state begins
  checkUnlocks(n);
  const E = econ(n);
  n.gold += E.goldNet * TD; n.mat += E.mat * TD;
  // the army grows or shrinks toward what the military budget pays for. New regiments need materials to equip
  if (n.army === E.armyTarget) n.armyAcc = 0;
  else if (n.army < E.armyTarget) { n.armyAcc = (n.armyAcc || 0) + Math.max(1, E.manpower * .25) * TD;
    const uc = unitCost(n), k = Math.min(E.armyTarget - n.army, Math.floor(n.armyAcc), Math.max(0, Math.floor(n.mat / uc.m)));
    if (k > 0) { n.army += k; n.mat -= k * uc.m; n.armyAcc -= k; } }
  else { n.armyAcc = (n.armyAcc || 0) + Math.max(1, (n.army - E.armyTarget) * .5) * TD; const k = Math.min(n.army - E.armyTarget, Math.floor(n.armyAcc)); if (k > 0) { n.army -= k; n.armyAcc -= k; } }
  // debt: nobody quits, the nation simply borrows. Interest piles up and the people's trust drains away
  if (eco(n, "cityPolicy")) { const CI = cityInds(n), q1 = Math.floor((G.month || 0) / 3) === 0;
    for (const [id, list] of CI.bySet) { const x = setById(id); if (!x) continue; const L = ensureLeader(x, n);
      L.left -= TD;
      if (L.left <= 0) { const old = L.name; ensureLeader(x, n); if (!n.ai) log(`${x.name} has a new leader, ${x.lead.name} (trade skill ${"★".repeat(x.lead.trade)}${"☆".repeat(5 - x.lead.trade)}), after ${old} stepped down.`, "👤"); }
      if (q1 || !x.lead.pol || !Object.keys(x.lead.pol).length) { x.lead.pol = {}; for (const it of list) x.lead.pol[it.k] = cityPolicyPick(n, x, it, E); }
      const Lx = x.lead;
      if (Lx.loop && (!secOf(n, Lx.loop).tar || !tradeOpen(n))) { Lx.loop = null; Lx.loopKnown = false; } // the tariff is gone, so there's nothing to dodge
      if (q1 && !Lx.loop && tradeOpen(n) && (Lx.crack || 0) < G.tt) {
        const cheapK = Object.keys(E.sectors).filter(k => { const sx = E.sectors[k]; return secOf(n, k).tar && sx.compBy >= 0 && (sx.comp > sx.suE || nationBrand(G.nations[sx.compBy], k).rep <= .45); });
        const grumble = clamp((60 - (n.fac.commoners || 50)) / 40, 0, 1) + .3;
        if (cheapK.length && rnd() < (5 - Lx.loyal) * .1 * grumble) { Lx.loop = pick(cheapK); Lx.loopKnown = false; } }
      if (Lx.loop && !Lx.loopKnown && rnd() < .085 /* word gets out: about a 30% chance each year */) { Lx.loopKnown = true; if (!n.ai) log(`${Lx.name}, leader of ${x.name}, has found a loophole in your ${SECTORS[Lx.loop].name.toLowerCase()} tariff and is letting cheap goods in to win over the city's poor. Crack down from the city's sheet, or look the other way.`, "🕳️"); }
    }
  }
  if (eco(n, "brands")) { const CI = cityInds(n);
    for (const k in E.sectors) { const x = E.sectors[k];
      for (const c of CI.byK[k] || []) { const city = setById(c.s); if (!city) continue;
        const b = (city.ind || (city.ind = {}))[k] || (city.ind[k] = { fame: 0, rep: .5, q: 0 });
        const cx = x.X * c.share; (city.indX || (city.indX = {}))[k] = cx;
        const pol = city.lead && city.lead.pol ? city.lead.pol[k] : "none", le = leadEff(city.lead);
        const exp = Math.sqrt(cx / worldTopCityExport(k)) * (pol === "export" ? 1 + .4 * le : 1); // fame is measured against the world's biggest exporting cities
        b.q = clamp(x.q + .1 * (c.suit - 1) + .04 * city.t + (pol === "quality" ? .08 * le : 0), 0, 1); // land that suits it, a bigger city and a quality push make a better product
        b.fame += (100 * exp - b.fame) * pr(exp * 100 > b.fame ? .12 : .05); // exporting spreads the name; it fades slowly once exports stop
        if (cx > 0) b.rep += (b.q - b.rep) * pr(b.q > b.rep ? .04 : .12) * Math.min(1, exp * 2); // buyers judge what they receive: a cheap label sticks for a long time
        const ph = isPH(city, k);
        if (!n.ai && ph && !b.ph) log(`${city.name}'s ${SECTORS[k].name.toLowerCase()} is now one of the world's 5 best-known brands (#${cityRank(city, k)}), known for ${b.rep >= .65 ? "premium quality: wages and export prices rise" : b.rep <= .35 ? "cheap goods: it sells in bulk, but richer nations look down on it" : "ordinary quality"}.`, "🏆");
        else if (!n.ai && !ph && b.ph) log(`${city.name}'s ${SECTORS[k].name.toLowerCase()} has dropped out of the world's top 5 brands.`, "📉");
        b.ph = ph; } }
    for (const city of setsOf(n)) if (city.ind) { const runs = CI.bySet.get(city.id) || []; for (const k in city.ind) if (!runs.some(it => it.k === k)) { city.ind[k].fame -= city.ind[k].fame * pr(.15); city.ind[k].ph = false; if (city.indX) city.indX[k] = 0; } } }
  for (const k in E.sectors) { const x = E.sectors[k], st = secOf(n, k), share = x.D > 0 ? Math.min(1.5, x.S / x.D) : 1;
    const lvl = st.lvl || 1, target = clamp(.3 + .8 * share, .3, 1.5); st.base += (target - st.base) * pr(.1 * (1 + .1 * lvl)); // skilled industries ramp up faster
    // steady production builds stability: swings, shrinking output and a shaky nation wear it down
    const swing = st.lastShare == null ? 0 : Math.abs(share - st.lastShare) / TD; st.lastShare = share;
    const steady = clamp(1 - swing * 2, 0, 1) * (share < .875 ? .5 : 1) * (.6 + .4 * n.stab / 100);
    st.stable = (st.stable == null ? .5 : st.stable) + (steady - (st.stable == null ? .5 : st.stable)) * pr(.25);
    const lvT = 1 + 9 * clamp(st.stable * (.5 + .5 * Math.min(1.3, x.wage) / 1.3) * Math.min(1, st.base / 1.2) * Math.min(1, share), 0, 1); // an industry that makes little can't grow skilled
    if (eco(n, "levels")) st.lvl = lvl + (lvT - lvl) * pr(lvT > lvl ? .06 : .15); // skilled trades need guilds
    if (!n.ai && st.base < .6 && !st.hollow) { st.hollow = true; log(`Cheap imports are hollowing out your ${SECTORS[k].name.toLowerCase()} industry (${Math.round(st.base * 100)}% strength). Tariffs, subsidies or investment can rebuild it.`, "🏚️"); }
    else if (st.base > .75) st.hollow = false; }
  if (n.trust == null) n.trust = 100;
  if (n.gold < 0) n.gold *= Math.pow(1.02, TD);
  n.trustDelta = trustFactors(n, E).reduce((a, x) => a + x[1], 0);
  n.trust = Math.min(100, n.trust + n.trustDelta * TD);
  if (n.trust < 30) {
    if (!n.ai && !n.trustWarned) { n.trustWarned = true; log(`Public trust is collapsing (${Math.round(Math.max(0, n.trust))}/100). If it reaches zero, the nation will tear itself apart in civil war.`, "⚠️"); }
  } else if (n.trust > 40) n.trustWarned = false;
  if (n.trust <= 0) civilWar(n);
  // growth: each settlement grows toward its limit. Full villages stop growing.
  const sr = clamp(E.surplus / Math.max(1, E.need), -1, 3); // plenty of food means more children survive
  const sets = setsOf(n), FERT = fertility(n, E); n.fert = FERT.mult;
  // families without a hut throw up shacks of their own: they get through most winters, barely, and they resent it
  let H = 0;
  if (tribal(n)) { let left = 0, died = 0, dS = 0; const winter = Math.floor((G.month || 0) / 3) === 0, cold0 = 1.25 - .75 * trv(n, "res") / 100;
    let sick = 0, coldH = 0, thirstL = 0;
    for (const x of sets) { sb(x); const am = amenAt(n, x), cf = coldOf(x), cold = cold0 * (1.4 - .6 * am.warmth) * (.15 + .85 * cf); /* winters are mild in hot lands */
      /* without fire and clothes, even families in huts suffer in winter; without clean ways, sickness spreads where people crowd */
      if (winter && am.warmth < .95 && x.pop > 4) { const d = x.pop * .01 * (1 - am.warmth) * cold0 * cf * (1 - .3 * healCov(n)); x.pop -= d; coldH += d; }
      { const wc = waterAt(n, x); if (wc < .98) { const th = x.pop * (1 - wc), lv = th * .03, sk = th * .015 * (1 - .4 * healCov(n)); x.pop = Math.max(2, x.pop - lv - sk); thirstL += lv; sick += sk; } }
      if (am.health < .95 && x.pop > 15) { const d = x.pop * .004 * (1 - am.health) * (1 - .6 * healCov(n)) * Math.min(2, x.pop / 40); x.pop -= d; sick += d; }
      const need = Math.max(0, x.pop - builtAt(x, "hut") - 1e-6);
      x.shk = Math.min(x.shk || 0, need); /* families move out of shacks into new huts */
      let roof = need - x.shk;
      if (roof < .5) x.homelessT = 0; else { x.homelessT = (x.homelessT || 0) + 1; x.shk += roof * .5; roof = need - x.shk; }
      const ds = winter ? x.shk * .025 * cold : 0, ls = x.shk * .004;
      let d = 0, l = 0;
      if (x.homelessT > TPY && roof >= .5) { d = winter ? roof * .12 * cold : 0; l = roof * .05; }
      const tot = ds + ls + d + l, loss = Math.min(Math.max(0, x.pop - 2), tot); if (loss <= 0) continue; const k = loss / tot;
      x.pop -= loss; x.shk = Math.max(0, x.shk - (ds + ls) * k); died += (ds + d) * k; dS += ds * k; left += (ls + l) * k; }
    n.lostThirst = (n.lostThirst || 0) + thirstL;
    if (!n.ai && n.lostThirst >= Math.max(1, .02 * popOf(n))) { const v = Math.floor(n.lostThirst); n.lostThirst -= v; alertLoss(n, v, "🏜️", "Not enough water", `${v} famil${v === 1 ? "y" : "ies"} left in search of water, and bad water is making others sick. Assign more water carriers (Who does what)${has(n, "pottery") ? ", build cisterns" : ""}${has(n, "mining") ? " and wells" : ""}, or expand toward rivers and springs.`); }
    n.lostSick = (n.lostSick || 0) + sick; n.lostColdH = (n.lostColdH || 0) + coldH;
    if (!n.ai && n.lostSick >= Math.max(1, .02 * popOf(n))) { const v = Math.floor(n.lostSick); n.lostSick -= v; alertLoss(n, v, "🤒", "Sickness", `Sickness carried off ${v} famil${v === 1 ? "y" : "ies"}. Refuse pits${has(n, "pottery") ? ", wells" : ""}${has(n, "mysticism") ? " and sweat lodges" : ""} keep people healthy (Production › Amenities).`); }
    if (!n.ai && n.lostColdH >= Math.max(1, .02 * popOf(n))) { const v = Math.floor(n.lostColdH); n.lostColdH -= v; alertLoss(n, v, "🥶", "A hard winter", `${v} famil${v === 1 ? "y" : "ies"} died of cold despite their huts. Fire pits and tanning frames keep families warm (Production › Amenities).`); }
    const hm = homeShares(n); H = .6 * hm.shk + hm.none + .8 * (1 - waterOf(n)) + 4 * (died + left + sick + coldH + thirstL) / Math.max(1, popOf(n));
    n.lostD = (n.lostD || 0) + died; n.lostS = (n.lostS || 0) + dS; n.lostL = (n.lostL || 0) + left; /* count whole families before telling you */
    if (!n.ai && n.lostD + n.lostL >= 1) { const D = Math.floor(n.lostD), Lf = Math.floor(n.lostL + (n.lostD - D)), inShacks = n.lostS >= n.lostD / 2; n.lostD = 0; n.lostL = 0; n.lostS = 0;
      alertLoss(n, D + Lf, D >= Lf ? "🥶" : "🚶", D >= Lf ? "Deaths in the cold" : "Families leave",
        `${D ? `${D} famil${D === 1 ? "y" : "ies"} ${inShacks ? "in makeshift shacks" : "with no shelter"} died in the winter cold. ` : ""}${Lf ? `${Lf} famil${Lf === 1 ? "y" : "ies"} fed up with rough living left to find a better life elsewhere. ` : ""}Build more huts (Production) to stop it.`); } }
  if (tribal(n)) retireRoles(n, E);
  stepThinkers(n);
  n.hungry = sr < 0; H += (sr < 0 ? .6 * Math.min(1, -sr) : 0) + .1 * Math.min(3, G.nations.filter(o => o.alive && atWar(n.id, o.id)).length);
  stepTraits(n, E, H); stepPeoples(n);
  for (const s of sets) {
    const cap = capOf(s, n), T = TIERS[s.t];
    if (sr >= 0) {
      const free = Math.max(0, 1 - s.pop / cap);
      const r = (T.r + (n.laws.focus === "grow" ? .05 : 0) + .1 * Math.max(0, Math.min(2, sr))) * FERT.mult + fb(n, "grow") + (cul(n).grow || 0) + subGrowOf(n) + .006 * bud(n).health + .01 * (secF(n, "house") - 1) + ((n.laws.migr || "free") === "free" && secUnlocked(n, "ships") ? .006 * secF(n, "ships") * Math.min(1, suitOf(n).ships) : 0);
      const g = (s.pop * r * (tribal(n) ? .4 * birthF(s) : 1) + T.flat * (tribal(n) ? .5 : 1)) * free * TD; /* hunter-gatherer and early farming peoples grew slowly */
      s.pop += g; s.g = g;
    } else { s.pop *= Math.pow(1 - .05 * Math.min(1, -sr * 3) * (builtAt(s, "granary") ? .15 : 1 - .6 * Math.min(1, builtAt(s, "pit") / Math.max(1, needAt(n, s, "pit")))), TD); s.g = 0; }
    if (s.pop > cap) s.pop -= (s.pop - cap) * pr(.25);
    if (s.t === 0 && s.pop > cap) s.pop = cap;
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
    if (s.t >= 1 && s.g > 0 && n.ai) { const out = s.g * .3; s.pop -= out; s.ov = (s.ov || 0) + out; } // part of every town's growth heads for the countryside
    if (s.pop >= cap * start) s.ov = (s.ov || 0) + s.pop * T.emi * push * (n.laws.focus === "grow" ? 1.3 : 1) * TD;
    else if (s.t === 0) { s.crowd = false; continue; }
    if (s.ov < T.need) continue;
    if (!n.ai) { s.ov = T.need; if (!s.moveAsk) { s.moveAsk = true; (G.pendingUnlocks || (G.pendingUnlocks = [])).push({ icon: "🛖", title: `${s.name} is getting full`, text: `Some families of ${s.name} would like to found a new village. In Production, tap "Found a new village" and choose where, within your scouts' reach.` }); } continue; } /* you choose where your people settle */
    const ri = bestVillageSpot(n, s.r);
    if (ri < 0) { s.ov = T.need; if (!s.crowd) crowdedNow++; s.crowd = true; continue; }
    s.crowd = false;
    let nv = addSettlement(n.id, ri, Math.min(s.ov, 25), s);
    if (!nv && ri !== s.r) nv = addSettlement(n.id, s.r, Math.min(s.ov, 25), s); // the far land was out of reach: settle close to home instead
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
  n.sciPts += E.sci * TD * (1 + (curDom(n) && aliveThinkers(n).some(t => t.d === curDom(n)) ? .25 : 0)); /* a great mind speeds research in their field */
  if (!resOpen(n)) elderTalks(n);
  let guard = resOpen(n) ? 0 : 99;
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
    if (!G.nations.some(o => o !== n && o.techs.includes(t.id))) { const st = discoveryStory(n, t); whist("💡", `First in the world: ${t.name}, by the ${nm(n)}. ${st}`, "first", [n.id]); }
    if (!n.ai) { const st = discoveryStory(n, t); log(`Discovered ${t.name}! ${t.desc}`, "💡"); (G.pendingUnlocks || (G.pendingUnlocks = [])).push({ icon: "💡", title: t.name, text: `${st} ${t.desc}` }); hist(n, "💡", st); }
    if (t.id === "mars") victory(n, "science");
    n.research = n.autoResearch || n.ai ? chooseResearch(n) : null;
    const ne = n.era;
    if (ne < 7 && eraTechs(ne).filter(x => has(n, x.id)).length >= eraNeed(ne) && !fieldsMissing(n).length) {
      n.era++; firstAge(n); if (/^[md]:/.test(String(n.research || ""))) { n.research = null; n.resManual = false; }
      if (!n.ai) { log(`Your people enter the ${ERAS[n.era]}!`, "🌅"); hist(n, "🌅", `Your people entered the ${ERAS[n.era]}.`); }
      else if (dip(n.id, G.player).met) log(`The ${nm(n)} entered the ${ERAS[n.era]}.`, "🌅", -1);
    }
  }
  if (n.era < 7 && eraTechs(n.era).filter(x => has(n, x.id)).length >= eraNeed(n.era) && !fieldsMissing(n).length) {
    n.era++; firstAge(n); if (/^[md]:/.test(String(n.research || ""))) { n.research = null; n.resManual = false; }
    if (!n.ai) { log(`Your people enter the ${ERAS[n.era]}!`, "🌅"); hist(n, "🌅", `Your people entered the ${ERAS[n.era]}.`); }
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
      const skill = clamp(Math.round(1 + rnd() * 2 + op * .25 + rnd() + tq * rnd()), 1, 5), g = { name: nameFor(n, "person"), skill, left: 25 + Math.floor(rnd() * 25), from: a.name };
      n.generals.push(g); if (!n.ai) log(`General ${g.name} (${"★".repeat(skill)}) graduated from the military academy in ${a.name}.`, "🎖️");
    } }
  n.warmonger = Math.max(0, n.warmonger - TD);
  n.used = Math.max(0, (n.used || 0) - forces(n) * TD); // regiments rest and regroup after fighting
  if (n.mercs && n.mercs.length) { for (const m of n.mercs) { m.left--; const o = G.nations[m.from]; if (!o || !o.alive) m.left = 0; else if (dip(n.id, o.id).war || dip(n.id, o.id).rel < 0) { m.left = 0; m.broke = true; } }
    const done = n.mercs.filter(m => m.left <= 0); n.mercs = n.mercs.filter(m => m.left > 0);
    for (const m of done) { const o = G.nations[m.from]; if (o && o.alive && !dip(n.id, o.id).war) o.army += m.k;
      if (!n.ai) log(m.broke ? `The ${m.name} have recalled their ${m.k} regiment${m.k === 1 ? "" : "s"}: relations broke down.` : `Your contract with the ${m.name} has ended: their ${m.k} regiment${m.k === 1 ? "" : "s"} went home.`, "💰");
      else if (o && o.id === G.player) log(`Your ${m.k} regiment${m.k === 1 ? "" : "s"} on loan to the ${nm(n)} have come home.`, "💰"); } }
  // unrest & revolts
  for (const s of setsOf(n)) {
    const foreign = s.c !== n.id && s.c >= 0 ? (n.laws.rel === "tol" ? 15 : 25) : 0;
    const b = B(n.id, s.r); let roads = 0; for (const k in b) roads += BK[k].unrest || 0;
    const hbU = hubsOf(n).bySet.get(s.id), loopU = s.lead && s.lead.loop ? -6 : 0;
    const target = Math.max(0, (50 - n.stab) * 1.1) + foreign + s.q + (hbU ? hbU.unrest : 0) + loopU - (builtAt(s, "hall") ? 12 : 0) - roads - 3 * welfareLv(n) - (s.id === n.cap ? 15 : 0) - (G.regions[s.r].ctrl === n.id ? 5 : 0);
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
    const rb = newNation(s.name, col, -1, true, pick(Object.keys(PERS))); rb.lang = langOf(n);
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
  if (n.trait && Math.abs(n.trait.con - 50) > 5) f.push([n.trait.con > 50 ? "A content people" : "A restless people", (n.trait.con - 50) / 25]);
  if (B0.inc) f.push([WELFARE.inc.lv[B0.inc], .75 * B0.inc]);
  if (B0.health) f.push([WELFARE.health.lv[B0.health], .75 * B0.health]);
  if (B0.sub) f.push(["Subsidies", .15 * Math.sqrt(B0.sub)]);
  for (const k in WELFARE) { const g = welfareGap(n, k); if (g > .05) f.push([`People demand more ${WELFARE[k].name.toLowerCase()}`, -1.5 * g]); }
  return f;
}
// trade moves aimed at you: every one goes in your trade record; you're only notified about peoples that matter to you
function tradeRelevant(o, n) {
  const d = dip(n.id, o.id); if (!d.met) return false;
  if (d.trade || d.ally || d.offer || bordersTouch(n, o)) return true;
  const SN = suitOf(n), SO = suitOf(o); // a serious competitor or supplier in one of your sectors
  return Object.keys(SECTORS).some(k => secUnlocked(n, k) && secUnlocked(o, k) && (SO[k] > SN[k] * 1.25 || SN[k] > SO[k] * 1.25) && tradeOpen(o));
}
function tradeNote(by, target, text, icon) {
  if (target.id !== G.player || target.ai) return;
  (target.tradeLog || (target.tradeLog = [])).unshift({ when: dateTxt(), by: by.id, t: text, i: icon }); target.tradeLog.length = Math.min(target.tradeLog.length, 25);
  if (tradeRelevant(by, target)) log(text, icon);
}
// ---- civil war: the nation splits; the far half rises up with a clean treasury ----
function civilWar(n) {
  whist("💥", `Civil war tore the ${nm(n)} apart.`, "fall", [n.id]);
  hist(n, "💥", "Civil war tore the nation apart.");
  const sets = setsOf(n), cap = capSet(n) || sets[0];
  if (sets.length < 2 || !cap) { n.trust = 25; return; }
  const far = sets.filter(x => x.id !== cap.id).sort((a, b) => Math.hypot(b.x - cap.x, b.y - cap.y) - Math.hypot(a.x - cap.x, a.y - cap.y));
  const rebelsS = far.slice(0, Math.max(1, Math.round(sets.length * .45)));
  const used = new Set(G.nations.map(x => x.color));
  const col = COLORS.find(c => !used.has(c)) || `hsl(${Math.floor(rnd() * 360)},65%,52%)`;
  const rb = newNation(placeName(langOf(n)), col, -1, true, pick(Object.keys(PERS)), n.cul); rb.lang = langOf(n);
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
  const units = forces(d) * .8 / Math.sqrt(Math.max(1, sizeOf(d) * 2)) + .5;
  const m = TIERS[s.t].def + fb(d, "def") + (builtAt(s, "palisade") ? .35 : builtAt(s, "ditch") ? .15 : 0) + .25 * bigF(s) + (builtAt(s, "watch") ? .05 : 0) + (builtAt(s, "rampart") ? .5 : 0) + (R.t === "mountain" ? .3 : 0) + (R.t === "forest" || R.t === "jungle" ? .1 : 0) + (s.id === d.cap ? .3 : 0);
  return { units, power: (units * unitPower(d) * m + U(s.pop) * .3 * ERA_POW[d.era] * m) * defMult(d) * garrisonMult(d) }; // claimed land left unguarded is easier to break into
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
  loseUnits(n, aLoss); n.used += units;
  const dLoss = Math.min(forces(dn), Math.round(D.units * clamp(att / def * .5, .1, 1) + (win ? .5 : 0))); loseUnits(dn, dLoss);
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
    n.conq = (n.conq || 0) + 1;
    if (s.id === dn.cap) whist("🏰", `The ${nm(n)} took ${s.name}, capital of the ${nm(dn)}.`, "war", [n.id, dn.id]);
    if ([3, 8, 15, 30, 60].includes(n.conq)) { const W0 = G.wpeople || (G.wpeople = []), c = W0.find(p => p.kind === "conq" && p.n === n.id && G.year - p.until < 25);
      if (c) { c.count = n.conq; c.until = G.year; whist("⚔️", `${c.name} of the ${nm(n)} has now taken ${n.conq} settlements.`, "war", [n.id]); }
      else { const p = { kind: "conq", name: nameFor(n, "person"), title: n.era < 2 ? "Warlord" : n.era < 5 ? "Conqueror" : "General", n: n.id, born: G.year, until: G.year, count: n.conq, from: nm(n) }; W0.push(p);
        whist("👑", `${p.name}, ${p.title.toLowerCase()} of the ${nm(n)}, rose to fame by taking ${n.conq} settlements.`, "people", [n.id]); } }
    if (n.id === G.player) hist(n, "🏳️", `We took ${s.name} from the ${nm(dn)}.`); else if (dn.id === G.player) hist(dn, "🏴", `The ${nm(n)} took ${s.name} from us.`);
    s.pop *= .85; convertSet(n, dn, s); s.o = n.id; s.focus = null; recalcShares(n); recalcShares(dn); s.u = 35; s.q = 30; s.hp = HP[s.t]; s.rad = 1; s.hit = G.tt; G.sv++;
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
  dn.alive = false; dn.army = 0; whist("💀", `The ${nm(dn)} are no more${by ? `, destroyed by the ${nm(by)}` : ""}.`, "fall", [dn.id].concat(by ? [by.id] : []));
  G.sv++;
  for (const o of G.nations) { const d = dip(dn.id, o.id); d.war = false; d.trade = false; d.ally = false; }
  if (dn.id === G.player) { log("Your last settlement has fallen.", "☠️"); defeat(); }
  else if (dip(dn.id, G.player).met) log(`The ${nm(dn)} has been wiped from the map by the ${nm(by)}.`, "☠️", -1);
}
function declareWar(a, b) {
  if (a.id === G.player) hist(a, "⚔️", `War declared on the ${nm(b)}.`); else if (b.id === G.player) hist(b, "⚔️", `The ${nm(a)} declared war on us.`);
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
  if (a.id === G.player || b.id === G.player) hist(G.nations[G.player], "🕊️", `Peace with the ${nm(a.id === G.player ? b : a)}.`);
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
  if (n.pers === "aggressive" && has(n, "bronze")) n.laws.focus = "mil";
  else if (n.pers === "builder" && has(n, "guilds")) n.laws.focus = "ind";
  else if (n.pers === "trader" && has(n, "currency")) n.laws.focus = "com";
  else if (n.laws.focus === "grow" && n.era > 0) n.laws.focus = "bal";
  if (tribal(n)) { const P0 = prodState(n);
    for (const x of setsOf(n)) { sb(x); const cap = Math.max(1, builderHoursAt(n, x) * 1.2); let qd = x.pq.reduce((a, id) => a + ((itemOf(id) || {}).hours || 0), 0) - (x.qp || 0);
     for (let tries = 0; tries < 12 && qd < cap; tries++) { let best = null, bs = 0;
      for (const k in STRUCTS) { const it = itemOf(k); if (!itemOpenAt(n, x, it)) continue; const d = needAt(n, x, k); if (!d) continue; const sh = (1 - (builtAt(x, k) + x.pq.filter(q => q === k).length) / d) * (STRUCTS[k].opt ? .35 : 1); if (sh > bs) { bs = sh; best = k; } } /* needs before nice-to-haves */
      if (best) { x.pq.push(best); qd += STRUCTS[best].hours; } else break; }
      if (x.pq.length) continue;
      else if (x.id === n.cap) { const g = GREAT.find(q => !P0.done[q.id] && itemOpen(n, q) && n.mat >= q.mat && !x.pq.includes(q.id)); if (g && rnd() < pr(.3)) { n.mat -= g.mat; x.pq.push(g.id); } } }
    const nearRival = setsOf(n).some(x => nearSets(x.x, x.y, 5).some(o => o.o !== n.id));
    if (rnd() < pr(nearRival ? .6 : .2) && forces(n) >= garrisonNeed(n) + (nearRival ? 1 : 2)) { const x = pick(setsOf(n)); if (x && (x.exp || 0) < EXP_MAX) x.exp = (x.exp || 0) + 1; } }  if (tribal(n)) { const t = timeOf(n), war = wars.length || n.pers === "aggressive";
    const ag = has(n, "agriculture");
    const fsh = fishable(n), fw = Math.ceil(firewoodNeed(n) * 100 / 5) * 5;
    const want = { warrior: war ? 28 : 15, food: (E.surplus < 0 ? 30 : 23) * (ag ? .5 : 1) * (1 - .4 * fsh), forage: (E.surplus < 0 ? 24 : 18) * (ag ? .5 : 1), fish: Math.round(14 * fsh), farm: ag ? (E.surplus < 0 ? 30 : 22) : 0, water: n.retired && n.retired.water ? 0 : carriersNeeded(n), firewood: fw, wood: crewFor(n).wood + (n.pers === "builder" ? 2 : 0), build: crewFor(n).build + (n.pers === "builder" ? 4 : 0), elder: n.cul === "scholarly" ? 15 : 8, scout: n.pers === "trader" ? 8 : 4, tools: pct5(toolNeed(n)), healer: has(n, "mysticism") ? pct5(healNeed(n)) : 0 };
    if (n.retired && n.retired.food) { want.farm += want.food + want.forage; want.food = 0; want.forage = 0; }
    const sum = Object.values(want).reduce((a, v) => a + v, 0); for (const k in want) t[k] = Math.round(want[k] * 100 / sum); }
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
  if (wars.length && rnd() < pr(.5)) { const foe = Math.max(...wars.map(o => power(o))), deal = MERC_DEALS[0];
    const sup = mercSuppliers(n).filter(o => o.ai).sort((a, b) => unitPower(b) - unitPower(a))[0];
    if (sup && power(n) < foe * 1.1) { const k = Math.min(3, mercSpare(sup)); if (k > 0 && n.gold > mercFee(sup, k, deal) * 1.5) hireMercs(n, sup, k, deal); } }
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
  // trade sectors: prop up what the land is bad at, protect weak producers, and shut out bitter enemies
  for (const k in E.sectors) { const x = E.sectors[k], st = secOf(n, k);
    st.nat = false; st.sub = x.su < .75 && n.gold > 0 ? 1 : 0;
    st.tar = tradeOpen(n) && eco(n, "tariffs") && x.comp > x.suE * 1.15 && (n.laws.trade === "prot" || n.pers === "zealot" || x.base < .65) ? (x.base < .5 ? 2 : 1) : 0;
    st.inv = x.f < .8 && !x.M && n.gold > 0 ? 3 : 0; }
  if (tradeOpen(n) && eco(n, "tariffs")) for (const o of G.nations) { if (!o.alive || o.id === n.id) continue; const d = dip(n.id, o.id); if (!d.met || d.war || !tradeReach(n, o)) continue;
    if (!d.emb && d.rel < -70 && rnd() < pr(.05)) { d.emb = n.id; d.trade = false; d.offer = null; tradeNote(n, o, `The ${nm(n)} placed an embargo on your goods. All trade between you has stopped.`, "🚫"); }
    else if (d.emb === n.id && d.rel > -30 && rnd() < pr(.2)) { d.emb = null; tradeNote(n, o, `The ${nm(n)} lifted their embargo on you. Trade can resume.`, "🔓"); }
    if (d.emb) continue;
    const theyTax = o.tariffOn && o.tariffOn[n.id], weTax = n.tariffOn && n.tariffOn[o.id];
    if (theyTax && !weTax && rnd() < pr(.3)) { (n.tariffOn || (n.tariffOn = {}))[o.id] = true; tradeNote(n, o, `The ${nm(n)} retaliated with tariffs on your goods.`, "🧾"); }
    else if (!weTax && (n.laws.trade === "prot" || n.pers === "zealot") && rnd() < pr(.08)) { // protect an industry your goods are undercutting
      const SN = suitOf(n), SO = suitOf(o), k = Object.keys(SECTORS).find(k => secUnlocked(n, k) && secUnlocked(o, k) && SO[k] > SN[k] * 1.25);
      const cheap = Object.keys(SECTORS).find(k => secUnlocked(n, k) && n.era >= o.era && cheapFlood(o, k));
      if (cheap && !k) { (n.tariffOn || (n.tariffOn = {}))[o.id] = true; tradeNote(n, o, `The ${nm(n)} put tariffs on your goods to keep out your cheap ${SECTORS[cheap].name.toLowerCase()}.`, "🧾"); }
      else if (k) { (n.tariffOn || (n.tariffOn = {}))[o.id] = true; tradeNote(n, o, `The ${nm(n)} put tariffs on your goods to protect their ${SECTORS[k].name.toLowerCase()} industry from your cheaper exports.`, "🧾"); } }
    else if (weTax && !theyTax && n.laws.trade !== "prot" && rnd() < pr(.1)) { delete n.tariffOn[o.id]; tradeNote(n, o, `The ${nm(n)} removed their tariffs on your goods.`, "✅"); }
    if (d.trade && d.rel < -25 && rnd() < pr(.15)) { d.trade = false; tradeNote(n, o, `The ${nm(n)} cancelled their trade agreement with you.`, "✂️"); }
    else if (!o.ai && !d.trade && !d.offer && tradeOpen(o) && d.rel > 20 && rnd() < pr(.1) && aiAccept(n, "trade", o)) { d.offer = n.id; tradeNote(n, o, `The ${nm(n)} offer you a trade agreement. Accept it from the World tab.`, "📦"); }
  }
  // develop fields (only once the tribe has moved past elder talk)
  if (!resOpen(n)) return;
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
      if (!d.war && !d.trade && !d.emb && tradeOpen(n) && tradeOpen(o) && tradeReach(n, o) && d.rel >= Math.max(tradeTrust(n), tradeTrust(o)) && rnd() < pr(.15) && (n.ai || aiAccept(o, "trade", n))) d.trade = true;
      if (!d.war && !d.ally && d.rel > 60 && rnd() < pr(.08) && (n.ai || aiAccept(o, "ally", n))) d.ally = true;
    }
    if (d.trade && !d.war && d.rel < tradeTrust(n) - 25 && rnd() < pr(.3)) { d.trade = false; tradeNote(n, o, `The ${nm(n)} no longer trust you enough to trade and have ended your trade agreement.`, "✂️"); }
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
      const avail = forces(n) - n.used; if (avail < 1) break;
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
    if (bordersTouch(a, b) && !d.ally) v -= 1.3 * Math.max(.4, 1 - .12 * (a.era + b.era) / 2); // shared borders breed friction, less so as peoples mature
    if (d.emb) v -= .6;
    for (const [x, y] of [[a, b], [b, a]]) if (y.era > x.era || (y.era === x.era && wageOf(y) > wageOf(x) * 1.2)) for (const k in SECTORS) if (secUnlocked(y, k) && tradeOpen(y) && cheapFlood(x, k)) { v -= .3; break; } // richer nations resent being flooded with cheap goods if ((a.tariffOn && a.tariffOn[b.id]) || (b.tariffOn && b.tariffOn[a.id])) v -= .2;
    if (a.pers === "aggressive" || b.pers === "aggressive") v -= .3;
    const big = Math.max(T.get(a.id), T.get(b.id));
    if (big > 8) v -= Math.min(1.5, (big - 8) * .1);
    v -= ((a.id === G.player ? a.warmonger : 0) + (b.id === G.player ? b.warmonger : 0)) * .05;
    v += (rnd() - .5) * 2;
    v += .06 * (Math.min(6, metCount(a)) + Math.min(6, metCount(b))); // the more of the world a people knows, the more open it is
    v -= d.rel * .015;
    d.rel = clamp(d.rel + v * TD, -100, 100);
    d.truce = dec(d.truce);
  }
}

// ================= EVENTS =================
const evScale = () => clamp(14 * TD, .08, 1); // events come every few years now, so each one is smaller than a whole old turn's worth
const fx = {
  gold: (n, v) => { n.gold += v * evScale(); }, mat: (n, v) => { n.mat += v * evScale(); },
  fac: (n, k, v, t = 6, why = "Recent event") => n.facMods.push({ k, v, why, t: t * evScale() }),
  pop: (n, f) => { f = 1 + (f - 1) * evScale(); setsOf(n).forEach(s => { s.pop = Math.min(capOf(s, n), s.pop * f); }); },
  sci: (n, v) => { n.sciPts += v * evScale(); },
  army: (n, v) => { n.army = Math.max(0, n.army + v); },
};
const eraScale = n => Math.pow(1.6, n.era) * .6;
const randRegion = n => pick([...pres(n)]);
const EVENTS = [
  { id: "flood", title: "The River Floods", era: [0, 4], icon: "🌊", cond: n => [...pres(n)].some(ri => W.regions[ri].t === "grass"),
    text: () => "Heavy rains swelled the river. Fields are underwater and villages are damaged.",
    ch: [{ t: "Pay to rebuild", d: n => `−${fmt(20 * eraScale(n))} gold`, f: n => fx.gold(n, -20 * eraScale(n)) },
         { t: "Let them manage", d: () => "−8% population, Commoners upset", f: n => { fx.pop(n, .92); fx.fac(n, "commoners", -10, 5, "Ignored the flood"); } }] },
  { id: "cave", title: "The Painted Cave", era: [0, 0], icon: "🎨", cond: n => tribal(n),
    text: () => "Children exploring the hills found a deep cave. Its walls are covered in painted animals, made by people long forgotten.",
    ch: [{ t: "Make it a sacred place", d: () => "The elders hold rites there", f: n => { fx.fac(n, "elders", 8, 5, "Sacred cave"); fx.sci(n, 4 * eraScale(n)); } },
         { t: "Add our own paintings", d: () => "The people take pride in their story", f: n => fx.fac(n, "commoners", 6, 5, "Our story on the walls") }] },
  { id: "winter", title: "The Long Winter", era: [0, 1], icon: "❄️", cond: n => tribal(n),
    text: () => "Snow has lingered for months. Stores are running thin and the old are failing.",
    ch: [{ t: "Share everything equally", d: () => "Hard on all, but the tribe holds together", f: n => { fx.pop(n, .95 + .04 * structCov(n, "pit")); fx.fac(n, "commoners", 4, 4, "Shared hardship"); } },
         { t: "Feed the warriors and hunters first", d: () => "The strong survive; families grieve", f: n => { fx.pop(n, .93 + .05 * structCov(n, "pit")); fx.fac(n, "warriors", 5, 4, "Fed first"); fx.fac(n, "commoners", -6, 4, "The weak went hungry"); } }] },
  { id: "mammoth", title: "Bones of Giants", era: [0, 0], icon: "🦣", cond: n => tribal(n),
    text: () => "Hunters have found the bones of an enormous beast, with tusks longer than a man.",
    ch: [{ t: "Carve tools and charms", d: () => "Fine materials", f: n => fx.mat(n, 10 * eraScale(n)) },
         { t: "Leave them to the spirits", d: () => "The shamans approve", f: n => fx.fac(n, "elders", 6, 4, "Respect for the giants") }] },
  { id: "prodigy", title: "A Gifted Child", era: [0, 1], icon: "🧒",
    text: () => "A child of the tribe remembers every story, counts the stars and asks questions no one can answer.",
    ch: [{ t: "Let the elders teach her", d: () => "She may become a great shaman", f: n => fx.sci(n, 10 * eraScale(n)) },
         { t: "She should learn to hunt like the others", d: () => "Tradition is kept", f: n => fx.fac(n, "warriors", 3, 3, "Tradition kept") }] },
  { id: "herd", title: "The Great Herd", era: [0, 0], icon: "🦬", cond: n => tribal(n),
    text: () => "Scouts report a vast herd moving through the valley. It won't stay long.",
    ch: [{ t: "Everyone joins the hunt", d: () => "A feast: more people, but the warriors are tired", f: n => { fx.pop(n, 1.12); fx.fac(n, "warriors", -4, 2, "Exhausting hunt"); } },
         { t: "Only the hunters go", d: () => "A smaller gain, no strain", f: n => fx.pop(n, 1.05) }] },
  { id: "strangers", title: "Strangers at the Fire", era: [0, 1], icon: "🔥", cond: n => tribal(n),
    text: () => "Travelers from a distant people sit at your fire. They know things your elders don't.",
    ch: [{ t: "Share stories through the night", d: () => "The elders learn from them", f: n => { fx.sci(n, 6 * eraScale(n)); fx.fac(n, "elders", 5, 3, "Strangers' tales"); } },
         { t: "Trade with them", d: () => "Tools and furs change hands", f: n => { fx.mat(n, 8 * eraScale(n)); fx.gold(n, 4 * eraScale(n)); } },
         { t: "Drive them off", d: () => "Warriors approve", f: n => fx.fac(n, "warriors", 5, 3, "Strangers driven off") }] },
  { id: "wolves", title: "Wolves in the Night", era: [0, 1], icon: "🐺", cond: n => tribal(n),
    text: () => "A wolf pack has been taking children and goats from the edge of camp.",
    ch: [{ t: "Hunt the pack down", d: () => "Dangerous, but the warriors earn glory", f: n => { fx.army(n, rnd() < .3 ? -1 : 0); fx.fac(n, "warriors", 8, 4, "Wolf hunt"); } },
         { t: "Build fences of thorn", d: () => "Costs materials, keeps everyone safe", f: n => fx.mat(n, -5 * eraScale(n)) }] },
  { id: "omen", title: "A Strange Omen", era: [0, 1], icon: "🌑", cond: n => tribal(n),
    text: () => "The sun went dark at midday. The people look to the shamans for answers.",
    ch: [{ t: "A great sacrifice", d: () => "Elders and commoners are reassured; it costs food and goods", f: n => { fx.pop(n, .97); fx.fac(n, "elders", 8, 4, "Sacrifice"); fx.fac(n, "commoners", 4, 4, "Sacrifice"); } },
         { t: "The shamans study the sky", d: () => "Knowledge grows, but the people stay uneasy", f: n => { fx.sci(n, 8 * eraScale(n)); fx.fac(n, "commoners", -4, 3, "Unexplained omen"); } }] },
  { id: "feud", title: "Clan Feud", era: [0, 1], icon: "🗡️", cond: n => tribal(n) && setsOf(n).length >= 2,
    text: () => "Two clans of your tribe are feuding over a stolen bride. Blood has already been spilled.",
    ch: [{ t: "The elders judge", d: () => "Elders gain respect; the losing clan sulks", f: n => { fx.fac(n, "elders", 6, 4, "Elders' judgment"); fx.fac(n, "commoners", -3, 3, "Feud"); } },
         { t: "Let them fight it out", d: () => "Warriors cheer, some die", f: n => { fx.pop(n, .96); fx.fac(n, "warriors", 6, 3, "Feud settled by arms"); } },
         { t: "Arrange a marriage between them", d: () => "Costs gifts, peace returns", f: n => { fx.gold(n, -5 * eraScale(n)); fx.fac(n, "commoners", 4, 4, "Clans united"); } }] },
  { id: "berries", title: "Fruit in Abundance", era: [0, 0], icon: "🫐", cond: n => tribal(n),
    text: () => "The hillsides are heavy with berries, nuts and wild honey this year.",
    ch: [{ t: "Gather everything", d: () => "Full bellies, more children", f: n => fx.pop(n, 1.08) },
         { t: "Dry and store it", d: () => "Stores for hard times", f: n => fx.mat(n, 6 * eraScale(n)) }] },
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
  const n = P(); if (!n.alive) return null;
  if (G.nextEvent - G.tt > 24 * TD) G.nextEvent = G.tt + (4 + rnd() * 8) * TD; // older saves scheduled events a century out
  if (G.tt < G.nextEvent) return null;
  const ok = EVENTS.filter(e => n.era >= e.era[0] && n.era <= e.era[1] && (!e.cond || e.cond(n)) && e.id !== G.lastEvent);
  if (!ok.length) return null;
  G.nextEvent = G.tt + (8 + rnd() * 12) * TD; // something happens every 2-5 years
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
  if (!G.over && (!me.alive || !setsOf(me).length)) { me.alive = false; defeat(); }
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
function defeat() { G.fogAll = true; G.over = true; G.outcome = { win: false, why: "Your nation has fallen. Its story lives on only in the history books of others." }; }

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
    for (const s of G.sets) { const p = bordPaths.get(s.o) || (bordPaths.set(s.o, new Path2D()), bordPaths.get(s.o)); smoothPoly(p, s.exp && s.expDir != null ? blobPts(s.x, s.y, s.h || .05, s.id).map(([px, py]) => { const l = lobe(s, Math.atan2(py - s.y, px - s.x)); return [s.x + (px - s.x) * l, s.y + (py - s.y) * l]; }) : blobPts(s.x, s.y, s.h || .05, s.id)); }
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
      screenText(s.n, s.lx, s.ly, k, "700 11px Nunito, system-ui, sans-serif", 3, "rgba(255,255,255,.85)", "rgba(29,42,77,.75)");
      const bits = (consOf(me, s.i) ? "🔨" : "") + (s.r && k > 3 ? RES[s.r].icon : "");
      if (bits) screenText(bits, s.lx, s.ly + fs * 1.25, k, "11.5px system-ui, sans-serif", 0, null, "#000");
    }
  }
  // settlements: drawn at true map scale, so you zoom in to see their shapes
  drawSettlements(k, me);
  if (placeMode) { const d = setById(placeMode.from); if (d) { const R = villageReach(P()); ctx.save(); ctx.lineWidth = 2.5 / k; ctx.setLineDash([6 / k, 5 / k]); ctx.strokeStyle = "#ff7a3d"; ctx.fillStyle = "rgba(255,122,61,.10)";
    ctx.beginPath(); ctx.arc(d.x, d.y, R, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore(); } }
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
/* text is drawn at screen size: tiny map-unit fonts smear into blobs when zoomed far in */
function screenText(txt, x, y, k, font, lw, stroke, fill) { ctx.save(); ctx.translate(x, y); ctx.scale(1 / k, 1 / k); ctx.font = font; if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.strokeText(txt, 0, 0); } ctx.fillStyle = fill; ctx.fillText(txt, 0, 0); ctx.restore(); }
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
    if (px < 2.4) { ctx.fillStyle = shade(n.color, -.45); ctx.beginPath(); ctx.arc(s.x, s.y, z, 0, Math.PI * 2); ctx.fill();
      if (n.cap === s.id) { starPath(s.x, s.y, 3.2 / k); ctx.fillStyle = "#ffc93c"; ctx.fill(); ctx.lineWidth = .8 / k; ctx.strokeStyle = "#7a4b00"; ctx.stroke(); } continue; }
    const base = shade(n.color, .62), big = footR0(s) * k > px; /* zoomed in, the village is drawn at its true size, spreading as it gains huts */
    const body = dy => { if (!big) { shapePath(t, s.x, s.y + dy, z); return; } const fp = blobPts(s.x, s.y, footR0(s), s.id + 7).map(([qx, qy]) => { const gr = 1 + hgAt(s, Math.atan2(qy - s.y, qx - s.x)); return [s.x + (qx - s.x) * gr, s.y + dy + (qy - s.y) * gr]; });
      ctx.beginPath(); fp.forEach(([qx, qy], i) => { const [nx, ny] = fp[(i + 1) % fp.length], mx = (qx + nx) / 2, my = (qy + ny) / 2; if (!i) ctx.moveTo(mx, my); else ctx.quadraticCurveTo(qx, qy, mx, my); }); const [qx, qy] = fp[0], [nx, ny] = fp[1]; ctx.quadraticCurveTo(qx, qy, (qx + nx) / 2, (qy + ny) / 2); ctx.closePath(); };
    body(z * .22); ctx.fillStyle = "rgba(20,30,60,.3)"; ctx.fill();
    body(0);
    const gz = big ? footR0(s) * 1.6 : z, g = ctx.createLinearGradient(s.x, s.y - gz, s.x, s.y + gz);
    g.addColorStop(0, shade(base, .5)); g.addColorStop(1, shade(base, -.1));
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = big ? 2.2 / k : z * .22; ctx.strokeStyle = shade(n.color, -.45); ctx.stroke();
    if (s.crowd && s.o === me) { shapePath(t, s.x, s.y, z * 1.55); ctx.lineWidth = z * .12; ctx.strokeStyle = "rgba(230,154,11,.95)"; ctx.stroke(); }
    if (n.cap === s.id) { const sz = big ? Math.max(z * .8, footR0(s) * .55) : z * .8; starPath(s.x, s.y, sz * .62); /* the capital's star sits at its heart */ ctx.fillStyle = "#ffc93c"; ctx.fill(); ctx.lineWidth = sz * .1; ctx.strokeStyle = "#7a4b00"; ctx.stroke(); }
    if ((s.h || .05) * k > (t >= 1 ? 45 : 80)) {
      const txt = `${s.name} · ${fmt(s.pop)}`, w = txt.length * 6.2, lx = sx - w / 2, ly = sy + px * 1.3 + 2;
      if (labels.some(b => lx < b[2] && lx + w > b[0] && ly < b[3] && ly + 13 > b[1])) continue;
      labels.push([lx, ly, lx + w, ly + 13]);
      const fs = 11 / k, ty = s.y + (big ? footR0(s) * 1.6 : z * 1.3) + fs * .7;
      screenText(txt, s.x, ty, k, "800 11px Nunito, system-ui, sans-serif", 3.3, "rgba(255,255,255,.9)", "#1d2a4d");
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
function startPlace(x) { placeMode = { from: x.id }; closePanel(); dirty = true; centerOn(x.x, x.y);
  let b = document.getElementById("placeBar"); if (!b) { b = document.createElement("div"); b.id = "placeBar"; document.body.appendChild(b); }
  b.innerHTML = `<span>🛖 Tap where families from <b>${esc(x.name)}</b> should found a village (inside the circle)</span><button class="btn small ghost" id="placeX">Cancel</button>`; b.hidden = false;
  document.getElementById("placeX").onclick = () => endPlace(); }
function endPlace() { placeMode = null; const b = document.getElementById("placeBar"); if (b) b.hidden = true; dirty = true; }
function tapMap(e) {
  const rect = cv.getBoundingClientRect(); const mx = (e.clientX - rect.left - view.x) / view.k, my = (e.clientY - rect.top - view.y) / view.k;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  let hit = -1; for (const s of W.regions) if (ctx.isPointInPath(s.path, mx, my, "evenodd")) { hit = s.i; break; }
  ctx.restore();
  if (G.setup) { if (hit >= 0) setupPick(hit); return; }
  if (placeMode) { const n = P(), d = setById(placeMode.from); if (!d) { endPlace(); return; } const r = foundAt(n, d, mx, my);
    if (r.ok) { toast(`${r.s.name} is founded`); endPlace(); hud(); updateContacts && updateContacts(); } else toast(r.why); dirty = true; return; }
  sel = hit; dirty = true;
  if (hit >= 0) openRegion(hit); else closeSheet();
}
$("zin").onclick = () => zoomBy(1.6); $("zout").onclick = () => zoomBy(1 / 1.6);
$("zhome").onclick = () => { if (G && P().alive) { const c = capSet(P()); if (c) centerOn(c.x, c.y, Math.max(view.k, Math.min(cw, ch) / 3)); } };
function zoomBy(f) { const cx = cw / 2, cy = ch / 2, mx = (cx - view.x) / view.k, my = (cy - view.y) / view.k; view.k = clamp(view.k * f, minK(), MAXK); view.x = cx - mx * view.k; view.y = cy - my * view.k; clampView(); dirty = true; }

// ================= UI =================
const sheet = $("sheet"), panel = $("panel"), modal = $("modal");
const SEASONS = ["Winter", "Spring", "Summer", "Autumn"];
const dateTxt = () => { const q = Math.floor((G.month || 0) / 3); return `${G && G.nations && G.nations[G.player] && tribal(G.nations[G.player]) ? SEASONS[q] : "Q" + (q + 1)} ${yearTxt(G.year)}`; };
function hud() {
  const n = P(), E = econM(n);
  $("hName").textContent = nm(n);
  $("hFlag").style.background = n.color;
  $("hYear").textContent = `${dateTxt()} · ${ERAS[n.era]}`;
  const sets = setsOf(n), full = sets.filter(s => s.crowd).length;
  $("cPop").innerHTML = `<span class="ci">👥</span><b>${fmtP(E.pop)}${tribal(n) ? " <small>families</small>" : ""}</b><i>${full ? `${full} overcrowded` : `${sets.length} settlement${sets.length > 1 ? "s" : ""}`}</i>`;
  $("cPop").classList.toggle("warnchip", full > 0);
  $("cGold").className = "chip" + (n.gold < 0 ? " bad" : "");
  $("cGold").innerHTML = `<span class="ci">🪙</span><b>${n.gold < 0 ? "−" + fmt(-n.gold) : fmt(n.gold)}</b><i class="${E.goldNet < 0 ? "neg" : ""}">${sgn(E.goldNet)}</i>`;
  $("cMat").innerHTML = `<span class="ci">🪵</span><b>${fmt(n.mat)}</b><i>${sgn(E.mat)}</i>`;
  { const open = resOpen(n), rt = document.querySelector('.tab[data-p="research"]'), dt = document.querySelector('.tab[data-p="develop"]');
    if (rt) rt.innerHTML = open ? "<span>🔬</span>Research" : "<span>🔥</span>Elders";
    if (dt) { dt.hidden = false; dt.innerHTML = !open && tribal(n) ? `<span>🛠️</span><em style="font-style:normal;font-size:6.2px;letter-spacing:-.05em">Production</em>` : "<span>🏗️</span>Develop"; const tabs = dt.parentElement; tabs.style.gridTemplateColumns = `repeat(${[...tabs.children].filter(x => !x.hidden).length}, 1fr)`; }
    if (!open) { const x = curTalk(n); $("cSci").innerHTML = `<span class="ci">🔥</span><b>${x ? Math.min(99, Math.floor(n.sciPts / talkCost(x) * 100)) + "%" : "—"}</b><i>${x ? esc(x.name) : ""}</i>`; $("cSci").classList.remove("alert"); } }
  const t = resOpen(n) ? resItem(n, n.research) : null;
  if (resOpen(n)) $("cSci").innerHTML = t ? `<span class="ci">🔬</span><b>${Math.min(99, Math.floor(n.sciPts / t.cost * 100))}%</b><i>${esc(t.mastery || t.develop ? t.name + " " + (lv(n, t.f.k) + 1) : t.name)}</i>` : `<span class="ci">🔬</span><b>—</b><i>Pick research</i>`;
  if (resOpen(n)) $("cSci").classList.toggle("alert", !t && TECHS.some(x => !has(n, x.id) && x.era <= n.era));
  $("cStab").innerHTML = `<span class="ci">${n.stab >= 65 ? "😊" : n.stab >= 40 ? "😐" : "😠"}</span><b>${Math.round(n.stab)}</b><i>${n.stab >= 65 ? "Content" : n.stab >= 40 ? "Uneasy" : n.stab >= 20 ? "Restless" : "Chaos"}</i>`;
  $("cStab").className = "chip " + (n.stab >= 65 ? "good" : n.stab >= 40 ? "" : "bad");
  $("cFood").innerHTML = `<span class="ci">🌾</span><b>${sgn(E.surplus)}</b><i>${E.surplus >= 0 ? "Fed" : "Famine"}</i>`;
  $("cFood").className = "chip " + (E.surplus >= 0 ? "" : "bad");
  $("cArmy").innerHTML = `<span class="ci">⚔️</span><b>${n.army}${mercUnits(n) ? `+${mercUnits(n)}` : ""}</b><i>Power ${fmt(power(n))}</i>`;
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
    acts += `<button class="btn small ghost" data-act="renameCity" data-s="${s.id}">✍️ Rename</button>`;
    if (tribal(n)) acts += `<button class="btn small ghost" data-act="prodAt" data-s="${s.id}">🛠️ Build & borders</button>`;
    const biggest = setsOf(n).filter(x => x.r === s.r && x.t === 0).sort((a, b) => b.pop - a.pop)[0];
    if (s.t === 0 && biggest === s) { const c = townCheck(n, s);
      acts += `<button class="btn small" data-act="town" data-s="${s.id}" ${c.ok ? "" : "disabled"}>🏘️ Merge ${VILLAGES_FOR_TOWN} villages into a town · ${costTxt(townCost(n))}</button><span class="why">${c.ok ? `Merges ${esc(s.name)} with ${c.mates.map(m => esc(m.name)).join(", ")} (${fmtP(s.pop + c.mates.reduce((a, m) => a + m.pop, 0))} people)` : esc(c.why || "")}</span>`; }
    else if (s.t === 1 && has(n, "masonry")) { const c = cityCheck(n, s); // no cities before the Bronze Age
      acts += `<button class="btn small" data-act="city" data-s="${s.id}" ${c.ok ? "" : "disabled"}>🏙️ Upgrade to city · ${costTxt(cityCost(n))}</button>${c.ok || !c.why ? "" : `<span class="why">${esc(c.why)}</span>`}`; }
    if (s.t >= 1 && eco(n, "cityPolicy")) { const L = ensureLeader(s, n), pol = Object.entries(L.pol || {}).filter(([, v]) => v !== "none");
      if (L.loop && L.loopKnown) acts += `<span class="why bad">🕳️ ${esc(L.name)} is sneaking cheap ${esc(SECTORS[L.loop].name.toLowerCase())} past your tariff. The city's poor love it; your producers lose protection.</span><button class="btn small" data-act="crack" data-s="${s.id}">Crack down</button>`;
      acts += `<span class="why">👤 Leader ${esc(L.name)} · trade skill ${"★".repeat(L.trade)}${"☆".repeat(5 - L.trade)}${pol.length ? ` · ${pol.map(([k, v]) => `${CPOL[v].icon} ${CPOL[v].name} for ${SECTORS[k].name.toLowerCase()}`).join(", ")}` : " · hands off"}</span><button class="btn small ghost" data-act="newLead" data-s="${s.id}" ${(L.cool || 0) > G.tt ? "disabled" : ""}>Replace leader · 🪙${fmt(Math.round(30 * Math.pow(1.5, n.era)))}</button>`; }
    { const hb = hubsOf(n).bySet.get(s.id), runs = cityInds(n).bySet.get(s.id) || [];
      if (runs.length) acts += `<span class="why">🏭 Industries: ${runs.map(it => { const b = cityBrand(s, it.k), r = cityRank(s, it.k); return `${SECTORS[it.k].icon} ${SECTORS[it.k].name} (${Math.round(it.share * 100)}% of the nation's${b.fame >= 1 ? ` · fame ${Math.round(b.fame)} · ${repWord(b.rep).toLowerCase()}` : ""}${r <= 5 ? ` · #${r} in the world 🏆` : ""})`; }).join(", ")}${hb ? `. Its famous industry dominates the city: taxes +${Math.round((hb.tax - 1) * 100)}%, other output −${Math.round((1 - hb.other) * 100)}%, more unrest.` : ""}</span>`; }
    if (canEmph(n, s)) {
      const opts = CHAINS.filter(c => fieldOpen(n, FIELDS[c.f[0][0]]) || c.f.some(([k]) => lv(n, k)));
      acts += `<span class="why">${x2(s)}</span><label class="emph">${s.id === n.cap ? "⭐ Capital" : "🏙️ City"} emphasis <select data-s="${s.id}"><option value="">None</option>${opts.map(c => `<option value="${c.k}" ${s.focus === c.k ? "selected" : ""}>${c.icon} ${esc(c.name)}</option>`).join("")}</select></label><span class="why">${s.focus ? `${s.id === n.cap ? "+15%" : "+1.5%"} to ${esc(CHAINS.find(c => c.k === s.focus).name)} bonuses, faster research for it, and it can reach ${s.id === n.cap ? "3 ages" : "1 age"} ahead.` : `Pick a field for this ${s.id === n.cap ? "capital" : "city"} to specialize in.`}</span>`;
    }
  } else if (atWar(n.id, o.id) && !touchesSet(n, s)) {
    acts += `<span class="why">Not on the front line. Only settlements touching your borders can be attacked.</span>`;
  } else if (atWar(n.id, o.id)) {
    acts += forces(n) - n.used > 0 ? `<button class="btn small red" data-act="attackPick" data-s="${s.id}">⚔️ Attack ${esc(s.name)}</button>` : `<span class="why">Your regiments have all fought this turn.</span>`;
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
  sheet.innerHTML = AW(h); sheet.hidden = false; sheet.dataset.ri = ri; sheet.scrollTop = 0;
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
  if (a === "renameCity") { const x = setById(+b.dataset.s); showModal(`<h2>Rename ${esc(x.name)}</h2><label class="fld">New name<input id="nmCity" maxlength="18" value="${esc(x.name)}"></label><div class="row"><button class="btn ghost" data-m="no">Cancel</button><button class="btn" data-m="ok">Rename</button></div>`, r => { const v = (modal.querySelector("#nmCity").value || "").trim(); if (r === "ok" && v) { x.name = v.slice(0, 18); G.sv++; save(); dirty = true; openRegion(ri); toast(`Renamed to ${x.name}`); } }); return; }
  if (a === "build") { startBuild(n, ri, BK[b.dataset.k]); toast(`${BK[b.dataset.k].name} under construction`); }
  else if (a === "found") { const fc = foundCheck(n, ri); if (fc.ok) { const s = foundVillage(n, ri, fc.donor); G.news = []; toast(s ? `Founded ${s.name}` : "No free land there: it's all inside other peoples' borders"); updateContacts(); updateExplore(); G.news = []; } }
  else if (a === "town" || a === "city") { const s = setById(+b.dataset.s); const c = a === "town" ? townCheck(n, s) : cityCheck(n, s); if (c.ok) { upgrade(n, s); toast(`${s.name} is now a ${TIERS[s.t].name.toLowerCase()}!`); const msgs = G.news.filter(x => /territory|now the/.test(x.t)); G.news = []; if (msgs.length) setTimeout(() => showModal(`<div class="mi">🚩</div><h2>${esc(W.regions[ri].n)}</h2>${msgs.map(m => `<p>${esc(m.t)}</p>`).join("")}<div class="row"><button class="btn" data-m="ok">Hooray!</button></div>`), 50); } }
  else if (a === "attackPick") return attackDialog(setById(+b.dataset.s));
  else if (a === "diplo") return openNationDetail(+b.dataset.id);
  hud(); dirty = true; openRegion(ri); sheet.scrollTop = keep;
});
function attackDialog(s) {
  const n = P(), av = forces(n) - n.used;
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
  panel.innerHTML = AW({ nation: panelNation, people: panelPeople, history: panelHistory, develop: panelDevelop, research: panelResearch, army: panelMilitary, policy: panelPolicy, world: panelWorld, trade: panelTrade }[name]());
  budgetFill(panel.querySelector(".budget:not(.timeal)")); timeFill(panel.querySelector(".timeal"));
  panel.hidden = false; panel.scrollTop = 0;
}
function closePanel() { panel.hidden = true; curPanel = null; document.querySelectorAll(".tab").forEach(t => t.classList.remove("on")); }
function refresh() { hud(); dirty = true; if (curPanel) { const st = panel.scrollTop; openPanel(curPanel); panel.scrollTop = st; } }
const ph = (title, sub) => `<div class="p-head"><div><h2>${title}</h2>${sub ? `<div class="sub">${sub}</div>` : ""}</div><button class="x" data-act="pclose" aria-label="Close">✕</button></div>`;
const line = (label, v, cls = "") => `<div class="ln ${cls}"><span>${label}</span><b>${v}</b></div>`;

function budgetHTML(n) {
  const B0 = bud(n);
  let h = `<div class="budget"><div class="bsum" data-bx="sum"></div>`;
  for (const [k, b] of Object.entries(BUDGET)) { h += `<div class="bl"><label><span>${b.icon} ${b.name}</span><b data-bx="v-${k}"></b></label><input type="range" min="0" max="${k === "mil" ? 80 : 60}" step="1" value="${B0[k]}" data-bud="${k}" aria-label="${b.name} budget"><p class="bx" data-bx="${k}"></p><p class="rec" data-bx="rec-${k}"></p></div>`;
  }
  h += `<h4 class="wh">Welfare</h4><p class="small muted">Makes your people happier, healthier and harder to turn against you: raises public trust every turn, calms unrest and helps workers. It costs a share of gross income. The more educated your people become, the more welfare they demand; falling short drains trust unless propaganda talks them down.</p>`;
  for (const [k, w] of Object.entries(WELFARE)) { const mx = welfareMax(n, k);
    h += `<div class="bl"><label><span>${w.icon} ${w.name}</span><b data-bx="v-${k}"></b></label><div class="seg">${w.lv.map((l, i) => `<button class="${B0[k] === i ? "on" : ""}" data-wel="${k}" data-l="${i}" ${i > mx ? "disabled" : ""}>${l}${i > mx ? " 🔒" : ""}</button>`).join("")}</div><p class="bx" data-bx="${k}"></p><p class="rec" data-bx="rec-${k}"></p></div>`; }
  return h + `</div>`;
}
function budgetFill(root) {
  if (!root) return;
  const n = P(), E = econM(n), B0 = bud(n), set = (k, v) => { const el = root.querySelector(`[data-bx="${k}"]`); if (el) el.innerHTML = AW(v); };
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
    set(k, l ? `+${(.75 * l * TD * TPY).toFixed(2).replace(/\.?0+$/, "")} trust a year · commoners +${3 * l}${k === "health" ? ` · +${(.6 * l).toFixed(1)}% growth` : ` · nobles −${2 * l}`} · less unrest · +${2 * l}% materials and science.` : `Not funded.${gp > .05 ? ` <span class="bad">People want ${WELFARE[k].lv[Math.min(4, Math.round(welfareExpect(n, k)))]}: −${(1.5 * gp * TD * TPY).toFixed(2)} trust a year.</span>` : ""}`); }
  const tot = Object.keys(BUDGET).reduce((a, k) => a + B0[k], 0) + Math.round((WELFARE.inc.cost[B0.inc] + WELFARE.health.cost[B0.health]) * 100) + Object.keys(SECTORS).reduce((a, k) => a + (secUnlocked(n, k) ? secOf(n, k).inv : 0), 0);
  const td = trustFactors(n, E.raw).reduce((a, x) => a + x[1], 0) * TD * TPY;
  { const RB = recBudget(n, E); for (const k in RB) set("rec-" + k, `💡 <b>Suggested:</b> ${RB[k][0]}<br><small><b>Why:</b> ${RB[k][1]}</small>`); const rq = recQual(n, E); set("rec-qual", `💡 <b>Suggested:</b> ${rq[0]}<br><small><b>Why:</b> ${rq[1]}</small>`); }
  set("sum", `${line("Gross income", `${fmt(E.gross)} 🪙`)}${line("Budget", `${tot}% · ${fmt(E.spend)} 🪙`, tot > 100 ? "bad" : "")}${line("Fixed costs (buildings, academies, pay, imports)", `${fmt(E.fixed)} 🪙`)}${line("Trade sectors (Trade tab)", sgn(E.secNet - E.secInv), E.secNet - E.secInv < 0 ? "bad" : "")}${line("Net per quarter", sgn(E.goldNet), E.goldNet < 0 ? "bad total" : "good total")}${line("Public trust", `${Math.round(Math.max(0, n.trust == null ? 100 : n.trust))} (${td >= 0 ? "+" : ""}${td.toFixed(1)} a year)`, td < 0 ? "bad" : "")}`);
}
// the army tab splits whatever the yearly budget gives the military between quantity and quality
function armyBudgetHTML(n) {
  return `<div class="budget"><div class="bl"><label><span>⚖️ Quantity ↔ Quality</span><b data-bx="v-qual"></b></label><input type="range" min="0" max="90" step="5" value="${bud(n).qual}" data-bud="qual" aria-label="Quantity versus quality"><div class="qq"><small>More regiments</small><small>Better regiments</small></div><p class="bx" data-bx="qual"></p><p class="bx" data-bx="mil"></p><p class="rec" data-bx="rec-qual"></p></div></div>`;
}
function timeHTML(n) {
  const t = timeOf(n);
  const one = ([k, x]) => `<div class="bl"><label><span>${roleIcon(n, k)} ${roleName(n, k)}</span><b data-tv="${k}"></b></label><input type="range" min="0" max="100" step="5" value="${t[k]}" data-time="${k}" aria-label="${x.name}"><p class="bx" data-tx="${k}"></p></div>`, open = Object.entries(TIME).filter(([k]) => roleOpen(n, k)), grp = g => open.filter(([, x]) => x.grp === g);
  return `<div class="budget timeal"><div class="tgrp"><h5>🍖 Food</h5>${grp("food").map(one).join("")}</div><div class="tgrp"><h5>🧺 Resource gatherers</h5>${grp("gather").map(one).join("")}</div>${open.filter(([, x]) => !x.grp).map(one).join("")}<p class="small" data-tidle></p><p class="rec" data-trec></p></div>`;
}
function timeFill(root) {
  if (!root || !G) return; const n = P(), E = econM(n), sh = k => timeShare(n, k), set = (sel, v) => { const el = root.querySelector(sel); if (el) el.innerHTML = AW(v); };
  const pop = popOf(n);
  for (const k in TIME) set(`[data-tv="${k}"]`, `${Math.round(sh(k) * 100)}% · ${fmtP(pop * sh(k))} families`);
  { const idle = timeIdle(n); set("[data-tidle]", idle ? `<b class="bad">${idle}% of your people (${fmtP(pop * idle / 100)}) have no role and do nothing.</b> Give them one.` : `<span class="muted">Everyone has a role: 100% assigned.</span>`); }
  const pc = v => `${v >= 0 ? "+" : "−"}${Math.round(Math.abs(v) * 100)}%`, wb = Math.round(maxArmy(n) * sh("warrior") / .2);
  set('[data-tx="warrior"]', `Fields <b>${wb}</b> war band${wb === 1 ? "" : "s"}. ${TIME.warrior.d}`);
  set('[data-tx="food"]', `${TIME.food.d}${roomOf(n) < sh("food") * 2.2 ? ' <b class="bad">Too many hunters for your land: the game is running out.</b>' : ""}`);
  set('[data-tx="farm"]', `${n.retired && n.retired.food ? "Your fields and herds feed everyone. Each farming family needs a farm plot." : TIME.farm.d}${structCov(n, "field") < 1 && sh("farm") > 0 ? ` <b class="bad">Only ${Math.round(structCov(n, "field") * 100)}% have a plot; the rest scratch out small gardens.</b>` : ""}`);
  { const wc = waterOf(n), need = carriersNeeded(n); set('[data-tx="water"]', `${TIME.water.d} ${wc < .98 ? `<b class="bad">Only ${Math.round(wc * 100)}% of families have enough water: about ${need}% carriers needed.</b>` : need ? `Everyone has water. About ${need}% carriers are needed here.` : "Your land gives everyone enough water: no carriers needed right now."}`); }
  { let up = 0, bh = 0; for (const x of setsOf(n)) { up += upkeepAt(n, x); bh += builderHoursAt(n, x); } const us = bh > 0 ? Math.round(Math.min(1, up / bh) * 100) : 100;
    set('[data-tx="build"]', `${TIME.build.d} <b class="${us >= 100 ? "bad" : us > 70 ? "warn" : ""}">Upkeep takes ${us}% of their time.</b>`); }
  set('[data-tx="wood"]', `${pc(9.8 * sh("wood") - .98)} materials. ${TIME.wood.d}`);
  set('[data-tx="forage"]', TIME.forage.d);
  { const tc = toolCov(n), nd = pct5(toolNeed(n)); set('[data-tx="tools"]', `${TIME.tools.d} ${tc < .95 ? `<b class="bad">Not enough tools: everyone works ${Math.round((1 - toolF(n)) * 100)}% worse. About ${nd}% needed.</b>` : `Tools for everyone. About ${nd}% needed.`}`); }
  if (roleOpen(n, "healer")) { const hc = healCov(n), nd = pct5(healNeed(n)); set('[data-tx="healer"]', `${TIME.healer.d} ${hc < .95 ? `${hc < .3 ? '<b class="bad">' : "<b>"}Healers reach ${Math.round(hc * 100)}% of your people. About ${nd}% needed.</b>` : `Healers reach everyone. About ${nd}% needed.`}`); }
  set('[data-tx="fish"]', `${TIME.fish.d} ${Math.round(fishable(n) * 100)}% of your families live by the water.`);
  { const need = Math.ceil(firewoodNeed(n) * 100 / 5) * 5, fc = fireCov(n); set('[data-tx="firewood"]', `${TIME.firewood.d} ${fc < .98 ? `<b class="bad">Not enough wood: about ${need}% are needed.</b>` : `About ${need}% are needed.`}`); }
  set('[data-tx="elder"]', `${pc(1.5 * sh("elder") - .15)} research. ${TIME.elder.d}`);
  set('[data-tx="scout"]', `${Math.round(Math.min(6, popOf(n) * sh("scout") * .5) * 10) / 10} scouting trips a season. ${TIME.scout.d}`);
  const war = G.nations.some(o => atWar(n.id, o.id)), hungry = E.surplus < 0;
  const fk = roleOpen(n, "food") ? "food" : "farm", wn = roleOpen(n, "water") ? carriersNeeded(n) : 0, fwn = Math.ceil(firewoodNeed(n) * 100 / 5) * 5, cr = crewFor(n), fpct = Math.max(10, 100 - 15 - (fk === "food" ? 20 : 0) - wn - fwn - cr.build - cr.wood - pct5(toolNeed(n)) - (roleOpen(n, "healer") ? pct5(healNeed(n)) : 0) - 10 - 5);
  set("[data-trec]", `💡 <b>Suggested:</b> ${hungry ? `More ${roleName(n, fk).toLowerCase()} (55%+).` : war ? "More warriors (25–35%), but only as many as you need." : `About 15% warriors, ${fpct}% ${roleName(n, fk).toLowerCase()}${fk === "food" ? ", 20% foragers" : ""}${wn ? `, ${wn}% water carriers` : ""}${fwn ? `, ${fwn}% firewood gatherers` : ""}, ${cr.wood}% wood & stone gatherers, ${cr.build}% builders, ${pct5(toolNeed(n))}% toolmakers${roleOpen(n, "healer") ? `, ${pct5(healNeed(n))}% healers` : ""}, 10% elders, 5% scouts. Builders, gatherers and toolmakers are needed more as your tribe grows.`}<br><small><b>Why:</b> ${hungry ? "Your people are going hungry. Food comes first." : war ? "You're at war and need fighters, but every warrior killed is one of your own people, and warriors gather no food." : "Enough food to grow, enough warriors to guard the tribe, hands to build, keepers of lore, and scouts to find who's out there. Too many warriors starves the tribe and costs lives in every battle."}</small>`);
}
function openTime(yearly) {
  const n = P();
  showModal(`<div class="mi">⏳</div><h2>${yearly ? `The tribe's year: ${yearTxt(G.year)}` : "Who does what"}</h2><p class="small">Decide what your people do this year.</p>${timeHTML(n)}<label class="askrow"><input type="checkbox" id="budAsk" ${n.budNoAsk ? "" : "checked"}> Ask me every year</label><div class="row"><button class="btn" data-m="ok">${yearly ? "So be it" : "Done"}</button></div>`, () => { save(); hud(); if (curPanel) refresh(); if (yearly) finishFlow(); });
  timeFill(modal.querySelector(".timeal"));
}
function applyNames(root) {
  const n = P(), v = id => { const el = root.querySelector("#" + id); return el ? el.value.trim() : null; };
  const nn = v("nmNation"); if (nn) n.name = nn.slice(0, 18);
  const pp = v("nmPeople"); if (pp != null) n.people = pp ? pp.slice(0, 22) : null;
  const lg = v("nmLang"); if (lg && LANGS[lg]) n.lang = lg;
  const plg = v("nmPLang"); if (plg && LANGS[plg]) n.plang = plg;
  const chk = id => { const el = root.querySelector("#" + id); return el && el.checked; };
  if (chk("nmRenameAll")) { const used = new Set(); for (const x of setsOf(n)) { let nmx; for (let t = 0; t < 8; t++) { nmx = placeName(n.lang); if (!used.has(nmx)) break; } used.add(nmx); x.name = nmx; } G.sv++; }
  if (chk("nmRenamePeople")) { for (const g of n.generals || []) g.name = personName(n.plang || n.lang); if (n.commander) n.commander.name = personName(n.plang || n.lang); for (const x of setsOf(n)) if (x.lead) x.lead.name = personName(n.plang || n.lang); }
  const cl = v("nmCities"); if (cl != null) n.cityNames = cl.split(/[,\n]/).map(x => x.trim()).filter(Boolean).slice(0, 60);
  const pl = v("nmPersons"); if (pl != null) n.personNames = pl.split(/[,\n]/).map(x => x.trim()).filter(Boolean).slice(0, 60);
  save(); hud(); dirty = true; if (curPanel) refresh();
}
function openNaming() {
  const n = P();
  showModal(`<div class="mi">✍️</div><h2>Names</h2>
    <label class="fld">${tribal(n) || rankOf(n) === 0 ? "Tribe" : "Nation"} name<input id="nmNation" maxlength="18" value="${esc(n.name)}"></label>
    <label class="fld">Your people <small class="muted">what they call themselves</small><input id="nmPeople" maxlength="22" value="${esc(demonym(n))}"></label>
    <label class="fld">City names in<select id="nmLang">${Object.entries(LANG_LABEL).map(([k, l]) => `<option value="${k}" ${langOf(n) === k ? "selected" : ""}>${l}</option>`).join("")}</select></label>
    <label class="askrow"><input type="checkbox" id="nmRenameAll"> Rename all my existing towns and villages in this style</label>
    <label class="fld">People's names in<select id="nmPLang">${Object.entries(LANG_LABEL).map(([k, l]) => `<option value="${k}" ${(n.plang || langOf(n)) === k ? "selected" : ""}>${l}</option>`).join("")}</select></label>
    <label class="askrow"><input type="checkbox" id="nmRenamePeople"> Rename my current leaders and generals too</label>
    <label class="fld">Your own city names <small class="muted">used first for new settlements, separated by commas</small><textarea id="nmCities" rows="2">${esc((n.cityNames || []).join(", "))}</textarea></label>
    <label class="fld">Your own personal names <small class="muted">for leaders and generals</small><textarea id="nmPersons" rows="2">${esc((n.personNames || []).join(", "))}</textarea></label>
    <div class="row"><button class="btn ghost" data-m="no">Cancel</button><button class="btn" data-m="ok">Save</button></div>`, a => { if (a === "ok") applyNames(modal); });
}
function openBudget(yearly) {
  const n = P();
  showModal(`<div class="mi">📒</div><h2>${yearly ? `Budget for ${yearTxt(G.year)}` : "Budget"}</h2><p class="small">Decide where ${yearly ? "this year's" : "your"} money goes.${yearly ? " You can also change it any time from the Nation or Army tab." : ""}</p>${budgetHTML(n)}<label class="askrow"><input type="checkbox" id="budAsk" ${n.budNoAsk ? "" : "checked"}> Ask me every year</label><div class="row"><button class="btn" data-m="ok">${yearly ? "Approve budget" : "Done"}</button></div>`, () => { save(); hud(); if (curPanel) refresh(); if (yearly) finishFlow(); });
  budgetFill(modal.querySelector(".budget"));
}
function secInput(e) { const t = e.target; if (!t.dataset || t.dataset.sinv == null || !G) return; const n = P(), k = t.dataset.sinv; secOf(n, k).inv = +t.value; const lab = panel.querySelector(`[data-sv="${k}"]`); if (lab) lab.textContent = `${t.value}% · ${fmt(econM(n).raw.sectors[k].ig * TD)} 🪙`; hud(); }
panel.addEventListener("input", secInput);
panel.addEventListener("toggle", e => { const d = e.target; if (d && d.dataset && d.dataset.pk) { if (d.open) prodOpen.add(d.dataset.pk); else prodOpen.delete(d.dataset.pk); } }, true);
panel.addEventListener("change", e => { if (e.target.id === "prodSet") { prodSet = +e.target.value; refresh(); } });
[panel, modal].forEach(el => el.addEventListener("input", e => { if (e.target.dataset && e.target.dataset.time && G) { const t = timeOf(P()), k = e.target.dataset.time; let others = 0; for (const x in TIME) if (x !== k) others += t[x] || 0;
    const v = Math.min(+e.target.value, 100 - others); if (+e.target.value !== v) e.target.value = v; t[k] = v; /* only what's left unassigned can be given */ timeFill(e.target.closest(".timeal")); hud(); } }));
[panel, modal].forEach(el => el.addEventListener("change", e => { if (e.target.dataset && e.target.dataset.time) save(); }));
panel.addEventListener("change", e => { if (e.target.dataset && e.target.dataset.sinv != null) { save(); refresh(); } });
function budgetInput(e) { const t = e.target; if (!t.dataset || t.dataset.bud == null || !G) return; bud(P())[t.dataset.bud] = +t.value; budgetFill(t.closest(".budget")); hud(); }
function welfareClick(e) { const b = e.target.closest("[data-wel]"); if (!b || b.disabled || !G) return; e.stopPropagation(); bud(P())[b.dataset.wel] = +b.dataset.l; const box = b.closest(".budget"); box.querySelectorAll(`[data-wel="${b.dataset.wel}"]`).forEach(x => x.classList.toggle("on", x === b)); budgetFill(box); hud(); }
let histTab = "all";
const HIST_CAT = e => ["⚔️", "🕊️", "🏳️", "🏴", "💥"].includes(e.i) ? "war" : ["💡", "🔥"].includes(e.i) ? "disc" : ["🕯️", ...Object.values(DOMAINS).map(d => d.icon)].includes(e.i) && !/elders settled/.test(e.t) ? "people" : "mile";
const HIST_TABS = { all: "📖 All", people: "🌟 Great people", war: "⚔️ Wars & battles", disc: "💡 Discoveries", mile: "🏛️ Milestones" };
let histScope = "ours", wTab = "all";
const WHIST_TABS = { all: "📖 All", people: "🌟 Great people", war: "⚔️ Conquests", first: "🥇 Firsts", fall: "💀 Rise & fall" };
function panelWorldHistory() { const n = P();
  let h = ph("History", "The known world");
  h += `<div class="seg">${[["ours", `The ${esc(demonym(n))}`], ["world", "The world"]].map(([k, v]) => `<button class="${histScope === k ? "on" : ""}" data-act="hscope" data-k="${k}">${v}</button>`).join("")}</div>`;
  h += `<div class="ptabs2">${Object.entries(WHIST_TABS).map(([k, v]) => `<button class="${k === wTab ? "on" : ""}" data-act="wtab" data-k="${k}">${v}</button>`).join("")}</div>`;
  const vis = e => !e.w || !e.w.length || e.w.some(known);
  if (wTab === "people") { const P0 = (G.wpeople || []).filter(p => known(p.n)).slice().reverse();
    if (!P0.length) return h + `<p class="note">No great people known yet. You'll hear of them as you meet other peoples.</p>`;
    return h + `<div class="card">${P0.map(p => { const dead = p.kind === "mind" ? G.year >= p.until : G.year - p.until > 25, o = G.nations[p.n];
      return `<div class="ln"><span>${p.kind === "conq" ? "👑" : DOMAINS[p.d].icon} <b>${esc(p.name)}</b><br><small class="muted">${esc(p.title)} of the ${esc(o ? nm(o) : p.from)}${p.kind === "conq" ? ` · took ${p.count} settlements` : ""}${p.n === G.player ? " · yours" : ""}</small></span><b>${dead ? `<small>${yearTxt(p.born)}${p.until !== p.born ? `–${yearTxt(p.until)}` : ""}</small>` : '<span class="good">Living</span>'}</b></div>`; }).join("")}</div>`; }
  const ev = (G.whist || []).filter(e => vis(e) && (wTab === "all" || e.c === wTab)).slice().reverse();
  if (!ev.length) return h + `<p class="note">Nothing known yet. As you meet other peoples, you'll hear of their great people, conquests and turning points.</p>`;
  return h + histList(ev); }
function panelHistory() {
  if (histScope === "world") return panelWorldHistory();
  const H = (G.hist || []).slice().reverse(), n = P(), fam = n.thinkers || [];
  let h = ph("History", `The story of the ${esc(demonym(n))}`);
  h += `<div class="seg">${[["ours", `The ${esc(demonym(n))}`], ["world", "The world"]].map(([k, v]) => `<button class="${histScope === k ? "on" : ""}" data-act="hscope" data-k="${k}">${v}</button>`).join("")}</div>`;
  h += `<div class="ptabs2">${Object.entries(HIST_TABS).map(([k, v]) => `<button class="${k === histTab ? "on" : ""}" data-act="htab" data-k="${k}">${v}</button>`).join("")}</div>`;
  if (histTab === "people") {
    if (!fam.length) return h + `<p class="note">No great minds yet. Big villages, past about 50 families, sometimes raise one.</p>`;
    h += `<div class="card">${fam.slice().reverse().map(t => `<div class="ln"><span>${DOMAINS[t.d].icon} <b>${esc(t.name)}</b><br><small class="muted">${esc(t.title)} of ${esc(t.from)} · +5% ${DOMAINS[t.d].out}</small></span><b>${t.dead ? `<small>${yearTxt(t.born)}–${yearTxt(t.until)}</small>` : '<span class="good">Living</span>'}</b></div>`).join("")}</div>`;
    const ev = H.filter(e => HIST_CAT(e) === "people" || /, the .* of /.test(e.t)); if (!ev.length) return h;
    histTab = "people"; return h + histList(ev); }
  const ev = histTab === "all" ? H : H.filter(e => HIST_CAT(e) === histTab);
  if (!ev.length) return h + `<p class="note">${histTab === "all" ? "Nothing memorable has happened yet. Battles, great people, new ages and turning points will be written here." : "Nothing here yet."}</p>`;
  return h + histList(ev);
}
function histList(ev) { let h = `<div class="card hist">`, last = null;
  for (const e of ev) { const yl = yearTxt(e.y); if (yl !== last) { h += `<h5 class="psec">${yl}</h5>`; last = yl; } h += `<div class="hrow"><span>${e.i}</span><span>${esc(e.t)}</span></div>`; }
  return h + `</div>`; }
function panelPeople() {
  const n = P(), pop = popOf(n), E0 = ethOf(n), T = n.trait || {}, tg = n.traitT || {}, tr = tribal(n);
  const lab = LANG_LABEL[langOf(n)] || capW(langOf(n)), main = Math.max(0, 1 - E0.reduce((a, g) => a + g.share, 0));
  let h = ph("Our people", `${fmtP(pop)} ${tr ? "families" : "people"} · ${esc(demonym(n))}`);
  if (tr) { const E1 = econM(n), am = amenOf(n), fed = E1.raw.surplus >= 0, pct = v => `${Math.round(v * 100)}%`, cls = v => v < .6 ? "bad" : v < .95 ? "warn" : "good";
    const hc = Math.min(1, structCov(n, "hut") + .5 * homeShares(n).shk);
    h += `<div class="card"><h4>🏕️ Needs</h4><p class="small muted">Every family needs a home, water, food, and the comforts that make life bearable.</p>
      ${line("🛖 Homes", pct(hc), cls(hc))}${line("💧 Water", pct(waterOf(n)), cls(waterOf(n)))}${line("🍖 Food", fed ? "Fed" : "Hungry", fed ? "good" : "bad")}
      ${Object.entries(AMEN).map(([k, a]) => k === "warmth" && coldNation(n) < .15 ? line(`${a.icon} ${a.name}`, `<span class="muted">Not needed: it's never cold here</span>`) : line(`${a.icon} ${a.name}`, pct(am[k]), cls(am[k]))).join("")}
      ${waterOf(n) < .98 ? `<p class="small muted">💧 Rivers, springs and rain give each place some water for free, more in wet lands and on great rivers, less in deserts and in summer. Beyond that, water carriers must fetch it (Who does what), or you can store and dig for it (Production › Water). Without it, families leave and bad water spreads sickness.</p>` : ""}
      ${Object.entries(AMEN).filter(([k]) => am[k] < .95 && !(k === "warmth" && coldNation(n) < .15)).map(([k, a]) => `<p class="small muted">${a.icon} ${a.d}</p>`).join("")}
      <p class="small muted">Build amenities for each settlement in Production › Amenities.</p></div>`; }
  if (tr) { const hm = homeShares(n), huts = setsOf(n).reduce((a, x) => a + Math.min(x.pop, builtAt(x, "hut")), 0);
    h += `<div class="card"><h4>🛖 Homes</h4>${line("In huts", fmtP(huts))}${line("In shacks they built themselves", fmtP(hm.nShk), hm.nShk >= .5 ? "bad" : "")}${line("No roof at all", fmtP(hm.nNone), hm.nNone >= .5 ? "bad" : "")}
      <p class="small muted">Families without a hut put up shacks of their own. A shack gets a family through the winter, barely: some still die in the cold, and they resent you for it. Hardship also makes a people hardy.</p></div>`; }
  const cols = ["#7d5bd6", "#e9524a", "#2fae6b", "#f2b134", "#1fb5b0", "#e45aa0", "#8a5a33", "#3c7dd9"];
  const groups = [{ name: demonym(n), share: main, own: true }, ...E0.slice().sort((a, b) => b.share - a.share)];
  h += `<div class="card"><h4>🧬 Ethnicity</h4><div class="ethbar">${groups.map((g, i) => `<i style="width:${(g.share * 100).toFixed(2)}%;background:${cols[i % cols.length]}"></i>`).join("")}</div>`;
  groups.forEach((g, i) => {
    const pc = g.share * 100, pcs = pc >= 10 ? Math.round(pc) : pc.toFixed(1);
    h += `<div class="ethrow"><span class="dot" style="background:${cols[i % cols.length]}"></span><b>${esc(g.name)}</b><span class="muted small">${g.own ? `your people · ${esc(lab)}` : esc(LANG_LABEL[g.lang] || capW(g.lang))}</span><b>${pcs}%</b></div><div class="small muted" style="padding-left:16px">${(g.own ? relOf(n) : RELIGIONS[g.relig] || RELIGIONS.animism).icon} ${esc((g.own ? relOf(n) : RELIGIONS[g.relig] || RELIGIONS.animism).name)}</div>`;
    if (!g.own) { const c = compatOf(n, g);
      h += `<div class="ethm"><div class="bar-row"><span class="small">Culture fit</span><span class="bar thin"><i style="width:${c}%;background:${c >= 60 ? "var(--good)" : c >= 40 ? "#f2b134" : "var(--bad)"}"></i></span><span class="small">${c >= 60 ? "Close" : c >= 40 ? "Distant" : "Foreign"}</span></div>
        <div class="bar-row"><span class="small">Assimilated</span><span class="bar thin"><i style="width:${Math.round(g.assim)}%;background:#7d5bd6"></i></span><span class="small">${Math.round(g.assim)}%</span></div>
        <div class="ln small"><span class="muted">${yrsAmong(g) < 1 ? "Newly arrived" : `Among you ${Math.round(yrsAmong(g))} years`}${g.via && g.via.length ? ` · ${esc(LANG_LABEL[g.lang] || capW(g.lang))} roots, by way of the ${g.via.map(esc).join(", then the ")}` : ""}</span><button class="btn small ghost" data-act="expel" data-k="${E0.indexOf(g)}">Expel</button></div>
        ${(() => { const at = setsOf(n).filter(x => x.eth && x.eth[g.k] * x.pop >= .5).map(x => ({ x, f: x.eth[g.k] * x.pop, r: x.rcv && x.rcv[g.k] != null ? x.rcv[g.k] : receptionAt(n, x, g) })).sort((a, b) => b.f - a.f);
          return at.slice(0, 5).map(a => { const [w, c] = RCV(a.r), run = dominantAt(a.x) === g.k; return `<div class="ln small"><span>📍 ${esc(a.x.name)} · ${fmtP(a.f)} famil${Math.round(a.f) === 1 ? "y" : "ies"}</span><b class="${run ? "good" : c}">${run ? "👑 They run it" : w}</b></div>`; }).join("") + (at.length > 5 ? `<p class="small muted">…and ${at.length - 5} more places</p>` : ""); })()}</div>`; } });
  { const ruled = setsOf(n).filter(x => dominantAt(x));
    if (ruled.length) { h += `<h4 style="margin-top:12px">👑 Places run by another people</h4><p class="small muted">Where another people are most of a place, they set its ways and its welcome, and its leaders come from among them.</p>`;
      for (const x of ruled.slice(0, 6)) { const g = E0.find(q => q.k === dominantAt(x)); if (!g) continue; const [w, c] = x.rcvMain != null ? RCV(x.rcvMain) : ["", ""];
        h += `<div class="ln small"><span>📍 ${esc(x.name)} · ${esc(g.name)} ${Math.round(x.eth[g.k] * 100)}%</span><b class="${c}">${w ? `Your people: ${w}` : ""}</b></div>`; } } }
  if (!E0.length) h += `<p class="small muted">Only the ${esc(demonym(n))} live in your lands.</p>`;
  else { const cur = n.laws.assim || "free";
    h += `<p class="small muted">Each place decides for itself how it receives newcomers: the locals, their mood and their leader. Where they're welcome, they stay and others come to join them; where they're not, they move on or leave your lands.</p>
      <h4 style="margin-top:12px">📜 National policy</h4><p class="small muted">Your law decides whether they actually become one people with you: whether they must speak your tongue and keep your customs. Each generation of their children lets go of more of the old ways. How fast depends on this law and on how close their ways are to yours. Once fully blended in, they become ${esc(demonym(n))}.</p><div class="opts">`;
    for (const [k, a] of Object.entries(ASSIM)) h += `<button class="opt ${cur === k ? "on" : ""}" data-act="assim" data-k="${k}"><span class="oi">${a.icon}</span><span class="ot"><b>${a.name}${cur === k ? " ✓" : ""}</b><small>${a.d}</small></span></button>`;
    h += `</div>`; }
  h += `</div>`;
  { const op = immOpinion(n);
    if (E0.length || op.inflow > .002) { const fe = Math.round(Math.min(25, 60 * op.fear + 150 * op.inflow)), pro = op.labor > .01;
      h += `<div class="card"><h4>🗣️ For and against newcomers</h4>
        ${line("👎 Commoners: fear of being outnumbered", fe ? `−${fe} mood` : "Calm", fe ? "bad" : "")}
        ${facActive(n, "merchants") && pro ? line("👍 Merchants: cheap labor", `+${Math.round(Math.min(15, 60 * op.labor))} mood`, "good") : ""}
        ${facActive(n, "workers") && pro ? line("👎 Workers: wages undercut", `−${Math.round(Math.min(15, 50 * op.labor))} mood`, "bad") : ""}
        ${eco(n, "wages") && op.wageCut > .005 ? line("Wages", `${Math.round(op.wageCut * 100)}% lower`) : ""}
        <p class="small muted">People who see many newcomers arrive fear for their own ways, most of all where newcomers are already many. Others gain from newcomers' work.</p></div>`; } }
  h += `<div class="card"><h4>🎭 Character</h4><p class="small muted">Your people's character shifts slowly, over generations, with how they live and how they feel.</p>`;
  for (const [k, t] of Object.entries(TRAITS)) { const v = T[k] != null ? T[k] : 50, d = (tg[k] != null ? clamp(tg[k], 0, 100) : v) - v;
    const word = v < 20 ? `Very ${t.lo.toLowerCase()}` : v < 40 ? t.lo : v <= 60 ? "Middling" : v <= 80 ? t.hi : `Very ${t.hi.toLowerCase()}`;
    h += `<div class="trait"><div class="ln"><span>${t.icon} ${t.name}</span><b>${word} <span class="muted small">${d > 4 ? "▲" : d < -4 ? "▼" : ""}</span></b></div>
      <div class="spec"><b style="left:${v.toFixed(1)}%"></b></div><div class="specl"><span>${t.lo}</span><span>${t.hi}</span></div><p class="small muted">${t.d}</p></div>`; }
  h += `</div>`;
  return h;
}
function panelNation() {
  const n = P(), E = econM(n), sets = setsOf(n), uc = unitCost(n), ma = maxArmy(n);
  const vc = sets.filter(s => s.t === 0).length, tc = sets.filter(s => s.t === 1).length, cc = sets.filter(s => s.t === 2).length;
  const terr = territories(n), rk = rankOf(n), full = sets.filter(s => s.crowd).length;
  let h = ph(esc(nm(n)), `${GOVS[n.gov].name} · ${fmtP(E.pop)} ${tribal(n) ? "families of " : ""}${esc(demonym(n))}`);
  h += `<div class="row wrap"><button class="btn small ghost" data-act="naming">✍️ Names: ${esc(n.name)}, the ${esc(demonym(n))}</button></div>`;
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
  if (tribal(n)) { const F = fertility(n, E.raw), room = roomOf(n);
    h += `<div class="card"><h4>👶 Fertility <span class="pill ${F.mult < .9 ? "bad" : F.mult > 1.05 ? "good" : ""}">${Math.round(F.mult * 100)}%</span></h4>${F.f.map(([k, v]) => line(k, `${v >= 1 ? "+" : "−"}${Math.round(Math.abs(v - 1) * 100)}%`, v < .97 ? "bad" : v > 1.02 ? "good" : "")).join("")}
      ${line("Land per family", room < 1 ? `<span class="bad">Crowded (${Math.round(room * 100)}%)</span>` : `${Math.round(room * 100)}%`)}
      <p class="small muted">How many children your families raise. Food, a hut for every family, room to live and the people's mood all count. When your land gets crowded, fewer children are born and builders wait longer for trees to regrow; expanding your borders (Production) gives room and lifts spirits.</p></div>`; }
  if (tribal(n)) h += `<div class="card"><h4>👥 Who does what <span class="muted">your people's roles</span></h4>${timeHTML(n)}<label class="askrow"><input type="checkbox" id="budAsk" ${n.budNoAsk ? "" : "checked"}> Ask me every year</label></div>`;
  if (!tribal(n)) h += `<div class="card"><h4>📒 Budget <span class="muted">share of gross income</span></h4><p class="small muted">Set every year. Spending more than you earn puts you in debt.</p>${budgetHTML(n)}<label class="askrow"><input type="checkbox" id="budAsk" ${n.budNoAsk ? "" : "checked"}> Ask me to set it every year</label></div>`;
  h += `<div class="card"><h4>Treasury <span class="muted">per quarter</span></h4>
    ${line(`Taxes${E.spendM !== 1 ? ` <small class="muted">(spending ${E.spendM >= 1 ? "+" : "−"}${Math.round(Math.abs(E.spendM - 1) * 100)}%)</small>` : ""}`, sgn(E.tax))}${line("Trade (automatic)", sgn(E.routeGold))}${line("Luxury exports", sgn(E.luxGold))}${E.foodGold ? line("Surplus food sold", sgn(E.foodGold)) : ""}
    ${tribal(n) ? line("Elders' lore (research)", sgn(-E.resGold)) : line(`Military budget (${bud(n).mil}%)`, sgn(-E.milGold)) + line(`Research budget (${bud(n).res}%)`, sgn(-E.resGold))}${E.prodGold ? line(`Production (${bud(n).prod}%)`, sgn(-E.prodGold)) : ""}${E.travelGold ? line(`Travel (${bud(n).travel}%)`, sgn(-E.travelGold)) : ""}${E.subGold ? line(`Subsidies (${bud(n).sub}%)`, sgn(-E.subGold)) : ""}${E.incGold ? line(WELFARE.inc.lv[bud(n).inc], sgn(-E.incGold)) : ""}${E.healthGold ? line(WELFARE.health.lv[bud(n).health], sgn(-E.healthGold)) : ""}${line("Trade sectors (net)", sgn(E.secNet - E.secInv))}
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
    ${line("Regiments", `${n.army} / ${ma} max`)}${line("Strength per regiment", fmt(unitPower(n)))}${line("Total strength", fmt(power(n)))}${line("Ready to fight", Math.floor(forces(n) - (n.used || 0)))}
    ${line("Budget pays for", `${E.armyTarget} regiment${E.armyTarget === 1 ? "" : "s"}`)}
    <p class="muted small">Your army's size follows your military budget: each regiment costs ${fmt(unitUpkeep(n) * TD)} gold a quarter, and new ones need ${fmt(uc.m)} 🪵 to equip. Bigger populations and the Conscription law raise your manpower limit.</p></div>`;
  h += `<div class="card"><h4>Paths to victory</h4>
    ${line("🚀 Reach Mars (research Mars Colony)", has(n, "rocketry") ? (lv(n, "marsmission") >= 3 ? "Mars Mission ready" : "Develop the Space field") : ERAS[n.era])}
    ${line("🌍 Control 40% of the world", `${terr.length} / ${Math.ceil(NR * .4)} territories`)}
    ${line("⌛ Lead the world in 2100", `#${ranking().findIndex(x => x.id === n.id) + 1} by score`)}</div>`;
  h += `<div class="card"><h4>Your settlements</h4><div class="rlist">${sets.sort((a, b) => b.t - a.t || b.pop - a.pop).slice(0, 60).map(s => `<button class="rl" data-act="goto" data-sid="${s.id}"><span>${TIERS[s.t].icon} ${s.id === n.cap ? "⭐ " : ""}${esc(s.name)}</span><small>${esc(W.regions[s.r].n)} · ${fmtP(s.pop)}${s.crowd ? ' · <span class="bad">overcrowded</span>' : ""}${s.u > 50 ? ' · <span class="bad">unrest</span>' : ""}</small></button>`).join("")}</div></div>`;
  h += `<div class="card"><h4>Game</h4><div class="row wrap"><button class="btn small ghost" data-act="help">How to play</button><button class="btn small ghost" data-act="newgame">New game</button></div></div>`;
  return h;
}
let prodTab = "housing", prodSet = null; const prodOpen = new Set(); // what you've expanded in Production (everything starts collapsed)
/* who discovered it: one of your great minds if one fits, otherwise the people who would have */
const TECH_STORY = {
  bronze: ["the copper workers", "melted copper with a little tin and poured a metal harder than either: bronze."],
  writing: ["the temple record-keepers", "turned their tally marks into signs for words. What is said can now outlive the one who said it."],
  masonry: ["the wall builders", "learned to cut and fit stone so walls stand without mud or timber."],
  sailing: ["the fisherfolk", "stretched hides on a mast and let the wind do the paddling."],
  wheel: ["the potters", "watched clay spin on their turning tables and fixed a wooden disk to an axle. Carts now carry what backs could not."],
  monarchy: ["the chieftains' councils", "agreed that one ruler, and that ruler's heirs, should speak for all."],
  iron: ["the smiths", "coaxed iron from red rock in hotter furnaces than ever before. Cheap, hard, and everywhere."],
  currency: ["the traders", "began swapping stamped metal instead of goats and grain. Anything can now be priced."],
  philosophy: ["the teachers", "asked not what the gods want, but what is true, and argued about it in the open."],
  construction: ["the builders", "worked out arches, mortar and scaffolds: buildings can now rise high and span wide."],
  mathematics: ["the land surveyors", "found rules that numbers always obey, and used them to measure fields and stars."],
  republic: ["the citizens", "decided the people should choose their own leaders, and could send them away."],
  feudalism: ["the warlords", "swore land for loyalty: lords hold the land and owe the ruler soldiers."],
  theology: ["the priests", "wrote down what the faith teaches, and argued over every word."],
  guilds: ["the craftsmen", "banded together to set standards, train apprentices and guard their trade."],
  astronomy: ["the sky-watchers", "charted the wandering stars and learned to predict the heavens."],
  chivalry: ["the mounted warriors", "made a code of honor out of the lance, the horse and the oath."],
  navigation: ["the sailors", "learned to find their way by compass and stars across open ocean."],
  printing: ["the bookmakers", "set letters in metal and pressed them onto paper: a hundred books where there was one."],
  gunpowder: ["the alchemists", "mixed saltpeter, charcoal and sulfur, and got a bang that changed war forever."],
  banking: ["the moneylenders", "began keeping other people's money and lending it out at interest."],
  absolutism: ["the court", "gathered all power into the crown: one will rules the realm."],
  enlightenment: ["the thinkers of the salons", "held that reason, not tradition, should guide how people live and govern."],
  steam: ["the mine engineers", "harnessed boiling water to pump mines dry, and then to drive machines."],
  railroad: ["the engineers", "laid iron rails and set steam engines on them: distance shrinks."],
  democracy: ["the reformers", "won the vote for the many, not only the few."],
  medicine: ["the doctors", "learned that tiny germs, not bad air, spread disease, and how to stop them."],
  electricity: ["the experimenters", "tamed the spark from the sky and sent it through copper wires."],
  rifling: ["the gunsmiths", "cut spiral grooves into barrels: bullets fly straight and far."],
  combustion: ["the mechanics", "built an engine that burns fuel inside itself: small, strong, everywhere."],
  flight: ["the tinkerers", "built a machine heavier than air that flew."],
  massmedia: ["the broadcasters", "sent voices and pictures to every home at once."],
  ideology: ["the political writers", "drew up grand theories of how all society should work."],
  fission: ["the physicists", "split the atom and released the power inside it."],
  computers: ["the code-breakers", "built machines that calculate faster than any room of clerks."],
  internet: ["the network engineers", "linked computers across the world into one web."],
  robotics: ["the automation engineers", "built machines that work on their own."],
  globalization: ["the shipping and trade houses", "tied the whole world's markets into one."],
  rocketry: ["the rocket scientists", "built engines strong enough to escape the sky."],
  mars: ["the space agency", "landed people on another world."] };
function discoveryStory(n, t) { const [grp, what] = TECH_STORY[t.id] || ["your scholars", `discovered ${t.name.toLowerCase()}.`], d = TECH_DOM[t.id], g = aliveThinkers(n).find(z => z.d === d), place = (capSet(n) || {}).name || "your lands";
  return g ? `${g.name}, the ${g.title.toLowerCase()} of ${g.from}, ${what}` : `In ${place}, ${grp} ${what}`; }
/* great minds: rare people from big villages and towns, each excelling at one kind of work */
const DOMAINS = { food: { icon: "🏹", out: "food" }, build: { icon: "🔨", out: "building" }, war: { icon: "⚔️", out: "warfare" }, health: { icon: "🌿", out: "health" }, lore: { icon: "📜", out: "learning" }, crafts: { icon: "🪓", out: "materials" }, trade: { icon: "⚖️", out: "trade" } };
const THINKER_TITLES = [ /* by age: what such a person is called */
  { food: "Master tracker", build: "Master builder", war: "War leader", health: "Healer-sage", lore: "Keeper of stories", crafts: "Master flintknapper", trade: "Gift-giver" },
  { food: "Master farmer", build: "Master builder", war: "Warlord", health: "Healer", lore: "Scribe", crafts: "Master smith", trade: "Trader" },
  { food: "Agronomist", build: "Engineer", war: "Strategist", health: "Physician", lore: "Philosopher", crafts: "Master craftsman", trade: "Merchant prince" },
  { food: "Agronomist", build: "Master mason", war: "Tactician", health: "Physician", lore: "Scholar", crafts: "Guild master", trade: "Banker" },
  { food: "Agronomist", build: "Engineer", war: "Master tactician", health: "Anatomist", lore: "Natural philosopher", crafts: "Inventor", trade: "Financier" },
  { food: "Agricultural scientist", build: "Engineer", war: "General", health: "Doctor", lore: "Physicist", crafts: "Industrialist", trade: "Economist" },
  { food: "Agricultural scientist", build: "Engineer", war: "General", health: "Doctor", lore: "Physicist", crafts: "Industrialist", trade: "Economist" },
  { food: "Biotechnologist", build: "Engineer", war: "Strategist", health: "Medical researcher", lore: "Computer scientist", crafts: "Technologist", trade: "Economist" } ];
/* which kind of mind each discovery suits */
const TECH_DOM = { fire: "lore", stonetools: "crafts", rope: "build", snares: "food", ochre: "lore", dogs: "food", herbs: "health", burning: "food", stories: "lore", grinding: "food", spear: "war", glue: "crafts", sewing: "crafts", drums: "lore", smoking: "food", flutes: "lore", fishing: "food", burial: "lore", signs: "lore",
  sledges: "build", midwifery: "health", pottery: "crafts", salt: "food", waterskins: "crafts", counting: "lore", weaving: "crafts", mysticism: "lore", boats: "build", brewing: "food", wattle: "build", agriculture: "food", husbandry: "food", stars: "lore", bow: "war", stockade: "build", trade: "trade",
  mining: "crafts", calendar: "lore", tribal: "lore", nation: "lore", bronze: "war", writing: "lore", masonry: "build", sailing: "trade", wheel: "build", monarchy: "lore", iron: "war", currency: "trade", philosophy: "lore", construction: "build", mathematics: "lore", republic: "lore",
  feudalism: "war", theology: "lore", guilds: "crafts", astronomy: "lore", chivalry: "war", navigation: "trade", printing: "lore", gunpowder: "war", banking: "trade", absolutism: "lore", enlightenment: "lore", steam: "crafts", railroad: "build", democracy: "lore", medicine: "health",
  electricity: "crafts", rifling: "war", combustion: "crafts", flight: "build", massmedia: "lore", ideology: "lore", fission: "lore", computers: "lore", internet: "trade", robotics: "crafts", globalization: "trade", rocketry: "build", mars: "build" };
const aliveThinkers = n => (n.thinkers || []).filter(t => !t.dead);
const thinkB = (n, d) => Math.min(.15, aliveThinkers(n).filter(t => t.d === d).length * .05); /* each great mind: +5% in their field */
const curDom = n => { const id = !n.resOpen ? (curTalk(n) || {}).id : n.research; return TECH_DOM[id] || null; };
function stepThinkers(n) { const T = n.thinkers || (n.thinkers = []);
  for (const t of T) if (!t.dead && G.year >= t.until) { t.dead = true; if (!n.ai) { log(`${t.name}, ${t.title.toLowerCase()} of ${t.from}, has died.`, "🕯️"); hist(n, "🕯️", `${t.name}, ${t.title.toLowerCase()} of ${t.from}, died.`); } }
  if (aliveThinkers(n).length >= 2 + Math.floor(n.era / 2)) return;
  for (const x of setsOf(n)) { const big = x.t > 0 ? .4 + .3 * x.t : bigF(x); if (big <= 0) continue;
    if (rnd() > .006 * big / TPY * (1 + .15 * n.era)) continue; /* rare: a big village sees one every century or so */
    const sh = k => tribal(n) ? timeShare(n, k) : .1, w = { food: sh("food") + sh("forage") + sh("farm") + sh("fish"), build: sh("build") + .05, war: sh("warrior") + (G.nations.some(o => atWar(n.id, o.id)) ? .3 : 0), health: sh("healer") + .05, lore: sh("elder") + .08, crafts: sh("tools") + sh("wood"), trade: .04 + .05 * tradePartners(n).length };
    let r = rnd() * Object.values(w).reduce((a, v) => a + v, 0), d = "lore"; for (const k in w) { r -= w[k]; if (r <= 0) { d = k; break; } }
    const t = { name: nameFor(n, "person"), d, title: THINKER_TITLES[Math.min(7, n.era)][d], from: x.name, born: G.year, until: G.year + 18 + Math.floor(rnd() * 18) }; T.push(t);
    whist(DOMAINS[d].icon, `${t.name} of ${x.name} became known as a ${t.title.toLowerCase()} of the ${nm(n)}.`, "people", [n.id]); (G.wpeople || (G.wpeople = [])).push({ ...t, n: n.id, kind: "mind" });
    if (!n.ai) { (G.pendingUnlocks || (G.pendingUnlocks = [])).push({ icon: DOMAINS[d].icon, title: `A great mind: ${t.name}`, text: `In ${x.name}, ${t.name} has become known as a ${t.title.toLowerCase()}. While they live, your people's ${DOMAINS[d].out} does a little better, and research in their field goes faster. See them in Production.` });
      hist(n, DOMAINS[d].icon, `${t.name} of ${x.name} became known as a ${t.title.toLowerCase()}.`); }
    break; } }
/* why a building is worth it, in a line */
const PWHY = { hut: "families without homes put up shacks, have fewer children and grow restless", hearth: "warmth and gatherings suffer without fires", hides: "without clothes, more die in the winter cold",
  refuse: "without them, sickness spreads", circle: "families have nowhere to gather and grow unhappy", lodge: "healing heat keeps sickness down", field: "farmers without a plot barely grow anything", cistern: "families are short of water", water: "families are short of water", aqueduct: "families are short of water",
  rack: "dried meat and fish: more food", canoe: "more fish, and boats to cross narrow water", traps: "hunters bring in up to 25% more", weir: "fishers bring in up to 30% more", smoke: "lean winters become much less lean", pens: "farmers and herders bring in up to 20% more",
  knap: "+10% materials and faster builders here", kiln: "+10% materials", loom: "warmer, prouder families", bath: "healthier families", art: "families gather here and are happier", burial: "the elders and families are comforted",
  ditch: "a little harder to raid", watch: "raiders are seen coming, and scouts see further", palisade: "much harder to raid or conquer", post: "other peoples trust you sooner and trade more willingly", shrine: "the elders are pleased and lore grows", pit: "famine kills far fewer", shop: "toolmakers work faster: more materials" };
function panelProduction(n) {
  const P0 = prodState(n), sets = setsOf(n).slice().sort((a, b) => b.t - a.t || b.pop - a.pop);
  let x = setById(prodSet); if (!x || x.o !== n.id) { x = setById(n.cap) || sets[0]; prodSet = x ? x.id : null; }
  if (!x) return ph("Production", "") + `<p class="note">You have no settlements.</p>`;
  sb(x); const H = Math.max(1e-9, builderHoursAt(n, x) - upkeepAt(n, x));
  const lacking = y => builtAt(y, "hut") < needAt(n, y, "hut");
  let h = ph("Production", `${TIERS[x.t].name} of ${esc(x.name)} · ${fmtP(x.pop)} families`);
  if (sets.length > 1) h += `<select id="prodSet" class="psel" aria-label="Settlement">${sets.map(y => `<option value="${y.id}" ${y.id === x.id ? "selected" : ""}>${y.t === 2 ? "🏙️" : y.t === 1 ? "🏘️" : "🛖"} ${esc(y.name)} · ${fmtP(y.pop)} families${(y.pq && y.pq.length) ? " · building" : ""}${lacking(y) ? " ⚠️" : ""}</option>`).join("")}</select>`;
  /* needs at a glance */
  { const am = amenAt(n, x), wc = waterAt(n, x), E1 = econM(n), cd = Math.round(x.cond == null ? 100 : x.cond), hut = builtAt(x, "hut"), fam = Math.ceil(x.pop);
    const cls = v => v < .6 ? "bad" : v < .95 ? "warn" : "good", pc = v => `${Math.round(v * 100)}%`;
    const chips = [["🛖", `${fmtP(Math.min(hut, fam))}/${fmtP(fam)}`, hut >= fam ? "good" : hut >= fam * .9 ? "warn" : "bad", "Homes"], ["💧", pc(wc), cls(wc), "Water"], ["🍖", E1.raw.surplus >= 0 ? "Fed" : "Hungry", E1.raw.surplus >= 0 ? "good" : "bad", "Food"]];
    if (coldOf(x) >= .15) chips.push(["🔥", pc(am.warmth), cls(am.warmth), "Warmth"]);
    chips.push(["🩺", pc(am.health), cls(am.health), "Health"], ["🪘", pc(am.joy), cls(am.joy), "Gathering"], ["🧱", `${cd}%`, cd < 35 ? "bad" : cd < 70 ? "warn" : "good", "Condition"]);
    h += `<div class="pneeds">${chips.map(([i, v, c, t]) => `<span class="pchip ${c}" title="${t}">${i} ${v}</span>`).join("")}</div>`; }
  /* the builders */
  { const cur = x.pq.length ? itemOf(x.pq[0]) : null, bf = Math.round(x.pop * timeShare(n, "build")), us = Math.round((x.upShare || 0) * 100);
    h += `<div class="card pbld">`;
    if (cur) { const groups = []; x.pq.forEach((id, i) => { const g = groups[groups.length - 1]; if (g && g.id === id) g.c++; else groups.push({ id, i, c: 1 }); });
      let left = H, done = {}, total = 0; const pi = x.qpId ? x.pq.indexOf(x.qpId) : -1;
      x.pq.forEach((id, i) => { const it = itemOf(id), need = it.hours - (i === pi ? x.qp : 0); total += need; if (need <= left + 1e-6) { left -= need; done[id] = (done[id] || 0) + 1; } });
      const nm1 = (it, c) => it.repeat ? (c === 1 ? capW(it.one) : `${c} ${it.name.toLowerCase()}`) : it.name, thisQ = Object.entries(done).map(([id, c]) => `${itemOf(id).icon} ${nm1(itemOf(id), c)}`).join(", ");
      h += `<div class="ln"><span>🔨 <b>This season:</b></span><b>${thisQ || `${cur.icon} part of the ${esc(cur.repeat ? cur.one : cur.name)}`}</b></div>
        <div class="bar thin"><i style="width:${Math.min(100, H / Math.max(1e-9, total) * 100)}%;background:var(--accent)"></i></div>
        <div class="pq">${groups.map(g => { const it = itemOf(g.id); return `<button class="pqi" data-act="pdel" data-k="${g.i}" data-c="${g.c}" aria-label="Remove ${esc(it.name)}">${it.icon}${g.c > 1 ? `<b>×${g.c}</b>` : ""}<small>✕</small></button>`; }).join("")}</div>
        <p class="small muted">Everything queued: ${seasonsTxt(total / H)}.${x.qpId && x.pq.includes(x.qpId) ? ` ${itemOf(x.qpId).icon} ${esc(itemOf(x.qpId).repeat ? capW(itemOf(x.qpId).one) : itemOf(x.qpId).name)}: ${Math.floor(x.qp / itemOf(x.qpId).hours * 100)}% done.` : ""}</p>`; }
    else h += `<div class="ln"><span>🔨 <b>Builders are idle</b></span><span class="small muted">Tap + to build</span></div>`;
    h += `<p class="small muted">${bf} builder famil${bf === 1 ? "y" : "ies"} here put in ${Math.round(H)} days of building a season${us ? ` after upkeep (${us}% of their time)` : ""}.${x.waitMat ? ' <b class="bad">Out of materials: building has stopped.</b>' : ""}</p></div>`; }
  /* great minds of this nation */
  { const T = aliveThinkers(n);
    if (T.length) h += `<h5 class="psec">🌟 Great minds</h5><div class="card">${T.map(t => `<div class="ln"><span>${DOMAINS[t.d].icon} <b>${esc(t.name)}</b> <small class="muted">${esc(t.title)} of ${esc(t.from)}</small></span><small>+5% ${DOMAINS[t.d].out}</small></div>`).join("")}<p class="small muted">Each lifts your people's ${T.length === 1 ? "work in their field" : "work in their fields"} a little, and research in their field goes faster while they live.</p></div>`;
    else if (x.t === 0 && x.pop >= 40) h += `<p class="small muted">🌟 Big villages, past about 50 families, sometimes raise a great mind: a master tracker, builder, healer or war leader.</p>`; }
  /* founding villages */
  { const c = villageCost(n), can = x.pop >= MOVERS + 10 && n.gold >= c.g && n.mat >= c.m;
    h += `<div class="row wrap" style="margin:10px 0 0"><button class="btn small" data-act="pfound" ${can ? "" : "disabled"}>🛖 Found a new village from ${esc(x.name)}</button><span class="small muted">${MOVERS} families move · ${costTxt(c)}${x.pop < MOVERS + 10 ? " · needs more families here" : ""}</span></div>
      <p class="small muted">Small villages raise more children. Big ones need more food but defend better and raise great minds.</p>`; }
  /* what to build next */
  const all = [...Object.keys(STRUCTS).map(itemOf), ...GREAT].filter(it => itemOpenAt(n, x, it));
  const info = it => { if (!it.repeat) return null; const dem = needAt(n, x, it.id), have = builtAt(x, it.id), q = x.pq.filter(z => z === it.id).length; return { dem, have, q, short: Math.max(0, dem - have - q) }; };
  { const sug = all.filter(it => it.repeat).map(it => ({ it, i: info(it) })).filter(o => o.i.short > 0 && (!o.it.opt || o.it.hours * o.i.short / H <= 8)).map(o => ({ ...o, sc: (o.it.opt ? .35 : 1) * o.i.short / Math.max(1, o.i.dem) + (o.it.id === "hut" ? .2 : 0) })).sort((a, b) => b.sc - a.sc).slice(0, 3);
    const why = o => { const it = o.it, I = o.i, w = PWHY[it.id] || it.d; if (it.id === "hut") return `${fmtP(I.short)} famil${I.short === 1 ? "y has" : "ies have"} no hut${I.have >= x.pop ? " coming soon as the village grows" : ""}: ${w}.`;
      return it.opt ? `Not needed, but ${w}.` : `${fmtP(I.short)} short for ${fmtP(x.pop)} families: ${w}.`; };
    if (sug.length) h += `<h5 class="psec">✨ Suggested next</h5><div class="psug">${sug.map(o => `<div class="psr"><button class="btn small ${o.it.opt ? "ghost" : ""}" data-act="pbuild" data-k="${o.it.id}" data-n="${o.i.short}" ${x.pq.length >= QCAP ? "disabled" : ""}>+ ${o.it.icon} ${o.i.short > 1 ? `${esc(o.it.name)} ×${o.i.short}` : esc(capW(o.it.one))}<small>${seasonsTxt(o.it.hours * o.i.short / H)}</small></button><p class="small muted">${capW(why(o))}</p></div>`).join("")}</div>`; }
  /* everything, by kind */
  const shown = it => !it.repeat || info(it).dem || info(it).have, tabs = Object.entries(PROD_TABS).filter(([t]) => all.some(it => it.tab === t && shown(it)));
  if (!tabs.some(([t]) => t === prodTab)) prodTab = tabs.length ? tabs[0][0] : "housing";
  const shortIn = t => all.some(it => it.tab === t && it.repeat && !it.opt && info(it).short > 0);
  h += `<div class="ptabs2">${tabs.map(([t, q]) => `<button class="${t === prodTab ? "on" : ""}" data-act="ptab" data-k="${t}">${q.icon} ${q.name}${shortIn(t) ? ' <i class="dot"></i>' : ""}</button>`).join("")}</div>`;
  for (const [t, q] of tabs.filter(([t]) => t === prodTab)) {
    const items = all.filter(it => it.tab === t && shown(it));
    if (t === "water") { const R = W.regions[x.r]; h += `<p class="small muted">${RIVERS.has(R.n) ? "A great river runs through this land" : `${TER[R.t] ? TER[R.t].name : R.t} land`}: water for about ${Math.floor(waterNat(x))} families${dry(x) ? ", less in summer" : ""}. With carriers and what's built, ${Math.floor(waterSupply(n, x))} of ${Math.round(x.pop)} families have water.</p>`; }
    h += `<div class="pgrid">`;
    for (const it of items) { const open = prodOpen.has("i:" + it.id);
      if (it.repeat) { const I = info(it), st = I.have >= I.dem ? "ok" : it.opt ? "opt" : "short";
        h += `<div class="ptile ${st} ${open ? "wide" : ""}"><button class="pti" data-act="pinfo" data-k="${it.id}"><span class="pi">${it.icon}</span><b>${esc(open ? it.name : it.tile || it.name)}${it.tier ? ` <span class="pill">${it.tier === 2 ? "City" : "Town"}</span>` : ""}</b><span class="pc">${I.dem ? `${fmtP(Math.min(I.have, I.dem))}/${fmtP(I.dem)}` : `${fmtP(I.have)} built`}${I.q ? ` <small>+${I.q}</small>` : ""}</span></button>
          ${x.pq.length < QCAP ? `<button class="padd" data-act="pbuild" data-k="${it.id}" aria-label="Build one ${esc(it.one)}">+</button>` : ""}
          ${open ? `<p class="small muted">${esc(it.d)} One takes ${Math.round(it.hours)} builder-day${it.hours === 1 ? "" : "s"}${it.hours <= H ? `: about ${Math.floor(H / it.hours)} a season with your builders here` : `: about ${seasonsTxt(it.hours / H)}`}.${it.opt ? " Not needed, but worth having." : ""}</p>
            <div class="row wrap" style="margin:0 10px 10px">${[1, 5].map(c => `<button class="btn small ghost" data-act="pbuild" data-k="${it.id}" data-n="${c}" ${x.pq.length >= QCAP ? "disabled" : ""}>+${c}</button>`).join("")}${I.short > 1 ? `<button class="btn small" data-act="pbuild" data-k="${it.id}" data-n="${I.short}" ${x.pq.length >= QCAP ? "disabled" : ""}>Build all ${I.short} needed</button>` : ""}</div>` : ""}</div>`; }
      else { const done = P0.done[it.id], qa = setsOf(n).some(y => y.pq && y.pq.includes(it.id));
        h += `<div class="ptile great ${done ? "ok" : ""} ${open ? "wide" : ""}"><button class="pti" data-act="pinfo" data-k="${it.id}"><span class="pi">${it.icon}</span><b>${esc(it.name)}</b><span class="pc">${done ? "✓ Built" : qa ? "Queued" : `🪵${it.mat}`}</span></button>
          ${!done && !qa && n.mat >= it.mat && x.pq.length < QCAP ? `<button class="padd" data-act="pbuild" data-k="${it.id}" aria-label="Build ${esc(it.name)}">+</button>` : ""}
          ${open ? `<p class="small muted">${esc(it.d)}${done ? "" : ` Takes ${seasonsTxt(it.hours / H)} here; a great work, built once.`}</p>` : ""}</div>`; } }
    h += `</div>`; }
  /* the settlement's upkeep and borders, out of the way */
  { const cd = Math.round(x.cond == null ? 100 : x.cond), us = Math.round((x.upShare || 0) * 100), cv = x.upCov == null ? 1 : x.upCov;
    h += `<details class="card pcol" data-pk="u" ${prodOpen.has("u") ? "open" : ""}><summary><span>🧱 <b>Upkeep</b></span><span class="psum ${cd < 35 ? "bad" : cd < 70 ? "warn" : ""}">Condition ${cd}%</span></summary>
      ${line("Builders' time spent on upkeep", `${us}%`, us >= 100 ? "bad" : us > 70 ? "warn" : "")}${line("Materials for upkeep", cv >= .999 ? "Enough" : n.mat <= 0 ? "None left" : "Short", cv >= .999 ? "good" : "bad")}
      <p class="small muted">Everything built here, and every stretch of claimed border, needs upkeep: builders' time and materials. Without it the place wears down; badly worn, buildings collapse and borders shrink back.</p></details>`; }
  // borders
  { const e = x.exp || 0, need = garrisonNeed(n), have = forces(n);
    h += `<details class="card pcol" data-pk="b" ${prodOpen.has("b") ? "open" : ""}><summary><span>🚩 <b>Borders</b></span><span class="psum">${e ? `Expanded ${e}/${EXP_MAX} ${x.expDir == null ? "all around" : "one way"}` : "Natural reach"}${need > have ? ' · <span class="bad">under-guarded</span>' : ""}</span></summary>${line("Claimed land", e ? `Expanded ${e} of ${EXP_MAX}` : "Its natural reach")}${line("Warriors needed to guard all your land", `${need} <small class="muted">(you have ${have})</small>`, need > have ? "bad" : "")}
      ${need > have ? `<p class="small bad">Too few warriors to guard what you claim: defense is ${Math.round((1 - garrisonMult(n)) * 100)}% weaker everywhere.</p>` : ""}
      <p class="small muted">Expanding claims a little more land around ${esc(x.name)} for hunting, fields and new villages. Each step raises the warriors you need on guard by ${1 + x.t}. You don't have to field them, but your defense suffers if you don't.</p>
      <p class="small"><b>Which way?</b></p>
      <div class="compass">${[["NW", -.75], ["N", -.5], ["NE", -.25], ["W", 1], ["ALL", null], ["E", 0], ["SW", .75], ["S", .5], ["SE", .25]].map(([lab, a]) => { const ang = a == null ? null : a * Math.PI, on = (x.expDir == null && ang == null) || (x.expDir != null && ang != null && Math.abs(x.expDir - ang) < .01);
        return `<button class="${on ? "on" : ""}" data-act="pdir" data-v="${ang == null ? "all" : ang}">${lab === "ALL" ? "All around" : { NW: "↖", N: "↑", NE: "↗", W: "←", E: "→", SW: "↙", S: "↓", SE: "↘" }[lab]}</button>`; }).join("")}</div>
      <p class="small muted">${x.expDir == null ? "All around: a modest ring of extra land on every side." : "One direction: reaches much further that way, and no further elsewhere."}</p>
      <div class="row wrap"><button class="btn small" data-act="pexp" data-v="1" ${e >= EXP_MAX ? "disabled" : ""}>🚩 Expand borders</button><button class="btn small ghost" data-act="pexp" data-v="-1" ${e <= 0 ? "disabled" : ""}>Pull back</button></div></details>`; }
  return h;
}
function panelDevelop() {
  if (tribal(P()) && !resOpen(P())) return panelProduction(P());
  if (!resOpen(P())) return ph("Develop", "") + `<p class="note">Your people don't have trades or fields of work yet.</p>`;
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
  let h = ph("Army", `${n.army} regiment${n.army === 1 ? "" : "s"}${mercUnits(n) ? ` + ${mercUnits(n)} hired` : ""} · strength ${fmt(power(n))}`);
  // command structure
  h += `<div class="card"><h4>${C.icon} Command: ${C.name}</h4><p class="small muted">${C.d}</p>`;
  if (n.cmd === "supreme" && n.commander) { const cm = n.commander, eff = supremeMult(n);
    h += `<div class="ln me"><span>Supreme Commander ${esc(cm.name)}</span><b>${"★".repeat(cm.skill)}${"☆".repeat(5 - cm.skill)} · <span class="${eff < 0 ? "bad" : "good"}">${eff >= 0 ? "+" : ""}${Math.round(eff * 100)}% army</span></b></div>`; }
  h += `<p class="small muted">${n.cmd === "supreme" && n.commander ? `Serves about ${durTxt(n.commander.left)} more; the army, not you, chooses the successor. ` : ""}${cmdLocked(n) ? `Locked in until ${yearTxt(n.cmdUntil)}.` : `Any structure you choose is locked in for ${CMD_YEARS} years.`}</p><div class="govs">`;
  for (const [k, c] of Object.entries(CMDS)) { const un = !c.tech || has(n, c.tech); if (!un) continue;
    h += `<button class="gov ${n.cmd === k || (!n.cmd && k === "chiefs") ? "cur" : ""}" data-act="cmd" data-k="${k}" ${(n.cmd || "chiefs") === k || !un || cmdLocked(n) ? "disabled" : ""}><b>${c.icon} ${c.name}</b><small>${c.d}</small><span class="tc">${(n.cmd || "chiefs") === k ? "Current" : !un ? `Needs ${TECH[c.tech].name}` : cmdLocked(n) ? `Locked until ${yearTxt(n.cmdUntil)}` : "Reorganize"}</span></button>`; }
  h += `</div></div>`;
  // regiments
  const parts = [["Age of " + ERAS[n.era], ERA_POW[n.era]]];
  h += `<div class="card"><h4>Regiments</h4>
    ${line("Regiments", `${n.army} / ${ma} max`)}${line("Ready to fight", Math.floor(forces(n) - (n.used || 0)))}
    ${line("Strength per regiment", fmt(unitPower(n)))}${line("Attack bonus (generals & command)", `+${Math.round((attackMult(n) - 1) * 100)}%`)}${line("Defense bonus", `+${Math.round((defMult(n) - 1) * 100)}%`)}
    ${line("Total strength", fmt(power(n)))}
    ${tribal(n) ? line("Warriors the tribe can field", `${E.armyTarget}`) + line("Training", `<span class="good">+${Math.round((qualMult(E.milQual) - 1) * 100)}% per regiment</span>`) + `<p class="muted small">New regiments need ${fmt(uc.m)} 🪵 each to arm.</p></div>` : ""}${tribal(n) ? "" : `${line(`Military budget (${bud(n).mil}%)`, `${fmt(E.milGold)} 🪙`)}`}${tribal(n) ? "<!--" : ""}${line("Budget pays for", `${E.armyTarget} regiment${E.armyTarget === 1 ? "" : "s"}${E.armyTarget !== n.army ? ` <span class="${E.armyTarget > n.army ? "good" : "bad"}">(${E.armyTarget > n.army ? "raising" : "standing down"} ${Math.abs(E.armyTarget - n.army)})</span>` : ""}`)}
    ${line(`Quality (${bud(n).qual}% of the budget)`, `<span class="good">+${Math.round((qualMult(E.milQual) - 1) * 100)}% per regiment</span>`)}${E.milFund < 1 ? line("Underpaid", `<span class="bad">${Math.round((milMult(E.milFund) - 1) * 100)}% strength</span>`) : ""}
    <p class="muted small">New regiments need ${fmt(uc.m)} 🪵 each to equip.</p></div>${tribal(n) ? "-->" : ""}`;
  { const mw = mercWord(n), sups = mercSuppliers(n);
    h += `<div class="card"><h4>🤝 Military assistance</h4><p class="small muted">Ask a people you're on good terms with (relations ${MERC_REL}+) to send troops. You pay them a one-time fee; their troops fight with their own weapons and training at 90% strength, take losses first, and go home when the contract ends or if relations break down. They won't fight their own allies.</p>
      ${(n.mercs || []).map(m => line(`${esc(m.name)} troops`, `${m.k} regiment${m.k === 1 ? "" : "s"} · ${durTxt(m.left * TD)} left`)).join("")}
      ${sups.length ? sups.slice(0, 6).map(o => { const sp = mercSpare(o), rel = (unitPower(o) / Math.max(1e-9, unitPower(n)));
        return `<div class="ln"><span>${o.color ? `<span class="sw" style="background:${o.color}"></span> ` : ""}${esc(o.name)} <small class="muted">${sp} to spare · ${rel >= 1.05 ? `<span class="good">${Math.round(rel * 100)}% of your strength each</span>` : rel <= .95 ? `<span class="bad">${Math.round(rel * 100)}% of your strength each</span>` : "as strong as yours"}</small></span></div><div class="row wrap">${MERC_DEALS.flatMap(dl => [1, 3].filter(k => k <= sp).map(k => { const f = mercFee(o, k, dl); return `<button class="btn small" data-act="merc" data-id="${o.id}" data-k="${k}" data-d="${dl.id}" ${n.gold >= f ? "" : "disabled"}>${k} for ${dl.years} yrs · 🪙${fmt(f)}</button>`; })).join("")}</div>`; }).join("") : `<p class="small muted">No people you're on good enough terms with has troops to spare right now.</p>`}</div>`; }
  if (garrisonNeed(n)) h += `<div class="card"><h4>🚩 Guarding your borders</h4>${line("Warriors needed", garrisonNeed(n))}${line("You have", forces(n), forces(n) < garrisonNeed(n) ? "bad" : "good")}${forces(n) < garrisonNeed(n) ? `<p class="small bad">Your defense is ${Math.round((1 - garrisonMult(n)) * 100)}% weaker because your claimed land isn't fully guarded.</p>` : ""}</div>`;
  if (tribal(n)) h += `<div class="card"><h4>⚔️ Your warriors</h4>${line("Share of your people", `${Math.round(timeShare(n, "warrior") * 100)}% · ${fmtP(popOf(n) * timeShare(n, "warrior"))} people`)}<p class="small muted">Warriors are your own people: they gather no food, and every one killed in battle is lost to the tribe.</p><div class="row wrap"><button class="btn small ghost" data-act="timeal">👥 Change who does what</button></div></div>`;
  else h += `<div class="card"><h4>🛡️ Spending the military budget</h4><p class="small muted">Your yearly budget gives the army ${bud(n).mil}% of gross income (${fmt(E.milGold)} 🪙 a quarter). Split it between more regiments and better ones.</p>${armyBudgetHTML(n)}<div class="row wrap"><button class="btn small ghost" data-act="budget">📒 Change the military share</button></div></div>`;
  if (has(n, "bronze")) {
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
  }
  return h;
}
// plain-language advice for players who don't know much economics: what to do, and why
function recSector(n, E, k, x, st) {
  const S0 = SECTORS[k], name = S0.name.toLowerCase(), open = tradeOpen(n), gap = x.D - x.S, cb = x.compBy >= 0 ? G.nations[x.compBy].name : "foreign producers";
  const needInv = gap > 0 ? Math.ceil(gap / Math.max(1e-9, E.gross * x.suE * 1.3) * 100) : 0;
  if (st.nat && x.stateNet - x.stWage < 0 && x.su >= .85) return ["Return it to private hands.", `Running it costs the state ${fmt((x.stWage - x.stateNet) * TD)} gold a quarter, wages included, and your land is good enough for private businesses to make it at a profit without your help.`];
  if (x.X > 0 && x.q < .4 && eco(n, "brands")) return ["Build quality before flooding markets.", `Your cheap ${name} sells, but buyers abroad will come to see it as low quality, richer nations will resent it, and that label sticks for a long time. Steady production, a higher industry level and better wages raise quality; a premium name sells dearer and lifts wages.`];
  if (x.q >= .6 && x.S >= x.D && open && E.partners.length < 5 && x.fame < 60 && eco(n, "brands")) return ["Export more of it: sign trade agreements and keep supply high.", `Your ${name} is high quality. The more of it you export, the more famous it gets, until it's a household name that sells at a premium and lifts wages across your nation.`];
  if (gap > x.D * .05 && !x.M) {
    if (!open) return [`Open your markets (Barter Markets in Develop), or invest about ${Math.min(25, needInv)}%.`, `Your people need more ${name} than you make, and you can't buy the rest abroad yet. That shortage is costing you ${S0.eff}. Imports or public investment would fill the gap.`];
    return [`Invest about ${Math.min(25, needInv)}%, or subsidize it.`, `Nobody you trade with can sell you ${name} right now, so the only way to end the shortage is to make more at home.`];
  }
  const canTar = eco(n, "tariffs");
  if (st.tar && canTar && x.suE >= x.comp * 1.05) return ["Remove the tariff.", `Your producers already beat foreign prices, so the tariff isn't protecting anything. It only raises costs across your economy and prices for your people.`];
  if (x.comp > x.suE * 1.1 && x.su >= .7 && x.base < 1.15 && !st.tar && open && canTar) return ["Set a Low tariff.", `${cb} make ${name} cheaper than your producers can, so your own industry is losing customers and shrinking. A tariff makes their goods cost more, giving your producers room to compete and grow. But ordinary people love cheap goods: commoners will be unhappy about higher prices, so watch their mood.`];
  if (x.su < .7 && open && x.M > 0 && (st.tar || st.sub > 1 || st.inv > 3) && k !== "agri" && k !== "oil") return ["Just import it: drop the tariff, subsidy and investment.", `Your land is poor for ${name}. Forcing it at home costs more than buying it from others, so the gold is better spent elsewhere.`];
  if (x.su < .7 && (k === "agri" || k === "oil") && open && x.M > x.D * .6 && !st.sub) return ["Import most of it, but keep Some subsidy.", `Your land is poor for ${name}, so importing is cheaper. But ${k === "agri" ? "food" : "oil"} is vital: a war or embargo can cut imports off overnight, and a few producers of your own keep you from starving${k === "oil" ? " or stalling your armies" : ""}.`];
  if (st.inv > 0 && x.S > x.D * 1.3 && x.X < (x.S - x.D) * .5) return ["Lower the investment.", `You're making far more ${name} than your people use or you can sell abroad. The extra is wasted gold.`];
  if (open && x.S > x.D * 1.05 && E.partners.length < 3) return ["Sign more trade agreements (World tab).", `You make more ${name} than you need. More agreements let you export the extra for gold.`];
  if (x.lvl < 4 && x.stable < .6 && eco(n, "levels")) return ["Keep it steady and avoid big changes.", `Industries level up through steady production and good wages. Sudden swings in output set them back.`];
  return ["Looks healthy. No change needed.", `Your people have enough ${name} and the industry is holding its own.`];
}
const recHTML = r => r ? `<p class="rec">💡 <b>Suggested:</b> ${r[0]}<br><small><b>Why:</b> ${r[1]}</small></p>` : "";
function recBudget(n, E) { // E per quarter (econM)
  const B0 = bud(n), R = {}, g = Math.max(1e-9, E.gross);
  const needMil = Math.ceil(E.armyUp / (g * (1 - B0.qual / 100)) * 100); // regiments are paid from the quantity share
  const threats = G.nations.filter(o => o.alive && o.id !== n.id && dip(n.id, o.id).met && (atWar(n.id, o.id) || (dip(n.id, o.id).rel < -30 && bordersTouch(n, o))) && power(o) > power(n) * .8);
  R.mil = threats.length ? [`About ${needMil + 8}% or more.`, `${threats.map(o => o.name).slice(0, 2).join(" and ")} ${threats.length > 1 ? "are" : "is"} hostile and about as strong as you or stronger. A bigger, better army keeps them from taking your land.`]
    : [`About ${Math.max(needMil, 5)}%.`, `That pays for the army you have. You're not facing a strong threat right now, so extra gold may do more good in research or your economy.`];
  const best = Math.max(0, ...G.nations.filter(o => o.alive && o.id !== n.id && dip(n.id, o.id).met).map(o => o.techs.length)), behind = best - n.techs.length;
  const rBase = n.cul === "scholarly" ? 25 : n.cul === "martial" ? 10 : 15;
  R.res = behind >= 3 ? [`About ${rBase + 10}%.`, `Your neighbors know ${behind} more technologies than you. Falling further behind means weaker armies and fields; spending more on research helps you catch up.`] : [`About ${rBase}%.`, `That keeps you learning at a steady pace for your culture. Go higher if you want to race ahead, at the cost of army and economy.`];
  R.prod = n.mat < 20 * Math.pow(1.5, n.era) ? ["About 5–10%.", "You're low on materials, which you need for fields, academies and new regiments. Production spending raises how much your workshops and mines make."] : ["0–5%.", "You have materials to spare, so gold may be better used elsewhere."];
  R.travel = n.cmd === "supreme" || setsOf(n).some(x => x.mil) ? ["About 3–6%.", "You rely on generals and commanders. Travel raises the odds that skilled ones emerge, and a bad commander can cripple your army."] : ["0–2%.", "Travel mainly improves generals and commanders. Until you have military academies or a supreme commander, it does little."];
  R.sub = E.surplus < 0 ? ["About 8–10%.", "Your people are short of food. Subsidies help farmers grow more and keep commoners loyal."] : ["About 2–4%.", "A little support keeps commoners and merchants content without costing much."];
  const gap = welfareGap(n, "inc") + welfareGap(n, "health"), ed = eduOf(n);
  if (gap > .05) {
    const propNeed = Math.min(60, Math.ceil(Math.pow(gap / 2 * (25 + ed) / 75, 2) * 100)), welfNeed = Math.round((WELFARE.inc.cost[Math.min(4, B0.inc + 1)] - WELFARE.inc.cost[B0.inc] + WELFARE.health.cost[Math.min(4, B0.health + 1)] - WELFARE.health.cost[B0.health]) * 100);
    const cheaperProp = propNeed < welfNeed;
    R.prop = cheaperProp ? [`About ${propNeed}%.`, `Your people want more welfare than you give. Right now persuading them costs less than paying for it (about ${welfNeed}% for the next welfare levels).`] : ["Raise welfare instead.", `Your people are educated enough that propaganda would need about ${propNeed}% to calm them. The next welfare levels cost only about ${welfNeed}% and also make them healthier and more productive.`];
    R.inc = R.health = cheaperProp ? ["Hold here, and use propaganda.", "Persuasion is still cheaper than paying for more welfare at your people's level of education."] : ["Raise it one level.", "Your people are demanding it, and unmet demand drains trust every quarter. At their level of education, welfare is cheaper than propaganda."];
  } else {
    R.prop = B0.prop ? ["0%.", "Your people aren't demanding more than you give, so propaganda is wasted gold right now."] : ["0%.", "Your people don't expect more from the state yet. Propaganda only matters once they're educated enough to demand welfare."];
    R.inc = R.health = (n.trust == null ? 100 : n.trust) < 50 ? ["Raise it if you can afford to.", "Public trust is low. Welfare raises it every quarter and makes revolt less likely."] : ["Fine as it is.", "Your people aren't demanding more and trust is healthy. Raise it later if trust falls or demand grows."];
  }
  return R;
}
function recQual(n, E) {
  if (E.spare > 0) return ["Shift toward quality (40%+).", "You can't raise more regiments: you've hit your manpower limit. Extra money only helps if it goes into better arms and training."];
  if (G.nations.some(o => atWar(n.id, o.id))) return ["About 15–25%.", "In war, numbers let you attack and defend in several places at once. Keep enough quality that each regiment can hold its own."];
  return ["About 15–30%.", "A mix usually wins: enough regiments to cover your borders, each one well armed. Lean toward quality when you're near your manpower limit."];
}
function panelTrade() {
  const n = P(), E = econM(n), X = E.raw.sectors, open = tradeOpen(n), parts = E.partners, q = v => fmt(v * TD);
  let h = ph("Trade", open ? `${parts.length} trade agreement${parts.length === 1 ? "" : "s"} · net ${sgn(E.secNet - E.secInv)} a quarter` : "Markets not open yet");
  if (!eco(n, "markets")) {
    h += `<div class="card"><h4>🤝 Barter</h4><p class="small">Your people don't have markets or industries yet. They simply swap food, tools and furs with ${reachTxt(n)}, and that brings in a little trade income on its own.</p>${line("Trading with", parts.length ? parts.map(o => esc(o.name)).join(", ") : open ? "Nobody yet" : "Nobody: establish Barter Markets in Develop")}${line("Trade reaches", reachTxt(n))}${(() => { const wary = G.nations.filter(o => o.alive && o.id !== n.id && dip(n.id, o.id).met && tradeReach(n, o) && !relOK(n, o)); return wary.length ? line("Too wary to trade with you", wary.map(o => esc(o.name)).join(", "), "bad") : ""; })()}
      </div>`;
    return h; }
  if (!open) h += `<p class="note warn">Establish <b>Barter Markets</b> (the first Trade field, in Develop) to open your markets. Until then you can't import, export, sign trade agreements, set tariffs or embargo anyone, and every sector must make do with what your own land produces.</p>`;
  { const wary = G.nations.filter(o => o.alive && o.id !== n.id && dip(n.id, o.id).met && tradeReach(n, o) && !relOK(n, o));
    h += `<p class="small muted">Trade reaches ${reachTxt(n)}.${wary.length ? ` ${wary.map(o => esc(o.name)).join(", ")} ${wary.length > 1 ? "don't" : "doesn't"} trust you enough to trade yet; better relations will change that.` : ""}</p>`; }
  if (eco(n, "cityPolicy")) { const dir = n.tradeDir || "bal", cities = setsOf(n).filter(x => x.t >= 1);
    h += `<div class="card"><h4>🏙️ City trade policy</h4><p class="small muted">Your cities set their own local trade policies so you don't have to: export drives, quality pushes or buy-local programs for their industries. They follow your direction, your tariffs and your national policy, but each leader only gets it right as often as their trade skill allows.</p>
      <div class="seg">${Object.entries(TRADE_DIRS).map(([k, t]) => `<button class="${dir === k ? "on" : ""}" data-act="tdir" data-v="${k}">${t.icon} ${t.name}</button>`).join("")}</div><p class="small">${TRADE_DIRS[dir].d}</p>
      ${cities.length ? cities.slice(0, 12).map(x => { const L = ensureLeader(x, n), pol = Object.entries((L && L.pol) || {}).filter(([, v]) => v !== "none");
        return line(`${x.t === 2 ? "🏙️" : "🏘️"} ${esc(x.name)} <small class="muted">${esc(L.name)} ${"★".repeat(L.trade)}${"☆".repeat(5 - L.trade)}</small>${L.loop && L.loopKnown ? ` <span class="bad" title="Dodging your tariff">🕳️</span>` : ""}`, pol.length ? pol.map(([k, v]) => `${SECTORS[k].icon}${CPOL[v].icon}`).join(" · ") : '<span class="muted">Hands off</span>'); }).join("") + (cities.length > 12 ? `<p class="small muted">…and ${cities.length - 12} more.</p>` : "") : `<p class="small muted">You have no towns or cities yet. Villages don't set trade policy.</p>`}
      <p class="small muted">📣 Export drive spreads a city's name abroad · 💎 Quality push improves its goods · 🛒 Buy local favors local producers but raises prices for ordinary people. Each costs a little of the city's taxes. Leaders review their policies every Q1, and each serves a few decades.</p></div>`; }
  const emb = G.nations.filter(o => o.alive && o.id !== n.id && dip(n.id, o.id).emb), tar = G.nations.filter(o => o.alive && n.tariffOn && n.tariffOn[o.id]);
  if (eco(n, "wages")) { const w = E.wage;
    const known = phList(n), pb = phBonus(n);
    h += `<div class="card"><h4>👷 Workers' wages <span class="pill ${w < .8 ? "bad" : w >= 1.2 ? "good" : ""}">${wageWord(w)}</span></h4>${line("Compared with the world", `${Math.round(w * 100)}%`)}${pb ? line("From world-famous industries", `+${Math.round(pb * 100)}%`, "good") : ""}${line("Consumer spending → taxes", `${E.spendM >= 1 ? "+" : "−"}${Math.round(Math.abs(E.spendM - 1) * 100)}%`, E.spendM >= 1 ? "good" : "bad")}
      ${known.length ? line("🏆 World-famous city industries", known.map(p => `${esc(p.x.name)}'s ${SECTORS[p.k].icon} ${SECTORS[p.k].name.toLowerCase()} #${p.r} (${repWord(p.b.rep).toLowerCase()})`).join(", "), "good") : ""}
      ${line("Civil servants' wages", sgn(-E.govWages))}${E.pubWages ? line("Public-sector wages (state-run & public projects)", sgn(-E.pubWages), "bad") : ""}
      <p class="small muted">Private wages aren't paid by you; they follow how productive your economy is, and rise further when one of your cities' industries is a famous premium brand. But you do pay everyone the state employs at the going wage: civil servants, scientists, officers, workers in state-run sectors and on public projects. So high wages make government dearer too. Well-paid workers spend more, and their spending is taxed, so strong industries mean more revenue. High wages do make your goods dearer than goods from cheap-labor nations.</p></div>`; }
  h += `<div class="card"><h4>Balance of trade <span class="muted">per quarter</span></h4>${line("Exports", sgn(E.secExp), "good")}${line("Imports", sgn(-E.secImp), E.secImp ? "bad" : "")}${line("Tariff revenue", sgn(E.secTar))}${E.secSub ? line("Subsidies", sgn(-E.secSub)) : ""}${E.secState ? line("State-run sectors", sgn(E.secState), E.secState < 0 ? "bad" : "good") : ""}${line("Public investment", sgn(-E.secInv))}${line("Net", sgn(E.secNet - E.secInv), E.secNet - E.secInv < 0 ? "bad total" : "good total")}${E.drag ? line("Tariffs raise your production costs", `+${(E.drag * 100).toFixed(1)}%`, "bad") : ""}
    ${line("Trade agreements", parts.length ? parts.map(o => esc(o.name)).join(", ") : "None")}${emb.length ? line("Embargoes", emb.map(o => `${esc(o.name)}${dip(n.id, o.id).emb === n.id ? "" : " (theirs)"}`).join(", "), "bad") : ""}${tar.length ? line("Your tariffs on", tar.map(o => esc(o.name)).join(", ")) : ""}${E.tariffedBy ? line("Peoples taxing your goods", E.tariffedBy, "bad") : ""}
    <p class="small muted">Sign trade agreements, set tariffs on a people's goods, or embargo them from the World tab. Imports are cheaper with more trade agreements, and they let you export more.</p></div>`;
  { const offers = G.nations.filter(o => o.alive && o.id !== n.id && dip(n.id, o.id).offer === o.id && !dip(n.id, o.id).trade);
    if (offers.length) h += `<p class="note">📦 Trade agreement offered by ${offers.map(o => `<a href="#" data-act="nat" data-id="${o.id}">${esc(o.name)}</a>`).join(", ")}. Open them in World to accept.</p>`;
    const tl = (n.tradeLog || []).slice(0, 8);
    if (tl.length) h += `<details class="card"><summary><b>Recent trade moves toward you</b></summary>${tl.map(e => `<div class="nw"><span>${e.i}</span><p><small class="muted">${esc(e.when)}</small> ${esc(e.t)}</p></div>`).join("")}<p class="small muted">You're notified only about peoples that matter to you: neighbors, partners, allies and serious competitors or suppliers. Everything else is kept here.</p></details>`; }
  for (const k in SECTORS) { if (!secUnlocked(n, k)) continue;
    const S0 = SECTORS[k], x = X[k], st = secOf(n, k); if (!x) continue;
    const pct = Math.round(x.f * 100), col = x.f >= 1 ? "var(--good)" : x.f >= .85 ? "var(--warn)" : "var(--bad)", effP = Math.round(S0.amp * (Math.min(1.3, x.f) - 1) * 100);
    const seg = (f, labels, dis) => `<div class="seg">${labels.map((l, i) => `<button class="${(f === "nat" ? +st.nat : st[f]) === i ? "on" : ""}" data-act="secset" data-k="${k}" data-f="${f}" data-v="${i}" ${dis ? "disabled" : ""}>${l}</button>`).join("")}</div>`;
    const brandTip = `<p class="small muted">Each city runs the few industries its land suits. Exporting makes a city's ${S0.name.toLowerCase()} known abroad, and the more famous it is the further it sells; the world's 5 best-known city brands are powerhouses. Buyers judge its quality: a premium reputation sells dearer and lifts wages; a cheap one still sells in bulk, but richer nations resent it and the label takes a long time to shake.</p>`;
    h += `<div class="card sec"><h4>${S0.icon} ${S0.name} <span class="pill ${x.su < .85 ? "bad" : x.su >= 1.15 ? "good" : ""}">${suitWord(x.su)} land</span></h4><p class="small muted">${S0.d}</p>
      <div class="bar-row"><small>${pct}%</small><div class="bar"><i style="width:${Math.min(100, pct / 1.3)}%;background:${col}"></i></div><span>of demand</span></div>
      ${line("Demand", q(x.D))}${line(st.nat ? "Made at home (state-run)" : "Made at home", q(x.S))}${x.M ? line("Imported", `${q(x.M)} · costs ${q(x.impCost)} 🪙`) : ""}${x.X ? line("Exported", `${q(x.X)} · earns ${q(x.expInc)} 🪙`) : ""}
      ${st.tar && setsOf(n).some(c => c.lead && c.lead.loop === k && c.lead.loopKnown) ? `<p class="small bad">🕳️ Some cities are dodging this tariff: it only works at about ${Math.round((1 - x.leak) * 100)}% strength.</p>` : ""}
      ${x.S < x.D * .999 && !x.M ? `<p class="small bad">Short by ${q(x.D - x.S)} and you can't import it.</p>` : ""}
      <p class="small"><b class="${effP < 0 ? "bad" : effP > 0 ? "good" : ""}">${effP >= 0 ? "+" : ""}${effP}% ${S0.eff}</b> <span class="muted">from how well it's supplied.</span></p>
      ${(() => { const cs = cityInds(n).byK[k] || [], shown = cs.slice(0, 4), rest = 1 - cs.reduce((a, c) => a + c.share, 0);
        if (!eco(n, "brands")) return `<div class="madein"><small><b>Made in</b></small>${cs.slice(0, 4).map(c => { const x2_ = setById(c.s); return line(`${x2_.t === 2 ? "🏙️" : "🏘️"} ${esc(x2_.name)}`, `${Math.round(c.share * 100)}%`); }).join("")}${line("Villages & countryside", `${Math.round(Math.max(0, rest) * 100)}%`)}</div>`;
        return `<div class="madein"><small><b>Made in</b> (your national industry is all of these together)</small>${shown.map(c => { const x2_ = setById(c.s), b = cityBrand(x2_, k), r = cityRank(x2_, k), hb = r <= 5 ? hubsOf(n).bySet.get(c.s) : null;
          const lp = x2_.lead && x2_.lead.pol && x2_.lead.pol[k] && x2_.lead.pol[k] !== "none" ? ` ${CPOL[x2_.lead.pol[k]].icon}` : "";
          return line(`${x2_.t === 2 ? "🏙️" : "🏘️"} ${esc(x2_.name)} <small class="muted">${Math.round(c.share * 100)}%${lp}</small>`, `${r <= 5 ? `<b class="good">#${r} 🏆</b> · ` : ""}${b.fame >= 1 ? `fame ${Math.round(b.fame)} · <span class="${b.rep >= .65 ? "good" : b.rep <= .35 ? "bad" : ""}">${repWord(b.rep)}</span>` : "not known abroad yet"}`) + (hb ? `<p class="small"><b>${esc(x2_.name)} is dominated by it:</b> <span class="good">+${Math.round((hb.tax - 1) * 100)}% taxes there</span>, <span class="bad">−${Math.round((1 - hb.other) * 100)}% food, materials and science there</span>, more unrest.</p>` : ""); }).join("")}${cs.length > 4 ? line(`${cs.length - 4} more cities`, `${Math.round(cs.slice(4).reduce((a, c) => a + c.share, 0) * 100)}%`) : ""}${line("Villages & countryside", `${Math.round(Math.max(0, rest) * 100)}%`)}</div>`
          + line("Export image", `<span class="${x.rep >= .65 ? "good" : x.rep <= .35 ? "bad" : ""}">${repWord(x.rep)}</span>`) + line("Quality you make now", `${Math.round(x.q * 100)}%`); })()}
      ${!eco(n, "levels") ? "" : line("Industry level", `<b>${x.lvl.toFixed(1)}</b> / 10 · steady ${Math.round(x.stable * 100)}% · wages ${Math.round(x.wage * 100)}%`)}
      ${line("Your industry", `${Math.round(x.base * 100)}% strength ${x.S / Math.max(1e-9, x.D) < .875 ? '<span class="bad">▼ shrinking</span>' : x.base < 1.4 ? '<span class="good">▲ growing</span>' : ""}`)}
      ${line("Your cost", `${Math.round(100 / x.suE)}% of the world average`)}${open && x.compBy >= 0 ? line("Best foreign producer", `${esc(G.nations[x.compBy].name)} at ${Math.round(100 / x.comp)}%${x.comp > x.suE ? ' <span class="bad">cheaper than you</span>' : ' <span class="good">you\'re cheaper</span>'}`) : ""}
      <div class="budget"><div class="bl"><label><span>Public investment</span><b data-sv="${k}">${st.inv}% · ${q(x.ig)} 🪙</b></label><input type="range" min="0" max="25" step="1" value="${st.inv}" data-sinv="${k}" aria-label="${S0.name} investment"></div></div>
      <div class="secrow"><small>Subsidy</small>${seg("sub", ["None", "Some", "Heavy"], st.nat)}</div>
      ${eco(n, "tariffs") ? `<div class="secrow"><small>Tariff</small>${seg("tar", ["None", "Low", "High"], !open)}</div>` : ""}
      ${eco(n, "nationalize") ? `<div class="secrow"><small>Owner</small>${seg("nat", ["Private", "Nationalized"], false)}</div>` : ""}
      ${eco(n, "brands") && (x.X > 0 || x.fame > 1) ? brandTip : ""}${recHTML(recSector(n, E.raw, k, x, st))}
      ${st.sub && !st.nat ? `<p class="small muted">Subsidies cost ${q(x.sub)} 🪙 a quarter.</p>` : ""}${st.nat ? `<p class="small muted">The state runs it: steady output whatever the cost. Sales minus materials ${x.stateNet < 0 ? `lose ${q(-x.stateNet)}` : `earn ${q(x.stateNet)}`} 🪙 a quarter, and you pay its workers ${q(x.stWage)} 🪙 in wages. Merchants dislike it; workers approve.</p>` : x.stWage ? `<p class="small muted">Public projects here employ workers: ${q(x.stWage)} 🪙 a quarter in wages.</p>` : ""}${open && eco(n, "tariffs") ? `<p class="small muted">${st.tar ? `Your tariff makes foreign ${S0.name.toLowerCase()} dearer so your own producers can compete and build up (it brings in ${q(x.tarRev)} 🪙). ${x.priv < x.D * .05 && !st.nat ? "<b>Even so, your land is too poor for private producers to compete: add subsidies or public investment.</b> " : ""}` : x.comp > x.suE ? "Cheaper foreign producers are undercutting yours; left alone, imports will hollow this industry out. A tariff lets your producers compete. " : ""}Every tariff raises production costs a little across your economy and prices for your people.</p>` : ""}</div>`; }
  return h;
}
function panelElders(n) {
  const E = econM(n), x = curTalk(n), all = eraTechs(0), known = all.filter(t => has(n, t.id)), need = stoneNeed(), rate = Math.max(1e-6, E.sci);
  const eta = c => seasonsTxt(Math.max(0, c - n.sciPts) / rate).replace("this season", "within a season");
  let h = ph("The elders", "Around the fire, the elders talk things through");
  h += `<div class="card"><div class="bar-row"><small>Next age</small><div class="bar"><i style="width:${Math.min(100, known.length / need * 100)}%;background:var(--accent)"></i></div><span>${known.length}/${need}</span></div>
    <p class="small muted">Settle ${need} of the ${all.length} matters before the elders and your people enter the ${ERAS[1]}. More elders & shamans (Who does what) means faster talks.</p></div>`;
  if (x) h += `<div class="card"><h4>🔥 ${esc(x.name)}</h4><p class="small">${esc(stoneDesc(x))}</p><div class="bar-row"><small>${Math.min(99, Math.floor(n.sciPts / x.cost * 100))}%</small><div class="bar"><i style="width:${Math.min(100, n.sciPts / x.cost * 100)}%;background:var(--accent)"></i></div><span class="small">${eta(x.cost)}</span></div></div>`;
  const av = all.filter(t => stoneOpen(n, t) && (!x || t.id !== x.id));
  if (av.length) h += `<h5 class="psec">💬 What to talk about next</h5><div class="opts">${av.map(t => `<button class="opt" data-act="talk" data-k="${t.id}"><span class="oi">🔥</span><span class="ot"><b>${esc(t.name)}</b><small>${esc(stoneDesc(t))} · ${seasonsTxt(t.cost / rate)}</small></span></button>`).join("")}</div>`;
  if (known.length) h += `<details class="card pcol"><summary><span>✓ <b>Settled</b></span><span class="psum">${known.length}</span></summary>${known.map(t => `<div class="ln"><span>✓ ${esc(t.name)}</span></div>`).join("")}</details>`;
  return h;
}
function panelResearch() {
  if (!resOpen(P())) return panelElders(P());
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
  const ahead = Math.max(0, ...CHAINS.map(c => reachAhead(n, c.k))); // future ages only appear when an emphasized field lets you reach ahead
  const order = Array.from({ length: ahead + 1 }, (_, i) => n.era + i).filter(e => e <= 7);
  for (let e = n.era - 1; e >= 0; e--) order.push(e);
  for (const e of order) {
    if (e === n.era - 1) h += `<details class="past"><summary class="era-h">Earlier ages</summary>`;
    h += `<h4 class="era-h">${ERAS[e]}${e === n.era ? " · now" : e === n.era + 1 ? " · next" : " · ahead"}</h4><div class="techs">`;
    for (const t of TECHS.filter(t => t.era === e && (e <= n.era || e <= n.era + techAhead(n, t)))) {
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
  if (!tribal(n)) h += `<div class="card"><h4>Government</h4><p class="muted small">How you rule. Your rank (Tribe, Nation, Kingdom, Empire) comes from how many territories you control.</p><div class="govs">`;
  if (!tribal(n)) for (const g in GOVS) {
    const G2 = GOVS[g], un = !G2.tech || has(n, G2.tech);
    if (!un) continue; // only forms of government your people know of
    h += `<button class="gov ${g === n.gov ? "cur" : ""}" data-act="gov" data-g="${g}" ${g === n.gov || !un || n.govCool > 0 || locked ? "disabled" : ""}><b>${G2.name}</b><small>${G2.d}</small><span class="tc">${g === n.gov ? "Current" : !un ? `Needs ${TECH[G2.tech].name}` : n.govCool > 0 ? `Wait ${n.govCool} turns` : "Switch (2 turns of turmoil)"}</span></button>`;
  }
  if (!tribal(n)) h += `</div></div>`;
  else h += `<div class="card"><h4>The tribe</h4><p class="small muted">${esc(GOVS[n.gov].name)}. The elders and the strongest warriors decide things around the fire. There's little to govern yet.</p></div>`;
  { const R = relOf(n), cool = Math.max(0, Math.ceil((n.relAt != null ? n.relAt + 20 : -1e9) - G.year)), org = R.fam !== "none" && !tribal(n), avail = Object.keys(RELIGIONS).filter(k => k !== (n.relig || "animism") && relOpen(k));
    h += `<div class="card"><h4>🙏 National religion</h4><div class="ln"><span>${R.icon} <b>${esc(R.name)}</b></span><span class="muted small">${relYear(R.y)}</span></div><p class="small muted">${esc(R.d)}</p><div class="rtags">${tagChips(n.relig || "animism")}</div>${(() => { const ln = [...new Set(tagsOf(n.relig || "animism").map(t => RTAGS[t].lean).filter(Boolean))]; return ln.length ? `<p class="small muted">Over generations, your people lean ${ln.join(", ")}.</p>` : ""; })()}`;
    if (cool) h += `<p class="small warn">The people are still settling into this faith. You can change it again in ${cool} year${cool === 1 ? "" : "s"}.</p>`;
    if (avail.length) h += `<details class="pcol"><summary>Choose a different faith <span class="muted small">(${avail.length})</span></summary><p class="small muted">Highlighted characteristics are shared with your faith. Peoples whose faith shares more with yours feel closer to your people.</p><div class="opts">`;
    for (const k of avail) { const Q = RELIGIONS[k];
      h += `<button class="opt" data-act="relig" data-k="${k}" ${cool || locked ? "disabled" : ""}><span class="oi">${Q.icon}</span><span class="ot"><b>${esc(Q.name)}</b><small>${esc(Q.d)}</small><span class="rtags">${tagChips(k, tagsOf(n.relig || "animism"))}</span></span></button>`; }
    if (avail.length) h += `</div></details>`;
    if (org) { const tolOk = has(n, "philosophy");
      h += `<h4 style="margin-top:10px">Faith and state</h4><div class="seg"><button class="${n.laws.rel !== "tol" ? "on" : ""}" data-act="law" data-l="rel" data-o="faith" ${locked ? "disabled" : ""}>Enforced</button>${tolOk ? `<button class="${n.laws.rel === "tol" ? "on" : ""}" data-act="law" data-l="rel" data-o="tol" ${locked ? "disabled" : ""}>Tolerated others</button>` : ""}</div>
        <p class="small muted">${n.laws.rel === "tol" ? "Other faiths may worship freely. Balanced; conquered places settle down faster." : "The national faith is the only one allowed. The clergy are pleased, thinkers less so."}</p>`; }
    h += `</div>`; }
  { const c = ensureCustoms(n);
    h += `<div class="card"><h4>🎎 Customs</h4><p class="small muted">How your people live. The first customs are born of survival; knowledge opens new ways of living. Customs slowly shape your people's character, and peoples whose customs are like yours feel closer to you. Old customs change slowly: each can change once every 10 years.</p>`;
    for (const k in CUSTOMS) { const C = CUSTOMS[k], cur = C.opts[c[k]], cool = Math.max(0, Math.ceil(((n.cusAt && n.cusAt[k]) != null ? n.cusAt[k] + 10 : -1e9) - G.year));
      h += `<details class="pcol"><summary><span>${C.icon} ${C.name}</span><span class="muted small">${oldFashioned(n, k) ? `<b class="warn">Old-fashioned</b> · ` : ""}${esc(cur.name)}</span></summary><div class="seg">`;
      for (const o in C.opts) { const O = C.opts[o]; if (!cusOpen(n, O)) continue; h += `<button class="${c[k] === o ? "on" : ""}" data-act="cus" data-k="${k}" data-o="${o}" ${c[k] === o || (cool && !(n.cusUndo && n.cusUndo[k] && n.cusUndo[k].turn === G.turn && n.cusUndo[k].from === o)) || locked ? "disabled" : ""}>${esc(O.name)}${n.cusUndo && n.cusUndo[k] && n.cusUndo[k].turn === G.turn && n.cusUndo[k].from === o ? " ↩" : ""}</button>`; }
      h += `</div><p class="small muted">${esc(cur.d)}</p><div class="rtags"><span class="rtag ${cusEra(cur) < 0 ? "" : "on"}">${cusAge(cur)}</span></div>${oldFashioned(n, k) ? `<p class="small warn">Your people have moved on from the age this custom was born in. Newer ways are open to you.</p>` : ""}${cur.lean ? `<div class="rtags">${cur.lean.split(" ").map(w => `<span class="rtag">Leans ${w}</span>`).join("")}</div>` : ""}${cool ? `<p class="small warn">Can change again in ${cool} year${cool === 1 ? "" : "s"}.</p>` : ""}</details>`; }
    h += `</div>`; }
  for (const lk in LAWS) {
    if (lk === "rel") continue; /* shown with the national religion */
    if (tribal(n) && !["cons", "migr"].includes(lk)) continue; // a tribe has only a few customs
    const L = lawView(n, lk); if (L.tech && !has(n, L.tech)) continue;
    if (!L.opts[n.laws[lk]]) n.laws[lk] = lk === "rp" ? ({ bal: "std", sch: "high", acad: "max" }[n.laws[lk]] || "std") : Object.keys(L.opts)[0];
    h += `<div class="card"><h4>${L.name}</h4><div class="seg">`;
    for (const ok in L.opts) { const [nmx, tech, d] = L.opts[ok]; const un = !tech || has(n, tech); if (!un) continue;
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
  if (kind === "trade") return d.rel + (o.pers === "trader" ? 10 : 0) - n.warmonger >= tradeTrust(o);
  if (kind === "ally") return d.rel - n.warmonger > 45 && ratio > .5;
  if (kind === "peace") return wscore(o.id, n.id) < -6 || G.tt - d.wt > 8 && wscore(o.id, n.id) < 8 || ratio > 1.8;
  if (kind === "tribute") return ratio > 1.6 && d.rel < 40 + ratio * 10;
  return false;
}
function openNationDetail(id) {
  const n = P(), o = G.nations[id], d = dip(n.id, id);
  closeSheet(); curPanel = "world";
  const g = Math.round(12 * Math.pow(1.6, n.era)), trib = Math.round(20 * Math.pow(1.6, o.era));
  let h = ph(`<span class="sw big" style="background:${o.color}"></span> ${esc(nm(o))}`, `The ${esc(demonym(o))} · ${GOVS[o.gov].name} · ${ERAS[o.era]} · ${cul(o).icon} ${cul(o).name} culture`);
  h += `<button class="btn ghost small back" data-act="world">← All peoples</button>`;
  h += `<div class="card">${line("Relations", `${Math.round(d.rel)} · ${relWord(d.rel)}`)}${line("People", fmtP(popOf(o)))}${line("Territories", terrCount(o))}${line("Settlements", setsOf(o).length)}${line("Army strength", `${fmt(power(o))} (yours ${fmt(power(n))})`)}${line("Technologies", `${o.techs.length} (yours ${n.techs.length})`)}${line("Status", d.war ? `At war · score ${Math.round(wscore(n.id, o.id))}` : d.ally ? "Allied" : d.trade ? "Trade pact" : d.truce > 0 ? `Truce (${d.truce} turns)` : "Peace")}</div>`;
  h += `<div class="opts">`;
  if (d.war) {
    h += `<button class="opt" data-act="dPeace" data-id="${id}"><span class="oi">🕊️</span><span class="ot"><b>Propose peace</b><small>${aiAccept(o, "peace", n) ? "They seem willing" : "They are unlikely to accept"}</small></span></button>`;
    if (wscore(n.id, id) > 10) h += `<button class="opt" data-act="dPeaceT" data-id="${id}"><span class="oi">💰</span><span class="ot"><b>Peace for ${fmt(trib)} gold tribute</b><small>You are winning</small></span></button>`;
  } else {
    if (tribal(n)) {
      h += `<button class="opt" data-act="dMarry" data-id="${id}" ${d.rel >= -10 && n.gold >= 3 ? "" : "disabled"}><span class="oi">💍</span><span class="ot"><b>Arrange marriages</b><small>Young people of both tribes marry: relations improve a lot and a few families join you. ${d.rel < -10 ? "They're too hostile." : ""}</small></span><span class="oc"><span class="cg">🪙3</span></span></button>`;
      h += `<button class="opt war" data-act="dRaid" data-id="${id}" ${bordersTouch(n, o) && n.army > 0 && !((d.raidT || -1e9) > G.tt) ? "" : "disabled"}><span class="oi">🏹</span><span class="ot"><b>Raid them</b><small>${bordersTouch(n, o) ? "Steal food, tools and maybe captives without a full war. They will hate you for it, and may strike back." : "Your borders must touch to raid."}</small></span></button>`; }
    h += `<button class="opt" data-act="dGift" data-id="${id}" ${n.gold >= g ? "" : "disabled"}><span class="oi">🎁</span><span class="ot"><b>Send a gift</b><small>Improve relations</small></span><span class="oc">${costTxt({ g, m: 0 })}</span></button>`;
    const tOpen = tradeOpen(n);
    if (!tOpen) h += `<p class="note">Establish Barter Markets (Trade field, in Develop) to sign trade agreements, set tariffs or embargo other peoples.</p>`;
    else if (d.emb) h += `<button class="opt" data-act="dEmbEnd" data-id="${id}" ${d.emb !== n.id ? "disabled" : ""}><span class="oi">🔓</span><span class="ot"><b>${d.emb === n.id ? "Lift your embargo" : "They embargo you"}</b><small>${d.emb === n.id ? "Lets trade resume" : "Only they can lift it"}</small></span></button>`;
    else if (!tradeReach(n, o)) h += `<p class="note">The ${esc(o.name)} are too far away to trade with yet. Your trade reaches ${reachTxt(n)}.</p>`;
    else if (!eco(n, "embargo")) {}
    else {
      h += `<button class="opt" data-act="dEmb" data-id="${id}"><span class="oi">🚫</span><span class="ot"><b>Embargo</b><small>Stop all trade with them</small></span></button>`;
      h += n.tariffOn && n.tariffOn[id] ? `<button class="opt" data-act="dTarEnd" data-id="${id}"><span class="oi">🧾</span><span class="ot"><b>Remove tariff</b><small>Their goods enter freely again</small></span></button>` : `<button class="opt" data-act="dTar" data-id="${id}"><span class="oi">🧾</span><span class="ot"><b>Put a tariff on their goods</b><small>Makes their goods dearer in your markets so your industries can compete where theirs are stronger. Raises your costs slightly, hurts their trade and relations, and they may retaliate.</small></span></button>`;
    }
    if (!tOpen || d.emb || !tradeReach(n, o)) {}
    else if (d.offer === o.id && !d.trade) h += `<button class="opt" data-act="dOfferYes" data-id="${id}"><span class="oi">📦</span><span class="ot"><b>Accept their trade agreement</b><small>They offered it. More trade income for both, cheaper imports and room to export.</small></span></button><button class="opt" data-act="dOfferNo" data-id="${id}"><span class="oi">✋</span><span class="ot"><b>Decline their offer</b><small>Slightly hurts relations</small></span></button>`;
    else if (!d.trade) h += `<button class="opt" data-act="dTrade" data-id="${id}"><span class="oi">📦</span><span class="ot"><b>Propose a trade agreement</b><small>More trade income for both. ${!tradeOpen(o) ? "Their markets aren't open yet" : aiAccept(o, "trade", n) ? "Likely yes" : `They don't trust you enough yet (relations ${Math.round(d.rel)}, they want about ${Math.round(tradeTrust(o))}). Gifts and time help`}</small></span></button>`;
    else h += `<button class="opt" data-act="dTradeEnd" data-id="${id}"><span class="oi">✂️</span><span class="ot"><b>Cancel trade agreement</b><small>Hurts relations</small></span></button>`;
    if (!d.ally) h += `<button class="opt" data-act="dAlly" data-id="${id}"><span class="oi">🤝</span><span class="ot"><b>Propose an alliance</b><small>Defend each other. ${aiAccept(o, "ally", n) ? "Likely yes" : "Needs friendlier relations"}</small></span></button>`;
    else h += `<button class="opt" data-act="dAllyEnd" data-id="${id}"><span class="oi">💔</span><span class="ot"><b>End the alliance</b><small>Hurts relations a lot</small></span></button>`;
    if (mercSuppliers(n).includes(o)) h += `<button class="opt" data-act="army"><span class="oi">🛡️</span><span class="ot"><b>Request military assistance</b><small>They have ${mercSpare(o)} to spare. Hire them in the Army tab.</small></span></button>`;
    else if (d.rel < MERC_REL && !d.war) h += `<p class="small muted">With relations of ${MERC_REL}+ you could ask them for military assistance.</p>`;
    h += `<button class="opt" data-act="dTrib" data-id="${id}"><span class="oi">👊</span><span class="ot"><b>Demand ${fmt(trib)} gold tribute</b><small>${aiAccept(o, "tribute", n) ? "They fear you" : "They will likely refuse"}. Hurts relations.</small></span></button>`;
    const blocked = n.opposition > 0 ? "The opposition blocks war" : d.truce > 0 ? `Truce for ${durTxt(d.truce)} more` : !bordersTouch(n, o) ? "Your borders don't touch yet. Grow toward them first" : "";
    h += `<button class="opt war" data-act="dWar" data-id="${id}" ${blocked ? "disabled" : ""}><span class="oi">⚔️</span><span class="ot"><b>Declare war</b><small>${blocked || "Breaks treaties. Then attack their settlements from the map."}</small></span></button>`;
  }
  h += `</div>`;
  panel.innerHTML = AW(h); panel.hidden = false; panel.scrollTop = 0;
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("on", t.dataset.p === "world"));
}
panel.addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (!b || b.disabled) return;
  const n = P(), a = b.dataset.act, id = +b.dataset.id, o = G.nations[id];
  switch (a) {
    case "pclose": closePanel(); break;
    case "budget": openBudget(false); break;
    case "naming": openNaming(); break;
    case "assim": n.laws.assim = b.dataset.k; refresh(); break;
    case "expel": { const g = ethOf(n)[+b.dataset.k]; if (!g) break; confirmModal(`Expel the ${g.name}?`, `${Math.max(1, Math.round(g.share * popOf(n)))} families will be driven from your lands. Those who resent strangers will cheer; you lose their hands and trades, and they won't forget it.${yrsAmong(g) >= 50 && g.assim >= 15 ? ` After ${Math.round(yrsAmong(g))} years among you, they'll carry your ways wherever they go.` : ""}`, () => { expelGroup(n, +b.dataset.k); showUnlocks(); refresh(); hud(); }); break; }
    case "ptab": prodTab = b.dataset.k; refresh(); break;
    case "talk": { n.talk = b.dataset.k; toast(`The elders turn to ${TECH[b.dataset.k].name.toLowerCase()}`); refresh(); hud(); break; }
    case "htab": histTab = b.dataset.k; refresh(); break;
    case "hscope": histScope = b.dataset.k; refresh(); break;
    case "wtab": wTab = b.dataset.k; refresh(); break;
    case "pfound": { const x = setById(prodSet); if (x) startPlace(x); break; }
    case "pinfo": { const k = "i:" + b.dataset.k; if (prodOpen.has(k)) prodOpen.delete(k); else prodOpen.add(k); refresh(); break; }
    case "pbuild": { const x = setById(prodSet), P0 = prodState(n), it = itemOf(b.dataset.k); if (!x || !it) break; sb(x); if (x.pq.length >= QCAP) break; if (!it.repeat) { if (P0.done[it.id] || setsOf(n).some(y => y.pq && y.pq.includes(it.id)) || n.mat < it.mat) break; n.mat -= it.mat; } const cnt = it.repeat ? Math.max(1, Math.min(+b.dataset.n || 1, QCAP - x.pq.length)) : 1; for (let i = 0; i < cnt; i++) x.pq.push(it.id);
      toast(`${it.icon} ${it.repeat ? (cnt > 1 ? `${cnt} ${it.name.toLowerCase()}` : capW(it.one)) : it.name} queued in ${x.name}`); hud(); refresh(); break; }
    case "pdel": { const x = setById(prodSet); if (!x) break; const i = +b.dataset.k, c = Math.max(1, +b.dataset.c || 1), id = x.pq[i], it = itemOf(id); x.pq.splice(i, c); if (x.qpId && !x.pq.includes(x.qpId)) { x.qp = 0; x.qpId = null; } if (it && !it.repeat) n.mat += it.mat; refresh(); break; }
    case "pdir": { const x = setById(prodSet); if (!x) break; x.expDir = b.dataset.v === "all" ? null : +b.dataset.v; G.sv++; dirty = true; refresh(); break; }
    case "pexp": { const x = setById(prodSet); if (!x) break; x.exp = clamp((x.exp || 0) + +b.dataset.v, 0, EXP_MAX); toast(+b.dataset.v > 0 ? `${x.name} claims more land` : `${x.name} pulls its borders back`); G.sv++; dirty = true; refresh(); break; }
    case "prodAt": { prodSet = +b.dataset.s; closeSheet(); openPanel("develop"); break; }
    case "renameCity": { const x = setById(+b.dataset.s); showModal(`<h2>Rename ${esc(x.name)}</h2><label class="fld">New name<input id="nmCity" maxlength="18" value="${esc(x.name)}"></label><div class="row"><button class="btn ghost" data-m="no">Cancel</button><button class="btn" data-m="ok">Rename</button></div>`, a => { const v = (modal.querySelector("#nmCity").value || "").trim(); if (a === "ok" && v) { x.name = v.slice(0, 18); G.sv++; save(); dirty = true; toast(`Renamed to ${x.name}`); } }); break; }
    case "timeal": openTime(false); break;
    case "merc": { const k = +b.dataset.k, dl = MERC_DEALS.find(x => x.id === b.dataset.d); if (!o || n.gold < mercFee(o, k, dl) || mercSpare(o) < k) break; hireMercs(n, o, k, dl); toast(`The ${o.name} are sending ${k} regiment${k === 1 ? "" : "s"} for ${dl.years} years`); refresh(); break; }
    case "crack": { const x = setById(+b.dataset.s), L = x.lead; confirmModal(`Crack down on ${L.name}?`, `The loophole in ${x.name} closes and your tariff works again there. The city's poor will be angry, and ${L.name} will resent it.`, () => {
        L.loop = null; L.loopKnown = false; L.crack = G.tt + 2; L.loyal = Math.max(1, L.loyal - 1); x.u = Math.min(100, x.u + 12); n.facMods.push({ k: "commoners", v: -4, why: `Crackdown in ${x.name}`, t: 1.5 }); toast("Loophole closed"); hud(); closeSheet(); }); break; }
    case "tdir": n.tradeDir = b.dataset.v; for (const x of setsOf(n)) if (x.lead) { const list = cityInds(n).bySet.get(x.id) || []; x.lead.pol = {}; for (const it of list) x.lead.pol[it.k] = cityPolicyPick(n, x, it, econ(n)); } save(); refresh(); break;
    case "newLead": { const x = setById(+b.dataset.s), c = Math.round(30 * Math.pow(1.5, n.era)); if (n.gold < c) { toast("Not enough gold"); break; }
      confirmModal(`Replace ${x.lead.name}?`, `Costs ${c} gold and stirs unrest in ${x.name}. The new leader's skill is a gamble.`, () => { n.gold -= c; x.u = Math.min(100, x.u + 12); x.lead.left = 0; ensureLeader(x, n); x.lead.cool = G.tt + 4; const list = cityInds(n).bySet.get(x.id) || []; for (const it of list) x.lead.pol[it.k] = cityPolicyPick(n, x, it, econ(n)); toast(`${x.lead.name} takes over (${"★".repeat(x.lead.trade)})`); hud(); closeSheet(); }); break; }
    case "dOfferYes": { const d = dip(n.id, id); d.trade = true; d.offer = null; d.rel += 3; toast("Trade agreement signed!"); hud(); openNationDetail(id); break; }
    case "dOfferNo": { const d = dip(n.id, id); d.offer = null; d.rel -= 3; hud(); openNationDetail(id); break; }
    case "secset": { const st = secOf(n, b.dataset.k), f = b.dataset.f, v = +b.dataset.v; if (f === "nat") st.nat = !!v; else st[f] = v; save(); refresh(); break; }
    case "dEmb": confirmModal(`Embargo the ${nm(o)}?`, "All trade between you stops, and any trade agreement ends. Relations will suffer.", () => { const d = dip(n.id, id); d.emb = n.id; d.trade = false; d.rel -= 20; hud(); openNationDetail(id); }); break;
    case "dEmbEnd": { const d = dip(n.id, id); d.emb = null; d.rel += 5; toast("Embargo lifted"); hud(); openNationDetail(id); break; }
    case "dTar": { (n.tariffOn || (n.tariffOn = {}))[id] = true; dip(n.id, id).rel -= 6; toast(`Tariff placed on ${o.name} goods`); hud(); openNationDetail(id); break; }
    case "dTarEnd": { if (n.tariffOn) delete n.tariffOn[id]; dip(n.id, id).rel += 2; toast("Tariff removed"); hud(); openNationDetail(id); break; }
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
    case "relig": { const k = b.dataset.k, Q = RELIGIONS[k], pie = trv(n, "pie"), hit = Math.round(8 + .25 * Math.max(0, pie - 30));
      confirmModal(`Make ${Q.name} the national religion?`, `${Q.d} Changing faith upsets the people (−${hit} commoners, and the clergy for years), and you can't change it again for 20 years.`, () => {
        const old = relOf(n); n.relig = k; n.relAt = G.year; hist(n, Q.icon, `${Q.name} became the national religion.`); n.laws.rel = Q.fam === "none" ? "sec" : (n.laws.rel === "sec" ? "faith" : n.laws.rel);
        if (old.fam !== "folk" || Q.fam !== "folk") { n.facMods.push({ k: "commoners", v: -hit, why: `Change of faith to ${Q.name}`, t: yrsT(10) }); n.facMods.push({ k: "elders", v: -Math.round(hit * 1.2), why: "The old priests lose their place", t: yrsT(15) }); }
        culCache.clear(); n.stab = stabilityOf(n, n.fac); log(`${Q.name} is now the national religion.`, Q.icon); refresh(); hud(); }); break; }
    case "cus": { const k = b.dataset.k, o = b.dataset.o, O = CUSTOMS[k].opts[o], c = ensureCustoms(n), un = n.cusUndo && n.cusUndo[k] && n.cusUndo[k].turn === G.turn && n.cusUndo[k].from === o;
      if (un) { c[k] = o; delete n.cusUndo[k]; n.cusAt[k] = n.cusUndo0 && n.cusUndo0[k] != null ? n.cusUndo0[k] : null; n.facMods = n.facMods.filter(m => m.why !== `Changing old customs (${CUSTOMS[k].name.toLowerCase()})` || m.turn !== G.turn); toast(`Back to ${O.name}`); refresh(); break; } /* changed your mind in the same season: no harm done */
      confirmModal(`${CUSTOMS[k].icon} ${CUSTOMS[k].name}: ${O.name}?`, `${O.d}${O.lean ? ` Over generations, your people will lean ${O.lean.split(" ").join(" and ")}.` : ""} Old customs change slowly: commoners grumble for a few years, and you can't change this custom again for 10 years (you can still switch back this season).`, () => {
        (n.cusUndo || (n.cusUndo = {}))[k] = { from: c[k], turn: G.turn }; (n.cusUndo0 || (n.cusUndo0 = {}))[k] = n.cusAt && n.cusAt[k] != null ? n.cusAt[k] : null;
        c[k] = o; (n.cusAt || (n.cusAt = {}))[k] = G.year;
        n.facMods.push({ k: "commoners", v: -3, why: `Changing old customs (${CUSTOMS[k].name.toLowerCase()})`, t: yrsT(5), turn: G.turn }); toast(`${O.name}: the new custom will take root over the years`); refresh(); }); break; }
    case "law": { const l = b.dataset.l, o = b.dataset.o, L = l === "rel" ? null : lawView(n, l), nmx = l === "rel" ? (o === "tol" ? "Tolerated others" : "Enforced") : L.opts[o][0], d = l === "rel" ? (o === "tol" ? "Other faiths may worship freely." : "The national faith is the only one allowed.") : L.opts[o][2];
      confirmModal(`${l === "rel" ? "Faith and state" : L.name}: ${nmx}?`, `${d} Factions will react to the change.`, () => { n.laws[l] = o; n.stab = stabilityOf(n, n.fac); refresh(); }); break; }
    case "nat": openNationDetail(id); break;
    case "world": openPanel("world"); break;
    case "army": openPanel("army"); break;
    case "help": showHelp(); break;
    case "newgame": confirmModal("Start a new game?", "Your current people will be lost.", () => { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} G = null; closePanel(); showTitle(); }); break;
    case "peaceYes": { const pp = G.pendingPeace; makePeace(n, G.nations[pp.from], pp.tribute, G.nations[pp.payer] || null); G.pendingPeace = null; G.news = []; refresh(); break; }
    case "peaceNo": G.pendingPeace = null; refresh(); break;
    case "dMarry": { const d = dip(n.id, id); n.gold -= 3; d.rel = Math.min(100, d.rel + 18); const c = capSet(n); if (c) { const add = Math.min(Math.max(0, capOf(c, n) - c.pop), Math.max(2, popOf(o) * .03)); c.pop += add; addPeople(n, o, add, 30, c); } toast(`Marriages bind your people to the ${o.name}`); hud(); openNationDetail(id); break; }
    case "dRaid": { const d = dip(n.id, id), ok = rnd() < clamp(power(n) / Math.max(1e-9, power(n) + power(o) * .8), .15, .85);
      d.raidT = G.tt + 2 * TD * 4; d.rel = Math.max(-100, d.rel - 30); n.warmonger += 2;
      if (ok) { const loot = Math.max(2, o.mat * .15); n.mat += loot; o.mat = Math.max(0, o.mat - loot); const c = capSet(n), oc = capSet(o), cap = oc ? Math.min(oc.pop * .05, 6) : 0; if (oc) oc.pop -= cap; if (c) c.pop += cap;
        showModal(`<div class="mi">🏹</div><h2>The raid succeeded</h2><p>Your warriors came back with ${fmt(loot)} 🪵 in food and tools${cap >= 1 ? ` and ${Math.round(cap)} captives` : ""}. The ${esc(o.name)} are furious.</p><div class="row"><button class="btn" data-m="ok">OK</button></div>`); }
      else { loseUnits(n, 1); showModal(`<div class="mi">🩸</div><h2>The raid failed</h2><p>The ${esc(o.name)} were ready for you. Your warriors were driven off and some did not come back.</p><div class="row"><button class="btn" data-m="ok">OK</button></div>`); }
      if (d.rel < -60 && rnd() < .5 && !d.war) declareWar(o, n);
      hud(); openNationDetail(id); break; }
    case "dGift": { const g = Math.round(12 * Math.pow(1.6, n.era)); n.gold -= g; dip(n.id, id).rel += 12; toast(`The ${o.name} appreciate your gift`); hud(); openNationDetail(id); break; }
    case "dTrade": if (tradeOpen(o) && aiAccept(o, "trade", n)) { dip(n.id, id).trade = true; toast("Trade pact signed!"); } else { toast(`The ${o.name} declined`); dip(n.id, id).rel -= 2; } hud(); openNationDetail(id); break;
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
function showModal(html, cb) {
  if (G && G.simResume && !simState) { const left = Math.max(1, Math.round((SIM_TURNS - G.simResume.turns) / TPY)); html += `<label class="askrow simgo"><input type="checkbox" id="simGo" ${G.simResume.go ? "checked" : ""}> ⏩ Keep simulating afterwards (${left} year${left === 1 ? "" : "s"} left)</label>`; }
  modal.querySelector(".mbox").innerHTML = AW(html); modal.hidden = false; modalCb = cb || null; }
modal.addEventListener("change", e => { if (e.target.id === "simGo" && G && G.simResume) G.simResume.go = e.target.checked; });
modal.addEventListener("click", e => { const sg = e.target.closest("[data-sug]"); if (sg) { const i = modal.querySelector("#nmNation"); if (i) i.value = sg.dataset.sug; return; } }, true);
modal.addEventListener("click", e => { const b = e.target.closest("[data-m]"); if (!b || b.disabled) return; const a = b.dataset.m; const cb = modalCb; modal.hidden = true; modalCb = null; if (cb) cb(a); });
function confirmModal(title, text, yes) { showModal(`<h2>${esc(title)}</h2><p>${esc(text)}</p><div class="row"><button class="btn ghost" data-m="no">Cancel</button><button class="btn" data-m="yes">Confirm</button></div>`, a => { if (a === "yes") yes(); }); }
let toastT = 0;
function toast(t) { const el = $("toast"); el.textContent = AW(t); el.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove("on"), 1900); }

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
  const n = P(), o = Object.assign({ focus: "bal", keepCul: true, keepGov: true, keepBud: false, peace: true, pauseWar: true, stopMeet: true, stopHard: true, stopNew: true, stopEvents: false }, G.simOpts || {});
  const chk = (k, t) => `<label class="askrow"><input type="checkbox" data-so="${k}" ${o[k] ? "checked" : ""}> ${t}</label>`;
  showModal(`<div class="mi">⏩</div><h2>Simulate 10 years</h2><p class="small">Your governor runs the nation for ${SIM_TURNS} quarters, following the focus you set. Events are decided for you. You can stop at any time.</p>
    <h4>Focus</h4><div class="choices">${Object.entries(GOV_FOCUS).map(([k, f]) => `<label class="choice simf"><input type="radio" name="simf" value="${k}" ${o.focus === k ? "checked" : ""}><b>${f.icon} ${f.name}</b><small>${f.d}</small></label>`).join("")}</div>
    <h4>Honor these</h4>${chk("keepCul", `Stay a ${cul(n).name} culture`)}${chk("keepGov", `Keep my government (${GOVS[n.gov].name}), laws and army command`)}${chk("keepBud", "Keep my budget exactly as I set it")}${chk("peace", "Don't start any new wars")}<h4>Stop the simulation if…</h4>${chk("stopMeet", "We meet a new people, or our borders touch someone")}${chk("pauseWar", "We're attacked or someone declares war")}${chk("stopHard", "Hardship strikes: famine or collapsing trust")}${chk("stopNew", "Something new opens up (a discovery, an age, a new option)")}${chk("stopEvents", "Anything happens that needs a decision (so I decide events myself)")}
    <div class="row"><button class="btn ghost" data-m="no">Cancel</button><button class="btn" data-m="go">Start</button></div>`, a => {
      if (a !== "go") return;
      const box = modal.querySelector(".mbox"), r = box.querySelector('input[name="simf"]:checked'), nw = { focus: r ? r.value : "bal" };
      box.querySelectorAll("[data-so]").forEach(c => nw[c.dataset.so] = c.checked);
      G.simOpts = nw; runSim(nw);
    });
}
// after a pause, the popups are answered; then the simulation either picks up again or ends with its summary
function finishFlow() { const r = G && G.simResume; if (!r) return false; G.simResume = null; if (r.go && !G.over && P().alive) runSim(r.o, r); else runSim(r.o, Object.assign(r, { summaryOnly: true })); return true; }
function runSim(o, resume) {
  const n0 = P(), start = resume ? resume.start : { pop: popOf(n0), terr: terrCount(n0), era: n0.era, techs: n0.techs.length, gold: n0.gold, sets: setsOf(n0).length, army: n0.army, trust: n0.trust == null ? 100 : n0.trust, date: dateTxt() };
  const news = resume ? resume.news : []; let turns = resume ? resume.turns : 0, stopped = null, paused = false;
  const prevAuto = resume ? resume.prevAuto : n0.autoResearch; n0.autoResearch = true;
  simState = { stop: false };
  closePanel(); closeSheet();
  if (!(resume && resume.summaryOnly)) showModal(`<div class="mi">⏩</div><h2>Simulating…</h2><p class="center" id="simDate">${dateTxt()}</p><div class="bar simbar"><i id="simBar" style="width:0%"></i></div><p class="small muted center">Focus: ${GOV_FOCUS[o.focus].icon} ${GOV_FOCUS[o.focus].name}</p><div class="row"><button class="btn ghost" data-m="stop">Stop</button></div>`, () => { if (simState) { simState.stop = true; stopped = stopped || "You stopped the simulation."; } });
  const finish = () => {
    if (!simState) return; simState = null;
    if (paused && !G.over && P().alive) { // pause: let the player answer, then carry on or stop
      G.simResume = { o, start, news, turns, prevAuto, go: true };
      G.lastReport = [{ i: "⏸️", t: `Simulation paused: ${stopped}`, p: true }];
      save(); hud(); dirty = true; return afterTurnFlow(); }
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
        if (G.pendingCivil || G.event || G.pendingNaming || (G.pendingUnlocks && G.pendingUnlocks.length)) { G.lastReport = []; return afterTurnFlow(); }
        if (G.pendingUnlocks && G.pendingUnlocks.length && a !== "again") return showUnlocks();
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
      const metB = new Set(G.nations.filter(x => x.alive && x.id !== me.id && dip(me.id, x.id).met).map(x => x.id));
      const touchB = new Set(G.nations.filter(x => x.alive && x.id !== me.id && bordersTouch(me, x)).map(x => x.id));
      const mineB = new Set(setsOf(me).map(x => x.id)), famB = !!me.famine, trustB = me.trust == null ? 100 : me.trust, techB = me.techs.length, talkB = 0, eraB = me.era;
      endTurn(); turns++;
      { const m2 = P();
        const met = G.nations.find(x => x.alive && x.id !== m2.id && dip(m2.id, x.id).met && !metB.has(x.id));
        const touch = G.nations.find(x => x.alive && x.id !== m2.id && !touchB.has(x.id) && bordersTouch(m2, x));
        const lost = [...mineB].map(id => setById(id)).find(x => x && x.o !== m2.id);
        const hit = setsOf(m2).find(x => x.hit != null && G.tt - x.hit <= TD * 1.01);
        const halt = msg => { stopped = msg; paused = true; for (const x of G.lastReport) if (x.p !== false) news.push(x); G.lastReport = []; };
        if (o.stopMeet && met) { halt(`You've met the ${nm(met)}.`); return finish(); }
        if (o.stopMeet && touch) { halt(`Your borders now touch the ${nm(touch)}'s.`); return finish(); }
        if (o.pauseWar && (lost || hit)) { halt(lost ? `${lost.name} has been taken by the ${nm(G.nations[lost.o])}!` : `${hit.name} was attacked!`); return finish(); }
        if (o.stopHard && m2.famine && !famB) { halt("Famine: your people are going hungry."); return finish(); }
        if (o.stopHard && (m2.trust == null ? 100 : m2.trust) < 30 && trustB >= 30) { halt("Public trust is collapsing."); return finish(); }
        if (o.stopNew && (m2.era > eraB)) { halt(`Your people have entered the ${ERAS[m2.era]}.`); return finish(); }
        if (o.stopNew && m2.techs.length > techB) { const t = TECH[m2.techs[m2.techs.length - 1]]; halt(t.era === 0 ? `The elders have settled "${t.name}".` : `Discovery: ${t.name}.`); return finish(); }
        if (o.stopNew && G.pendingUnlocks && G.pendingUnlocks.length) { halt(`Something new: ${G.pendingUnlocks[0].title}.`); return finish(); }
        if (o.stopNew && G.pendingNaming) { halt("Your tribe has become a nation."); return finish(); }
        if (o.stopEvents && G.event) { halt(`${EVENTS.find(x => x.id === G.event.id).title}: your decision is needed.`); return finish(); } }
      for (const x of G.lastReport) if (x.p !== false) news.push(x);
      G.lastReport = [];
      if (G.event) { const e = EVENTS.find(x => x.id === G.event.id), i = Math.floor(rnd() * e.ch.length), c = e.ch[i]; G.news = []; c.f(P()); news.push({ i: e.icon, t: `${e.title}: your governor chose "${c.t}".`, p: true }); news.push(...G.news); G.news = []; G.event = null; P().stab = stabilityOf(P(), P().fac); }
      if (G.pendingPeace) { const pp = G.pendingPeace, f = G.nations[pp.from]; G.pendingPeace = null; if (f && f.alive && atWar(P().id, f.id)) { makePeace(P(), f, pp.tribute, G.nations[pp.payer] || null); news.push({ i: "🕊️", t: `Your governor accepted peace with the ${nm(f)}.`, p: true }); } }
      if (G.pendingCivil) { stopped = "Civil war broke out. You must choose a side."; paused = true; return finish(); }
      const nw = G.nations.find(x => x.alive && atWar(P().id, x.id) && !before.has(x.id));
      if (nw && o.pauseWar) { stopped = `The ${nm(nw)} declared war on you.`; paused = true; return finish(); }
    } catch (err) { stopped = "The simulation hit a problem and stopped."; console.error(err); return finish(); }
    const bar = document.getElementById("simBar"), dt = document.getElementById("simDate");
    if (bar) bar.style.width = (turns / SIM_TURNS * 100) + "%"; if (dt) dt.textContent = dateTxt();
    hud(); dirty = true;
    setTimeout(step, 0);
  };
  if (resume && resume.summaryOnly) { simState = { stop: false }; stopped = "You stopped the simulation."; return finish(); }
  setTimeout(step, 30);
}
function afterTurnFlow() {
  hud(); dirty = true;
  if (G.over) { G.simResume = null; return showEnd(); }
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
    if (tribal(n)) openTime(true); else openBudget(true);
    return true;
  };
  const askMastery = () => {
    const n = P(); if (!n.alive || !resOpen(n) || chooseTech(n) || n.resManual) return;
    const dev = []; for (const c of fieldsMissing(n)) for (const [k] of c.f) { const f = FIELDS[k]; if (devOk(n, f)) dev.push(f); }
    const opts = Object.values(FIELDS).filter(f => masteryOk(n, f)).sort((a, b) => masteryCost(n, a) - masteryCost(n, b));
    if (!opts.length && !dev.length) return;
    const E = econM(n), turns = c => `about ${etaTxt(c - n.sciPts, E.sci)}`;
    showModal(`<div class="mi">🎓</div><h2>Choose what to study</h2><p>You've researched every technology your people can reach in the ${ERAS[n.era]}. Until you enter the ${ERAS[n.era + 1] || "next age"}, what should your scholars work on?</p>
      ${dev.length ? `<h4>Toward the next age</h4><div class="choices">${dev.sort((a, b) => devSciCost(n, a) - devSciCost(n, b)).map(f => { const c = devSciCost(n, f); return `<button class="choice" data-m="d:${f.k}"><b>${f.chain.icon} Develop ${esc(f.name)}</b><small>Level ${lv(n, f.k)} → ${lv(n, f.k) + 1} · ${fmt(c)} 🔬 (${turns(c)}) · ${esc(f.chain.name)} ${chainHave(n, f.chain)}/${chainNeed(n, f.chain)}</small></button>`; }).join("")}</div>` : ""}
      ${opts.length ? `<h4>Mastery</h4><div class="choices">${opts.map(f => { const c = masteryCost(n, f); return `<button class="choice" data-m="m:${f.k}"><b>${f.chain.icon} Master ${esc(f.name)}</b><small>Level ${lv(n, f.k)} → ${lv(n, f.k) + 1} of ${MASTERY_MAX} · ${fmt(c)} 🔬 (${turns(c)})</small></button>`; }).join("")}</div>` : ""}
      <p class="small muted">Developing fields with research moves you toward the next age. Mastery deepens a field you've already fully expanded. When the next age arrives, research switches back to technology.</p>`, a => {
        if (a && /^[md]:/.test(a)) { n.research = a; n.resManual = true; save(); hud(); toast(a[0] === "d" ? `Scholars are developing ${FIELDS[a.slice(2)].name}` : `Scholars are mastering ${FIELDS[a.slice(2)].name}`); if (curPanel) refresh(); }
        askBudget() || finishFlow(); });
    return true;
  };
  const showEventAfterCivil = () => showEvent(true);
  const askNaming = () => {
    if (!G.pendingNaming) return false; G.pendingNaming = false;
    const n = P(), lg = langOf(n), sug = [placeName(lg), placeName(lg), placeName(lg)];
    showModal(`<div class="mi">🚩</div><h2>A nation is born</h2><p>Your tribe has claimed its first territory and become a nation. What will your nation be called, and what will your people call themselves?</p>
      <label class="fld">Nation name<input id="nmNation" maxlength="18" value="${esc(n.name)}"></label><div class="seg">${sug.map(x => `<button data-sug="${esc(x)}">${esc(x)}</button>`).join("")}</div>
      <label class="fld">Your people<input id="nmPeople" maxlength="22" value="${esc(demonym(n))}"></label>
      <div class="row"><button class="btn" data-m="ok">Proclaim it</button></div>`, () => { applyNames(modal); showEventAfterCivil(); });
    return true;
  };
  const showEvent = (skipCivil) => {
    if (skipCivil !== true && (askCivil() || askNaming())) return;
    if (!G.event) return askMastery() || askBudget() || finishFlow();
    const e = EVENTS.find(x => x.id === G.event.id), n = P();
    showModal(`<div class="mi">${e.icon}</div><h2>${e.title}</h2><p>${esc(G.event.text)}</p><div class="choices">${e.ch.map((c, i) => `<button class="choice" data-m="c${i}"><b>${esc(c.t)}</b><small>${esc(c.d(n))}</small></button>`).join("")}</div>`, a => {
      const c = e.ch[+a.slice(1)]; G.news = []; c.f(n); G.event = null; n.stab = stabilityOf(n, n.fac); save(); refresh(); askMastery() || askBudget() || finishFlow(); });
  };
  if (items.length) showModal(`<h2>${dateTxt()}</h2><div class="news">${items.map(x => `<div class="nw ${x.p === true || x.p === null ? "" : "far"}"><span>${x.i}</span><p>${esc(x.t)}</p></div>`).join("")}</div><div class="row"><button class="btn" data-m="ok">Continue</button></div>`, () => showUnlocks(showEvent));
  else showUnlocks(showEvent);
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
  <p><b>Trade.</b> Establish Barter Markets (the first Trade field) to open your markets. Then you can sign trade agreements, put tariffs on a people's goods or embargo them (World tab). Cheap imports from peoples with stronger industries undercut your own producers, and an industry left to imports hollows out over time; tariffs make foreign goods dearer so yours can compete and build up, at the cost of slightly higher production costs everywhere and possible retaliation. The Trade tab shows your economy's sectors. Each has a demand, and your land decides how cheaply you can make it. Fall short and you import (or go without); make extra and you export. Steer each sector with public investment, subsidies, tariffs, or by nationalizing it.</p>
  <p><b>Industry levels.</b> Each sector climbs from level 1 to 10 when its production is steady and its workers are well paid. Higher levels make more, more cheaply, and ramp up faster. Wages aren't paid by you: they follow how productive your economy is. Well-paid workers level industries up, but they make your goods dearer than those from cheap-labor nations.</p>
  <p><b>Powerhouses.</b> Strong industries pay well, and well-paid workers spend more, which you collect in taxes. If one of your industries ranks among the world's top 5, the world knows you for it: wages rise further and its exports sell at a premium. Each industry is centered in the city best suited to it. A world-famous one comes to dominate that city, bringing in rich taxes but crowding out its other output and stirring unrest there.</p>
  <p><b>City industries & brands.</b> Each town or city runs the 1-3 industries its land suits best, and all of them together with the countryside make up your national industry. Exporting makes a city's industry known abroad, like Hollywood's films or Maranello's cars; the more it exports, the further its name spreads, and the world's 5 best-known city brands in each sector are powerhouses. Buyers judge quality from your industry level, wages and strength. A famous premium brand is the holy grail: it sells at a premium and lifts wages. Flooding markets with cheap goods also pays, but richer nations resent it, may tariff you, and the cheap label takes a long time to shake.</p>
  <p><b>Cheap goods & the lower class.</b> Ordinary people love cheap, plentiful goods. Tariffs that keep out cheap imports protect your industries but make commoners unhappy, so you can't just tariff everything and call it good.</p>
  <p><b>City leaders.</b> Every town and city has a leader with a trade skill from 1 to 5 stars. Leaders set local trade policy for their city's industries (export drives, quality pushes, buy-local programs) following your national direction and tariffs, but they only get it right as often as their skill allows, and a weak leader's programs do less. Leaders serve a few decades; you can replace one, at a price and with unrest, and the new one's skill is a gamble.</p>
  <p><b>Loopholes.</b> Leaders have a loyalty you can't see. When your tariffs keep out cheap goods their people want, a disloyal leader may quietly open a loophole and let them in to win over the poor. That weakens your tariff and you may not notice for a while. Once you find out, you can crack down (angering the poor and the leader) or look the other way.</p>
  <p><b>Military assistance.</b> Your army's size follows your budget; you can't buy troops outright. But a people you're on good terms with can send you their troops for a one-time fee, on a 2- or 5-year contract. They fight with their own weapons and training, take losses first, and go home when the contract ends or relations break down.</p>
  <p><b>Public wages.</b> You don't pay private wages, but you do pay everyone the state employs at the going wage: civil servants, scientists, officers, and the workers in nationalized sectors and public projects.</p>
  <p><b>Families & production.</b> While you're a tribe, each unit of population is a family. In the Production tab you choose what your builders make, one thing at a time: a hut, a storage pit, a shrine. Each family needs a hut, and other needs grow with your people. More builders build faster.</p>
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
  if (!G) G = { demo: true, turn: 0, year: -3600, player: 0, nations: [], regions: W.regions.map((s, i) => ({ i, ctrl: -1 })), sets: [], bld: {}, cons: {}, dip: {}, news: [], sv: 0 };
  view.k = minK(); clampView(); dirty = true;
}
$("btnContinue").onclick = () => { const s = loadSave(); if (!s) return; G = s; reachCache.clear(); if (!G.exp) { G.exp = new Array(NR).fill(0); updateExplore(); } restoreCells(); startPlaying(); };
$("btnNew").onclick = () => openSetup();
$("btnHelp").onclick = () => showHelp();
function openSetup() {
  $("title").hidden = true; $("setup").hidden = false;
  setupState = { name: placeName(langOfRegion(RID["Lower Egypt"])), autoName: true, color: COLORS[0], start: "Lower Egypt", diff: 1, cul: "mixed" };
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
$("sName").oninput = e => { setupState.name = e.target.value.slice(0, 18); setupState.autoName = false; };
$("sColors").onclick = e => { const b = e.target.closest("[data-c]"); if (b) { setupState.color = b.dataset.c; renderSetup(); } };
$("sStarts").onclick = e => { const b = e.target.closest("[data-s]"); if (b) { setupState.start = b.dataset.s; if (setupState.autoName) setupState.name = placeName(langOfRegion(RID[b.dataset.s])); renderSetup(); } };
$("sCul").onclick = e => { const b = e.target.closest("[data-cu]"); if (b) { setupState.cul = b.dataset.cu; renderSetup(); } };
$("sDiff").onclick = e => { const b = e.target.closest("[data-d]"); if (b) { setupState.diff = +b.dataset.d; renderSetup(); } };
$("sRandomName").onclick = () => { setupState.name = placeName(langOfRegion(RID[setupState.start])); setupState.autoName = true; renderSetup(); };
function setupPick(ri) { setupState.start = W.regions[ri].n; if (setupState.autoName) setupState.name = placeName(langOfRegion(ri)); renderSetup(); }
$("sBack").onclick = () => { $("setup").hidden = true; G.setup = false; sel = -1; showTitle(); };
$("sGo").onclick = () => {
  const st = setupState; const name = (st.name || "").trim() || placeName(langOfRegion(RID[st.start]));
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
window.__c2c = { tapWorld: (x, y) => { if (!placeMode) return null; const r = foundAt(P(), setById(placeMode.from), x, y); if (r.ok) endPlace(); return r; }, carriersNeeded: n => carriersNeeded(n), waterInfra: (x, w) => waterInfra(x, w), amenOf: n => amenOf(n), waterOf: n => waterOf(n), fertility: (n) => fertility(n, econ(n)), expelGroup, addGroup, addPeople, homeShares, compatOf,  get G() { return G; }, dbg: n => ({ eraTechs: eraTechs(n.era).map(t => t.id + (has(n, t.id) ? "+" : "-")), need: eraNeed(n.era), missing: fieldsMissing(n).map(c => c.k + " " + chainHave(n, c) + "/" + chainNeed(n, c)), research: n.research, sciPts: Math.round(n.sciPts) }), load: g => { G = g; reachCache.clear(); emphCache = new Map(); }, bordersTouch, focus: (x, y, k) => centerOn(x, y, k), newGame, endTurn, aiTurn, econ, P, setsOf, terrCount, popOf, TECHS, score, ranking, dip, aiAccept, makePeace, atWar, foundCheck, foundVillage, townCheck, cityCheck, upgrade, bestVillageSpot, placeName, personName, langOfRegion, hubsOf, cityRank, cityInds, tradeReach, tradeTrust, tradeOpen, relOK, loseUnits };
const hot = window.claude?.hot;
hot?.ready ? hot.ready(start) : start(hot?.data ?? {});
})();
