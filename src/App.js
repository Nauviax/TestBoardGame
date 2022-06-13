import { Client } from 'boardgame.io/client';
import { KiwiKluedo } from './Game';
import { SocketIO } from 'boardgame.io/multiplayer';
import { LobbyClient } from 'boardgame.io/client';

var initialMapGenerated = false;
var grassMap = []; // Used to hold grass variations. Don't worry if you aren't messing with images on the board

var numChars = 0;
var numItems = 0;
var numRooms = 0;
var boardSize = 0;

//For use IF we want to use the lobby to manage matches
async function lobbyStart() {
	const lobbyClient = new LobbyClient({ server: 'http://localhost:8088' });
	const { matchID } = await lobbyClient.createMatch('KiwiKluedo', {
		numPlayers: 2
	});
	console.log("Generated MatchID");
	console.log(matchID);
	return matchID;
}

// function for the start page of the game, passing in the page element 
function SplashScreen(rootElement) {
	console.log("Displaying splash screen");

	// promise - returns something later, resolve - activates the return
	return new Promise((resolve) => {

		// method to create buttons for each player, and sets click event to return playerId and matchId
		const createButton = (playerID) => {
			const button = document.createElement('button');
			button.id = "PlayerButton" + playerID;
			button.textContent = 'Player ' + playerID;
			button.onclick = () => {
				if(document.getElementById('short').checked){
					numChars = 4;
					numRooms = 5;
					numItems = 4;
					boardSize = 6;
				}
				else if(document.getElementById('medium').checked){
					numChars = 6;
					numRooms = 7;
					numItems = 6;
					boardSize = 6;
				}
				else if(document.getElementById('long').checked){
					numChars = 9;
					numRooms = 10;
					numItems = 9;
					boardSize = 8;
				}
				const matchID = document.getElementById('MatchID').value;
				const returnValue = [playerID, matchID];
				resolve(returnValue)
			};
			rootElement.append(button);
		};

		rootElement.innerHTML = '<h1 id="title">Kiwi Kluedo</h1>';
		rootElement.innerHTML += '<p>Create or enter match id: <p>';
		const textbox = document.createElement('input');
		textbox.type = "text";
		textbox.title = "MatchID";
		textbox.name = "MatchID";
		textbox.id = "MatchID";
		//rootElement.innerHTML += '<div id="lobby">';
		rootElement.append(textbox);
		rootElement.innerHTML += '<br><br>';

		rootElement.innerHTML += "<p> Length of game: </p>";
		rootElement.innerHTML += '<input type="radio" id="short" name="length">'
		rootElement.innerHTML += '<label for = "short">Short</label>';
		rootElement.innerHTML += '<input type="radio" id="medium" name="length" checked>'
		rootElement.innerHTML += '<label for = "medium">Medium</label>';
		rootElement.innerHTML += '<input type="radio" id="long" name="length">'
		rootElement.innerHTML += '<label for = "long">Long</label>';
		rootElement.innerHTML += '<br><br>';

		rootElement.innerHTML += ` <p>Play as:</p>`;
		const playerIDs = ['0', '1'];
		playerIDs.forEach(createButton);
		//rootElement.innerHTML += '</div>';


		document.getElementById("title").style.fontFamily = "Arial";
		document.getElementById("title").style.fontSize = "75px";
		document.getElementById("title").style.color = "seagreen";

		document.getElementById("PlayerButton0").style.padding = "16px 32px";
		document.getElementById("PlayerButton0").style.margin = "5px";
		document.getElementById("PlayerButton0").style.backgroundColor = "seagreen";
		document.getElementById("PlayerButton0").style.color = "#EFE8D8";
		document.getElementById("PlayerButton0").style.cursor = "pointer";
		document.getElementById("PlayerButton0").style.border = "none";
		document.getElementById("PlayerButton0").style.fontSize = "16px"

		document.getElementById("PlayerButton1").style.padding = "16px 32px";
		document.getElementById("PlayerButton1").style.margin = "5px";
		document.getElementById("PlayerButton1").style.backgroundColor = "seagreen";
		document.getElementById("PlayerButton1").style.color = "#EFE8D8";
		document.getElementById("PlayerButton1").style.cursor = "pointer";
		document.getElementById("PlayerButton1").style.border = "none";
		document.getElementById("PlayerButton1").style.fontSize = "16px";

		document.querySelectorAll('p').forEach(e => e.style.fontFamily = "Arial");
		document.querySelectorAll('label').forEach(e => e.style.fontFamily = "Arial");
		document.querySelectorAll('p').forEach(e => e.style.fontSize = "30px");
		document.querySelectorAll('label').forEach(e => e.style.fontSize = "30px");

		document.body.style.backgroundColor = "#EFE8D8";

	});
}

