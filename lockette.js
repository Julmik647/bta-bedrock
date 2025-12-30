import { world, system, SignSide, Player } from '@minecraft/server';

// Configuration
const LOCKABLE_BLOCKS = ['minecraft:chest', 'minecraft:wooden_door', 'minecraft:iron_door', 'minecraft:furnace'];
const PRIVATE_TAG = '[Private]';
const ADMIN_TAGS = ['admin', 'moderator'];
const SIGN_CHECK_TIMEOUT = 1000; // 50 seconds (1000 ticks) for new placements
const SIGN_OWNER_CHECK_TIMEOUT = 1200; // 60 seconds (1200 ticks) for owner interactions
const SIGN_CHECK_INTERVAL = 10; // Check every 0.5 seconds (10 ticks)
const DEBUG_MODE = false; // Toggle debug logging

// In-memory store for recent sign interactions/placements
const recentSignPlacements = new Map(); // playerName -> { location: {x, y, z}, dimensionId: string, timestamp: number, originalText: string, isOwnerInteraction: boolean }

// Utility to log debug messages
function logDebug(message) {
    if (DEBUG_MODE) console.log(message);
}

// Utility to check if a block is lockable
function isLockableBlock(block) {
    try {
        return block && block.isValid && block.typeId && LOCKABLE_BLOCKS.includes(block.typeId);
    } catch (error) {
        console.warn(`Error in isLockableBlock: ${error.message}`);
        return false;
    }
}

// Utility to check if a block is a door
function isDoorBlock(block) {
    try {
        return block && block.isValid && block.typeId && (block.typeId === 'minecraft:wooden_door' || block.typeId === 'minecraft:iron_door');
    } catch (error) {
        console.warn(`Error in isDoorBlock: ${error.message}`);
        return false;
    }
}

// Get sign owner and allowed players
function getSignInfo(signComponent) {
    try {
        if (!signComponent) return null;
        const text = (signComponent.getText(SignSide.Front) || '').trim();
        logDebug(`Sign text: "${text}"`);
        const lines = text.split('\n').map(line => line.trim());
        if (!lines[0] || lines[0].toLowerCase() !== PRIVATE_TAG.toLowerCase()) return null;
        return {
            owner: lines[1]?.toLowerCase() || '',
            allowed: lines.slice(2).filter(line => line).map(line => line.toLowerCase())
        };
    } catch (error) {
        console.warn(`Error in getSignInfo: ${error.message}`);
        return null;
    }
}

// Get the block behind a sign based on its facing direction
function getBlockBehindSign(signBlock, dimension) {
    try {
        if (!signBlock || !signBlock.isValid || !signBlock.permutation) return null;
        const facing = signBlock.permutation.getState('facing_direction');
        const { x, y, z } = signBlock.location;
        let behindPos;
        switch (facing) {
            case 2: // North (-Z)
                behindPos = { x, y, z: z + 1 };
                break;
            case 3: // South (+Z)
                behindPos = { x, y, z: z - 1 };
                break;
            case 4: // West (-X)
                behindPos = { x: x + 1, y, z };
                break;
            case 5: // East (+X)
                behindPos = { x: x - 1, y, z };
                break;
            default:
                return null;
        }
        return dimension.getBlock(behindPos);
    } catch (error) {
        console.warn(`Error in getBlockBehindSign: ${error.message}`);
        return null;
    }
}

// Get door blocks behind a sign (-1 behind, -1 Y for top, -2 Y for bottom)
function getDoorBlocksBehindSign(signBlock, dimension) {
    try {
        const behindBlock = getBlockBehindSign(signBlock, dimension);
        if (!behindBlock || !behindBlock.location) return [];
        const { x, y, z } = behindBlock.location;
        const doorTop = dimension.getBlock({ x, y: y - 1, z });
        const doorBottom = dimension.getBlock({ x, y: y - 2, z });
        const doorBlocks = [];
        if (doorTop && isDoorBlock(doorTop) && doorTop.permutation.getState('upper_block_bit')) {
            doorBlocks.push(doorTop);
        }
        if (doorBottom && isDoorBlock(doorBottom) && !doorBottom.permutation.getState('upper_block_bit')) {
            doorBlocks.push(doorBottom);
        }
        return doorBlocks;
    } catch (error) {
        console.warn(`Error in getDoorBlocksBehindSign: ${error.message}`);
        return [];
    }
}

