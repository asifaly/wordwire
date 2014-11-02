        var wordWire = angular.module('wordWire',[firebase]);
        wordWire.constant('FIREBASE_URI', 'https://wordwire.firebaseio.com/');
        wordWire.controller('WordCtrl', WordCtrl);

            function WordCtrl ($scope){
            $scope.words = [];
            //used for displaying error based on pattern regular expression
            $scope.errmsg = 'English please..no gibberish allowed here!';
            $scope.newscore = "";
            $scope.newword = "";
            //watch for changes to input field ng-model=newword and change newscore
            $scope.$watch("newword", function (newValue, oldValue){
            if ($scope.newword !== undefined) {
            var wordy = $scope.newword;
            wordy = wordy.toUpperCase();
            scores = {'A':1,'B':3,'C':3,'D':2,'E':1,'F':4,'G':2,'H':4,'I':1,'J':8,'K':5,'L':1,'M':3, 'N':1,'O':1,'P':3,'Q':10,'R':1,'S':1,'T':1,'U':1,'V':4,'W':4,'X':8,'Y':4,'Z':10};

			var sum = 0;
				for (var i = 0; i < wordy.length; ++i) {
    				sum += scores[wordy.charAt(i)] || 0;
					}
				//console.log("score is from for :"+sum);
				$scope.newscore = sum;
			}
			else {
				//if value is undefined then it will set the score to zero
                $scope.newscore = 0;
			}
			});
			//add the new word to the list of words on clicking submit button
            $scope.addWord = function (){
            //word is from newword and score is from newscore
         	$scope.words.push({word: $scope.newword, score: $scope.newscore})
            //set newword to lastword to display it for the player
			$scope.lastword = $scope.newword;
            $scope.firstletter = $scope.lastword.charAt($scope.lastword.length-1);
            //clear the newword ng-model
			$scope.newword="";
			}
            
        };

    wordWire.factory('ItemsService', ['$firebase', 'FIREBASE_URI', function ($firebase, FIREBASE_URI) {
    var ref = new Firebase(FIREBASE_URI);
    var items = $firebase(ref);

    var getItems = function () {
        return items;
    };

    var addItem = function (item) {
        items.$add(item);
    };

    var updateItem = function (id) {
        items.$save(id);
    };

    var removeItem = function (id) {
        items.$remove(id);
    };

    return {
        getItems: getItems,
        addItem: addItem,
        updateItem: updateItem,
        removeItem: removeItem
    }
}]);