// To launch this app, type 'npm start' into a console
// And to run the server type 'npm run serve' in a second console
class TestGameClient {
	// constructor requires the page (rootElement), playerId, and matchId
	constructor(rootElement, { playerID } = {}, { matchID } = {}) {
		this.client = Client({
			game: KiwiKluedo,
			multiplayer: SocketIO({ server: 'localhost:8080' }),
			matchID: matchID,
			playerID,
		});
		this.connected = false;
		this.client.start();
		this.rootElement = rootElement;
		this.client.subscribe(state => this.update(state));
	}

	onConnecting() {
		this.connected = false;
		this.showConnecting();
		console.log("onConnecting matchID");
		console.log(this.client.matchID);
	}

	onConnected() {
		this.connected = true;
	}

	showConnecting() {
		this.rootElement.innerHTML = '<p>connecting…</p>';
	}

	createBoard(state) {
		console.log("Creating board");
		// Create a nxn board of cells
		const rows = [];
		for (let ii = 0; ii < state.G._boardSize; ii++) {
			const cells = [];
			for (let jj = 0; jj < state.G._boardSize; jj++) {
				const id = state.G._boardSize * ii + jj;
				cells.push(`<td class="cell" data-id="${id}"></td>`);
			}
			rows.push(`<tr>${cells.join('')}</tr>`);
		}

		// Add the HTML to our app <div>.
		// this.rootElement.innerHTML = `<table>${rows.join('')}</table><p class="winner"></p>`;
		this.rootElement.innerHTML = `<h2>Player ${this.client.playerID}</h2>`;
		this.rootElement.innerHTML += `<p>MatchID: ${this.client.matchID}</p>`;
		this.rootElement.innerHTML += `<div> <table cellspacing="0" class="cellTable">${rows.join('')}</table> <div class="beInline"> <p class="minimap"></p> <div class="rbCheckbox"></div> <div class="diceButton" id="diceButton"></div> <div class="endButton" id="endButton"></div> </div></div>`;
		this.rootElement.innerHTML += `<p class="winner"></p>`;

		// Create and draw checkboxs for everything	
		const rbCheckbox = this.rootElement.querySelector(".rbCheckbox"); // Get the rbCheckbox element
		const labels = ["Characters", "Rooms", "Items"]; // Displayed labels
		for (let hh = 0; hh < state.G._cardsInPlay.length; hh++) {
			let htmlString = "";
			htmlString += `<p><b>--${labels[hh]}--</b></p>`;
			for (let ii = 0; ii < state.G._cardsInPlay[hh].length; ii++) { // For each card in the game,
				htmlString += `<p>${state.G._cardsInPlay[hh][ii]}: </p>`; // Write the name of each card next to the checkbox
				// Player for loop
				for (let jj = 0; jj < state.ctx.numPlayers; jj++) { // For each player on the board,
					htmlString += `<input type="checkbox" id=${jj}>P${jj}</input>`; // Draw a checkbox for each room in game
				}
				htmlString += ' <br/>'; // <br> to add a new line 
			}
			rbCheckbox.innerHTML += `<div class="innerCheckbox">${htmlString}</div>`; // <br> to add a new line 
		}

		//Set text for the end turn button
		const endButton = document.getElementById("endButton");
		endButton.textContent = "End Turn";


		// Generate grass map (For board)
		for (let ii = 0; ii < state.G._boardSize; ii++) {
			grassMap.push([]);
			for (let jj = 0; jj < state.G._boardSize; jj++) {
				// Push a random number between 0 and 3
				grassMap[ii].push(Math.floor(Math.random() * 4));
			}
		}

		// Load a copy of every important image to the bottom of the screen, size 0. This is dumb, but it prevents the client from forgetting about images and having to fetch them again.

		this.rootElement.innerHTML += `<img src='https://nauviax.jalbum.net/Tiles/slides/O0.jpg' style='width: 0px; height: 0px; object-fit; fill;'/>`;
		this.rootElement.innerHTML += `<img src='https://nauviax.jalbum.net/Tiles/slides/O1.jpg' style='width: 0px; height: 0px; object-fit; fill;'/>`;
		this.rootElement.innerHTML += `<img src='https://nauviax.jalbum.net/Tiles/slides/O2.jpg' style='width: 0px; height: 0px; object-fit; fill;'/>`;
		this.rootElement.innerHTML += `<img src='https://nauviax.jalbum.net/Tiles/slides/O3.jpg' style='width: 0px; height: 0px; object-fit; fill;'/>`;
		this.rootElement.innerHTML += `<img src='https://nauviax.jalbum.net/Tiles/slides/O0V.jpg' style='width: 0px; height: 0px; object-fit; fill;'/>`;
		this.rootElement.innerHTML += `<img src='https://nauviax.jalbum.net/Tiles/slides/O1V.jpg' style='width: 0px; height: 0px; object-fit; fill;'/>`;
		this.rootElement.innerHTML += `<img src='https://nauviax.jalbum.net/Tiles/slides/O2V.jpg' style='width: 0px; height: 0px; object-fit; fill;'/>`;
		this.rootElement.innerHTML += `<img src='https://nauviax.jalbum.net/Tiles/slides/O3V.jpg' style='width: 0px; height: 0px; object-fit; fill;'/>`;
		this.rootElement.innerHTML += `<img src='https://nauviax.jalbum.net/Tiles/slides/WN.jpg' style='width: 0px; height: 0px; object-fit; fill;'/>`;
		this.rootElement.innerHTML += `<img src='https://nauviax.jalbum.net/Tiles/slides/WS.jpg' style='width: 0px; height: 0px; object-fit; fill;'/>`;
		this.rootElement.innerHTML += `<img src='https://nauviax.jalbum.net/Tiles/slides/WW.jpg' style='width: 0px; height: 0px; object-fit; fill;'/>`;
		this.rootElement.innerHTML += `<img src='https://nauviax.jalbum.net/Tiles/slides/WE.jpg' style='width: 0px; height: 0px; object-fit; fill;'/>`;
		this.rootElement.innerHTML += `<img src='https://nauviax.jalbum.net/Tiles/slides/DN.jpg' style='width: 0px; height: 0px; object-fit; fill;'/>`;
		this.rootElement.innerHTML += `<img src='https://nauviax.jalbum.net/Tiles/slides/DS.jpg' style='width: 0px; height: 0px; object-fit; fill;'/>`;
		this.rootElement.innerHTML += `<img src='https://nauviax.jalbum.net/Tiles/slides/DW.jpg' style='width: 0px; height: 0px; object-fit; fill;'/>`;
		this.rootElement.innerHTML += `<img src='https://nauviax.jalbum.net/Tiles/slides/DE.jpg' style='width: 0px; height: 0px; object-fit; fill;'/>`;
		this.rootElement.innerHTML += `<img src='https://nauviax.jalbum.net/Tiles/slides/DNV.jpg' style='width: 0px; height: 0px; object-fit; fill;'/>`;
		this.rootElement.innerHTML += `<img src='https://nauviax.jalbum.net/Tiles/slides/DSV.jpg' style='width: 0px; height: 0px; object-fit; fill;'/>`;
		this.rootElement.innerHTML += `<img src='https://nauviax.jalbum.net/Tiles/slides/DWV.jpg' style='width: 0px; height: 0px; object-fit; fill;'/>`;
		this.rootElement.innerHTML += `<img src='https://nauviax.jalbum.net/Tiles/slides/DEV.jpg' style='width: 0px; height: 0px; object-fit; fill;'/>`;
		this.rootElement.innerHTML += `<img src='https://nauviax.jalbum.net/Tiles/slides/CNW.jpg' style='width: 0px; height: 0px; object-fit; fill;'/>`;
		this.rootElement.innerHTML += `<img src='https://nauviax.jalbum.net/Tiles/slides/CNE.jpg' style='width: 0px; height: 0px; object-fit; fill;'/>`;
		this.rootElement.innerHTML += `<img src='https://nauviax.jalbum.net/Tiles/slides/CSW.jpg' style='width: 0px; height: 0px; object-fit; fill;'/>`;
		this.rootElement.innerHTML += `<img src='https://nauviax.jalbum.net/Tiles/slides/CSE.jpg' style='width: 0px; height: 0px; object-fit; fill;'/>`;

		this.rootElement.innerHTML += `<img src='https://nauviax.jalbum.net/Player/slides/IP0.jpg' style='width: 0px; height: 0px; object-fit; fill;'/>`;
		this.rootElement.innerHTML += `<img src='https://nauviax.jalbum.net/Player/slides/IP1.jpg' style='width: 0px; height: 0px; object-fit; fill;'/>`;
		this.rootElement.innerHTML += `<img src='https://nauviax.jalbum.net/Player/slides/IP2.jpg' style='width: 0px; height: 0px; object-fit; fill;'/>`;
		this.rootElement.innerHTML += `<img src='https://nauviax.jalbum.net/Player/slides/IP3.jpg' style='width: 0px; height: 0px; object-fit; fill;'/>`;
		this.rootElement.innerHTML += `<img src='https://nauviax.jalbum.net/Player/slides/IP4.jpg' style='width: 0px; height: 0px; object-fit; fill;'/>`;
		this.rootElement.innerHTML += `<img src='https://nauviax.jalbum.net/Player/slides/IP5.jpg' style='width: 0px; height: 0px; object-fit; fill;'/>`;
		this.rootElement.innerHTML += `<img src='https://nauviax.jalbum.net/Player/slides/OP0.jpg' style='width: 0px; height: 0px; object-fit; fill;'/>`;
		this.rootElement.innerHTML += `<img src='https://nauviax.jalbum.net/Player/slides/OP1.jpg' style='width: 0px; height: 0px; object-fit; fill;'/>`;
		this.rootElement.innerHTML += `<img src='https://nauviax.jalbum.net/Player/slides/OP2.jpg' style='width: 0px; height: 0px; object-fit; fill;'/>`;
		this.rootElement.innerHTML += `<img src='https://nauviax.jalbum.net/Player/slides/OP3.jpg' style='width: 0px; height: 0px; object-fit; fill;'/>`;
		this.rootElement.innerHTML += `<img src='https://nauviax.jalbum.net/Player/slides/OP4.jpg' style='width: 0px; height: 0px; object-fit; fill;'/>`;
		this.rootElement.innerHTML += `<img src='https://nauviax.jalbum.net/Player/slides/OP5.jpg' style='width: 0px; height: 0px; object-fit; fill;'/>`;

		// Players on top of doors aren't loaded in for now, as that's 24 more images.
		// Edit: I lied, I'm adding them in for players 0 and 1
		this.rootElement.innerHTML += `<img src='https://nauviax.jalbum.net/Player/slides/DNP0.jpg' style='width: 0px; height: 0px; object-fit; fill;'/>`;
		this.rootElement.innerHTML += `<img src='https://nauviax.jalbum.net/Player/slides/DSP0.jpg' style='width: 0px; height: 0px; object-fit; fill;'/>`;
		this.rootElement.innerHTML += `<img src='https://nauviax.jalbum.net/Player/slides/DWP0.jpg' style='width: 0px; height: 0px; object-fit; fill;'/>`;
		this.rootElement.innerHTML += `<img src='https://nauviax.jalbum.net/Player/slides/DEP0.jpg' style='width: 0px; height: 0px; object-fit; fill;'/>`;
		this.rootElement.innerHTML += `<img src='https://nauviax.jalbum.net/Player/slides/DNP1.jpg' style='width: 0px; height: 0px; object-fit; fill;'/>`;
		this.rootElement.innerHTML += `<img src='https://nauviax.jalbum.net/Player/slides/DSP1.jpg' style='width: 0px; height: 0px; object-fit; fill;'/>`;
		this.rootElement.innerHTML += `<img src='https://nauviax.jalbum.net/Player/slides/DWP1.jpg' style='width: 0px; height: 0px; object-fit; fill;'/>`;
		this.rootElement.innerHTML += `<img src='https://nauviax.jalbum.net/Player/slides/DEP1.jpg' style='width: 0px; height: 0px; object-fit; fill;'/>`;
	
		//consts for getting the cards from the players hand
		const listOfCards = [];
		let playerCardsString = "";
		//adds each category of card to the list of cards
		for (let ii = 0; ii < state.G._startingInventories[this.client.playerID].length; ii++){
			listOfCards.push(state.G._startingInventories[this.client.playerID][[ii], [ii], [ii]].toString());		
		}
		//Adds each card to the card string
		listOfCards.forEach(cards => {
			playerCardsString += cards + ", ";
		});
		//splits the cards into individual elements
		const playerCards = playerCardsString.split(",");
		//Displays all of the cards to the screen
		for (let jj = 0; jj < playerCards.length - 1; jj++){
			this.rootElement.innerHTML += `<p class="playerCards">${playerCards[jj]}</p>`;
		}

	}