// Check if block has a locking sign, including signs above and behind doors
function hasLockingSign(block, dimension) {
    try {
        if (!block || !block.isValid || !dimension || !block.location) return false;
        
        logDebug(`Checking hasLockingSign for block at ${block.location.x},${block.location.y},${block.location.z}`);
        
        const { x, y, z } = block.location;
        let adjacent = [
            { x: x + 1, y, z }, { x: x - 1, y, z },
            { x, y: y + 1, z }, { x, y: y - 1, z },
            { x, y, z: z + 1 }, { x, y, z: z - 1 }
        ].map(pos => dimension.getBlock(pos)).filter(b => b && b.isValid && b.typeId && b.typeId.includes('sign'));

        // If block is a door, check for a sign above the door top
        if (isDoorBlock(block)) {
            const doorTopY = block.permutation.getState('upper_block_bit') ? y : y + 1;
            const aboveDoorTop = dimension.getBlock({ x, y: doorTopY + 1, z });
            if (aboveDoorTop && aboveDoorTop.isValid && aboveDoorTop.typeId && aboveDoorTop.typeId.includes('sign')) {
                adjacent.push(aboveDoorTop);
                // Check if the sign protects the door behind it
                const doorBlocksBehind = getDoorBlocksBehindSign(aboveDoorTop, dimension);
                if (doorBlocksBehind.some(doorBlock => locationsEqual(doorBlock.location, block.location))) {
                    const signComponent = aboveDoorTop.getComponent('minecraft:sign');
                    if (signComponent && getSignInfo(signComponent)) {
                        return true;
                    }
                }
            }
        }

        logDebug(`Adjacent signs: ${adjacent.map(s => `${s.location.x},${s.location.y},${s.location.z}`).join('; ') || 'none'}`);

        if (block.typeId !== 'minecraft:chest') {
            return adjacent.some(signBlock => {
                const signComponent = signBlock.getComponent('minecraft:sign');
                return signComponent && getSignInfo(signComponent);
            });
        }

        const pairedBlocks = getPairedBlock(block, dimension);
        const chestPair = [block, ...pairedBlocks];
        const chestPairLocations = chestPair.map(chest => chest.location);

        return adjacent.some(signBlock => {
            const signComponent = signBlock.getComponent('minecraft:sign');
            if (!signComponent || !getSignInfo(signComponent)) return false;

            const signX = signBlock.location.x;
            const signY = signBlock.location.y;
            const signZ = signBlock.location.z;
            const adjacentPositions = [
                { x: signX + 1, y: signY, z: signZ }, { x: signX - 1, y: signY, z: signZ },
                { x: signX, y: signY + 1, z: signY }, { x: signX, y: signY - 1, z: signZ },
                { x: signX, y: signY, z: signZ + 1 }, { x: signX, y: signY, z: signZ - 1 }
            ];

            const protectedBlocks = adjacentPositions
                .map(pos => dimension.getBlock(pos))
                .filter(b => b && b.isValid && isLockableBlock(b));

            logDebug(`Sign at ${signX},${signY},${signZ} protects: ${protectedBlocks.map(b => `${b.location.x},${b.location.y},${b.location.z}`).join('; ') || 'none'}`);

            const protectsThisPair = protectedBlocks.some(b => 
                chestPairLocations.some(loc => locationsEqual(loc, b.location))
            );

            if (!protectsThisPair) {
                logDebug(`Sign at ${signX},${signY},${signZ} does not protect this pair`);
                return false;
            }

            const protectedChests = protectedBlocks.filter(b => b.typeId === 'minecraft:chest');
            if (protectedChests.length === 0) {
                logDebug(`Sign at ${signX},${signY},${signZ} protects no chests, valid for this pair`);
                return true;
            }

            protectedChests.forEach(chest => {
                const paired = getPairedBlock(chest, dimension);
                return [chest, ...paired].map(b => b.location);
            });

            const validForThisPair = protectedChests.some(chest => 
                chestPairLocations.some(loc => locationsEqual(loc, chest.location))
            );

            const protectsOtherPair = protectedChests.some(chest => {
                const chestPaired = getPairedBlock(chest, dimension);
                if (chestPaired.length === 0) return false;
                const otherPairLocations = [chest.location, ...chestPaired.map(b => b.location)];
                return otherPairLocations.some(loc => 
                    !chestPairLocations.some(thisLoc => locationsEqual(thisLoc, loc))
                );
            });

            const isValid = validForThisPair && !protectsOtherPair;
            logDebug(`Sign at ${signX},${signY},${signZ} valid for this pair: ${isValid}, protects other pair: ${protectsOtherPair}`);
            return isValid;
        });
    } catch (error) {
        console.warn(`Error in hasLockingSign: ${error.message}`);
        return false;
    }
}

