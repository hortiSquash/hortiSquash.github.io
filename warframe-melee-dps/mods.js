/***** Global Variables & Data *****/
const modding = document.getElementById('modding');
const mod_list = document.getElementById('mod-list');
const cellTemplate = document.getElementById('cell-template');
const modDialog = document.getElementById("mod-dialog");
let draggedCell = null;
let mods = [];

const polarity_unicode = {
    //ammo thingy is ea01
    "Madurai": "\u{ea02}",
    "Vazarin": "\u{ea03}",
    "Zenurik": "\u{ea04}",
    "Penjaga": "\u{ea05}",
    "Naramon": "\u{ea06}",
    "Umbra": "\u{ea07}",
    "Unairu": "\u{ea08}",
    //corrosive is ea0b
    //elec is ???
    //gas is ea10
    //impact is ea11
    //puncture is ea14
    //tau is ea17
    //slash is ea18
    //viral is ea19
}

const statTypes = {
    "WEAPON_FIRE_RATE": "fire rate",
    "WEAPON_MELEE_HEAVY_CHARGE_SPEED": "wind-up",

    "WEAPON_MELEE_COMBO_INITIAL_BONUS": "initial combo",
    "WEAPON_MELEE_COMBO_USAGE_EFFICIENCY": "combo efficiency",
    "WEAPON_MELEE_COMBO_DURATION_BONUS": "combo duration",

    "WEAPON_CRIT_CHANCE": "critical chance",
    "WEAPON_CRIT_DAMAGE": "critical damage",

    "WEAPON_PROC_CHANCE": "status chance",
    "WEAPON_PROC_DAMAGE": "status damage",

    "WEAPON_PERCENT_BASE_DAMAGE_ADDED": "elemental damage",
    "WEAPON_DAMAGE_AMOUNT": "weapon damage",
    "WEAPON_MELEE_DAMAGE": "melee damage",

    "GAMEPLAY_FACTION_DAMAGE": "faction damage",
    "WEAPON_DAMAGE_IF_VICTIM_PROC_ACTIVE": "condition overload",
    "AVATAR_ARMOUR": "enemy armor reduction",
};

function updateModsArray() {
    mods = [];
    modding.querySelectorAll('.cell').forEach(cell => {
        if (cell.modData) {
            mods.push(cell.modData);
        }
    });
    console.trace("Mods array updated:", mods);

    updateModding();
}

// Ensure a cell has the mod cell structure.
function ensureCellStructure(cell) {
    if (!cell.querySelector('.mod-name')) {
        const clone = cellTemplate.content.cloneNode(true);
        cell.appendChild(clone);
    }
}

// Update a cell with a mod’s name and its stats.
function updateCell(cell, modData, update_mods = true) {
    ensureCellStructure(cell);
    const nameText = cell.querySelector(".mod-name .name-text");
    const statsTable = cell.querySelector(".mod-stats");
    const tbody = statsTable.querySelector("tbody");

    //fixme maybe? if unnamed, mod gets deleted
    if (modData) {
        cell.draggable = true;
        nameText.textContent = modData.name;
        tbody.innerHTML = "";

        modData.buffs.forEach(buff => {
            const tr = document.createElement("tr");
            const tdValue = document.createElement("td");
            tdValue.style.width = "1.5rem";
            tdValue.textContent = formatDecimals(buff.value * (1 + (modData.current_level ?? modData.max_level)), 3);
            //TODO display_as with 100x if %, +1 with operationtype, etc

            const tdStat = document.createElement("td");
            tdStat.textContent = ((!Object.keys(statTypes).includes(buff.buff)) ? `unknown:\u{00a0}` + buff.buff : statTypes[buff.buff]);
            tr.appendChild(tdValue);
            tr.appendChild(tdStat);
            tbody.appendChild(tr);
        });
        cell.modData = modData;

        for(let classname of cell.classList){
            if(classname.startsWith("mod-rarity-")){
                cell.classList.remove(classname);
            }
        }
        cell.classList.add("mod-rarity-" + modData.rarity);

        if(cell.closest("#modding") && update_mods) {
            updateModsArray();
        }
    } else {
        emptyCell(cell, update_mods);
    }

    // If this is a buff slot, enforce exactly one empty slot.
    if (cell.classList.contains("buff-slot")) {
        checkBuffSlots();
    }
}

