var GAMEMAP = null; // Hopefully a global variable
var MAPSIZE = 10; // The size of the map (NxN)

export const TestGame = {
	setup: () => ({
		_mapSize: MAPSIZE,
		cells: null, // Because JSON, all cells should only store their ID in here, not the cellData object (So [["a","b"], ["c","d"]])
		playerLocations: Array(2).fill(0, 0, 1).fill(24, 1, 2), // !!! Add method for adding players to random outside locations
	}),
	turn: {
		minMoves: 1,
		maxMoves: 1,
	},
	moves: {
		clickCell: (G, ctx, id) => {

			// OLD CODE (Will not work with new map generation)
			// if (G.cells[Math.floor(id / 5)][id % 5].tile.id !== ' ') { return INVALID_MOVE; } // Must be empty
			// const player = ctx.currentPlayer;
			// const playerLocation = G.playerLocations[player];
			// const deltaX = id % 5 - playerLocation % 5;
			// const deltaY = Math.floor(id / 5) - Math.floor(playerLocation / 5);
			// if (deltaX != 0 && deltaY != 0) { return INVALID_MOVE; } // Must be in a straight line
			// G.cells[Math.floor(playerLocation / 5)][playerLocation % 5] = null;
			// G.cells[Math.floor(id / 5)][id % 5] = player;
			// G.playerLocations[player] = id;


			GAMEMAP = InitializeMap(MAPSIZE);
			let Gmap = [];
			for (let ii = 0; ii < MAPSIZE; ii++) {
				Gmap[ii] = [];
				for (let jj = 0; jj < MAPSIZE; jj++) {
					Gmap[ii][jj] = GAMEMAP[jj][ii].tile.id;
				}
			}
			G.cells = Gmap; // Damn fussy json serialiatible objects or whatever

			// good old code, keep longer
			for (let ii = 0; ii < MAPSIZE; ii++) {
				var row = '';
				for (let jj = 0; jj < MAPSIZE; jj++) {
					row += GAMEMAP[jj][ii].tile.id;
				}
				console.log(row);
			}

		},
	},
	endIf: (G, ctx) => {
		// OLD CODE
		// let winner = IsVictory(G.playerLocations, ctx.currentPlayer);
		// if (winner !== null) {
		// 	return { winner };
		// }
	},
	// EVEN MORE OLD CODE
	// ai: { // Very simple for now
	// 	enumerate: (G, ctx) => {
	// 		let moves = [];
	// 		const playerLocation = G.playerLocations[ctx.playOrderPos];

	// 		for (let ii = 0; ii < 25; ii++) {
	// 			if (G.cells[Math.floor(ii / 5)][ii % 5] === null) {
	// 				const deltaX = ii % 5 - playerLocation % 5;
	// 				const deltaY = Math.floor(ii / 5) - Math.floor(playerLocation / 5);
	// 				if (deltaX == 0 || deltaY == 0) {
	// 					moves.push({ move: 'clickCell', args: [ii] });
	// 				}
	// 			}
	// 		}
	// 		return moves;
	// 	},
	// },
};

function IsVictory(playerLocations, currentPlayer) {
	// A player wins if it moves next to another player
	const playerDistance = Math.abs(playerLocations[0] - playerLocations[1]);
	if (playerDistance == 1 || playerDistance == 5) {
		return currentPlayer;
	}
	else {
		return null;
	}
};

function GenerateGenericBoard() { // Initial board with no random generation (looks like '\') (This is temporary)
	return [
		[new CellData(0, 4, inside), new CellData(1, 4, outside), new CellData(2, 4, outside), new CellData(3, 4, outside), new CellData(4, 4, outside)],
		[new CellData(0, 3, outside), new CellData(1, 3, inside), new CellData(2, 3, outside), new CellData(3, 3, outside), new CellData(4, 3, outside)],
		[new CellData(0, 2, outside), new CellData(1, 2, outside), new CellData(2, 2, inside), new CellData(3, 2, outside), new CellData(4, 2, outside)],
		[new CellData(0, 1, outside), new CellData(1, 1, outside), new CellData(2, 1, outside), new CellData(3, 1, inside), new CellData(4, 1, outside)],
		[new CellData(0, 0, outside), new CellData(1, 0, outside), new CellData(2, 0, outside), new CellData(3, 0, outside), new CellData(4, 0, inside)],
	]
}

