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

const statTypes = [
    "attack_speed", "attack_speed_multiplicative", "wind_up", "initial_combo",
    "combo_efficiency", "combo_duration", "combo_duration_multiplicative", "critical_damage",
    "critical_chance", "critical_chance_heavy", "critical_chance_per_combo",
    "critical_chance_multiplicative", "critical_chance_flat", "status", "status_per_combo",
    "status_multiplicative", "status_damage", "damage", "condition_overload", "damage_heavy",
    "damage_multiplicative", "damage_multiplicative_grineer", "damage_multiplicative_corpus",
    "damage_multiplicative_corrupted", "damage_multiplicative_infested", "damage_multiplicative_sentient",
    "armor_reduction", "impact", "puncture", "slash", "cold", "electricity", "heat", "toxin",
    "blast", "corrosive", "gas", "magnetic", "radiation", "viral", "void_dmg"
];

function updateModsArray() {
    mods = [];
    modding.querySelectorAll('.cell').forEach(cell => {
        if (cell.modData && cell.modData.name) {
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
        let name = modData?.name;
        let stats = modData?.stats;
        nameText.textContent = name;
        tbody.innerHTML = "";

        if(!stats){
            stats = [];
            for (let buff of modData.buffs) {
                const true_value = buff?.value * (1 + (modData.current_level ?? modData.max_level));
                const value = formatDecimals(true_value, 3);
                const stat = buff?.buff;
                stats.push({value: value, stat: stat});
            }
        }

        stats.forEach(stat => {
            const tr = document.createElement("tr");
            const tdValue = document.createElement("td");
            tdValue.textContent = stat.value;
            const tdStat = document.createElement("td");
            tdStat.textContent = stat.stat;
            tr.appendChild(tdValue);
            tr.appendChild(tdStat);
            tbody.appendChild(tr);
        });
        modData.stats = stats;
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
    target.addEventListener('blur', function () {
        const filter_text = document.getElementById("mod_list_search").value.toUpperCase();
        const filter_polarity = document.getElementById("mod_list_select_polarity").value;
        const filter_type = document.getElementById("mod_list_select_type").value;
        const filter_rarity = document.getElementById("mod_list_select_rarity").value;

        const li = mod_list.querySelectorAll(".cell");
        for (let element of li) {
            let txtValue = element.textContent || element.innerText;
            const included = txtValue.toUpperCase().includes(filter_text)
                && element.modData.rarity.includes(filter_rarity)
                && element.modData.type.includes(filter_type)
                && element.modData.polarity.includes(filter_polarity);
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

/***** Modal Functions *****/
function openEditModal(cell) {
    if (!cell.modData || !cell.modData.name) return;
    const modNameInput = document.getElementById("mod-name-input");
    modNameInput.value = cell.modData.name;

    const modLevelInput = document.getElementById("mod-level-input");
    modLevelInput.value = cell.modData.max_level;

    const polarity = polarity_unicode[cell.modData.polarity] ?? (cell.modData.polarity || " any");
    const modCapacity = document.getElementById("mod-capacity");
    modCapacity.innerText = cell.modData.base_drain + cell.modData.max_level + polarity;

    const statsTbody = document.getElementById("stats-tbody");
    statsTbody.innerHTML = "";

    cell.modData.buffs.forEach(stat => {
        const statLineClone = document.getElementById("stat-line-template").content.cloneNode(true);
        const firstTd = statLineClone.querySelector("td:nth-child(1)");
        const valueInput = firstTd.querySelector("input");
        const valueUnit = firstTd.querySelector("span");

        const statSelect = statLineClone.querySelector("td:nth-child(2) select");
        statSelect.innerHTML = "";

        //FIXME wtf is this shit
        [...statTypes, stat.buff].forEach(type => {
            const option = document.createElement("option");
            option.value = type;
            option.textContent = type;
            if(type === stat.buff) option.disabled = true;
            statSelect.appendChild(option);
        });
        //valueUnit.innerText = stat.display_as; //TODO hide temporarily until fixed
        valueInput.value = formatDecimals(stat.value
            * (1 + (cell.modData.current_level ?? cell.modData.max_level))
            //* (stat.display_as === "%" ? 100 : 1) TODO
            //+ ((stat.operation === "STACKING_MULTIPLY") ? 1 : 0)
            , 5);
        statSelect.value = stat.buff;

        const operationSelect = statLineClone.querySelector("td:nth-child(3) select");
        operationSelect.value = stat.operation ?? operationSelect.value;

        const conditionSelect = statLineClone.querySelector("td:nth-child(4) select");
        conditionSelect.value = stat.condition ?? conditionSelect.value;

        const durationInput = statLineClone.querySelector("td:nth-child(5) input");
        durationInput.value = stat.duration ?? durationInput.value;

        const maxStacksInput = statLineClone.querySelector("td:nth-child(6) input");
        maxStacksInput.value = stat.maxStacks ?? maxStacksInput.value;

        const expiryModeSelect = statLineClone.querySelector("td:nth-child(7) select");
        expiryModeSelect.value = stat.expiryMode ?? expiryModeSelect.value;

        const refreshModeSelect = statLineClone.querySelector("td:nth-child(8) select");
        refreshModeSelect.value = stat.refreshMode ?? refreshModeSelect.value;

        statsTbody.appendChild(statLineClone);
    });

    const form = modDialog.querySelector("form");
    form.addEventListener("submit", function(e) {
        e.preventDefault();
        const modData = cell.modData;
        const newName = modNameInput.value;
        const newStats = Array.from(statsTbody.children).map(tr => {
            const cells = tr.children;
            const value = cells[0].querySelector("input").value;
            //TODO
            // -1 if stat.operation === "STACKING_MULTIPLY"
            // /100 if stat.display_as === "%"
            const statType = cells[1].querySelector("select").value;
            const condition = cells[2].querySelector("select").value;
            const operation = cells[3].querySelector("select").value;
            const duration = cells[4].querySelector("input").value;
            const maxStacks = cells[5].querySelector("input").value;
            const expiryMode = cells[6].querySelector("select").value;
            const refreshMode = cells[7].querySelector("select").value;
            return { value, stat: statType, condition, operation, duration, maxStacks, expiryMode, refreshMode };
        });

        modData.name = newName;
        modData.stats = newStats;

        updateCell(cell, modData);
        modDialog.close();
    }, { once: true });

    modDialog.showModal();
}

function addStatLine() {
    const stats_table = document.getElementById('stats-tbody');
    const stat_line_template = document.getElementById("stat-line-template").content.cloneNode(true);
    const firstColSelect = stat_line_template.querySelector("td:nth-child(2) select");
    firstColSelect.innerHTML = "";
    statTypes.forEach(type => {
        const option = document.createElement("option");
        option.value = type;
        option.textContent = type;
        firstColSelect.appendChild(option);
    });
    stats_table.appendChild(stat_line_template);
}

function removeStatLine() {
    document.getElementById('stats-tbody').lastElementChild?.remove();
}