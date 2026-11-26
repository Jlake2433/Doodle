# Parked plans

Decisions we've agreed on but haven't built yet. We're finishing the Stone Age first.

## Great minds (switched off for now: `GREAT_MINDS = false` in game.js)

- Great minds are not a Stone Age thing. Early on, a tribe gains research on its own and stays insulated.
- Later, peoples leak knowledge to each other through trade, and great minds push research forward.
- A great mind **masters a field the people already know**; they don't unlock it. For example, after agriculture is known, a farming genius dominates that field.
- While they live:
  - their own people get **+25% research** in that field
  - the rest of their **continent** gets **+10%**
- Continents are the standard ones: Europe, Asia (including the Middle East), Africa, North America, South America, Oceania.
- Sharing across a continent should depend on good trade relations. To be designed later.
- **World history:** only the dominant mind in a field, meaning the greatest living one anywhere, is remembered. Everyone else stays in their own people's history.

## World history: who counts as notable

- **Conquerors (Alexander level)** (built): within one lifetime, they break 3 peoples (capital taken or people destroyed), triple their people's land, and rule the greatest realm in the known world.
- **Empire founders** (built): only if their empire is the greatest realm in the world.
- **Nation founders**: not notable (removed).
- **Faith founders** (built, cosmetic): they appear in the place they really lived. They should **belong to whoever holds that land** and bring traits that matter while they live. The traits are still to be approved (see below); Muhammad will need special care.

## Proposed founder traits (awaiting approval)

| Founder | Faith | Trait | Effect while alive, for the people holding their homeland |
|---|---|---|---|
| Moses | Judaism | Lawgiver | +stability; laws and customs change more easily |
| Zarathustra | Zoroastrianism | Prophet of order | +stability; people lean devout |
| Mahavira | Jainism | Non-violence | much calmer people; −army strength |
| Siddhartha Gautama | Buddhism | Enlightened teacher | +contentment; faith spreads to neighbors |
| Confucius | Confucianism | Teacher of order | +stability; +research (scholars, officials) |
| Laozi | Taoism | Sage of the Way | +contentment; +harmony with the land (food) |
| Jesus of Nazareth | Christianity | Preacher of mercy | +commoners' mood; faith spreads widely |
| Muhammad | Islam | Prophet and war leader | **huge military boost**; faith spreads with conquest |
| Guru Nanak | Sikhism | Teacher of equality | +commoners; +martial spirit |
| Martin Luther | Protestantism | Reformer | +research (printing, literacy); church upheaval |

## Military (Stone Age core built; the rest later)

**The rule for the whole game: you can't be great at everything.** A war-focused people can terrorize a region for generations, but it pays in growth, knowledge and economy. Eventually it stagnates and crumbles.

