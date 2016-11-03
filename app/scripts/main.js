/*
 * name: main.js
 * Authors: Tanner Garrett, Brandon Thepvongsa
 * Description: JavaScript used to create the functionality of Picture Projector
*/

$(document).ready(function() {
	$("#dboxButton").on("click", connectDropbox);
    $("#gdriveButton").on("click", connectDrive);
	//initialize context menu
	$.contextMenu({
            selector: '.context-menu-one',
            items: {
                "edit": {
                	name: "Select a new picture to represent this folder",
                	callback: function(e) {
                		var element = $(this);
                		var guid = element.attr('data-guid');
                		var url = prompt("Paste a URL for the picture to represent this folder", "http://example.com/yourphoto.png");
                		im.setAssociationNamespaceAttribute('picture', url, guid, 'picture-projector');
                		element.css({
                			'background-image': 'url(' + url + ')',
                			'background-size' : 'cover'
                		});
                		saveMirror();
                	}
                }
            }
        });
});

var
	im,
    store,
    rootMirror,
	previous,
	associations,
	dropboxClientCredentials,
	selectedAssociation,
	dropboxClient,
    gapi;

// Start Added variables from PP

// Variable to store the highest zIndex association
var highestZIndex = 0;

// End

dropboxClientCredentials = {
	key: config.key,
	secret: config.secret
};

dropboxClient = new Dropbox.Client(dropboxClientCredentials);

dropboxClient.authDriver(new Dropbox.AuthDriver.Popup({
	receiverUrl: config.dropboxURL
}));

var authenticatedClient = null;

function getClient() {
	return authenticatedClient;
}

// Constructs the root ItemMirror object from the root of the Dropbox.
function constructIMObject(store) {
	im = new ItemMirror("anotherstring", function(error, newMirror) {
		if(error) {
			console.log(error);
		} else {

			im = newMirror;
            // if(pathURI == "/") {
            //     handleLastNavigated(newMirror);
            // }
            // Check to see which of the returned items is the correct store, and navigate into that mirror
            if(store) {
            	associations = im.listAssociations();
            	for(var i =0; i < associations.length; i++) {
            		var displayText = im.getAssociationDisplayText(associations[i]);
            		if(displayText == store) {
            			navigateMirror(associations[i]);
            		}
            	}
            } else {
            	refreshIMDisplay();
            }
		}
	});
}

// // Called upon the successful (re)authentication of a user.
// function handleLastNavigated(newMirror) {
//     rootMirror = newMirror;

//     var lastVisited = im.getFragmentNamespaceAttribute('lastVisited', 'folder-docs');
//     console.log("lastVisited: " + lastVisited);

//     if(lastVisited && lastVisited != "/") {
//         constructIMObject(lastVisited, store);
//     }
// }

// Directs the client to Google Drive's authentication page to sign in.
function connectDrive() {
    store = "Google Drive";
    var authenticated = authorizeDrive();

    authenticated.then(function() {
        console.log('Successful Authentication!');
        authenticatedClient = gapi.client;
        constructIMObject(store);
    }).fail(function(error) {
        alert('Uh oh, couldn\'nt autherticate. Check the console for details');
        console.log(error);
    });
}

// This function returns a promise that handles our authentication
function authorizeDrive() {
  // Your Client ID can be retrieved from your project in the Google
  // Developer Console, https://console.developers.google.com
  var CLIENT_ID = '514195168626-87vskuddd1pvg5bf4erhigsp9rtp95nk.apps.googleusercontent.com';
  var auth = $.Deferred();
  // Need full permissions for everything to work. This is the easiest option
  var SCOPES = ['https://www.googleapis.com/auth/drive'];

  checkAuth();

  function checkAuth() {
    // Load the newer version of the API, the old version is a pain to deal with
    gapi.load('auth2', function() {
        gapi.auth2.init({
        'client_id': CLIENT_ID,
        'scope': SCOPES.join(' '),
        'immediate': true
        });

        var googAuth = gapi.auth2.getAuthInstance();

        if (googAuth.isSignedIn.get()) {
            loadDriveAPI();
        } else {
            // Need to have them sign in
            googAuth.signIn().then(function() {
                loadDriveAPI();
            }, function(error) {
                // Failed to authenticate for some reason
                auth.reject(error);
            });
        }
    });
  }

  // Loads the drive API, and resolves the promise
  function loadDriveAPI() {
    gapi.client.load('drive', 'v2', function() {
        // Once this callback is executed, that means we've authorized just as expected
        // and can therefore resolve the promise
        auth.resolve();
    });
  }

  // Returns the promise object from our deferred object
  return auth.promise();
}

