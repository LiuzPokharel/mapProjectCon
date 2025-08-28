// Contains all top-level code for now
// We may want to move some of the logic to a separate file later on

import { Camera, addCameraListeners, mergeLeft } from "./camera.mjs";
import { Equirectangular, SphereMercator } from "./cartography.mjs";
import { addSearchbarListeners } from "./searchbar.mjs";
import { setupAutofill } from "./autofill.mjs";
import { roomData, buildingCoords } from "./features.mjs";
//space added 
const ctx = $("#canvas")[0].getContext("2d");
const camera = new Camera(ctx);

addCameraListeners(camera);
addSearchbarListeners(camera);

const mercator = new SphereMercator({
	b: {x: 2281, y: 1648, latitude: 37.3583333333, longitude: -120.441666667},
	c: {x: 4708, y: 1648, latitude: 37.3583333333, longitude: -120.408333333}
});
window.mercator = mercator;

const roomTextStyle = {
	fillStyle: "white",
	strokeStyle: "black",
	lineWidth: 4,
	font: "24px Arial",
	textAlign: "center"
};
const bigTextStyle = {
	fillStyle: "white",
	strokeStyle: "black",
	lineWidth: 8,
	font: "50px Arial",
	textAlign: "center"
};
function draw() {
	ctx.resetTransform();
	ctx.fillStyle = "white";
	// Multiply size by 2 as quick hack to prevent hall of mirrors effect
	ctx.fillRect(0, 0, 2 * document.body.offsetWidth, 2 * document.body.offsetHeight);
	camera.refreshTransform();
	// TODO Move the logic for this call to camera for abstraction
	ctx.drawImage($("#background-map")[0], 0, 0);
	// Feel free to experiment by adding some canvas draw calls here
	// Here, I use the mercator object to convert my latitude and longitude
	// into a format that ctx can understand
	let [x1, y1] = mercator.f(37.358, -120.44);
	let [x2, y2] = mercator.f(37.357, -120.45);
	if (camera.affine.scaleFactor > 2.4) {
		mergeLeft(ctx, roomTextStyle);
		for (const building in roomData) {
			let floor = roomData[building]["floor" + camera.floor] ?? roomData[building][roomData[building].main];
			floor.forEach(([x, y, s]) => camera.writeText(s, x, y));
		}
	} else {
		mergeLeft(ctx, bigTextStyle);
		if (camera.affine.scaleFactor < 0.95) {
			ctx.font = "24px Arial";
		}
		for (const building in buildingCoords) {
			camera.writeText(building, ...buildingCoords[building]);
		}
	}
}

function resize() {
	ctx.canvas.width = window.innerWidth;
	ctx.canvas.height = window.innerHeight;
}

$(window).on("resize", function (e) {
	resize();
	draw();
});

resize();
draw();
setupAutofill();

// Debugging help
window.draw = draw;
window.camera = camera;
window.compass = compass;

window.logClicks = true;

$(window).on("click", function (event) {
	if (logClicks) {
		let [x, y] = [event.offsetX, event.offsetY];
		let [worldX, worldY] = camera.screenToWorld(x, y);
		let [lat, lon] = mercator.r(worldX, worldY);
		console.log("lat, lon:", lat, lon, "worldX, worldY:", worldX, worldY, "screenX, screenY:", x, y);
	}
});

//Graph of the nodes
const graph = {
	"admin": {"t1": 90, "t5": 220},
	"t1": {"admin": 90, "t2": 150},
	"t2": {"t1": 150, "t3": 220},
	"t3": {"t2": 220, "t6": 60, "t5": 175},
	"t4": {"t6": 180, "cob2": 90, "cob1": 100},
	"cob1": {"t4": 100, "se1": 90},
	"cob2": {"t4": 90},
	"t5": {"admin": 220, "t3": 175, "acs": 60},
	"acs": {"t5": 60, "sre": 70, "t6": 175},
	"t6": {"t3": 60, "acs": 175, "t4": 180},
	"sre": {"bsp": 40, "t7": 150},
	"bsp": {"sre": 40},
	"t7": {"sre": 150, "se1": 120, "se2": 45},
	"se1": {"t7": 120, "cob1": 90, "se2": 65},
	"se2": {"t7": 45, "se1": 65},
	};

//Dijkstra's algorithm
function dijkstra(graph, start, end){
	let pq = [[0, start, []]];
	let visited = new Set(); 

	while (pq.length > 0){
		pq.sort((a, b) => a[0] - b[0]);
		let [dist, current, path] = pq.shift();
		if (visited.has(current)) continue; 
		visited.add(current);
		path = [...path, current];

		if (current === end) return {distance: dist, path};

		for (let neighbor in graph[current]) {
			if (!visited.has(neighbor)){
				pq.push([dist + graph[current][neighbor], neighbor, path]);
			}
		}
	}
	return {distance: "N/A", path: [] };
}

function findRoute(start, end){
	let result = dijkstra(graph, start, end);
	document.getElementById("output").innerText = 
		`Shortest path: ${result.path.join(" -> ")} (Distance: ${result.distance})`;
}

window.findRoute = findRoute; 