Built (Stone Age):
- Power = warriors × warrior level. The level is an exchange rate: a level-9 warrior is worth 9 level-1 hunters, and dies taking them down. Base levels: fields 0.8, hunters 1, trained 2, warrior upbringing 3. Later: professionals 4–5, Spartan training about 6.
- Level multipliers: gear (stone 1, spears and bows up to 1.2, then each age's arms), fed (hungry 0.6 to well fed 1.1), training grounds (up to 1.2), martial spirit (0.9–1.2), war weariness, the chief's skill.
- Odds follow the power ratio: equal is 50/50, 2:1 about 85%. Outnumbering more than 5:1 always keeps at least a 20% chance.
- Losses follow the exchange rate: the winner loses roughly the fallen enemy's power ÷ the winner's level, rolled between half and all of it.
- The commander decides retreats. Each chief rolls nerve (how readily he pulls back), hold (how long he fights on when losing) and judgment (how well he reads the odds). He may pull back after the first clash even when he could have won.
- Wars become possible once hunting lands meet (claimed land plus scout range), not only borders.
- Quality comes from:
  - how warriors are raised (a custom): hunters' skills, every hand in the fields, trained warriors, a warrior upbringing
  - being fed: hungry ×0.7, well fed ×1.05
  - martial spirit
  - training grounds
  - war weariness
  - the war chief (ordinary in the Stone Age: ±15%)
  - plus the existing government, culture, tools, funding and stability
- War-focus costs:
  - how warriors are raised changes growth and research: a warrior upbringing gives ×0.82 growth and ×0.88 research
  - a warrior share above 15% also cuts growth and research
- Battles per quarter: campaign seasons (winter rarely, summer up to 3 per war); a band is ready again after a season or two.
- War chiefs keep a win/loss record for later.

To do (later ages):
- Expand the strength ratio (agreed to revisit).
- Legendary figures: generals and rulers roll attributes (tactics, ferocity, logistics, charisma; administration, diplomacy, ambition). The rare brilliant roll becomes a terror. They're remembered only by record:
  - undefeated in the field: 10+ wins at a 75%+ rate
  - giant-slayer: 3+ wins against an army twice their size or the greatest realm
  - scourge: 5+ settlements sacked or raided, or great tribute taken, from much bigger peoples
  - defender: threw back a much larger invader
  - conqueror: the Alexander-level bar
- **Tactics (later ages):** the leader decides how much of the army's quality gets used. A poor general blunders often: ambushed, outflanked or caught in bad ground, his army fights at half strength or worse. A brilliant one lands masterstrokes for double strength or more. A great general with a great army is your Alexander. Stone Age chiefs stay simple.
- When they die, their people's power drops.
- Organized armies and military buildings (barracks, armories) in later ages.
- Expand the customs that shape a military.

## Survival period (built)

- The first ~400 years are about surviving. About 2,000 tribes start out, spread over all livable land: thickest on fertile lowlands and plains, thin in forest and steppe, rare in deserts, tundra and mountains. No two start closer than 5 map units.
- Hard years (about 10% a year per tribe, 1–3 seasons): drought, brutal winters (cold lands), sickness (worst in big villages), failed hunts. Stores, warmth, health, healers, water and a food surplus soften them.
- AI tribes roll a hidden competence; about 30% are poorly led and suffer far more in hard years.
- A tribe collapses if it falls below 45% of its peak for 6 years, or under 12 families. About 70% of its families survive and scatter:
  - They split into 2–4 bands (one if only a handful are left), each heading a different way.
  - Each band joins the best people it finds in its direction within about 60 units, as a minority people.
  - A band with no one in its direction is lost on the road.
  - If refugees reach you, you're told.
- Temperament toward outsiders, rolled per AI people:
  - about 50% keep to themselves (relations drift toward −15)
  - about 30% are wary (no pull either way)
  - about 20% are friendly (with another friendly people, relations drift toward +60 at about 2 a year; with a wary people or you, toward +35 at about 1 a year)
  - It shows in the World tab.

## Scarcity wars (built)

- A tribe short of land or food is more willing to fight its neighbors:
  - crowded land (hemmed in by neighbors)
  - hunger
  - a drought, or the game leaving its lands
- The shorter it is, the less hostile relations need to be, the worse odds it will accept, and the likelier it is to strike. It still needs its lands (or hunting grounds) to touch the target's.
- Scarcity also sours relations between touching neighbors: they compete for the same land.
- When a tribe attacks you out of need, the declaration says why.

## Merge requests (built)

- A small tribe (under 40 families) in real trouble can ask a nearby neighbor to take it in. Real trouble means it has shrunk below 75% of its peak, gone hungry for a year, or is losing a war.
- It only asks:
  - a people with "Warm" relations or better (above +20)
  - within about 15 map units
  - not at war with it
  - bigger than itself
  - not struggling too (the player is always a candidate)
- Only the struggling tribe can ask. It asks about 30% of years while it struggles, and waits 10 years after asking.
- AI peoples accept more readily the warmer their relations are. You get a popup and take them in or refuse.
- On joining, its villages become the other people's and its families live on as a people of their own among them, under that nation's policy for minority peoples.
- Merging is jumping to another ship before yours sinks; collapsing is swimming away. A tribe asks to join only while it can still choose, and only a friendly neighbor. In a 100-year test, about 46 tribes joined neighbors and 185 fell apart.

## Engineering notes for a world of thousands

- Diplomacy is kept only for pairs of peoples who have dealt with each other, and each people keeps a list of them. Loops run over a people's contacts, not the whole world.
- **First contact is by distance now, not region.** Regions are huge: Lower Egypt alone starts with about 30 tribes. Under the old rule, a tribe knew everyone in its own and neighboring regions, about 230 others by 3350 BCE. Now a people meets those living within walking distance: about 8 map units (roughly 180 km), plus twice its scouts' sight, never across open water on foot. Sailing adds 12 units, and the navigation age meets the whole world as before. At the start you meet your 3 nearest neighbors; about a third of tribes start alone.
- Saves go to IndexedDB, compressed. Browser local storage is too small for a world this size.
- Measured on a desktop browser with 2,000 tribes (a phone will be slower):
  - about 250 ms per turn at the start
  - about 730 ms per turn by 3200 BCE (1,750 tribes, 6,200 villages, 306,000 families)
  - memory steady around 100–250 MB
  - the save is about 13 MB before compression
- What's left is mostly each tribe's own yearly work. It grows with the number of villages.

Results of a 400-year test (3600 to 3200 BCE):
- 264 of 2,000 tribes collapsed (13%), most of them early.
- No wars: tribes keep their villages close together, so after 400 years neighbors are still about 7.5 units apart and their lands don't touch. There's no scarcity yet.
- No merges: no pair of peoples gets above +16 relations (see the open question above).

## Ancient cultures (built)

- 23 real cultures start in their real homelands in 3600 BCE, at their real size: people ÷ 4 = families, rolled inside the historical range. Khvalynsk is left out because it was already gone. AI only.
- Their real big sites are towns and cities (Uruk is a city); the rest of their people live in towns and villages across the homeland. Ordinary tribes don't start inside their homelands, and they keep clear of your start.
- They start as settled peoples with chiefs and warriors, and with their real know-how: farmers know the whole Stone Age; foragers (Botai, Jōmon, Jeulmun, Chinchorro, Dapenkeng) lack farming and a few other things; Maykop knows bronze; Uruk gains the wheel (3500) and writing (3300).
- **They hold their homeland:** the land is already full, with room for about 25% more people. They don't found villages beyond it until history frees them (a rise, a spread or a unification lifts the limit by half). Their heirs inherit a full land too. Ordinary tribes are unaffected.
- **Real pressures, real timing.** Each culture has its real history as stages at the real dates:
  - long squeezes (drought, cooling, worn-out land, lost trade, plague) shrink the homeland's capacity and hit everyone living in that region, you included
  - breakups into named successor peoples: each settlement goes with the successor whose heartland is nearest, and some people flee as refugees in several directions
  - changes into what came next (Daxi → Qujialing, Susa → Proto-Elamite state, Amri → Indus civilization)
  - Upper Egypt's war to rule the whole Nile (3250), then the Kingdom of Egypt (3150): this can reach you if you start in Lower Egypt
  - spreads (Yamnaya across the steppe, Dapenkeng to the islands, new Indus cities)
  - how hard a squeeze hits is rolled, and breakups and endings are chances (likelier if already weakened), so cultures usually go the way they really did, and sometimes hold together or linger on
- A culture that drops below 15% of its peak falls apart and scatters.
- **They don't play by the normal rules.** They don't research, hold elder talks, develop fields, change laws or government, upgrade towns, drift in their customs or switch faiths. What they know, their age and their government come only from their history:
  - starting governments: Uruk a temple state (theocracy); the farming cultures chiefdoms; the foragers tribal councils
  - Bronze Age at the real time: Maykop from the start; Uruk 3300 (writing); Yamnaya 3300; Egypt 3150 and Elam 3100 (kingdoms, writing); Indus 2600; Oxus 2300; Mumun 1500; Yayoi 900
  - the Sumerian city-states start as kingdoms
- Their heirs (the peoples they break into) follow history too: no research or policy changes. They have no stages of their own yet, so they stay as they are until their next chapters are written (for example Akkad conquering Sumer, Longshan to Erlitou, Corded Ware to Bell Beaker).
- **Watching them:** world history records every rise and fall. You get a popup when it happens to a culture you've met, or when a regional squeeze reaches you. They're marked 🏛️ in the World tab, with a short real-history note, and labeled on the map. Successors show as "Heirs of …".
- Speed: about 280 ms per turn at the start; about 800 ms by 3350 BCE (desktop).

## Births, deaths and leaving (built)

- Every settlement has births and everyday deaths, counted per real year (no longer tied to the calendar's pacing, which used to cut growth to a third after 3000 BCE).
  - Births: 5% a year (about 50 per 1,000), nudged by the tribe's fertility (food, homes, water, comforts, healers, midwives, room, mood): about 5% at a typical fertility of 1.2, about 5.5% for a well-developed tribe. Small villages +2.5%. A warrior upbringing costs about 5% of births. Hungry peoples have half the children.
  - Everyday deaths: 4.7% a year (about 47 per 1,000): many children are born and many die young. Towns +6%, cities +15% (sickness spreads where people crowd); the old cultures' towns count as countryside, since each stands for a stretch of farmland. Healers cut deaths up to 6%; a nation's health spending cuts them too.
  - Ages: medicine and clean water cut deaths first (Industrial ×0.7, Modern ×0.4, Information ×0.3); births fall later (Industrial ×0.92, Modern ×0.6, Information ×0.45).
- Leaving: about 0.15% of families a year leave to live among a neighbor they know (within about 25 units, chosen by relations), arriving as a minority people. More leave when the people are unhappy (up to 2.5×), crowded (up to 3×) or hungry (3×); a law restricting migration cuts it to 30%. With no one nearby they're lost. The old cultures lose a quarter as many.
- The Nation tab shows last year's births, deaths, losses to hard times (by cause), leavers and newcomers.

## Busts (built)

- **Sickness that spreads:** outbreaks start more often in bigger, more crowded places (up to village-size crowds; towns and cities far more), kill 4–10% a season for 2–4 seasons, and jump to settlements within about 4 units, likelier the bigger they are. Healers and clean living (tribes) or health spending (nations) hold it back, and so does medicine in later ages. Survivors are immune for 15–35 years.
- **Regional droughts:** about 5 a year worldwide, centered wherever people live (dry lands more often), 8–22 units across, lasting 2–6 years. Everyone inside loses people each season (up to about 1.2%), softened by food stores; farmers' harvests fail.
- **Failed harvests:** farming peoples (by how much they depend on farming) have a bad harvest about 10% of years (3% dire) and always in a drought. The next year costs about 0.6% a season (1.5% when dire); two bad years running double it (famine). Storage pits, smokehouses and granaries soften it.
- You get a popup when one reaches you (at most one of each kind every two years), and a line in your history.
- The old cultures: a land emptied by hard times fills back up (more children survive while below what the homeland holds); their ordinary years feed them; they keep their villages rather than found new ones until a rise frees them.

Measured over 400 years (3600 to 3200 BCE):
- The whole world grew about 22% (610,000 to 742,000 families), about 0.05% a year: the real long-run pace.
- The old cultures, about three quarters of the world's people, hold roughly steady between their historical pressures.
- Ordinary tribes shake out first, then boom: flat for the first century while about 20% of them fall, then about 0.5% a year as the survivors spread into empty land (53,000 to 244,000 families). That matches early farmers expanding into open country.
- 406 of 2,000 tribes fell, almost all in the first 250 years; 80 joined neighbors.
- Turn time: about 270 ms at the start, about 710 ms by 3200 BCE (desktop).
