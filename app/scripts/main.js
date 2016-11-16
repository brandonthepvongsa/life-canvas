/*
 * name: main.js
 * Authors: Brandon Thepvongsa
 * Description: JavaScript used to create the functionality of Picture Projector
*/

$(document).ready(function() {
	$("#dboxButton").on("click", connectDropbox);
  $("#gdriveButton").on("click", connectDrive);

	$("#modal-submit").on("click", setPicture);

		//initialize context menu
		$.contextMenu({
			selector: '.context-menu-one',
			items: {
				"open": {
					name: " Open Subfolder",
					callback: function(e) {
						var elementGUID = $(this).attr('data-guid');
						if(im.isAssociationAssociatedItemGrouping(elementGUID)) {
							navigateMirror(elementGUID);
						}
					},
					icon: function(opt, $itemElement, itemKey, item){
						// Set the content to the menu trigger selector and add an bootstrap icon to the item.
						$itemElement.html('<span class="glyphicon glyphicon-folder-open" aria-hidden="true"></span> Open folder' + opt.selector);

						// Add the context-menu-icon-updated class to the item
						return 'context-menu-icon-updated';
					},
					// Disabled if the element is a non-grouping item
					disabled: function() {return !im.isAssociationAssociatedItemGrouping($(this).attr('data-guid')); }
				},
				"edit": {
					name: "Select a new picture to represent this folder",
					callback: function(e) {
						var element = $(this);
						var guid = element.attr('data-guid');

						selectAssociation(guid);
						openModalMirror(guid);
						$('#dialog').modal('show');
					}
				},

			}
		}); // END CONTEXT MENU
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

		// If this assoc has a zIndex value and it's higher than the current, set the current to it
		var assocZIndex = im.getAssociationNamespaceAttribute('zIndex', associationList[i], 'picture-projector');
		if(assocZIndex && (highestZIndex < assocZIndex)) {
			highestZIndex = assocZIndex;
			//console.log(assocZIndex);
		}
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
	selectedAssociation = new Association(guid, im);
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

// Attempts to open association as new ItemMirror view in modal
function openModalMirror(guid) {
	var pictureBrowser = $("#modal-browser");
	pictureBrowser.html("loading images...");
	// Create a new ItemMirror object for the requested modal
	im.createItemMirrorForAssociatedGroupingItem(guid, function(error, newMirror) {
		if(!error) {
			refreshModal(newMirror);
		} else {
			console.log("Error opening mirror for modal");
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
function Association(guid, mirror) {
	this.guid = guid;
	this.displayText = mirror.getAssociationDisplayText(guid);
	this.localItem = mirror.getAssociationLocalItem(guid);
	this.picture = mirror.getAssociationNamespaceAttribute('picture', guid, 'picture-projector');
	this.zIndex = mirror.getAssociationNamespaceAttribute('zIndex', guid, 'picture-projector');
	this.yCord = mirror.getAssociationNamespaceAttribute('yCord', guid, 'picture-projector');
	this.xCord = mirror.getAssociationNamespaceAttribute('xCord', guid, 'picture-projector');
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
	var assoc = new Association(guid, im);

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
		result += "z-index: " + assoc.zIndex + ";";
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

function setPicture() {
	var url = $("#modal-input").val();

	if(url) {
		im.setAssociationNamespaceAttribute('picture', url, selectedAssociation.guid, 'picture-projector');

		var element = $("[data-guid=" + selectedAssociation.guid + "]");
		element.css({
			'background-image': 'url(' + url + ')',
			'background-size' : 'cover'
		});
		saveMirror();

		$("#modal-input").val('');
	}
}

function refreshModal(inputMirror) {
	var pictureBrowser = $("#modal-browser");

	var associations = inputMirror.listAssociations();
	var currentAssociation;

	// variable to check if folder contains images, decides whether we print images or
	// display that the folder contains no supported images.
	var containsImages = false;

	// Store all our images here
	var imageList = [];

	// Loop through all the associations to check for images
	for(var i = 0; i < associations.length; i++) {
		currentAssociation = new Association(associations[i], inputMirror);
		if(checkImageURL(currentAssociation.localItem)){
			// we've found at least one image
			containsImages = true;
			imageList.push(currentAssociation.localItem);
		}
	}

	if(containsImages) {
		var resultString = "";
		for(var i=0; i<imageList.length; i++) {
			resultString += imageList[i] + "<br />";
		}
		pictureBrowser.html(resultString);
	} else {
		pictureBrowser.html("this folder contains no supported images.");
	}
}

// Checks if a given string ends in a supported file type
function checkImageURL(url) {
    return(url.match(/\.(gif|png|jpg|jpeg)$/) != null);
}

// Interact.js related code
// Sets functionality for dragging, dragend, and clicks of associations
interact('.draggable')
	.draggable({
		max: Infinity,
		onmove: dragMoveListener,
		// autoScroll: {
		// 	container: document.getElementById('canvas'),
		// 	margin: 5000,
		// 	speed: 1000,
		// },
		onend: dragEndListener,
	})
	// Handles a click on the folder, navigates to the
	// folders guid, shows the loading spinner
	.on('tap', onTapListener);

function onTapListener(event) {
	var guid = event.target.getAttribute('data-guid');
	if(event.button != 2) {
		navigateMirror(guid);
	}
}

function dragEndListener(event) {
	var rect = getOffsetRect(event.target);

	selectedAssociation.xCord = rect.left;
	selectedAssociation.yCord = rect.top;
	selectedAssociation.zIndex = event.target.getAttribute('zIndex');


	setAssociation(selectedAssociation);
	saveMirror();
}


function dragMoveListener (event) {
	var target = event.target,
    // keep the dragged position in the data-x/data-y attributes
    x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx,
    y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
	// translate the element
	target.style.webkitTransform =
	target.style.transform =
	  'translate(' + x + 'px, ' + y + 'px)';

	// Bring the element to overlap other elements using zIndex if it's
	// not already the element with the highest z-index
	if(highestZIndex == 0 || (target.style.zIndex < highestZIndex)) {
	  highestZIndex++;
	  target.style.zIndex = highestZIndex;

		target.setAttribute('zIndex', highestZIndex);
	}

	// update the position attributes
	target.setAttribute('data-x', x);
	target.setAttribute('data-y', y);

}

// Finds the position of an element relative to its parent and its parents scroll
function getOffsetRect(elem) {

	// Jquery select our element
	var guid = elem.getAttribute('data-guid');
	var element = $("[data-guid=" + guid + "]");

	// Grab the position of the element relative to the parent (does not include scrolling)
	var relativeLeft = element.position().left;
	var relativeTop = element.position().top;

	// Find the position including scrolling by adding in the amount of scrolling
	var trueLeft = relativeLeft + element.parent().scrollLeft();
	var trueTop = relativeTop + element.parent().scrollTop();

	return {left: trueLeft, top: trueTop};
}