// Check if a chest or door is part of a locked group
function isPartOfLockedBlock(block, dimension) {
    try {
        if (!block || !block.isValid || !dimension || !block.location) return false;
        
        logDebug(`Checking isPartOfLockedBlock for block at ${block.location.x},${block.location.y},${block.location.z}`);
        
        if (hasLockingSign(block, dimension)) {
            logDebug(`Block at ${block.location.x},${block.location.y},${block.location.z} is locked`);
            return true;
        }
        
        if (block.typeId === 'minecraft:chest') {
            const pairedBlocks = getPairedBlock(block, dimension);
            return pairedBlocks.some(pairedBlock => {
                const locked = hasLockingSign(pairedBlock, dimension);
                if (locked) {
                    logDebug(`Paired block at ${pairedBlock.location.x},${pairedBlock.location.y},${pairedBlock.location.z} is locked`);
                }
                return locked;
            });
        } else if (isDoorBlock(block)) {
            const doorTopY = block.permutation.getState('upper_block_bit') ? block.location.y : block.location.y + 1;
            const doorBottomY = doorTopY - 1;
            const doorTop = dimension.getBlock({ x: block.location.x, y: doorTopY, z: block.location.z });
            const doorBottom = dimension.getBlock({ x: block.location.x, y: doorBottomY, z: block.location.z });
            return (doorTop && hasLockingSign(doorTop, dimension)) || (doorBottom && hasLockingSign(doorBottom, dimension));
        }
        
        return false;
    } catch (error) {
        console.warn(`Error in isPartOfLockedBlock: ${error.message}`);
        return false;
    }
}

// Get paired chest block
function getPairedBlock(block, dimension) {
    try {
        if (!block || !block.isValid || !dimension || block.typeId !== 'minecraft:chest' || !block.location) return [];
        
        const { x, y, z } = block.location;
        const permutation = block.permutation;
        const facing = permutation.getState('minecraft:cardinal_direction') || 'north';
        
        const potentialNeighbors = [];
        if (facing === 'north' || facing === 'south') {
            potentialNeighbors.push(
                dimension.getBlock({ x: x + 1, y, z }),
                dimension.getBlock({ x: x - 1, y, z })
            );
        } else {
            potentialNeighbors.push(
                dimension.getBlock({ x, y, z: z + 1 }),
                dimension.getBlock({ x, y, z: z - 1 })
            );
        }
        
        const validNeighbors = potentialNeighbors.filter(neighbor => {
            if (!neighbor || !neighbor.isValid || neighbor.typeId !== 'minecraft:chest') return false;
            const neighborPerm = neighbor.permutation;
            const neighborFacing = neighborPerm.getState('minecraft:cardinal_direction') || 'north';
            return neighborFacing === facing;
        });
        
        return validNeighbors;
    } catch (error) {
        console.warn(`Error in getPairedBlock: ${error.message}`);
        return [];
    }
}

