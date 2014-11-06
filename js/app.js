var wordWire = angular.module('wordWire', ['firebase']);
wordWire.constant('FIREBASE_URI', 'https://wordwire.firebaseio.com/');
wordWire.controller('WordCtrl', ['$scope', 'WordsService', function ($scope, WordsService) {
    //initialize a dummy pattern for newword
    $scope.newwordpattern = new RegExp();
    console.log("first " + $scope.newwordpattern);

    //get Pattern from Firebase
    WordsService.getPattern().then(function (patter) {
        var a1 = patter.split("/");
        var b1 = new RegExp(a1[0] + a1[1], a1[2]);
        $scope.newwordpattern = b1;
        console.log("loaded pattern" + $scope.newwordpattern);
    });

    //get last 10 words from firebase
    WordsService.getWords().then(function (data) {
        //load data to words on promise
        $scope.words = data;
        //initialize values
        $scope.words.newword = {name: '', score: ''};
        //add newword to firebase

        $scope.words.addWord = function () {
            var textlw = $scope.words.newword.name;
            WordsService.addWord(angular.copy($scope.words.newword)).then(function (nref) {
                var wid = nref.name();
                console.log("newword added successfully" + wid);
                //update the pattern based on newword loaded
                var regexp1 = "/^([" + textlw.charAt(textlw.length - 1) + "])([A-Z])*$/i"
                console.log("3rd pattern is" + regexp1);
                WordsService.addPattern(regexp1).then(function (rref) {
                    var qid = rref.name();
                    console.log("patter is updated successfully" + qid);

                });
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
    var pref = new Firebase(FIREBASE_URI + "/pattern");
    var prefs = $firebase(pref).$asObject();

    var getWords = function () {
        return wref.$loaded().then(function (data) {
            return data;
        });
    };

    var getPattern = function () {
        return prefs.$loaded().then(function (patter) {
            console.log("patter is " + patter.$value);
            return patter.$value;
        });
    };

    var addWord = function (word) {
        return wref.$add(word).then(function (nref) {
            return nref;
        });
    };

    var addPattern = function (patt) {
        console.log("patt is " + patt);
        console.log("prefs value before assign " + prefs.$value);
        prefs.$value = patt;
        console.log("prefs value after assign" + prefs.$value);
        return prefs.$save().then(function (rref) {
            console.log("prefs value after save" + prefs.$value);
            return rref;
        });
    };

    return {
        getWords: getWords,
        addWord: addWord,
        addPattern: addPattern,
        getPattern: getPattern
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