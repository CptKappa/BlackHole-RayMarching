import { BlackholeSim } from './scripts/BlackholeSim.js';

let blackholeSim;

async function main() {
	blackholeSim = new BlackholeSim("#glCanvas", document.body.clientWidth, document.body.clientHeight);

	let mouseLocationX;
	let mouseLocationY;
	document.addEventListener('mousedown', function(e) {
		if (e.button == 0) {
			mouseLocationX = e.clientX;
			mouseLocationY = e.clientY;
		}
	});

	document.addEventListener('mouseup', function(e) {
		if (e.button == 1 || e.button == 2) {
			blackholeSim.printPos(e.clientX, e.clientY);
		}
	});

	document.addEventListener('mousemove', async function(e) {
		if (e.buttons % 2 == 1) {
			// left mouse button is pressed
			
			blackholeSim.translate(mouseLocationX, mouseLocationY, e.clientX, e.clientY);
			mouseLocationX = e.clientX;
			mouseLocationY = e.clientY;
		}
	});

	window.addEventListener('resize', function(e) {
		blackholeSim.resize(document.body.clientWidth, document.body.clientHeight);
	});

	
	await blackholeSim.init()
	blackholeSim.render();
}

window.addEventListener('load', main)