// Check if a chest is paired with another chest (excluding a specific location)
function hasOtherPairedChest(chest, dimension, excludeLocation) {
    try {
        if (!chest || !dimension || chest.typeId !== 'minecraft:chest' || !chest.location) return false;
        const { x, y, z } = chest.location;

        const neighbors = [
            dimension.getBlock({ x: x + 1, y, z }),
            dimension.getBlock({ x: x - 1, y, z }),
            dimension.getBlock({ x, y, z: z + 1 }),
            dimension.getBlock({ x, y, z: z - 1 })
        ].filter(b => b && b.typeId === 'minecraft:chest' && !locationsEqual(b.location, excludeLocation));

        return neighbors.some(neighbor => {
            const nx = neighbor.location.x;
            const nz = neighbor.location.z;
            const neighborPerm = neighbor.permutation;
            const neighborFacing = neighborPerm.getState('minecraft:cardinal_direction') || 'north';
            const chestPerm = chest.permutation;
            const chestFacing = chestPerm.getState('minecraft:cardinal_direction') || 'north';
            return (
                (Math.abs(nx - x) == 1 && nz == z && ['north', 'south'].includes(chestFacing) && ['north', 'south'].includes(neighborFacing)) ||
                (Math.abs(nz - z) == 1 && nx == x && ['east', 'west'].includes(chestFacing) && ['east', 'west'].includes(neighborFacing))
            );
        });
    } catch (error) {
        console.warn(`Error in hasOtherPairedChest: ${error.message}`);
        return false;
    }
}

// Compare two locations
function locationsEqual(loc1, loc2) {
    try {
        return loc1 && loc2 && loc1.x === loc2.x && loc1.y === loc2.y && loc1.z === loc2.z;
    } catch (error) {
        console.warn(`Error in locationsEqual: ${error.message}`);
        return false;
    }
}

// Lock a sign and associated blocks
function lockSign(block, player, isNewPlacement) {
    try {
        if (!block || !player || !block.dimension) return false;
        const signComponent = block.getComponent('minecraft:sign');
        if (!signComponent) {
            player.sendMessage('§cFailed to access sign component.');
            return false;
        }

        const signInfo = getSignInfo(signComponent);
        if (!signInfo) {
            player.sendMessage('§cSign must have [Private] on the first line.');
            return false;
        }

        // If not a new placement, check if player can edit (owner or admin)
        if (!isNewPlacement && signInfo.owner && signInfo.owner !== player.name.toLowerCase() && !ADMIN_TAGS.some(tag => player.hasTag(tag))) {
            player.sendMessage('§cThis sign is already owned by another player.');
            return false;
        }

        const dimension = block.dimension;
        const { x, y, z } = block.location;
        let adjacent = [
            dimension.getBlock({ x: x + 1, y, z }),
            dimension.getBlock({ x: x - 1, y, z }),
            dimension.getBlock({ x, y: y + 1, z }),
            dimension.getBlock({ x, y: y - 1, z }),
            dimension.getBlock({ x, y, z: z + 1 }),
            dimension.getBlock({ x, y, z: z - 1 })
        ].filter(b => isLockableBlock(b));

        // Check block below for doors
        const blockBelow = dimension.getBlock({ x, y: y - 1, z });
        if (isDoorBlock(blockBelow)) {
            const doorTop = blockBelow.permutation.getState('upper_block_bit') ? blockBelow : dimension.getBlock({ x, y: y - 1, z });
            const doorBottom = dimension.getBlock({ x, y: doorTop.location.y - 1, z });
            if (doorTop && isDoorBlock(doorTop)) adjacent.push(doorTop);
            if (doorBottom && isDoorBlock(doorBottom)) adjacent.push(doorBottom);
        }

        // Check door blocks behind the sign (-1 behind, -1 Y for top, -2 Y for bottom)
        const doorBlocksBehind = getDoorBlocksBehindSign(block, dimension);
        adjacent.push(...doorBlocksBehind.filter(b => isLockableBlock(b)));

        if (!adjacent.length) {
            player.sendMessage('§cNo lockable blocks found next to, below, or behind the sign!');
            return false;
        }

        // Prepare new sign text: insert player's name on line 2, shift existing names down
        let existingNames = signInfo.allowed.filter(name => name); // Start with allowed names
        if (signInfo.owner) {
            // If there's an existing owner, include it only if it's not being replaced
            if (signInfo.owner === player.name.toLowerCase() || isNewPlacement) {
                existingNames = [signInfo.owner, ...signInfo.allowed].filter(name => name);
            }
        }

        const newNames = [player.name, ...existingNames].slice(0, 3); // Limit to 3 names total
        if (existingNames.length >= 3 && newNames.length < existingNames.length + 1) {
            player.sendMessage('§cOnly three names are allowed on a sign, including your own. A name was removed.');
        }

        // If no owner is specified (line 2 is empty), unlock the sign
        if (!newNames[0]) {
            signComponent.setText(PRIVATE_TAG, SignSide.Front);
            player.sendMessage('§aSign unlocked due to no owner specified.');
            return true;
        }

        const newText = [PRIVATE_TAG, ...newNames].join('\n');
        signComponent.setText(newText, SignSide.Front);
        player.sendMessage('§aBlock(s) locked! Additional players on lines 3-4.');
        return true;
    } catch (error) {
        console.warn(`Error in lockSign: ${error.message}`);
        player.sendMessage('§cFailed to lock block due to an error.');
        return false;
    }
}

