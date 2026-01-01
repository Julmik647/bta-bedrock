// placement system for beta 1.7.3 parity
import { world, Direction, BlockPermutation, system } from '@minecraft/server';
console.warn("[keirazelle] Placement System Loaded");

const BLOCK_CONFIGS = Object.freeze({
  // no ceiling buttons/levers in beta
  CEILING_RESTRICTED: new Set([
    'minecraft:stone_button',
    'minecraft:lever'
  ]),
  
  // slabs only bottom half
  BOTTOM_ONLY_SLABS: new Set([
    'minecraft:cobblestone_slab',
    'minecraft:oak_slab',
    'minecraft:smooth_stone_slab',
    'minecraft:sandstone_slab',
  ]),
  
  // stairs only bottom, no corners
  BOTTOM_ONLY_STAIRS: new Set([
    'minecraft:oak_stairs',
    'minecraft:stone_stairs',
    'minecraft:cobblestone_stairs'
  ]),
  
  // logs always vertical
  VERTICAL_ONLY_LOGS: new Set([
    'minecraft:oak_log',
    'minecraft:birch_log',
    'minecraft:spruce_log'
  ]),
  
  // no stripping logs
  STRIPPABLE_LOGS: new Set([
    'minecraft:oak_log',
    'minecraft:birch_log',
    'minecraft:spruce_log'
  ]),
  
  AXES: new Set([
    'minecraft:wooden_axe',
    'minecraft:stone_axe',
    'minecraft:iron_axe',
    'minecraft:golden_axe',
    'minecraft:diamond_axe',
    'minecraft:netherite_axe'
  ]),
  
  SHOVELS: new Set([
    'minecraft:wooden_shovel',
    'minecraft:stone_shovel',
    'minecraft:iron_shovel',
    'minecraft:golden_shovel',
    'minecraft:diamond_shovel',
    'minecraft:netherite_shovel'
  ]),
  
  // no dirt paths in beta
  PATHABLE_BLOCKS: new Set([
    'minecraft:dirt',
    'minecraft:grass_block'
  ]),
  
  BONEMEAL: new Set([
    'minecraft:bone_meal'
  ])
});

// no ceiling placement for buttons/levers
function preventCeilingPlacement(event) {
  const { itemStack, blockFace } = event;
  
  if (!itemStack || !BLOCK_CONFIGS.CEILING_RESTRICTED.has(itemStack.typeId)) return;
  
  if (blockFace === Direction.Down) {
    event.cancel = true;
  }
}

// no log stripping
function preventLogStripping(event) {
  const { itemStack, block } = event;
  
  if (!itemStack || !block) return;
  
  if (BLOCK_CONFIGS.AXES.has(itemStack.typeId) && 
      BLOCK_CONFIGS.STRIPPABLE_LOGS.has(block.typeId)) {
    event.cancel = true;
  }
}

// beta had no dirt paths
function preventPathCreation(event) {
  const { itemStack, block } = event;
  
  if (!itemStack || !block) return;
  
  if (BLOCK_CONFIGS.SHOVELS.has(itemStack.typeId) && 
      BLOCK_CONFIGS.PATHABLE_BLOCKS.has(block.typeId)) {
    event.cancel = true;
  }
}

// no tall grass from bonemeal on grass
function preventBonemealOnShortGrass(event) {
  const { itemStack, block } = event;
  
  if (!itemStack || !block) return;
  
  if (BLOCK_CONFIGS.BONEMEAL.has(itemStack.typeId) && 
      (block.typeId === 'minecraft:short_grass' || block.typeId === 'minecraft:fern')) {
    event.cancel = true;
  }
}

// stairs face player (inverted)
function calculateStairFacing(viewVector) {
  if (Math.abs(viewVector.x) > Math.abs(viewVector.z)) {
    return viewVector.x > 0 ? 1 : 0;
  }
  return viewVector.z > 0 ? 3 : 2;
}

// no waterlogging
function preventWaterlogging(event) {
  const { block } = event;
  
  if (!block) return;
  
  try {
    if (typeof block.isWaterlogged === 'boolean' && block.isWaterlogged) {
      block.setWaterlogged(false);
    }
  } catch (e) {}
}

// main placement handler
function handleBlockPlacement(event) {
  const { block, player } = event;
  
  if (!block || !player) return;

  // doors need both halves cleared of water
  if (block.typeId.includes('_door')) {
    try {
      const dim = block.dimension;
      const loc = block.location;
      const isTop = block.permutation.getState('upper_block_bit');
      
      const topLoc = isTop ? loc : { x: loc.x, y: loc.y + 1, z: loc.z };
      const botLoc = isTop ? { x: loc.x, y: loc.y - 1, z: loc.z } : loc;
      
      const topBlock = dim.getBlock(topLoc);
      const botBlock = dim.getBlock(botLoc);
      
      if (topBlock?.typeId === 'minecraft:water' || topBlock?.isWaterlogged) {
        dim.runCommand(`setblock ${topLoc.x} ${topLoc.y} ${topLoc.z} air replace water`);
      }
      if (botBlock?.typeId === 'minecraft:water' || botBlock?.isWaterlogged) {
        dim.runCommand(`setblock ${botLoc.x} ${botLoc.y} ${botLoc.z} air replace water`);
      }
    } catch (e) {}
  }

  preventWaterlogging(event);

  // slabs always bottom
  if (BLOCK_CONFIGS.BOTTOM_ONLY_SLABS.has(block.typeId)) {
    try {
      const permutation = BlockPermutation.resolve(block.typeId, { 
        'minecraft:vertical_half': 'bottom' 
      });
      block.setPermutation(permutation);
    } catch (e) {}
  }

  // stairs always bottom, face player
  if (BLOCK_CONFIGS.BOTTOM_ONLY_STAIRS.has(block.typeId)) {
    try {
      const viewVector = player.getViewDirection();
      const newDirection = calculateStairFacing(viewVector);
      
      const setStairsStraight = () => {
        try {
          if (!block.isValid()) return;
          const permutation = BlockPermutation.resolve(block.typeId, {
            'upside_down_bit': false,
            'weirdo_direction': newDirection
          });
          block.setPermutation(permutation);
        } catch (e) {}
      };
      
      // apply twice to fight auto updates
      system.runTimeout(setStairsStraight, 1);
      system.runTimeout(setStairsStraight, 3);
    } catch (e) {}
  }

  // logs always vertical
  if (BLOCK_CONFIGS.VERTICAL_ONLY_LOGS.has(block.typeId)) {
    try {
      const permutation = BlockPermutation.resolve(block.typeId, { 
        'pillar_axis': 'y' 
      });
      block.setPermutation(permutation);
    } catch (e) {}
  }
}

// init
function init() {
  world.beforeEvents.playerInteractWithBlock.subscribe(preventCeilingPlacement);
  world.beforeEvents.playerInteractWithBlock.subscribe(preventLogStripping);
  world.beforeEvents.playerInteractWithBlock.subscribe(preventPathCreation);
  world.beforeEvents.playerInteractWithBlock.subscribe(preventBonemealOnShortGrass);
  world.afterEvents.playerPlaceBlock.subscribe(handleBlockPlacement);
}

init();