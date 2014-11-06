/**
 * Created by asifa on 11/6/2014.
 */
var wordWire = angular.module('wordWire', ['firebase']);
wordWire.constant('FIREBASE_URI', 'https://wordwire.firebaseio.com/');
wordWire.controller('WordCtrl', ['$scope', '$firebase', 'FIREBASE_URI', '$timeout', function ($scope, $firebase, FIREBASE_URI, $timeout) {
    $scope.stats = {};
    $scope.stats.pattern = new RegExp();
    var wref = new Firebase(FIREBASE_URI + "/words");
    var wordref = $firebase(wref.limit(5)).$asArray();
    var sref = new Firebase(FIREBASE_URI + "/stats");
    var statref = $firebase(sref);
    var newref = new Firebase(FIREBASE_URI + "/stats"); // assume value here is {foo: "bar"}
    var newobj = $firebase(newref).$asObject();

    $timeout(function () {
        newobj.$loaded().then(function (stats) {
            $scope.stats = stats;
            console.log($scope.stats); // {foo: "bar"}
            console.log($scope.stats.lastword);
            console.log($scope.stats.firstletter);
            console.log($scope.stats.pattern);
            var patsplit = $scope.stats.pattern.split("/");
            console.log("pattern split" + patsplit);
            var regexp1 = new RegExp(patsplit[1], patsplit[2]);
            console.log("regexp" + regexp1);
            $scope.stats.pattern = regexp1;
            console.log($scope.stats.pattern);
        });
    });

    wordref.$loaded().then(function (data) {
        //load data to words on promise
        $scope.words = data;
        //$scope.patternname = new RegExp("^([" + data[4].name.charAt(data[4].name.length - 1) + "])([A-Z])*$", "i");
        //console.log("pattern is" + $scope.patternname);
        //initialize values
        $scope.words.newword = {name: '', score: ''};

        $scope.words.addWord = function () {
            var lastword = $scope.words.newword.name;
            var firstletter = lastword.substr(lastword.length - 1, 1);
            var pattern = "/^([" + firstletter + "])([A-Z])*$/i";
            wordref.$add(angular.copy($scope.words.newword)).then(function (nref) {
                var wid = nref.name();
                console.log("newword added successfully" + wid);
                var rec = wordref.$getRecord(wid);
                console.log(rec.name);
                //$scope.patternname = new RegExp("^([" + data[4].name.charAt(data[4].name.length - 1) + "])([A-Z])*$", "i");
                //update the pattern based on newword loaded
            });
            statref.$set({
                    lastword: lastword,
                    firstletter: firstletter,
                    pattern: pattern
                }
            ).then(function (nref) {
                    var patsplit1 = pattern.split("/");
                    console.log("pattern split" + patsplit1);
                    var regexp2 = new RegExp(patsplit1[1], patsplit1[2]);
                    console.log("regexp" + regexp2);
                    $scope.stats.pattern = regexp2;
                    console.log($scope.stats.pattern);
                    //clear the newword ng-model
                    $scope.words.newword = {name: '', score: ''};
                });
        };
        wordref.$watch(function (child_added) {
            console.log(child_added);
        });
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

wordWire.filter('reverse', function () {
    return function (items) {
        if (!angular.isArray(items)) return items;
        return items.slice().reverse();
    };
});