// Check if player can edit a sign (only owner or admin)
function canEditSign(player, signComponent) {
    try {
        if (!player || !signComponent) return false;
        if (ADMIN_TAGS.some(tag => player.hasTag(tag))) return true;
        const signInfo = getSignInfo(signComponent);
        if (!signInfo || !signInfo.owner) return true; // No owner means sign is unlocked
        return signInfo.owner === player.name.toLowerCase();
    } catch (error) {
        console.warn(`Error in canEditSign: ${error.message}`);
        return false;
    }
}

// Check if player can access a locked block
function canAccessBlock(player, signComponent) {
    try {
        if (!player || !signComponent) return false;
        if (ADMIN_TAGS.some(tag => player.hasTag(tag))) return true;
        const signInfo = getSignInfo(signComponent);
        if (!signInfo || !signInfo.owner) return true; // No owner means sign is unlocked
        return signInfo.owner === player.name.toLowerCase() || signInfo.allowed.includes(player.name.toLowerCase());
    } catch (error) {
        console.warn(`Error in canAccessBlock: ${error.message}`);
        return false;
    }
}

// Prevent sign editing and handle block interactions
world.beforeEvents.playerInteractWithBlock.subscribe(event => {
    try {
        const { block, player } = event;
        if (!block || !block.isValid || !player) return;

        logDebug(`Player ${player.name} interacting with block at ${block.location.x},${block.location.y},${block.location.z} (${block.typeId})`);

        if (block.typeId.includes('sign')) {
            const signComponent = block.getComponent('minecraft:sign');
            const signInfo = getSignInfo(signComponent);
            if (signInfo && signInfo.owner && !canEditSign(player, signComponent)) {
                event.cancel = true;
                player.sendMessage('§cOnly the owner or admins can edit this private sign.');
            } else if (signInfo && canEditSign(player, signComponent)) {
                // Store sign state for owner interaction
                recentSignPlacements.set(player.name, {
                    location: block.location,
                    dimensionId: block.dimension.id,
                    timestamp: Date.now(),
                    originalText: signComponent.getText(SignSide.Front) || '',
                    isOwnerInteraction: true
                });
                logDebug(`Stored sign state for owner ${player.name} at ${block.location.x},${block.location.y},${block.location.z}`);
            }
            return;
        }

        if (isLockableBlock(block)) {
            const dimension = block.dimension;
            
            if (isPartOfLockedBlock(block, dimension)) {
                const relevantSigns = [];
                let blocksToCheck = [block];
                if (block.typeId === 'minecraft:chest') {
                    blocksToCheck.push(...getPairedBlock(block, dimension));
                } else if (isDoorBlock(block)) {
                    const doorTopY = block.permutation.getState('upper_block_bit') ? block.location.y : block.location.y + 1;
                    const doorBottomY = doorTopY - 1;
                    blocksToCheck = [
                        dimension.getBlock({ x: block.location.x, y: doorTopY, z: block.location.z }),
                        dimension.getBlock({ x: block.location.x, y: doorBottomY, z: block.location.z })
                    ].filter(b => b && isDoorBlock(b));
                }
                
                logDebug(`Blocks to check: ${blocksToCheck.map(c => `${c.location.x},${c.location.y},${c.location.z}`).join('; ') || 'single block'}`);
                
                for (const targetBlock of blocksToCheck) {
                    const { x, y, z } = targetBlock.location;
                    let adjacentSigns = [
                        { x: x + 1, y, z }, { x: x - 1, y, z },
                        { x, y: y + 1, z }, { x, y: y - 1, z },
                        { x, y, z: z + 1 }, { x, y, z: z - 1 }
                    ].map(pos => dimension.getBlock(pos)).filter(b => b && b.isValid && b.typeId && b.typeId.includes('sign'));
                    
                    if (isDoorBlock(targetBlock)) {
                        const doorTopY = targetBlock.permutation.getState('upper_block_bit') ? y : y + 1;
                        const aboveDoorTop = dimension.getBlock({ x, y: doorTopY + 1, z });
                        if (aboveDoorTop && aboveDoorTop.isValid && aboveDoorTop.typeId && aboveDoorTop.typeId.includes('sign')) {
                            adjacentSigns.push(aboveDoorTop);
                        }
                    }
                    
                    relevantSigns.push(...adjacentSigns.filter(signBlock => {
                        const signComponent = signBlock.getComponent('minecraft:sign');
                        return signComponent && getSignInfo(signComponent) && getSignInfo(signComponent).owner;
                    }));
                }
                
                logDebug(`Relevant signs for access check: ${relevantSigns.map(s => `${s.location.x},${s.location.y},${s.location.z}`).join('; ') || 'none'}`);
                
                const hasAccess = relevantSigns.some(signBlock => {
                    const signComponent = signBlock.getComponent('minecraft:sign');
                    return signComponent && canAccessBlock(player, signComponent);
                }) || ADMIN_TAGS.some(tag => player.hasTag(tag));
                
                if (!hasAccess && relevantSigns.length > 0) {
                    event.cancel = true;
                    const signComponent = relevantSigns[0].getComponent('minecraft:sign');
                    const owner = getSignInfo(signComponent)?.owner || 'someone';
                    player.sendMessage(`§cThis block is locked by ${owner}!`);
                }
            } else {
                logDebug(`Block at ${block.location.x},${block.location.y},${block.location.z} is not locked`);
            }
        }
    } catch (error) {
        console.warn(`Error in playerInteractWithBlock: ${error.message}`);
    }
});

