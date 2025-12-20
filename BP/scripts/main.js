// --- Betafied Reference Systems ---
// Core Parity Systems
import 'paritySystems/armorSystem.js';
import 'paritySystems/entitySpawnHandler.js'; // unified: mob whitelist, xp removal, ore drops, loot
import 'paritySystems/foodSystem.js';
import 'paritySystems/placementSystem.js';
import 'paritySystems/itemRemoval.js';
import 'paritySystems/machineGunBow.js';
import 'paritySystems/help.js';
import 'paritySystems/bubbleFix.js';
import 'paritySystems/noBubbles.js';
import 'paritySystems/limit.js';
import 'paritySystems/PortalDeathFix.js';
import 'paritySystems/fogFix.js';
import 'paritySystems/boatBreak.js';
import 'paritySystems/nightmares.js';
import 'paritySystems/island.js';
import 'paritySystems/noOffhand.js';
import 'paritySystems/noSprint.js';
import 'paritySystems/instantBonemeal.js';
import 'paritySystems/flatSnow.js';
import 'paritySystems/sword.js';
import 'paritySystems/betaStacking.js';
import 'paritySystems/portalRemoval.js';
import 'paritySystems/randomSpawn.js';
import 'paritySystems/swordMining.js';
import 'paritySystems/betaAnimalAI.js';
 
// Modules (World Generation & Conversions)
// disabled - using pre-baked mctemplate now
// import './modules/chunk_scrubber.js';
import './modules/entity_cleaner.js';
// import './modules/rough_bedrock.js';
import './modules/inventory_converter.js';

// Legacy / Optional Imports (Check if needed)

// Initialize
console.warn("[Betafied] Main System Loaded - All Modules Initialized");