// Directs the client to Dropbox's authentication page to sign in.
function connectDropbox() {
    store = "Dropbox";
	if(authenticatedClient) {
		console.log('Dropbox authenticated');
	} else {
		console.log('Dropbox authenticating...');
		dropboxClient.authenticate(function (error, client) {
			if(error) {
				console.log('Dropbox failed to authenticate');
			} else {
				authenticatedClient = client;
				console.log('Dropbox authenticated');
				constructIMObject(store);
			}
		});
	}
}

// Signs current client out of Dropbox
function disconnectDropbox() {
	dropboxClient.signOut();
}

// Deletes all elements in the display, then populates the list with paragraphs for each
// association (WiP).
function refreshIMDisplay() {

	// Hides the jumbotron if we are already connected to Dropbox
	if(getClient()) {
		$(".jumbotron").hide();
		$(".panel").show();
		$(".clear").show();

	}

    // Save the rootMirror lastvisited fragment
    //rootMirror.setFragmentNamespaceAttribute('lastVisited', im.getURIforItemDescribed(), 'folder-docs');
    //console.log("after set: " + rootMirror.getFragmentNamespaceAttribute('lastVisited', 'folder-docs'));
    // rootMirror.save(function(error) {
    //     if(error) {
    //         console.log('Save Error: ' + error);
    //     } else {
    //         console.log('Successfully saved.');
    //     }
    // });

	$("#canvas").empty();

	// Creates the previous/back button
	printToolbar();

	associations = im.listAssociations();
	var length = associations.length;

	// Grab associations and organize them by type
	var groupingItems = [];
	var nonGroupingItems = [];
	for(var i = 0; i < length; i++) {
		if(im.isAssociationAssociatedItemGrouping(associations[i])) {
			groupingItems.push(associations[i]);
		} else {
			nonGroupingItems.push(associations[i]);
		}
	}

	// Prints out items in alphabetical order
	printAssociations(groupingItems, $("#canvas"));
	// printAssociations(nonGroupingItems.sort(), $("#nonGroupingItems"));

	createClickHandlers();
}


function printAssociations(associationList, div) {
	for(var i = 0; i < associationList.length; i++) {
		var appendingObject = associationMarkup(associationList[i]);
		div.append(appendingObject);
	}
}

// Creates the JS click handlers for the various associations and links
function createClickHandlers() {
	$("#previous-link").on("click", navigatePrevious);

    $("#root-link").on("click", navigateRoot);

    $('.association').on("mousedown", function(e) {
    	var guid = $(this).attr('data-guid');
    	selectAssociation(guid);
    });
}

// Selects an itemMirror associaton for further editing
function selectAssociation(guid) {
	selectedAssociation = new association(guid);
}


// Saves the current itemMirror object
function saveMirror() {
	im.save(function(error) {
		if(error) {
			console.log('Save Error: ' + error);
		} else {
			console.log('Successfully saved.');
		}
	});

}

// Refreshes the itemMirror object
function refreshMirror() {
	im.refresh(function(error) {
		if(error) {
			console.log('Refresh error:' + error);
		}
	});
}

// Attempts to  and display a new itemMirror association
function navigateMirror(guid) {
	im.createItemMirrorForAssociatedGroupingItem(guid, function(error, newMirror) {

		if(!error) {
			im = newMirror;

			if(!rootMirror) {
				rootMirror = im; // Save root to be used for home button and root fragment saving
			}

      refreshIMDisplay();
		} else {
			console.log(error);
		}
	});

}

// Navigates and refreshes the display to the previous mirror
function navigatePrevious() {
    var previous = im.getCreator();

    if(previous) {
        im = previous;
        refreshIMDisplay();
    }
}


// Navigates to the root mirror
function navigateRoot() {
    if(rootMirror) {
        im = rootMirror;
        refreshIMDisplay();
    }

}


// Prints the previous link to go back up to parent/creator
function printToolbar() {
	var result = "";
	var previous = im.getCreator();

	// Print the fragment name
	var displayText = "<h3 class='folder-name'>" + im.getDisplayName() + "</h3>";
    $("#toolbar h3").html(displayText);

    $('#button-toolbar').empty();

    // Prints the home/root button
    var homeButton = "<button type='button' class='btn btn-default' id='root-link'>"
        + "<span class='glyphicon glyphicon glyphicon-home'></span> Home</button>";

    $('#button-toolbar').append(homeButton);

	// Print the previous link if we have one
	if(previous) {
		var previousButton = "<button type='button' class='btn btn-default' id='previous-link'>"
		+ "<span class='glyphicon glyphicon glyphicon-level-up'></span> Back</button>";
        $('#button-toolbar').append(previousButton);
	}

	return result;
}