// Prevent breaking blocks with attached locking signs or protected signs
world.beforeEvents.playerBreakBlock.subscribe(event => {
    try {
        const { block, player } = event;
        const dimension = block.dimension;
        if (!block || !block.isValid || !player || !dimension) return;

        if (block.typeId.includes('sign')) {
            const signComponent = block.getComponent('minecraft:sign');
            const signInfo = getSignInfo(signComponent);
            if (signInfo && signInfo.owner && !canAccessBlock(player, signComponent)) {
                event.cancel = true;
                player.sendMessage('§cCannot break a private sign you don\'t own!');
                return;
            }
            // Remove sign from recentSignPlacements when destroyed
            for (const [playerName, placement] of recentSignPlacements) {
                if (locationsEqual(placement.location, block.location) && placement.dimensionId === dimension.id) {
                    recentSignPlacements.delete(playerName);
                    logDebug(`Removed destroyed sign at ${block.location.x},${block.location.y},${block.location.z} from recentSignPlacements`);
                }
            }
            return;
        }

        let blocksToCheck = [block];
        if (block.typeId === 'minecraft:chest') {
            blocksToCheck.push(...getPairedBlock(block, dimension));
        } else if (isDoorBlock(block)) {
            const doorTopY = block.permutation.getState('upper_block_bit') ? block.location.y : block.location.y + 1;
            const doorBottomY = doorTopY - 1;
            blocksToCheck = [
                dimension.getBlock({ x: block.location.x, y: doorTopY, z: block.location.z }),
                dimension.getBlock({ x: block.location.x, y: doorBottomY, z: block.location.z })
            ].filter(b => b && isDoorBlock(b));
        }

        for (const targetBlock of blocksToCheck) {
            if (!targetBlock || !targetBlock.isValid || !targetBlock.location) continue;

            if (isPartOfLockedBlock(targetBlock, dimension)) {
                let adjacent = [
                    { x: targetBlock.location.x + 1, y: targetBlock.location.y, z: targetBlock.location.z },
                    { x: targetBlock.location.x - 1, y: targetBlock.location.y, z: targetBlock.location.z },
                    { x: targetBlock.location.x, y: targetBlock.location.y + 1, z: targetBlock.location.z },
                    { x: targetBlock.location.x, y: targetBlock.location.y - 1, z: targetBlock.location.z },
                    { x: targetBlock.location.x, y: targetBlock.location.y, z: targetBlock.location.z + 1 },
                    { x: targetBlock.location.x, y: targetBlock.location.y, z: targetBlock.location.z - 1 }
                ].map(pos => dimension.getBlock(pos)).filter(b => b && b.isValid && b.typeId && b.typeId.includes('sign'));

                if (isDoorBlock(targetBlock)) {
                    const doorTopY = targetBlock.permutation.getState('upper_block_bit') ? targetBlock.location.y : targetBlock.location.y + 1;
                    const aboveDoorTop = dimension.getBlock({ x: targetBlock.location.x, y: doorTopY + 1, z: targetBlock.location.z });
                    if (aboveDoorTop && aboveDoorTop.isValid && aboveDoorTop.typeId && aboveDoorTop.typeId.includes('sign')) {
                        adjacent.push(aboveDoorTop);
                    }
                }

                for (const signBlock of adjacent) {
                    const signComponent = signBlock.getComponent('minecraft:sign');
                    const signInfo = signComponent && getSignInfo(signComponent);
                    if (signInfo && signInfo.owner && !canAccessBlock(player, signComponent)) {
                        event.cancel = true;
                        player.sendMessage('§cCannot break block with locked sign attached!');
                        return;
                    }
                }
            }
        }
    } catch (error) {
        console.warn(`Error in playerBreakBlock: ${error.message}`);
    }
});

