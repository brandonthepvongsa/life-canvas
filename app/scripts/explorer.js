'use strict';

/**
* @ngdoc function
* @name pictureProjectorApp.controller:ExplorerCtrl
* @description
* # ExplorerCtrl
* Controller of the pictureProjectorApp
*/
var app = angular.module('pictureProjectorApp');

// Sets the default configuration for growl messages
app.config(['growlProvider', function (growlProvider) {
  growlProvider.globalTimeToLive(3000);
  growlProvider.globalDisableCountDown(true);
  growlProvider.onlyUniqueMessages(false);
}]);

// Main controller for the explorer app
app.controller('ExplorerCtrl', function ($scope, growl, itemMirror) {

  // Variable to store the highest zIndex association
  var highestZIndex = 0;

  // Stores the associations to be used as breadcrumb navigation
  $scope.breadcrumbs = [];
  $scope.mirrorStack = [];

  // Set to false after printing associations for the first time
  var firstTransform = true;
  $scope.repeatEnd = function() {
    firstTransform = false;
  };


  function savedGrowl() {
    var config = {};
    growl.success('Changes saved.', config);
  }

  // Parses the URL for background images
  $scope.parseURL = function(url) {
    var result;
    if(!url) {
      url = 'images/folder.png';
    }
    return 'url(' + url + ')';
  };

  // starts everything up after dropbox loads
  var init = itemMirror.initialize;
  init.then(function() {
    $scope.mirror = itemMirror;
    $scope.associations = itemMirror.associations;
    $scope.mirrorStack.push(new mirrorStackObject("", $scope.mirror.displayName));
    getGroupingItems();

    // This needs to be called after the service updates the associations.
    // Angular doesn't watch the scope of the service's associations, so any
    // updates don't get propogated to the front end.
    function assocScopeUpdate() {
      $scope.associations = itemMirror.associations;
      getGroupingItems();
    }

    function handleBreadcrumbStack(inputGUID) {
      // Check if we currently have the guid in the stack
      // which means we've already visited this mirror and
      // it's currently in storage.
      var guidExists = false;
      var indexOf;
      for(var i = 0; i < $scope.mirrorStack.length; i++) {
        if($scope.mirrorStack[i].guid == inputGUID) {
          guidExists = true;
          indexOf = i;
        }
      };

      if(guidExists) {
        // Calculate the number of breadcrumbs to pop from the stack
        var numToPop = ($scope.mirrorStack.length - 1) - indexOf;
        for(var i = 0; i < numToPop; i++) {
          $scope.mirrorStack.pop();
        }
      } else {
        // Navigating to a new mirror, so add it to the stack
        var newMirrorStackObject = new mirrorStackObject(inputGUID, $scope.mirror.displayName);
        $scope.mirrorStack.push(newMirrorStackObject);
      }
    }

    function mirrorStackObject(inputGUID, inputDisplayName) {
        this.guid = inputGUID;
        this.displayName = inputDisplayName;
    }

    // Organizes the associations into two groups/arrays, 
    // groupingItems and notGroupingItems.
    // Also concurrently finds the association with the highest zIndex
    function getGroupingItems() {
      $scope.groupingItems = [];
      $scope.notGroupingItems = [];
      for(var i = 0; i < itemMirror.associations.length; i++) {
        var assoc = itemMirror.associations[i];
        setHighestZIndex(assoc);
        if(assoc.isGrouping) {
          $scope.groupingItems.push(assoc);
        } else {
          $scope.notGroupingItems.push(assoc);
        }
      }
    }

    // Checks to see if we have a new highest zIndex.
    // Sets the highest zIndex to it if so
    function setHighestZIndex(assoc) {
      if(assoc.zIndex > highestZIndex) {
        highestZIndex = assoc.zIndex;
      }
    }

    // Navigates to the requested guid
    $scope.navigate = function(guid) {
    // Navigate to the requested guid
		itemMirror.navigateMirror(guid).
  		then(assocScopeUpdate).
      then(function() {
        handleBreadcrumbStack(guid);
      });
    };

    $scope.printMirrorStack = function() {
      var result;
      for(var i = 0; i < $scope.mirrorStack.length; i++) {
        result += "hello" + $scope.mirrorStack[i].displayText;
      }

      return result;
    }
    // Selects the sent association to be later edited
    $scope.handleAssocSelect = function(assoc) {
        $scope.select(assoc);
    };

    // Handles the placement styling of the different associations
    $scope.handleAssocStyle = function(assoc) {
      var result = new Object();

      // result['background-image'] = $scope.parseURL(assoc.customPicture);
      result['position'] = 'relative';

      // Case for placing items with custom cords for the first time
      if(assoc.xCord || assoc.yCord) {
        result['left'] = assoc.xCord + 'px';
        result['top'] = assoc.yCord + 'px';
        result['zIndex'] = assoc.zIndex;
        result['position'] = 'absolute';
      }

      return result;
    };

    // Handles the showing of displayText for an association, only shows the displayText
    // if the association does not already have a customPicture.
    $scope.showDisplayText = function(assoc) {
      if(!assoc.customPicture) {
        return assoc.displayText.substring(0,12);
      }
    };


    // Deletes the given association
    $scope.deleteAssoc = function(guid) {
      itemMirror.deleteAssociation(guid).
      then(assocScopeUpdate);
    };

  
    // Navigates the previously called assocation
    // Always the parent in our case
    $scope.previous = function() {
      itemMirror.previous().
      then(assocScopeUpdate).
      then(function() {
        $scope.mirrorStack.pop();
      });
    };

    // Saves the current associations and their attributes
    $scope.save = function() {
      itemMirror.save().
      then(savedGrowl);
    };

    // Refreshes the itemMirror object
    $scope.refresh = function() {
      itemMirror.refresh().
      then(assocScopeUpdate);
    };

    // Checks if the association is a grouping object (folder) or not
    $scope.isGrouping = function(assoc) {
      return assoc.isGrouping;
    };

    // Handles the editing of pictures called on a right click of 
    // an association
    $scope.handleBackgroundEdit = function() {

    	// Fetch the currentURL if there is one, or else just show an example URL
    	var currentURL;
    	if($scope.selectedAssoc.customPicture) {
    		currentURL = $scope.selectedAssoc.customPicture;
    	} else {
    		currentURL = "http://example.com/image.jpg";
    	}

    	var input = prompt("Please enter the URL of an image", currentURL);
    	
    	// Save the new URL if they clicked okay
    	if(input != null) {
    		$scope.selectedAssoc.customPicture = input;
			$scope.save();
		}
    };

    // Only one association is ever selected at a time. It has the boolean
    // selected property, to allow for unique styling
    $scope.select = function(assoc) {
      if ($scope.selectedAssoc) {
        $scope.selectedAssoc.selected = false;
      }
      $scope.selectedAssoc = assoc;
      $scope.selectedAssoc.selected = true;
    };

    // Sets the CSS position attribute to relative if an association 
    // doesn't have a custom x or y coordinate.

    // There is a special case of an association being transformed (dragged) during this
    // session. We let interact.js handle the transformations and simply store the
    // new coordinates. Next refresh we will place the association at the new
    // coordinates.
    $scope.checkPosition = function(assoc) {
      if(assoc.xCord && assoc.yCord && firstTransform) {
        return "absolute";
      } else {
        return "relative";
      }
    };

    // INTERACT.JS - draggable related code
    // target elements with the "draggable" class
    interact('.draggable')
      .draggable({
        // enable inertial throwing
        inertia: false,
        // keep the element within the area of it's parent
        restrict: {
          restriction: "parent",
          endOnly: false,
          elementRect: { top: 0, left: 0, bottom: 1, right: 1 }
        },



        // call this function on every dragmove event
        onmove: dragMoveListener,
        // call this function on every dragend event
        onend: function (event) {
          var rect = getOffsetRect(event.target);
          $scope.offsetLeft = 'Offset left: ' + rect.left;
          $scope.offsetTop = 'Offset top: ' + rect.top;

          $scope.selectedAssoc.xCord = rect.left;
          $scope.selectedAssoc.yCord = rect.top;
          $scope.selectedAssoc.zIndex = highestZIndex;

          $scope.selectedAssoc.moved = true;

          $scope.save();
        }
      })

      // Handles a click on the folder, navigates to the 
      // folders guid, shows the loading spinner
      .on('tap', function (event) {
        var guid = event.target.getAttribute('data-guid');
        if(event.button != 2) {
       		$scope.navigate(guid);
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

        // Bring the element to overlap other elements using zIndex if it's
        // not already the element with the highest z-index
        if(target.style.zIndex < highestZIndex) {
          highestZIndex++;
          target.style.zIndex = highestZIndex;
        }
        
        // update the position attributes
        target.setAttribute('data-x', x);
        target.setAttribute('data-y', y);
      }

  });

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

});

// Custom directive to set the background image of an association.
app.directive('backImg', function(){
    return function(scope, element, attrs){
        attrs.$observe('backImg', function(value) {
          if(value == "") { value = 'images/folder.png'};
            element.css({
                'background-image': 'url(' + value +')',
                'background-size' : 'cover'
            });
        });
    };
});

