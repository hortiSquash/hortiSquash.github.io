/***** Global Variables & Data *****/
const modding = document.getElementById('modding');
const mod_list = document.getElementById('mod-list');
const cellTemplate = document.getElementById('cell-template');
const modDialog = document.getElementById("mod-dialog");
let draggedCell = null;
let editingCell = null;
let mods = [];

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

/***** Helper Functions *****/
function generateStats() {
    const statsArray = [];
    const statCount = 1 + Math.floor(Math.random() * 4);
    for (let i = 0; i < statCount; i++) {
        const value = `${Math.floor(Math.random() * 100) + 1}%`;
        const stat = statTypes[Math.floor(Math.random() * statTypes.length)];
        const condition = "None";
        const duration = "";
        const maxStacks = "";
        const expiryMode = "all at once";
        const refreshMode = "while active";
        statsArray.push({ value, stat, condition, duration, maxStacks, expiryMode, refreshMode });
    }
    return statsArray;
}

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
function updateCell(cell, name, stats = null, update_mods = true) {
    ensureCellStructure(cell);
    const nameText = cell.querySelector(".mod-name .name-text");
    const statsTable = cell.querySelector(".mod-stats");
    const tbody = statsTable.querySelector("tbody");

    //fixme maybe? if unnamed, mod gets deleted
    if (name) {
        cell.draggable = true;
        stats ??= cell.modData?.stats ?? generateStats();
        nameText.textContent = name;
        tbody.innerHTML = "";
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
        cell.modData = { name, stats };

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

// Swap mod data between two cells.
function swapCells(cell1, cell2) {
    const data1 = cell1.modData;
    const data2 = cell2.modData;
    updateCell(cell1, data2?.name, data2?.stats, false);
    updateCell(cell2, data1?.name, data1?.stats, false);
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

document.getElementById("mod_list_search").addEventListener("change", function(e) { //keyup
    const filter = document.getElementById("mod_list_search").value.toUpperCase();
    const li = mod_list.querySelectorAll(".cell");
    for (let element of li) {
        let txtValue = element.textContent || element.innerText;
        const included = txtValue.toUpperCase().includes(filter);
        element.classList.toggle("d-none", !included);
    }
})

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
    editingCell = cell;
    const modNameInput = document.getElementById("mod-name-input");
    modNameInput.value = cell.modData.name;
    const statsTbody = document.getElementById("stats-tbody");
    statsTbody.innerHTML = "";

    cell.modData.stats.forEach(stat => {
        const statLineClone = document.getElementById("stat-line-template").content.cloneNode(true);
        const firstTd = statLineClone.querySelector("td:nth-child(1)");
        const valueInput = firstTd.querySelector("input");
        const statSelect = firstTd.querySelector("select");
        statSelect.innerHTML = "";
        statTypes.forEach(type => {
            const option = document.createElement("option");
            option.value = type;
            option.textContent = type;
            statSelect.appendChild(option);
        });
        valueInput.value = stat.value;
        statSelect.value = stat.stat;

        const conditionSelect = statLineClone.querySelector("td:nth-child(2) select");
        conditionSelect.value = stat.condition;

        const durationInput = statLineClone.querySelector("td:nth-child(3) input");
        durationInput.value = stat.duration;

        const maxStacksInput = statLineClone.querySelector("td:nth-child(4) input");
        maxStacksInput.value = stat.maxStacks;

        const expiryModeSelect = statLineClone.querySelector("td:nth-child(5) select");
        expiryModeSelect.value = stat.expiryMode;

        const refreshModeSelect = statLineClone.querySelector("td:nth-child(6) select");
        refreshModeSelect.value = stat.refreshMode;

        statsTbody.appendChild(statLineClone);
    });

    const form = modDialog.querySelector("form");
    form.addEventListener("submit", function(e) {
        e.preventDefault();
        const newName = modNameInput.value;
        const newStats = Array.from(statsTbody.children).map(tr => {
            const cells = tr.children;
            const value = cells[0].querySelector("input").value;
            const statType = cells[0].querySelector("select").value;
            const condition = cells[1].querySelector("select").value;
            const duration = cells[2].querySelector("input").value;
            const maxStacks = cells[3].querySelector("input").value;
            const expiryMode = cells[4].querySelector("select").value;
            const refreshMode = cells[5].querySelector("select").value;
            return { value, stat: statType, condition, duration, maxStacks, expiryMode, refreshMode };
        });
        updateCell(editingCell, newName, newStats);
        modDialog.close();
    }, { once: true });

    modDialog.showModal();
}

function addStatLine() {
    const stats_table = document.getElementById('stats-tbody');
    const stat_line_template = document.getElementById("stat-line-template").content.cloneNode(true);
    const firstColSelect = stat_line_template.querySelector("td:nth-child(1) select");
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

/*
//Initialize the 8 mod slots with your mods
const modNamesArr = [
    "Primed Rubedo-Lined Barrel",
    "Pressure Point",
    "Primed Pressure Point",
    "Berserker Fury",
    "Blood Rush",
    "Condition Overload",
    "Weeping Wounds",
    "Drifting Contact",
    "Primed Fury",
    "Fury",
    "Gladiator Might",
    "Gladiator Vice",
    "Organ Shatter",
    "Sacrificial Steel",
    "Sacrificial Pressure",
    "True Steel",
    "Shocking Touch",
    "Virulent Scourge",
    "Primed Reach",
    "Body Count",
    "Voltaic Strike",
    "Healing Return",
    "Amalgam Organ Shatter"
];
modNamesArr.forEach(name => {
    let cell = document.createElement("div");
    cell.className = "cell";
    updateCell(cell, name);
    mod_list.appendChild(cell);
});
*/

for (let i = 0; i < 20; i++) {
    let cell = document.createElement("div");
    let name = `Randomly generated mod ${i+1}`
    cell.className = "cell";
    updateCell(cell, name);
    mod_list.appendChild(cell);
}