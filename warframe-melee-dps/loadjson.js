const response = await fetch('./modified Enemies.json');
const data_enemies = await response.json();

export default data_enemies