// Abstraction of a picture projector itemMirror association. Includes
// namespace attributes dealing with the positioning and display of an association.
function association(guid) {
	this.guid = guid;
	this.displayText = im.getAssociationDisplayText(guid);
	this.picture = im.getAssociationNamespaceAttribute('picture', guid, 'picture-projector');
	this.zIndex = im.getAssociationNamespaceAttribute('zIndex', guid, 'picture-projector');
	this.yCord = im.getAssociationNamespaceAttribute('yCord', guid, 'picture-projector');
	this.xCord = im.getAssociationNamespaceAttribute('xCord', guid, 'picture-projector');
}

// Sets an association in itemMirror to equal an abstracted association

function setAssociation(assoc) {
	var guid = assoc.guid;
	im.setAssociationNamespaceAttribute('zIndex', assoc.zIndex, guid, 'picture-projector');
	im.setAssociationNamespaceAttribute('yCord', assoc.yCord, guid, 'picture-projector');
	im.setAssociationNamespaceAttribute('xCord', assoc.xCord, guid, 'picture-projector');
}

// Returns the markup for an association to be printed to the screen
// Differentiates between a groupingItem and nonGroupinItem via icon
function associationMarkup(guid) {
	var assoc = new association(guid);

	var markup = "<div id='" + assoc.displayText + "' data-guid='" + guid + "' title='" + assoc.displayText + "' class='folder draggable panel-default position-fixed association context-menu-one' style='" + handleAssocStyle(assoc) + "'>";
	markup += "<p data-guid='" + guid + "'>" + assoc.displayText.substring(0, 11) + "</p>";
	markup += "</div>";

	return markup;

}

// Handles the placement styling of the different associations
function handleAssocStyle(assoc) {
	var result = "";
	if(assoc.xCord || assoc.yCord) {
		result += "left: " + assoc.xCord + "px;";
		result += "top: " + assoc.yCord + "px;";
		result += "z-index: " + assoc.zIndex + "px;";
		result += "position: absolute;";

	} else {
		result += "position: relative;"
	}

	if(assoc.picture) {
		result += "background-image: url(" + assoc.picture + ");";
	} else {
		result += "background-image: url(images/folder.png);";
	}

	return result;
}

// // INTERACT.JS - draggable related code
// // target elements with the "draggable" class
// interact('.draggable')
//   .draggable({
//     // enable inertial throwing
//     inertia: false,
//     // keep the element within the area of it's parent
//     restrict: {
//       restriction: "parent",
//       endOnly: false,
//       elementRect: { top: 0, left: 0, bottom: 1, right: 1 }
//     },
//
//
//
//     // call this function on every dragmove event
//     onmove: dragMoveListener,
//     // call this function on every dragend event
//     onend: function (event) {
//       var rect = getOffsetRect(event.target);
//       //$scope.offsetLeft = 'Offset left: ' + rect.left;
//       //$scope.offsetTop = 'Offset top: ' + rect.top;
//
//       selectedAssociation.xCord = rect.left;
//       selectedAssociation.yCord = rect.top;
//       // selectedAssoc.zIndex = highestZIndex;
//
//       //$scope.selectedAssoc.moved = true;
// 		setAssociation(selectedAssociation);
//       saveMirror();
//     }
//   })
//
// 	// Handles a click on the folder, navigates to the
// 	// folders guid, shows the loading spinner
// 	.on('tap', function (event) {
// 		var guid = event.target.getAttribute('data-guid');
// 		if(event.button != 2) {
// 		   	navigateMirror(guid);
// 		}
// 	});

interact('.draggable')
	.draggable({
		// restrict: {
		// 	restriction: 'parent'
		// },
		max: Infinity,
		onmove: dragMoveListener,
		autoScroll: {
			container: document.getElementById('canvas'),
			margin: 5000,
			speed: 1000,
			//distance: 500
		}
	});




function dragMoveListener (event) {
	var target = event.target,
    // keep the dragged position in the data-x/data-y attributes
    x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx,
    y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
	// translate the element
	target.style.webkitTransform =
	target.style.transform =
	  'translate(' + x + 'px, ' + y + 'px)';

	// // Bring the element to overlap other elements using zIndex if it's
	// // not already the element with the highest z-index
	// if(target.style.zIndex < highestZIndex) {
	//   highestZIndex++;
	//   target.style.zIndex = highestZIndex;
	// }

	// update the position attributes
	target.setAttribute('data-x', x);
	target.setAttribute('data-y', y);
}

// Gets the offset of the provided element relative to the canvas and current scroll
function getOffsetRect(elem) {
	var box = elem.getBoundingClientRect();

	var body = document.body;
	var docElem = document.documentElement;
	var canvasRect = document.getElementById('canvas').getBoundingClientRect();

	// Client scroll
	var clientTop = docElem.clientTop || body.clientTop || 0;
	var clientLeft = docElem.clientLeft || body.clientLeft || 0;

	var top  =  box.top - clientTop - canvasRect.top;
	var left = box.left - clientLeft - canvasRect.left;

	return { top: Math.round(top), left: Math.round(left) }
}
