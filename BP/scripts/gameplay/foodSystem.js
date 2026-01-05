// beta food system - instant health, no saturation

import { world, system, ItemStack } from "@minecraft/server";

// food values - beta 1.7.3 custom items only
const FOOD_ITEMS = Object.freeze({
  "bh:apple": { health: 4 },
  "bh:bread": { health: 5 },
  "bh:cookie": { health: 1 },
  "bh:cod": { health: 2 },
  "bh:cooked_cod": { health: 5 },
  "bh:golden_apple": { health: 42 },
  "bh:porkchop": { health: 3 },
  "bh:cooked_porkchop": { health: 8 },
  "minecraft:mushroom_stew": { health: 10, returnContainer: "minecraft:bowl" }
});

const CAKE_CONFIG = Object.freeze({
  blockId: "minecraft:cake",
  healthRestore: 3,
  maxBites: 6,
  stateProperty: "bite_counter"
});

class FoodSystem {
  constructor() {
    console.warn("[keirazelle] Food System Loaded");
    this.disableNaturalRegeneration();
    this.registerEventHandlers();
  }

  disableNaturalRegeneration() {
    system.run(() => {
        try {
            if (world.gameRules) {
                world.gameRules.naturalRegeneration = false;
            }
        } catch(e) {}
    });
  }

  registerEventHandlers() {
    try {
      if (world.beforeEvents?.itemUse) {
        world.beforeEvents.itemUse.subscribe(this.handleFoodConsumption.bind(this));
      }
    } catch (e) {}
    
    try {
      if (world.beforeEvents?.playerInteractWithBlock) {
        world.beforeEvents.playerInteractWithBlock.subscribe(this.handleCakeInteraction.bind(this));
      }
    } catch (e) {}
  }

  // eat food -> get health
  handleFoodConsumption(event) {
    const { source: player, itemStack } = event;
    
    if (!player || !itemStack || !FOOD_ITEMS[itemStack.typeId]) {
      return;
    }

    event.cancel = true;

    system.run(() => {
      try {
        if (player.typeId !== "minecraft:player") return;

        const inventory = player.getComponent("minecraft:inventory")?.container;
        const healthComponent = player.getComponent("minecraft:health");
        
        if (!inventory || !healthComponent) return;

        const selectedSlot = player.selectedSlotIndex;
        const slotItem = inventory.getItem(selectedSlot);

        if (!slotItem || slotItem.typeId !== itemStack.typeId) return;

        this.consumeFoodItem(player, inventory, healthComponent, itemStack, selectedSlot);
      } catch (error) {
        // quiet fail
      }
    });
  }

  // logic for eating
  consumeFoodItem(player, inventory, healthComponent, item, slot) {
    const foodData = FOOD_ITEMS[item.typeId];
    
    const currentHealth = healthComponent.currentValue;
    const maxHealth = healthComponent.defaultValue;

    const isGoldenApple = item.typeId.includes("golden_apple");

    // can't eat if full health (except gapple)
    if (currentHealth >= maxHealth && !isGoldenApple) {
      return; 
    }
    
    // heal
    const newHealth = Math.min(currentHealth + foodData.health, maxHealth);
    
    if (newHealth > currentHealth) {
      healthComponent.setCurrentValue(newHealth);
    }
    player.playSound("random.burp", { volume: 0.5, pitch: 1.0 });

    // consume item
    const newAmount = item.amount - 1;
    inventory.setItem(slot, newAmount > 0 
      ? new ItemStack(item.typeId, newAmount) 
      : undefined);
    
    // return bowl if stew consumed
    if (foodData.returnContainer && newAmount <= 0) {
      this.tryAddItemToInventory(inventory, new ItemStack(foodData.returnContainer, 1));
    }
  }

  // cake eating
  handleCakeInteraction(event) {
    const { player, block } = event;
    
    if (!block || block.typeId !== CAKE_CONFIG.blockId) return;

    event.cancel = true;

    system.run(() => {
      try {
        if (player.typeId !== "minecraft:player") return;

        const healthComponent = player.getComponent("minecraft:health");
        if (!healthComponent) return;

        // heal from cake
        const currentHealth = healthComponent.currentValue;
        const maxHealth = healthComponent.defaultValue;
        const newHealth = Math.min(currentHealth + CAKE_CONFIG.healthRestore, maxHealth);

        if (newHealth > currentHealth) {
          healthComponent.setCurrentValue(newHealth);
          player.playSound("random.burp", { volume: 0.5, pitch: 1.0 });
        }

        // bite the cake
        const currentBites = block.permutation.getState(CAKE_CONFIG.stateProperty) ?? 0;
        const newBites = currentBites + 1;

        if (newBites < CAKE_CONFIG.maxBites) {
          block.setPermutation(
            block.permutation.withState(CAKE_CONFIG.stateProperty, newBites)
          );
        } else {
          // cake finished
          system.runTimeout(() => {
            block.dimension.setBlockType(block.location, "minecraft:air");
          }, 1);
        }
      } catch (error) {}
    });
  }

  tryAddItemToInventory(inventory, itemStack) {
    try {
      if (!inventory.isFull()) {
        return inventory.addItem(itemStack);
      }
      return false;
    } catch (error) {
      return false;
    }
  }
}

const betaFoodSystem = new FoodSystem();
export default betaFoodSystem;