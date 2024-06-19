var enemies = [];
var current_enemy_row = 0;

function addEnemy() {
    enemies.push({});

    const enemy_container = document.getElementById('enemy_container');
    const rowIndex = enemy_container.children.length;

    const enemyDetails = document.getElementById("templateEnemyRow").content.cloneNode(true);
    enemy_container.appendChild(enemyDetails);

    //force open the dialog to edit instantly (avoid bugs with empty enemy)
    editEnemy(rowIndex);
}

//TODO remove the ?.
document.getElementById("enemy_container")?.addEventListener('click', function(event) {
    if (event.target.className != 'pen-button') return;

    const row = event.target.closest('tr');
    const index = [...row.parentElement.children].indexOf(row);

    editEnemy(index);
});

function editEnemy(rowIndex) {
    current_enemy_row = rowIndex;
    const enemy = enemies[current_enemy_row];

    if (Object.keys(enemy).length !== 0) {
        // load saved fields in the dialog if enemy isnt empty
        document.getElementById("enemy_name_input").value = enemy.name;
        document.getElementById("health").value = enemy.health;
        document.getElementById("health_type").value = enemy.health_type;
        document.getElementById("armor").value = enemy.armor;
        document.getElementById("armor_type").value = enemy.armor_type;
        document.getElementById("shield").value = enemy.shield;
        document.getElementById("shield_type").value = enemy.shield_type;
        document.getElementById("level_base").value = enemy.level_base;
        document.getElementById("level_current").value = enemy.level_current;
        document.getElementById("faction").value = enemy.faction;
    }
    else {
        // reset all fields in the dialog if placeholder (reset from previous edited enemy)
        document.getElementById("editEnemy").reset()
    }

    document.getElementById("enemy_edit_dialog").showModal();
}

function loadEnemyStats() {
    const data_enemies = window.data_enemies;

    enemySelect = document.getElementById('enemy_name_input').value; // name
    document.getElementById('enemy_container').rows[current_enemy_row].cells[1].innerText = enemySelect;

    const enemy = data_enemies.find((e) => e.name == enemySelect);

    // read from the JSON
    document.getElementById("health").value = enemy.health;
    document.getElementById("health_type").value = enemy.resistances[2].type;
    document.getElementById("armor").value = enemy.armor;
    document.getElementById("armor_type").value = enemy.resistances[1].type;
    document.getElementById("shield").value = enemy.shield;
    document.getElementById("shield_type").value = enemy.resistances[0].type;
    // TODO document.getElementById("level_base").value = enemy.???;
    // TODO document.getElementById("level_current").value = enemy.???;
    document.getElementById("faction").value = enemy.type;
}

function saveEnemy() {
    enemies[current_enemy_row] = {
        "name": document.getElementById("enemy_name_input").value,
        "health": Number(document.getElementById("health").value),
        "health_type": document.getElementById("health_type").value,
        "armor": Number(document.getElementById("armor").value),
        "armor_type": document.getElementById("armor_type").value,
        "shield": Number(document.getElementById("shield").value),
        "shield_type": document.getElementById("shield_type").value,
        "level_base": Number(document.getElementById("level_base").value),
        "level_current": Number(document.getElementById("level_current").value),
        "faction": document.getElementById("faction").value,
    };
}

function deleteEnemy() {
    enemies.splice(current_enemy_row, 1);
    document.getElementById("enemy_container").deleteRow(current_enemy_row);
    document.getElementById("enemy_edit_dialog").close();
}

function convertEnemyToWASM(enemy) {
    // TODO stats from enemy level
    // enemy_modified = enemy;

    // switch (enemy_modified.health_resistance) {
    // case 'Tenno Flesh':
    //     console.log('Oranges are $0.59 a pound.');
    //     break;
    // case 'Mangoes':
    // case 'Papayas':
    //     console.log('Mangoes and papayas are $2.79 a pound.');
    //     // Expected output: "Mangoes and papayas are $2.79 a pound."
    //     break;
    // default:
    //     console.log(`Sorry, we are out of ${expr}.`);
    // }


    return enemy_modified;
}

