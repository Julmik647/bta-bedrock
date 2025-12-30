// main.js
console.warn("[keirazelle] Loading Core Systems...");

// core
import './core/InventoryManager.js'; // items
import './core/achievements.js';
import './core/welcome.js';
import './core/help.js';
import './core/limit.js';
import './core/chat2console.js';

// gameplay
import './gameplay/armorSystem.js';
import './gameplay/foodSystem.js';
import './gameplay/machineGunBow.js';
import './gameplay/sword.js';
import './gameplay/swordMining.js';
import './gameplay/boatBreak.js';
import './gameplay/instantBonemeal.js';
import './gameplay/placementSystem.js';
import './gameplay/playerLoop.js'; // loop optimization
import './gameplay/PortalDeathFix.js';
import './gameplay/farmlandProtection.js';
// import './gameplay/fenceSystem.js'; // disabled for now

// world gen
// import './world/chunk_scrubber.js'; // disabled, pregenerated world
import './world/portalRemoval.js';
// import './world/rough_bedrock.js'; // disabled for now
import './world/netherIce.js';
import './world/fogFix.js';
import './world/island.js';
import './world/dimensions.js';

// mobs
import './mobs/entitySpawnHandler.js';
import './mobs/entity_cleaner.js';
import './mobs/betaAnimalAI.js';
import './mobs/nightmares.js';
import './mobs/randomSpawn.js';

// init
console.warn("[keirazelle] Initialized");

