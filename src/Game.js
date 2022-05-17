// Map generation code is located at the bottom of this file due to it's size

import { INVALID_MOVE } from 'boardgame.io/core'; // Handles invalid moves

var GAMEMAP = null; // Hopefully a global variable
var MAPSIZE = 6; // The size of the map (NxN)
var ROOMNUM = 6; // Number of rooms to generate. Note this is FULL rooms, not room tiles

var MOVESIZETEMP = 4; // Temporary variable for player movement

var SAFETILES = ['O', 'I', 'DN', 'DS', 'DW', 'DE']; // Stores the tiles a player can stand on

export const TestGame = {
	setup: () => ({
		_mapGenerated: false, // True once a map is generated
		_mapSize: MAPSIZE,
		_boardSize: MAPSIZE * 3, // 3x3 cells and all
		_roomNum: ROOMNUM,
		_safeTiles: SAFETILES, // So that frontend can access the same safe tiles that are assumed in backend
		cells: null, // Because JSON, all cells should only store their ID in here, not the cellData object (So [["a","b"], ["c","d"]])
		playerLocations: [], // Stores the location of players as [x,y] (These are drawn over the normal tiles)
		diceRoll: [MOVESIZETEMP, null, null], // Stores the dice roll for the current turn. In format of [total, d1, d2]
	}),
	turn: {
		minMoves: 1,
		maxMoves: 1,
	},
	moves: {
		rollDice: (G, ctx) => {
			// Rolls 2 dice and saves the result to G in format of [total, d1, d2]
			G.diceRoll[1] = Math.floor(Math.random() * 6) + 1; // Math.random() doesn't return 1, so this won't ever be 7 or anything dw
			G.diceRoll[2] = Math.floor(Math.random() * 6) + 1;
			G.diceRoll[0] = G.diceRoll[1] + G.diceRoll[2]; // Total
		},
		clickCell: (G, ctx, id) => {
			if (!G._mapGenerated) {
				return INVALID_MOVE; // Don't do anything if the map hasn't been generated yet
			}

			let idx = id % G._boardSize;
			let idy = Math.floor(id / G._boardSize);
			let targetCell = G.cells[idx][idy]; // Get the cell that was clicked

			let playerCanMove = false; // Begin checking if cell can be moved to
			for (let ii = 0; ii < SAFETILES.length; ii++) { // Check if clicked cell is a safe tile to move to
				if (targetCell == SAFETILES[ii]) {
					playerCanMove = true; // Player CAN move here 
					break;
				}
			}
			for (let ii = 0; ii < G.playerLocations.length; ii++) { // Check if a player is already on this cell
				if (idx == G.playerLocations[ii][0] && idy == G.playerLocations[ii][1]) {
					playerCanMove = false; // Nevermind because player CANNOT move here
					break;
				}
			}
			if (!playerCanMove) {
				return INVALID_MOVE; // Must be an empty tile
			}

			const player = ctx.currentPlayer;
			const playerLocation = G.playerLocations[player];
			const deltaX = idx - playerLocation[0];
			const deltaY = idy - playerLocation[1];

			if (Math.abs(deltaX) + Math.abs(deltaY) > G.diceRoll[0]) {
				return INVALID_MOVE; // Must be close enough
			}

			G.playerLocations[player] = [idx, idy]; // Save new player location

		},
	},
	phases: {
		Main: {
			// Called at the beginning of a phase.
			onBegin: (G, ctx) => { GenerateEverything(G, ctx) },

			// Make this phase the first phase of the game.
			start: true,
		},
	},
	endIf: (G, ctx) => {
		// OLD CODE
		// let winner = IsVictory(G.playerLocations, ctx.currentPlayer);
		// if (winner !== null) {
		// 	return { winner };
		// }
	},
};

// function IsVictory(playerLocations, currentPlayer) {
// 	// A player wins if it moves next to another player
// 	const playerDistance = Math.abs(playerLocations[0] - playerLocations[1]);
// 	if (playerDistance == 1 || playerDistance == 5) {
// 		return currentPlayer;
// 	}
// 	else {
// 		return null;
// 	}
// };