// Generation code below

function InitializeMap(mapSize) { // Creates an NxN board of cells, and gives them a copy of tileList each. Calls GenerateMap when finished
	// Generate a NxN board of cells, where each cell has a copy of the tileList
	// Call GenerateMap, passing in the created board
	// If it returns false, create a new board and call again
	// If it returns true, return the map

	while (true) { // Loop until map is generated, then return from inside loop
		// Debug
		console.log("Generating new map...");
		let map = []; // The map to be generated (Will overwrite previous map, if it existed)
		for (let ii = 0; ii < mapSize; ii++) {
			map[ii] = [];
			for (let jj = 0; jj < mapSize; jj++) {
				map[ii][jj] = new CellData(ii, jj);
			}
		}
		let output = GenerateMap(map, mapSize); // Output is a bool followed by the map. If map is invalid, output is {false,null}
		console.log("Generated map: " + output.success);
		if (output.success) { // Return the map if it is valid
			return output.map;
		}
	}
}

function GenerateMap(map, mapSize) { // Checks if every cell has selected a tile. If a tile exists that has not yet selected a tile, pick one at random and choose an available tile for it at random, then update the tiles around it
	// Check if every cell has selected a tile
	// If a tile exists with no tile,
	// Pick a random tile from it's list
	// Update the tiles around it (Check if a tile exists in each direction first, edge of map and all that)
	// If an update returns false, return false, null so InitializeMap can retry
	// Loop until all tiles have a selected tile, then return true, <The finished map>

	while (true) { // Loop until a valid map is generated. Will return from inside this loop
		let nullTiles = []; // A list of tiles that have no tile selected
		for (let ii = 0; ii < map.length; ii++) {
			for (let jj = 0; jj < map[ii].length; jj++) {
				if (map[ii][jj].tile == null) {
					nullTiles.push(map[ii][jj]);
				}
			}
		}
		if (nullTiles.length == 0) { return { success: true, map }; } // If there are no null tiles, we're done
		else { // If there are still null tiles, pick one at random and select a tile for it

			let tile = nullTiles[Math.floor(Math.random() * nullTiles.length)]; // Pick a random tile that has no tile selected

			// Select based on weights
			// Sum all weights in the tile's list
			let totalWeight = 0;
			for (let ii = 0; ii < tile.tileList.length; ii++) {
				totalWeight += tile.tileList[ii].weight;
			}
			// Pick a random number between 0 and the total weight
			let randomWeight = Math.floor(Math.random() * totalWeight);
			// Loop through the tile's list until the random number is less than the running total weight
			let runningTotalWeight = 0;
			for (let ii = 0; ii < tile.tileList.length; ii++) {
				runningTotalWeight += tile.tileList[ii].weight;
				if (runningTotalWeight >= randomWeight) {
					tile.tile = tile.tileList[ii];
					tile.tileList = [];
					break;
				}
			}

			// // If tileList contains inside or outside, prefer picking those (This is old code, here for reference/rollback if needed)
			// if (tile.tileList.includes(outside)) {
			// 	let chance = 0.7; // Chance to just pick outside
			// 	if (Math.random() < chance) {
			// 		tile.tile = outside;
			// 	}
			// 	else { // Otherwise, pick normally
			// 		let tileIndex = Math.floor(Math.random() * tile.tileList.length); // Pick a random tile from the list
			// 		tile.tile = tile.tileList[tileIndex]; // Select the tile
			// 	}
			// // }
			// else { // Otherwise, pick normally
			// 	let tileIndex = Math.floor(Math.random() * tile.tileList.length); // Pick a random tile from the list
			// 	tile.tile = tile.tileList[tileIndex]; // Select the tile
			// }
			// tile.tileList = []; // Remove all tiles from the tilelist (so it can't be selected again)

			// Debug
			console.log("SET tile at " + tile.x + "," + tile.y + ": " + tile.tile.id);

			// Update the tiles around it
			let success = true; // If false, the map is unsolvable (If map is unsolvalbe, InitializeMap will retry)
			if (tile.y != 0) { success = UpdateTile(map[tile.x][tile.y - 1], map, mapSize, 0); } // Update the tile above
			if (!success) { return { success: false, map: null }; }
			if (tile.y != mapSize - 1) { success = UpdateTile(map[tile.x][tile.y + 1], map, mapSize, 0); } // Update the tile below
			if (!success) { return { success: false, map: null }; }
			if (tile.x != 0) { success = UpdateTile(map[tile.x - 1][tile.y], map, mapSize, 0); } // Update the tile to the left
			if (!success) { return { success: false, map: null }; }
			if (tile.x != mapSize - 1) { success = UpdateTile(map[tile.x + 1][tile.y], map, mapSize, 0); } // Update the tile to the right
			if (!success) { return { success: false, map: null }; }
		}
	}
}
function UpdateTile(tile, map, mapSize, depth) {
	// If this tile has only one option, select it
	// If this tile has multiple options, check each direction and remove my tiles that don't fit
	// A tile option doesn't fit if the tile in that direction either has a tile which is incompatible, or the tile in that direction contains only options that are incompatible
	// A tile is incompatible with another tile if the sides do not match
	// If any change was made to this tile, either selecting a tile or removing options, update all tiles around it

	var newDepth = depth++; // Limit is 10
	if (depth > 10) { console.log("Depth Reached"); return true; } // If we've reached the limit, don't check this tile, but also don't throw an error

	var stateChanged = false; // True if tiles around this tile should be updated as a result of a change
	if (tile.tileList.length == 1) { // If this tile has only one option, select it
		tile.tile = tile.tileList[0];
		tile.tileList = [];
		stateChanged = true;

		// Debug
		console.log("Selected tile at " + tile.x + "," + tile.y + ": " + tile.tile.id);
	}
	else { // If this tile has multiple options, check each direction and remove my tiles that don't fit

		// This gets ugly, but it's basically the same code 4 times in a row, with different directions

		for (let ii = 0; ii < tile.tileList.length; ii++) { // For each possible tile option
			let myTileOption = tile.tileList[ii]; // Currently checking
			let remove = false; // True if this tile option should be removed

			if (tile.y != 0) { // Checking above tile
				let aboveTile = map[tile.x][tile.y - 1];
				if (aboveTile.tile != null) { // If the tile above has a tile, check if it's side matches this side
					if (aboveTile.tile.sides[2] != myTileOption.sides[0]) { // If the sides don't match, remove this tile option
						remove = true;
					}
					if (wallsLR.includes(aboveTile.tile) && wallsLR.includes(myTileOption)) { // If both tiles are LR walls, remove this tile option
						remove = true;
					} else {
						if (corners.includes(aboveTile.tile) && corners.includes(myTileOption)) { // If both tiles are corners, remove this tile option
							remove = true;
						}
					}
				}
				else { // Otherwise, loop through this tiles options and see if at least one tile is compatible. If not, remove this tile option
					remove = true; // Default to removing this tile, unless at least one tile is compatible
					for (let jj = 0; jj < aboveTile.tileList.length; jj++) {
						if (aboveTile.tileList[jj].sides[2] == myTileOption.sides[0]) { // If the tile is compatible, stop checking
							if (!(wallsLR.includes(aboveTile.tileList[jj]) && wallsLR.includes(myTileOption))) { // Must also pass the LR wall check
								if (!(corners.includes(aboveTile.tileList[jj]) && corners.includes(myTileOption))) { // Must also pass the corner check
									remove = false; // The tile is saved, yay
									break;
								}
							}
						}
					}
				}
			}
			if (remove) { // Remove this tile option if it should be removed, then continue to the next for loop item
				tile.tileList.splice(ii, 1);
				ii--;
				stateChanged = true;
				continue;
			}

			if (tile.y != mapSize - 1) { // Checking below tile
				let belowTile = map[tile.x][tile.y + 1];
				if (belowTile.tile != null) { // If the tile below has a tile, check if it's side matches this side
					if (belowTile.tile.sides[0] != myTileOption.sides[2]) { // If the sides don't match, remove this tile option
						remove = true;
					}
					if (wallsLR.includes(belowTile.tile) && wallsLR.includes(myTileOption)) { // If both tiles are LR walls, remove this tile option
						remove = true;
					} else {
						if (corners.includes(belowTile.tile) && corners.includes(myTileOption)) { // If both tiles are corners, remove this tile option
							remove = true;
						}
					}
				}
				else { // Otherwise, loop through this tiles options and see if at least one tile is compatible. If not, remove this tile option
					remove = true; // Default to removing this tile, unless at least one tile is compatible
					for (let jj = 0; jj < belowTile.tileList.length; jj++) {
						if (belowTile.tileList[jj].sides[0] == myTileOption.sides[2]) { // If the tile is compatible, stop checking
							if (!(wallsLR.includes(belowTile.tileList[jj]) && wallsLR.includes(myTileOption))) { // Must also pass the LR wall check
								if (!(corners.includes(belowTile.tileList[jj]) && corners.includes(myTileOption))) { // Must also pass the corner check
									remove = false; // The tile is saved, yay
									break;
								}
							}
						}
					}
				}
			}
			if (remove) { // Remove this tile option if it should be removed, then continue to the next for loop item
				tile.tileList.splice(ii, 1);
				ii--;
				stateChanged = true;
				continue;
			}

			if (tile.x != 0) { // Checking left tile
				let leftTile = map[tile.x - 1][tile.y];
				if (leftTile.tile != null) { // If the tile left has a tile, check if it's side matches this side
					if (leftTile.tile.sides[1] != myTileOption.sides[3]) { // If the sides don't match, remove this tile option
						remove = true;
					}
					if (wallsUD.includes(leftTile.tile) && wallsUD.includes(myTileOption)) { // If both tiles are UD walls, remove this tile option
						remove = true;
					} else {
						if (corners.includes(leftTile.tile) && corners.includes(myTileOption)) { // If both tiles are corners, remove this tile option
							remove = true;
						}
					}
				}
				else { // Otherwise, loop through this tiles options and see if at least one tile is compatible. If not, remove this tile option
					remove = true; // Default to removing this tile, unless at least one tile is compatible
					for (let jj = 0; jj < leftTile.tileList.length; jj++) {
						if (leftTile.tileList[jj].sides[1] == myTileOption.sides[3]) { // If the tile is compatible, stop checking
							if (!(wallsUD.includes(leftTile.tile) && wallsUD.includes(myTileOption))) { // Must also pass the UD wall check
								if (!(corners.includes(leftTile.tile) && corners.includes(myTileOption))) { // Must also pass the corner check
									remove = false; // The tile is saved, yay
									break;
								}
							}
						}
					}
				}
			}
			if (remove) { // Remove this tile option if it should be removed, then continue to the next for loop item
				tile.tileList.splice(ii, 1);
				ii--;
				stateChanged = true;
				continue;
			}

			if (tile.x != mapSize - 1) { // Checking right tile
				let rightTile = map[tile.x + 1][tile.y];
				if (rightTile.tile != null) { // If the tile right has a tile, check if it's side matches this side
					if (rightTile.tile.sides[3] != myTileOption.sides[1]) { // If the sides don't match, remove this tile option
						remove = true;
					}
					if (wallsUD.includes(rightTile.tile) && wallsUD.includes(myTileOption)) { // If both tiles are UD walls, remove this tile option
						remove = true;
					} else {
						if (corners.includes(rightTile.tile) && corners.includes(myTileOption)) { // If both tiles are corners, remove this tile option
							remove = true;
						}
					}
				}
				else { // Otherwise, loop through this tiles options and see if at least one tile is compatible. If not, remove this tile option
					remove = true; // Default to removing this tile, unless at least one tile is compatible
					for (let jj = 0; jj < rightTile.tileList.length; jj++) {
						if (rightTile.tileList[jj].sides[3] == myTileOption.sides[1]) { // If the tile is compatible, stop checking
							if (!(wallsUD.includes(rightTile.tile) && wallsUD.includes(myTileOption))) { // Must also pass the UD wall check
								if (!(corners.includes(rightTile.tile) && corners.includes(myTileOption))) { // Must also pass the corner check
									remove = false; // The tile is saved, yay
									break;
								}
							}
						}
					}
				}
			}
			if (remove) { // Remove this tile option if it should be removed, then continue to the next for loop item
				tile.tileList.splice(ii, 1);
				ii--;
				stateChanged = true;
				continue;
			}
		}
	}
	if (tile.tileList.length == 1) { // Check if the tile now has only one tile option, and select it if it does
		tile.tile = tile.tileList[0];
		tile.tileList = [];
		stateChanged = true; // This should already be true, but no harm in setting it again

		// Debug
		console.log("Selected tile at " + tile.x + "," + tile.y + ": " + tile.tile.id);
	}
	if (tile.tileList.length == 0 && tile.tile == null) { // If there are no tile options left, and the tile is not set, then the map is unsolvable
		return false; // Start again
	}
	if (stateChanged) { // If the state changed, check the surrounding tiles
		let success = true; // If false, the map is unsolvable
		if (tile.y != 0) { success = UpdateTile(map[tile.x][tile.y - 1], map, mapSize, newDepth); } // Update the tile above
		if (!success) { return false; }
		if (tile.y != mapSize - 1) { success = UpdateTile(map[tile.x][tile.y + 1], map, mapSize, newDepth); } // Update the tile below
		if (!success) { return false; }
		if (tile.x != 0) { success = UpdateTile(map[tile.x - 1][tile.y], map, mapSize, newDepth); } // Update the tile to the left
		if (!success) { return false; }
		if (tile.x != mapSize - 1) { success = UpdateTile(map[tile.x + 1][tile.y], map, mapSize, newDepth); } // Update the tile to the right
		if (!success) { return false; }
	}
	return true; // Successful update
}


