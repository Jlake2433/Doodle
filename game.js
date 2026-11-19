/* Cradle to Cosmos: a nation-building strategy game from the Stone Age to Mars. */
(() => {
"use strict";
const W = window.WORLD;
const NR = W.regions.length;
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const rnd = () => Math.random();
const pick = a => a[Math.floor(rnd() * a.length)];
const fmt = v => { const a = Math.abs(v); return a >= 1e6 ? (v / 1e6).toFixed(1) + "M" : a >= 1e4 ? (v / 1e3).toFixed(0) + "k" : a >= 1e3 ? (v / 1e3).toFixed(1) + "k" : a >= 100 ? Math.round(v) + "" : a >= 10 ? v.toFixed(0) : v.toFixed(1); };
const sgn = v => (v >= 0 ? "+" : "−") + fmt(Math.abs(v));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// ================= STATIC DATA =================
const ERAS = ["Stone Age", "Bronze Age", "Classical Age", "Medieval Age", "Renaissance", "Industrial Age", "Modern Age", "Information Age"];
const YEARS_PER_TURN = [40, 88, 52, 38, 12, 6, 4, 3];
const ERA_POW = [1, 1.6, 2.6, 4, 6.5, 11, 18, 30];
const TECH_BASE = [16, 40, 90, 190, 380, 700, 1200, 2000];
const ERA_YEAR = [-4000, -3000, -800, 500, 1450, 1750, 1900, 1990, 2100];

const TER = {
  grass:    { name: "Fertile lowlands", food: 1.5, prod: 1.0, gold: 1.0, cap: 7,   col: "#a6d870" },
  plains:   { name: "Plains",           food: 1.25, prod: 1.2, gold: 1.0, cap: 6,   col: "#d3e08c" },
  forest:   { name: "Forest",           food: 0.95, prod: 1.6, gold: 0.8, cap: 4.5, col: "#86c46f" },
  jungle:   { name: "Jungle",           food: 1.05, prod: 1.0, gold: 1.1, cap: 4.5, col: "#64b375" },
  steppe:   { name: "Steppe",           food: 1.0, prod: 1.0, gold: 0.9, cap: 4.5, col: "#e6d892" },
  desert:   { name: "Desert",           food: 0.55, prod: 1.0, gold: 1.3, cap: 2.5, col: "#f3dca6" },
  tundra:   { name: "Tundra",           food: 0.5, prod: 1.1, gold: 0.7, cap: 2.2, col: "#e3ebee" },
  mountain: { name: "Mountains",        food: 0.7, prod: 1.8, gold: 1.0, cap: 3.2, col: "#cdb99d" },
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
// which strategic resources an era's army needs, and the penalty without them
const STRAT_NEED = [
  { res: "horses",  from: 0, to: 4, bonus: 0.15, need: false },
  { res: "copper",  from: 1, to: 1, pen: 0.15, need: true },
  { res: "iron",    from: 2, to: 5, pen: 0.2, need: true },
  { res: "coal",    from: 5, to: 7, pen: 0.1, need: true },
  { res: "oil",     from: 6, to: 7, pen: 0.25, need: true },
  { res: "uranium", from: 7, to: 7, bonus: 0.1, need: false },
];

const TECHS = [
  ["agriculture", 0, "Agriculture", "Farms grow more food."],
  ["pottery", 0, "Pottery", "Granaries let regions hold more people."],
  ["husbandry", 0, "Animal Husbandry", "Pastures; horses strengthen your warriors."],
  ["mining", 0, "Mining", "Mines dig up materials. Copper becomes usable."],
  ["mysticism", 0, "Mysticism", "Shrines calm your people."],
  ["tribal", 0, "Tribal Law", "Unlocks the Chiefdom government."],
  ["bronze", 1, "Bronze Working", "Barracks. Armies need copper."],
  ["writing", 1, "Writing", "Libraries and the Science focus."],
  ["masonry", 1, "Masonry", "Walls defend your regions."],
  ["sailing", 1, "Sailing", "Harbors. You can cross short stretches of sea."],
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
  ["navigation", 4, "Navigation", "Shipyards. Cross oceans to distant coasts."],
  ["printing", 4, "Printing Press", "Universities and the Press law."],
  ["gunpowder", 4, "Gunpowder", "+15% army strength."],
  ["banking", 4, "Banking", "Banks boost gold."],
  ["absolutism", 4, "Absolutism", "Unlocks the Empire government."],
  ["enlightenment", 4, "Enlightenment", "Unlocks Secular religion law."],
  ["steam", 5, "Steam Power", "Factories (need coal) and the Labor law."],
  ["railroad", 5, "Railroad", "Railways boost trade and materials."],
  ["democracy", 5, "Democracy", "Unlocks the Democracy government."],
  ["medicine", 5, "Medicine", "Hospitals: bigger, happier regions."],
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
TECHS.forEach(t => { const k = TECHS.filter(x => x.era === t.era).indexOf(t); t.cost = Math.round(TECH_BASE[t.era] * (1 + 0.08 * k)); });
TECH.mars.cost = 5000;
const eraTechs = e => TECHS.filter(t => t.era === e && t.id !== "mars");
const eraNeed = e => eraTechs(e).length - 1;

const BLD = [
  { k: "farm", name: "Farm", icon: "🌾", tech: "agriculture", food: .35, cap: .15, d: "+35% food, +15% room" },
  { k: "granary", name: "Granary", icon: "🏺", tech: "pottery", cap: .25, d: "+25% room to grow" },
  { k: "pasture", name: "Pasture", icon: "🐑", tech: "husbandry", food: .15, prod: .1, d: "+15% food, +10% materials" },
  { k: "mine", name: "Mine", icon: "⛏️", tech: "mining", prod: .4, d: "+40% materials (+30% more on metals)" },
  { k: "shrine", name: "Shrine", icon: "🗿", tech: "mysticism", stab: 1, d: "Calms the region, pleases Elders" },
  { k: "barracks", name: "Barracks", icon: "🛡️", tech: "bronze", pow: .03, d: "+3% army strength, more recruits" },
  { k: "library", name: "Library", icon: "📜", tech: "writing", sci: .3, sciF: 1, d: "+30% science, +1 flat" },
  { k: "walls", name: "Walls", icon: "🧱", tech: "masonry", def: .4, d: "+40% defense" },
  { k: "harbor", name: "Harbor", icon: "⚓", tech: "sailing", coastal: true, food: .2, trade: 2, d: "+20% food, +2 trade" },
  { k: "road", name: "Roads", icon: "🛤️", tech: "wheel", trade: 1, gold: .1, unrest: 6, admin: .3, d: "+1 trade, +10% gold, less unrest" },
  { k: "market", name: "Market", icon: "🏪", tech: "currency", gold: .35, trade: 2, d: "+35% gold, +2 trade" },
  { k: "academy", name: "Academy", icon: "🏛️", tech: "philosophy", sci: .4, d: "+40% science" },
  { k: "aqueduct", name: "Aqueduct", icon: "🌉", tech: "construction", cap: .3, d: "+30% room to grow" },
  { k: "castle", name: "Castle", icon: "🏰", tech: "feudalism", def: .8, pow: .02, d: "+80% defense" },
  { k: "cathedral", name: "Cathedral", icon: "⛪", tech: "theology", stab: 2, d: "Big calm, pleases Clergy" },
  { k: "workshop", name: "Workshop", icon: "🔨", tech: "guilds", prod: .35, d: "+35% materials" },
  { k: "observatory", name: "Observatory", icon: "🔭", tech: "astronomy", sci: .4, d: "+40% science" },
  { k: "university", name: "University", icon: "🎓", tech: "printing", sci: .6, sciF: 2, d: "+60% science, pleases Intellectuals" },
  { k: "bank", name: "Bank", icon: "🏦", tech: "banking", gold: .4, d: "+40% gold" },
  { k: "shipyard", name: "Shipyard", icon: "⛵", tech: "navigation", coastal: true, trade: 4, pow: .02, d: "+4 trade, +2% army" },
  { k: "factory", name: "Factory", icon: "🏭", tech: "steam", prod: .8, stab: -.5, needs: "coal", d: "+80% materials (needs coal)" },
  { k: "railway", name: "Railway", icon: "🚂", tech: "railroad", trade: 3, prod: .2, admin: .5, d: "+3 trade, +20% materials" },
  { k: "hospital", name: "Hospital", icon: "🏥", tech: "medicine", cap: .35, stab: .5, d: "+35% room, calmer" },
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
BLD.forEach(b => { const e = TECH[b.tech].era; b.era = e; b.gold = b.gold || 0; b.cg = Math.round(22 * Math.pow(1.75, e)); b.cm = Math.round(18 * Math.pow(1.75, e)); b.up = +(0.35 * Math.pow(1.55, e)).toFixed(2); });
BK.spaceport.cg *= 4; BK.spaceport.cm *= 4;

const GOVS = {
  tribe:      { name: "Tribal Council", tech: null, admin: 3, w: { commoners: 2, elders: 1.5, warriors: 1.5 }, title: n => `Tribes of ${n}`, d: "Simple and steady." },
  chiefdom:   { name: "Chiefdom", tech: "tribal", admin: 5, pow: .1, w: { warriors: 2, elders: 1.5, commoners: 1 }, title: n => `Chiefdom of ${n}`, d: "+10% army strength, more regions." },
  monarchy:   { name: "Monarchy", tech: "monarchy", admin: 8, gold: .1, w: { nobles: 2.5, elders: 1.5, warriors: 1.5, commoners: 1 }, title: n => `Kingdom of ${n}`, d: "+10% gold. Nobles hold power." },
  republic:   { name: "Republic", tech: "republic", admin: 8, gold: .15, sci: .1, elect: 6, ww: 1.5, w: { merchants: 2.5, commoners: 1.5, nobles: 1 }, title: n => `Republic of ${n}`, d: "+15% gold, +10% science. Elections every 6 turns." },
  theocracy:  { name: "Theocracy", tech: "theology", admin: 9, stab: 10, sci: -.1, w: { elders: 3, commoners: 1.5, nobles: 1 }, title: n => `Holy ${n}`, d: "+10 stability, −10% science. Clergy rule." },
  empire:     { name: "Empire", tech: "absolutism", admin: 14, pow: .15, prod: .1, w: { nobles: 2, warriors: 2, commoners: 1 }, title: n => `${n} Empire`, d: "+15% army, +10% materials, many regions." },
  democracy:  { name: "Democracy", tech: "democracy", admin: 16, gold: .2, sci: .2, elect: 5, ww: 2, w: { commoners: 2, merchants: 1.5, intellectuals: 1.5, workers: 1.5 }, title: n => `Federation of ${n}`, d: "+20% gold and science. Elections; hates long wars." },
  party:      { name: "Single-Party State", tech: "ideology", admin: 18, prod: .25, pow: .15, sci: -.05, w: { warriors: 2.5, workers: 1.5, commoners: .7 }, title: n => `People's State of ${n}`, d: "+25% materials, +15% army. No elections." },
  technocracy:{ name: "Technocracy", tech: "computers", admin: 22, sci: .35, prod: .1, w: { intellectuals: 3, merchants: 1.5, workers: 1, commoners: 1 }, title: n => `${n} Technocracy`, d: "+35% science, +10% materials." },
};
const LAWS = {
  tax: { name: "Taxes", opts: { low: ["Low", null, "−30% tax gold. People love it."], normal: ["Normal", null, "Standard taxes."], high: ["High", null, "+35% tax gold. Unpopular."], extort: ["Extortionate", null, "+70% tax gold. Very unpopular."] } },
  cons: { name: "Conscription", opts: { vol: ["Volunteers", null, "Small army cap. People like it."], levy: ["Levy", null, "Normal army cap."], mass: ["Mass Conscription", "bronze", "Huge army cap. Military loves it, people don't."] } },
  rel: { name: "Religion", opts: { faith: ["State Faith", null, "Clergy happy, thinkers unhappy."], tol: ["Tolerance", "philosophy", "Balanced. Conquered regions settle faster."], sec: ["Secular", "enlightenment", "+10% science. Clergy furious."] } },
  trade: { name: "Trade", opts: { prot: ["Protectionist", null, "+10% materials, less trade."], bal: ["Balanced", null, "Normal trade."], free: ["Free Trade", "currency", "+30% trade income. Merchants love it."] } },
  labor: { name: "Labor", tech: "steam", opts: { unreg: ["Unregulated", null, "+10% materials. Workers angry."], rights: ["Workers' Rights", null, "Workers happy, −5% materials."] } },
  press: { name: "Press", tech: "printing", opts: { cens: ["Censored", null, "Nobles happy, thinkers angry."], free: ["Free Press", null, "Thinkers happy, +5% science."] } },
  focus: { name: "National Focus", opts: { bal: ["Balanced", null, "No special focus."], mil: ["Military", "bronze", "+15% army, cheaper upkeep."], sci: ["Science", "writing", "+15% science."], com: ["Commerce", "currency", "+15% gold."], ind: ["Industry", "guilds", "+15% materials."], grow: ["Growth", "agriculture", "Regions grow faster."] } },
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
const COLORS = ["#e9524a", "#3c7dd9", "#f2b134", "#2fae6b", "#9b59d0", "#f07f2f", "#1fb5b0", "#e45aa0", "#8a5a33", "#5b6ee1", "#a5c234", "#c0392b", "#16a085", "#d35400", "#7d3c98", "#34495e", "#ff8fab", "#00a8e8"];
const CRADLES = ["Lower Egypt", "Mesopotamia", "Indus", "North China Plain", "Jiangnan", "Punjab", "Anatolia", "Greece", "Southern Italy", "Central Mexico", "Peru", "Mali", "Ethiopia", "Northern Gaul", "England", "Persia", "Japan", "Muscovy", "Midwest", "Java", "Eastern Mongolia", "Castile", "Bengal", "Zimbabwe", "Korea", "Rhineland", "Gold Coast", "Southern Plains", "Pampas", "New South Wales", "Great Lakes Africa", "Yucatan"];
const SYL = ["ka", "ra", "tal", "mor", "eth", "vin", "sul", "dor", "ash", "ul", "ren", "bar", "kesh", "an", "ith", "or", "zan", "lo", "mir", "gal", "hun", "tep", "yar", "ob", "nek", "sa", "tor", "al", "qua", "ri", "ven", "ito", "ba", "du", "shen", "ko", "zi", "mar", "el", "ost", "ta", "ny", "vel", "kor", "ae", "bri", "hal", "wen"];
function genName() { let s = pick(SYL) + pick(SYL); if (rnd() < .4) s += pick(SYL); s = s.replace(/(.)\1\1/, "$1$1"); return s[0].toUpperCase() + s.slice(1, 9); }
const PERS = { aggressive: "Warlike", builder: "Builder", trader: "Merchant", zealot: "Zealous" };

// region statics
const regionAvg = W.regions.reduce((a, r) => a + r.a, 0) / NR;
W.regions.forEach((r, i) => {
  r.i = i; r.sizeF = clamp(Math.sqrt(r.a / regionAvg), 0.6, 1.7);
  r.path = new Path2D();
  for (const poly of r.p) for (const rg of poly) { r.path.moveTo(rg[0], rg[1]); for (let k = 2; k < rg.length; k += 2) r.path.lineTo(rg[k], rg[k + 1]); r.path.closePath(); }
});
const RID = Object.fromEntries(W.regions.map(r => [r.n, r.i]));
function gdist(a, b) { const A = W.regions[a], B = W.regions[b], toR = Math.PI / 180;
  const s = Math.sin((B.lat - A.lat) * toR / 2) ** 2 + Math.cos(A.lat * toR) * Math.cos(B.lat * toR) * Math.sin((B.lon - A.lon) * toR / 2) ** 2;
  return 2 * Math.asin(Math.sqrt(s)) / toR; }

// ================= GAME STATE =================
let G = null;
const P = () => G.nations[G.player];
const has = (n, t) => n.techs.includes(t);
const owned = n => G.regions.filter(r => r.owner === n.id);
const pk = (a, b) => a < b ? a + "-" + b : b + "-" + a;
function dip(a, b) { const k = pk(a, b); return G.dip[k] || (G.dip[k] = { rel: 0, trade: false, ally: false, war: false, ws: 0, wt: 0, met: false, truce: 0 }); }
const rel = (a, b) => dip(a, b).rel;
const atWar = (a, b) => a !== b && a >= 0 && b >= 0 && dip(a, b).war;
// war score from a's point of view
const wscore = (a, b) => a < b ? dip(a, b).ws : -dip(a, b).ws;
function addWs(a, b, v) { const d = dip(a, b); d.ws += a < b ? v : -v; }
function log(text, icon = "•", who = null) { G.news.push({ t: text, i: icon, p: who === null || who === G.player }); }
const nm = n => GOVS[n.gov].title(n.name);
const short = n => n.name;

function newNation(name, color, region, ai, pers) {
  const id = G.nations.length;
  const n = { id, name, color, ai, pers: pers || "builder", alive: true, gov: "tribe", govCool: 0, anarchy: 0, opposition: 0,
    laws: { tax: "normal", cons: "levy", rel: "faith", trade: "bal", labor: null, press: null, focus: "bal" },
    gold: 30, mat: 20, sciPts: 0, research: "pottery", techs: ["agriculture"], era: 0, army: 2, used: 0,
    fac: {}, facMods: [], stab: 55, ww: 0, capital: region, lastElect: 0, score: 0, warmonger: 0, autoResearch: true };
  for (const k in FACTIONS) n.fac[k] = 55;
  G.nations.push(n);
  const r = G.regions[region]; r.owner = id; r.culture = id; r.pop = Math.max(r.pop, 3); r.unrest = 0;
  return n;
}
function newGame(opts) {
  G = { v: 1, turn: 1, year: -4000, player: 0, nations: [], regions: [], dip: {}, news: [], diff: opts.diff, over: false, events: 0, nextEvent: 3, lastReport: [] };
  for (let i = 0; i < NR; i++) {
    const s = W.regions[i];
    G.regions.push({ i, owner: -1, culture: -1, pop: 0, natives: +(TER[s.t].cap * s.sizeF * 0.35).toFixed(2), b: {}, build: null, unrest: 0, conq: 0, prevOwner: -1 });
  }
  const start = RID[opts.start];
  newNation(opts.name, opts.color, start, false, "builder");
  const used = [start];
  const pool = CRADLES.map(c => RID[c]).filter(i => i !== undefined && i !== start).sort(() => rnd() - .5);
  const colors = COLORS.filter(c => c !== opts.color);
  const persList = Object.keys(PERS);
  for (const r of pool) {
    if (G.nations.length >= 16) break;
    if (used.some(u => gdist(u, r) < 14)) continue;
    used.push(r);
    newNation(genName(), colors.shift(), r, true, pick(persList));
  }
  for (const n of G.nations) { if (n.ai) { n.laws.cons = n.pers === "aggressive" ? "levy" : "vol"; } }
  updateContacts();
  log(`The ${nm(P())} is founded in ${W.regions[start].n}. Your people look to you.`, "🔥");
}

// ================= ECONOMY =================
function stratHave(n, res) { return owned(n).some(r => W.regions[r.i].r === res); }
function tradePartners(n) { return G.nations.filter(o => o.alive && o.id !== n.id && dip(n.id, o.id).trade && !atWar(n.id, o.id)); }
// strategic resource status: have / import / missing
function stratStatus(n) {
  const out = [];
  for (const s of STRAT_NEED) {
    if (n.era < s.from || n.era > s.to) continue;
    const t = RES[s.res].tech; if (t && !has(n, t)) continue;
    let st = "missing", from = null;
    if (stratHave(n, s.res)) st = "have";
    else if (n.laws.trade !== "prot") {
      const src = tradePartners(n).find(o => stratHave(o, s.res));
      if (src) { st = "import"; from = src; }
    }
    out.push({ ...s, st, from, cost: st === "import" ? Math.round(3 * (n.era + 1) * (n.laws.trade === "free" ? .7 : 1)) : 0 });
  }
  return out;
}
function adminCap(n) {
  let a = GOVS[n.gov].admin + n.era * 2;
  for (const r of owned(n)) for (const k in r.b) a += BK[k].admin || 0;
  return Math.floor(a);
}
function unitPower(n) {
  let m = 1 + (GOVS[n.gov].pow || 0);
  let bp = 0; for (const r of owned(n)) for (const k in r.b) bp += BK[k].pow || 0;
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
  const pop = owned(n).reduce((a, r) => a + r.pop, 0);
  let rate = { vol: .06, levy: .1, mass: .18 }[n.laws.cons];
  let bar = 0; for (const r of owned(n)) if (r.b.barracks) bar++;
  return Math.floor(pop * rate + 2 + bar * .5);
}
const unitCost = n => ({ g: Math.round(12 * Math.pow(1.6, n.era)), m: Math.round(10 * Math.pow(1.6, n.era)) });
const unitUpkeep = n => 0.3 * Math.pow(1.5, n.era) * (n.laws.focus === "mil" ? .8 : 1);
function regionCap(r, n) {
  const s = W.regions[r.i], T = TER[s.t];
  let c = T.cap * s.sizeF * (1 + 0.45 * (n ? n.era : 0));
  let m = 1; for (const k in r.b) m += BK[k].cap || 0;
  if (s.r === "fish") m += .1;
  return c * m;
}
function bldMult(r, key, n) {
  let m = 0;
  for (const k in r.b) {
    const b = BK[k]; let v = b[key] || 0;
    if (b.needs && n && key === "prod") { const st = b.needs; if (!stratHave(n, st) && !(stratStatus(n).find(x => x.res === st && x.st === "import"))) v *= .5; }
    if (k === "mine" && key === "prod" && ["copper", "iron", "coal", "gold", "gems", "uranium"].includes(W.regions[r.i].r)) v += .3;
    m += v;
  }
  return m;
}
// Full economic picture for a nation. Pure: does not mutate.
function econ(n) {
  const gov = GOVS[n.gov], L = n.laws, regs = owned(n);
  const stabM = 0.75 + 0.5 * n.stab / 100, anarchy = n.anarchy > 0 ? .6 : 1;
  const taxM = { low: .7, normal: 1, high: 1.35, extort: 1.7 }[L.tax];
  let food = 0, need = 0, tax = 0, mat = 0, sci = 2 + n.era, pop = 0, trade = 0, bUp = 0;
  const per = [];
  const prodLaw = (L.trade === "prot" ? .1 : 0) + (L.labor === "unreg" ? .1 : L.labor === "rights" ? -.05 : 0) + (L.focus === "ind" ? .15 : 0) + (gov.prod || 0);
  const goldLaw = (gov.gold || 0) + (L.focus === "com" ? .15 : 0);
  const sciLaw = (gov.sci || 0) + (L.focus === "sci" ? .15 : 0) + (L.rel === "sec" ? .1 : 0) + (L.press === "free" ? .05 : 0);
  for (const r of regs) {
    const s = W.regions[r.i], T = TER[s.t];
    const unrestM = 1 - r.unrest / 250;
    const f = r.pop * T.food * (1 + bldMult(r, "food", n) + (s.r === "fish" ? .3 : 0) + (r.i === n.capital ? .3 : 0)) * (1 + .05 * n.era);
    const g = r.pop * T.gold * 0.5 * taxM * (1 + bldMult(r, "gold", n) + goldLaw) * stabM * unrestM * anarchy;
    const m = r.pop * T.prod * 0.6 * (1 + bldMult(r, "prod", n) + prodLaw) * stabM * unrestM * anarchy;
    let sf = 0; for (const k in r.b) sf += BK[k].sciF || 0;
    const sc = (r.pop * 0.2 + sf) * (1 + bldMult(r, "sci", n) + sciLaw) * stabM * anarchy;
    let tr = 0; for (const k in r.b) tr += BK[k].trade || 0;
    for (const k in r.b) bUp += BK[k].up;
    food += f; need += r.pop * .8; tax += g; mat += m; sci += sc; pop += r.pop; trade += tr;
    per.push({ r, food: f, gold: g, mat: m, sci: sc });
  }
  // trade (handled automatically by your merchants)
  const partners = tradePartners(n);
  const peaceful = G.nations.filter(o => o.alive && o.id !== n.id && dip(n.id, o.id).met && !atWar(n.id, o.id)).length;
  const tradeLawM = { prot: .7, bal: 1, free: 1.3 }[L.trade] * (has(n, "globalization") ? 1.4 : 1);
  const routeGold = (trade + 2 + regs.length * .3) * (1 + .15 * partners.length + .04 * peaceful) * tradeLawM * (1 + .2 * n.era) * stabM;
  const luxCount = {};
  for (const r of regs) { const rs = W.regions[r.i].r; if (rs && RES[rs].kind === "lux") luxCount[rs] = (luxCount[rs] || 0) + 1; }
  const luxKinds = Object.keys(luxCount).length;
  const luxExtra = Object.values(luxCount).reduce((a, c) => a + c - 1, 0);
  const luxGold = (luxKinds * 1 + luxExtra * 2.5) * (1 + .3 * n.era) * (L.trade === "prot" ? .6 : 1);
  const strat = stratStatus(n);
  const imports = strat.reduce((a, s) => a + s.cost, 0);
  const surplus = food - need;
  const foodGold = surplus > 0 ? Math.min(surplus * .25, 3 + n.era * 3) : 0;
  const armyUp = n.army * unitUpkeep(n);
  const govUp = Math.max(0, regs.length - adminCap(n)) * (1 + n.era);
  const goldNet = tax + routeGold + luxGold + foodGold - bUp - armyUp - imports - govUp;
  return { food, need, surplus, tax, routeGold, luxGold, foodGold, bUp, armyUp, imports, govUp, goldNet, mat, sci, pop, per, partners, peaceful, luxCount, luxKinds, strat, regions: regs.length };
}

// ================= POLITICS =================
function facActive(n, k) { return FACTIONS[k].from <= n.era || (GOVS[n.gov].w[k] || 0) > 0; }
function facTargets(n, E) {
  const L = n.laws, g = n.gov, regs = owned(n), out = {};
  const add = (k, v, why) => { if (!out[k]) out[k] = { v: 50, why: [] }; if (v) { out[k].v += v; out[k].why.push([why, v]); } };
  const cnt = k => regs.filter(r => r.b[k]).length;
  const rn = Math.max(1, regs.length);
  const wars = G.nations.filter(o => atWar(n.id, o.id));
  const warBal = wars.reduce((a, o) => a + wscore(n.id, o.id), 0);
  const over = Math.max(0, regs.length - adminCap(n));
  // commoners
  add("commoners", { low: 12, normal: 0, high: -12, extort: -28 }[L.tax], "Taxes");
  add("commoners", E.surplus >= 0 ? 6 : -25, E.surplus >= 0 ? "Food surplus" : "Famine");
  add("commoners", Math.min(15, E.luxKinds * 3), "Luxuries");
  add("commoners", Math.round(Math.min(15, (cnt("shrine") + cnt("cathedral") * 2 + cnt("hospital") + cnt("broadcast") * 2) * 6 / rn)), "Temples & services");
  add("commoners", { vol: 6, levy: 0, mass: -15 }[L.cons], "Conscription");
  add("commoners", -Math.round(n.ww), "War weariness");
  add("commoners", { democracy: 10, republic: 5, party: -10, theocracy: 0 }[g] || 0, "Government");
  add("commoners", L.labor === "rights" ? 6 : 0, "Workers' rights");
  add("commoners", L.focus === "grow" ? 8 : 0, "Growth focus");
  add("commoners", -Math.min(25, over * 3), "Overextended");
  // elders / clergy
  add("elders", { faith: 15, tol: -5, sec: -22 }[L.rel], "Religion law");
  add("elders", Math.round(Math.min(18, (cnt("shrine") + cnt("cathedral") * 2) * 8 / rn)), "Holy sites");
  add("elders", { theocracy: 22, party: -15, technocracy: -10, tribe: 5 }[g] || 0, "Government");
  // warriors / military
  const ratio = n.army / Math.max(1, regs.length);
  add("warriors", ratio < .5 ? -15 : ratio > 1.5 ? 10 : 0, "Army size");
  add("warriors", wars.length ? clamp(Math.round(warBal / 2), -15, 15) : 0, "War progress");
  add("warriors", { vol: -6, levy: 0, mass: 12 }[L.cons], "Conscription");
  add("warriors", L.focus === "mil" ? 15 : 0, "Military focus");
  add("warriors", { empire: 10, party: 12, chiefdom: 10, democracy: -6 }[g] || 0, "Government");
  // nobles
  add("nobles", { monarchy: 18, empire: 15, theocracy: 5, republic: -12, democracy: -22, party: -28, technocracy: -10 }[g] || 0, "Government");
  add("nobles", { high: 5, extort: 8, low: -6 }[L.tax] || 0, "Taxes");
  add("nobles", L.press === "free" ? -6 : L.press === "cens" ? 6 : 0, "Press");
  // merchants
  add("merchants", { prot: -12, bal: 0, free: 15 }[L.trade], "Trade law");
  add("merchants", { low: 10, normal: 0, high: -10, extort: -20 }[L.tax], "Taxes");
  add("merchants", wars.length ? -10 : 5, wars.length ? "At war" : "At peace");
  add("merchants", Math.min(12, E.partners.length * 3), "Trade pacts");
  add("merchants", Math.round(Math.min(12, (cnt("market") + cnt("bank")) * 6 / rn)), "Markets & banks");
  add("merchants", { republic: 12, democracy: 10, party: -15 }[g] || 0, "Government");
  add("merchants", L.focus === "com" ? 12 : 0, "Commerce focus");
  // intellectuals
  add("intellectuals", L.press === "free" ? 15 : L.press === "cens" ? -15 : 0, "Press");
  add("intellectuals", { sec: 10, faith: -10, tol: 3 }[L.rel], "Religion law");
  add("intellectuals", Math.round(Math.min(15, (cnt("university") + cnt("techhub")) * 8 / rn)), "Universities");
  add("intellectuals", L.focus === "sci" ? 15 : 0, "Science focus");
  add("intellectuals", { democracy: 12, technocracy: 20, party: -18, theocracy: -15 }[g] || 0, "Government");
  // workers
  add("workers", L.labor === "rights" ? 20 : L.labor === "unreg" ? -15 : 0, "Labor law");
  add("workers", { democracy: 10, party: 8 }[g] || 0, "Government");
  add("workers", { low: 8, high: -8, extort: -15 }[L.tax] || 0, "Taxes");
  add("workers", L.focus === "ind" ? 6 : 0, "Industry focus");
  // temporary event modifiers
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
function canReach(n, ri) {
  const sail = has(n, "sailing"), nav = has(n, "navigation");
  const tgt = W.regions[ri];
  for (const r of owned(n)) {
    const s = W.regions[r.i];
    if (s.adj.includes(ri)) return true;
    if (sail && s.sea.includes(ri)) return true;
    if (nav && s.c && tgt.c && gdist(r.i, ri) < 45) return true;
  }
  return false;
}
function updateContacts() {
  for (const a of G.nations) { if (!a.alive) continue;
    for (const b of G.nations) { if (!b.alive || b.id <= a.id) continue;
      const d = dip(a.id, b.id); if (d.met) continue;
      const late = (has(a, "navigation") && has(b, "navigation")) || (a.era >= 6 && b.era >= 6);
      if (late || owned(a).some(r => canReach(b, r.i)) || owned(b).some(r => canReach(a, r.i))) {
        d.met = true;
        if (a.id === G.player || b.id === G.player) log(`First contact with the ${nm(a.id === G.player ? b : a)}.`, "🤝");
      }
    }
  }
}
function settleCost(n) { const k = owned(n).length * (1 + n.era * .5); return { g: Math.round(20 * Math.pow(1.6, n.era) + k * 4), m: Math.round(18 * Math.pow(1.6, n.era) + k * 2) }; }
function settle(n, ri) {
  const r = G.regions[ri], c = settleCost(n);
  n.gold -= c.g; n.mat -= c.m;
  r.owner = n.id; r.culture = n.id; r.pop = Math.max(1, r.natives * .8 + .5); r.unrest = 10; r.natives = 0; r.conq = 0;
  log(`${n.ai ? "The " + nm(n) : "Your settlers"} settled ${W.regions[ri].n}.`, "🏕️", n.id);
}
function buildCost(n, b) { const disc = n.laws.focus === "ind" ? .9 : 1; return { g: Math.round(b.cg * disc), m: Math.round(b.cm * disc) }; }
function canBuild(n, r, b) {
  if (r.owner !== n.id || r.b[b.k] || r.build) return false;
  if (!has(n, b.tech)) return false;
  if (b.coastal && !W.regions[r.i].c) return false;
  if (b.unique && owned(n).some(x => x.b[b.k] || x.build === b.k)) return false;
  return true;
}
function startBuild(n, r, b) { const c = buildCost(n, b); n.gold -= c.g; n.mat -= c.m; r.build = b.k; }
function recruit(n, k) { const c = unitCost(n); n.gold -= c.g * k; n.mat -= c.m * k; n.army += k; }

function processNation(n) {
  if (!n.alive) return;
  const E = econ(n);
  // gold, materials
  n.gold += E.goldNet; n.mat += E.mat;
  if (n.gold < 0) { // broke: army deserts, buildings decay
    const lose = Math.min(n.army, Math.ceil(-n.gold / Math.max(1, unitUpkeep(n) * 4)));
    if (lose > 0 && n.army > 0) { n.army -= lose; log(`Unpaid, ${lose} regiment${lose > 1 ? "s" : ""} of the ${nm(n)} deserted.`, "💸", n.id); }
    n.facMods.push({ k: "commoners", v: -10, why: "Debts", t: 2 }); n.facMods.push({ k: "warriors", v: -15, why: "Unpaid soldiers", t: 2 });
    n.gold = Math.max(n.gold, -50 * (1 + n.era));
  }
  // growth
  const foodOk = E.surplus >= 0;
  for (const r of owned(n)) {
    const cap = regionCap(r, n);
    if (foodOk) r.pop += (cap - r.pop) * (n.laws.focus === "grow" ? .16 : .11);
    else r.pop *= 1 - .05 * Math.min(1, -E.surplus / E.need * 3);
    r.pop = Math.max(.5, r.pop);
    if (r.build) { r.b[r.build] = 1; if (!n.ai) log(`${BK[r.build].name} completed in ${W.regions[r.i].n}.`, BK[r.build].icon); r.build = null; }
  }
  if (!foodOk && !n.ai) log("Famine! Food stores ran out and people are starving.", "🥀");
  // research
  n.sciPts += E.sci;
  let guard = 0;
  while (guard++ < 5) {
    if (!n.research || has(n, n.research)) n.research = chooseResearch(n);
    if (!n.research) break;
    const t = TECH[n.research];
    if (n.sciPts < t.cost) break;
    n.sciPts -= t.cost; n.techs.push(t.id);
    if (!n.ai) log(`Discovered ${t.name}! ${t.desc}`, "💡");
    if (t.id === "mars") { victory(n, "science"); }
    n.research = n.autoResearch || n.ai ? chooseResearch(n) : null;
    const ne = n.era;
    if (ne < 7 && eraTechs(ne).filter(x => has(n, x.id)).length >= eraNeed(ne)) {
      n.era++; log(n.ai ? `The ${nm(n)} entered the ${ERAS[n.era]}.` : `Your nation enters the ${ERAS[n.era]}!`, "🌅", n.ai ? (dip(n.id, G.player).met ? null : -2) : n.id);
      if (n.ai && !dip(n.id, G.player).met) G.news.pop();
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
  // unrest and revolts
  for (const r of owned(n)) {
    const foreign = r.culture !== n.id ? (n.laws.rel === "tol" ? 15 : 25) : 0;
    let roads = 0; for (const k in r.b) roads += BK[k].unrest || 0;
    const target = Math.max(0, (50 - n.stab) * 1.1) + foreign + (r.conq > 0 ? r.conq : 0) - roads - (r.i === n.capital ? 15 : 0);
    r.unrest += (clamp(target, 0, 100) - r.unrest) * .3;
    if (r.conq > 0) r.conq = Math.max(0, r.conq - 3);
    if (r.culture !== n.id && r.culture >= 0 && r.unrest < 25 && rnd() < .06) { r.culture = n.id; if (!n.ai) log(`${W.regions[r.i].n} now considers itself part of your nation.`, "🫶"); }
    if (r.unrest > 65 && r.i !== n.capital && owned(n).length > 1 && rnd() < (r.unrest - 60) / 120) revolt(n, r);
  }
  // government upheaval
  if (n.stab < 18 && n.anarchy === 0 && rnd() < .12) upheaval(n);
  // elections
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
  const av = TECHS.filter(t => !has(n, t.id) && t.era <= n.era && (t.id !== "mars" || owned(n).some(r => r.b.spaceport)));
  if (!av.length) return null;
  const pref = { aggressive: ["bronze", "iron", "mathematics", "chivalry", "gunpowder", "rifling", "masonry", "feudalism"], builder: ["agriculture", "pottery", "construction", "guilds", "medicine", "steam"], trader: ["currency", "sailing", "wheel", "banking", "navigation", "globalization"], zealot: ["mysticism", "theology", "philosophy", "monarchy"] }[n.pers] || [];
  av.sort((a, b) => (a.cost - (pref.includes(a.id) ? 25 : 0) - (a.id === "mars" ? 9999 : 0)) - (b.cost - (pref.includes(b.id) ? 25 : 0) - (b.id === "mars" ? 9999 : 0)));
  return av[0].id;
}
function revolt(n, r) {
  const name = W.regions[r.i].n;
  const back = G.nations[r.culture];
  if (back && back.alive && back.id !== n.id && rnd() < .7) {
    r.owner = back.id; r.unrest = 20; r.conq = 0;
    log(`${name} rose up and rejoined the ${nm(back)}!`, "✊", n.id === G.player || back.id === G.player ? null : -2);
    if (n.id !== G.player && back.id !== G.player) G.news.pop();
    return;
  }
  const used = new Set(G.nations.map(x => x.color));
  const col = COLORS.find(c => !used.has(c)) || `hsl(${Math.floor(rnd() * 360)},65%,55%)`;
  const rb = newNation(name.split(" ").pop().replace(/[^A-Za-z]/g, "") || genName(), col, r.i, true, pick(Object.keys(PERS)));
  rb.gold = 20 * (n.era + 1); rb.techs = n.techs.slice(); rb.era = n.era; rb.army = Math.max(2, Math.round(n.army * .15)); rb.gov = n.gov === "tribe" ? "tribe" : "chiefdom";
  n.army = Math.max(0, n.army - Math.round(n.army * .1)); r.pop *= .9; r.unrest = 0;
  const d = dip(n.id, rb.id); d.met = true; d.war = true; d.rel = -60; d.wt = G.turn;
  log(`${name} revolted and declared independence from the ${nm(n)}!`, "🔥", n.id === G.player ? null : -2);
  if (n.id !== G.player) G.news.pop();
}
function upheaval(n) {
  const unlocked = Object.keys(GOVS).filter(g => !GOVS[g].tech || has(n, GOVS[g].tech));
  let to, why;
  if (n.fac.warriors < n.fac.commoners && n.gov !== "democracy" && unlocked.includes("party") || (n.fac.warriors >= n.fac.commoners)) {
    to = ["party", "empire", "monarchy", "chiefdom"].find(g => unlocked.includes(g) && g !== n.gov); why = "A military coup";
  }
  if (!to || n.fac.commoners < n.fac.warriors) { to = ["democracy", "republic", "chiefdom", "tribe"].find(g => unlocked.includes(g) && g !== n.gov); why = "A popular revolution"; }
  if (!to) return;
  const old = GOVS[n.gov].name; n.gov = to; n.anarchy = 2; n.govCool = 8; n.army = Math.round(n.army * .75);
  for (const k in n.fac) n.fac[k] = 50;
  log(`${why} overthrew the ${old} of ${n.name}. It is now a ${GOVS[to].name}.`, "💥", n.id === G.player ? null : -2);
  if (n.id !== G.player && !dip(n.id, G.player).met) G.news.pop();
}

// ================= WAR =================
function defenseOf(ri) {
  const r = G.regions[ri], s = W.regions[ri];
  if (r.owner < 0) return { units: r.natives * .6, power: r.natives * .6 * ERA_POW[Math.max(0, worldEra() - 1)] * .7 };
  const d = G.nations[r.owner], regs = owned(d).length;
  const units = d.army * .8 / Math.sqrt(Math.max(1, regs)) + 1;
  let m = 1 + (r.b.walls ? .4 : 0) + (r.b.castle ? .8 : 0) + (s.t === "mountain" ? .3 : 0) + (s.t === "forest" || s.t === "jungle" ? .1 : 0) + (ri === d.capital ? .3 : 0);
  return { units, power: units * unitPower(d) * m + r.pop * .15 * ERA_POW[d.era] * m };
}
function worldEra() { const al = G.nations.filter(n => n.alive); return Math.round(al.reduce((a, n) => a + n.era, 0) / al.length); }
function winChance(n, ri, units) {
  const att = units * unitPower(n), def = defenseOf(ri).power; let w = 0;
  for (let i = 0; i < 300; i++) if (att * (.75 + rnd() * .5) > def * (.8 + rnd() * .4)) w++;
  return w / 300;
}
function attack(n, ri, units) {
  const r = G.regions[ri], s = W.regions[ri];
  const D = defenseOf(ri);
  const att = units * unitPower(n) * (.75 + rnd() * .5), def = D.power * (.8 + rnd() * .4);
  const win = att > def;
  const aLoss = Math.min(units, Math.round(units * clamp(win ? def / att * .45 : .35 + def / att * .2, .05, .9)));
  n.army -= aLoss; n.used += units;
  const dn = r.owner >= 0 ? G.nations[r.owner] : null;
  let dLoss = 0;
  if (dn) { dLoss = Math.min(dn.army, Math.round(D.units * clamp(att / def * .5, .1, 1) + (win ? .5 : 0))); dn.army -= dLoss; }
  const res = { win, aLoss, dLoss, region: s.n, def: dn, att: n };
  if (win) {
    if (dn) {
      addWs(n.id, dn.id, ri === dn.capital ? 15 : 7);
      r.prevOwner = dn.id;
    } else { r.culture = n.id; r.natives = 0; }
    r.owner = n.id; r.pop = Math.max(1, (r.pop || r.natives * .8 + .5) * .85); r.unrest = 35; r.conq = dn ? 30 : 10;
    for (const k in r.b) if (rnd() < .3) delete r.b[k];
    r.build = null;
    if (dn) {
      dn.ww += 4;
      if (ri === dn.capital) { const rest = owned(dn); if (rest.length) { dn.capital = rest.sort((a, b) => b.pop - a.pop)[0].i; dn.facMods.push({ k: "commoners", v: -15, why: "Capital lost", t: 5 }); } }
      if (!owned(dn).length) eliminate(dn, n);
    }
  } else if (dn) addWs(n.id, dn.id, -4);
  // log
  const involved = n.id === G.player || (dn && dn.id === G.player);
  if (involved || (dn && dip(dn.id, G.player).met)) {
    if (win) log(dn ? `${n.id === G.player ? "Your army" : "The " + nm(n)} captured ${s.n} from ${dn.id === G.player ? "you" : "the " + nm(dn)}!` : `${n.id === G.player ? "You" : "The " + nm(n)} conquered the tribes of ${s.n}.`, n.id === G.player ? "🚩" : dn && dn.id === G.player ? "🔥" : "⚔️", involved ? null : -1);
    else if (involved) log(`${n.id === G.player ? "Your attack on" : "The " + nm(n) + " attacked"} ${s.n} ${n.id === G.player ? "was repelled" : "but was repelled"}. (${aLoss} attacker${aLoss === 1 ? "" : "s"} lost)`, "🛡️");
  }
  return res;
}
function eliminate(dn, by) {
  dn.alive = false; dn.army = 0;
  for (const o of G.nations) { const d = dip(dn.id, o.id); d.war = false; d.trade = false; d.ally = false; }
  log(dn.id === G.player ? "Your last region has fallen." : `The ${nm(dn)} has been wiped from the map by the ${nm(by)}.`, "☠️", dip(dn.id, G.player).met || dn.id === G.player ? null : -2);
  if (dn.id !== G.player && !dip(dn.id, G.player).met) G.news.pop();
  if (dn.id === G.player) defeat();
}
function declareWar(a, b) {
  const d = dip(a.id, b.id); d.war = true; d.trade = false; d.ally = false; d.ws = 0; d.wt = G.turn; d.rel = Math.min(d.rel, -50);
  if (rel(a.id, b.id) > -60) a.warmonger += 12;
  for (const o of G.nations) if (o.alive && o.id !== a.id && o.id !== b.id && dip(o.id, a.id).met) dip(o.id, a.id).rel -= rel(a.id, b.id) < -40 ? 2 : 10;
  if (a.id === G.player || b.id === G.player) log(a.id === G.player ? `You declared war on the ${nm(b)}!` : `The ${nm(a)} declared war on you!`, "⚔️");
  else if (dip(a.id, G.player).met || dip(b.id, G.player).met) log(`The ${nm(a)} declared war on the ${nm(b)}.`, "⚔️", -1);
  // allies of the defender join
  for (const o of G.nations) {
    if (!o.alive || o.id === a.id || o.id === b.id) continue;
    if (dip(o.id, b.id).ally && !dip(o.id, a.id).war && !dip(o.id, a.id).ally) {
      if (o.id === G.player) { log(`Your ally the ${nm(b)} was attacked by the ${nm(a)}. They expect your help (check World).`, "📯"); dip(o.id, b.id).rel -= 0; }
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
function aiTurn(n) {
  if (!n.alive) return;
  const E = econ(n), regs = owned(n);
  const wars = G.nations.filter(o => atWar(n.id, o.id));
  // laws & government
  if (n.gold < 0 || E.goldNet < -2) n.laws.tax = "high"; else if (n.stab < 35) n.laws.tax = "low"; else n.laws.tax = "normal";
  if (has(n, "currency") && n.pers === "trader") n.laws.trade = "free";
  if (has(n, "steam")) n.laws.labor = n.stab < 45 ? "rights" : "unreg";
  if (has(n, "printing") && !n.laws.press) n.laws.press = "cens";
  if (n.pers === "aggressive" && has(n, "bronze")) n.laws.focus = "mil";
  if (n.pers === "builder" && has(n, "guilds")) n.laws.focus = "ind";
  if (n.pers === "trader" && has(n, "currency")) n.laws.focus = "com";
  if (n.govCool === 0 && n.stab > 40) {
    const pref = { aggressive: ["party", "empire", "monarchy", "chiefdom"], builder: ["technocracy", "democracy", "empire", "monarchy", "chiefdom"], trader: ["democracy", "republic", "monarchy", "chiefdom"], zealot: ["theocracy", "monarchy", "chiefdom"] }[n.pers];
    const g = pref.find(g => has(n, GOVS[g].tech));
    if (g && g !== n.gov) { n.gov = g; n.anarchy = 1; n.govCool = 15; }
  }
  // settle
  const sc = settleCost(n);
  let settles = 0;
  const cands = regs.length < adminCap(n) + 1 ? G.regions.filter(r => r.owner < 0 && canReach(n, r.i)).sort((a, b) => regionCap(b, n) - regionCap(a, n)) : [];
  const saving = cands.length > 0 && wars.length === 0;
  if (cands.length && rnd() < .6) {
    for (const r of cands) { if (settles >= 1) break; if (n.gold > sc.g * 1.2 && n.mat > sc.m) { settle(n, r.i); settles++; } }
  }
  // military
  const ratio = ({ aggressive: 1.4, builder: .8, trader: .7, zealot: 1 }[n.pers]) * (wars.length ? 1.6 : 1);
  const want = Math.min(maxArmy(n), Math.ceil(regs.length * ratio + 1));
  const uc = unitCost(n);
  while (n.army < want && n.gold > uc.g * 1.5 && n.mat > uc.m && E.goldNet > n.army * 0 - 5) recruit(n, 1);
  // build
  let builds = 0;
  const shuffled = regs.slice().sort(() => rnd() - .5);
  for (const r of shuffled) {
    if (builds >= 1 + Math.floor(regs.length / 4)) break;
    const opts = BLD.filter(b => canBuild(n, r, b) && !(b.needs && !stratHave(n, b.needs)));
    if (!opts.length) continue;
    const b = opts.sort((x, y) => x.era - y.era || rnd() - .5)[0];
    const c = buildCost(n, b);
    const reserve = saving ? sc.g * 1.2 : 10;
    if (n.gold > c.g + reserve && n.mat > c.m + (saving ? sc.m : 0) && E.goldNet - b.up > -1) { startBuild(n, r, b); builds++; }
  }
  // diplomacy
  for (const o of G.nations) {
    if (!o.alive || o.id === n.id) continue;
    const d = dip(n.id, o.id); if (!d.met) continue;
    if (o.ai && o.id > n.id) {
      if (!d.war && !d.trade && d.rel > 5 && rnd() < .15) { d.trade = true; }
      if (!d.war && !d.ally && d.rel > 60 && rnd() < .08) { d.ally = true; }
    }
    if (d.war) {
      const myScore = wscore(n.id, o.id), dur = G.turn - d.wt;
      const losing = myScore < -12 || power(n) < power(o) * .5;
      const tired = dur > 10 && rnd() < .15;
      if (o.ai && (losing || tired || (myScore > 25 && rnd() < .3))) makePeace(n, o, myScore < -12 ? Math.round(Math.min(n.gold * .3, 40 * (n.era + 1))) : 0, myScore < -12 ? n : null);
      else if (!o.ai && (losing || tired) && !G.pendingPeace && rnd() < .5) {
        const trib = myScore < -12 ? Math.round(Math.max(0, Math.min(n.gold * .3, 40 * (n.era + 1)))) : 0;
        G.pendingPeace = { from: n.id, tribute: trib, payer: trib ? n.id : null };
      } else if (!o.ai && myScore > 18 && dur > 4 && !G.pendingPeace && rnd() < .25) {
        G.pendingPeace = { from: n.id, tribute: Math.round(Math.min(Math.max(0, o.gold) * .4, 50 * (o.era + 1))), payer: o.id };
      }
    } else if (!d.ally && d.truce <= 0 && wars.length === 0 && n.anarchy === 0 && regs.length < adminCap(n) * 1.4) {
      const ratioP = power(n) / Math.max(1, power(o));
      const hostile = d.rel < (n.pers === "aggressive" ? -10 : -45);
      const border = owned(o).some(r => canReach(n, r.i));
      const chance = { aggressive: .2, zealot: .1, builder: .05, trader: .03 }[n.pers] * (o.id === G.player ? [.5, 1, 1.4][G.diff] : 1);
      const grace = o.id === G.player && G.turn < [45, 25, 12][G.diff];
      if (!grace && hostile && border && ratioP > (n.pers === "aggressive" ? 1.25 : 1.8) && rnd() < chance) declareWar(n, o);
    }
  }
  // attack
  for (const o of G.nations.filter(o => atWar(n.id, o.id))) {
    if (dip(n.id, o.id).wt === G.turn) continue; // armies need a turn to march after war is declared
    let tries = o.id === G.player ? (n.era < 4 ? 1 : 2) : 1 + Math.floor(n.era / 3);
    while (tries-- > 0) {
      const avail = n.army - n.used; if (avail < 1) break;
      const targets = owned(o).filter(r => canReach(n, r.i));
      if (!targets.length) break;
      let best = null, bp = 0, bu = 0;
      for (const r of targets) { const D = defenseOf(r.i).power; const need = Math.ceil(D * 1.35 / unitPower(n)); if (need <= avail * .75) { const p = winChance(n, r.i, Math.min(avail, need)); if (p > bp) { bp = p; best = r; bu = Math.min(avail, need); } } }
      if (best && bp > (n.pers === "aggressive" ? .5 : .62)) attack(n, best.i, Math.max(1, bu)); else break;
    }
  }
  // aggressive AIs conquer native tribes when they can't settle
  if (n.pers === "aggressive" && settles === 0 && n.army - n.used > 2 && regs.length < adminCap(n) + 1 && rnd() < .3) {
    const t = G.regions.find(r => r.owner < 0 && canReach(n, r.i));
    if (t && winChance(n, t.i, n.army - n.used) > .75) attack(n, t.i, n.army - n.used);
  }
}
function driftRelations() {
  const al = G.nations.filter(n => n.alive);
  for (const a of al) for (const b of al) {
    if (b.id <= a.id) continue; const d = dip(a.id, b.id); if (!d.met) continue;
    let v = 0;
    if (d.trade) v += 1.5; if (d.ally) v += 2; if (d.war) v -= 2;
    if (a.gov === b.gov) v += .5;
    const border = owned(a).some(r => W.regions[r.i].adj.some(j => G.regions[j].owner === b.id));
    if (border && !d.ally) v -= .6;
    if (a.pers === "aggressive" || b.pers === "aggressive") v -= .3;
    // big empires make everyone nervous
    const ra = owned(a).length, rb = owned(b).length;
    if (ra > 18 || rb > 18) v -= Math.min(1.5, (Math.max(ra, rb) - 18) * .08);
    v -= ((a.id === G.player ? a.warmonger : 0) + (b.id === G.player ? b.warmonger : 0)) * .05;
    v += (rnd() - .5) * 2;
    v -= d.rel * .015; // drift toward neutral
    d.rel = clamp(d.rel + v, -100, 100);
    if (d.truce > 0) d.truce--;
  }
}

// ================= EVENTS =================
const fx = {
  gold: (n, v) => { n.gold += v; }, mat: (n, v) => { n.mat += v; },
  fac: (n, k, v, t = 6, why = "Recent event") => n.facMods.push({ k, v, why, t }),
  pop: (n, f) => owned(n).forEach(r => r.pop *= f),
  sci: (n, v) => { n.sciPts += v; },
  army: (n, v) => { n.army = Math.max(0, n.army + v); },
};
const eraScale = n => Math.pow(1.6, n.era);
const randRegion = n => pick(owned(n));
const EVENTS = [
  { id: "flood", title: "The River Floods", era: [0, 4], icon: "🌊", cond: n => owned(n).some(r => W.regions[r.i].t === "grass"),
    text: () => "Heavy rains swelled the river. Fields are underwater and villages are damaged.",
    ch: [{ t: "Pay to rebuild", d: n => `−${fmt(20 * eraScale(n))} gold`, f: n => fx.gold(n, -20 * eraScale(n)) },
         { t: "Let them manage", d: () => "−8% population, Commoners upset", f: n => { fx.pop(n, .92); fx.fac(n, "commoners", -10, 5, "Ignored the flood"); } }] },
  { id: "migrants", title: "Wandering Families", era: [0, 3], icon: "🧳",
    text: () => "A band of wandering families asks to settle among your people.",
    ch: [{ t: "Welcome them", d: () => "+10% population in your capital, Elders wary", f: n => { G.regions[n.capital].pop *= 1.1; fx.fac(n, "elders", -6, 5, "Foreign newcomers"); } },
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
    text: n => `Herders in ${W.regions[randRegion(n).i].n} found shining gold in a stream.`,
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
  { id: "pirates", title: "Pirates!", era: [1, 5], icon: "🏴‍☠️", cond: n => owned(n).some(r => W.regions[r.i].c),
    text: () => "Pirates are raiding your coasts and seizing merchant ships.",
    ch: [{ t: "Send an expedition", d: n => `−${fmt(14 * eraScale(n))} gold, Merchants pleased`, f: n => { fx.gold(n, -14 * eraScale(n)); fx.fac(n, "merchants", 10); } },
         { t: "Pay for safe passage", d: n => `−${fmt(6 * eraScale(n))} gold, Military scoffs`, f: n => { fx.gold(n, -6 * eraScale(n)); fx.fac(n, "warriors", -6); } }] },
  { id: "artist", title: "A Great Artist", era: [2, 7], icon: "🎨",
    text: () => "A brilliant artist offers to create a monument to your nation.",
    ch: [{ t: "Commission it", d: n => `−${fmt(20 * eraScale(n))} gold, everyone is proud`, f: n => { fx.gold(n, -20 * eraScale(n)); for (const k in FACTIONS) fx.fac(n, k, 6, 8, "National monument"); } },
         { t: "Decline", d: () => "Nothing happens", f: () => {} }] },
  { id: "quake", title: "Earthquake", era: [0, 7], icon: "🌋",
    text: n => `The ground shook violently in ${W.regions[n._r = randRegion(n).i].n}.`,
    ch: [{ t: "Rebuild quickly", d: n => `−${fmt(12 * eraScale(n))} gold, −${fmt(10 * eraScale(n))} materials`, f: n => { fx.gold(n, -12 * eraScale(n)); fx.mat(n, -10 * eraScale(n)); } },
         { t: "Leave the ruins", d: () => "A building in the region may be lost", f: n => { const r = G.regions[n._r] || randRegion(n); const ks = Object.keys(r.b); if (ks.length) delete r.b[pick(ks)]; r.pop *= .9; } }] },
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
  { id: "accident", title: "Factory Disaster", era: [5, 7], icon: "🏭", cond: n => owned(n).some(r => r.b.factory),
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
  G.nextEvent = G.turn + 2 + Math.floor(rnd() * 3);
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
  // natives slowly grow in the wild
  const we = worldEra();
  for (const r of G.regions) if (r.owner < 0) r.natives = Math.min(TER[W.regions[r.i].t].cap * W.regions[r.i].sizeF * (1 + .3 * we) * .35, r.natives * 1.01 + .01);
  updateContacts();
  G.turn++;
  { const e = Math.max(worldEra(), P().alive ? P().era - 1 : 0); G.year = Math.max(ERA_YEAR[e], Math.min(G.year + YEARS_PER_TURN[e], ERA_YEAR[e + 1] - (e === 7 ? 0 : 1))); }
  // victory checks
  const me = P();
  if (me.alive && owned(me).length >= Math.ceil(NR * .4)) victory(me, "domination");
  const rival = G.nations.find(n => n.alive && n.ai && owned(n).length >= Math.ceil(NR * .5));
  if (rival && !G.over) { G.over = true; G.outcome = { win: false, why: `The ${nm(rival)} now rules half the world. Your story ends here.` }; }
  const rivalMars = G.nations.find(n => n.alive && n.ai && has(n, "mars"));
  if (rivalMars && !G.over) { G.over = true; G.outcome = { win: false, why: `The ${nm(rivalMars)} founded a colony on Mars first. The future belongs to them.` }; }
  if (G.year >= 2100 && !G.over) { const rank = ranking(); G.over = true; G.outcome = { win: rank[0].id === G.player, why: rank[0].id === G.player ? "The year 2100 arrives and your nation stands first among all nations." : `The year 2100 arrives. The ${nm(rank[0])} leads the world; you finished #${rank.findIndex(n => n.id === G.player) + 1}.` }; }
  G.event = G.over ? null : rollEvent();
  G.lastReport = G.news.slice();
  save();
}
function score(n) { const regs = owned(n); return Math.round(regs.length * 10 + regs.reduce((a, r) => a + r.pop, 0) + n.techs.length * 8 + Object.values(regs).reduce((a, r) => a + Object.keys(r.b).length * 2, 0) + n.army); }
function ranking() { return G.nations.filter(n => n.alive).sort((a, b) => score(b) - score(a)); }
function victory(n, why) { if (G.over || n.id !== G.player) return; G.over = true; G.outcome = { win: true, why: why === "science" ? "Your colonists have landed on Mars. From a fire in the Stone Age to a new world among the stars: humanity's future is yours." : "Your nation now rules 40% of the world's regions. No power on Earth can rival you." }; }
function defeat() { G.over = true; G.outcome = { win: false, why: "Your nation has fallen. Its story lives on only in the history books of others." }; }

// ================= SAVE =================
const SAVE_KEY = "cradle-cosmos-save-v1";
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(G)); } catch (e) {} }
function loadSave() { try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } }

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
  view.k = clamp(view.k, minK(), 14);
  const mw = W.w * view.k, mh = W.h * view.k;
  view.x = mw <= cw ? (cw - mw) / 2 : clamp(view.x, cw - mw, 0);
  view.y = mh <= ch ? (ch - mh) / 2 : clamp(view.y, ch - mh, 0);
}
function centerOn(ri, k) {
  const s = W.regions[ri]; if (k) view.k = k;
  view.x = cw / 2 - s.lx * view.k; view.y = ch * .42 - s.ly * view.k; clampView(); dirty = true;
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
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  if (f > 0) { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; } else { r *= 1 + f; g *= 1 + f; b *= 1 + f; }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}
function draw() {
  dirty = false;
  if (!G) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (!wavePat) makeWaves();
  ctx.fillStyle = wavePat; ctx.fillRect(0, 0, cw, ch);
  ctx.setTransform(dpr * view.k, 0, 0, dpr * view.k, dpr * view.x, dpr * view.y);
  const k = view.k, me = G.player;
  // land shadow
  ctx.save(); ctx.translate(1.2 / Math.sqrt(k) * 2, 2.2 / Math.sqrt(k) * 2); ctx.fillStyle = "rgba(20,60,110,.25)";
  for (const s of W.regions) ctx.fill(s.path, "evenodd"); ctx.restore();
  for (const s of W.regions) {
    const r = G.regions[s.i];
    const o = r.owner >= 0 ? G.nations[r.owner] : null;
    ctx.fillStyle = o ? (r.i === o.capital ? shade(o.color, -.05) : o.color) : TER[s.t].col;
    ctx.fill(s.path, "evenodd");
    if (o && atWar(me, o.id)) { ctx.save(); ctx.clip(s.path, "evenodd"); ctx.strokeStyle = "rgba(120,0,0,.28)"; ctx.lineWidth = 3 / k; ctx.beginPath();
      const x0 = s.lx - 200, y0 = s.ly - 200; for (let i = 0; i < 400; i += 9 / Math.max(1, k / 2)) { ctx.moveTo(x0 + i, y0); ctx.lineTo(x0 + i - 200, y0 + 200); ctx.moveTo(x0 + i, y0 + 200); ctx.lineTo(x0 + i - 200, y0 + 400); } ctx.stroke(); ctx.restore(); }
  }
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 1 / k;
  for (const s of W.regions) ctx.stroke(s.path);
  // nation outlines: inner stroke in darker color
  for (const s of W.regions) {
    const r = G.regions[s.i]; if (r.owner < 0) continue;
    const o = G.nations[r.owner];
    ctx.save(); ctx.clip(s.path, "evenodd"); ctx.strokeStyle = shade(o.color, -.35); ctx.globalAlpha = .55; ctx.lineWidth = 3.2 / k; ctx.stroke(s.path); ctx.restore();
  }
  if (sel >= 0) { const s = W.regions[sel]; ctx.strokeStyle = "#fff"; ctx.lineWidth = 5 / k; ctx.stroke(s.path); ctx.strokeStyle = "#1d2a4d"; ctx.lineWidth = 2.2 / k; ctx.stroke(s.path); }
  // labels
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const fs = 11 / k;
  if (k > 1.7) {
    for (const s of W.regions) {
      if (s.ls * k < 20 && k < 6) continue;
      const r = G.regions[s.i];
      ctx.font = `700 ${fs}px Nunito, system-ui, sans-serif`;
      ctx.lineWidth = 3 / k; ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.fillStyle = "#1d2a4d";
      ctx.strokeText(s.n, s.lx, s.ly); ctx.fillText(s.n, s.lx, s.ly);
      let badges = "";
      if (r.owner >= 0 && G.nations[r.owner].capital === s.i) badges += "⭐";
      if (r.build) badges += "🔨";
      if (s.r && k > 3) badges += RES[s.r].icon;
      if (badges) { ctx.font = `${fs * 1.1}px system-ui, sans-serif`; ctx.fillText(badges, s.lx, s.ly + fs * 1.3); }
    }
  } else {
    for (const s of W.regions) { const r = G.regions[s.i]; if (r.owner >= 0 && G.nations[r.owner].capital === s.i) { ctx.font = `${13 / k}px system-ui`; ctx.fillText("⭐", s.lx, s.ly); } }
  }
  // nation names when zoomed out
  if (k < 3.2) {
    for (const n of G.nations) {
      if (!n.alive) continue; const regs = owned(n); if (!regs.length) continue;
      let x = 0, y = 0, w = 0; for (const r of regs) { const s = W.regions[r.i]; x += s.lx * s.a; y += s.ly * s.a; w += s.a; }
      x /= w; y /= w;
      const size = clamp(Math.sqrt(w) / 9, 9, 26) / k * Math.min(1.6, k);
      ctx.font = `600 ${size}px Fredoka, system-ui, sans-serif`;
      ctx.lineWidth = size / 4; ctx.strokeStyle = shade(n.color, -.55); ctx.fillStyle = "#fff";
      ctx.strokeText(n.name, x, y + 14 / k); ctx.fillText(n.name, x, y + 14 / k);
    }
  }
}
function loop() { if (dirty) draw(); requestAnimationFrame(loop); }

// touch/mouse pan & zoom
const ptrs = new Map(); let pinch = null, downAt = null, moved = 0;
cv.addEventListener("pointerdown", e => { cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); downAt = { x: e.clientX, y: e.clientY, t: Date.now() }; moved = 0;
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), k: view.k, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, vx: view.x, vy: view.y }; } });
cv.addEventListener("pointermove", e => {
  if (!ptrs.has(e.pointerId)) return;
  const p = ptrs.get(e.pointerId), dx = e.clientX - p.x, dy = e.clientY - p.y;
  p.x = e.clientX; p.y = e.clientY;
  if (ptrs.size === 2 && pinch) {
    const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y);
    const nk = clamp(pinch.k * d / pinch.d, minK(), 14), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
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
  view.k = clamp(view.k * Math.exp(-e.deltaY * .0015), minK(), 14); view.x = e.clientX - rect.left - mx * view.k; view.y = e.clientY - rect.top - my * view.k; clampView(); dirty = true; }, { passive: false });
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
$("zhome").onclick = () => { if (G && P().alive) centerOn(P().capital, Math.max(view.k, 3)); };
function zoomBy(f) { const cx = cw / 2, cy = ch / 2, mx = (cx - view.x) / view.k, my = (cy - view.y) / view.k; view.k = clamp(view.k * f, minK(), 14); view.x = cx - mx * view.k; view.y = cy - my * view.k; clampView(); dirty = true; }

// ================= UI =================
const sheet = $("sheet"), panel = $("panel"), modal = $("modal");
function hud() {
  const n = P(), E = econ(n);
  $("hName").textContent = nm(n);
  $("hFlag").style.background = n.color;
  $("hYear").textContent = `${G.year < 0 ? -G.year + " BCE" : G.year + " CE"} · ${ERAS[n.era]} · Turn ${G.turn}`;
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
const afford = (n, c) => n.gold >= c.g && n.mat >= c.m;

// ---------- region sheet ----------
function openRegion(ri) {
  closePanel();
  const s = W.regions[ri], r = G.regions[ri], n = P(), o = r.owner >= 0 ? G.nations[r.owner] : null;
  const T = TER[s.t]; const res = s.r ? RES[s.r] : null;
  let h = `<div class="sh-head"><div><h3>${esc(s.n)}</h3><div class="sub">${T.name}${res ? ` · ${res.icon} ${res.name}` : ""}${s.c ? " · Coastal" : ""}</div></div><button class="x" data-act="close" aria-label="Close">✕</button></div>`;
  if (o) h += `<div class="owner"><span class="sw" style="background:${o.color}"></span>${o.id === n.id ? "Your region" : esc(nm(o))}${o.capital === ri ? " · Capital ⭐" : ""}${o.id !== n.id && atWar(n.id, o.id) ? ' <span class="pill bad">At war</span>' : ""}</div>`;
  else h += `<div class="owner"><span class="sw" style="background:${T.col}"></span>Unclaimed · native tribes (${fmt(r.natives)} people)</div>`;
  if (o && o.id === n.id) {
    const cap = regionCap(r, n), pr = econ(n).per.find(p => p.r === r);
    h += `<div class="stats4"><div><small>People</small><b>${fmt(r.pop)}<span>/${fmt(cap)}</span></b></div><div><small>Food</small><b>${fmt(pr.food)}</b></div><div><small>Gold</small><b>${fmt(pr.gold)}</b></div><div><small>Mats</small><b>${fmt(pr.mat)}</b></div></div>`;
    h += `<div class="bar-row"><small>Unrest</small><div class="bar"><i style="width:${r.unrest}%;background:${r.unrest > 60 ? "var(--bad)" : r.unrest > 30 ? "var(--warn)" : "var(--good)"}"></i></div><span>${Math.round(r.unrest)}</span></div>`;
    if (r.culture !== n.id && r.culture >= 0) h += `<p class="note">These people still feel loyal to the ${esc(nm(G.nations[r.culture]))}. Keep stability high and build Roads to win them over.</p>`;
    const built = Object.keys(r.b);
    h += `<h4>Buildings</h4><div class="blds">${built.length ? built.map(k => `<span class="bchip" title="${esc(BK[k].d)}">${BK[k].icon} ${BK[k].name}</span>`).join("") : '<span class="muted">None yet</span>'}${r.build ? `<span class="bchip building">🔨 ${BK[r.build].name} (next turn)</span>` : ""}</div>`;
    const avail = BLD.filter(b => canBuild(n, r, b));
    const next = BLD.filter(b => !r.b[b.k] && !has(n, b.tech) && b.era <= n.era + 1 && !(b.coastal && !s.c)).slice(0, 3);
    if (r.build) h += `<p class="note">One construction at a time per region. Check back next turn.</p>`;
    else if (avail.length) {
      h += `<h4>Build</h4><div class="opts">` + avail.map(b => { const c = buildCost(n, b); const ok = afford(n, c);
        return `<button class="opt" data-act="build" data-k="${b.k}" ${ok ? "" : "disabled"}><span class="oi">${b.icon}</span><span class="ot"><b>${b.name}</b><small>${esc(b.d)} · upkeep ${b.up}🪙</small></span><span class="oc">${costTxt(c)}</span></button>`; }).join("") + `</div>`;
    } else h += `<p class="note">Nothing new to build here. Research more technologies to unlock buildings.</p>`;
    if (next.length && !r.build) h += `<p class="muted small">Coming with research: ${next.map(b => `${b.icon} ${b.name} (${TECH[b.tech].name})`).join(", ")}</p>`;
  } else if (!o) {
    const reach = canReach(n, ri), c = settleCost(n);
    h += `<div class="stats4"><div><small>Room for</small><b>${fmt(regionCap(r, n))}</b></div><div><small>Food/person</small><b>${T.food}</b></div><div><small>Materials</small><b>${T.prod}</b></div><div><small>Gold</small><b>${T.gold}</b></div></div>`;
    if (reach) {
      h += `<div class="opts"><button class="opt" data-act="settle" ${afford(n, c) ? "" : "disabled"}><span class="oi">🏕️</span><span class="ot"><b>Send settlers</b><small>Peacefully join this land to your nation</small></span><span class="oc">${costTxt(c)}</span></button>`;
      const av = n.army - n.used;
      if (av > 0) h += `<button class="opt" data-act="attackPick"><span class="oi">🗡️</span><span class="ot"><b>Conquer the tribes</b><small>Free, but costs soldiers. Win chance with all ${av}: ${Math.round(winChance(n, ri, av) * 100)}%</small></span><span class="oc"></span></button>`;
      h += `</div>`;
    } else h += `<p class="note">Too far away. You can reach land next to your regions${has(n, "sailing") ? ", across short seas" : ""}${has(n, "navigation") ? ", and distant coasts" : has(n, "sailing") ? " (Navigation unlocks oceans)" : " (Sailing unlocks short sea crossings)"}.</p>`;
  } else {
    const d = dip(n.id, o.id);
    h += `<div class="stats4"><div><small>People</small><b>${fmt(r.pop)}</b></div><div><small>Defense</small><b>${fmt(defenseOf(ri).power)}</b></div><div><small>Their army</small><b>${fmt(power(o))}</b></div><div><small>Relations</small><b>${Math.round(d.rel)}</b></div></div>`;
    if (d.war) {
      if (canReach(n, ri)) { const av = n.army - n.used;
        h += av > 0 ? `<div class="opts"><button class="opt war" data-act="attackPick"><span class="oi">⚔️</span><span class="ot"><b>Attack ${esc(s.n)}</b><small>Choose how many regiments to send</small></span></button></div>` : `<p class="note">All your regiments have fought this turn. Recruit more or end the turn.</p>`;
      } else h += `<p class="note">Out of reach. Attack from a neighboring region${has(n, "sailing") ? "" : " (or research Sailing)"}.</p>`;
    } else h += `<div class="opts"><button class="opt" data-act="diplo" data-id="${o.id}"><span class="oi">🤝</span><span class="ot"><b>Diplomacy with ${esc(o.name)}</b><small>Trade, alliances, gifts or war</small></span></button></div>`;
  }
  sheet.innerHTML = h; sheet.hidden = false; sheet.dataset.ri = ri; sheet.scrollTop = 0;
}
function closeSheet() { sheet.hidden = true; sel = -1; dirty = true; }
sheet.addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (!b || b.disabled) return;
  const ri = +sheet.dataset.ri, n = P(), r = G.regions[ri];
  const a = b.dataset.act;
  if (a === "close") closeSheet();
  else if (a === "build") { startBuild(n, r, BK[b.dataset.k]); toast(`${BK[b.dataset.k].name} under construction`); refresh(); openRegion(ri); }
  else if (a === "settle") { settle(n, ri); G.news = []; toast(`Settlers reached ${W.regions[ri].n}`); updateContacts(); refresh(); openRegion(ri); }
  else if (a === "attackPick") attackDialog(ri);
  else if (a === "diplo") openNationDetail(+b.dataset.id);
});
function attackDialog(ri) {
  const n = P(), av = n.army - n.used, s = W.regions[ri];
  let k = Math.min(av, Math.max(1, Math.ceil(defenseOf(ri).power * 1.4 / unitPower(n))));
  const render = () => {
    const p = winChance(n, ri, k);
    showModal(`<div class="mi">⚔️</div><h2>Attack ${esc(s.n)}</h2>
      <p>Defense strength <b>${fmt(defenseOf(ri).power)}</b>. Each of your regiments brings <b>${fmt(unitPower(n))}</b>.</p>
      <label class="slider"><span>Regiments to send: <b id="akv">${k}</b> of ${av}</span><input id="ak" type="range" min="1" max="${av}" value="${k}"></label>
      <div class="odds"><div class="bar big"><i style="width:${p * 100}%;background:${p > .66 ? "var(--good)" : p > .4 ? "var(--warn)" : "var(--bad)"}"></i></div><b>${Math.round(p * 100)}% chance to win</b></div>
      <div class="row"><button class="btn ghost" data-m="cancel">Cancel</button><button class="btn red" data-m="go">Attack!</button></div>`, a => {
        if (a === "go") { const res = attack(n, ri, k); G.news = []; refresh(); closeSheet();
          showModal(`<div class="mi">${res.win ? "🚩" : "🛡️"}</div><h2>${res.win ? "Victory!" : "Repelled"}</h2><p>${res.win ? `${esc(s.n)} is yours.` : `The defenders of ${esc(s.n)} held.`} You lost ${res.aLoss} regiment${res.aLoss === 1 ? "" : "s"}${res.def ? `; they lost ${res.dLoss}` : ""}.</p><div class="row"><button class="btn" data-m="ok">OK</button></div>`);
          sel = ri; dirty = true; }
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
  const html = { nation: panelNation, research: panelResearch, policy: panelPolicy, world: panelWorld }[name]();
  panel.innerHTML = html; panel.hidden = false; panel.scrollTop = 0;
}
function closePanel() { panel.hidden = true; curPanel = null; document.querySelectorAll(".tab").forEach(t => t.classList.remove("on")); }
function refresh() { hud(); dirty = true; if (curPanel) { const st = panel.scrollTop; openPanel(curPanel); panel.scrollTop = st; } }
const ph = (title, sub) => `<div class="p-head"><div><h2>${title}</h2>${sub ? `<div class="sub">${sub}</div>` : ""}</div><button class="x" data-act="pclose" aria-label="Close">✕</button></div>`;
const line = (label, v, cls = "") => `<div class="ln ${cls}"><span>${label}</span><b>${v}</b></div>`;

function panelNation() {
  const n = P(), E = econ(n), regs = owned(n), uc = unitCost(n), ma = maxArmy(n);
  let h = ph(esc(nm(n)), `${GOVS[n.gov].name} · ${regs.length} region${regs.length === 1 ? "" : "s"} · ${fmt(E.pop)} people`);
  h += `<div class="card"><h4>Treasury <span class="muted">per turn</span></h4>
    ${line("Taxes", sgn(E.tax))}${line("Trade (automatic)", sgn(E.routeGold))}${line("Luxury exports", sgn(E.luxGold))}${E.foodGold ? line("Surplus food sold", sgn(E.foodGold)) : ""}
    ${line("Building upkeep", sgn(-E.bUp))}${line("Army upkeep", sgn(-E.armyUp))}${E.imports ? line("Resource imports", sgn(-E.imports)) : ""}${E.govUp ? line("Overextension costs", sgn(-E.govUp), "bad") : ""}
    ${line("Net gold", sgn(E.goldNet), E.goldNet < 0 ? "bad total" : "good total")}
    ${line("Materials", sgn(E.mat))}${line("Science", sgn(E.sci))}${line("Food", `${fmt(E.food)} grown / ${fmt(E.need)} eaten`, E.surplus < 0 ? "bad" : "")}</div>`;
  // trade report
  h += `<div class="card"><h4>Trade & Resources <span class="pill">Run by your merchants</span></h4>
    <p class="muted small">Your merchants trade on their own. Build Harbors, Roads, Markets and Railways, sign trade pacts, and set the Trade law to earn more.</p>
    ${line("Trade partners (pacts)", E.partners.length ? E.partners.map(o => esc(o.name)).join(", ") : "None")}
    ${line("Friendly contacts", E.peaceful)}
    ${line("Luxuries owned", Object.keys(E.luxCount).length ? Object.entries(E.luxCount).map(([k, c]) => `${RES[k].icon}${c > 1 ? "×" + c : ""}`).join(" ") : "None")}
    ${E.strat.map(s => line(`${RES[s.res].icon} ${RES[s.res].name} for the army`, s.st === "have" ? '<span class="good">Own supply</span>' : s.st === "import" ? `<span class="warn">Imported from ${esc(s.from.name)} (−${s.cost}🪙)</span>` : `<span class="bad">Missing${s.pen ? ` (−${s.pen * 100}% army)` : ""}</span>`)).join("")}</div>`;
  // army
  h += `<div class="card"><h4>Army</h4>
    ${line("Regiments", `${n.army} / ${ma} max`)}${line("Strength per regiment", fmt(unitPower(n)))}${line("Total strength", fmt(power(n)))}${line("Ready to fight this turn", n.army - n.used)}
    <div class="row wrap">${[1, 3, 5].map(k => { const c = { g: uc.g * k, m: uc.m * k }; return `<button class="btn small" data-act="recruit" data-k="${k}" ${afford(n, c) && n.army + k <= ma ? "" : "disabled"}>Recruit ${k} · ${costTxt(c)}</button>`; }).join("")}
    <button class="btn small ghost" data-act="disband" ${n.army > 0 ? "" : "disabled"}>Disband 1</button></div>
    <p class="muted small">Upkeep ${fmt(unitUpkeep(n))} gold per regiment each turn. The Conscription law sets your maximum.</p></div>`;
  // victory
  const me = regs.length, need = Math.ceil(NR * .4);
  h += `<div class="card"><h4>Paths to victory</h4>
    ${line("🚀 Reach Mars (research Mars Colony)", has(n, "rocketry") ? (regs.some(r => r.b.spaceport) ? "Spaceport ready" : "Build a Spaceport") : `${ERAS[n.era]}`)}
    ${line("🌍 Rule 40% of the world", `${me} / ${need} regions`)}
    ${line("⌛ Lead the world in 2100", `#${ranking().findIndex(x => x.id === n.id) + 1} by score`)}</div>`;
  h += `<div class="card"><h4>Your regions</h4><div class="rlist">${regs.sort((a, b) => b.pop - a.pop).map(r => `<button class="rl" data-act="goto" data-ri="${r.i}"><span>${r.i === n.capital ? "⭐ " : ""}${esc(W.regions[r.i].n)}${r.build ? " 🔨" : ""}</span><small>${fmt(r.pop)} ppl · ${Object.keys(r.b).length} bldg${r.unrest > 50 ? ' · <span class="bad">unrest</span>' : ""}</small></button>`).join("")}</div></div>`;
  h += `<div class="card"><h4>Game</h4><div class="row wrap"><button class="btn small ghost" data-act="help">How to play</button><button class="btn small ghost" data-act="newgame">New game</button></div></div>`;
  return h;
}
function panelResearch() {
  const n = P(), E = econ(n);
  let h = ph("Research", `${fmt(E.sci)} science per turn · ${ERAS[n.era]}`);
  if (n.era < 7) { const got = eraTechs(n.era).filter(t => has(n, t.id)).length;
    h += `<div class="card"><div class="bar-row"><small>Next age</small><div class="bar"><i style="width:${got / eraNeed(n.era) * 100}%;background:var(--accent)"></i></div><span>${got}/${eraNeed(n.era)}</span></div><p class="muted small">Discover ${eraNeed(n.era)} technologies of the ${ERAS[n.era]} to enter the ${ERAS[n.era + 1]}.</p></div>`; }
  { const fg = Math.round(60 * Math.pow(1.7, n.era)), fs = Math.round(fg / 3);
    h += `<div class="card"><h4>Fund your scientists</h4><p class="muted small">Turn spare gold into research. 3 gold buys 1 science.</p><div class="row wrap">${[1, 4].map(k => `<button class="btn small" data-act="fund" data-g="${fg * k}" ${n.gold >= fg * k ? "" : "disabled"}>🪙${fmt(fg * k)} → 🔬${fmt(fs * k)}</button>`).join("")}</div></div>`; }
  h += `<label class="toggle"><input type="checkbox" id="autoR" ${n.autoResearch ? "checked" : ""}> Let advisors pick the next research automatically</label>`;
  const order = [n.era, n.era + 1].filter(e => e <= 7);
  for (let e = n.era - 1; e >= 0; e--) order.push(e);
  for (const e of order) {
    if (e === n.era - 1) h += `<details class="past"><summary class="era-h">Earlier ages</summary>`;
    h += `<h4 class="era-h">${ERAS[e]}${e === n.era ? " · now" : e === n.era + 1 ? " · next" : ""}</h4><div class="techs">`;
    for (const t of TECHS.filter(t => t.era === e)) {
      const done = has(n, t.id), cur = n.research === t.id, locked = e > n.era || (t.id === "mars" && !owned(n).some(r => r.b.spaceport));
      const pct = cur ? Math.min(100, n.sciPts / t.cost * 100) : 0;
      h += `<button class="tech ${done ? "done" : cur ? "cur" : locked ? "locked" : ""}" data-act="tech" data-t="${t.id}" ${done || locked ? "disabled" : ""}>
        <b>${t.name}</b><small>${t.desc}</small><span class="tc">${done ? "✓ Known" : cur ? `${Math.floor(pct)}% · ${Math.max(1, Math.ceil((t.cost - n.sciPts) / Math.max(1, E.sci)))} turns` : locked ? (e > n.era ? "Next age" : "Needs Spaceport") : `${t.cost} 🔬`}</span>${cur ? `<i class="tp" style="width:${pct}%"></i>` : ""}</button>`;
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
  h += `<div class="card"><h4>Government</h4><div class="govs">`;
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
  let h = ph("World", "Nations you have met");
  if (G.pendingPeace) { const o = G.nations[G.pendingPeace.from]; if (o && o.alive && atWar(n.id, o.id)) {
    const pp = G.pendingPeace; h += `<div class="card offer"><h4>🕊️ Peace offer from the ${esc(nm(o))}</h4><p>${pp.tribute ? (pp.payer === n.id ? `They demand ${fmt(pp.tribute)} gold from you.` : `They will pay you ${fmt(pp.tribute)} gold.`) : "They offer an even peace."}</p><div class="row"><button class="btn ghost small" data-act="peaceNo">Refuse</button><button class="btn small" data-act="peaceYes" ${pp.payer === n.id && n.gold < pp.tribute ? "disabled" : ""}>Accept</button></div></div>`;
  } else G.pendingPeace = null; }
  const met = G.nations.filter(o => o.alive && o.id !== n.id && dip(n.id, o.id).met).sort((a, b) => score(b) - score(a));
  if (!met.length) h += `<p class="note">You haven't met anyone yet. Expand your borders or research Sailing to find your neighbors.</p>`;
  for (const o of met) { const d = dip(n.id, o.id);
    h += `<button class="nat" data-act="nat" data-id="${o.id}"><span class="sw big" style="background:${o.color}"></span><span class="nt"><b>${esc(nm(o))}</b><small>${ERAS[o.era]} · ${owned(o).length} regions · ${PERS[o.pers]}</small></span><span class="ns">${d.war ? '<span class="pill bad">War</span>' : d.ally ? '<span class="pill good">Ally</span>' : d.trade ? '<span class="pill">Trade</span>' : ""}<small>${relWord(d.rel)}</small></span></button>`; }
  const rk = ranking();
  h += `<div class="card"><h4>World ranking</h4>${rk.slice(0, 10).map((o, i) => `<div class="ln ${o.id === n.id ? "me" : ""}"><span>${i + 1}. <span class="sw" style="background:${o.color}"></span>${o.id === n.id || dip(n.id, o.id).met ? esc(o.name) : "Unknown nation"}</span><b>${score(o)}</b></div>`).join("")}</div>`;
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
  const g = Math.round(20 * Math.pow(1.6, n.era)), trib = Math.round(30 * Math.pow(1.6, o.era));
  let h = ph(`<span class="sw big" style="background:${o.color}"></span> ${esc(nm(o))}`, `${GOVS[o.gov].name} · ${ERAS[o.era]} · ${PERS[o.pers]}`);
  h += `<button class="btn ghost small back" data-act="world">← All nations</button>`;
  h += `<div class="card">${line("Relations", `${Math.round(d.rel)} · ${relWord(d.rel)}`)}${line("Regions", owned(o).length)}${line("Army strength", `${fmt(power(o))} (yours ${fmt(power(n))})`)}${line("Technologies", `${o.techs.length} (yours ${n.techs.length})`)}${line("Status", d.war ? `At war · score ${Math.round(wscore(n.id, o.id))}` : d.ally ? "Allied" : d.trade ? "Trade pact" : d.truce > 0 ? `Truce (${d.truce} turns)` : "Peace")}</div>`;
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
    h += `<button class="opt war" data-act="dWar" data-id="${id}" ${blocked ? "disabled" : ""}><span class="oi">⚔️</span><span class="ot"><b>Declare war</b><small>${blocked || "Breaks treaties. Other nations will remember."}</small></span></button>`;
  }
  h += `</div>`;
  panel.innerHTML = h; panel.hidden = false; panel.scrollTop = 0;
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("on", t.dataset.p === "world"));
}
panel.addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (!b || b.disabled) return;
  const n = P(), a = b.dataset.act, id = +b.dataset.id;
  const o = G.nations[id];
  switch (a) {
    case "pclose": closePanel(); break;
    case "recruit": recruit(n, +b.dataset.k); toast(`Recruited ${b.dataset.k} regiment${b.dataset.k > 1 ? "s" : ""}`); refresh(); break;
    case "disband": n.army--; refresh(); break;
    case "goto": closePanel(); sel = +b.dataset.ri; centerOn(sel, Math.max(view.k, 4)); openRegion(sel); break;
    case "tech": n.research = b.dataset.t; refresh(); break;
    case "fund": { const g = +b.dataset.g; n.gold -= g; n.sciPts += g / 3; toast(`+${fmt(g / 3)} science`); refresh(); break; }
    case "gov": confirmModal(`Switch to ${GOVS[b.dataset.g].name}?`, "Your nation will go through 2 turns of turmoil with reduced output, and factions will need time to adjust.", () => { n.gov = b.dataset.g; n.anarchy = 2; n.govCool = 10; n.lastElect = G.turn; log(`Your nation is now a ${GOVS[n.gov].name}.`, "🏛️"); refresh(); }); break;
    case "law": n.laws[b.dataset.l] = b.dataset.o; n.stab = stabilityOf(n, n.fac); refresh(); break;
    case "nat": openNationDetail(id); break;
    case "world": openPanel("world"); break;
    case "help": showHelp(); break;
    case "newgame": confirmModal("Start a new game?", "Your current nation will be lost.", () => { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} G = null; closePanel(); showTitle(); }); break;
    case "peaceYes": { const pp = G.pendingPeace; makePeace(n, G.nations[pp.from], pp.tribute, G.nations[pp.payer] || null); G.pendingPeace = null; G.news = []; refresh(); break; }
    case "peaceNo": G.pendingPeace = null; refresh(); break;
    case "dGift": { const g = Math.round(20 * Math.pow(1.6, n.era)); n.gold -= g; dip(n.id, id).rel += 12; toast(`The ${o.name} appreciate your gift`); hud(); openNationDetail(id); break; }
    case "dTrade": if (aiAccept(o, "trade", n)) { dip(n.id, id).trade = true; toast("Trade pact signed!"); } else { toast(`The ${o.name} declined`); dip(n.id, id).rel -= 2; } hud(); openNationDetail(id); break;
    case "dTradeEnd": dip(n.id, id).trade = false; dip(n.id, id).rel -= 10; hud(); openNationDetail(id); break;
    case "dAlly": if (aiAccept(o, "ally", n)) { dip(n.id, id).ally = true; dip(n.id, id).trade = true; toast("Alliance formed!"); } else { toast(`The ${o.name} declined`); } hud(); openNationDetail(id); break;
    case "dAllyEnd": dip(n.id, id).ally = false; dip(n.id, id).rel -= 25; hud(); openNationDetail(id); break;
    case "dTrib": { const t = Math.round(30 * Math.pow(1.6, o.era)); if (aiAccept(o, "tribute", n) && o.gold >= t * .5) { const paid = Math.min(t, Math.max(0, o.gold)); o.gold -= paid; n.gold += paid; dip(n.id, id).rel -= 20; toast(`They paid ${fmt(paid)} gold`); } else { dip(n.id, id).rel -= 15; toast("They refused!"); } hud(); openNationDetail(id); break; }
    case "dWar": confirmModal(`Declare war on the ${nm(o)}?`, "Treaties break and other nations will trust you less. Attack their regions from the map.", () => { declareWar(n, o); G.news = []; refresh(); openNationDetail(id); }); break;
    case "dPeace": if (aiAccept(o, "peace", n)) { makePeace(n, o); G.news = []; toast("Peace!"); } else toast("They refused"); refresh(); openNationDetail(id); break;
    case "dPeaceT": { const t = Math.round(30 * Math.pow(1.6, o.era)); if (aiAccept(o, "peace", n) || wscore(n.id, id) > 20) { makePeace(n, o, Math.min(t, Math.max(0, o.gold)), o); G.news = []; toast("Peace with tribute!"); } else toast("They refused"); refresh(); openNationDetail(id); break; }
  }
});
panel.addEventListener("change", e => { if (e.target.id === "autoR") { P().autoResearch = e.target.checked; if (e.target.checked && !P().research) P().research = chooseResearch(P()); refresh(); } });
document.querySelectorAll(".tab").forEach(t => t.onclick = () => { if (curPanel === t.dataset.p) closePanel(); else openPanel(t.dataset.p); });

// ---------- modals ----------
let modalCb = null;
function showModal(html, cb) { modal.querySelector(".mbox").innerHTML = html; modal.hidden = false; modalCb = cb || null; }
modal.addEventListener("click", e => { const b = e.target.closest("[data-m]"); if (!b || b.disabled) return; const a = b.dataset.m; const cb = modalCb; if (a !== "keep") { modal.hidden = true; modalCb = null; } if (cb) cb(a); });
function confirmModal(title, text, yes) { showModal(`<h2>${esc(title)}</h2><p>${esc(text)}</p><div class="row"><button class="btn ghost" data-m="no">Cancel</button><button class="btn" data-m="yes">Confirm</button></div>`, a => { if (a === "yes") yes(); }); }
let toastT = 0;
function toast(t) { const el = $("toast"); el.textContent = t; el.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove("on"), 1900); }

function afterTurnFlow() {
  hud(); dirty = true;
  if (G.over) { return showEnd(); }
  const items = G.lastReport.filter(x => x.p !== false);
  const showEvent = () => {
    if (!G.event) return;
    const e = EVENTS.find(x => x.id === G.event.id), n = P();
    showModal(`<div class="mi">${e.icon}</div><h2>${e.title}</h2><p>${esc(G.event.text)}</p><div class="choices">${e.ch.map((c, i) => `<button class="choice" data-m="c${i}"><b>${esc(c.t)}</b><small>${esc(c.d(n))}</small></button>`).join("")}</div>`, a => {
      const c = e.ch[+a.slice(1)]; G.news = []; c.f(n); G.event = null; n.stab = stabilityOf(n, n.fac); save(); refresh(); });
  };
  if (items.length) {
    showModal(`<h2>${G.year < 0 ? -G.year + " BCE" : G.year + " CE"}</h2><div class="news">${items.map(x => `<div class="nw ${x.p === null || x.p === true ? "" : "far"}"><span>${x.i}</span><p>${esc(x.t)}</p></div>`).join("")}</div><div class="row"><button class="btn" data-m="ok">Continue</button></div>`, showEvent);
  } else showEvent();
  if (G.pendingPeace) toast("A peace offer awaits in World");
}
$("endTurn").onclick = () => {
  if (!G || G.over) return;
  if (G.event) return afterTurnFlow();
  const btn = $("endTurn"); btn.disabled = true; btn.classList.add("busy");
  setTimeout(() => { try { endTurn(); } finally { btn.disabled = false; btn.classList.remove("busy"); } closeSheet(); if (curPanel) refresh(); afterTurnFlow(); }, 30);
};
function showEnd() {
  const o = G.outcome;
  showModal(`<div class="mi">${o.win ? "🏆" : "🏚️"}</div><h2>${o.win ? "Victory!" : "The End"}</h2><p>${esc(o.why)}</p><p class="muted">Final score ${score(P())} · Turn ${G.turn} · ${G.year < 0 ? -G.year + " BCE" : G.year + " CE"}</p><div class="row"><button class="btn ghost" data-m="look">Look at the map</button><button class="btn" data-m="new">New game</button></div>`,
    a => { if (a === "new") { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} G = null; showTitle(); } });
}
function showHelp() {
  showModal(`<h2>How to play</h2><div class="help">
  <p><b>Goal.</b> Grow a tribe into a world power. Win by founding a colony on Mars, ruling 40% of the world, or leading in score when 2100 arrives.</p>
  <p><b>Turns.</b> Make your choices, then tap <b>End Turn</b>. Early turns cover decades; later ones cover single years.</p>
  <p><b>Your nation runs itself.</b> People grow, food is shared, merchants trade and resources are imported automatically. You steer it with buildings, laws and diplomacy.</p>
  <p><b>Regions.</b> Tap a region on the map. In your own regions you can construct buildings (one at a time). Next to your borders you can send settlers or conquer.</p>
  <p><b>Research.</b> Science unlocks buildings, governments, laws and new ages. Advance through 8 ages from the Stone Age to the Information Age.</p>
  <p><b>Stability.</b> Factions like Commoners, Clergy, Nobles and Merchants each want different things. Keep them happy or face unrest, revolts, coups and lost elections.</p>
  <p><b>War & diplomacy.</b> Sign trade pacts and alliances, send gifts, or declare war and attack enemy regions you can reach. Strategic resources like copper, iron and oil make your army stronger.</p>
  <p><b>Map.</b> Drag to move, pinch or scroll to zoom. ⭐ marks capitals, 🔨 marks construction.</p></div>
  <div class="row"><button class="btn" data-m="ok">Got it</button></div>`);
}

// ---------- title & setup ----------
let setupState = null;
function showTitle() {
  closePanel(); closeSheet();
  $("title").hidden = false; $("game").classList.add("dim");
  const s = loadSave();
  $("btnContinue").hidden = !s;
  if (s) $("btnContinue").querySelector("small").textContent = `${s.nations[s.player].name} · ${s.year < 0 ? -s.year + " BCE" : s.year + " CE"}`;
  demoWorld();
}
function demoWorld() { // a pretty world for the title backdrop
  if (G) return;
  G = { turn: 0, year: -4000, player: 0, nations: [], regions: W.regions.map((s, i) => ({ i, owner: -1, b: {}, natives: 1, pop: 0 })), dip: {}, news: [], setup: false, demo: true };
  view.k = minK(); clampView(); dirty = true;
}
$("btnContinue").onclick = () => { const s = loadSave(); if (!s) return; G = s; startPlaying(); };
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
  $("sInfo").innerHTML = `<b>${esc(s.n)}</b> · ${TER[s.t].name}${s.r ? ` · ${RES[s.r].icon} ${RES[s.r].name}` : ""}${s.c ? " · Coastal" : ""}`;
  $("sDiff").querySelectorAll("button").forEach(b => b.classList.toggle("on", +b.dataset.d === st.diff));
  G.setup = true; sel = ri; centerOn(ri, Math.max(minK() * 2.2, 2.5));
}
$("sName").oninput = e => { setupState.name = e.target.value.slice(0, 18); };
$("sColors").onclick = e => { const b = e.target.closest("[data-c]"); if (b) { setupState.color = b.dataset.c; renderSetup(); } };
$("sStarts").onclick = e => { const b = e.target.closest("[data-s]"); if (b) { setupState.start = b.dataset.s; renderSetup(); } };
$("sDiff").onclick = e => { const b = e.target.closest("[data-d]"); if (b) { setupState.diff = +b.dataset.d; renderSetup(); } };
$("sRandomName").onclick = () => { setupState.name = genName(); renderSetup(); };
function setupPick(ri) { const nmx = W.regions[ri].n; setupState.start = nmx; renderSetup(); if (!CRADLES.includes(nmx)) $("sInfo").innerHTML += ' <span class="muted">(custom start)</span>'; }
$("sBack").onclick = () => { $("setup").hidden = true; G.setup = false; sel = -1; showTitle(); };
$("sGo").onclick = () => {
  const st = setupState; const name = (st.name || "").trim() || genName();
  $("setup").hidden = true; G = null;
  newGame({ name: name.replace(/^\w/, c => c.toUpperCase()), color: st.color, start: st.start, diff: st.diff });
  G.lastReport = G.news.slice(); save();
  startPlaying(true);
};
function startPlaying(fresh) {
  $("title").hidden = true; $("setup").hidden = true; $("game").classList.remove("dim");
  G.setup = false; sel = -1;
  centerOn(P().capital, Math.max(minK() * 3, 4));
  hud(); dirty = true;
  if (fresh) showModal(`<div class="mi">🔥</div><h2>${esc(nm(P()))}</h2><p>Your people gather around the fire in ${esc(W.regions[P().capital].n)}. ${ERAS[0]}, ${-G.year} BCE.</p><div class="help small"><p>• Tap your region ⭐ to build. Tap neighboring land to send settlers.</p><p>• Your advisors already picked a research project. Change it in Research.</p><p>• Tap <b>End Turn</b> when you're ready.</p></div><div class="row"><button class="btn ghost" data-m="help">How to play</button><button class="btn" data-m="ok">Begin</button></div>`, a => { if (a === "help") showHelp(); });
  else if (G.over) showEnd();
  else if (G.event) afterTurnFlow();
}

// ================= BOOT =================
window.addEventListener("resize", resize);
if (window.ResizeObserver) new ResizeObserver(resize).observe(cv);
document.addEventListener("keydown", e => { if (e.key === "Escape") { if (!modal.hidden) return; if (!panel.hidden) closePanel(); else closeSheet(); } });
function start(data) {
  resize();
  window.claude?.hot?.snapshot?.(() => ({ G: G && !G.demo ? G : null }));
  if (data && data.G) { G = data.G; startPlaying(); } else showTitle();
  requestAnimationFrame(loop);
}
// test hooks for automated play
window.__c2c = { get G() { return G; }, newGame, endTurn, aiTurn, econ, P, owned, TECHS, score, ranking, dip, aiAccept, makePeace, atWar };
const hot = window.claude?.hot;
hot?.ready ? hot.ready(start) : start(hot?.data ?? {});
})();