// Empties a cell.
function emptyCell(cell, update_mods = true) {
    cell.draggable = false;
    delete cell.modData;
    if(cell.hasChildNodes()){
        cell.innerHTML = "";

        if(cell.closest("#modding") && update_mods) {
            updateModsArray();
        }
    }
}

function canSwapAtoB(cell1, cell2){
    if(!cell2.classList.contains("special-slot")) return true;
    if(!cell1.modData) return true;
    return cell2.dataset.slot_type === cell1.modData.type;
}

// Swap mod data between two cells.
function swapCells(cell1, cell2) {
    if(!canSwapAtoB(cell1, cell2) || !canSwapAtoB(cell2, cell1)) return;
    const data1 = cell1.modData;
    const data2 = cell2.modData;
    updateCell(cell1, data2, false);
    updateCell(cell2, data1, false);
    updateModsArray();

    // If either cell is in the buffs_wrapper, enforce exactly one empty slot.
    if (cell1.classList.contains("buff-slot") || cell2.classList.contains("buff-slot")) {
        checkBuffSlots();
    }
}

// TODO fix this selector thingy for the autocompletion and stuff to work
/**
 * @param{CSS} selector
 */
function createDelegatedEvent(selector, fn) {
    return function (event) {
        const elem = event.target.closest(selector)
        if (elem) {
            fn(event, elem);
        }
    }
}

function deleteMod(cell) {
    const mod_list_slots = Array.from(mod_list.querySelectorAll('.cell'));
    // An "empty" slot is one with no modData or no modData.name.
    const emptySlots = mod_list_slots.filter(slot => !(slot.modData && slot.modData.name));
    if(emptySlots.length > 0) {
        swapCells(cell, emptySlots[0]);
    }else{
        let cell2 = document.createElement("div");
        cell2.classList.add("cell");
        mod_list.appendChild(cell2);
        swapCells(cell, cell2);
    }

    if (cell.classList.contains("buff-slot")) checkBuffSlots();
}

modding.addEventListener("click", createDelegatedEvent(".cell", function (event, cell) {
    if (event.target.classList.contains("remove")) {
        deleteMod(cell)
    } else {
        openEditModal(cell);
    }
}))
modding.addEventListener("contextmenu", createDelegatedEvent(".cell", function (event, cell) {
    event.preventDefault();
    deleteMod(cell);
}))
modding.addEventListener("dragstart", createDelegatedEvent(".cell", function (event, cell) {
    if (cell.querySelector(".mod-name")) {
        draggedCell = cell;
        setTimeout(() => cell.classList.add("dragging"), 0);
    }
}))
modding.addEventListener("dragend", createDelegatedEvent(".cell", function (event, cell) {
    cell.classList.remove("dragging");
    draggedCell = null;
}))
modding.addEventListener("dragover", createDelegatedEvent(".cell", function (event, cell) {
    event.preventDefault();
}))
modding.addEventListener("drop", createDelegatedEvent(".cell", function (event, cell) {
    if (draggedCell && draggedCell !== cell) {
        swapCells(draggedCell, cell);
    }
}))

mod_list.addEventListener("dragstart", createDelegatedEvent(".cell", function (event, cell) {
    if (cell.querySelector(".mod-name")) {
        draggedCell = cell;
        setTimeout(() => cell.classList.add("dragging"), 0);
    }
}))
mod_list.addEventListener("dragend", createDelegatedEvent(".cell", function (event, cell) {
    cell.classList.remove("dragging");
    draggedCell = null;
}))
mod_list.addEventListener("dragover", createDelegatedEvent(".cell", function (event, cell) {
    event.preventDefault();
}))
mod_list.addEventListener("drop", createDelegatedEvent(".cell", function (event, cell) {
    if (draggedCell && draggedCell !== cell) {
        swapCells(draggedCell, cell);
    }
}))