// Map tiles below

function CellData(x, y, tile = null) { // Stores the possible tiles for a cell, the location of this cell, and a reference to the cells around itself (To be filled in later, not in constructor)
	this.tile = tile;
	this.tileList = [outside, inside, wallStraight0a, wallStraight1a, wallStraight0b, wallStraight1b, wallCorner0a, wallCorner1a, wallCorner2a, wallCorner3a, wallCorner0b, wallCorner1b, wallCorner2b, wallCorner3b, wallDoor0a, wallDoor1a, wallDoor0b, wallDoor1b];
	this.x = x;
	this.y = y;
}

// A list of all the below objects, to be copied to each cell during generation


const outside = { // Generic tile
	id: ' ',
	sides: Array(4).fill("0"),
	weight: 300,
};
const inside = { // Generic tile, will be assigned a building id after generation
	id: '█',
	sides: Array(4).fill("1"),
	weight: 150,
};


const wallStraight0a = { // Top to bottom, others are rotated clockwise. 'a' means inside is above or to the right, 'b' means inside is below or to the left
	id: '│',
	sides: Array(4).fill("2a", 0, 1).fill("1", 1, 2).fill("2a", 2, 3).fill("0", 3, 4),
	weight: 30,
};
const wallStraight1a = {
	id: '─',
	sides: Array(4).fill("1", 0, 1).fill("2a", 1, 2).fill("0", 2, 3).fill("2a", 3, 4),
	weight: 30,
};
const wallStraight0b = {
	id: '│',
	sides: Array(4).fill("2b", 0, 1).fill("0", 1, 2).fill("2b", 2, 3).fill("1", 3, 4),
	weight: 30,
};
const wallStraight1b = {
	id: '─',
	sides: Array(4).fill("0", 0, 1).fill("2b", 1, 2).fill("1", 2, 3).fill("2b", 3, 4),
	weight: 30,
};