function updateAverageTTK() {
    sum_TTK_mean = 0;
    sum_TTK_std = 0;
    const enemies = document.getElementById('enemy_container').rows;

    for (var i = 0, enemy; enemy = enemies[i]; i++) {
        sum_TTK_mean += Number(parseFloat(enemy.cells[2].innerText));
        sum_TTK_std += Number(parseFloat(enemy.cells[3].innerText));
    };

    document.getElementById("TTK_average_mean").innerText = sum_TTK_mean / enemies.length;
    document.getElementById("TTK_average_std").innerText = sum_TTK_std / enemies.length;
}



/**
 * GRAPH
 */

const labels = {
    slash: "slash DoT",
    heat: "heat DoT", electricity: "electricity DoT",
    toxin: "toxin DoT", gas: "gas DoT"
};

function CppToColumnar(dataraw) {
    //convert to JS array
    const data = new Array(dataraw.size()).fill(0).map((_, id) => dataraw.get(id))

    //transpose into a dictionnary with arrays on each key
    const header_cols = ["time", "damage", "slash", "heat", "electricity", "toxin", "gas"];
    const ret = {};
    for (let i = header_cols.length - 1; 0 <= i; i--) {
        ret[header_cols[i]] = data.map(row => row[i]);
    }
    return ret;
}

// weapon = {
//     "attack_speed": 0.917,
//     "wind_up": 0.7,
//     "critical_chance": 0.32,
//     "critical_damage": 2.4,
//     "status": 0.1,
//     "initial_combo": 0,
//     "combo_duration": 5,
//     "combo_efficiency": 0,
//     "riven_disposition": 0.85,
//     "heavy_multiplier": 0,
//     "max_combo": 12,
//     "damage_types": {
//         "impact": 20,
//         "puncture": 40,
//         "slash": 140,
//         "cold": 0,
//         "electricity": 0,
//         "heat": 0,
//         "toxin": 0,
//         "blast": 0,
//         "corrosive": 0,
//         "gas": 0,
//         "magnetic": 0,
//         "radiation": 0,
//         "viral": 0,
//         "void": 0,
//         "void_dmg": 0,
//         "lifted": 0,
//         "knockdown": 0,
//         "microwave": 0
//     },
//     "weapon_name": "Pennant",
//     "weapon_type": "Two-Handed Nikana"
// }

function changeStats() {
    // TODO why only first enemy?
    const data = CppToColumnar(Module.stats(weapon, enemies[0]));

    for (const key in data) {
        data[key] = data[key].map(datum => Number(datum));// || undefined);
    }

    const time = data.time;
    delete data.time;

    const chart = document.getElementById('plot');

    // creates an object for each column of the CSV
    const plotlyData = Object.entries(data).map(([name, data]) => ({
        y: data,
        x: time,
        type: 'histogram', //line //scatter //histogram
        //mode: 'lines',
        //mode: 'lines+markers',
        mode: 'markers',
        histfunc: 'sum', //count
        xbins: { size: 1.0 },
        //fill: 'none', //tonexty //tozerox
        //stackgroup: 'one',
        hovertemplate: '%{x:.3f}s - %{y:.3s}',
        // transforms: [{ //FIXME bug when filtering, plotly SUCKKKKS
        //     type: 'filter',
        //     target: 'y',
        //     operation: '>',
        //     value: 0
        // }],
        name: labels[name] ?? name, //if not found, use the header
        marker: { color: colors[name] },
        /*
        error_y: {
            type: 'data',
            array: data_error[name],
            visible: true
        },
        */
    }));

    const hist = {
        type: 'histogram',
    }

    const scatter = {
        type: 'scatter',
    }

    const updatemenus = [{
        buttons: [
            {
                args: [hist],
                label: 'histogram',
                method: 'update'
            },
            {
                args: [scatter],
                label: 'scatter',
                method: 'update'
            },
        ],
        direction: 'bottom',
        pad: { l: 10, t: 10, b: 10, r: 10 },
        showactive: true,
        type: 'buttons',
        x: 1.0,
        xanchor: 'left',
        y: 0.5,
        yanchor: 'top'
    }]

    const layout = {
        xaxis: {
            //type: 'log',
            autorange: true,
            // range: [0, 10],
            autorangeoptions:{
                minallowed: -1,
                // maxallowed: 50,
            }
        },
        yaxis: {
            // range: [0, 10],
            // type: 'log',
            autorange: true,
            autorangeoptions:{
                minallowed: -1,
            }
        },
        barmode: "stack",
        margin: {
            b: 20,
            l: 50,
            r: 0,
            t: 15,
        },
        modebar: {
            // orientation: "v",
        },
        legend: {
            x: 1.0,
            y: 0.95,
        },
        updatemenus: updatemenus,
    };

    Plotly.newPlot(chart, plotlyData, layout, {
        // displaylogo: false,
        displayModeBar: true,
        showEditInChartStudio: true,
        plotlyServerURL: "https://chart-studio.plotly.com",
    });
};