function GenerateEverything(G, ctx) {
	// Generates a new map, player locations and saves them to G

	let mapSize = G._mapSize;
	let boardSize = G._boardSize; // Mapsize * 3 by default
	let roomNum = G._roomNum;

	GAMEMAP = InitializeMap(mapSize, roomNum); // Generate a new map
	let Gmap = [];
	for (let ii = 0; ii < boardSize; ii += 3) { // Each tile is 3x3, so we need to split the map into 3x3 tiles
		Gmap[ii] = [];
		Gmap[ii + 1] = [];
		Gmap[ii + 2] = [];
		for (let jj = 0; jj < boardSize; jj += 3) {
			let iidiv3 = ii / 3;
			let jjdiv3 = jj / 3;
			Gmap[ii][jj] = GAMEMAP[iidiv3][jjdiv3].tile.walls[0][0];
			Gmap[ii][jj + 1] = GAMEMAP[iidiv3][jjdiv3].tile.walls[0][1];
			Gmap[ii][jj + 2] = GAMEMAP[iidiv3][jjdiv3].tile.walls[0][2];
			Gmap[ii + 1][jj] = GAMEMAP[iidiv3][jjdiv3].tile.walls[1][0];
			Gmap[ii + 1][jj + 1] = GAMEMAP[iidiv3][jjdiv3].tile.walls[1][1];
			Gmap[ii + 1][jj + 2] = GAMEMAP[iidiv3][jjdiv3].tile.walls[1][2];
			Gmap[ii + 2][jj] = GAMEMAP[iidiv3][jjdiv3].tile.walls[2][0];
			Gmap[ii + 2][jj + 1] = GAMEMAP[iidiv3][jjdiv3].tile.walls[2][1];
			Gmap[ii + 2][jj + 2] = GAMEMAP[iidiv3][jjdiv3].tile.walls[2][2];
		}
	}

	// Print id map to console
	for (let ii = 0; ii < mapSize; ii++) {
		var row = '';
		for (let jj = 0; jj < mapSize; jj++) {
			row += GAMEMAP[jj][ii].tile.id;
		}
		console.log(row);
	}

	// Place all players in empty spots on the map and save their positions as [x,y]
	let playerLocations = [];
	for (let ii = 0; ii < ctx.numPlayers; ii++) {
		let playerX = Math.floor(Math.random() * boardSize);
		let playerY = Math.floor(Math.random() * boardSize);
		while (Gmap[playerX][playerY] !== 'O') { // Ensure spot is an outside tile
			playerX = Math.floor(Math.random() * boardSize);
			playerY = Math.floor(Math.random() * boardSize);
		}
		playerLocations[ii] = [playerX, playerY];
	}

	G.playerLocations = playerLocations;
	G.cells = Gmap;
	G._mapGenerated = true; // Let's see if this works
}












// Generation code below

function InitializeMap(mapSize, roomNum) { // Creates an NxN board of cells, and gives them a copy of tileList each. Calls GenerateMap when finished
	// Generate a NxN board of cells, where each cell has a copy of the tileList
	// Call GenerateMap, passing in the created board
	// If it returns false, create a new board and call again
	// If it returns true, return the map

	while (true) { // Loop until map is generated, then return from inside loop
		let map = []; // The map to be generated (Will overwrite previous map, if it existed)
		for (let ii = 0; ii < mapSize; ii++) {
			map[ii] = [];
			for (let jj = 0; jj < mapSize; jj++) {
				map[ii][jj] = new CellData(ii, jj);
			}
		}
		let output = GenerateMap(map, mapSize, roomNum); // Output is a bool followed by the map. If map is invalid, output is {false,null}
		console.log("Generated map: " + output.success); // Debug
		if (output.success) { // Return the map if it is valid
			return output.map;
		}
	}
}