const wallCorner0a = { // Top to right, all others are rotated clockwise. 'a' means corner is inside, 'b' means  corner is outside
	id: '└',
	sides: Array(4).fill("2a", 0, 1).fill("2a", 1, 2).fill("0", 2, 3).fill("0", 3, 4),
	weight: 60,
};
const wallCorner1a = {
	id: '┌',
	sides: Array(4).fill("0", 0, 1).fill("2a", 1, 2).fill("2a", 2, 3).fill("0", 3, 4),
	weight: 60,
};
const wallCorner2a = {
	id: '┐',
	sides: Array(4).fill("0", 0, 1).fill("0", 1, 2).fill("2a", 2, 3).fill("2a", 3, 4),
	weight: 60,
};
const wallCorner3a = {
	id: '┘',
	sides: Array(4).fill("2a", 0, 1).fill("0", 1, 2).fill("0", 2, 3).fill("2a", 3, 4),
	weight: 60,
};
const wallCorner0b = {
	id: '└',
	sides: Array(4).fill("2b", 0, 1).fill("2b", 1, 2).fill("1", 2, 3).fill("1", 3, 4),
	weight: 10,
};
const wallCorner1b = {
	id: '┌',
	sides: Array(4).fill("1", 0, 1).fill("2b", 1, 2).fill("2b", 2, 3).fill("1", 3, 4),
	weight: 10,
};
const wallCorner2b = {
	id: '┐',
	sides: Array(4).fill("1", 0, 1).fill("1", 1, 2).fill("2b", 2, 3).fill("2b", 3, 4),
	weight: 10,
};
const wallCorner3b = {
	id: '┘',
	sides: Array(4).fill("2b", 0, 1).fill("1", 1, 2).fill("1", 2, 3).fill("2b", 3, 4),
	weight: 10,
};


