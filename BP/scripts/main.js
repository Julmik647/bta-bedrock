// main.js

console.warn("[keirazelle] Loading Core Systems...");

// core
import './core/InventoryManager.js'; // items
import './core/achievements.js';
import './core/welcome.js';
import './core/limit.js';


// gameplay
import './gameplay/armorSystem.js';
import './gameplay/foodSystem.js';
import './gameplay/machineGunBow.js';
import './gameplay/sword.js';
import './gameplay/swordMining.js';
import './gameplay/redstoneMining.js';
import './gameplay/boatBreak.js';
import './gameplay/instantBonemeal.js';
import './gameplay/placementSystem.js';
import './gameplay/playerLoop.js'; // loop optimization
import './gameplay/PortalDeathFix.js';
import './gameplay/furnaceMinecart.js';

// world gen
import './world/chunk_scrubber.js';
import './world/portalRemoval.js';
import './world/netherIce.js';
import './world/fogFix.js';
import './world/island.js';
import './world/dimensions.js';
import './world/fenceSystem.js';
import './world/worldBorder.js';

// mobs
import './mobs/entitySpawnHandler.js';
import './mobs/entity_cleaner.js';
import './mobs/betaAnimalAI.js';
import './mobs/nightmares.js';
import './mobs/randomSpawn.js';

// init
console.warn("[keirazelle] Initialized");