function formatPercent(num, maxDigits = 2) {
    return new Intl.NumberFormat("default", {
        style: 'percent',
        minimumFractionDigits: 0,
        maximumFractionDigits: maxDigits,
    }).format(num);
}

function formatPercentPoint(num, maxDigits) {
    return formatPercent(num, maxDigits).replace("%", "%ₚₜ");
}

function formatSecond(num, maxDigits = 3) {
    return new Intl.NumberFormat("default", {
        style: "unit",
        unit: "second",
        unitDisplay: "narrow",
        minimumFractionDigits: 0,
        maximumFractionDigits: maxDigits,
    }).format(num);
}

function formatPerSecond(num, maxDigits = 3) {
    return formatSecond(num, maxDigits).replace("s", "/s");
}

function formatMultiplier(num, maxDigits = 2) {
    return new Intl.NumberFormat("default", {
        style: "unit",
        unit: "meter",
        unitDisplay: "narrow",
        minimumFractionDigits: 0,
        maximumFractionDigits: maxDigits,
    }).format(num).replace("m", "×");
}

//fr-FR for ISO number format with SPACE as thousands separator and , as decimals
function formatDecimals(num, maxDigits = 2) {
    return new Intl.NumberFormat("default", {
        minimumFractionDigits: 1,
        maximumFractionDigits: maxDigits,
    }).format(num);
}

function formatLargeNumbers(num, maxDigits = 3) {
    return new Intl.NumberFormat("default", {
        // compactDisplay: "short",
        notation: "compact",
        minimumFractionDigits: 0,
        maximumFractionDigits: maxDigits,
    }).format(num);
}

function formatAdditive(num, maxDigits = 2) {
    return new Intl.NumberFormat("default", {
        style: "decimal",
        signDisplay: 'always',
        minimumFractionDigits: 1,
        maximumFractionDigits: maxDigits,
    }).format(num);
}


// TODO
// stance editing

function loadWeaponStats() {
    // retrieve all weapon's stats
    const data = window.data_weapons_melee;

    weaponSelected = document.getElementById("weapon_name_input").value;

    // retrieve enemy data
    const weaponTemp = data.find((e) => e.name == weaponSelected);

    // convert from the DB
    weapon = {
        "attack_speed": weaponTemp.fireRate || 0,
        "wind_up": weaponTemp.windUp || 0,
        "critical_chance": weaponTemp.criticalChance || 0,
        "critical_damage": weaponTemp.criticalMultiplier || 0,
        "status": weaponTemp.procChance || 0,
        "initial_combo": weaponTemp.whateveritscalled || 0, // TODO
        "combo_duration": weaponTemp.comboDuration || 0,
        "combo_efficiency": weaponTemp.whateveritscalled || 0, // TODO
        "riven_disposition": weaponTemp.omegaAttenuation || 0,

        "damage_types": weaponTemp.damage, // because keep names
        // "damage_types": {
        //     "impact": weaponTemp.impact || 0,
        //     "puncture": weaponTemp.puncture || 0,
        //     "slash": weaponTemp.slash || 0,

        //     "cold": weaponTemp.cold || 0,
        //     "electricity": weaponTemp.electricity || 0,
        //     "heat": weaponTemp.heat || 0,
        //     "toxin": weaponTemp.toxin || 0,

        //     "blast": weaponTemp.blast || 0,
        //     "corrosive": weaponTemp.corrosive || 0,
        //     "gas": weaponTemp.gas || 0,
        //     "magnetic": weaponTemp.magnetic || 0,
        //     "radiation": weaponTemp.radiation || 0,
        //     "viral": weaponTemp.viral || 0,
        //     "void": weaponTemp.void || 0,
        // }
    };

    displayWeaponStats(weapon, 1);

    // TODO save from the loaded weapon, not from the parse bruh
    saveWeapon();
}

