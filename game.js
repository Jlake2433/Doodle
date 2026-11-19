/* Cradle to Cosmos: a nation-building strategy game from a Stone Age village to Mars. */
(() => {
"use strict";
const W = window.WORLD;
const NR = W.regions.length;
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const rnd = () => Math.random();
const pick = a => a[Math.floor(rnd() * a.length)];
const fmt = v => { const a = Math.abs(v); return a >= 1e6 ? (v / 1e6).toFixed(1) + "M" : a >= 1e4 ? (v / 1e3).toFixed(0) + "k" : a >= 1e3 ? (v / 1e3).toFixed(1) + "k" : a >= 100 ? Math.round(v) + "" : a >= 10 ? v.toFixed(0) : v.toFixed(1); };
const fmtP = v => v >= 1e4 ? fmt(v) : Math.round(v).toLocaleString("en-US");
const sgn = v => (v >= 0 ? "+" : "−") + fmt(Math.abs(v));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// ================= STATIC DATA =================
const ERAS = ["Stone Age", "Bronze Age", "Classical Age", "Medieval Age", "Renaissance", "Industrial Age", "Modern Age", "Information Age"];
const YEARS_PER_TURN = [25, 70, 45, 32, 12, 6, 4, 3];
const ERA_YEAR = [-4000, -3000, -800, 500, 1450, 1750, 1900, 1990, 2100];
const ERA_POW = [1, 1.6, 2.6, 4, 6.5, 11, 18, 30];
const TECH_BASE = [10, 36, 100, 250, 580, 1300, 2800, 5500];

// settlements
const TIERS = [
  { k: "village", name: "Village", icon: "🛖", gold: 1, mat: 1, sci: .6, food: 1, def: 1, trade: .3, r: .2, flat: .8, admin: .3, base: .3, emi: .06, need: 12 },
  { k: "town", name: "Town", icon: "🏘️", gold: 1.3, mat: 1.25, sci: 1.3, food: .9, def: 1.4, trade: 1, r: .08, flat: 2, admin: 1, base: 1, emi: .02, need: 25 },
  { k: "city", name: "City", icon: "🏙️", gold: 1.6, mat: 1.5, sci: 1.8, food: .75, def: 1.9, trade: 3, r: .055, flat: 10, admin: 1.5, base: 3, emi: .012, need: 30 },
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
TECH.mars.cost = 9000;
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
const PERS = { aggressive: "Warlike", builder: "Builder", trader: "Merchant", zealot: "Zealous" };

// region statics
const regionAvg = W.regions.reduce((a, r) => a + r.a, 0) / NR;
W.regions.forEach((r, i) => {
  r.i = i; r.sizeF = clamp(Math.sqrt(r.a / regionAvg), 0.6, 1.7);
  r.slots = clamp(Math.round(4 + 5 * r.sizeF * TER[r.t].slot), 6, 14);
  r.urban = clamp(Math.round(1.5 + 3 * r.sizeF * TER[r.t].slot), TOWNS_TO_CLAIM, 8); // max towns + cities
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
function samplePoint(ri, nearPt) {
  const s = W.regions[ri], [x0, y0, x1, y1] = s.bb;
  if (!sampler) sampler = document.createElement("canvas").getContext("2d");
  const others = setsIn(ri);
  let best = null, bd = 1e9;
  for (let i = 0; i < 80; i++) {
    const x = x0 + rnd() * (x1 - x0), y = y0 + rnd() * (y1 - y0);
    if (!sampler.isPointInPath(s.path, x, y, "evenodd")) continue;
    let gap = 9; for (const o of others) gap = Math.min(gap, Math.hypot(o.x - x, o.y - y));
    if (i < 70 && gap < 2.4) continue;
    // stay near home but keep a comfortable distance from other settlements
    const d = (nearPt ? Math.hypot(nearPt.x - x, nearPt.y - y) : Math.hypot(s.lx - x, s.ly - y) * .5) + rnd() * 5 - Math.min(gap, 6) * 1.6;
    if (d < bd) { bd = d; best = [x, y]; }
  }
  return best || [s.lx + (rnd() - .5) * 4, s.ly + (rnd() - .5) * 4];
}
function addSettlement(nid, ri, pop, from, name, tier = 0) {
  const [x, y] = samplePoint(ri, from);
  const s = { id: G.sid++, o: nid, r: ri, t: tier, pop, name: name || genName(8), x, y, c: nid, u: 0, q: 0, f: G.turn };
  G.sets.push(s); G.sv++; return s;
}
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

function newNation(name, color, ri, ai, pers) {
  const id = G.nations.length;
  const n = { id, name, color, ai, pers: pers || "builder", alive: true, gov: "tribe", govCool: 0, anarchy: 0, opposition: 0,
    laws: { tax: "normal", cons: "levy", rel: "faith", trade: "bal", labor: null, press: null, migr: "free", focus: "bal" },
    gold: 15, mat: 10, sciPts: 0, research: "agriculture", techs: [], era: 0, army: 1, used: 0,
    fac: {}, facMods: [], stab: 55, ww: 0, cap: -1, lastElect: 0, warmonger: 0, autoResearch: true, fullSeen: 0 };
  for (const k in FACTIONS) n.fac[k] = 55;
  G.nations.push(n);
  if (ri >= 0) { const s = addSettlement(id, ri, START_POP, null, name); n.cap = s.id; }
  return n;
}
function newGame(opts) {
  reachCache.clear();
  G = { v: 2, turn: 1, year: -4000, player: 0, nations: [], regions: [], sets: [], sid: 1, sv: 0, bld: {}, cons: {}, dip: {}, news: [], diff: opts.diff, over: false, nextEvent: 4, lastReport: [] };
  for (let i = 0; i < NR; i++) G.regions.push({ i, ctrl: -1 });
  const start = RID[opts.start];
  newNation(opts.name, opts.color, start, false, "builder");
  const used = [start], colors = COLORS.filter(c => c !== opts.color);
  const addTribe = r => { used.push(r); const n = newNation(genName(), colors.shift() || `hsl(${Math.floor(rnd() * 360)},60%,52%)`, r, true, pick(Object.keys(PERS))); n.laws.cons = n.pers === "aggressive" ? "levy" : "vol"; };
  const livable = r => TER[W.regions[r].t].food >= .9;
  // two neighboring tribes a few territories away (never right on your border)
  const near = W.regions.map(r => r.i).filter(r => r !== start && livable(r) && !W.regions[start].adj.includes(r) && gdist(start, r) >= 5 && gdist(start, r) <= 14)
    .sort((a, b) => gdist(start, a) - gdist(start, b) - (W.regions[a].c - W.regions[b].c) * 3);
  for (const r of near) { if (G.nations.length >= 3) break; if (used.some(u => u !== start && gdist(u, r) < 6)) continue; addTribe(r); }
  // the rest of the world: mostly coastal peoples, a few inland river valleys
  const pool = W.regions.map(r => r.i).filter(r => !used.includes(r) && (livable(r) || CRADLES.includes(W.regions[r].n))).sort(() => rnd() - .5);
  for (const r of pool) {
    if (G.nations.length >= 30) break;
    if (!W.regions[r].c && !CRADLES.includes(W.regions[r].n) && rnd() > .2) continue;
    if (used.some(u => gdist(u, r) < 9)) continue;
    addTribe(r);
  }
  G.exp = new Array(NR).fill(0);
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
  const c = villageCost(n); n.gold -= c.g; n.mat -= c.m;
  donor.pop -= MOVERS;
  const s = addSettlement(n.id, ri, MOVERS, donor);
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
  for (const ri of pres(n)) { const b = B(n.id, ri); for (const k in b) a += BK[k].admin || 0; }
  return Math.floor(a);
}
function unitPower(n) {
  let m = 1 + (GOVS[n.gov].pow || 0), bp = 0;
  for (const ri of pres(n)) { const b = B(n.id, ri); for (const k in b) bp += BK[k].pow || 0; }
  m += Math.min(.3, bp);
  for (const t of ["mathematics", "chivalry"]) if (has(n, t)) m += .1;
  for (const t of ["gunpowder", "rifling"]) if (has(n, t)) m += .15;
  if (n.laws.focus === "mil") m += .15;
  for (const s of stratStatus(n)) { if (s.bonus && s.st !== "missing") m += s.bonus; if (s.pen && s.st === "missing") m -= s.pen; }
  m *= 0.8 + 0.4 * n.stab / 100;
  if (n.ai) m *= [0.85, 1, 1.15][G.diff];
  return ERA_POW[n.era] * m;
}
const power = n => n.army * unitPower(n);
function maxArmy(n) {
  const u = setsOf(n).reduce((a, s) => a + U(s.pop), 0);
  const rate = { vol: .12, levy: .2, mass: .35 }[n.laws.cons];
  let bar = 0; for (const ri of pres(n)) if (B(n.id, ri).barracks) bar++;
  return Math.floor(u * rate + 1 + bar * .5);
}
const unitCost = n => ({ g: Math.round(8 * Math.pow(1.6, n.era)), m: Math.round(6 * Math.pow(1.6, n.era)) });
const unitUpkeep = n => 0.25 * Math.pow(1.5, n.era) * (n.laws.focus === "mil" ? .8 : 1);
function bonus(n, ri, key) {
  let m = 0; const b = B(n.id, ri);
  for (const k in b) {
    const bd = BK[k]; let v = bd[key] || 0;
    if (bd.needs && key === "prod" && !stratHave(n, bd.needs) && !stratStatus(n).find(x => x.res === bd.needs && x.st === "import")) v *= .5;
    if (k === "mine" && key === "prod" && ["copper", "iron", "coal", "gold", "gems", "uranium"].includes(W.regions[ri].r)) v += .3;
    m += v;
  }
  return m;
}
function capOf(s, n) {
  if (s.t === 0) return VILLAGE_CAP;
  n = n || G.nations[s.o];
  const cb = bonus(n, s.r, "cap") + (W.regions[s.r].r === "fish" ? .1 : 0);
  if (s.t === 1) return 3000 * (1 + cb);
  return 12000 * (1 + .4 * n.era) * (1 + cb);
}
function econ(n) {
  const gov = GOVS[n.gov], L = n.laws, sets = setsOf(n), P0 = pres(n);
  const stabM = 0.75 + 0.5 * n.stab / 100, anarchy = n.anarchy > 0 ? .6 : 1;
  const taxM = { low: .7, normal: 1, high: 1.35, extort: 1.7 }[L.tax];
  const prodLaw = (L.trade === "prot" ? .1 : 0) + (L.labor === "unreg" ? .1 : L.labor === "rights" ? -.05 : 0) + (L.focus === "ind" ? .15 : 0) + (gov.prod || 0);
  const goldLaw = (gov.gold || 0) + (L.focus === "com" ? .15 : 0);
  const sciLaw = (gov.sci || 0) + (L.focus === "sci" ? .15 : 0) + (L.rel === "sec" ? .1 : 0) + (L.press === "free" ? .05 : 0);
  const rb = new Map();
  for (const ri of P0) rb.set(ri, { food: bonus(n, ri, "food"), gold: bonus(n, ri, "gold"), prod: bonus(n, ri, "prod"), sci: bonus(n, ri, "sci") });
  let food = 0, need = 0, tax = 0, mat = 0, sci = 1 + n.era, pop = 0, trade = 0, bUp = 0, tierTrade = 0;
  const per = new Map();
  for (const s of sets) {
    const R = W.regions[s.r], T = TER[R.t], tier = TIERS[s.t], u = U(s.pop), b = rb.get(s.r);
    const unrestM = 1 - s.u / 250;
    const f = s.pop * T.food * tier.food * (1 + b.food + (R.r === "fish" ? .3 : 0) + (s.id === n.cap ? .3 : 0)) * (1 + .05 * n.era);
    const g = (u * T.gold * .5 * tier.gold + tier.base) * taxM * (1 + b.gold + goldLaw) * stabM * unrestM * anarchy;
    const m = (u * T.prod * .6 * tier.mat + tier.base) * (1 + b.prod + prodLaw) * stabM * unrestM * anarchy;
    const sc = u * .2 * tier.sci * (1 + b.sci + sciLaw) * stabM * anarchy;
    food += f; need += s.pop * .8; tax += g; mat += m; sci += sc; pop += s.pop; tierTrade += tier.trade;
    per.set(s.id, { food: f, gold: g, mat: m, sci: sc });
  }
  for (const ri of P0) { const b = B(n.id, ri); for (const k in b) { bUp += BK[k].up; trade += BK[k].trade || 0; if (BK[k].sciF) sci += BK[k].sciF * (1 + sciLaw) * stabM; } }
  const partners = tradePartners(n);
  const peaceful = G.nations.filter(o => o.alive && o.id !== n.id && dip(n.id, o.id).met && !atWar(n.id, o.id)).length;
  const tradeLawM = { prot: .7, bal: 1, free: 1.3 }[L.trade] * (has(n, "globalization") ? 1.4 : 1);
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
  const over = Math.max(0, sizeOf(n) - adminCap(n));
  const govUp = over * (1 + n.era);
  const goldNet = tax + routeGold + luxGold + foodGold - bUp - armyUp - imports - govUp;
  return { food, need, surplus, tax, routeGold, luxGold, foodGold, bUp, armyUp, imports, govUp, goldNet, mat, sci, pop, per, partners, peaceful, luxCount, luxKinds, strat, over };
}

// ================= POLITICS =================
function facActive(n, k) { return FACTIONS[k].from <= n.era || (GOVS[n.gov].w[k] || 0) > 0; }
function facTargets(n, E) {
  const L = n.laws, g = n.gov, P0 = [...pres(n)], out = {};
  const add = (k, v, why) => { if (!out[k]) out[k] = { v: 50, why: [] }; if (v) { out[k].v += v; out[k].why.push([why, v]); } };
  const cnt = k => P0.filter(ri => B(n.id, ri)[k]).length;
  const rn = Math.max(1, P0.length);
  const wars = G.nations.filter(o => atWar(n.id, o.id));
  const warBal = wars.reduce((a, o) => a + wscore(n.id, o.id), 0);
  const crowded = setsOf(n).filter(s => s.crowd).length;
  add("commoners", { low: 12, normal: 0, high: -12, extort: -28 }[L.tax], "Taxes");
  add("commoners", E.surplus >= 0 ? 6 : -25, E.surplus >= 0 ? "Food surplus" : "Famine");
  add("commoners", Math.min(15, E.luxKinds * 3), "Luxuries");
  add("commoners", Math.round(Math.min(15, (cnt("shrine") + cnt("cathedral") * 2 + cnt("hospital") + cnt("broadcast") * 2) * 6 / rn)), "Temples & services");
  add("commoners", { vol: 6, levy: 0, mass: -15 }[L.cons], "Conscription");
  add("commoners", -Math.round(n.ww), "War weariness");
  add("commoners", { democracy: 10, republic: 5, party: -10 }[g] || 0, "Government");
  add("commoners", L.labor === "rights" ? 6 : 0, "Workers' rights");
  add("commoners", L.focus === "grow" ? 8 : 0, "Growth focus");
  add("commoners", -Math.min(12, crowded * 2), "Overcrowding");
  add("commoners", L.migr === "restrict" ? -6 : 0, "Migration restricted");
  add("commoners", -Math.min(25, Math.round(E.over * 3)), "Overextended");
  add("elders", { faith: 15, tol: -5, sec: -22 }[L.rel], "Religion law");
  add("elders", Math.round(Math.min(18, (cnt("shrine") + cnt("cathedral") * 2) * 8 / rn)), "Holy sites");
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
  add("merchants", Math.round(Math.min(12, (cnt("market") + cnt("bank")) * 6 / rn)), "Markets & banks");
  add("merchants", { republic: 12, democracy: 10, party: -15 }[g] || 0, "Government");
  add("merchants", L.focus === "com" ? 12 : 0, "Commerce focus");
  add("intellectuals", L.press === "free" ? 15 : L.press === "cens" ? -15 : 0, "Press");
  add("intellectuals", { sec: 10, faith: -10, tol: 3 }[L.rel], "Religion law");
  add("intellectuals", Math.round(Math.min(15, (cnt("university") + cnt("techhub")) * 8 / rn)), "Universities");
  add("intellectuals", L.focus === "sci" ? 15 : 0, "Science focus");
  add("intellectuals", { democracy: 12, technocracy: 20, party: -18, theocracy: -15 }[g] || 0, "Government");
  add("workers", L.labor === "rights" ? 20 : L.labor === "unreg" ? -15 : 0, "Labor law");
  add("workers", { democracy: 10, party: 8 }[g] || 0, "Government");
  add("workers", { low: 8, high: -8, extort: -15 }[L.tax] || 0, "Taxes");
  add("workers", L.focus === "ind" ? 6 : 0, "Industry focus");
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
function updateExplore() {
  const n = P(); if (!n || !G.exp) return;
  if (has(n, "flight")) { G.exp.fill(1); return; }
  const add = ri => { G.exp[ri] = 1; };
  for (const ri of reachSet(n)) add(ri);
  for (const ri of pres(n)) { const S = W.regions[ri]; S.adj.forEach(add); if (S.c) S.sea.forEach(j => { if (has(n, "sailing") || gdist(ri, j) <= 6) add(j); }); }
  if (has(n, "navigation")) for (const ri of pres(n)) if (W.regions[ri].c) oceanNeighbors(ri).forEach(add);
  for (const o of G.nations) { if (!o.alive || o.id === n.id || !dip(n.id, o.id).met) continue;
    const c = capSet(o); if (c) add(c.r);
    if (dip(n.id, o.id).trade || dip(n.id, o.id).ally) for (const ri of pres(o)) add(ri); }
}
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
  n.gold += E.goldNet; n.mat += E.mat;
  if (n.gold < 0) {
    const lose = Math.min(n.army, Math.ceil(-n.gold / Math.max(1, unitUpkeep(n) * 4)));
    if (lose > 0 && n.army > 0) { n.army -= lose; log(`Unpaid, ${lose} regiment${lose > 1 ? "s" : ""} of the ${nm(n)} deserted.`, "💸", n.id); }
    n.facMods.push({ k: "commoners", v: -10, why: "Debts", t: 2 }); n.facMods.push({ k: "warriors", v: -15, why: "Unpaid soldiers", t: 2 });
    n.gold = Math.max(n.gold, -30 * (1 + n.era));
  }
  // growth: each settlement grows toward its limit. Full villages stop growing.
  const sr = clamp(E.surplus / Math.max(1, E.need), -1, 1);
  const sets = setsOf(n);
  for (const s of sets) {
    const cap = capOf(s, n), T = TIERS[s.t];
    if (sr >= 0) {
      const free = Math.max(0, 1 - s.pop / cap);
      const r = T.r + (n.laws.focus === "grow" ? .05 : 0) + .05 * Math.min(1, sr);
      const g = (s.pop * r + T.flat) * free;
      s.pop += g; s.g = g;
    } else { s.pop *= 1 - .05 * Math.min(1, -sr * 3); s.g = 0; }
    if (s.pop > cap) s.pop -= (s.pop - cap) * .25;
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
    if (s.pop >= cap * start) s.ov = (s.ov || 0) + s.pop * T.emi * push * (n.laws.focus === "grow" ? 1.3 : 1);
    else if (s.t === 0) { s.crowd = false; continue; }
    if (s.ov < T.need) continue;
    const ri = bestVillageSpot(n, s.r);
    if (ri < 0) { s.ov = T.need; if (!s.crowd) crowdedNow++; s.crowd = true; continue; }
    s.crowd = false;
    born.push([addSettlement(n.id, ri, Math.min(s.ov, 25), s), s]); s.ov = 0;
  }
  if (!n.ai) {
    if (born.length === 1) log(`People from ${born[0][1].name} moved out and formed the village of ${born[0][0].name} in ${W.regions[born[0][0].r].n}.`, "🛖");
    else if (born.length > 1) log(`${born.length} new villages formed as people moved out of full settlements: ${born.slice(0, 4).map(b => b[0].name).join(", ")}${born.length > 4 ? "…" : ""}.`, "🛖");
    if (crowdedNow) log(`${crowdedNow === 1 ? "A settlement is" : crowdedNow + " settlements are"} overcrowded with no room nearby to expand. Claim more land, or research Sailing to reach across the sea.`, "😣");
    if (sr < 0) log("Famine! There isn't enough food. Settle fertile land or build Farms.", "🥀");
  }
  // construction
  for (const ri of pres(n)) { const k = consOf(n.id, ri); if (k) { B(n.id, ri)[k] = 1; setCons(n.id, ri, null); if (!n.ai) log(`${BK[k].name} completed in ${W.regions[ri].n}.`, BK[k].icon); } }
  // research
  n.sciPts += E.sci;
  let guard = 0;
  while (guard++ < 5) {
    if (!n.research || has(n, n.research)) n.research = n.autoResearch || n.ai ? chooseResearch(n) : null;
    if (!n.research) break;
    const t = TECH[n.research];
    if (n.sciPts < t.cost) break;
    n.sciPts -= t.cost; n.techs.push(t.id);
    if (!n.ai) log(`Discovered ${t.name}! ${t.desc}`, "💡");
    if (t.id === "mars") victory(n, "science");
    n.research = n.autoResearch || n.ai ? chooseResearch(n) : null;
    const ne = n.era;
    if (ne < 7 && eraTechs(ne).filter(x => has(n, x.id)).length >= eraNeed(ne)) {
      n.era++;
      if (!n.ai) log(`Your people enter the ${ERAS[n.era]}!`, "🌅");
      else if (dip(n.id, G.player).met) log(`The ${nm(n)} entered the ${ERAS[n.era]}.`, "🌅", -1);
    }
  }
  // politics
  n.facMods.forEach(m => m.t--); n.facMods = n.facMods.filter(m => m.t > 0);
  const tg = facTargets(n, E);
  for (const k in FACTIONS) { const t = tg[k] ? tg[k].v : 50; n.fac[k] += (t - n.fac[k]) * .35; }
  n.stab = stabilityOf(n, n.fac);
  const wars = G.nations.filter(o => atWar(n.id, o.id)).length;
  n.ww = wars ? n.ww + 1.5 * (GOVS[n.gov].ww || 1) * wars : Math.max(0, n.ww - 3);
  n.ww = Math.min(n.ww, 35);
  if (n.anarchy > 0) n.anarchy--;
  if (n.govCool > 0) n.govCool--;
  if (n.opposition > 0) n.opposition--;
  n.warmonger = Math.max(0, n.warmonger - 1);
  n.used = 0;
  // unrest & revolts
  for (const s of setsOf(n)) {
    const foreign = s.c !== n.id && s.c >= 0 ? (n.laws.rel === "tol" ? 15 : 25) : 0;
    const b = B(n.id, s.r); let roads = 0; for (const k in b) roads += BK[k].unrest || 0;
    const target = Math.max(0, (50 - n.stab) * 1.1) + foreign + s.q - roads - (s.id === n.cap ? 15 : 0) - (G.regions[s.r].ctrl === n.id ? 5 : 0);
    s.u += (clamp(target, 0, 100) - s.u) * .3;
    if (s.q > 0) s.q = Math.max(0, s.q - 3);
    if (s.c !== n.id && s.c >= 0 && s.u < 25 && rnd() < .06) { s.c = n.id; if (!n.ai) log(`${s.name} now considers itself part of your nation.`, "🫶"); }
    if (s.u > 65 && s.id !== n.cap && setsOf(n).length > 1 && rnd() < (s.u - 60) / 120) revolt(n, s);
  }
  if (n.stab < 18 && n.anarchy === 0 && rnd() < .12) upheaval(n);
  const el = GOVS[n.gov].elect;
  if (el && G.turn - n.lastElect >= el) {
    n.lastElect = G.turn;
    const win = rnd() * 100 < n.stab + 15;
    if (!n.ai) {
      if (win) { log("You won the election! The people renewed your mandate.", "🗳️"); n.facMods.push({ k: "commoners", v: 8, why: "Election mandate", t: 4 }); }
      else { n.opposition = 3; log("You lost the election. The opposition controls the legislature for 3 turns: laws are locked and you can't declare war.", "🗳️"); n.facMods.push({ k: "commoners", v: 6, why: "New government", t: 3 }); }
    }
  }
}
function chooseResearch(n) {
  const av = TECHS.filter(t => !has(n, t.id) && t.era <= n.era && (t.id !== "mars" || [...pres(n)].some(ri => B(n.id, ri).spaceport)));
  if (!av.length) return null;
  if (!has(n, "agriculture")) return "agriculture";
  const pref = { aggressive: ["bronze", "iron", "mathematics", "chivalry", "gunpowder", "rifling", "masonry", "feudalism"], builder: ["pottery", "masonry", "construction", "guilds", "medicine", "steam"], trader: ["currency", "sailing", "wheel", "banking", "navigation", "globalization"], zealot: ["mysticism", "theology", "philosophy", "monarchy"] }[n.pers] || [];
  const sc = t => t.cost - (pref.includes(t.id) ? 15 * (t.era + 1) : 0) - (t.id === "masonry" ? 20 : 0) - (t.id === "mars" ? 1e5 : 0);
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
    const d = dip(n.id, rb.id); d.met = true; d.war = true; d.rel = -60; d.wt = G.turn;
    if (n.id === G.player) log(`${s.name} revolted and declared independence!`, "🔥");
    else if (dip(n.id, G.player).met) log(`${s.name} broke away from the ${nm(n)}.`, "🔥", -1);
  }
  for (const k in B(n.id, ri)) if (!setsOf(n).some(x => x.r === ri)) { delete G.bld[ri][n.id]; break; }
  recomputeControl(ri);
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
  const m = TIERS[s.t].def + (b.walls ? .4 : 0) + (b.castle ? .8 : 0) + (R.t === "mountain" ? .3 : 0) + (R.t === "forest" || R.t === "jungle" ? .1 : 0) + (s.id === d.cap ? .3 : 0);
  return { units, power: units * unitPower(d) * m + U(s.pop) * .3 * ERA_POW[d.era] * m };
}
function worldEra() { const al = G.nations.filter(n => n.alive); return Math.round(al.reduce((a, n) => a + n.era, 0) / al.length); }
function winChance(n, s, units) {
  const att = units * unitPower(n), def = defenseOf(s).power; let w = 0;
  for (let i = 0; i < 300; i++) if (att * (.75 + rnd() * .5) > def * (.8 + rnd() * .4)) w++;
  return w / 300;
}
function attack(n, s, units) {
  const dn = G.nations[s.o], D = defenseOf(s), ri = s.r;
  const att = units * unitPower(n) * (.75 + rnd() * .5), def = D.power * (.8 + rnd() * .4);
  const win = att > def;
  const aLoss = Math.min(units, Math.round(units * clamp(win ? def / att * .45 : .35 + def / att * .2, .05, .9)));
  n.army -= aLoss; n.used += units;
  const dLoss = Math.min(dn.army, Math.round(D.units * clamp(att / def * .5, .1, 1) + (win ? .5 : 0))); dn.army -= dLoss;
  const res = { win, aLoss, dLoss, name: s.name, def: dn };
  if (win) {
    addWs(n.id, dn.id, s.id === dn.cap ? 15 : 5 + s.t * 3);
    s.o = n.id; s.pop *= .85; s.u = 35; s.q = 30; G.sv++;
    dn.ww += 3;
    if (!setsOf(dn).some(x => x.r === ri)) { if (G.bld[ri]) delete G.bld[ri][dn.id]; setCons(dn.id, ri, null); }
    if (s.id === dn.cap) { const rest = setsOf(dn); if (rest.length) { dn.cap = rest.sort((a, b) => b.pop - a.pop)[0].id; dn.facMods.push({ k: "commoners", v: -15, why: "Capital lost", t: 5 }); } }
    recomputeControl(ri);
    if (!setsOf(dn).length) eliminate(dn, n);
  } else addWs(n.id, dn.id, -3);
  const involved = n.id === G.player || dn.id === G.player;
  if (win && (involved || dip(dn.id, G.player).met)) log(`${n.id === G.player ? "Your army" : "The " + nm(n)} captured the ${TIERS[s.t].name.toLowerCase()} of ${s.name} in ${W.regions[ri].n}${dn.id === G.player ? " from you" : n.id === G.player ? "" : " from the " + nm(dn)}!`, n.id === G.player ? "🚩" : dn.id === G.player ? "🔥" : "⚔️", involved ? null : -1);
  else if (!win && involved) log(`${n.id === G.player ? "Your attack on" : "The " + nm(n) + " attacked"} ${s.name}, but ${n.id === G.player ? "was" : "they were"} driven back. (${aLoss} attacker${aLoss === 1 ? "" : "s"} lost)`, "🛡️");
  return res;
}
function eliminate(dn, by) {
  dn.alive = false; dn.army = 0;
  for (const o of G.nations) { const d = dip(dn.id, o.id); d.war = false; d.trade = false; d.ally = false; }
  if (dn.id === G.player) { log("Your last settlement has fallen.", "☠️"); defeat(); }
  else if (dip(dn.id, G.player).met) log(`The ${nm(dn)} has been wiped from the map by the ${nm(by)}.`, "☠️", -1);
}
function declareWar(a, b) {
  const d = dip(a.id, b.id); d.war = true; d.trade = false; d.ally = false; d.ws = 0; d.wt = G.turn;
  if (d.rel > -60) a.warmonger += 12;
  d.rel = Math.min(d.rel, -50);
  for (const o of G.nations) if (o.alive && o.id !== a.id && o.id !== b.id && dip(o.id, a.id).met) dip(o.id, a.id).rel -= dip(o.id, b.id).rel < -40 ? 2 : 10;
  if (a.id === G.player || b.id === G.player) log(a.id === G.player ? `You declared war on the ${nm(b)}!` : `The ${nm(a)} declared war on you!`, "⚔️");
  else if (dip(a.id, G.player).met || dip(b.id, G.player).met) log(`The ${nm(a)} declared war on the ${nm(b)}.`, "⚔️", -1);
  for (const o of G.nations) {
    if (!o.alive || o.id === a.id || o.id === b.id) continue;
    if (dip(o.id, b.id).ally && !dip(o.id, a.id).war && !dip(o.id, a.id).ally) {
      if (o.id === G.player) log(`Your ally the ${nm(b)} was attacked by the ${nm(a)}. They expect your help (check World).`, "📯");
      else if (rnd() < .8) { const d2 = dip(o.id, a.id); d2.war = true; d2.trade = false; d2.ws = 0; d2.wt = G.turn; d2.rel = Math.min(d2.rel, -40);
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
  if (n.govCool === 0 && n.stab > 40) {
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
    if (founds >= maxF || !underCap || rnd() > .35) break;
    const ri = bestVillageSpot(n, d.r); if (ri < 0) continue;
    const c = villageCost(n); if (!afford(n, c)) break;
    if (!near(n, d.r, ri)) continue;
    foundVillage(n, ri, d); founds++;
  }
  // military
  const ratio = ({ aggressive: 1.3, builder: .7, trader: .6, zealot: .9 }[n.pers]) * (wars.length ? 1.6 : 1);
  const want = Math.min(maxArmy(n), Math.ceil(sizeOf(n) * ratio + 1));
  const uc = unitCost(n);
  while (n.army < want && n.gold > uc.g * 1.5 + (saving ? villageCost(n).g : 0) && n.mat > uc.m) recruit(n, 1);
  // build
  let builds = 0;
  for (const ri of [...pres(n)].sort(() => rnd() - .5)) {
    if (builds >= 1 + Math.floor(sets.length / 8)) break;
    if (!canBuildHere(n, ri)) continue;
    const opts = BLD.filter(b => buildCheck(n, ri, b) && !(b.needs && !stratHave(n, b.needs)));
    if (!opts.length) continue;
    const b = opts.sort((x, y) => x.era - y.era || rnd() - .5)[0];
    const c = buildCost(n, b), reserve = saving ? villageCost(n).g + 5 : 5;
    if (n.gold > c.g + reserve && n.mat > c.m && E.goldNet - b.up > -1) { startBuild(n, ri, b); builds++; }
  }
  // diplomacy
  for (const o of G.nations) {
    if (!o.alive || o.id === n.id) continue;
    const d = dip(n.id, o.id); if (!d.met) continue;
    if (o.ai && o.id > n.id) {
      if (!d.war && !d.trade && d.rel > 5 && rnd() < .15) d.trade = true;
      if (!d.war && !d.ally && d.rel > 60 && rnd() < .08) d.ally = true;
    }
    if (d.war) {
      const myScore = wscore(n.id, o.id), dur = G.turn - d.wt;
      const losing = myScore < -12 || power(n) < power(o) * .5;
      const tired = dur > 10 && rnd() < .15;
      if (o.ai && (losing || tired || (myScore > 25 && rnd() < .3))) makePeace(n, o, myScore < -12 ? Math.round(Math.max(0, Math.min(n.gold * .3, 30 * (n.era + 1)))) : 0, myScore < -12 ? n : null);
      else if (!o.ai && (losing || tired) && !G.pendingPeace && rnd() < .5) {
        const trib = myScore < -12 ? Math.round(Math.max(0, Math.min(n.gold * .3, 30 * (n.era + 1)))) : 0;
        G.pendingPeace = { from: n.id, tribute: trib, payer: trib ? n.id : null };
      } else if (!o.ai && myScore > 18 && dur > 4 && !G.pendingPeace && rnd() < .25) {
        G.pendingPeace = { from: n.id, tribute: Math.round(Math.min(Math.max(0, o.gold) * .4, 40 * (o.era + 1))), payer: o.id };
      }
    } else if (!d.ally && d.truce <= 0 && wars.length === 0 && n.anarchy === 0 && sizeOf(n) < adminCap(n) * 1.4) {
      const ratioP = power(n) / Math.max(1, power(o));
      const hostile = d.rel < (n.pers === "aggressive" ? -10 : -45);
      const border = setsOf(o).some(s => canReach(n, s.r));
      const chance = { aggressive: .15, zealot: .08, builder: .04, trader: .03 }[n.pers] * (o.id === G.player ? [.5, 1, 1.4][G.diff] : 1);
      const grace = (o.id === G.player && G.turn < [60, 35, 20][G.diff]) || G.turn < 12;
      if (!grace && hostile && border && ratioP > (n.pers === "aggressive" ? 1.25 : 1.8) && rnd() < chance) declareWar(n, o);
    }
  }
  // attack
  for (const o of G.nations.filter(o => atWar(n.id, o.id))) {
    if (dip(n.id, o.id).wt === G.turn) continue;
    let tries = o.id === G.player ? (n.era < 4 ? 1 : 2) : 1 + Math.floor(n.era / 3);
    while (tries-- > 0) {
      const avail = n.army - n.used; if (avail < 1) break;
      const targets = setsOf(o).filter(s => canReach(n, s.r));
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
    const ra = reachSet(a), border = [...pres(b)].some(ri => ra.has(ri));
    if (border && !d.ally) v -= .6;
    if (a.pers === "aggressive" || b.pers === "aggressive") v -= .3;
    const big = Math.max(T.get(a.id), T.get(b.id));
    if (big > 8) v -= Math.min(1.5, (big - 8) * .1);
    v -= ((a.id === G.player ? a.warmonger : 0) + (b.id === G.player ? b.warmonger : 0)) * .05;
    v += (rnd() - .5) * 2;
    v -= d.rel * .015;
    d.rel = clamp(d.rel + v, -100, 100);
    if (d.truce > 0) d.truce--;
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
  { id: "accident", title: "Factory Disaster", era: [5, 7], icon: "🏭", cond: n => [...pres(n)].some(ri => B(n.id, ri).factory),
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
  const n = P(); if (!n.alive || G.turn < G.nextEvent) return null;
  const ok = EVENTS.filter(e => n.era >= e.era[0] && n.era <= e.era[1] && (!e.cond || e.cond(n)) && e.id !== G.lastEvent);
  if (!ok.length) return null;
  G.nextEvent = G.turn + 3 + Math.floor(rnd() * 3);
  const e = pick(ok); G.lastEvent = e.id;
  return { id: e.id, text: e.text(n) };
}

// ================= END TURN =================
function endTurn() {
  if (G.over) return;
  G.news = [];
  for (const n of G.nations) if (n.ai) aiTurn(n);
  for (const n of G.nations) processNation(n);
  driftRelations();
  updateContacts(); updateExplore();
  G.turn++;
  { const e = Math.max(worldEra(), P().alive ? P().era - 1 : 0); G.year = Math.max(ERA_YEAR[e], Math.min(G.year + YEARS_PER_TURN[e], ERA_YEAR[e + 1] - (e === 7 ? 0 : 1))); }
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
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(G)); } catch (e) {} }
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
function minK() { return Math.max(cw / W.w, ch / W.h) * 0.98; }
function clampView() {
  view.k = clamp(view.k, minK(), 24);
  const mw = W.w * view.k, mh = W.h * view.k;
  view.x = mw <= cw ? (cw - mw) / 2 : clamp(view.x, cw - mw, 0);
  view.y = mh <= ch ? (ch - mh) / 2 : clamp(view.y, ch - mh, 0);
}
function centerOn(x, y, k) { if (k) view.k = k; view.x = cw / 2 - x * view.k; view.y = ch * .42 - y * view.k; clampView(); dirty = true; }
const centerRegion = (ri, k) => centerOn(W.regions[ri].lx, W.regions[ri].ly, k);
let fogPat = null;
function makeFog() {
  const c = document.createElement("canvas"); c.width = c.height = 40; const x = c.getContext("2d");
  x.strokeStyle = "rgba(255,255,255,.55)"; x.lineWidth = 2; x.lineCap = "round";
  for (const [a, b] of [[10, 12], [30, 30]]) { x.beginPath(); x.arc(a, b, 4, Math.PI, 0); x.arc(a + 7, b, 3, Math.PI, 0); x.stroke(); }
  fogPat = ctx.createPattern(c, "repeat");
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
    if (fogged(s.i)) { ctx.fillStyle = "#d3d9e0"; ctx.fill(s.path, "evenodd"); ctx.fillStyle = fogPat; ctx.fill(s.path, "evenodd"); continue; }
    if (r.ctrl >= 0) { ctx.fillStyle = G.nations[r.ctrl].color; ctx.fill(s.path, "evenodd"); continue; }
    ctx.fillStyle = WILD; ctx.fill(s.path, "evenodd");
    ctx.globalAlpha = .28; ctx.fillStyle = TER[s.t].col; ctx.fill(s.path, "evenodd");
    const p = presence[s.i];
    if (p) { let best = -1, bv = 0; for (const o in p) if (p[o] > bv) { bv = p[o]; best = +o; } ctx.globalAlpha = .22; ctx.fillStyle = G.nations[best].color; ctx.fill(s.path, "evenodd"); }
    ctx.globalAlpha = 1;
  }
  for (const s of W.regions) {
    const r = G.regions[s.i];
    if (r.ctrl >= 0 && atWar(me, r.ctrl) && !fogged(s.i)) { ctx.save(); ctx.clip(s.path, "evenodd"); ctx.strokeStyle = "rgba(120,0,0,.28)"; ctx.lineWidth = 3 / k; ctx.beginPath();
      const x0 = s.lx - 200, y0 = s.ly - 200; const st = 9 / Math.max(1, k / 2); for (let i = 0; i < 400; i += st) { ctx.moveTo(x0 + i, y0); ctx.lineTo(x0 + i - 200, y0 + 200); ctx.moveTo(x0 + i, y0 + 200); ctx.lineTo(x0 + i - 200, y0 + 400); } ctx.stroke(); ctx.restore(); }
  }
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(120,130,150,.35)"; ctx.lineWidth = 1 / k;
  for (const s of W.regions) if (!fogged(s.i)) ctx.stroke(s.path);
  for (const s of W.regions) {
    const r = G.regions[s.i]; if (r.ctrl < 0 || fogged(s.i)) continue;
    const o = G.nations[r.ctrl];
    ctx.save(); ctx.clip(s.path, "evenodd"); ctx.strokeStyle = shade(o.color, -.35); ctx.globalAlpha = .6; ctx.lineWidth = 3.2 / k; ctx.stroke(s.path); ctx.restore();
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
  if (k < 3.2) {
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
  const x0 = -view.x / k - 3, y0 = -view.y / k - 3, x1 = (cw - view.x) / k + 3, y1 = (ch - view.y) / k + 3;
  const lw = Math.max(.12, 1 / k);
  // pass 1: tiny dots for settlements too small to show their shape
  for (const s of G.sets) {
    if (s.x < x0 || s.x > x1 || s.y < y0 || s.y > y1 || fogged(s.r)) continue;
    const z = SET_SIZE[s.t];
    if (z * k >= 3) continue;
    const n = G.nations[s.o];
    ctx.fillStyle = G.regions[s.r].ctrl === s.o ? shade(n.color, .7) : shade(n.color, -.15);
    ctx.beginPath(); ctx.arc(s.x, s.y, Math.max(z, 1.1 / k), 0, Math.PI * 2); ctx.fill();
  }
  // pass 2: full shapes, drawn smallest first so cities sit on top
  ctx.lineJoin = "round";
  for (let t = 0; t < 3; t++) for (const s of G.sets) {
    if (s.t !== t || s.x < x0 || s.x > x1 || s.y < y0 || s.y > y1 || fogged(s.r)) continue;
    const z = SET_SIZE[t]; if (z * k < 3) continue;
    const n = G.nations[s.o], home = G.regions[s.r].ctrl === s.o, base = home ? shade(n.color, .62) : n.color;
    shapePath(t, s.x, s.y + z * .22, z); ctx.fillStyle = "rgba(20,30,60,.3)"; ctx.fill();
    shapePath(t, s.x, s.y, z);
    const g = ctx.createLinearGradient(s.x, s.y - z, s.x, s.y + z);
    g.addColorStop(0, shade(base, home ? .5 : .3)); g.addColorStop(1, shade(base, -.1));
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = Math.max(z * .22, lw); ctx.strokeStyle = home ? shade(n.color, -.45) : "#fff"; ctx.stroke();
    if (s.crowd && s.o === me) { shapePath(t, s.x, s.y, z * 1.55); ctx.lineWidth = Math.max(z * .12, lw * .8); ctx.strokeStyle = "rgba(230,154,11,.95)"; ctx.stroke(); }
    if (n.cap === s.id) { starPath(s.x + z * .95, s.y - z * .95, z * .62); ctx.fillStyle = "#ffc93c"; ctx.fill(); ctx.lineWidth = Math.max(z * .1, lw * .7); ctx.strokeStyle = "#7a4b00"; ctx.stroke(); }
    if ((t >= 1 && z * k > 9) || z * k > 13) {
      const fs = clamp(1.1 * k, 9, 13) / k;
      ctx.font = `800 ${fs}px Nunito, system-ui, sans-serif`; ctx.lineWidth = fs * .3; ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.fillStyle = "#1d2a4d";
      const txt = `${s.name} · ${fmt(s.pop)}`, ty = s.y + z * 1.25 + fs * .7;
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
    const nk = clamp(pinch.k * d / pinch.d, minK(), 24), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
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
  view.k = clamp(view.k * Math.exp(-e.deltaY * .0015), minK(), 24); view.x = e.clientX - rect.left - mx * view.k; view.y = e.clientY - rect.top - my * view.k; clampView(); dirty = true; }, { passive: false });
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
$("zhome").onclick = () => { if (G && P().alive) { const c = capSet(P()); if (c) centerOn(c.x, c.y, Math.max(view.k, 6)); } };
function zoomBy(f) { const cx = cw / 2, cy = ch / 2, mx = (cx - view.x) / view.k, my = (cy - view.y) / view.k; view.k = clamp(view.k * f, minK(), 24); view.x = cx - mx * view.k; view.y = cy - my * view.k; clampView(); dirty = true; }

// ================= UI =================
const sheet = $("sheet"), panel = $("panel"), modal = $("modal");
function hud() {
  const n = P(), E = econ(n);
  $("hName").textContent = nm(n);
  $("hFlag").style.background = n.color;
  $("hYear").textContent = `${G.year < 0 ? -G.year + " BCE" : G.year + " CE"} · ${ERAS[n.era]} · Turn ${G.turn}`;
  const sets = setsOf(n), full = sets.filter(s => s.crowd).length;
  $("cPop").innerHTML = `<span class="ci">👥</span><b>${fmtP(E.pop)}</b><i>${full ? `${full} overcrowded` : `${sets.length} settlement${sets.length > 1 ? "s" : ""}`}</i>`;
  $("cPop").classList.toggle("warnchip", full > 0);
  $("cGold").innerHTML = `<span class="ci">🪙</span><b>${fmt(n.gold)}</b><i class="${E.goldNet < 0 ? "neg" : ""}">${sgn(E.goldNet)}</i>`;
  $("cMat").innerHTML = `<span class="ci">🪵</span><b>${fmt(n.mat)}</b><i>${sgn(E.mat)}</i>`;
  const t = n.research ? TECH[n.research] : null;
  $("cSci").innerHTML = t ? `<span class="ci">🔬</span><b>${Math.min(99, Math.floor(n.sciPts / t.cost * 100))}%</b><i>${esc(t.name)}</i>` : `<span class="ci">🔬</span><b>—</b><i>Pick research</i>`;
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
function setRow(s, n) {
  const o = G.nations[s.o], mine = s.o === n.id, cap = capOf(s, o), full = s.pop >= cap * (s.t ? .6 : .94);
  let acts = "";
  if (mine) {
    const biggest = setsOf(n).filter(x => x.r === s.r && x.t === 0).sort((a, b) => b.pop - a.pop)[0];
    if (s.t === 0 && biggest === s) { const c = townCheck(n, s);
      acts += `<button class="btn small" data-act="town" data-s="${s.id}" ${c.ok ? "" : "disabled"}>🏘️ Merge ${VILLAGES_FOR_TOWN} villages into a town · ${costTxt(townCost(n))}</button><span class="why">${c.ok ? `Merges ${esc(s.name)} with ${c.mates.map(m => esc(m.name)).join(", ")} (${fmtP(s.pop + c.mates.reduce((a, m) => a + m.pop, 0))} people)` : esc(c.why || "")}</span>`; }
    else if (s.t === 1) { const c = cityCheck(n, s);
      acts += `<button class="btn small" data-act="city" data-s="${s.id}" ${c.ok ? "" : "disabled"}>🏙️ Upgrade to city · ${costTxt(cityCost(n))}</button>${c.ok || !c.why ? "" : `<span class="why">${esc(c.why)}</span>`}`; }
  } else if (atWar(n.id, o.id) && canReach(n, s.r)) {
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
  const here = setsIn(ri).sort((a, b) => (b.o === n.id) - (a.o === n.id) || b.t - a.t || b.pop - a.pop);
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
  // buildings
  if (mine.length) {
    const b = B(n.id, ri), built = Object.keys(b), cons = consOf(n.id, ri), slots = bldSlots(n, ri), used = bldUsed(n, ri);
    h += `<h4>Your buildings <span class="muted small">${used}/${slots} slots</span></h4><div class="blds">${built.length ? built.map(k => `<span class="bchip" title="${esc(BK[k].d)}">${BK[k].icon} ${BK[k].name}</span>`).join("") : '<span class="muted">None yet</span>'}${cons ? `<span class="bchip building">🔨 ${BK[cons].name} (next turn)</span>` : ""}</div>`;
    const avail = BLD.filter(x => buildCheck(n, ri, x));
    if (cons) h += `<p class="small muted">One construction at a time per territory.</p>`;
    else if (used >= slots) h += `<p class="note">No building slots left. Each town here adds 1 slot and each city adds 2.</p>`;
    else if (avail.length) h += `<div class="opts">` + avail.map(x => { const c = buildCost(n, x);
      return `<button class="opt" data-act="build" data-k="${x.k}" ${afford(n, c) ? "" : "disabled"}><span class="oi">${x.icon}</span><span class="ot"><b>${x.name}</b><small>${esc(x.d)} · upkeep ${x.up}🪙</small></span><span class="oc">${costTxt(c)}</span></button>`; }).join("") + `</div>`;
    else h += `<p class="small muted">Research more technologies to unlock buildings.</p>`;
  }
  const others = [...new Set(here.filter(s => s.o !== n.id).map(s => s.o))].concat(ctrl && ctrl.id !== n.id && !here.some(s => s.o === ctrl.id) ? [ctrl.id] : []);
  for (const id of others) { const o = G.nations[id]; if (!atWar(n.id, id)) h += `<div class="opts"><button class="opt" data-act="diplo" data-id="${id}"><span class="oi">🤝</span><span class="ot"><b>Diplomacy with ${esc(o.name)}</b><small>Trade, alliances, gifts or war</small></span></button></div>`; }
  sheet.innerHTML = h; sheet.hidden = false; sheet.dataset.ri = ri; sheet.scrollTop = 0;
}
function closeSheet() { sheet.hidden = true; sel = -1; dirty = true; }
sheet.addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (!b || b.disabled) return;
  const ri = +sheet.dataset.ri, n = P(), a = b.dataset.act;
  const keep = sheet.scrollTop;
  if (a === "close") return closeSheet();
  if (a === "build") { startBuild(n, ri, BK[b.dataset.k]); toast(`${BK[b.dataset.k].name} under construction`); }
  else if (a === "found") { const fc = foundCheck(n, ri); if (fc.ok) { const s = foundVillage(n, ri, fc.donor); G.news = []; toast(`Founded ${s.name}`); updateContacts(); updateExplore(); G.news = []; } }
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
      <p>${TIERS[s.t].name} of ${fmtP(s.pop)} people. Defense strength <b>${fmt(defenseOf(s).power)}</b>. Each of your regiments brings <b>${fmt(unitPower(n))}</b>.</p>
      <label class="slider"><span>Regiments to send: <b>${k}</b> of ${av}</span><input id="ak" type="range" min="1" max="${av}" value="${k}"></label>
      <div class="odds"><div class="bar big"><i style="width:${p * 100}%;background:${p > .66 ? "var(--good)" : p > .4 ? "var(--warn)" : "var(--bad)"}"></i></div><b>${Math.round(p * 100)}% chance to win</b></div>
      <div class="row"><button class="btn ghost" data-m="cancel">Cancel</button><button class="btn red" data-m="go">Attack!</button></div>`, a => {
        if (a === "go") { const res = attack(n, s, k); const notes = G.news.filter(x => /territory|now the|fell/.test(x.t)).map(x => x.t); G.news = []; hud(); closeSheet();
          showModal(`<div class="mi">${res.win ? "🚩" : "🛡️"}</div><h2>${res.win ? "Victory!" : "Repelled"}</h2><p>${res.win ? `${esc(s.name)} is yours.` : `The defenders of ${esc(s.name)} held.`} You lost ${res.aLoss} regiment${res.aLoss === 1 ? "" : "s"}; they lost ${res.dLoss}.</p>${notes.map(t => `<p><b>${esc(t)}</b></p>`).join("")}<div class="row"><button class="btn" data-m="ok">OK</button></div>`);
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
  panel.innerHTML = { nation: panelNation, research: panelResearch, policy: panelPolicy, world: panelWorld }[name]();
  panel.hidden = false; panel.scrollTop = 0;
}
function closePanel() { panel.hidden = true; curPanel = null; document.querySelectorAll(".tab").forEach(t => t.classList.remove("on")); }
function refresh() { hud(); dirty = true; if (curPanel) { const st = panel.scrollTop; openPanel(curPanel); panel.scrollTop = st; } }
const ph = (title, sub) => `<div class="p-head"><div><h2>${title}</h2>${sub ? `<div class="sub">${sub}</div>` : ""}</div><button class="x" data-act="pclose" aria-label="Close">✕</button></div>`;
const line = (label, v, cls = "") => `<div class="ln ${cls}"><span>${label}</span><b>${v}</b></div>`;

function panelNation() {
  const n = P(), E = econ(n), sets = setsOf(n), uc = unitCost(n), ma = maxArmy(n);
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
  h += `<div class="card"><h4>Treasury <span class="muted">per turn</span></h4>
    ${line("Taxes", sgn(E.tax))}${line("Trade (automatic)", sgn(E.routeGold))}${line("Luxury exports", sgn(E.luxGold))}${E.foodGold ? line("Surplus food sold", sgn(E.foodGold)) : ""}
    ${line("Building upkeep", sgn(-E.bUp))}${line("Army upkeep", sgn(-E.armyUp))}${E.imports ? line("Resource imports", sgn(-E.imports)) : ""}${E.govUp ? line("Overextension costs", sgn(-E.govUp), "bad") : ""}
    ${line("Net gold", sgn(E.goldNet), E.goldNet < 0 ? "bad total" : "good total")}
    ${line("Materials", sgn(E.mat))}${line("Science", sgn(E.sci))}${line("Food", `${fmtP(E.food)} grown / ${fmtP(E.need)} eaten`, E.surplus < 0 ? "bad" : "")}</div>`;
  h += `<div class="card"><h4>Trade & Resources <span class="pill">Run by your merchants</span></h4>
    <p class="muted small">Your merchants trade on their own. Towns, cities, Harbors, Roads, Markets, trade pacts and the Trade law all earn more.</p>
    ${line("Trade partners (pacts)", E.partners.length ? E.partners.map(o => esc(o.name)).join(", ") : "None")}
    ${line("Friendly contacts", E.peaceful)}
    ${line("Luxuries reached", Object.keys(E.luxCount).length ? Object.entries(E.luxCount).map(([k, c]) => `${RES[k].icon}${c > 1 ? "×" + c : ""}`).join(" ") : "None")}
    ${E.strat.map(s => line(`${RES[s.res].icon} ${RES[s.res].name} for the army`, s.st === "have" ? '<span class="good">Own supply</span>' : s.st === "import" ? `<span class="warn">Imported from ${esc(s.from.name)} (−${s.cost}🪙)</span>` : `<span class="bad">Missing${s.pen ? ` (−${s.pen * 100}% army)` : ""}</span>`)).join("")}</div>`;
  h += `<div class="card"><h4>Army</h4>
    ${line("Regiments", `${n.army} / ${ma} max`)}${line("Strength per regiment", fmt(unitPower(n)))}${line("Total strength", fmt(power(n)))}${line("Ready to fight this turn", n.army - n.used)}
    <div class="row wrap">${[1, 3].map(k => { const c = { g: uc.g * k, m: uc.m * k }; return `<button class="btn small" data-act="recruit" data-k="${k}" ${afford(n, c) && n.army + k <= ma ? "" : "disabled"}>Recruit ${k} · ${costTxt(c)}</button>`; }).join("")}
    <button class="btn small ghost" data-act="disband" ${n.army > 0 ? "" : "disabled"}>Disband 1</button></div>
    <p class="muted small">Upkeep ${fmt(unitUpkeep(n))} gold per regiment each turn. Bigger populations and the Conscription law raise your maximum.</p></div>`;
  h += `<div class="card"><h4>Paths to victory</h4>
    ${line("🚀 Reach Mars (research Mars Colony)", has(n, "rocketry") ? ([...pres(n)].some(ri => B(n.id, ri).spaceport) ? "Spaceport ready" : "Build a Spaceport") : ERAS[n.era])}
    ${line("🌍 Control 40% of the world", `${terr.length} / ${Math.ceil(NR * .4)} territories`)}
    ${line("⌛ Lead the world in 2100", `#${ranking().findIndex(x => x.id === n.id) + 1} by score`)}</div>`;
  h += `<div class="card"><h4>Your settlements</h4><div class="rlist">${sets.sort((a, b) => b.t - a.t || b.pop - a.pop).slice(0, 60).map(s => `<button class="rl" data-act="goto" data-sid="${s.id}"><span>${TIERS[s.t].icon} ${s.id === n.cap ? "⭐ " : ""}${esc(s.name)}</span><small>${esc(W.regions[s.r].n)} · ${fmtP(s.pop)}${s.crowd ? ' · <span class="bad">overcrowded</span>' : ""}${s.u > 50 ? ' · <span class="bad">unrest</span>' : ""}</small></button>`).join("")}</div></div>`;
  h += `<div class="card"><h4>Game</h4><div class="row wrap"><button class="btn small ghost" data-act="help">How to play</button><button class="btn small ghost" data-act="newgame">New game</button></div></div>`;
  return h;
}
function panelResearch() {
  const n = P(), E = econ(n);
  let h = ph("Research", `${fmt(E.sci)} science per turn · ${ERAS[n.era]}`);
  if (n.era < 7) { const got = eraTechs(n.era).filter(t => has(n, t.id)).length;
    h += `<div class="card"><div class="bar-row"><small>Next age</small><div class="bar"><i style="width:${got / eraNeed(n.era) * 100}%;background:var(--accent)"></i></div><span>${got}/${eraNeed(n.era)}</span></div><p class="muted small">Discover ${eraNeed(n.era)} technologies of the ${ERAS[n.era]} to enter the ${ERAS[n.era + 1]}. Towns and cities produce far more science than villages.</p></div>`; }
  { const rate = +(3 * Math.pow(1.3, n.era)).toFixed(1), fg = Math.round(40 * Math.pow(1.7, n.era)), fs = Math.round(fg / rate);
    h += `<div class="card"><h4>Fund your scientists</h4><p class="muted small">Turn spare gold into research. ${rate} gold buys 1 science.</p><div class="row wrap">${[1, 4].map(k => `<button class="btn small" data-act="fund" data-g="${fg * k}" data-s="${fs * k}" ${n.gold >= fg * k ? "" : "disabled"}>🪙${fmt(fg * k)} → 🔬${fmt(fs * k)}</button>`).join("")}</div></div>`; }
  h += `<label class="toggle"><input type="checkbox" id="autoR" ${n.autoResearch ? "checked" : ""}> Let advisors pick the next research automatically</label>`;
  const order = [n.era, n.era + 1].filter(e => e <= 7);
  for (let e = n.era - 1; e >= 0; e--) order.push(e);
  for (const e of order) {
    if (e === n.era - 1) h += `<details class="past"><summary class="era-h">Earlier ages</summary>`;
    h += `<h4 class="era-h">${ERAS[e]}${e === n.era ? " · now" : e === n.era + 1 ? " · next" : ""}</h4><div class="techs">`;
    for (const t of TECHS.filter(t => t.era === e)) {
      const done = has(n, t.id), cur = n.research === t.id, locked = e > n.era || (t.id === "mars" && ![...pres(n)].some(ri => B(n.id, ri).spaceport));
      const pct = cur ? Math.min(100, n.sciPts / t.cost * 100) : 0;
      h += `<button class="tech ${done ? "done" : cur ? "cur" : locked ? "locked" : ""}" data-act="tech" data-t="${t.id}" ${done || locked ? "disabled" : ""}>
        <b>${t.name}</b><small>${t.desc}</small><span class="tc">${done ? "✓ Known" : cur ? `${Math.floor(pct)}% · ${Math.max(1, Math.ceil((t.cost - n.sciPts) / Math.max(.1, E.sci)))} turns` : locked ? (e > n.era ? "Next age" : "Needs Spaceport") : `${t.cost} 🔬`}</span>${cur ? `<i class="tp" style="width:${pct}%"></i>` : ""}</button>`;
    }
    h += `</div>`;
  }
  if (n.era > 0) h += `</details>`;
  return h;
}
function panelPolicy() {
  const n = P(), E = econ(n), tg = facTargets(n, E);
  let h = ph("Government & Laws", `Stability ${Math.round(n.stab)} · ${GOVS[n.gov].name}`);
  if (n.opposition) h += `<p class="note warn">The opposition controls the legislature for ${n.opposition} more turn${n.opposition > 1 ? "s" : ""}. Laws are locked.</p>`;
  if (n.anarchy) h += `<p class="note warn">Your government is in transition (${n.anarchy} turn${n.anarchy > 1 ? "s" : ""}). Output is reduced.</p>`;
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
    if (!n.laws[lk]) n.laws[lk] = Object.keys(L.opts)[0];
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
  if (kind === "peace") return wscore(o.id, n.id) < -6 || G.turn - d.wt > 8 && wscore(o.id, n.id) < 8 || ratio > 1.8;
  if (kind === "tribute") return ratio > 1.6 && d.rel < 40 + ratio * 10;
  return false;
}
function openNationDetail(id) {
  const n = P(), o = G.nations[id], d = dip(n.id, id);
  closeSheet(); curPanel = "world";
  const g = Math.round(12 * Math.pow(1.6, n.era)), trib = Math.round(20 * Math.pow(1.6, o.era));
  let h = ph(`<span class="sw big" style="background:${o.color}"></span> ${esc(nm(o))}`, `${GOVS[o.gov].name} · ${ERAS[o.era]} · ${PERS[o.pers]}`);
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
    const blocked = n.opposition > 0 ? "The opposition blocks war" : d.truce > 0 ? `Truce for ${d.truce} more turns` : "";
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
    case "recruit": recruit(n, +b.dataset.k); toast(`Recruited ${b.dataset.k} regiment${b.dataset.k > 1 ? "s" : ""}`); refresh(); break;
    case "disband": n.army--; refresh(); break;
    case "goto": { const s = setById(+b.dataset.sid); closePanel(); sel = s.r; centerOn(s.x, s.y, Math.max(view.k, 7)); openRegion(s.r); break; }
    case "tech": n.research = b.dataset.t; refresh(); break;
    case "fund": { const g = +b.dataset.g, sc = +b.dataset.s; n.gold -= g; n.sciPts += sc; toast(`+${fmt(sc)} science`); refresh(); break; }
    case "gov": confirmModal(`Switch to ${GOVS[b.dataset.g].name}?`, "Your people will go through 2 turns of turmoil with reduced output, and factions will need time to adjust.", () => { n.gov = b.dataset.g; n.anarchy = 2; n.govCool = 10; n.lastElect = G.turn; log(`Your people now live under a ${GOVS[n.gov].name}.`, "🏛️"); refresh(); }); break;
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
panel.addEventListener("change", e => { if (e.target.id === "autoR") { P().autoResearch = e.target.checked; if (e.target.checked && !P().research) P().research = chooseResearch(P()); refresh(); } });
document.querySelectorAll(".tab").forEach(t => t.onclick = () => { if (curPanel === t.dataset.p) closePanel(); else openPanel(t.dataset.p); });

// ---------- modals ----------
let modalCb = null;
function showModal(html, cb) { modal.querySelector(".mbox").innerHTML = html; modal.hidden = false; modalCb = cb || null; }
modal.addEventListener("click", e => { const b = e.target.closest("[data-m]"); if (!b || b.disabled) return; const a = b.dataset.m; const cb = modalCb; modal.hidden = true; modalCb = null; if (cb) cb(a); });
function confirmModal(title, text, yes) { showModal(`<h2>${esc(title)}</h2><p>${esc(text)}</p><div class="row"><button class="btn ghost" data-m="no">Cancel</button><button class="btn" data-m="yes">Confirm</button></div>`, a => { if (a === "yes") yes(); }); }
let toastT = 0;
function toast(t) { const el = $("toast"); el.textContent = t; el.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove("on"), 1900); }

function afterTurnFlow() {
  hud(); dirty = true;
  if (G.over) return showEnd();
  const items = G.lastReport.filter(x => x.p !== false); G.lastReport = [];
  const showEvent = () => {
    if (!G.event) return;
    const e = EVENTS.find(x => x.id === G.event.id), n = P();
    showModal(`<div class="mi">${e.icon}</div><h2>${e.title}</h2><p>${esc(G.event.text)}</p><div class="choices">${e.ch.map((c, i) => `<button class="choice" data-m="c${i}"><b>${esc(c.t)}</b><small>${esc(c.d(n))}</small></button>`).join("")}</div>`, a => {
      const c = e.ch[+a.slice(1)]; G.news = []; c.f(n); G.event = null; n.stab = stabilityOf(n, n.fac); save(); refresh(); });
  };
  if (items.length) showModal(`<h2>${G.year < 0 ? -G.year + " BCE" : G.year + " CE"}</h2><div class="news">${items.map(x => `<div class="nw ${x.p === true || x.p === null ? "" : "far"}"><span>${x.i}</span><p>${esc(x.t)}</p></div>`).join("")}</div><div class="row"><button class="btn" data-m="ok">Continue</button></div>`, showEvent);
  else showEvent();
  if (G.pendingPeace) toast("A peace offer awaits in World");
}
$("endTurn").onclick = () => {
  if (!G || G.over || G.demo) return;
  if (G.event) return afterTurnFlow();
  const btn = $("endTurn"); btn.disabled = true; btn.classList.add("busy");
  setTimeout(() => { try { endTurn(); } finally { btn.disabled = false; btn.classList.remove("busy"); } const keep = !sheet.hidden ? +sheet.dataset.ri : -1; if (curPanel) refresh(); else if (keep >= 0) openRegion(keep); afterTurnFlow(); }, 30);
};
function showEnd() {
  const o = G.outcome;
  showModal(`<div class="mi">${o.win ? "🏆" : "🏚️"}</div><h2>${o.win ? "Victory!" : "The End"}</h2><p>${esc(o.why)}</p><p class="muted">Final score ${score(P())} · Turn ${G.turn} · ${G.year < 0 ? -G.year + " BCE" : G.year + " CE"}</p><div class="row"><button class="btn ghost" data-m="look">Look at the map</button><button class="btn" data-m="new">New game</button></div>`,
    a => { if (a === "new") { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} G = null; showTitle(); } });
}
function showHelp() {
  showModal(`<h2>How to play</h2><div class="help">
  <p><b>Goal.</b> Grow a single village into a world power. Win by founding a colony on Mars, controlling 40% of the world's territories, or leading in score when 2100 arrives.</p>
  <p><b>Villages.</b> You start with one village of ${START_POP} people. A village holds at most ${VILLAGE_CAP}, a town 3,000, and a city more with each age. When a settlement is full, people move outward and form new villages nearby on their own (as long as there's food and free land). You can also <b>Send settlers</b> to steer where your people go, or restrict migration in Laws.</p>
  <p><b>Towns & cities.</b> ${VILLAGES_FOR_TOWN} villages close together (in one territory or neighboring ones) can merge into one town with all their people (needs Agriculture). Each new town also needs your nation to reach a population target. Towns grow into the thousands, and at ${fmtP(CITY_POP)} people they can become cities (needs Masonry). Bigger settlements produce much more gold, materials and science.</p>
  <p><b>Room.</b> Each territory has room for a set number of settlements and of towns and cities, based on its size and land. Big fertile plains hold the most.</p>
  <p><b>Territory & rank.</b> ${TOWNS_TO_CLAIM} towns or cities in a territory make it yours. Controlling 1 territory makes you a Nation, 2–3 a Kingdom, and 4 or more an Empire.</p>
  <p><b>Your nation runs itself.</b> Food is shared, merchants trade and resources are imported automatically. You steer with settlements, buildings, laws, research and diplomacy.</p>
  <p><b>Stability.</b> Factions like Commoners, Clergy, Nobles and Merchants each want different things. Keep them happy or face unrest, revolts, coups and lost elections.</p>
  <p><b>War.</b> Declare war in World, then tap enemy settlements you can reach to attack them. Capturing towns can flip whole territories.</p>
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
$("btnContinue").onclick = () => { const s = loadSave(); if (!s) return; G = s; reachCache.clear(); if (!G.exp) { G.exp = new Array(NR).fill(0); updateExplore(); } startPlaying(); };
$("btnNew").onclick = () => openSetup();
$("btnHelp").onclick = () => showHelp();
function openSetup() {
  $("title").hidden = true; $("setup").hidden = false;
  setupState = { name: genName(), color: COLORS[0], start: "Lower Egypt", diff: 1 };
  renderSetup();
}
function renderSetup() {
  const st = setupState, ri = RID[st.start], s = W.regions[ri];
  $("sName").value = st.name;
  $("sColors").innerHTML = COLORS.slice(0, 12).map(c => `<button class="sw pick ${c === st.color ? "on" : ""}" style="background:${c}" data-c="${c}" aria-label="Color ${c}"></button>`).join("");
  $("sStarts").innerHTML = CRADLES.filter(c => RID[c] !== undefined).map(c => `<button class="${c === st.start ? "on" : ""}" data-s="${esc(c)}">${esc(c)}</button>`).join("");
  $("sInfo").innerHTML = `<b>${esc(s.n)}</b> · ${TER[s.t].name}${s.r ? ` · ${RES[s.r].icon} ${RES[s.r].name}` : ""}${s.c ? " · Coastal" : ""} · room for ${s.slots} settlements and ${s.urban} towns or cities`;
  $("sDiff").querySelectorAll("button").forEach(b => b.classList.toggle("on", +b.dataset.d === st.diff));
  G.setup = true; sel = ri; centerRegion(ri, Math.max(minK() * 2.2, 2.5));
}
$("sName").oninput = e => { setupState.name = e.target.value.slice(0, 18); };
$("sColors").onclick = e => { const b = e.target.closest("[data-c]"); if (b) { setupState.color = b.dataset.c; renderSetup(); } };
$("sStarts").onclick = e => { const b = e.target.closest("[data-s]"); if (b) { setupState.start = b.dataset.s; renderSetup(); } };
$("sDiff").onclick = e => { const b = e.target.closest("[data-d]"); if (b) { setupState.diff = +b.dataset.d; renderSetup(); } };
$("sRandomName").onclick = () => { setupState.name = genName(); renderSetup(); };
function setupPick(ri) { setupState.start = W.regions[ri].n; renderSetup(); }
$("sBack").onclick = () => { $("setup").hidden = true; G.setup = false; sel = -1; showTitle(); };
$("sGo").onclick = () => {
  const st = setupState; const name = (st.name || "").trim() || genName();
  $("setup").hidden = true; G = null;
  newGame({ name: name.replace(/^\w/, c => c.toUpperCase()), color: st.color, start: st.start, diff: st.diff });
  G.lastReport = []; save();
  startPlaying(true);
};
function startPlaying(fresh) {
  $("title").hidden = true; $("setup").hidden = true; $("game").classList.remove("dim");
  G.setup = false; sel = -1;
  const c = capSet(P()) || G.sets[0];
  if (c) centerOn(c.x, c.y, Math.max(minK() * 4, 7));
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
  if (data && data.G && data.G.v === 2) { G = data.G; reachCache.clear(); if (!G.exp) { G.exp = new Array(NR).fill(0); updateExplore(); } startPlaying(); } else showTitle();
  requestAnimationFrame(loop);
}
window.__c2c = { get G() { return G; }, focus: (x, y, k) => centerOn(x, y, k), newGame, endTurn, aiTurn, econ, P, setsOf, terrCount, popOf, TECHS, score, ranking, dip, aiAccept, makePeace, atWar, foundCheck, foundVillage, townCheck, cityCheck, upgrade, bestVillageSpot };
const hot = window.claude?.hot;
hot?.ready ? hot.ready(start) : start(hot?.data ?? {});
})();