	attachListeners() {
		console.log("Attaching listeners");
		// Attach the evenit listener to each of the board cells.
		const cells = this.rootElement.querySelectorAll('.cell');
		// Ditto for buttons
		const diceButton = this.rootElement.querySelector('.diceButton');
		const endButton = this.rootElement.querySelector('.endButton');

		// This event handler will read the cell id from a cell’s `data-id` attribute and make the `clickCell` move.
		const handleCellClick = event => {
			let id = parseInt(event.target.dataset.id);
			if (Number.isInteger(id)) {
				console.log("Clicked cell " + id);
				this.client.moves.clickCell(id);
			}
			else {
				id = parseInt(event.target.parentElement.dataset.id);
				console.log("Clicked picture cell " + id);
				this.client.moves.clickCell(id);
			}
		};

		cells.forEach(cell => {
			cell.onclick = handleCellClick;
		});

		const handleRollClick = event => {
			console.log("Rolled dice");
			this.client.moves.rollDice();
		}
		//Hnadles the end button click
		const handleEndClick = event => {
			console.log("Ended Turn");
			this.client.events.endTurn();
		}

		diceButton.onclick = handleRollClick;
		endButton.onclick = handleEndClick;
	}



	update(state) {
		if (state === null) {
			this.onConnecting();
			return;
		} else if (!this.connected) {
			this.onConnected();
		}
		console.log("Map values set: " + state.G._mapValuesSet + ", InitialMapGenerated: " + initialMapGenerated + ", MapGenerated: " + state.G._mapGenerated);
		if (!state.G._mapValuesSet) { // DO NOT DELETE THIS IF STATEMENT! update() MUST return early if map values have not been set.

			// THIS IS ONLY TEMPORARY! Please implement some way to set values, like small/med/large map/game modes. (Boardsize, RoomNum, ItemNum, CharNum)
			// Note that this move can be made ANYWHERE, not just in update(). It is here for now so it is automatically played.

			//this.client.moves.GenerateMapWithValues(6, 6, 6, 6, ["PriorityName1", "PriorityName2"]);
			this.client.moves.GenerateMapWithValues(boardSize, numRooms, numItems, numChars, ["PriorityName1", "PriorityName2"]);
			console.log("Map values set");

			// More testing values
			// this.client.moves.GenerateMapWithValues(4, 4, 4, 4, []);
			// this.client.moves.GenerateMapWithValues(8, 8, 8, 8, []);
			// this.client.moves.GenerateMapWithValues(10, 10, 10, 10, []);

			return; // Do nothing
		}

		if (!initialMapGenerated) { // Create cells on the screen on first update
			console.log("Initial map generation");
			this.createBoard(state);
			this.attachListeners();
			initialMapGenerated = true;
			return; // Try not to delete this return line, it prevents crashes.
		}

		if (state.G._mapGenerated) { // Handle updates only if a map is generated
			// Number of colours for players
			const numberOfColours = 6;
			// Roll dice button
			const diceButton = document.getElementById('diceButton');

			if (state.G.diceRoll[3]) { // When dice has been rolled,
				if (state.G.diceRoll[1] + state.G.diceRoll[2] == state.G.diceRoll[0]) { // If player hasn't moved yet,
					diceButton.textContent = "Dice Roll: " + state.G.diceRoll[1] + " + " + state.G.diceRoll[2] + " = " + state.G.diceRoll[0];
				}
				else { // Player has moved
					diceButton.textContent = "Distance left: " + state.G.diceRoll[0];
				}
			}
			else {
				diceButton.textContent = "Roll Dice!";
			}

			// Get all the board cells.
			const cells = this.rootElement.querySelectorAll('.cell');
			// Update cells to display the values in game state.
			cells.forEach(cell => {
				const cellID = parseInt(cell.dataset.id);
				const cellCoords = [cellID % state.G._boardSize, Math.floor(cellID / state.G._boardSize)];

				let cellValue = state.G.cells[cellCoords[0]][cellCoords[1]]; // 2D array yay, contains the ID of the cell
				let cellValid = false; // True if tile is valid move (Adds a 'V' to the link)
				let cellHasPlayer = false; // True if player is on this tile (Used for selecting the correct gallery, the website has a max image limit)
				let playerValue = ""; // Contains the player id IF there is a player here ('P' is added before the number)
				let cellVariation = ""; // Contains a random positive integer, IF the cell has a variation requirement

				// Draw players
				for (let ii = 0; ii < state.G.playerLocations.length; ii++) { // Check if this cell contains a player. Append the player num if so
					if (cellCoords[0] == state.G.playerLocations[ii][0] && cellCoords[1] == state.G.playerLocations[ii][1]) {
						cellHasPlayer = true;
						playerValue = 'P' + (ii % numberOfColours); // loop back to red if we go over the number of colours
					}
				}
				// New code for displaying players in rooms. Will only show one player per room, and prioritises players whos turn is closest.
				let previousPlayer = (state.ctx.numPlayers + state.ctx.currentPlayer - 1) % state.ctx.numPlayers;
				for (let ii = 0; ii < state.ctx.numPlayers; ii++) { // For each player, (Going backwards, ending at current player)
					if (state.G.playerLocations[previousPlayer][2]) { // If player is in room
						let playerTile = state.G._roomList[state.G.playerLocations[previousPlayer][3]][4]; // Get this rooms player tile
						if (playerTile[0] == cellCoords[0] && playerTile[1] == cellCoords[1]) { // If this cell is the player tile
							cellHasPlayer = true;
							playerValue = 'P' + (previousPlayer % numberOfColours);
						}
					}
					previousPlayer = (state.ctx.numPlayers + previousPlayer - 1) % state.ctx.numPlayers; // Repeat for previous player, ending at current player
				}

				// Add grass variation
				if (cellValue == 'O' && !cellHasPlayer) {
					// Get random number, 
					cellVariation = grassMap[cellCoords[0]][cellCoords[1]];
				}

				// Draw valid moves
				if (state.G.playerLocations[state.ctx.currentPlayer][2]) { // If player is in a room
					cellValid = false;
				}
				else {
					if (state.G._safeTiles.includes(cellValue)) { // If the tile is a safe tile, check if move indicators should be drawn ("." for now)
						const deltaX = Math.abs(cellCoords[0] - state.G.playerLocations[state.ctx.currentPlayer][0]); // Getting abs distance from current player to this tile
						const deltaY = Math.abs(cellCoords[1] - state.G.playerLocations[state.ctx.currentPlayer][1]);
						if (!cellHasPlayer && deltaX + deltaY != 0 && deltaX + deltaY <= state.G.diceRoll[0]) { // If within correct distance, draw a move indicator
							cellValid = true;
						}
					}
				}


				// Update cell image
				let album = cellHasPlayer ? "Player" : "Tiles";
				let image = cellValue + cellVariation + (cellValid ? 'V' : '') + playerValue;
				cell.innerHTML = `<img src='https://nauviax.jalbum.net/${album}/slides/${image}.jpg' style='width: 50px; height: 50px; object-fit; fill;'/>`;

				// ----- //

				// Display minimap
				this.rootElement.querySelector('.minimap').innerHTML = '<tt>' + state.G._roomMap + '</tt><br>';
				for (let ii = 0; ii < state.G._roomList.length; ii++) { // For each room,
					const room = state.G._roomList[ii]; // Get the room
					this.rootElement.querySelector('.minimap').innerHTML += 'Room ID ' + room[0] + ': '; // Display the room ID
					this.rootElement.querySelector('.minimap').innerHTML += state.G._cardsInPlay[1][room[0]] + ' contains '; // Display the number of cards in play
					let playersInRoom = 0; // Count the number of players in the room
					for (let jj = 0; jj < state.G.playerLocations.length; jj++) { // For each player,
						if (state.G.playerLocations[jj][2] == false) { // If the player is not in the room,
							continue; // Skip to the next player
						}
						if (state.G.playerLocations[jj][3] == room[0]) { // If the player is in this room,
							playersInRoom++; // Increment the player count
							this.rootElement.querySelector('.minimap').innerHTML += 'Player ' + jj + ', '; // Display the player num
						}
					}
					if (playersInRoom == 0) { // If there are no players in the room,
						this.rootElement.querySelector('.minimap').innerHTML += 'no players'; // Display "no players"
					}
					this.rootElement.querySelector('.minimap').innerHTML += '<br>';
				}

				// Get the gameover message element. (I THINK THIS IS BROKEN NOW. Untested however)
				const messageEl = this.rootElement.querySelector('.winner');
				// Update the element to show a winner if any.
				if (state.ctx.gameover) {
					messageEl.textContent = 'Winner: ' + state.ctx.gameover.winner;
				} else {
					messageEl.textContent = '';
				}
			});
		}
	}
}
class App {
	constructor(rootElement) {
		this.client = SplashScreen(rootElement).then((credentials) => {
			// resolve in SplashScreen returns a list containing the playerId and matchId
			const playerID = credentials[0];
			const matchID = credentials[1];
			return new TestGameClient(rootElement, { playerID }, { matchID });
		});
	}
}

console.log("Creating App");
const appElement = document.getElementById('app');
new App(appElement);


