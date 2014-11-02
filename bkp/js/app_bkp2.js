var wordWire = angular.module('wordWire',['firebase']);
       wordWire.constant('FIREBASE_URI', 'https://wordwire.firebaseio.com/');
        wordWire.controller('WordCtrl', ['$scope', 'WordsService', function ($scope, WordsService) {
            //getwords from firebase
            $scope.words = WordsService.getWords();
            //console.log($scope.words)
            $scope.lastword = WordsService.getLast();
            //used for displaying error based on pattern regular expression
            $scope.errmsg = 'English please..no gibberish allowed here!';
            //initialize values
            $scope.newword = { name: '', score: ''};
            $scope.currentWord = null;
            //$scope.lastword = {name: '', score: ''};

            $scope.addWord = function () {
            //store the lastword in the $scope
            $scope.lastword = $scope.newword;
            //$scope.lastword.score = $scope.newword.score;
            //store the firstletter of lastword in the $scope
            //$scope.lastword.score = $scope.newword.score;
            $scope.firstletter = $scope.lastword.name.charAt($scope.lastword.name.length-1);
            WordsService.addWord(angular.copy($scope.newword));
            console.log($scope.lastword);
            WordsService.addLastWord(angular.copy($scope.lastword));
            //clear the newword ng-model
            $scope.newword = { name: '', score: ''};
            };

            //watch for changes to input field ng-model=newword and change newscore
            $scope.$watch("newword.name", function (newValue, oldValue){
            if ($scope.newword.name !== undefined) {
            var wordy = $scope.newword.name;
            wordy = wordy.toUpperCase();
            scores = {'A':1,'B':3,'C':3,'D':2,'E':1,'F':4,'G':2,'H':4,'I':1,'J':8,'K':5,'L':1,'M':3, 'N':1,'O':1,'P':3,'Q':10,'R':1,'S':1,'T':1,'U':1,'V':4,'W':4,'X':8,'Y':4,'Z':10};

			var sum = 0;
				for (var i = 0; i < wordy.length; ++i) {
    				sum += scores[wordy.charAt(i)] || 0;
					}
				$scope.newword.score = sum;
			}
			else {
				//if value is undefined then it will set the score to zero
                $scope.newword.score = 0;
			}
			});
}]);

    wordWire.factory('WordsService', ['$firebase', 'FIREBASE_URI', function ($firebase, FIREBASE_URI) {
    var ref = new Firebase(FIREBASE_URI+"/words");
    var words = $firebase(ref.limit(10)).$asArray();
    var lastref = new Firebase(FIREBASE_URI+"/lastword");
    var lastword = $firebase(lastref);
    
    var getWords = function () {
    //var refQuery = ref.limit(10);
         return words; //(
    // Get the 10 latest posts
    //refQuery.on('child_added', function (snapshot) {
    //var words = snapshot.val();
    //console.log(words);
    //return words;
    //}
    //)
    };

    var getLast = function () {
        return lastword;
    };

    var addWord = function (word) {
        words.$add(word);
    };

    var addLastWord = function (lastr) {
        lastword.$set(lastr);
    };

    return {
        getWords: getWords,
        getLast: getLast,
        addWord: addWord,
        addLastWord: addLastWord,
    }

}]);