// Listener for searchbar

// These are in pixel values for now
// TODO Replace with actual data mapped through a SphereMercator transformation
let tempFeatures = {
	"Administration Building": { x: 1490, y: 2230 },
	"Classroom Office Building 2": { x: 674.8995737784484, y: 1921.3639670857553 },
	"Classroom Office Building 1": {x: 675, y: 1765},
	"Arts and Computational Sciences Building": {x: 1240, y: 1840 },
	"Biomedical Sciences and Physics Building": {x: 1080, y: 1890}

}

function focusOn(camera, feature) {
	// Quick hack since there's no UI for floor picker
	if (!isNaN(feature)) {
		camera.floor = feature;
		draw();
		return;
	}
	if (tempFeatures[feature] == undefined) {
		alert(`The feature ${feature} doesn't exist`);
		return;
	}
	if (isNaN(tempFeatures[feature].x + tempFeatures[feature].y)) {
		console.log(`Got NaN when looking for tempFeatures[${feature}] ${tempFeatures[feature]}`);
		return;
	}
	camera.setCenterOn(tempFeatures[feature].x, tempFeatures[feature].y);
	draw();
}

function addSearchbarListeners(camera) {
	$("#searchbar-data").on("keyup", function (event) {
		if (event.key == "Enter" || event.keyCode == 13) {
			focusOn(camera, this.value);
		}
	});
	$("#searchbar-submit").on("click", function (event) {
		focusOn(camera, $("#searchbar-data")[0].value);
	});
}

export { addSearchbarListeners };