function GenerateMap(map, mapSize, roomNum) { // Checks if every cell has selected a tile. If a tile exists that has not yet selected a tile, pick one at random and choose an available tile for it at random, then update the tiles around it
	// Check if every cell has selected a tile
	// If a tile exists with no tile,
	// Pick a random tile from it's list (Prefer room tiles if roomsPlaced is less than roomNum, and vice versa)
	// Update the tiles around it (Check if a tile exists in each direction first, edge of map and all that)
	// If an update returns false, return false, null so InitializeMap can retry
	// Loop until all tiles have a selected tile, then return true, <The finished map>

	var roomsPlaced = 0; // Number of rooms placed

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

			// Decide what type of tile to place
			let tileList = tile.tileList;
			if (tileList.includes(outside) && roomsPlaced >= roomNum) { // If we have placed enough rooms, and this tile can be an outside tile, just pick outside
				tile.tile = outside;
				tile.tileList = [];
			}
			else {
				if ((tileList.includes(outside) && tileList.length > 1) && roomsPlaced < roomNum) { // If the tile has at least one non-outside tile in it's list, and we haven't placed enough rooms, remove outside from the list
					let index = tileList.indexOf(outside); // Could be safely assumed to be index 0, but just in case
					tileList.splice(index, 1); // 2nd parameter means remove one item only
					roomsPlaced++;
				} // If this if is false, it is likely the map will have too many rooms. This is fine though, we can always generate a new one as if we had an unfinishable map.

				// Select based on weights
				// Sum all weights in the tile's list
				let totalWeight = 0;
				for (let ii = 0; ii < tileList.length; ii++) {
					totalWeight += tileList[ii].weight;
				}
				// Pick a random number between 0 and the total weight
				let randomWeight = Math.floor(Math.random() * totalWeight);
				// Loop through the tile's list until the random number is less than the running total weight
				let runningTotalWeight = 0;
				for (let ii = 0; ii < tileList.length; ii++) {
					runningTotalWeight += tileList[ii].weight;
					if (runningTotalWeight >= randomWeight) {
						tile.tile = tileList[ii];
						tile.tileList = [];
						break;
					}
				}
			}

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
				}
				else { // Otherwise, loop through this tiles options and see if at least one tile is compatible. If not, remove this tile option
					remove = true; // Default to removing this tile, unless at least one tile is compatible
					for (let jj = 0; jj < aboveTile.tileList.length; jj++) {
						if (aboveTile.tileList[jj].sides[2] == myTileOption.sides[0]) { // If the tile is compatible, stop checking
							remove = false; // The tile is saved, yay
							break;
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
				}
				else { // Otherwise, loop through this tiles options and see if at least one tile is compatible. If not, remove this tile option
					remove = true; // Default to removing this tile, unless at least one tile is compatible
					for (let jj = 0; jj < belowTile.tileList.length; jj++) {
						if (belowTile.tileList[jj].sides[0] == myTileOption.sides[2]) { // If the tile is compatible, stop checking
							remove = false; // The tile is saved, yay
							break;
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
				}
				else { // Otherwise, loop through this tiles options and see if at least one tile is compatible. If not, remove this tile option
					remove = true; // Default to removing this tile, unless at least one tile is compatible
					for (let jj = 0; jj < leftTile.tileList.length; jj++) {
						if (leftTile.tileList[jj].sides[1] == myTileOption.sides[3]) { // If the tile is compatible, stop checking
							remove = false; // The tile is saved, yay
							break;
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
				}
				else { // Otherwise, loop through this tiles options and see if at least one tile is compatible. If not, remove this tile option
					remove = true; // Default to removing this tile, unless at least one tile is compatible
					for (let jj = 0; jj < rightTile.tileList.length; jj++) {
						if (rightTile.tileList[jj].sides[3] == myTileOption.sides[1]) { // If the tile is compatible, stop checking
							remove = false; // The tile is saved, yay
							break;
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
	this.tile = tile; // Will contain an id, sides for placement, a weight, and a 3x3 array of empty/wall/door etc
	this.tileList = [outside, roomLargeA1, roomLargeA2, roomLargeA3, roomLargeA4, roomMediumB1, roomMediumB2, roomMediumC1, roomMediumC2, roomSmallD1, roomSmallE1, roomSmallF1];
	this.x = x;
	this.y = y;
}

// A list of all the below objects, to be copied to each cell during generation. (Array order is top side first, then clockwise)


const outside = { // Generic tile
	id: ' ',
	sides: ["0", "0", "0", "0"],
	weight: 2000, // The generator (The random one) will prefer to place this tile if given the option, but it will not have the option if more rooms are required first
	walls: [['O', 'O', 'O'], ['O', 'O', 'O'], ['O', 'O', 'O']]
};

const roomLargeA1 = { // A large 2x2 room. Starting top left, then reading order.
	id: 'a',
	sides: ["0", "at", "al", "0"], // "at" as in a, top join. "al" as in a, left join etc.
	weight: 60,
	walls: [['CSE', 'DE', 'WE'], ['WS', 'I', 'I'], ['WS', 'I', 'I']]
};
const roomLargeA2 = {
	id: 'a',
	sides: ["0", "0", "ar", "at"],
	weight: 60,
	walls: [['WS', 'I', 'I'], ['DS', 'I', 'I'], ['CSW', 'WW', 'WW']]
};
const roomLargeA3 = {
	id: 'a',
	sides: ["al", "ab", "0", "0"],
	weight: 60,
	walls: [['WE', 'WE', 'CNE'], ['I', 'I', 'DN'], ['I', 'I', 'WN']]
};
const roomLargeA4 = {
	id: 'a',
	sides: ["ar", "0", "0", "ab"],
	weight: 60,
	walls: [['I', 'I', 'WN'], ['I', 'I', 'WN'], ['WW', 'DW', 'CNW']]
};

const roomMediumB1 = { // A medium 1x2 room. Same order
	id: 'b',
	sides: ["0", "0", "b", "0"],
	weight: 80,
	walls: [['CSE', 'WE', 'WE'], ['WS', 'I', 'I'], ['CSW', 'DW', 'WW']]
};
const roomMediumB2 = {
	id: 'b',
	sides: ["b", "0", "0", "0"],
	weight: 80,
	walls: [['WE', 'DE', 'CNE'], ['I', 'I', 'WN'], ['WW', 'WW', 'CNW']]
};

const roomMediumC1 = { // A medium 2x1 room.
	id: 'c',
	sides: ["0", "c", "0", "0"],
	weight: 80,
	walls: [['CSE', 'DE', 'CNE'], ['WS', 'I', 'WN'], ['WS', 'I', 'WN']]
};
const roomMediumC2 = {
	id: 'c',
	sides: ["0", "0", "0", "c"],
	weight: 80,
	walls: [['WS', 'I', 'WN'], ['DS', 'I', 'DN'], ['CSW', 'WW', 'CNW']]
};

const roomSmallD1 = { // A small 1x1 room. Small rooms differ only by door placement
	id: 'd',
	sides: ["0", "0", "0", "0"],
	weight: 100,
	walls: [['CSE', 'DE', 'CNE'], ['DS', 'I', 'WN'], ['CSW', 'WW', 'CNW']]
};

const roomSmallE1 = { // A small 1x1 room.
	id: 'e',
	sides: ["0", "0", "0", "0"],
	weight: 100,
	walls: [['CSE', 'WE', 'CNE'], ['WS', 'I', 'DN'], ['CSW', 'DW', 'CNW']]
};

const roomSmallF1 = { // A small 1x1 room.
	id: 'f',
	sides: ["0", "0", "0", "0"],
	weight: 100,
	walls: [['CSE', 'DE', 'CNE'], ['WS', 'I', 'WN'], ['CSW', 'DW', 'CNW']]
};

// Some constant lists for checking if a tile is in a certian category
const rooms = [roomLargeA1, roomLargeA2, roomLargeA3, roomLargeA4, roomMediumB1, roomMediumB2, roomMediumC1, roomMediumC2, roomSmallD1, roomSmallE1, roomSmallF1]; // A list of all tiles that are considered a room