function displayWeaponStats(weapon, column = 2) { // column 1 for base, 2 for modded stats
    document.getElementById("attack_speed").cells[column].innerText = formatDecimals(weapon.attack_speed, 3);
    document.getElementById("wind_up").cells[column].innerText = formatSecond(weapon.wind_up);
    document.getElementById("critical_chance").cells[column].innerText = formatPercent(weapon.critical_chance);
    document.getElementById("critical_damage").cells[column].innerText = formatMultiplier(weapon.critical_damage);
    document.getElementById("status").cells[column].innerText = formatPercent(weapon.status);
    document.getElementById("initial_combo").cells[column].innerText = formatAdditive(weapon.initial_combo);
    document.getElementById("combo_duration").cells[column].innerText = formatSecond(weapon.combo_duration);
    document.getElementById("combo_efficiency").cells[column].innerText = formatPercent(weapon.combo_efficiency);
    document.getElementById("riven_disposition_input").value = formatDecimals(weapon.riven_disposition, 3);
    document.getElementById("riven_disposition_meter").value = weapon.riven_disposition;

    document.getElementById("impact").cells[column].innerText = formatDecimals(weapon.damage_types.impact);
    document.getElementById("puncture").cells[column].innerText = formatDecimals(weapon.damage_types.puncture);
    document.getElementById("slash").cells[column].innerText = formatDecimals(weapon.damage_types.slash);

    document.getElementById("cold").cells[column].innerText = formatDecimals(weapon.damage_types.cold);
    document.getElementById("electricity").cells[column].innerText = formatDecimals(weapon.damage_types.electricity);
    document.getElementById("heat").cells[column].innerText = formatDecimals(weapon.damage_types.heat);
    document.getElementById("toxin").cells[column].innerText = formatDecimals(weapon.damage_types.toxin);

    document.getElementById("blast").cells[column].innerText = formatDecimals(weapon.damage_types.blast);
    document.getElementById("corrosive").cells[column].innerText = formatDecimals(weapon.damage_types.corrosive);
    document.getElementById("gas").cells[column].innerText = formatDecimals(weapon.damage_types.gas);
    document.getElementById("magnetic").cells[column].innerText = formatDecimals(weapon.damage_types.magnetic);
    document.getElementById("radiation").cells[column].innerText = formatDecimals(weapon.damage_types.radiation);
    document.getElementById("viral").cells[column].innerText = formatDecimals(weapon.damage_types.viral);
    document.getElementById("void").cells[column].innerText = formatDecimals(weapon.damage_types.void);

    statColoring("stats_damage");
    statColoring("stats");
}

var weapon;

