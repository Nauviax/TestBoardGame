// Map generation code is located at the bottom of this file due to it's size

import { INVALID_MOVE } from 'boardgame.io/core'; // Handles invalid moves

var GAMEMAP = null; // Hopefully a global variable
var MAPSIZE = 6; // The size of the map (NxN)
var ROOMNUM = 6; // Number of rooms to generate. Note this is FULL rooms, not room tiles
var ITEMNUM = 6; // Number of items to generate
var CHARNUM = 6; // Number of characters to generate

var SAFETILES = ['O', 'DN', 'DS', 'DW', 'DE']; // Stores the tiles a player can stand on

// The following names are all placeholders. Don't take them too seriously
var CHARACTERS = [ // Stores the possible character names for the game
	"John", "Jhon", "Jack", "James", "Jeremy", "Jerald", "Jerome", "Jeorge", "Jessica", "Jone", "Jeremiah", "Jannet", "Josh", "Joseph", "Julian", "Jayden", "Jon", "Joey", "Jax", "Micheal the Destroyer of Worlds", "Jake"
];
var ROOMS = [ // Stores the possible room names for the game
	"Kitchen", "Kitchenette", "Kitchen-Diner", "Gallery", "Cookhouse", "Bakehouse", "Scullery", "Cookery", "Canteen", "Bakery", "Pantry", "Caboose", "Eat-in", "Mess", "Cooking Area"
];
var ITEMS = [ // Stores the possible item names for the game
	"Stick", "Stone", "Big Stick", "Two Stones", "Two Birds", "One Big Bird", "One Big Stone", "Two Big Sticks", "A Stick and Two Stones", "The Neighbours Outdoor Table", "The Neighbours Front Door", "My Front Door", "My Front Door and Two Big Sticks", "A Rock shaped like a Kiwi", "A Kiwi", "An Evil Kiwi"
];