document.querySelectorAll("#mod_list_search, #mod_list_select_polarity, #mod_list_select_type, #mod_list_select_rarity").forEach(function (target) {
    target.addEventListener('change', function () {
        const filter_text = document.getElementById("mod_list_search").value.toUpperCase();
        const filter_polarity = document.getElementById("mod_list_select_polarity").value;
        const filter_type = document.getElementById("mod_list_select_type").value;
        const filter_rarity = document.getElementById("mod_list_select_rarity").value;

        const li = mod_list.querySelectorAll(".cell");
        for (let element of li) {
            let txtValue = element.textContent || element.innerText;
            const included = txtValue.toUpperCase().includes(filter_text)
                && (filter_rarity === "" || element.modData.rarity === filter_rarity)
                && (filter_type === "" || element.modData.type === filter_type)
                && (filter_polarity === "" || element.modData.polarity === filter_polarity);
            /*
                && (element.modData.rarity?.includes(filter_rarity) ?? true)
                && (element.modData.type?.includes(filter_type) ?? true)
                && (element.modData.polarity?.includes(filter_polarity) ?? true);
            */
            element.classList.toggle("d-none", !included);
        }
})})

/***** Buff Slot Management *****/
function addBuffSlot() {
    const buffsWrapper = document.querySelector('#buffs_wrapper');
    const newSlot = document.createElement('div');
    newSlot.className = "cell buff-slot";
    buffsWrapper.appendChild(newSlot);
}

// Ensure there is exactly ONE empty buff slot at all times.
function checkBuffSlots() {
    const buffsWrapper = document.querySelector('#buffs_wrapper');
    const buffSlots = Array.from(buffsWrapper.querySelectorAll('.buff-slot'));
    // An "empty" buff slot is one with no modData or no modData.name.
    const emptySlots = buffSlots.filter(slot => !(slot.modData && slot.modData.name));
    if (emptySlots.length > 1) {
        // Remove all but the last empty slot.
        for (let i = 0; i < emptySlots.length - 1; i++) {
            emptySlots[i].remove();
        }
    } else if (emptySlots.length === 0) {
        // If no empty slot, add one.
        addBuffSlot();
    }
}

const buff_keys_text_inputs = ["buff", "damage_type", "symbol_filter", "operation", "condition", "upgrade_duration", "max_stacks"];
const buff_keys_number_inputs = ["upgrade_duration", "max_stacks"];
const buff_keys_checkboxes = ["chance_scales", "duration_scales", "stack_mode", "can_reproc"];