function saveWeapon() {
    // TODO this thing
    // there is an issue between saving from weapon (except editable stats) and saving from edited fields (formated values)

    document.getElementById("riven_disposition_meter").value = document.getElementById("riven_disposition_input").value;

    weapon = {
        "attack_speed": document.getElementById("attack_speed").cells[1].innerText,
        "wind_up": document.getElementById("wind_up").cells[1].innerText,
        "critical_chance": document.getElementById("critical_chance").cells[1].innerText,
        "critical_damage": document.getElementById("critical_damage").cells[1].innerText,
        "status": document.getElementById("status").cells[1].innerText,
        "initial_combo": document.getElementById("initial_combo").cells[1].innerText,
        "combo_duration": document.getElementById("combo_duration").cells[1].innerText,
        "combo_efficiency": document.getElementById("combo_efficiency").cells[1].innerText,
        "riven_disposition": document.getElementById("riven_disposition_input").value,
        "heavy_multiplier": 0,
        "max_combo": 12,

        "damage_types": {
            "impact": document.getElementById("impact").cells[1].innerText,
            "puncture": document.getElementById("puncture").cells[1].innerText,
            "slash": document.getElementById("slash").cells[1].innerText,

            "cold": document.getElementById("cold").cells[1].innerText,
            "electricity": document.getElementById("electricity").cells[1].innerText,
            "heat": document.getElementById("heat").cells[1].innerText,
            "toxin": document.getElementById("toxin").cells[1].innerText,

            "blast": document.getElementById("blast").cells[1].innerText,
            "corrosive": document.getElementById("corrosive").cells[1].innerText,
            "gas": document.getElementById("gas").cells[1].innerText,
            "magnetic": document.getElementById("magnetic").cells[1].innerText,
            "radiation": document.getElementById("radiation").cells[1].innerText,
            "viral": document.getElementById("viral").cells[1].innerText,
            "void": document.getElementById("void").cells[1].innerText,
            //FIXME fucking conflict between c++ refusing "void" and the DB+color needing "void" so i just duplicate because fuck it
            "void_dmg": document.getElementById("void").cells[1].innerText,
            "lifted": 0,
            "knockdown": 0,
            "microwave": 0,
        }
    };

    // remove the % and shit
    for (const [key, value] of Object.entries(weapon)) {
        if (key != "damage_types") {
            weapon[key] = parseFloat(String(value).replace("%", "E-2")) || 0;
        }
        else {
            for (const [key2, value2] of Object.entries(value)) {
                weapon[key][key2] = parseFloat(value2);
            }
        }
    }

    //FIXME it gets broken by the parseFloat from the remove% because its text so it gets converted to 0
    weapon.weapon_name = document.getElementById("weapon_name_input").value;
    weapon.weapon_type = document.getElementById("weapon_subclass").value;

    // Force weapon from the DB instead of parsed from fields
    // loadWeaponStats()

    // TODO calculate and display updated modded stats
    displayWeaponStats(calculateModding(weapon), 2);
}

function calculateModding(weapon, mods = []) {
    // TODO
    // it also has to know if youre hitting Heavy attack or not

    let weaponModded = JSON.parse(JSON.stringify(weapon)); // to avoid reference issues
    for (const [key, value] of Object.entries(weaponModded)) {
        if (key == "damage_types") {
            for (const [key2, value2] of Object.entries(value)) {
                weaponModded[key][key2] *= 2;
            }
        } else if (key == "riven_disposition") {
            //dont multiply the riven dispo x2 lol
        }
        else {
            weaponModded[key] *= 2;
        }
    }
    return weaponModded;
}

function contentEditable(table) {
    for (const row of document.getElementById(table).rows) {
        const c = row.cells[1];
        if (c == null) {
            continue;
        }

        c.setAttribute("contenteditable", "true");

        c.addEventListener('input',
            function () { // no idea why you need that empty function but ok
                saveWeapon()
            }
        );
    }
}

function statColoring(table) {
    b = document.getElementById(table).rows;
    for (var i = 0; i < b.length; i++) {
        c = b[i].cells;
        if (c.length < 3) {
            continue;
        }

        const oldVal = parseFloat(c[1].innerText);
        const newVal = parseFloat(c[2].innerText);
        const isBuff = oldVal < newVal;
        const isNerf = oldVal > newVal;
        c[2].classList.toggle("mod_buff", isBuff);
        c[2].classList.toggle("mod_nerf", isNerf);
    }
}

contentEditable("stats_damage");
contentEditable("stats");

function hideEmptyRows(table) {
    displayRows("stats_damage", false);
    displayRows("stats", false);
}

function displayAllRows(table) {
    displayRows("stats_damage", true);
    displayRows("stats", true);
}