export const KiwiKluedo = {
	setup: () => ({ // Anything starting with an underscore will NOT change
		_mapGenerated: false, // True once a map is generated
		_mapSize: MAPSIZE,
		_boardSize: MAPSIZE * 3, // 3x3 cells and all
		_charNum: CHARNUM, // The number of characters in the game (NOT PLAYERS)
		_roomNum: ROOMNUM, // Number of rooms to generate
		_itemNum: ITEMNUM, // The number of items in the game
		_safeTiles: SAFETILES, // So that frontend can access the same safe tiles that are assumed in backend
		_roomList: null, // List of rooms, form is [roomID, tileID, [tileList], [doorList]], where any coordinate in tile/door list is relative to G.cells
		_roomMap: null, // Simple minimap representation of the rooms
		cells: null, // Because JSON, all cells should only store their ID in here, not the cellData object (So [["a","b"], ["c","d"]])
		playerLocations: [], // Stores the location of players as [x,y,inRoom,roomID] (These are drawn over the normal tiles) (These values are always "last seen," read inRoom to see which is up to date; roomID or (x,y))
		diceRoll: [0, null, null, false], // Stores the dice roll for the current turn. In format of [total, d1, d2, hasRolled]
		_startingInventories: [], // Stores the starting inventories of players, in format of [[[characters],[rooms],[items]], [...], etc] (Each index is a player)
		_answer: null, // Stores the final solution of the game. Same format: [[characters], [rooms], [items]]
		_cardsInPlay: [], // Stores a list of every card currently in this game. Same format: [[characters], [rooms], [items]] (THIS INCLUDES ROOM NAMES, the length should be equal to _roomNum, and can be treated as in order)
		winner: null, // Stores the winner of the game. Uses player index/id
		losers: [], // Stores the losers of the game. List of true/false values, false if the player is still playing, true if they accused wrongly and are out.
		querryOutput: [null, null, null], // Stores the output of the querry move, in format of [player, type(1,2,3), value] where type 1 reffers to character, type 2 reffers to room, and type 3 reffers to item
	}),
	name: 'KiwiKluedo',
	turn: {
		onBegin: (G, ctx) => (BeginTurn(G, ctx)), // Runs before each turn. Currently resets dice roll
		endIf: (G, ctx) => { return G.losers[ctx.currentPlayer] }, // End the turn immediatly if this player is/becomes out\
	},
	moves: {
		rollDice: {
			noLimit: true,
			move: (G, ctx) => {
				// Rolls 2 dice and saves the result to G in format of [total, d1, d2]
				if (G.diceRoll[3]) { // If has already rolled
					return INVALID_MOVE; // No, bad player, bad
				}
				G.diceRoll[1] = Math.floor(Math.random() * 6) + 1; // Math.random() doesn't return 1, so this won't ever be 7 or anything dw
				G.diceRoll[2] = Math.floor(Math.random() * 6) + 1;
				G.diceRoll[0] = G.diceRoll[1] + G.diceRoll[2]; // Total
				G.diceRoll[3] = true; // Has rolled
			},
		},
		clickCell: {
			noLimit: true,
			move: (G, ctx, id) => {
				if (!G._mapGenerated) {
					return INVALID_MOVE; // Don't do anything if the map hasn't been generated yet
				}

				let idx = id % G._boardSize;
				let idy = Math.floor(id / G._boardSize);
				let targetCell = G.cells[idx][idy]; // Get the cell that was clicked

				const player = ctx.currentPlayer;
				const playerLocation = G.playerLocations[player];

				// Check if player is in a room
				if (playerLocation[2]) { // Player is trying to leave a room
					let doors = G._roomList[playerLocation[3]][3]; // Get the doors of the room
					for (let ii = 0; ii < doors.length; ii++) { // Loop through the doors
						if (doors[ii][0] == idx && doors[ii][1] == idy) { // If the door is clicked
							G.playerLocations[player] = [idx, idy, false, null]; // Update player location
							return;
						}
					}
					return INVALID_MOVE; // If the player is trying to leave a room, but didn't click a door, return invalid move
				} else { // Player is moving around the map
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

					const deltaX = idx - playerLocation[0];
					const deltaY = idy - playerLocation[1];

					if (Math.abs(deltaX) + Math.abs(deltaY) > G.diceRoll[0]) {
						return INVALID_MOVE; // Must be close enough
					}

					// At this point, player is assumed to be able to move to this cell

					if (targetCell == 'DN' || targetCell == 'DS' || targetCell == 'DW' || targetCell == 'DE') { // If the cell is a door
						for (let ii = 0; ii < G._roomList.length; ii++) { // Loop through the rooms
							let doors = G._roomList[ii][3]; // Get the doors of the room
							for (let jj = 0; jj < doors.length; jj++) { // Loop through the doors
								if (doors[jj][0] == idx && doors[jj][1] == idy) { // If the door is clicked
									G.playerLocations[player] = [null, null, true, G._roomList[ii][0]]; // Update player location to new room
									G.diceRoll[0] -= Math.abs(deltaX) + Math.abs(deltaY); // Update dice roll
									return; // We're done
								}
							}
						}
					} else { // If player clicked a normal tile (Again we checked if it was safe earlier)
						G.playerLocations[player] = [idx, idy, false, null]; // Save new player location
						G.diceRoll[0] -= Math.abs(deltaX) + Math.abs(deltaY); // Update dice roll
					}
				}

			},
		},
		askPlayersQuestion: { // Querry output should be read from state after making this move, and shown to the player visually. No backend code is implemented to show the player anything.
			move: (G, ctx, character, room, item) => {
				if (!G.playerLocations[ctx.currentPlayer][2]) { // If player is not even in a room
					console.log('Player is not in a room');
					return INVALID_MOVE; // Bad player, bad
				}
				let curRoom = G.playerLocations[ctx.currentPlayer][3]; // Get the current room index
				let curRoomName = G._cardsInPlay[1][curRoom]; // Get the current room name
				if (curRoomName == room) { // If the player is in the querried room,
					let curIndex = (parseInt(ctx.currentPlayer) + 1) % ctx.numPlayers;
					console.log("Checking player: " + curIndex);
					while (curIndex != ctx.currentPlayer) {
						let output = QuerryPlayerInv(G, curIndex, character, room, item);
						if (output[0] != 0) { // If the player has one of the querried items
							G.querryOutput = [curIndex, output[0], output[1]]; // Save the output of the querry
							return;
						}
						curIndex = (curIndex + 1) % ctx.numPlayers; // Loop around
					}
					console.log("Items not found"); // No players had these items. Player should make an accusation, assuming they didn't querry one of their own items
					G.querryOutput = [null, 0, null];
					return;
				}
				else {
					console.log("Player is not in the querried room. Room name: " + curRoomName + " Querried room: " + room);
					return INVALID_MOVE; // If the player is not in the room, they can't speak the question
				}
			}
		},
		allOrNothing: { // You can check if a player is out of the game via state, G.losers. Same goes for the winner, which is a single value with the player index in it.
			noLimit: true, // But they will be out of the game if it's wrong, and the game is over if it's right
			move: (G, ctx, character, room, item) => {
				// Player does NOT need to be in the room. If the accusation is correct, set winner. Otherwise set loser.
				if (character == G._answer[0] && room == G._answer[1] && item == G._answer[2]) {
					G.winner = ctx.currentPlayer; // "endIf" will trigger next, and run the end game function
					console.log('Player wins!');
				} else {
					G.losers[ctx.currentPlayer] = true; // Big sad, player is now out of the game. Other players only know that the guess is wrong, not which parts.
					console.log('Player Loses!');
				}
			}
		}
	},
	phases: {
		Main: {
			// Called at the beginning of a phase.
			onBegin: (G, ctx) => { GenerateEverything(G, ctx) },

			// Make this phase the first phase of the game.
			start: true,
		},
	},
	endIf: (G, ctx) => { // End the game if a player has won !!! THIS ISN'T TRIGGERING YET !!!
		let winner = G._winner;
		if (winner != null && winner != undefined) {
			console.log("Game Over! Winner is player " + winner);
			return { winner };
		}
	},
};

