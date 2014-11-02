var wordWire = angular.module('wordWire',['firebase']);
       wordWire.constant('FIREBASE_URI', 'https://wordwire.firebaseio.com/');
        wordWire.controller('WordCtrl', ['$scope', 'WordsService', function ($scope, WordsService) {
            //get last 10 words from firebase
            $scope.words = WordsService.getWords();
            //get the last word from firebase
            $scope.lrefs = WordsService.getLast();
            //console.log($scope.lrefs);
            //used for displaying error based on pattern regular expression
            $scope.errmsg = 'English please..no gibberish allowed here!';
            //initialize values
            $scope.newword = { name: '', score: ''};
            $scope.currentWord = null;
            //$scope.firstletter = $scope.lrefs.name[0].charAt($scope.lrefs.name[0].length-1);

            $scope.addWord = function () {
            //store the firstletter of lastword in the $scope
            WordsService.addWord(angular.copy($scope.newword));
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
    var lrefs = $firebase(ref.limit(1)).$asObject();

    var getWords = function () {
         return words;
    };

    var getLast = function () {
        //console.log(lref);
        return lrefs;
    };

    var addWord = function (word) {
        words.$add(word);
    };

    return {
        getWords: getWords,
        getLast: getLast,
        addWord: addWord,
    }

}]);