const wallDoor0a = { // Follows same rules as wallStraight but, yknow, it's also a door
	id: '╠',
	sides: Array(4).fill("2a", 0, 1).fill("1", 1, 2).fill("2a", 2, 3).fill("0", 3, 4),
	weight: 5,
};
const wallDoor1a = {
	id: '╩',
	sides: Array(4).fill("1", 0, 1).fill("2a", 1, 2).fill("0", 2, 3).fill("2a", 3, 4),
	weight: 5,
};
const wallDoor0b = {
	id: '╣',
	sides: Array(4).fill("2b", 0, 1).fill("0", 1, 2).fill("2b", 2, 3).fill("1", 3, 4),
	weight: 5,
};
const wallDoor1b = {
	id: '╦',
	sides: Array(4).fill("0", 0, 1).fill("2b", 1, 2).fill("1", 2, 3).fill("2b", 3, 4),
	weight: 5,
};

// Some constant lists for checking if a tile is in a certian category
const wallsLR = [wallStraight1a, wallStraight1b, wallDoor1a, wallDoor1b]; // Walls can not be parralel and next to each other
const wallsUD = [wallStraight0a, wallStraight0b, wallDoor0a, wallDoor0b];
const corners = [wallCorner0a, wallCorner1a, wallCorner2a, wallCorner3a, wallCorner0b, wallCorner1b, wallCorner2b, wallCorner3b]; // Corners can not be next to each other