function DealInventories(G, ctx) { // Deals the inventories of each player, and sets the game answer
	let charNames = CHARACTERS.slice(); // Copy the character names
	let roomNames = ROOMS.slice();
	let itemNames = ITEMS.slice();
	let answer = [];
	// Ensure there are enough characters, items and room names for the game
	while (charNames.length < G._charNum) {
		charNamesCopy = charNames.slice();
		for (let ii = 0; ii < charNamesCopy.length; ii++) { // Append to each new name so that each name is unique
			charNamesCopy[ii] += ' (copy)';
		}
		charNames = charNames.concat(charNames); // Length is now doubled
	}
	while (itemNames.length < G._itemNum) {
		itemNamesCopy = itemNames.slice();
		for (let ii = 0; ii < itemNamesCopy.length; ii++) { // Append to each new name so that each name is unique
			itemNamesCopy[ii] += ' (copy)';
		}
		itemNames = itemNames.concat(itemNames); // Length is now doubled
	}
	while (roomNames.length < G._roomNum) {
		roomNamesCopy = roomNames.slice();
		for (let ii = 0; ii < roomNamesCopy.length; ii++) { // Append to each new name so that each name is unique
			roomNamesCopy[ii] += ' (copy)';
		}
		roomNames = roomNames.concat(roomNames); // Length is now doubled
	}
	// Shuffle the cards
	charNames = Shuffle(charNames);
	roomNames = Shuffle(roomNames);
	itemNames = Shuffle(itemNames);
	// Remove values until there are the correct number of characters, items and rooms
	while (charNames.length > G._charNum) {
		charNames.shift();
	}
	while (itemNames.length > G._itemNum) {
		itemNames.shift();
	}
	while (roomNames.length > G._roomNum) {
		roomNames.shift();
	}
	// These cards will all be used in the game. Save copies of them to the game state.
	G._cardsInPlay = [charNames.slice(), roomNames.slice(), itemNames.slice()];
	// Get a random character, add it to answer and remove it from charNames. Repeat for room and item
	answer.push(charNames.shift());
	answer.push(roomNames.shift());
	answer.push(itemNames.shift());
	G._answer = answer;
	// Create an empty hand in G._startingInventories for each player
	for (let ii = 0; ii < ctx.numPlayers; ii++) {
		G._startingInventories[ii] = [[], [], []];
	}
	// Deal inventories from remaining characters, rooms, and items
	let playersNum = ctx.numPlayers;
	let playerIndex = Math.floor(Math.random() * playersNum); // Random starting index
	while (charNames.length > 0) { // Deal cards to players
		G._startingInventories[playerIndex][0].push(charNames.shift());
		playerIndex = (playerIndex + 1) % playersNum; // Next player is first player if at last player
	}
	while (roomNames.length > 0) {
		G._startingInventories[playerIndex][1].push(roomNames.shift());
		playerIndex = (playerIndex + 1) % playersNum;
	}
	while (itemNames.length > 0) {
		G._startingInventories[playerIndex][2].push(itemNames.shift());
		playerIndex = (playerIndex + 1) % playersNum; // I love how clean this line is. I had an 'if' last time
	}
	// Cards have been dealt
}

