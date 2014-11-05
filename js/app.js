var wordWire = angular.module('wordWire', ['firebase']);
wordWire.constant('FIREBASE_URI', 'https://wordwire.firebaseio.com/');
wordWire.controller('WordCtrl', ['$scope', 'WordsService', function ($scope, WordsService) {
    //get last 10 words from firebase
    WordsService.getWords().then(function (data) {
        //load data to words on promise
        $scope.words = data;
        //initialize values
        $scope.words.newword = {name: '', score: ''};
        //add newword to firebase
        $scope.words.addWord = function () {
            WordsService.addWord(angular.copy($scope.words.newword)).then(function (nref) {
                var id = nref.name();
                console.log("newword added successfully" + id);
            });
            //clear the newword ng-model
            $scope.words.newword = {name: '', score: ''};
        };
    });
    //watch for changes to input field ng-model=newword.name and compute newword.score
    $scope.$watch("words.newword.name", function (newValue) {
        if (newValue !== undefined) {
            var wordy = newValue;
            wordy = wordy.toUpperCase();
            var scores = {
                'A': 1,
                'B': 3,
                'C': 3,
                'D': 2,
                'E': 1,
                'F': 4,
                'G': 2,
                'H': 4,
                'I': 1,
                'J': 8,
                'K': 5,
                'L': 1,
                'M': 3,
                'N': 1,
                'O': 1,
                'P': 3,
                'Q': 10,
                'R': 1,
                'S': 1,
                'T': 1,
                'U': 1,
                'V': 4,
                'W': 4,
                'X': 8,
                'Y': 4,
                'Z': 10
            };

            var sum = 0;
            for (var i = 0; i < wordy.length; ++i) {
                sum += scores[wordy.charAt(i)] || 0;
            }
            $scope.words.newword.score = sum;
        }
        else {
            //if value is undefined then it will set the score to zero
            //$scope.words.newword.score = 0;
        }
    });
}]);

wordWire.factory('WordsService', ['$firebase', 'FIREBASE_URI', function ($firebase, FIREBASE_URI) {
    var ref = new Firebase(FIREBASE_URI + "/words");
    var wref = $firebase(ref.limit(5)).$asArray();

    var getWords = function () {
        return wref.$loaded().then(function (data) {
            return data;
        });
    };
    var addWord = function (word) {
        return wref.$add(word).then(function (nref) {
            return nref;
        });
    };

    return {
        getWords: getWords,
        addWord: addWord
    };
}
]);

//filter for score, it works but not sure how to use it in the model to upload to firebase
wordWire.filter('score', function () {
    return function (text) {
        if (text !== undefined) {
            text = text.toUpperCase();
            var scores = {
                'A': 1,
                'B': 3,
                'C': 3,
                'D': 2,
                'E': 1,
                'F': 4,
                'G': 2,
                'H': 4,
                'I': 1,
                'J': 8,
                'K': 5,
                'L': 1,
                'M': 3,
                'N': 1,
                'O': 1,
                'P': 3,
                'Q': 10,
                'R': 1,
                'S': 1,
                'T': 1,
                'U': 1,
                'V': 4,
                'W': 4,
                'X': 8,
                'Y': 4,
                'Z': 10
            };

            var sum = 0;
            for (var i = 0; i < text.length; ++i) {
                sum += scores[text.charAt(i)] || 0;
            }
            return sum;
        }
        else {
            return 0;
        }
    };
});

//filter to catch the first letter of last word
wordWire.filter('firstlet', function () {
    return function (text) {
        if (text !== undefined) {
            text = text.charAt(text.length - 1);
            return text;
        }
        else {
        }
    };
});