// Handle chest placement near locked chests
world.beforeEvents.playerPlaceBlock.subscribe(event => {
    try {
        const { block, player, permutationBeingPlaced } = event;
        if (!permutationBeingPlaced || permutationBeingPlaced.type.id !== 'minecraft:chest') return;

        const dimension = block.dimension;
        const { x, y, z } = block.location;
        const neighbors = [
            dimension.getBlock({ x: x + 1, y, z }),
            dimension.getBlock({ x: x - 1, y, z }),
            dimension.getBlock({ x, y, z: z + 1 }),
            dimension.getBlock({ x, y, z: z - 1 })
        ].filter(b => b && b.typeId === 'minecraft:chest');

        for (const neighbor of neighbors) {
            const paired = getPairedBlock(neighbor, dimension);
            const wouldMerge = paired.length === 0 && (
                (Math.abs(neighbor.location.x - x) == 1 && neighbor.location.z == z) ||
                (Math.abs(neighbor.location.z - z) == 1 && neighbor.location.x == x)
            );

            if (wouldMerge && (hasLockingSign(neighbor, dimension) || hasOtherPairedChest(neighbor, dimension, block.location))) {
                const adjacentSigns = [
                    { x: neighbor.location.x + 1, y: neighbor.location.y, z: neighbor.location.z },
                    { x: neighbor.location.x - 1, y: neighbor.location.y, z: neighbor.location.z },
                    { x: neighbor.location.x, y: neighbor.location.y + 1, z: neighbor.location.z },
                    { x: neighbor.location.x, y: neighbor.location.y - 1, z: neighbor.location.z },
                    { x: neighbor.location.x, y: neighbor.location.y, z: neighbor.location.z + 1 },
                    { x: neighbor.location.x, y: player.location.y, z: player.location.z - 1 }
                ].map(pos => dimension.getBlock(pos)).filter(b => b && b.typeId && b.typeId.includes('sign'));

                let allowed = false;
                for (const signBlock of adjacentSigns) {
                    const signComponent = signBlock.getComponent('minecraft:sign');
                    if (signComponent && canAccessBlock(player, signComponent)) {
                        allowed = true;
                        break;
                    }
                }
                if (!allowed) {
                    event.cancel = true;
                    player.sendMessage('§cCannot place chest next to a locked chest!');
                    return;
                }
            }
        }
    } catch (error) {
        console.warn(`Error in playerPlaceBlock: ${error.message}`);
    }
});

