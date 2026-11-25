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
- A tribe collapses if it falls below 45% of its peak for 6 years, or under 12 families. Its survivors join the nearest people within about 60 units (as a minority people), or vanish.

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
- **Open question:** Stone Age relations barely move. Strangers start out wary (about −12), and after a century nearly every pair is still "Neutral". So in the survival period nobody is "Warm" yet, and merges don't happen. Waiting on a decision about how relations should work early on.

## Engineering notes for a world of thousands

- Diplomacy is kept only for pairs of peoples who have dealt with each other, and each people keeps a list of them. Loops run over a people's contacts, not the whole world.
- Contacts are found through the regions each people can reach.
- Saves go to IndexedDB, compressed. Browser local storage is too small for a world this size.