function Shuffle(array) { // Shuffles an array, used for dealing cards
	let currentIndex = array.length;
	let temporaryValue;
	let randomIndex;
	// While there remain elements to shuffle,
	while (0 !== currentIndex) {
		// Pick a remaining element,
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;
		// And swap it with the current element. (You can do this using xor and not use a temporary variable. It isn't happening here, but it's still cool)
		temporaryValue = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temporaryValue;
	}
	return array;
}

function BeginTurn(G, ctx) { // Runs at the start of each turn
	G.diceRoll = [0, null, null, false]; // Reset dice roll
	if (G.losers[ctx.currentPlayer]) { // If this player is "out",
		ctx.events.endTurn(); // End the turn
	}
}

function QuerryPlayerInv(G, player, character, room, item) { // Returns 1,2 or 3 along with the value if the player has one of the querried values, and 0 along with null if they don't
	let playerInv = G._startingInventories[player]; // Get this players inventory
	let playerInvCharacter = playerInv[0]; // Get this players characters
	if (playerInvCharacter.includes(character)) { // Is it correct?
		console.log('player: ' + player + ', playerInvCharacter: ' + character);
		return [1, playerInvCharacter]; // Return
	}
	let playerInvRoom = playerInv[1]; // Otherwise check rooms etc
	if (playerInvRoom.includes(room)) {
		console.log('player: ' + player + ', playerInvRoom: ' + room);
		return [2, playerInvRoom];
	}
	let playerInvItem = playerInv[2];
	if (playerInvItem.includes(item)) {
		console.log('player: ' + player + ', playerInvItem: ' + item);
		return [3, playerInvItem];
	}
	console.log('player: ' + player + ' had nothing');
	return [0, null]; // Item not found on player
}

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

	// Generate a list of rooms, and save their index in the list to each room tile in GAMEMAP
	let roomList = [];
	let curIndex = 0; // Keeps track of room IDs
	for (let ii = 0; ii < mapSize; ii++) { // YES mapSize, not boardSize
		for (let jj = 0; jj < mapSize; jj++) {
			if (GAMEMAP[ii][jj].tile.id != ' ') { // If this tile is not empty
				if (GAMEMAP[ii][jj].roomID == null) { // If this room does not yet have a roomID
					roomList[curIndex] = [curIndex, null, [], []]; // Create a new room entry. Again, form is [roomID, tileID, [tileList], [doorList]], where any coordinate is relative to G.cells
					roomList = SetRoom(roomList, curIndex, GAMEMAP, ii, jj); // Sets the current tile to be this room, and all similar adjacent tiles to this room
					curIndex++; // Increment room ID
				}
			}
		}
	}

	// Save a minimap representation
	let minimapString = "";
	for (let ii = 0; ii < mapSize; ii++) {
		var row = '';
		for (let jj = 0; jj < mapSize; jj++) {
			row += GAMEMAP[jj][ii].roomID == null ? '.' : GAMEMAP[jj][ii].roomID;
		}
		minimapString += row + '<br>';
	}
	G._roomMap = minimapString;

	// Place all players in empty spots on the map and save their positions as [x,y] (Plus empty room data)
	let playerLocations = [];
	for (let ii = 0; ii < ctx.numPlayers; ii++) {
		let playerX = Math.floor(Math.random() * boardSize);
		let playerY = Math.floor(Math.random() * boardSize);
		if (playerLocations.length > 0) { // If there are already players on the map
			for (let jj = 0; jj < playerLocations.length; jj++) { // Don't place player on top of another player
				while (Gmap[playerX][playerY] !== 'O' && !(playerLocations[jj][0] == playerX && playerLocations[jj][1] == playerY)) { // Ensure spot is an outside tile and not on another player
					playerX = Math.floor(Math.random() * boardSize);
					playerY = Math.floor(Math.random() * boardSize);
				}
			}
		} else { // Don't check for players
			while (Gmap[playerX][playerY] !== 'O') { // Ensure spot is an outside tile
				playerX = Math.floor(Math.random() * boardSize);
				playerY = Math.floor(Math.random() * boardSize);
			}
		}
		playerLocations[ii] = [playerX, playerY, false, -1]; // Save player location, with -1 room ID
	}

	// Quickly prepare the losers list, all set to false
	G.losers = [];
	for (let ii = 0; ii < ctx.numPlayers; ii++) {
		G.losers[ii] = false;
	}

	G.playerLocations = playerLocations;
	G._roomList = roomList; // For use when looking for room data (Groups of room tiles)
	G.cells = Gmap;
	G._mapGenerated = true;

	// Generate items for the game
	DealInventories(G, ctx);
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
	else { // If this tile has multiple options, check each direction and remove my tiles that don't fit (New rules for '0' and '0r' which makes this whole thing longer)

		// This gets ugly, but it's basically the same code 4 times in a row, with different directions

		for (let ii = 0; ii < tile.tileList.length; ii++) { // For each possible tile option
			let myTileOption = tile.tileList[ii]; // Currently checking
			let remove = false; // True if this tile option should be removed

			if (tile.y != 0) { // Checking above tile
				let aboveTile = map[tile.x][tile.y - 1];
				if (aboveTile.tile != null) { // If the tile above has a tile, check if it's side matches this side
					if (aboveTile.tile.sides[2] != myTileOption.sides[0]) { // If the sides don't match, remove this tile option
						if (aboveTile.tile.sides[2] + 'r' == myTileOption.sides[0] || aboveTile.tile.sides[2] == myTileOption.sides[0] + 'r') { // Unless they are '0' and '0r'
							remove = false; // Basically do nothing, this pair matches
						} else {
							remove = true; // Remove this tile option
						}
					}
					else { // If they do match, check they aren't '0r'
						if (myTileOption.sides[0] == "0r") { // If this tile is a room, and the tile above is a room, they don't match
							remove = true; // Bad pair, remove this tile option
						}
					}
				}
				else { // Otherwise, loop through this tiles options and see if at least one tile is compatible. If not, remove this tile option
					remove = true; // Default to removing this tile, unless at least one tile is compatible
					for (let jj = 0; jj < aboveTile.tileList.length; jj++) {
						if (aboveTile.tileList[jj].sides[2] == myTileOption.sides[0]) { // If the tile is compatible, stop checking
							if (myTileOption.sides[0] == "0r") { // If this tile is a room, and the tile above is a room, they don't match
								continue; // Leave remove as true (This pair don't match)
							}
							remove = false; // The tile is saved, yay
							break;
						}
						if (aboveTile.tileList[jj].sides[2] + 'r' == myTileOption.sides[0] || aboveTile.tileList[jj].sides[2] == myTileOption.sides[0] + 'r') { // Outside tiles are handled differently now. '0' and '0r' are compatible
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
						if (belowTile.tile.sides[0] + 'r' == myTileOption.sides[2] || belowTile.tile.sides[0] == myTileOption.sides[2] + 'r') { // Unless they are '0' and '0r'
							remove = false; // Basically do nothing, this pair matches
						} else {
							remove = true; // Remove this tile option
						}
					} else { // If they do match, check they aren't '0r'
						if (myTileOption.sides[2] == "0r") { // If this tile is a room, and the tile below is a room, they don't match
							remove = true; // Bad pair, remove this tile option
						}
					}
				}
				else { // Otherwise, loop through this tiles options and see if at least one tile is compatible. If not, remove this tile option
					remove = true; // Default to removing this tile, unless at least one tile is compatible
					for (let jj = 0; jj < belowTile.tileList.length; jj++) {
						if (belowTile.tileList[jj].sides[0] == myTileOption.sides[2]) { // If the tile is compatible, stop checking
							if (myTileOption.sides[2] == "0r") { // If this tile is a room, and the tile below is a room, they don't match
								continue; // Leave remove as true (This pair don't match)
							}
							remove = false; // The tile is saved, yay
							break;
						}
						if (belowTile.tileList[jj].sides[0] + 'r' == myTileOption.sides[2] || belowTile.tileList[jj].sides[0] == myTileOption.sides[2] + 'r') { // Outside tiles are handled differently now. '0' and '0r' are compatible
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
						if (leftTile.tile.sides[1] + 'r' == myTileOption.sides[3] || leftTile.tile.sides[1] == myTileOption.sides[3] + 'r') { // Unless they are '0' and '0r'
							remove = false; // Basically do nothing, this pair matches
						} else {
							remove = true; // Remove this tile option
						}
					} else { // If they do match, check they aren't '0r'
						if (myTileOption.sides[3] == "0r") { // If this tile is a room, and the tile left is a room, they don't match
							remove = true; // Bad pair, remove this tile option
						}
					}
				}
				else { // Otherwise, loop through this tiles options and see if at least one tile is compatible. If not, remove this tile option
					remove = true; // Default to removing this tile, unless at least one tile is compatible
					for (let jj = 0; jj < leftTile.tileList.length; jj++) {
						if (leftTile.tileList[jj].sides[1] == myTileOption.sides[3]) { // If the tile is compatible, stop checking
							if (myTileOption.sides[3] == "0r") { // If this tile is a room, and the tile left is a room, they don't match
								continue; // Leave remove as true (This pair don't match)
							}
							remove = false; // The tile is saved, yay
							break;
						}
						if (leftTile.tileList[jj].sides[1] + 'r' == myTileOption.sides[3] || leftTile.tileList[jj].sides[1] == myTileOption.sides[3] + 'r') { // Outside tiles are handled differently now. '0' and '0r' are compatible
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
						if (rightTile.tile.sides[3] + 'r' == myTileOption.sides[1] || rightTile.tile.sides[3] == myTileOption.sides[1] + 'r') { // Unless they are '0' and '0r'
							remove = false; // Basically do nothing, this pair matches
						} else {
							remove = true; // Remove this tile option
						}
					} else { // If they do match, check they aren't '0r'
						if (myTileOption.sides[1] == "0r") { // If this tile is a room, and the tile right is a room, they don't match
							remove = true; // Bad pair, remove this tile option
						}
					}
				}
				else { // Otherwise, loop through this tiles options and see if at least one tile is compatible. If not, remove this tile option
					remove = true; // Default to removing this tile, unless at least one tile is compatible
					for (let jj = 0; jj < rightTile.tileList.length; jj++) {
						if (rightTile.tileList[jj].sides[3] == myTileOption.sides[1]) { // If the tile is compatible, stop checking
							if (myTileOption.sides[1] == "0r") { // If this tile is a room, and the tile right is a room, they don't match
								continue; // Leave remove as true (This pair don't match)
							}
							remove = false; // The tile is saved, yay
							break;
						}
						if (rightTile.tileList[jj].sides[3] + 'r' == myTileOption.sides[1] || rightTile.tileList[jj].sides[3] == myTileOption.sides[1] + 'r') { // Outside tiles are handled differently now. '0' and '0r' are compatible
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

function SetRoom(RoomList, curIndex, GAMEMAP, xx, yy) { // Sets the current room to the given RoomData ID, adds the room to RoomData, then recursively checks for ajacent rooms that are likely the same room
	// Form is[roomID, tileID, [tileList], [doorList]], where any coordinate is relative to G.cells
	RoomList[curIndex][2].push([xx * 3, yy * 3]); // Add the current tile coords to the room (Coords are top left of tile, in G.cells space)
	if (RoomList[curIndex][1] == null) { // If the room still needs a tileID
		RoomList[curIndex][1] = GAMEMAP[xx][yy].tile.id; // Set the tileID to the first tile in the room
	}

	// Add any doors to the rooms list of doors (Coordinates are given relative to G.cells)
	for (let ii = 0; ii < 3; ii++) {
		for (let jj = 0; jj < 3; jj++) {
			let cell = GAMEMAP[xx][yy].tile.walls[ii][jj]; // One of the nine cells that make up this tile
			if (cell == 'DN' || cell == 'DS' || cell == 'DW' || cell == 'DE') { // If the cell is a door
				RoomList[curIndex][3].push([xx * 3 + ii, yy * 3 + jj]); // Save the literal door coordinates, relative to G.cells 
			}
		}
	}

	// Check the surrounding tiles for more room
	GAMEMAP[xx][yy].roomID = RoomList[curIndex][0]; // Set the room ID for this tile. Among other things, it means it won't be checked again
	if (xx != 0) { // If not on the left edge, check the left tile. If it has the same tileID
		if (GAMEMAP[xx - 1][yy].tile.id == RoomList[curIndex][1] && GAMEMAP[xx - 1][yy].roomID == null) { // If the tile is the same as the roomID, and it is not already in a room
			RoomList = SetRoom(RoomList, curIndex, GAMEMAP, xx - 1, yy); // Recursively check the left tile
		}
	}
	if (xx != GAMEMAP.length - 1) { // If not on the right edge, check the right tile. If it has the same tileID
		if (GAMEMAP[xx + 1][yy].tile.id == RoomList[curIndex][1] && GAMEMAP[xx + 1][yy].roomID == null) { // If the tile is the same as the roomID, and it is not already in a room
			RoomList = SetRoom(RoomList, curIndex, GAMEMAP, xx + 1, yy); // Recursively check the right tile
		}
	}
	if (yy != 0) { // If not on the top edge, check the top tile. If it has the same tileID
		if (GAMEMAP[xx][yy - 1].tile.id == RoomList[curIndex][1] && GAMEMAP[xx][yy - 1].roomID == null) { // If the tile is the same as the roomID, and it is not already in a room
			RoomList = SetRoom(RoomList, curIndex, GAMEMAP, xx, yy - 1); // Recursively check the top tile
		}
	}
	if (yy != GAMEMAP.length - 1) { // If not on the bottom edge, check the bottom tile. If it has the same tileID
		if (GAMEMAP[xx][yy + 1].tile.id == RoomList[curIndex][1] && GAMEMAP[xx][yy + 1].roomID == null) { // If the tile is the same as the roomID, and it is not already in a room
			RoomList = SetRoom(RoomList, curIndex, GAMEMAP, xx, yy + 1); // Recursively check the bottom tile
		}
	}
	return RoomList;
}


// Map tiles below

function CellData(x, y, tile = null) { // Stores the possible tiles for a cell, the location of this cell, and a reference to the cells around itself (To be filled in later, not in constructor)
	this.tile = tile; // Will contain an id, sides for placement, a weight, and a 3x3 array of empty/wall/door etc
	this.tileList = [outside, roomLargeA1, roomLargeA2, roomLargeA3, roomLargeA4, roomMediumB1, roomMediumB2, roomMediumC1, roomMediumC2, roomSmallD1, roomSmallE1, roomSmallF1];
	this.x = x;
	this.y = y;
	this.roomID = null;
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
	sides: ["0r", "at", "al", "0r"], // "at" as in a, top join. "al" as in a, left join etc.
	weight: 60,
	walls: [['CSE', 'DE', 'WE'], ['WS', 'I', 'I'], ['WS', 'I', 'I']]
};
const roomLargeA2 = {
	id: 'a',
	sides: ["0r", "0r", "ar", "at"],
	weight: 60,
	walls: [['WS', 'I', 'I'], ['DS', 'I', 'I'], ['CSW', 'WW', 'WW']]
};
const roomLargeA3 = {
	id: 'a',
	sides: ["al", "ab", "0r", "0r"],
	weight: 60,
	walls: [['WE', 'WE', 'CNE'], ['I', 'I', 'DN'], ['I', 'I', 'WN']]
};
const roomLargeA4 = {
	id: 'a',
	sides: ["ar", "0r", "0r", "ab"],
	weight: 60,
	walls: [['I', 'I', 'WN'], ['I', 'I', 'WN'], ['WW', 'DW', 'CNW']]
};

const roomMediumB1 = { // A medium 1x2 room. Same order
	id: 'b',
	sides: ["0r", "0r", "b", "0r"],
	weight: 80,
	walls: [['CSE', 'WE', 'WE'], ['WS', 'I', 'I'], ['CSW', 'DW', 'WW']]
};
const roomMediumB2 = {
	id: 'b',
	sides: ["b", "0r", "0r", "0r"],
	weight: 80,
	walls: [['WE', 'DE', 'CNE'], ['I', 'I', 'WN'], ['WW', 'WW', 'CNW']]
};

const roomMediumC1 = { // A medium 2x1 room.
	id: 'c',
	sides: ["0r", "c", "0r", "0r"],
	weight: 80,
	walls: [['CSE', 'DE', 'CNE'], ['WS', 'I', 'WN'], ['WS', 'I', 'WN']]
};
const roomMediumC2 = {
	id: 'c',
	sides: ["0r", "0r", "0r", "c"],
	weight: 80,
	walls: [['WS', 'I', 'WN'], ['DS', 'I', 'DN'], ['CSW', 'WW', 'CNW']]
};

const roomSmallD1 = { // A small 1x1 room. Small rooms differ only by door placement
	id: 'd',
	sides: ["0r", "0r", "0r", "0r"],
	weight: 100,
	walls: [['CSE', 'DE', 'CNE'], ['DS', 'I', 'WN'], ['CSW', 'WW', 'CNW']]
};

const roomSmallE1 = { // A small 1x1 room.
	id: 'e',
	sides: ["0r", "0r", "0r", "0r"],
	weight: 100,
	walls: [['CSE', 'WE', 'CNE'], ['WS', 'I', 'DN'], ['CSW', 'DW', 'CNW']]
};

const roomSmallF1 = { // A small 1x1 room.
	id: 'f',
	sides: ["0r", "0r", "0r", "0r"],
	weight: 100,
	walls: [['CSE', 'DE', 'CNE'], ['WS', 'I', 'WN'], ['CSW', 'DW', 'CNW']]
};

// Some constant lists for checking if a tile is in a certian category
const rooms = [roomLargeA1, roomLargeA2, roomLargeA3, roomLargeA4, roomMediumB1, roomMediumB2, roomMediumC1, roomMediumC2, roomSmallD1, roomSmallE1, roomSmallF1]; // A list of all tiles that are considered a room