// Single interval for checking all sign placements and owner interactions
system.runInterval(() => {
    for (const [playerName, placement] of recentSignPlacements) {
        try {
            const timeout = placement.isOwnerInteraction ? SIGN_OWNER_CHECK_TIMEOUT : SIGN_CHECK_TIMEOUT;
            if (Date.now() - placement.timestamp > timeout * 50) {
                recentSignPlacements.delete(playerName);
                if (!placement.isOwnerInteraction) {
                    const player = world.getAllPlayers().find(p => p.name === playerName);
                    player?.sendMessage('§cSign not locked. Use [Private] on the first line.');
                }
                continue;
            }

            const block = world.getDimension(placement.dimensionId).getBlock(placement.location);
            if (!block || !block.typeId.includes('sign')) {
                recentSignPlacements.delete(playerName);
                continue;
            }

            const signComponent = block.getComponent('minecraft:sign');
            if (!signComponent) {
                recentSignPlacements.delete(playerName);
                continue;
            }

            const signInfo = getSignInfo(signComponent);
            if (signInfo) {
                const player = world.getAllPlayers().find(p => p.name === playerName);
                if (player && !placement.originalText && !placement.isOwnerInteraction) {
                    // New placement: lock the sign
                    if (lockSign(block, player, true)) {
                        recentSignPlacements.delete(playerName);
                    }
                } else if (player && placement.originalText && placement.isOwnerInteraction) {
                    // Owner interaction: check for owner name change
                    const originalLines = placement.originalText.split('\n').map(line => line.trim());
                    const currentText = signComponent.getText(SignSide.Front) || '';
                    const currentLines = currentText.split('\n').map(line => line.trim());
                    const originalOwner = originalLines[1]?.toLowerCase() || '';
                    const currentOwner = currentLines[1]?.toLowerCase() || '';

                    if (originalOwner && currentOwner !== originalOwner && signInfo.owner) {
                        // Owner name changed or removed, revert to original text
                        signComponent.setText(placement.originalText, SignSide.Front);
                        player.sendMessage('§cOwner name cannot be changed or removed. Sign text reverted.');
                        logDebug(`Reverted sign at ${block.location.x},${block.location.y},${block.location.z} to original text for owner ${playerName}`);
                    }
                }
            }
        } catch (error) {
            console.warn(`Error in sign check for ${playerName}: ${error.message}`);
            recentSignPlacements.delete(playerName);
        }
    }
}, SIGN_CHECK_INTERVAL);

// Handle sign placement
world.afterEvents.playerPlaceBlock.subscribe(event => {
    try {
        const { block, player } = event;
        if (!block || !block.typeId.includes('sign')) return;

        recentSignPlacements.set(player.name, {
            location: block.location,
            dimensionId: block.dimension.id,
            timestamp: Date.now(),
            originalText: '', // Empty for new placements
            isOwnerInteraction: false
        });
        logDebug(`Registered sign placement for ${player.name} at ${block.location.x},${block.location.y},${block.location.z}`);
    } catch (error) {
        console.warn(`Error in playerPlaceBlock (sign): ${error.message}`);
    }
});

// Clean up on player leave
world.afterEvents.playerLeave.subscribe(event => {
    recentSignPlacements.delete(event.playerName);
});

console.log('Lockette sign lock script loaded');