function displayRows(table, display) {
    // FIXME
    // issue is some important lines disappear (if combo disappear, then "duration" doesnt mean anything)
    // the size and position of everything is fucked up
    // graph disappears if impact disappears, etc

    var rows = document.getElementById(table).rows;
    for (var i = 0; i < rows.length - 1; i++) {
        var row = rows[i];
        var cells = row.cells;
        if (cells.length < 3) {
            continue;
        }

        if (display || parseFloat(cells[1].innerText) || parseFloat(cells[2].innerText)) {
            row.classList.add("row_show");
            row.classList.remove("row_hide");
        }
        else {
            row.classList.add("row_hide");
            row.classList.remove("row_show");
        }
    }
}

const colors = {
    "void": "rgb(8, 94, 80)",
    "viral": "rgb(183, 22, 88)",
    "radiation": "rgb(128, 96, 0)",
    "magnetic": "rgb(71, 71, 209)",
    "gas": "rgb(0, 102, 51)",
    "corrosive": "rgb(77, 102, 0)",
    "blast": "rgb(179, 42, 0)",
    "toxin": "rgb(0, 102, 17)",
    "heat": "rgb(153, 77, 0)",
    "electricity": "rgb(97, 15, 179)",
    "cold": "rgb(23, 101, 140)",
    "slash": "rgb(122, 82, 84)",
    "puncture": "rgb(92, 82, 71)",
    "impact": "rgb(61, 94, 94)",
}

function niceNumber(range) {
    const exponent = Math.floor(Math.log10(range));
    const fraction = range / Math.pow(10, exponent);

    let niceFraction;
    if (fraction <= 1.74) {
        niceFraction = 1;
    } else if (fraction <= 3.74) {
        niceFraction = 2.5;
    } else if (fraction <= 7.4) {
        niceFraction = 5;
    } else {
        niceFraction = 10;
    }
    return niceFraction * Math.pow(10, exponent);
}

function calculateTickCount(containerWidth) {
    const minTickSpacing = 50; // minimum space between ticks in pixels
    return Math.floor(containerWidth / minTickSpacing);
}

function getNiceTickValues(max, tickCount) {
    const niceTicks = [];
    const step = niceNumber(max / tickCount);
    const start = 0; // Math.floor(0 / step) * step;
    const end = Math.round(max / step) * step;

    for (let i = start; i <= end; i += step) {
        niceTicks.push(i);
    }
    return niceTicks;
}

function status_proportion_graph() {
    const damage_order = [
        "void",
        "viral",
        "radiation",
        "magnetic",
        "gas",
        "corrosive",
        "blast",
        "toxin",
        "heat",
        "electricity",
        "cold",
        "slash",
        "puncture",
        "impact",
    ];

    //TODO C++ call for the proc proportion
    const x = damage_order.map(k => weapon.damage_types[k]).reverse();
    const max = Math.max(...x);

    const orderedcolors = Object.keys(weapon.damage_types).map(k => colors[k]);

    const rows = document.getElementById("stats_damage").rows;
    for (let i = 0; i < rows.length; i++) {
        const div = rows[i].querySelector(".graph_bar");
        if (div != null) {
            div.style.width = 100 * x[i] / max + "%";
            div.style["background-color"] = orderedcolors[i];
            div.querySelector(".tooltiptext").innerText = x[i];
        }
    }

    // TICKS
    const axis = document.getElementById('axis');
    const containerWidth = axis.parentElement.offsetWidth;
    const tickCount = calculateTickCount(containerWidth);
    const niceTicks = getNiceTickValues(max, tickCount);

    axis.innerHTML = ''; // reset
    niceTicks.forEach(tickValue => {
        const tick = document.createElement('div');
        tick.className = 'tick';
        const tickLeft = (tickValue / max * containerWidth); // align tick perfectly
        tick.style.left = tickLeft + 'px';
        tick.setAttribute('data-value', formatLargeNumbers(tickValue));
        axis.appendChild(tick);
    });
};

// TODO on table resize instead
window.addEventListener('resize', status_proportion_graph);