/***** Modal Functions *****/
function openEditModal(cell) {
    const modData = cell.modData;
    if (!modData?.name) return;

    //this is just for removing all event handlers
    // cause we keep creating new ones
    modDialog.innerHTML = modDialog.innerHTML;

    const modNameInput = document.getElementById("mod-name-input");
    modNameInput.value = modData.name;

    const modLevelInput = document.getElementById("mod-level-input");
    modLevelInput.value = modData.current_level ?? modData.max_level;
    modLevelInput.max = modData.max_level;

    const abilityStrengthInput = document.getElementById("ability-strength-input");
    abilityStrengthInput.value = modData.current_strength ?? abilityStrengthInput.value;

    const polarity = polarity_unicode[modData.polarity] ?? (modData.polarity || " any");
    const modCapacity = document.getElementById("mod-capacity");
    modCapacity.innerText = modData.base_drain + modLevelInput.valueAsNumber + polarity;

    const isAbility = modData.type === "ability";
    abilityStrengthInput.parentElement.classList.toggle("d-none", !isAbility);
    modCapacity.parentElement.classList.toggle("d-none", isAbility);
    modLevelInput.parentElement.classList.toggle("d-none", isAbility);

    const statsTbody = document.getElementById("stats-tbody");
    statsTbody.innerHTML = "";

    modData.buffs.forEach(stat => {
        const statLineClone = document.getElementById("stat-line-template").content.cloneNode(true);
        const valueInput = statLineClone.querySelector("[name='value']");
        const valueUnit = valueInput.parentElement.querySelector("span");

        const statSelect = statLineClone.querySelector("[name='buff']");
        statSelect.innerHTML = "";

        Object.entries(statTypes).forEach(([key, value]) => {
            const option = document.createElement("option");
            option.value = key;
            option.textContent = value;
            statSelect.appendChild(option);
        });
        if(!Object.keys(statTypes).includes(stat.buff)) {
            const option = document.createElement("option");
            option.value = stat.buff;
            option.textContent = stat.buff;
            option.disabled = true;
            option.selected = true;
            statSelect.appendChild(option);
        }

        //valueUnit.innerText = stat.display_as; //TODO hide temporarily until fixed
        valueInput.value = formatDecimals(stat.value
            * (1 + modLevelInput.valueAsNumber)
            //* (stat.display_as === "%" ? 100 : 1) TODO
            //+ ((stat.operation === "STACKING_MULTIPLY") ? 1 : 0)
            , 5);
        statSelect.value = stat.buff;

        const chance = statLineClone.querySelector(`[name='upgrade_chance']`);
        if (stat.upgrade_chance) chance.value = formatDecimals(stat.upgrade_chance * 100, 2);

        for(let name of [...buff_keys_text_inputs, ...buff_keys_number_inputs]) {
            if(name === "buff") continue;
            const whatever = statLineClone.querySelector(`[name='${name}']`);
            if (stat[name]) whatever.value = stat[name];
        }
        for(let name of buff_keys_checkboxes) {
            const whatever = statLineClone.querySelector(`[name='${name}']`);
            if (stat[name]) whatever.checked = stat[name];
        }

        statsTbody.appendChild(statLineClone);
    });

    let old_mod_level = modLevelInput.valueAsNumber;
    modLevelInput.addEventListener("change", () => {
        const level_ratio = (1 + modLevelInput.valueAsNumber) / (1 + old_mod_level);
        for(let tr of statsTbody.children){
            const value = tr.querySelector(`[name='value']`);
            value.value = formatDecimals(
                value.value * level_ratio, 5);

            if(tr.querySelector(`[name='chance_scales']`).checked) {
                const chance = tr.querySelector(`[name='upgrade_chance']`);
                chance.value = formatDecimals(
                    chance.value * level_ratio, 2);
            }
            if(tr.querySelector(`[name='duration_scales']`).checked) {
                const duration = tr.querySelector(`[name='upgrade_duration']`);
                duration.value = formatDecimals(
                    duration.value * level_ratio, 2);
            }

            //FIXME NaN when parse % and text and , and shit
        }
        old_mod_level = modLevelInput.valueAsNumber ?? 0;
    })

    let old_ability_strength = abilityStrengthInput.valueAsNumber;
    abilityStrengthInput.addEventListener("change", () => {
        const level_ratio = abilityStrengthInput.valueAsNumber / old_ability_strength;
        for(let tr of statsTbody.children){
            const cell = tr.querySelector(`[name='value']`);
            cell.value = formatDecimals(
                cell.value * level_ratio, 5);

            //FIXME NaN when parse % and text and , and shit
        }
        old_ability_strength = abilityStrengthInput.valueAsNumber ?? 100;
    })

    modDialog.querySelector("form").addEventListener("submit", function(e) {
        e.preventDefault();
        modData.name = modNameInput.value;
        modData.current_level = modLevelInput.valueAsNumber;
        if(isAbility) modData.current_strength = abilityStrengthInput.valueAsNumber;

        modData.buffs.length = statsTbody.children.length;
        for(let i=0; i < statsTbody.children.length; i++){
            const tr = statsTbody.children[i];

            modData.buffs[i] ??= {};
            const current_buff = modData.buffs[i];

            const value = tr.querySelector("[name='value']").value;
            current_buff.value = value / (1 + modData.current_level);
            //TODO
            // -1 if stat.operation === "STACKING_MULTIPLY"
            // /100 if stat.display_as === "%"

            //FIXME NaN when parse % and text and , and shit

            const chance = tr.querySelector(`[name='upgrade_chance']`);
            current_buff.upgrade_chance = chance.value / 100;

            for(let name of [...buff_keys_text_inputs, ...buff_keys_number_inputs]) {
                current_buff[name]= tr.querySelector(`[name='${name}']`).value;
            }
            for(let name of buff_keys_number_inputs) {
                current_buff[name]= Number(current_buff[name]);
            }
            for(let name of buff_keys_checkboxes) {
                current_buff[name]= tr.querySelector(`[name='${name}']`).checked;
            }
        }

        updateCell(cell, modData);
        modDialog.close();
    }, { once: true });

    modDialog.showModal();
}

function addStatLine() {
    const stats_table = document.getElementById('stats-tbody');
    const stat_line_template = document.getElementById("stat-line-template").content.cloneNode(true);
    const select_buffs = stat_line_template.querySelector("[name='buff']");
    select_buffs.innerHTML = "";
    Object.entries(statTypes).forEach(([key, value]) => {
        const option = document.createElement("option");
        option.value = key;
        option.textContent = value;
        select_buffs.appendChild(option);
    });
    stats_table.appendChild(stat_line_template);
}

function removeStatLine() {
    document.getElementById('stats-tbody').lastElementChild?.remove();
}