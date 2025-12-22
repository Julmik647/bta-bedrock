import { world, ItemStack, EntityComponentTypes, EquipmentSlot } from "@minecraft/server";

console.warn("[Betafied] Sword System Loaded (Event-Driven)");

// Equips zombie pigmen with golden swords on spawn
// Replaces expensive polling loop with single event
world.afterEvents.entitySpawn.subscribe((event) => {
    const entity = event.entity;
    
    if (entity.typeId === "minecraft:zombie_pigman") {
        try {
            const equippable = entity.getComponent(EntityComponentTypes.Equippable);
            if (!equippable) return;

            // Only equip if empty or wrong item (prevents overwriting custom gear)
            const mainHand = equippable.getEquipment(EquipmentSlot.Mainhand);
            if (!mainHand || mainHand.typeId !== "minecraft:golden_sword") {
                equippable.setEquipment(EquipmentSlot.Mainhand, new ItemStack("minecraft:golden_sword"));
            }
        } catch (e) {
            // entity might have despawned instantly
        }
    }
});