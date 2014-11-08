/**
 * Created by asifa on 11/6/2014.
 */
var wordWire = angular.module('wordWire', ['firebase']);
wordWire.constant('FIREBASE_URI', 'https://wordwire.firebaseio.com/');
wordWire.controller('WordCtrl', ['$scope', '$firebase', 'FIREBASE_URI', '$timeout', '$window', '$filter', function ($scope, $firebase, FIREBASE_URI, $timeout, $window, $filter) {
    //initialize pattern if it is not done, when app initializes, there is an error for invalid pattern
    $scope.stats = {};
    $scope.stats.pattern = new RegExp();

    //defining firebase instances
    var wref = new Firebase(FIREBASE_URI + "/words");
    var wordref = $firebase(wref.limitToLast(5)).$asArray();
    var sref = new Firebase(FIREBASE_URI + "/stats");
    var statref = $firebase(sref);//can define $set only if it is not defined as Object or Array

    //watch for change in value of lastword, firstletter and pattern and update the scope
    sref.on("value", function (statssnapshot) {
        $timeout(function () {
            $scope.stats = statssnapshot.val();//get value of firebase/stats
            $scope.stats.pattern = $filter('strtoregex')(statssnapshot.val().pattern);//using filter to convert string to regex
        });
    });

    //load last 5 values of words and scores from firebase
    wordref.$loaded().then(function (wordlist) {
        //load data to words on promise
        $scope.words = wordlist;

        //initialize values
        $scope.words.newword = {name: '', score: ''};

        //this function is called on clicking the submit button
        $scope.words.addWord = function () {

            //create variables to update stats
            var lastword = $scope.words.newword.name;
            var firstletter = $filter('firstlet')(lastword);
            var pattern = $filter('regtostr')($scope.stats.pattern, firstletter);

            //create variables for dictionary check
            var dictcheck = $filter('uppercase')(lastword);
            var firsttwo = $filter('uppercase')(lastword.substr(0, 2));
            var dref = FIREBASE_URI + "dictionary/" + firsttwo;

            //create new firebase instance, based on first 2 chars of new word
            var dictref = new Firebase(dref);

            //check if the word entered is a valid english word
            dictref.orderByKey().startAt(dictcheck).endAt(dictcheck).on("value", function (snapshot) {
                //if the word exists in the dictionary, i.e not equal to null
                if (snapshot.val() !== null) {
                    //check if the word already exists in firebase
                    wref.orderByChild("name").equalTo(lastword).once("value", function (snapshot) {
                            if (snapshot.val() !== null) {//if word exists in firebase
                                $window.alert("word already exists chose another");
                            }
                            else {//if does not exist in firebase, add it
                                wordref.$add(angular.copy($scope.words.newword)).then(function (nref) {
                                    var wid = nref.key();
                                    console.log("newword added successfully" + wid);
                                });
                                $timeout(function () { //update lastword, firstletter and patten based on newword
                                    statref.$set({
                                            firstletter: firstletter,
                                            lastword: lastword,
                                            pattern: pattern
                                        }
                                    ).then(function (nref) {
                                            $scope.stats.pattern = $filter('strtoregex')(pattern);
                                            $scope.words.newword = {name: '', score: ''};//clear the ng-model newword
                                        });
                                });
                            }
                        }, function (err) {
                            $window.alert("snap! its my fault..try again please.");
                        }
                    );
                    }
                else {
                    $window.alert("word does not exist in my dictionary");
                    }
            });
        };
    });

    //watch for changes to input field ng-model=newword.name and compute newword.score
    $scope.$watch("words.newword.name", function (newValue) {
        if (newValue !== undefined) {
            $scope.words.newword.score = $filter('score')(newValue);
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
            return text;
        }
    };
});

//filter to convert the string pattern to regex
wordWire.filter('strtoregex', function () {
    return function (text) {
        if (text !== undefined) {
            text = text.split("/");
            text = new RegExp(text[1], text[2]);
            return text;
        }
        else {
            return text;
        }
    };
});

//filter to convert the regex pattern to string to store in firebase
wordWire.filter('regtostr', function () {
    return function (text, first) {
        if (text !== undefined) {
            text = text.toString().split("");
            text[4] = first;
            text = text.join("");
            return text;
        }
        else {
            return text;
        }
    };
});

//filter to compute the wordscore based on newword in realtime
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

//directive to submit based on enter key - copied from stackoverflow http://stackoverflow.com/questions/17470790/how-to-use-a-keypress-event-in-angularjs
wordWire.directive('wwEnter', function () {
    return function (scope, element, attrs) {
        element.bind("keydown keypress", function (event) {
            if (event.which === 13) {
                scope.$apply(function () {
                    scope.$eval(attrs.wwEnter);
                });
                event.preventDefault();
            }
        });
    };
});